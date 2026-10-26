import React, { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, onSnapshot, query, updateDoc, where,
} from 'firebase/firestore';
import { getMessaging, isSupported, onMessage } from 'firebase/messaging';
import { app } from '../../firebaseConfig';
import { auth, db } from '../../services/FirebaseService';
import { refreshBookingNotifications } from '../../services/PushService';

const recentShown = new Map();

function alreadyShown(body) {
  const at = recentShown.get(body);
  return Boolean(at && Date.now() - at < 20000);
}

function markShown(body) {
  if (body) recentShown.set(body, Date.now());
}

/**
 * Shows one in-app reminder while the site is open.
 * Permission is not requested here. The booking page has the enable button.
 * A background or closed site is handled by firebase-messaging-sw.js.
 */
export default function LecturePush() {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let unsubNotes = () => {};
    let unsubMessage = () => {};
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubNotes();
      unsubMessage();
      unsubNotes = () => {};
      unsubMessage = () => {};
      if (!user) return;

      const permission = typeof Notification === 'undefined' ? 'denied' : Notification.permission;
      if (permission === 'granted') {
        refreshBookingNotifications(user.uid).catch(() => {});
        const supported = await isSupported().catch(() => false);
        if (supported) {
          unsubMessage = onMessage(getMessaging(app), (payload) => {
            const body = payload.notification?.body || payload.data?.body || '';
            if (!body || alreadyShown(body)) return;
            markShown(body);
            setNotice({ body });
          });
        }
      }

      unsubNotes = onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', user.uid)),
        (snap) => {
          const unread = snap.docs
            .map((row) => ({ id: row.id, ...row.data() }))
            .filter((note) => !note.read);
          const next = unread[0];
          if (!next) return;
          const body = next.body || '';
          const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
          const systemWillShow = hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted';
          if (!systemWillShow && body && !alreadyShown(body)) {
            markShown(body);
            setNotice({ body });
          }
          updateDoc(doc(db, 'notifications', next.id), {
            read: true,
            readAt: new Date(),
          }).catch(() => {});
        },
        () => {}
      );
    });
    return () => {
      unsubAuth();
      unsubNotes();
      unsubMessage();
    };
  }, []);

  return (
    <Snackbar
      open={Boolean(notice)}
      autoHideDuration={8000}
      onClose={() => setNotice(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity="success" variant="filled" onClose={() => setNotice(null)} sx={{ whiteSpace: 'pre-wrap' }}>
        {notice?.body}
      </Alert>
    </Snackbar>
  );
}
