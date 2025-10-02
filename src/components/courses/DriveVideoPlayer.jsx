import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

function formatStamp() {
  const d = new Date();
  return d.toLocaleString();
}

function DriveVideoPlayer({ driveFileId, studentEmail, courseId, lessonId }) {
  const [stamp, setStamp] = useState(formatStamp());
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setStamp(formatStamp()), 20000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, []);

  const src = useMemo(() => `https://drive.google.com/file/d/${driveFileId}/preview`, [driveFileId]);
  const watermark = `${studentEmail || 'user'} • ${courseId} • ${lessonId} • ${stamp}`;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        pt: '56.25%',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 3,
        direction: 'rtl',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <iframe
          title={`lesson-${lessonId}`}
          src={src}
          allow="autoplay; encrypted-media"
          width="100%"
          height="100%"
          style={{ border: 0 }}
        />
      </Box>

      {[{ top: 8, left: 8 }, { bottom: 8, right: 8 }, { top: 8, right: 8 }].map((pos, i) => (
        <Typography
          key={i}
          variant="caption"
          sx={{
            position: 'absolute',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'rgba(0,0,0,0.3)',
            color: 'rgba(255,255,255,0.9)',
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
            ...pos,
          }}
        >
          {watermark}
        </Typography>
      ))}

      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', pb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          التصوير أو المشاركة مخالفة لشروط الاستخدام
        </Typography>
      </Box>
    </Box>
  );
}

export default DriveVideoPlayer;


