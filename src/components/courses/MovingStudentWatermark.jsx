import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/FirebaseService';
import UsersService from '../../services/UsersService';
import {
  WATERMARK_POSITIONS,
  buildWatermarkTextFromProfile,
  nextWatermarkMoveDelayMs,
  nextWatermarkPositionIndex,
} from '../../utils/studentWatermark';

/**
 * Moving identity watermark over course video players.
 * Loads name/phone from the authenticated Firestore profile only.
 * Does not claim to stop screen recording — discourages sharing / aids leak tracing.
 */
export default function MovingStudentWatermark() {
  const [label, setLabel] = useState(buildWatermarkTextFromProfile(null));
  const [posIndex, setPosIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) setLabel(buildWatermarkTextFromProfile(null));
        return;
      }
      try {
        const profile = await UsersService.getUser(user.uid);
        if (!cancelled) setLabel(buildWatermarkTextFromProfile(profile));
      } catch {
        if (!cancelled) setLabel(buildWatermarkTextFromProfile(null));
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let timer = null;
    const schedule = () => {
      timer = setTimeout(() => {
        setPosIndex((i) => nextWatermarkPositionIndex(i));
        schedule();
      }, nextWatermarkMoveDelayMs());
    };
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const pos = WATERMARK_POSITIONS[posIndex] || WATERMARK_POSITIONS[0];

  return (
    <Box
      aria-hidden
      data-testid="moving-student-watermark"
      sx={{
        position: 'absolute',
        zIndex: 6,
        pointerEvents: 'none',
        userSelect: 'none',
        maxWidth: { xs: '92%', sm: '80%', md: '70%' },
        transition: 'top 0.55s ease, left 0.55s ease, right 0.55s ease, bottom 0.55s ease, transform 0.55s ease, opacity 0.35s ease',
        top: pos.top,
        left: pos.left,
        right: pos.right,
        bottom: pos.bottom,
        transform: pos.transform,
      }}
    >
      <Typography
        component="div"
        sx={{
          display: 'inline-block',
          px: { xs: 0.85, sm: 1.1 },
          py: { xs: 0.35, sm: 0.45 },
          borderRadius: 1,
          bgcolor: 'rgba(0, 0, 0, 0.42)',
          color: 'rgba(255, 255, 255, 0.92)',
          fontSize: { xs: '0.65rem', sm: '0.72rem', md: '0.78rem' },
          fontWeight: 700,
          letterSpacing: 0.2,
          lineHeight: 1.35,
          textAlign: 'center',
          wordBreak: 'break-word',
          textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 1px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.12)',
          direction: 'ltr',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
