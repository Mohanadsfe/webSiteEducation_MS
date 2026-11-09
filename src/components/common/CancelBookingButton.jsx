import React, { useState } from 'react';
import { Button, Typography } from '@mui/material';
import AppointmentsService from '../../services/AppointmentsService';
import { useLanguage } from '../../context/LanguageContext';

/** One click cancels the booking at any time and frees the hour. */
export default function CancelBookingButton({ booking, fullWidth = true, onCancelled }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const status = String(booking?.status || '').toLowerCase();
  if (status === 'cancelled' || status === 'canceled') return null;

  const cancel = async () => {
    setBusy(true);
    setError('');
    try {
      await AppointmentsService.cancelMyBooking(booking.id);
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
        {busy ? t('جارٍ الإلغاء...', 'מבטל...') : t('إلغاء الحجز', 'ביטול ההזמנה')}
      </Button>
      {error ? (
        <Typography color="error" sx={{ display: 'block', mt: 1, fontWeight: 800 }}>
          {error}
        </Typography>
      ) : null}
    </>
  );
}
