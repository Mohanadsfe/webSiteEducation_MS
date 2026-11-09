import React from 'react';
import { Alert, Typography } from '@mui/material';
import { useLanguage } from '../../context/LanguageContext';

/** Cancel is measured from the booking day, not from the lesson hour. */
export default function BookingCancelPolicy({ dense = false }) {
  const { t } = useLanguage();
  return (
    <Alert
      severity="warning"
      sx={{
        textAlign: 'right',
        direction: 'rtl',
        py: dense ? 0.75 : 1.25,
        '& .MuiAlert-message': { width: '100%' },
      }}
    >
      <Typography fontWeight={900} sx={{ mb: 0.5, fontSize: dense ? '0.9rem' : '1rem' }}>
        {t('سياسة إلغاء المحاضرة', 'מדיניות ביטול שיעור')}
      </Typography>
      <Typography fontWeight={700} sx={{ lineHeight: 1.85, fontSize: dense ? '0.82rem' : '0.92rem' }}>
        {t(
          'يمكن للطالب إلغاء حجزه من «مواعيدي» في أي وقت. بعد الإلغاء تختفي تفاصيل الحجز وتعود الساعة للجدول.',
          'תלמיד יכול לבטל הזמנה ב«התורים שלי» בכל זמן. אחרי הביטול פרטי ההזמנה נעלמים והשעה חוזרת ללוח.'
        )}
      </Typography>
    </Alert>
  );
}
