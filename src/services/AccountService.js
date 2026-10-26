import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './FirebaseService';

/** Signed-in user deletes her own Firebase login and stored records. */
export async function deleteMyAccount() {
  const functions = getFunctions(auth.app, 'europe-west1');
  const remove = httpsCallable(functions, 'deleteMyAccount');
  const res = await remove({});
  return res.data;
}

export function deleteAccountErrorText(error) {
  const code = error?.code || '';
  if (code === 'functions/not-found' || code === 'functions/unavailable' || code === 'functions/internal') {
    return 'حذف الحساب غير متصل بعد. أعد المحاولة بعد نشر الدالة.';
  }
  if (code === 'functions/unauthenticated') return 'سجّل الدخول ثم أعد المحاولة.';
  if (code === 'functions/permission-denied') return 'لا يمكن حذف حساب المالك من هنا.';
  return error?.message || 'فشل حذف الحساب';
}
