import React from 'react';
import { Box, Typography } from '@mui/material';
import { LATE_CANCEL_LIMIT } from '../../services/bookingPolicy';
import { useLanguage } from '../../context/LanguageContext';

export default function StudentBookingCounts({ stats, name }) {
  const { t } = useLanguage();
  if (!stats) return null;
  const rows = [
    [t('حجوزات قادمة', 'הזמנות קרובות'), stats.upcoming],
    [t('محاضرات تمّت', 'שיעורים שהתקיימו'), stats.completed],
    [t('إلغاء قبل ٢٤ ساعة من يوم الحجز', 'ביטול לפני 24 שעות מיום ההזמנה'), stats.earlyCancels],
    [t('إلغاء متأخر يُحتسب', 'ביטול מאוחר שנחשב'), `${stats.lateCancels} / ${LATE_CANCEL_LIMIT}`],
  ];
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'rgba(11,61,92,0.06)',
        border: '1px solid rgba(11,61,92,0.12)',
      }}
    >
      {name ? (
        <Typography fontWeight={900} sx={{ mb: 0.75 }}>
          {name}
        </Typography>
      ) : null}
      {rows.map(([label, value]) => (
        <Typography key={label} variant="body2" sx={{ fontWeight: 700, lineHeight: 1.8 }}>
          {label}: {value}
        </Typography>
      ))}
    </Box>
  );
}
