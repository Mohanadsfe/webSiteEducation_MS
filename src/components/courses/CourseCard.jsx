import React, { useEffect, useState } from 'react';
import { Card, CardActionArea, CardContent, CardMedia, Chip, Typography, Box, Button, Stack } from '@mui/material';
import { Description, PlayCircleOutline, NewReleases, AutoAwesome } from '@mui/icons-material';
import { collection, getCountFromServer } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../services/FirebaseService';
import { buildWhatsAppUrl } from '../../constants/payment';
import CourseLicenseAgreementDialog from './CourseLicenseAgreementDialog';
import { isCourseNewish, isCourseUnseen, getSeenAt } from '../../services/WhatsNewService';

function CourseCard({ course, locked, onEdit, onDelete, onManageLessons, onManageEnrollments, isTeacher }) {
  const catalogLen = Array.isArray(course?.lessonCatalog) ? course.lessonCatalog.length : 0;
  const [lessonsCount, setLessonsCount] = useState(
    Number(course?.lessonsCount) || catalogLen || 0
  );
  const [licenseOpen, setLicenseOpen] = useState(false);
  const showNew = isCourseNewish(course);
  const showUnseen = isCourseUnseen(course, getSeenAt());

  useEffect(() => {
    const fromCourse = Number(course?.lessonsCount) || catalogLen || 0;
    if (fromCourse > 0) setLessonsCount(fromCourse);

    async function fetchCount() {
      try {
        const coll = collection(db, 'courses', course.id, 'lessons');
        const snap = await getCountFromServer(coll);
        const n = snap.data().count || 0;
        if (n > 0) setLessonsCount(n);
      } catch {
        // Students may not read lessons subcollection — use public course fields
        setLessonsCount(Number(course?.lessonsCount) || catalogLen || 0);
      }
    }
    if (course?.id) fetchCount();
  }, [course?.id, course?.lessonsCount, catalogLen]);

  return (
    <Card sx={{ borderRadius: 2, overflow: 'hidden', position: 'relative', direction: 'rtl' }}>
      {(showNew || showUnseen) && (
        <Chip
          size="small"
          icon={showUnseen ? <AutoAwesome sx={{ fontSize: 14 }} /> : <NewReleases sx={{ fontSize: 14 }} />}
          label={showUnseen ? 'جديد عليك' : 'جديد'}
          color="error"
          sx={{
            position: 'absolute',
            top: 10,
            insetInlineStart: 10,
            zIndex: 2,
            fontWeight: 900,
            boxShadow: '0 4px 12px rgba(198,40,40,0.35)',
          }}
        />
      )}
      {/* Always openable — students enter for free first video; rest need a code */}
      <CardActionArea component={Link} to={`/courses/${course.id}`}>
        {course.thumbnailUrl && (
          <CardMedia component="img" height="160" image={course.thumbnailUrl} alt={course.title} />
        )}
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{course.title}</Typography>
            <Chip
              size="small"
              label={
                (() => {
                  const c = (course.category || '').toLowerCase();
                  if (c === 'bagrut' || c === 'exam') return 'בגרות / مدرسة';
                  if (c === 'academic' || c === 'tutoring') return 'أكاديمي';
                  if (c === 'both') return 'للمسارين';
                  return 'عام';
                })()
              }
              color={
                (course.category === 'bagrut' || course.category === 'exam') ? 'error'
                  : (course.category === 'academic' || course.category === 'tutoring') ? 'primary'
                    : 'default'
              }
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {course.description}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${lessonsCount} فيديو`} />
            {course.syllabusUrl && <Chip size="small" color="success" label="منهج متوفر" />}
            {!course.isActive && <Chip size="small" color="warning" label="غير مفعّل" />}
            {locked && <Chip size="small" color="success" variant="outlined" label="معاينة: الفيديو الأول مجاني" />}
          </Stack>
        </CardContent>
      </CardActionArea>

      {course.syllabusUrl && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Description />}
            onClick={() => window.open(course.syllabusUrl, '_blank', 'noopener,noreferrer')}
            fullWidth
            sx={{ fontSize: '0.75rem' }}
          >
            عرض المنهج الدراسي
          </Button>
        </Box>
      )}

      {locked && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Stack spacing={1}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              component={Link}
              to={`/courses/${course.id}`}
              startIcon={<PlayCircleOutline />}
              sx={{ fontWeight: 800 }}
            >
              دخول الدورة — شاهد الفيديو الأول
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setLicenseOpen(true)}
            >
              طلب كود لباقي الفيديوهات
            </Button>
          </Stack>
        </Box>
      )}

      {isTeacher && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="contained" onClick={() => onManageLessons?.(course)}>إدارة الدروس</Button>
            <Button size="small" variant="outlined" onClick={() => onManageEnrollments?.(course)}>إدارة الوصول</Button>
            <Button size="small" onClick={() => onEdit?.(course)}>تعديل</Button>
            <Button size="small" color="error" onClick={() => onDelete?.(course)}>حذف</Button>
          </Stack>
        </Box>
      )}

      <CourseLicenseAgreementDialog
        open={licenseOpen}
        courseTitle={course?.title}
        onClose={() => setLicenseOpen(false)}
        onAgree={() => {
          setLicenseOpen(false);
          const text = `مرحباً، أريد كوداً شخصياً لباقي فيديوهات الدورة:\n${course?.title || ''}`;
          window.open(buildWhatsAppUrl(text), '_blank', 'noopener,noreferrer');
        }}
      />
    </Card>
  );
}

export default CourseCard;
