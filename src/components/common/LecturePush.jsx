import React, { useEffect, useState } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, onSnapshot, query, updateDoc, where,
} from 'firebase/firestore';
import { auth, db } from '../../services/FirebaseService';
import { registerLecturePush } from '../../services/PushService';
import { useLanguage } from '../../context/LanguageContext';

const DISMISS_KEY = 'ms_lecture_push_dismissed';

function dismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Lets a signed-in student allow lecture notifications once.
 * The Cloud Function writes the same message into Firestore, shown here if the site is open.
 */
export default function LecturePush() {
  const { t } = useLanguage();
  const [ask, setAsk] = useState(false);
  const [uid, setUid] = useState('');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let unsubNotes = () => {};
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubNotes();
      unsubNotes = () => {};
      if (!user) {
        setUid('');
        setAsk(false);
        return;
      }
      setUid(user.uid);
      const permission = typeof Notification === 'undefined' ? 'denied' : Notification.permission;
      if (permission === 'granted') {
        setAsk(false);
        try {
          await registerLecturePush(user.uid);
        } catch (e) {
          console.warn('Lecture push register failed', e);
        }
      } else if (permission === 'default' && !dismissed()) {
        setAsk(true);
      }

      unsubNotes = onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', user.uid)),
        (snap) => {
          const unread = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((n) => !n.read);
          const next = unread[0];
          if (!next) return;
          setNotice({ title: next.title || 'معهد المعرفة', body: next.body || '' });
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
    };
  }, []);

  const allow = async () => {
    if (typeof Notification === 'undefined' || !uid) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setAsk(false);
      return;
    }
    try {
      await registerLecturePush(uid);
    } catch (e) {
      console.warn('Lecture push register failed', e);
    }
    setAsk(false);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setAsk(false);
  };

  return (
    <>
      <Snackbar open={ask} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          severity="info"
          variant="filled"
          action={(
            <>
              <Button color="inherit" size="small" onClick={allow} sx={{ fontWeight: 800 }}>
                {t('سماح', 'אישור')}
              </Button>
              <Button color="inherit" size="small" onClick={dismiss}>
                {t('لاحقاً', 'אחר כך')}
              </Button>
            </>
          )}
        >
          {t(
            'اسمح بالإشعارات ليصلك تذكير المحاضرة على هذا الجهاز.',
            'אשרו התראות כדי לקבל תזכורת לשיעור במכשיר זה.'
          )}
        </Alert>
      </Snackbar>
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
    </>
  );
}
