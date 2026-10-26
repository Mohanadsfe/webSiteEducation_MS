const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { selectSmsJobs, parseStart } = require('./reminders');
const { sendWebPush } = require('./push');

const OWNER_EMAILS = new Set([
  'safi89099@gmail.com',
  'mohanadsfe@gmail.com',
]);

initializeApp();

const pushPublic = defineString('WEB_PUSH_PUBLIC_KEY', { default: '' });
const pushPrivate = defineString('WEB_PUSH_PRIVATE_KEY', { default: '' });
const pushSubject = defineString('WEB_PUSH_SUBJECT', { default: 'mailto:mohanadsfe@gmail.com' });

const FLAG = {
  day_before: 'reminderDayBeforeCloudSent',
  hours3: 'reminderHours3CloudSent',
};

function pushCredentials() {
  return {
    publicKey: pushPublic.value(),
    privateKey: pushPrivate.value(),
    subject: pushSubject.value(),
  };
}

async function deliverToStudent(studentId, body) {
  const db = getFirestore();
  const title = 'معهد المعرفة';
  await db.collection('notifications').add({
    userId: studentId,
    title,
    body,
    read: false,
    url: '/my-bookings',
    createdAt: new Date(),
  });

  const user = await db.collection('users').doc(studentId).get();
  const subs = user.exists && Array.isArray(user.get('pushSubscriptions'))
    ? user.get('pushSubscriptions')
    : [];
  const credentials = pushCredentials();
  const dead = [];
  let pushed = 0;
  for (const sub of subs) {
    const result = await sendWebPush(sub, { title, body, url: '/my-bookings' }, credentials);
    if (result.ok) {
      pushed += 1;
    } else if (result.statusCode === 404 || result.statusCode === 410) {
      dead.push(sub);
    } else if (result.error && result.error !== 'missing web push keys') {
      console.error('Push failed', studentId, result.statusCode || '', result.error);
    }
  }
  if (dead.length) {
    await db.collection('users').doc(studentId).update({
      pushSubscriptions: FieldValue.arrayRemove(...dead),
    });
  }
  return { stored: true, pushed };
}

/** Owner/teacher sends one lecture notice to a chosen student. */
exports.sendStudentSms = onCall(
  {
    region: 'europe-west1',
    cors: true,
    invoker: 'public',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول');
    }

    const email = String(request.auth.token.email || '').toLowerCase();
    let allowed = OWNER_EMAILS.has(email);
    if (!allowed) {
      const profile = await getFirestore().collection('users').doc(request.auth.uid).get();
      allowed = profile.exists && profile.get('role') === 'teacher';
    }
    if (!allowed) {
      throw new HttpsError('permission-denied', 'الإرسال للمالك فقط');
    }

    const message = String(request.data?.message || '').trim();
    const studentId = String(request.data?.studentId || '').trim();
    if (!studentId) {
      throw new HttpsError('invalid-argument', 'اختر طالباً');
    }
    if (!message || message.length > 480) {
      throw new HttpsError('invalid-argument', 'اكتب رسالة قصيرة');
    }

    const result = await deliverToStudent(studentId, message);
    return { ok: true, pushed: result.pushed };
  }
);

/**
 * Every 15 minutes, with no click:
 * 1) The day before the lecture (from 08:00, Asia/Jerusalem)
 * 2) About 3 hours before the lecture starts
 * Saved in the site, and pushed to the phone if the student allowed notifications.
 */
exports.sendLectureSmsReminders = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'Asia/Jerusalem',
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async () => {
    const db = getFirestore();
    const snap = await db.collection('appointments').get();
    const appointments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    for (const appt of appointments) {
      if (appt.startAt) continue;
      const start = parseStart(appt.date)
        || (appt.dateKey && appt.startTime
          ? parseStart(`${appt.dateKey}T${appt.startTime}:00`)
          : null);
      if (!start) continue;
      await db.collection('appointments').doc(appt.id).update({ startAt: start.toDate() });
      appt.startAt = start.toDate();
    }
    const jobs = selectSmsJobs(appointments, new Date());
    console.log(`Lecture reminder jobs: ${jobs.length}`);

    for (const job of jobs) {
      const ref = db.collection('appointments').doc(job.id);
      const flag = FLAG[job.kind];
      const claimed = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        if (!fresh.exists || fresh.get(flag)) return false;
        tx.update(ref, {
          [flag]: true,
          [`${flag}At`]: new Date(),
        });
        return true;
      });
      if (!claimed) continue;

      try {
        const result = await deliverToStudent(job.studentId, job.body);
        console.log('Reminder stored', job.id, job.kind, 'pushed', result.pushed);
      } catch (e) {
        console.error('Reminder failed', job.id, job.kind, e.message);
        await ref.update({
          [flag]: FieldValue.delete(),
          [`${flag}At`]: FieldValue.delete(),
        });
      }
    }
  }
);
