import React from 'react';
import { TextField, MenuItem, Alert, Typography, Box } from '@mui/material';
import { CONTENT_TRACK_OPTIONS } from '../../constants/tracks';

/**
 * Teacher form field: choose which student track can see this pack/course.
 */
export default function ContentTrackField({ value, onChange, sx }) {
  const selected = CONTENT_TRACK_OPTIONS.find((o) => o.value === value) || CONTENT_TRACK_OPTIONS[0];

  return (
    <Box sx={sx}>
      <TextField
        select
        label="المسار الذي يظهر له هذا المحتوى *"
        value={value || 'academic'}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        helperText="مهم: طلاب الأكاديمي يرون الأكاديمي فقط، وطلاب البجروت يرون البجروت فقط"
      >
        {CONTENT_TRACK_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.labelAr} — {o.labelHe}
          </MenuItem>
        ))}
      </TextField>
      <Alert severity={value === 'bagrut' ? 'warning' : value === 'academic' ? 'info' : 'success'} sx={{ mt: 1.5, textAlign: 'right' }}>
        <Typography variant="body2" fontWeight={700}>
          {selected.labelAr} / {selected.labelHe}
        </Typography>
        <Typography variant="caption" display="block">
          {selected.hintAr}
        </Typography>
        <Typography variant="caption" display="block">
          {selected.hintHe}
        </Typography>
      </Alert>
    </Box>
  );
}
