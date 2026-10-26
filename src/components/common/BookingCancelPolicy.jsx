import React from 'react';
import { Alert, Typography } from '@mui/material';

/**
 * Arabic cancel policy — shown when booking / viewing appointments.
 */
export default function BookingCancelPolicy({ dense = false }) {
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
        سياسة إلغاء المحاضرة
      </Typography>
      <Typography fontWeight={700} sx={{ lineHeight: 1.85, fontSize: dense ? '0.82rem' : '0.92rem' }}>
        إذا رغبت بإلغاء المحاضرة، يُرجى الإلغاء قبل ٢٤ ساعة على الأقل من موعد الدرس.
        بعد مرور أقل من ٢٤ ساعة يبقى الحجز قائماً ويُحتسب حتى لو لم تحضر الدرس.
        نقدّر تفهمكم ونعتذر عن أي إزعاج — نحرص على احترام وقت الجميع وتنظيم المواعيد بعدل.
      </Typography>
    </Alert>
  );
}
