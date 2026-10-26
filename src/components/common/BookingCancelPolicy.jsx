import React from 'react';
import { Alert, Typography } from '@mui/material';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Cancel policy — student self-cancel is only more than 24 hours before the lecture.
 */
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
          'يمكن للطالب إلغاء حجزه من «مواعيدي» إذا تبقّى أكثر من ٢٤ ساعة على بدء المحاضرة، وتعود الساعة للجدول. إذا بقي أقل من ٢٤ ساعة لا يُلغى الحجز من الموقع؛ للإلغاء الضروري تواصل أولاً مع المالك عبر واتساب. المالك يستطيع إلغاء أي حجز في أي وقت.',
          'תלמיד יכול לבטל הזמנה ב«התורים שלי» רק אם נשארו יותר מ-24 שעות לתחילת השיעור, והשעה חוזרת ללוח. אם נשארו פחות מ-24 שעות אי אפשר לבטל באתר; לביטול הכרחי יש לדבר קודם עם הבעלים בוואטסאפ. הבעלים יכול לבטל כל הזמנה בכל זמן.'
        )}
      </Typography>
    </Alert>
  );
}
