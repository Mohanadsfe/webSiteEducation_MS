import React, { useState } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
} from '@mui/material';
import AppointmentsService, { parseAppointmentStart, studentCanCancelBooking } from '../../services/AppointmentsService';
import { buildWhatsAppUrl } from '../../constants/payment';
import { useLanguage } from '../../context/LanguageContext';

/** Student cancel: allowed more than 24 hours before the lecture, otherwise WhatsApp the owner. */
export default function CancelBookingButton({ booking, fullWidth = true, onCancelled }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const openWhatsApp = () => {
    const start = parseAppointmentStart(booking);
    const when = start ? start.format('YYYY-MM-DD HH:mm') : '';
    const message = t(
      `مرحباً، أحتاج إلغاء حجزي${when ? ` بتاريخ ${when}` : ''} لأن الموعد خلال أقل من ٢٤ ساعة.`,
      `שלום, אני צריך לבטל את ההזמנה${when ? ` בתאריך ${when}` : ''} כי נשארו פחות מ-24 שעות.`
    );
    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const cancel = async () => {
    if (!studentCanCancelBooking(booking)) {
      setOpen(true);
      return;
    }
    const ok = window.confirm(t(
      'إلغاء هذا الحجز؟ ستعود الساعة متاحة في الجدول.',
      'לבטל הזמנה זו? השעה תחזור ללוח.'
    ));
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      await AppointmentsService.deleteBooking(booking.id);
      onCancelled?.(booking.id);
    } catch (e) {
      setError(e?.message || t('فشل الإلغاء', 'הביטול נכשל'));
    } finally {
      setBusy(false);
    }
  };

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
          {t('لا يمكن الإلغاء من الموقع', 'לא ניתן לבטל באתר')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ lineHeight: 1.8 }}>
            {t(
              'بقي أقل من ٢٤ ساعة على بدء المحاضرة، لذلك لا يُلغى الحجز من هنا. إذا كان الإلغاء ضرورياً، تواصل أولاً مع المالك عبر واتساب.',
              'נשארו פחות מ-24 שעות לתחילת השיעור, ולכן אי אפשר לבטל מכאן. אם הביטול הכרחי, דברו קודם עם הבעלים בוואטסאפ.'
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 800 }}>
            {t('إغلاق', 'סגירה')}
          </Button>
          <Button variant="contained" onClick={openWhatsApp} sx={{ fontWeight: 900 }}>
            {t('واتساب المالك', 'וואטסאפ לבעלים')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
