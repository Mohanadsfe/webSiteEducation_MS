import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography,
} from '@mui/material';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/FirebaseService';
import {
  cancelBookingNotifications,
  enableBookingNotifications,
  noticesCancelled,
  pushSupport,
  refreshBookingNotifications,
} from '../../services/PushService';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Signed-in users are asked to accept messages.
 * Cancel is how they stop receiving them.
 */
export default function EnableBookingNotifications({ variant = 'prompt' }) {
  const { t } = useLanguage();
  const [uid, setUid] = useState('');
  const [permission, setPermission] = useState('default');
  const [cancelled, setCancelled] = useState(noticesCancelled);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const support = pushSupport();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : '');
      setError('');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      return undefined;
    }
    setPermission(Notification.permission);
    if (!uid) return undefined;
    if (Notification.permission === 'granted' && !noticesCancelled()) {
      refreshBookingNotifications(uid).catch(() => {});
      return undefined;
    }
    if (Notification.permission === 'default' && !noticesCancelled() && variant === 'prompt') {
      setAsk(true);
    }
    return undefined;
  }, [uid, variant]);

  if (!uid) return null;

  const accept = async () => {
    setBusy(true);
    setError('');
    const result = await enableBookingNotifications(uid);
    setBusy(false);
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
    if (result.ok) {
      setCancelled(false);
      setAsk(false);
      return;
    }
    if (result.reason === 'denied') setAsk(false);
    setError(result.reason === 'denied'
      ? t('تم إلغاء الرسائل من المتصفح.', 'ההתראות בוטלו בדפדפן.')
      : t('تعذر تفعيل الرسائل. حاول مرة أخرى.', 'לא הצלחנו להפעיל התראות. נסו שוב.'));
  };

  const cancel = async () => {
    setBusy(true);
    await cancelBookingNotifications(uid).catch(() => {});
    setBusy(false);
    setCancelled(true);
    setAsk(false);
  };

  const receiving = permission === 'granted' && !cancelled;

  return (
    <>
      <Dialog open={ask && variant === 'prompt'} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t('رسائل التذكير', 'הודעות תזכורת')}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t(
              'ستصلك رسائل الحجز على هذا الجهاز حتى إذا كان الموقع مغلقاً. اضغط قبول، أو إلغاء إذا لا تريد الرسائل.',
              'ההודעות יגיעו למכשיר גם כשהאתר סגור. לחצו אישור, או ביטול אם אינכם רוצים הודעות.'
            )}
          </Typography>
          {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
          {support === 'ios-home-screen' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t(
                'على iPhone أضف الموقع إلى الشاشة الرئيسية وافتحه من الأيقونة، ثم اضغط قبول.',
                'ב-iPhone הוסיפו את האתר למסך הבית ופתחו מהאייקון, ואז לחצו אישור.'
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancel} disabled={busy}>
            {t('إلغاء', 'ביטול')}
          </Button>
          <Button variant="contained" onClick={accept} disabled={busy || support === 'unsupported' || support === 'ios-home-screen'}>
            {t('قبول', 'אישור')}
          </Button>
        </DialogActions>
      </Dialog>

      {variant === 'settings' && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography variant="body2">
            {receiving
              ? t('ستصلك الرسائل. يمكنك الإلغاء فقط إذا لا تريدها.', 'ההודעות פעילות. אפשר לבטל רק אם אינכם רוצים אותן.')
              : t('الرسائل متوقفة.', 'ההודעות כבויות.')}
          </Typography>
          {receiving ? (
            <Button color="error" variant="outlined" onClick={cancel} disabled={busy} sx={{ fontWeight: 900, alignSelf: 'flex-start' }}>
              {t('إلغاء الرسائل', 'ביטול ההודעות')}
            </Button>
          ) : (
            <Button variant="contained" onClick={accept} disabled={busy} sx={{ fontWeight: 900, alignSelf: 'flex-start' }}>
              {t('قبول الرسائل', 'אישור הודעות')}
            </Button>
          )}
        </Stack>
      )}
    </>
  );
}
