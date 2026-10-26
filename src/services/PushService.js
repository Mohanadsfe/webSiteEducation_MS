import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { db } from './FirebaseService';
import { WEB_PUSH_PUBLIC_KEY } from '../constants/webPush';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Ask the browser for a push subscription and store it on the signed-in user. */
export async function registerLecturePush(uid) {
  if (!uid || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const reg = await navigator.serviceWorker.register('/sw.js');
  const existing = await reg.pushManager.getSubscription();
  const sub = existing || await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY),
  });
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
  await setDoc(doc(db, 'users', uid), {
    pushSubscriptions: arrayUnion({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    }),
  }, { merge: true });
  return true;
}
