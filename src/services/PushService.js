import { deleteField, doc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, db } from '../firebaseConfig';

/** Public Web Push certificate. The private key stays in Firebase. */
const FIREBASE_VAPID_KEY = 'BPIMAC5zBs0g7TnmeIXXQFwzG_zCIIWXego_DVfaaNghkAGoLCGA915ZJ3vg9zV58sRkNhn9giIFdhDMD5m_RSc';

export function vapidKey() {
  return String(process.env.REACT_APP_FIREBASE_VAPID_KEY || FIREBASE_VAPID_KEY).trim();
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isInstalledApp() {
  if (typeof window === 'undefined') return false;
  return window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
}

/** Why the enable button cannot register yet, or "ready". */
export function pushSupport() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
    return 'unsupported';
  }
  if (!window.isSecureContext) return 'insecure';
  if (isIosDevice() && !isInstalledApp()) return 'ios-home-screen';
  if (!vapidKey()) return 'missing-config';
  return 'ready';
}

async function tokenDocId(token) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function retireLegacyWorker() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((reg) => {
    const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
    if (url.endsWith('/sw.js')) return reg.unregister();
    return undefined;
  }));
}

async function saveToken(uid) {
  const key = vapidKey();
  if (!uid) return { ok: false, reason: 'signed-out' };
  if (!key) return { ok: false, reason: 'missing-config' };
  const supported = await isSupported().catch(() => false);
  if (!supported) return { ok: false, reason: 'unsupported' };

  await retireLegacyWorker();
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: key,
    serviceWorkerRegistration: registration,
  });
  if (!token) return { ok: false, reason: 'no-token' };

  const id = await tokenDocId(token);
  await setDoc(doc(db, 'users', uid, 'fcmTokens', id), {
    token,
    updatedAt: new Date(),
  }, { merge: true });
  await setDoc(doc(db, 'users', uid), {
    pushSubscriptions: deleteField(),
  }, { merge: true }).catch(() => {});
  return { ok: true };
}

/** Update a token the student already allowed. Does not ask for permission. */
export async function refreshBookingNotifications(uid) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return { ok: false, reason: 'not-granted' };
  }
  try {
    return await saveToken(uid);
  } catch (e) {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * Ask for notification permission. Call this only from the enable button.
 */
export async function enableBookingNotifications(uid) {
  const support = pushSupport();
  if (support !== 'ready') return { ok: false, reason: support };
  if (!uid) return { ok: false, reason: 'signed-out' };
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: permission || 'denied' };
  try {
    return await saveToken(uid);
  } catch (e) {
    return { ok: false, reason: 'failed' };
  }
}
