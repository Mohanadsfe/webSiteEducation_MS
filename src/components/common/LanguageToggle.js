import React from 'react';
import { Box, Button } from '@mui/material';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Two language buttons — only one is active at a time (AR or HE).
 */
export default function LanguageToggle({ size = 'medium', light = false }) {
  const { lang, setLang } = useLanguage();
  const large = size === 'large';

  const btnSx = (active) => ({
    minWidth: large ? 120 : 72,
    px: large ? 2.5 : 1.5,
    py: large ? 1.1 : 0.6,
    fontWeight: 800,
    fontSize: large ? '1.05rem' : '0.85rem',
    borderRadius: 999,
    textTransform: 'none',
    transition: 'all 0.2s ease',
    ...(active
      ? {
          bgcolor: light ? '#fff' : '#1a6bb5',
          color: light ? '#0b3d5c' : '#fff',
          boxShadow: light
            ? '0 6px 18px rgba(255,255,255,0.35)'
            : '0 6px 16px rgba(26,107,181,0.35)',
          '&:hover': {
            bgcolor: light ? '#f7fafc' : '#155a9a',
          },
        }
      : {
          bgcolor: light ? 'rgba(255,255,255,0.16)' : 'rgba(26,107,181,0.08)',
          color: light ? 'rgba(255,255,255,0.88)' : 'rgba(11,61,92,0.65)',
          border: light ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(26,107,181,0.2)',
          '&:hover': {
            bgcolor: light ? 'rgba(255,255,255,0.28)' : 'rgba(26,155,142,0.12)',
            color: light ? '#fff' : '#0b3d5c',
          },
        }),
  });

  return (
    <Box
      sx={{
        display: 'inline-flex',
        gap: 1,
        p: 0.6,
        borderRadius: 999,
        bgcolor: light ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(10px)',
        border: light ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(13,71,161,0.12)',
        boxShadow: light ? '0 8px 24px rgba(0,0,0,0.2)' : '0 4px 14px rgba(0,0,0,0.08)',
      }}
    >
      <Button
        disableElevation
        onClick={() => setLang('ar')}
        sx={btnSx(lang === 'ar')}
        aria-pressed={lang === 'ar'}
      >
        عربي
      </Button>
      <Button
        disableElevation
        onClick={() => setLang('he')}
        sx={btnSx(lang === 'he')}
        aria-pressed={lang === 'he'}
      >
        עברית
      </Button>
    </Box>
  );
}
