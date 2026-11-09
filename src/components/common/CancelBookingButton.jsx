import React, { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
} from '@mui/material';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../services/FirebaseService';
import AppointmentsService, { parseAppointmentStart } from '../../services/AppointmentsService';
import { isEarlyCancel, LATE_CANCEL_LIMIT } from '../../services/bookingPolicy';
import { buildWhatsAppUrl } from '../../constants/payment';
import { useLanguage } from '../../context/LanguageContext';

const LATE_MESSAGE = 'هذا الحجز سيُحتسب عليك مسبقاً. لا يمكن إرجاع المبلغ لهذا الحجز، لكن الحجز يبقى لك ولن تخسره. لديك ثلاث مرات مثل هذه، وبعدها يصبح الإلغاء من خلال المالك فقط.';

/** Student cancel. Early cancel is before 24 hours from the booking day. Late cancel counts, up to three times. */
export default function CancelBookingButton({ booking, fullWidth = true, onCancelled }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('late');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storedLate, setStoredLate] = useState(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'users', uid), (snap) => {
      setStoredLate(Number(snap.data()?.lateCancelCount || 0));
    }, () => {});
  }, []);

  const lateUsed = Math.max(storedLate, 0);
  const start = parseAppointmentStart(booking);
  const early = isEarlyCancel(start);

  const openWhatsApp = () => {
    const when = start ? start.format('YYYY-MM-DD HH:mm') : '';
    const message = t(
      `مرحباً، استخدمت ثلاث مرات الإلغاء المتأخر وأحتاج إلغاء الحجز${when ? ` بتاريخ ${when}` : ''}.`,
      `שלום, השתמשתי בשלוש פעמים הביטול המאוחר ואני צריך לבטל את ההזמנה${when ? ` בתאריך ${when}` : ''}.`
    );
    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const runCancel = async () => {
    setBusy(true);
    setError('');
    try {
      await AppointmentsService.cancelMyBooking(booking.id);
      setOpen(false);
      onCancelled?.(booking.id);
    } catch (e) {
      const code = String(e?.code || '');
      const message = String(e?.message || '');
      if (code.includes('failed-precondition') && message.includes('LATE_LIMIT')) {
        setMode('limit');
        setOpen(true);
      } else {
        setError(message || t('فشل الإلغاء', 'הביטול נכשל'));
      }
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!early && lateUsed >= LATE_CANCEL_LIMIT) {
      setMode('limit');
      setOpen(true);
      return;
    }
    if (!early) {
      setMode('late');
      setOpen(true);
      return;
    }
    const ok = window.confirm(t(
      'إلغاء هذا الحجز؟ ستعود الساعة للجدول ولن يُحتسب هذا الحجز.',
      'לבטל הזמנה זו? השעה תחזור ללוח וההזמנה לא תיספר.'
    ));
    if (!ok) return;
    await runCancel();
  };

  const status = String(booking?.status || '').toLowerCase();
  if (status === 'cancelled' || status === 'canceled') return null;

  return (
    <>
      <Button
        variant="contained"
        color="error"
        fullWidth={fullWidth}
        disabled={busy}
        onClick={cancel}
        sx={{ fontWeight: 900, mt: 1 }}
      >
        {t('إلغاء الحجز', 'ביטול ההזמנה')}
      </Button>
      {error ? (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      ) : null}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {mode === 'limit'
            ? t('الإلغاء من خلال المالك', 'הביטול דרך הבעלים')
            : t('إلغاء متأخر', 'ביטול מאוחר')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ lineHeight: 1.9 }}>
            {mode === 'limit'
              ? t(
                'استخدمت ثلاث مرات الإلغاء المتأخر. بعد ذلك لا يمكن الإلغاء من الموقع، ويكون الإلغاء من خلال المالك فقط.',
                'השתמשתם בשלוש פעמים הביטול המאוחר. אחר כך אי אפשר לבטל באתר, והביטול הוא דרך הבעלים בלבד.'
              )
              : t(
                `${LATE_MESSAGE}\n\nهذه المرة ${lateUsed + 1} من ${LATE_CANCEL_LIMIT}.`,
                `ההזמנה תיספר מראש. אי אפשר לקבל את הכסף חזרה, אבל ההזמנה נשארת שלך ולא הולכת לאיבוד. יש שלוש פעמים כאלה, ואחר כך רק הבעלים יכול לבטל.\n\nזו פעם ${lateUsed + 1} מתוך ${LATE_CANCEL_LIMIT}.`
              )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 800 }}>
            {t('رجوع', 'חזרה')}
          </Button>
          {mode === 'limit' ? (
            <Button variant="contained" onClick={openWhatsApp} sx={{ fontWeight: 900 }}>
              {t('واتساب المالك', 'וואטסאפ לבעלים')}
            </Button>
          ) : (
            <Button variant="contained" color="error" disabled={busy} onClick={runCancel} sx={{ fontWeight: 900 }}>
              {t('متابعة الإلغاء', 'המשך ביטול')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
