import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './FirebaseService';

/** Owner sends one SMS. The Twilio token stays on the server. */
export async function sendOwnerSms(phone, message) {
  const functions = getFunctions(auth.app, 'europe-west1');
  const send = httpsCallable(functions, 'sendStudentSms');
  const res = await send({ phone, message });
  return res.data;
}

export function smsErrorText(error) {
  const code = error?.code || '';
  const msg = error?.message || '';
  if (msg.includes('21608') || /unverified/i.test(msg)) {
    return 'حساب Twilio ما زال تجريبياً، ويرفض أرقام الطلاب غير الموثّقة. رقِّ الحساب من Twilio ثم أعد الإرسال.';
  }
  if (code === 'functions/not-found' || code === 'functions/unavailable' || code === 'functions/internal') {
    return 'خدمة الإرسال غير متصلة بعد. انشر دالة Firebase مرة واحدة ثم أعد المحاولة.';
  }
  if (code === 'functions/unauthenticated') {
    return 'سجّل الدخول كمالك ثم أعد المحاولة.';
  }
  if (code === 'functions/permission-denied') {
    return 'الإرسال للمالك فقط.';
  }
  return msg || 'فشل إرسال الرسالة';
}
