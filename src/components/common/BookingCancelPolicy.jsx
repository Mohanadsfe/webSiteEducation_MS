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
        {t('سياسة الحجز والإلغاء', 'מדיניות הזמנה וביטול')}
      </Typography>
      <Typography fontWeight={700} sx={{ lineHeight: 1.85, fontSize: dense ? '0.82rem' : '0.92rem' }}>
        {t(
          'لا يمكن حجز أي ساعة في نفس اليوم. الحجز يكون قبل ٢٤ ساعة من يوم المحاضرة. الإلغاء المجاني يكون قبل ٢٤ ساعة من يوم الحجز، وليس قبل ٢٤ ساعة من ساعة المحاضرة. إذا أُلغي بعد ذلك يُحتسب الحجز ولا يُرد المبلغ، والحجز يبقى لك ولن تخسره. هذا الإلغاء المتأخر مسموح ثلاث مرات، وبعدها يكون الإلغاء من خلال المالك فقط.',
          'אי אפשר להזמין שעה באותו יום. ההזמנה היא 24 שעות לפני יום השיעור. ביטול בלי חיוב הוא 24 שעות לפני יום ההזמנה, לא לפני שעת השיעור. ביטול אחרי זה נספר, אין החזר כסף, וההזמנה נשארת שלך. ביטול מאוחר מותר שלוש פעמים, ואחר כך רק דרך הבעלים.'
        )}
      </Typography>
    </Alert>
  );
}
