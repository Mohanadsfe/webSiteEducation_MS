import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './FirebaseService';

function noticeCallable() {
  const functions = getFunctions(auth.app, 'europe-west1');
  return httpsCallable(functions, 'sendStudentSms');
}

/** Owner sends one notice to a chosen student. */
export async function sendStudentNotice(studentId, message) {
  const res = await noticeCallable()({ studentId, message });
  return res.data;
}

/** Owner sends the same notice to every student account. */
export async function sendNoticeToAllStudents(message) {
  const res = await noticeCallable()({ all: true, message });
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
