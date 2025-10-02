import React, { useEffect, useState } from 'react';
import { Card, CardActionArea, CardContent, CardMedia, Chip, Typography, Box, Button, Stack } from '@mui/material';
import { Description } from '@mui/icons-material';
import { collection, getCountFromServer } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../services/FirebaseService';

function CourseCard({ course, locked, onEdit, onDelete, onManageLessons, onManageEnrollments, isTeacher }) {
  const [lessonsCount, setLessonsCount] = useState(0);


  useEffect(() => {
    async function fetchCount() {
      try {
        const coll = collection(db, 'courses', course.id, 'lessons');
        const snap = await getCountFromServer(coll);
        setLessonsCount(snap.data().count || 0);
      } catch (e) {
        setLessonsCount(0);
      }
    }
    if (course?.id) fetchCount();
  }, [course?.id]);

  return (
    <Card sx={{ borderRadius: 2, overflow: 'hidden', position: 'relative', direction: 'rtl' }}>
      <CardActionArea component={locked ? 'div' : Link} to={locked ? undefined : `/courses/${course.id}`} disabled={locked}>
        {course.thumbnailUrl && (
          <CardMedia component="img" height="160" image={course.thumbnailUrl} alt={course.title} />
        )}
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{course.title}</Typography>
            <Chip size="small" label={course.category === 'tutoring' ? 'خصوصي' : course.category === 'exam' ? 'امتحان' : 'عام'} color="primary" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {course.description}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Chip size="small" label={`${lessonsCount} دروس`} />
            {course.syllabusUrl && <Chip size="small" color="success" label="منهج متوفر" />}
            {!course.isActive && <Chip size="small" color="warning" label="غير مفعّل" />}
            {locked && <Chip size="small" color="default" label="مقفلة" />}
          </Stack>
          
        </CardContent>
      </CardActionArea>

      {/* Syllabus Button - Always available (outside CardActionArea) */}
      {course.syllabusUrl && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Button
            size="small"
            variant={locked ? "contained" : "outlined"}
            startIcon={<Description />}
            onClick={() => {
              window.open(course.syllabusUrl, '_blank', 'noopener,noreferrer');
            }}
            fullWidth
            sx={{ 
              fontSize: '0.75rem',
              ...(locked && {
                bgcolor: 'success.main',
                '&:hover': { bgcolor: 'success.dark' },
                color: 'white'
              })
            }}
          >
            {locked ? '📚 عرض المنهج (متاح للجميع)' : 'عرض المنهج الدراسي'}
          </Button>
        </Box>
      )}

      {locked && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Button fullWidth variant="outlined" color="secondary" component={Link} to={`https://wa.me/972548010225?text=مرحبا، أود الوصول إلى دورة: ${encodeURIComponent(course.title)}`}>اطلب الوصول عبر واتساب</Button>
        </Box>
      )}

      {isTeacher && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={() => onManageLessons?.(course)}>إدارة الدروس</Button>
            <Button size="small" variant="outlined" onClick={() => onManageEnrollments?.(course)}>إدارة الوصول</Button>
            <Button size="small" onClick={() => onEdit?.(course)}>تعديل</Button>
            <Button size="small" color="error" onClick={() => onDelete?.(course)}>حذف</Button>
          </Stack>
        </Box>
      )}
    </Card>
  );
}

export default CourseCard;


