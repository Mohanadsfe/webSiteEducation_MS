import React, { useMemo, useRef, useState } from 'react';
import { Box, Typography, Button, Alert, IconButton, Tooltip } from '@mui/material';
import { OpenInNew, Fullscreen, FullscreenExit } from '@mui/icons-material';
import MovingStudentWatermark from './MovingStudentWatermark';

/**
 * Plays Google Drive preview when driveFileId exists.
 * For iCloud / other cloud links: open in new tab (cannot embed reliably).
 *
 * Watermark: MovingStudentWatermark loads name/phone from the signed-in Firestore
 * profile only — never from props/inputs students can edit on this page.
 *
 * Limitation: Google Drive's own fullscreen (inside the iframe) leaves our DOM
 * overlay. Our wrapper fullscreen keeps the watermark visible.
 */
function DriveVideoPlayer({ driveFileId, videoUrl, provider, courseId, lessonId }) {
  const shellRef = useRef(null);
  const [isFs, setIsFs] = useState(false);

  const src = useMemo(() => {
    if (driveFileId) return `https://drive.google.com/file/d/${driveFileId}/preview`;
    return '';
  }, [driveFileId]);

  const openUrl = videoUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : '');

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen?.();
        setIsFs(true);
      } else {
        await document.exitFullscreen?.();
        setIsFs(false);
      }
    } catch {
      /* fullscreen not available */
    }
  };

  React.useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  if (!driveFileId && openUrl) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', direction: 'rtl', position: 'relative' }}>
        <Alert severity="info" sx={{ mb: 2, textAlign: 'right' }}>
          {provider === 'icloud'
            ? 'فيديو iCloud يُفتح في نافذة جديدة (لا يُعرض داخل الصفحة مثل Drive). العلامة المائية تظهر داخل المشغّل المضمّن فقط.'
            : 'سيتم فتح رابط الفيديو في نافذة جديدة. العلامة المائية تظهر داخل مشغّل Drive المضمّن.'}
        </Alert>
        <Box
          sx={{
            position: 'relative',
            display: 'inline-block',
            p: 2,
            borderRadius: 2,
            bgcolor: 'rgba(0,0,0,0.06)',
            minWidth: { xs: '100%', sm: 320 },
          }}
        >
          <MovingStudentWatermark />
          <Button
            variant="contained"
            size="large"
            startIcon={<OpenInNew />}
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontWeight: 900, position: 'relative', zIndex: 1 }}
          >
            فتح الفيديو من السحابة
          </Button>
        </Box>
      </Box>
    );
  }

  if (!src) {
    return (
      <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
        لا يوجد رابط فيديو لهذا الدرس
      </Typography>
    );
  }

  return (
    <Box
      ref={shellRef}
      data-course-id={courseId || ''}
      data-lesson-id={lessonId || ''}
      sx={{
        position: 'relative',
        width: '100%',
        pt: isFs ? 0 : '56.25%',
        height: isFs ? '100%' : 'auto',
        minHeight: isFs ? '100vh' : undefined,
        borderRadius: isFs ? 0 : 1.5,
        overflow: 'hidden',
        bgcolor: '#000',
        direction: 'rtl',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <iframe
          title={`lesson-${lessonId || 'video'}`}
          src={src}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          width="100%"
          height="100%"
          style={{ border: 0 }}
        />
      </Box>

      {/* Overlay does not capture clicks — playback / seek / quality stay on the iframe */}
      <MovingStudentWatermark />

      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 7,
          pointerEvents: 'auto',
        }}
      >
        <Tooltip title={isFs ? 'خروج من ملء الشاشة' : 'ملء الشاشة (مع العلامة المائية)'}>
          <IconButton
            size="small"
            onClick={toggleFullscreen}
            sx={{
              bgcolor: 'rgba(0,0,0,0.45)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
            }}
            aria-label="toggle fullscreen"
          >
            {isFs ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          textAlign: 'center',
          pb: 0.5,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.85)',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            fontSize: { xs: '0.6rem', sm: '0.7rem' },
          }}
        >
          التصوير أو المشاركة مخالفة لشروط الاستخدام · العلامة لا تمنع التسجيل بالكامل
        </Typography>
      </Box>
    </Box>
  );
}

export default DriveVideoPlayer;
