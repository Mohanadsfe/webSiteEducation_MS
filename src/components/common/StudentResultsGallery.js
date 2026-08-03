import React, { useState } from 'react';
import {
  Box, Typography, Dialog, IconButton, Stack, Paper
} from '@mui/material';
import { Close, EmojiEvents } from '@mui/icons-material';
import studentResults from '../../assets/Images/studentResults';
import { useLanguage } from '../../context/LanguageContext';

export default function StudentResultsGallery() {
  const { t, isHe } = useLanguage();
  const [preview, setPreview] = useState(null);

  return (
    <Box sx={{ direction: 'rtl', textAlign: 'right', my: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(145deg, #f9a825, #f57c00)',
            color: '#fff',
            boxShadow: '0 8px 20px rgba(245,124,0,0.35)',
          }}
        >
          <EmojiEvents />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.35rem', md: '1.6rem' } }}>
            {t('نتائج الطلاب', 'תוצאות תלמידים')}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {t(
              'لقطات حقيقية من نجاحات طلابنا — علامات ورسائل شكر',
              'צילומי מסך אמיתיים מהצלחות התלמידים — ציונים והודעות תודה'
            )}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr 1fr',
          },
          gap: 2,
          mt: 2.5,
        }}
      >
        {studentResults.map((item) => (
          <Paper
            key={item.id}
            elevation={0}
            onClick={() => setPreview(item)}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 18px 40px rgba(0,0,0,0.14)',
              },
            }}
          >
            <Box
              component="img"
              src={item.src}
              alt={isHe ? item.titleHe : item.titleAr}
              loading="lazy"
              sx={{
                width: '100%',
                height: { xs: 220, sm: 200, md: 240 },
                objectFit: 'cover',
                objectPosition: 'top',
                display: 'block',
                bgcolor: '#f5f7fb',
              }}
            />
            <Box sx={{ px: 1.5, py: 1.1, bgcolor: 'rgba(255,255,255,0.96)' }}>
              <Typography fontWeight={800} fontSize="0.9rem">
                {t(item.titleAr, item.titleHe)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('اضغط للتكبير', 'לחצו להגדלה')}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', bgcolor: '#0d1117' } }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setPreview(null)}
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 2,
              bgcolor: 'rgba(255,255,255,0.92)',
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            <Close />
          </IconButton>
          {preview && (
            <Box
              component="img"
              src={preview.src}
              alt={isHe ? preview.titleHe : preview.titleAr}
              sx={{
                width: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
