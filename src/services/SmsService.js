import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './FirebaseService';

/** Owner sends one lecture notice through the Cloud Function. */
export async function sendStudentNotice(studentId, message) {
  const functions = getFunctions(auth.app, 'europe-west1');
  const send = httpsCallable(functions, 'sendStudentSms');
  const res = await send({ studentId, message });
  return res.data;
}

export function noticeErrorText(error) {
  const code = error?.code || '';
  const msg = error?.message || '';
  if (code === 'functions/not-found' || code === 'functions/unavailable' || code === 'functions/internal') {
    return 'خدمة الإشعار غير متصلة. أعد المحاولة بعد دقيقة.';
  }
  if (code === 'functions/unauthenticated') {
    return 'سجّل الدخول كمالك ثم أعد المحاولة.';
  }
  if (code === 'functions/permission-denied') {
    return 'الإرسال للمالك فقط.';
  }
  return msg || 'فشل إرسال الإشعار';
}
