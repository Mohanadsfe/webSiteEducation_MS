import React from 'react';
import { Box, Typography, Paper, Stack, Button, Chip } from '@mui/material';
import { School, MenuBook, ArrowBack, ArrowForward } from '@mui/icons-material';
import { TRACKS } from '../../constants/tracks';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from './LanguageToggle';

function TrackCard({ track, onSelect }) {
  const { t } = useLanguage();
  const Icon = track.id === 'bagrut' ? MenuBook : School;

  return (
    <Paper
      elevation={0}
      onClick={() => onSelect(track.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(track.id);
      }}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: { xs: 4, md: 5 },
        cursor: 'pointer',
        minHeight: { xs: 340, sm: 420, md: 520 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        color: '#fff',
        backgroundImage: `linear-gradient(185deg, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.88) 100%), url(${track.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '3px solid transparent',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
        outline: 'none',
        '&:hover, &:focus-visible': {
          transform: 'translateY(-10px) scale(1.015)',
          borderColor: track.accent,
          boxShadow: `0 32px 70px ${track.accentSoft}, 0 0 0 3px ${track.accent}55`,
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          insetInlineStart: 20,
          width: { xs: 56, md: 72 },
          height: { xs: 56, md: 72 },
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: track.accent,
          boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
        }}
      >
        <Icon sx={{ fontSize: { xs: 30, md: 38 }, color: '#fff' }} />
      </Box>

      <Box sx={{ p: { xs: 3, md: 4.5 }, textAlign: 'right', direction: 'rtl' }}>
        <Chip
          label={t(track.subtitleAr, track.subtitleHe)}
          sx={{
            mb: 2,
            bgcolor: 'rgba(255,255,255,0.18)',
            color: '#fff',
            fontWeight: 700,
            fontSize: { xs: '0.8rem', md: '0.95rem' },
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.3)',
            height: 'auto',
            py: 0.75,
          }}
        />
        <Typography
          sx={{
            fontWeight: 900,
            mb: 1,
            fontSize: { xs: '1.85rem', md: '2.5rem' },
            lineHeight: 1.2,
            textShadow: '0 4px 20px rgba(0,0,0,0.55)',
            letterSpacing: 0.3,
          }}
        >
          {t(track.titleAr, track.titleHe)}
        </Typography>
        <Typography
          sx={{
            opacity: 0.95,
            mb: 3,
            fontWeight: 500,
            fontSize: { xs: '1rem', md: '1.2rem' },
            lineHeight: 1.75,
            maxWidth: 460,
            ml: 'auto',
          }}
        >
          {t(track.descriptionAr, track.descriptionHe)}
        </Typography>
        <Button
          variant="contained"
          fullWidth
          endIcon={<ArrowForward />}
          sx={{
            bgcolor: track.accent,
            color: '#fff',
            fontWeight: 900,
            borderRadius: 999,
            py: { xs: 1.4, md: 1.7 },
            fontSize: { xs: '1rem', md: '1.15rem' },
            boxShadow: '0 10px 28px rgba(0,0,0,0.25)',
            '&:hover': { bgcolor: track.accent, filter: 'brightness(1.08)', color: '#fff' },
          }}
        >
          {t('اختر هذا المسار', 'בחרו מסלול זה')}
        </Button>
      </Box>
    </Paper>
  );
}

export default function TrackChooser({ onSelect }) {
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 5, md: 8 },
        px: { xs: 2, md: 4 },
        direction: 'rtl',
        background:
          'radial-gradient(ellipse at top, rgba(255,255,255,0.7) 0%, transparent 55%), linear-gradient(165deg, rgba(26,107,181,0.16) 0%, rgba(26,155,142,0.12) 45%, rgba(232,163,23,0.1) 100%)',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1200 }}>
        <Stack alignItems="center" spacing={2} sx={{ mb: { xs: 4, md: 6 } }}>
          <LanguageToggle size="large" />
          <Typography
            align="center"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2.4rem', sm: '3.2rem', md: '4rem' },
              lineHeight: 1.15,
              background: 'linear-gradient(100deg, #0b3d5c 10%, #1a6bb5 45%, #1a9b8e 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: 0.5,
            }}
          >
            {t('من أنت؟', 'מי את/ה?')}
          </Typography>
          <Typography
            align="center"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.1rem', md: '1.35rem' },
              color: 'rgba(0,0,0,0.65)',
              maxWidth: 640,
              lineHeight: 1.7,
            }}
          >
            {t(
              'اختر مسارك لعرض الجدول والميزات المناسبة لك',
              'בחרו מסלול כדי לראות לוח זמנים ותכונות שמתאימים לכם'
            )}
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 3, md: 4 },
          }}
        >
          <TrackCard track={TRACKS.academic} onSelect={onSelect} />
          <TrackCard track={TRACKS.bagrut} onSelect={onSelect} />
        </Box>
      </Box>
    </Box>
  );
}

export function TrackBanner({ trackConfig, onChangeTrack }) {
  const { t, isHe } = useLanguage();
  if (!trackConfig) return null;
  const features = isHe ? trackConfig.featuresHe : trackConfig.featuresAr;
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        borderRadius: 4,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '180px 1fr auto' },
        alignItems: 'stretch',
        border: `1px solid ${trackConfig.accentSoft}`,
        background: `linear-gradient(90deg, ${trackConfig.accentSoft}, rgba(255,255,255,0.95))`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
      }}
    >
      <Box
        sx={{
          minHeight: { xs: 160, sm: 140 },
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.18)), url(${trackConfig.imageAlt || trackConfig.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(1.15) contrast(1.05)',
        }}
      />
      <Box sx={{ p: { xs: 2, md: 2.5 }, direction: 'rtl', textAlign: 'right' }}>
        <Typography fontWeight={900} sx={{ color: trackConfig.accent, fontSize: '1.25rem' }}>
          {t(trackConfig.titleAr, trackConfig.titleHe)}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          {t(trackConfig.subtitleAr, trackConfig.subtitleHe)}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          {features.map((f) => (
            <Chip key={f} size="small" label={f} sx={{ fontWeight: 600 }} />
          ))}
        </Stack>
      </Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Button
          size="medium"
          startIcon={<ArrowBack />}
          onClick={onChangeTrack}
          sx={{ fontWeight: 800, whiteSpace: 'nowrap', borderRadius: 999, px: 2 }}
          variant="outlined"
        >
          {t('تغيير المسار', 'החלפת מסלול')}
        </Button>
      </Box>
    </Paper>
  );
}
