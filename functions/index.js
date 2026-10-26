const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { selectSmsJobs, parseStart } = require('./reminders');
const { noticeMessage, reminderMessage, sendToTokens, tokensFromDocs } = require('./fcm');

const OWNER_EMAILS = new Set([
  'safi89099@gmail.com',
  'mohanadsfe@gmail.com',
]);

initializeApp();

const FLAG = {
  hours36: 'reminderHours36CloudSent',
  hours30: 'reminderHours30CloudSent',
  hours3: 'reminderHours3CloudSent',
};

async function loadStudentTokens(studentId) {
  const snap = await getFirestore()
    .collection('users')
    .doc(studentId)
    .collection('fcmTokens')
    .get();
  return tokensFromDocs(snap.docs.map((row) => ({
    id: row.id,
    token: row.get('token'),
  })));
}

async function deleteStaleTokens(studentId, ids) {
  if (!ids.length) return;
  const db = getFirestore();
  const batch = db.batch();
  ids.forEach((id) => {
    batch.delete(db.collection('users').doc(studentId).collection('fcmTokens').doc(id));
  });
  await batch.commit();
}

async function deliverToStudent(studentId, message) {
  const db = getFirestore();
  await db.collection('notifications').add({
    userId: studentId,
    title: message.title,
    body: message.body,
    read: false,
    url: message.data.url || '/my-bookings',
    bookingId: message.data.bookingId || '',
    kind: message.data.kind || '',
    createdAt: new Date(),
  });

  const tokens = await loadStudentTokens(studentId);
  let result = { pushed: 0, staleIds: [], failed: 0 };
  if (tokens.length) {
    try {
      result = await sendToTokens(getMessaging(), tokens, message);
    } catch (e) {
      console.error('FCM batch failed', message.data.bookingId || '', e.code || 'send-failed');
      result = { pushed: 0, staleIds: [], failed: tokens.length };
    }
  }
  if (result.staleIds.length) {
    try {
      await deleteStaleTokens(studentId, result.staleIds);
    } catch (e) {
      console.error('FCM token cleanup failed', message.data.bookingId || '', e.code || 'cleanup-failed');
    }
  }
  return { stored: true, pushed: result.pushed, failed: result.failed };
}

/** Owner sends one notice to a chosen student, or the same notice to every student. */
exports.sendStudentSms = onCall(
  {
    region: 'europe-west1',
    cors: true,
    invoker: 'public',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول');
    }
    const email = String(request.auth.token.email || '').toLowerCase();
    if (!OWNER_EMAILS.has(email)) {
      throw new HttpsError('permission-denied', 'الإرسال للمالك فقط');
    }

    const message = String(request.data?.message || '').trim();
    const studentId = String(request.data?.studentId || '').trim();
    const all = request.data?.all === true;
    if (!message || message.length > 480) {
      throw new HttpsError('invalid-argument', 'اكتب رسالة قصيرة');
    }
    if (!all && !studentId) {
      throw new HttpsError('invalid-argument', 'اختر طالباً');
    }

    const notice = noticeMessage(message);
    if (!all) {
      const result = await deliverToStudent(studentId, notice);
      return { ok: true, sent: 1, pushed: result.pushed, failed: result.failed };
    }

    const snap = await getFirestore().collection('users').where('role', '==', 'student').get();
    const ids = snap.docs.map((row) => row.id).filter(Boolean);
    let sent = 0;
    let pushed = 0;
    let failed = 0;
    const size = 8;
    for (let i = 0; i < ids.length; i += size) {
      const chunk = ids.slice(i, i + size);
      const results = await Promise.all(chunk.map(async (id) => {
        try {
          return await deliverToStudent(id, notice);
        } catch (e) {
          console.error('Notice failed', e.code || 'send-failed');
          return { pushed: 0, failed: 1 };
        }
      }));
      results.forEach((result) => {
        sent += 1;
        pushed += result.pushed || 0;
        failed += result.failed || 0;
      });
    }
    console.log('Owner notice', 'students', sent, 'pushed', pushed, 'failed', failed);
    return { ok: true, sent, pushed, failed };
  }
);

/**
 * Every 15 minutes, with no click. Each lesson is notified three times:
 * 1) About 36 hours before it starts
 * 2) About 30 hours before it starts
 * 3) About 3 hours before it starts
 * Saved in the site, and pushed with Firebase Cloud Messaging if the student allowed notifications.
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
        const result = await deliverToStudent(job.studentId, reminderMessage(job));
        console.log('Reminder stored', job.id, job.kind, 'pushed', result.pushed, 'failed', result.failed);
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
