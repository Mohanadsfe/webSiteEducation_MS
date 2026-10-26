const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { selectSmsJobs, toE164 } = require('./reminders');
const { sendSms } = require('./sms');

const OWNER_EMAILS = new Set([
  'safi89099@gmail.com',
  'mohanadsfe@gmail.com',
]);

initializeApp();

const twilioSid = defineString('TWILIO_ACCOUNT_SID', { default: '' });
const twilioToken = defineString('TWILIO_AUTH_TOKEN', { default: '' });
const twilioFrom = defineString('TWILIO_FROM_NUMBER', { default: '' });

const FLAG = {
  day_before: 'reminderDayBeforeSmsSent',
  hours3: 'reminderHours3SmsSent',
};

function twilioCredentials() {
  return {
    accountSid: twilioSid.value(),
    authToken: twilioToken.value(),
    fromNumber: twilioFrom.value(),
  };
}

/** Owner/teacher sends one SMS to a chosen student. */
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
    const phone = toE164(request.data?.phone || '');
    if (!phone) {
      throw new HttpsError('invalid-argument', 'رقم الهاتف غير صالح');
    }
    if (!message || message.length > 480) {
      throw new HttpsError('invalid-argument', 'اكتب رسالة قصيرة');
    }

    const result = await sendSms(phone, message, twilioCredentials());
    if (!result.ok) {
      throw new HttpsError('failed-precondition', result.error || 'فشل الإرسال');
    }
    return { ok: true };
  }
);

/**
 * Every 15 minutes: text the student with no click.
 * 1) The day before the lecture (from 08:00, Asia/Jerusalem)
 * 2) About 3 hours before the lecture starts
 *
 * Needs Twilio once: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 * in functions/.env, then deploy. After that the job sends by itself.
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
    const credentials = twilioCredentials();
    if (!credentials.accountSid || !credentials.authToken || !credentials.fromNumber) {
      console.error(
        'SMS reminders skipped: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER'
      );
      return;
    }

    const db = getFirestore();
    const snap = await db.collection('appointments').get();
    const appointments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const jobs = selectSmsJobs(appointments, new Date());
    console.log(`SMS reminder jobs: ${jobs.length}`);

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

      const result = await sendSms(job.phone, job.body, credentials);
      if (!result.ok) {
        console.error('SMS failed', job.id, job.kind, result.error);
        await ref.update({
          [flag]: FieldValue.delete(),
          [`${flag}At`]: FieldValue.delete(),
          reminderSmsLastError: result.error || 'send failed',
        });
      } else {
        console.log('SMS sent', job.id, job.kind, job.phone);
      }
    }
  }
);
