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
          'يمكن للطالب إلغاء حجزه من «مواعيدي» فقط إذا تبقّى أكثر من ٢٤ ساعة على يوم بدء الحجز، وليس على ساعة المحاضرة، وتعود الساعة للجدول. إذا بقي أقل من ٢٤ ساعة على يوم الحجز يُحتسب الحجز ولا يُرد المبلغ، والحجز يبقى للطالب. هذا مسموح ثلاث مرات، وبعدها يكون الإلغاء من خلال المالك. المالك يستطيع إلغاء أي حجز في أي وقت.',
          'תלמיד יכול לבטל הזמנה ב«התורים שלי» רק אם נשארו יותר מ-24 שעות לפני יום תחילת ההזמנה, לא לפני שעת השיעור, והשעה חוזרת ללוח. אם נשארו פחות מ-24 שעות ליום ההזמנה ההזמנה נספרת ואין החזר כסף. זה מותר שלוש פעמים, ואחר כך הביטול דרך הבעלים. הבעלים יכול לבטל כל הזמנה בכל זמן.'
        )}
      </Typography>
    </Alert>
  );
}
