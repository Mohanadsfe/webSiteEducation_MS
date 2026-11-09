const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { selectSmsJobs, parseStart } = require('./reminders');
const { isEarlyCancel, LATE_CANCEL_LIMIT } = require('./bookingPolicy');
const { sendReminderEmails } = require('./mail');
const { noticeMessage, reminderMessage, sendToTokens, tokensFromDocs } = require('./fcm');
const { deleteAccountData } = require('./account');
const { getAuth } = require('firebase-admin/auth');

const OWNER_EMAILS = new Set([
  'safi89099@gmail.com',
  'mohanadsfe@gmail.com',
]);

initializeApp();

const FLAG = {
  hours48: 'reminderHours48CloudSent',
  hours3: 'reminderHours3CloudSent',
};
const EMAIL_FLAG = {
  hours48: 'reminderHours48EmailSent',
  hours3: 'reminderHours3EmailSent',
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
  const profile = await db.collection('users').doc(studentId).get();
  if (profile.exists && profile.get('notificationOptOut') === true) {
    return { stored: false, pushed: 0, failed: 0, skipped: true };
  }
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
      return {
        ok: true,
        sent: result.skipped ? 0 : 1,
        pushed: result.pushed,
        failed: result.failed,
        skipped: result.skipped ? 1 : 0,
      };
    }

    const snap = await getFirestore().collection('users').where('role', '==', 'student').get();
    const ids = snap.docs.map((row) => row.id).filter(Boolean);
    let sent = 0;
    let pushed = 0;
    let failed = 0;
    let skipped = 0;
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
        if (result.skipped) skipped += 1;
        else sent += 1;
        pushed += result.pushed || 0;
        failed += result.failed || 0;
      });
    }
    console.log('Owner notice', 'students', sent, 'pushed', pushed, 'failed', failed, 'skipped', skipped);
    return { ok: true, sent, pushed, failed, skipped };
  }
);

/**
 * Every 15 minutes, with no click. Each lesson is emailed twice:
 * 1) About 48 hours before it starts, with the day-based cancel rule
 * 2) About 3 hours before it starts, telling the student to be ready
 * The same note is saved in the site and pushed when the student allowed notifications.
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
      const emailFlag = EMAIL_FLAG[job.kind];
      if (!job.emailOnly) {
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
          console.log('Reminder stored', job.id, job.kind, 'pushed', result.pushed);
        } catch (e) {
          console.error('Reminder failed', job.id, job.kind, e.message);
          await ref.update({
            [flag]: FieldValue.delete(),
            [`${flag}At`]: FieldValue.delete(),
          });
          continue;
        }
      }

      try {
        const mailed = await sendReminderEmails(job);
        console.log('Reminder email', job.id, job.kind, 'sent', mailed.sent);
        if (mailed.sent > 0) {
          await ref.update({
            [emailFlag]: true,
            [`${emailFlag}At`]: new Date(),
          });
        }
      } catch (e) {
        console.error('Reminder email failed', job.id, job.kind, e.message || 'mail-failed');
      }
    }
  }
);

/** The signed-in user deletes her own login and the records stored for that account. */
exports.deleteMyAccount = onCall(
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
    const uid = request.auth.uid;
    const email = String(request.auth.token.email || '').toLowerCase();
    if (OWNER_EMAILS.has(email)) {
      throw new HttpsError('permission-denied', 'لا يمكن حذف حساب المالك');
    }
    await deleteAccountData(getFirestore(), uid, email);
    try {
      await getAuth().deleteUser(uid);
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        console.error('Auth delete failed', e.code || 'auth-delete-failed');
        throw new HttpsError('internal', 'حُذفت البيانات وتعذر إغلاق تسجيل الدخول');
      }
    }
    console.log('Account deleted');
    return { ok: true };
  }
);

/** Student cancel. Early cancel is free. A late cancel still counts, and only three are allowed. */
exports.cancelMyBooking = onCall(
  {
    region: 'europe-west1',
    cors: true,
    invoker: 'public',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول');
    }
    const bookingId = String(request.data?.bookingId || '').trim();
    if (!bookingId) {
      throw new HttpsError('invalid-argument', 'اختر الحجز');
    }
    const db = getFirestore();
    const ref = db.collection('appointments').doc(bookingId);
    const userRef = db.collection('users').doc(request.auth.uid);
    try {
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const user = await tx.get(userRef);
        if (!snap.exists) throw new HttpsError('not-found', 'الحجز غير موجود');
        if (snap.get('studentId') !== request.auth.uid) {
          throw new HttpsError('permission-denied', 'هذا الحجز ليس لك');
        }
        const status = String(snap.get('status') || '').toLowerCase();
        if (['cancelled', 'canceled', 'rejected', 'revoked'].includes(status)) {
          throw new HttpsError('failed-precondition', 'الحجز ملغى');
        }
        const data = snap.data() || {};
        const start = parseStart(data.date)
          || (data.dateKey && data.startTime
            ? parseStart(`${data.dateKey}T${data.startTime}:00`)
            : null);
        if (!start) throw new HttpsError('failed-precondition', 'موعد الحجز غير واضح');
        const early = isEarlyCancel(start, new Date());
        const lateCount = Number(user.exists ? user.get('lateCancelCount') || 0 : 0);
        if (!early && lateCount >= LATE_CANCEL_LIMIT) {
          throw new HttpsError('failed-precondition', 'LATE_LIMIT');
        }
        tx.update(ref, {
          status: 'cancelled',
          cancelKind: early ? 'early' : 'late',
          countsAsUsed: !early,
          cancelledAt: new Date(),
          cancelledBy: 'student',
        });
        if (early) {
          tx.set(userRef, { earlyCancelCount: FieldValue.increment(1) }, { merge: true });
        } else {
          tx.set(userRef, { lateCancelCount: lateCount + 1 }, { merge: true });
        }
        return {
          ok: true,
          kind: early ? 'early' : 'late',
          lateCancelCount: early ? lateCount : lateCount + 1,
        };
      });
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error('Cancel booking failed', e.code || 'cancel-failed');
      throw new HttpsError('internal', 'تعذر إلغاء الحجز');
    }
  }
);
