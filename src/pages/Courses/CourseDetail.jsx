import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Button, Card, CardContent, List, ListItem, ListItemText, ListItemButton, Chip, Stack } from '@mui/material';
import { PlayArrow, Description } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import DriveVideoPlayer from '../../components/courses/DriveVideoPlayer';
import CoursesService from '../../services/CoursesService';
import EnrollmentsService from '../../services/EnrollmentsService';
import UsersService from '../../services/UsersService';

export default function CourseDetail() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState('none');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userData = await UsersService.getUser(user.uid);
        setRole(userData?.role || '');
        
        // Load course data
        const courseData = await CoursesService.getCourse(courseId);
        if (!courseData) {
          navigate('/courses');
          return;
        }
        setCourse(courseData);
        
        // Check enrollment status for students
        if (userData?.role === 'student') {
          const status = await EnrollmentsService.getEnrollmentStatus(user.uid, courseId);
          setEnrollmentStatus(status);
          
          if (status === 'active') {
            // Load lessons for enrolled students
            const lessonsData = await CoursesService.listLessons(courseId);
            setLessons(lessonsData);
          }
        } else if (userData?.role === 'teacher') {
          // Teachers can see all lessons
          const lessonsData = await CoursesService.listLessons(courseId);
          setLessons(lessonsData);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [courseId, navigate]);

  const handleLessonClick = (lesson) => {
    if (role === 'teacher' || enrollmentStatus === 'active') {
      setSelectedLesson(lesson);
    }
  };

  const handleBackToLessons = () => {
    setSelectedLesson(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography align="center">جاري التحميل...</Typography>
      </Container>
    );
  }

  if (!course) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography align="center">الدورة غير موجودة</Typography>
      </Container>
    );
  }

  // If viewing a specific lesson
  if (selectedLesson) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button onClick={handleBackToLessons} sx={{ mb: 2 }}>
            ← العودة إلى قائمة الدروس
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            {selectedLesson.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            من دورة: {course.title}
          </Typography>
        </Box>
        
        <DriveVideoPlayer
          driveFileId={selectedLesson.driveFileId}
          studentEmail={user?.email}
          courseId={courseId}
          lessonId={selectedLesson.id}
        />
      </Container>
    );
  }

  // Course overview
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button onClick={() => navigate('/courses')} sx={{ mb: 2 }}>
          ← العودة إلى الدورات
        </Button>
        
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          {course.thumbnailUrl && (
            <Box
              component="img"
              src={course.thumbnailUrl}
              alt={course.title}
              sx={{
                width: 200,
                height: 150,
                objectFit: 'cover',
                borderRadius: 2,
                flexShrink: 0
              }}
            />
          )}
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {course.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {course.description}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={course.category === 'tutoring' ? 'خصوصي' : course.category === 'exam' ? 'امتحان' : 'عام'}
                color="primary"
                size="small"
              />
              <Chip
                label={`${lessons.length} دروس`}
                color="secondary"
                size="small"
              />
              {course.syllabusUrl && (
                <Chip label="منهج متوفر" color="success" size="small" />
              )}
              {!course.isActive && (
                <Chip label="غير مفعّل" color="warning" size="small" />
              )}
            </Stack>
            
          </Box>
        </Box>
      </Box>

      {/* Syllabus Section - Always visible for all users */}
      {course.syllabusUrl && (
        <Card sx={{ mb: 4, bgcolor: 'success.light' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'success.dark' }}>
              📚 المنهج الدراسي متاح للجميع
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'success.dark' }}>
              يمكنك عرض المنهج الدراسي الكامل للدورة حتى لو لم تكن مسجلاً فيها بعد
            </Typography>
            <Button
              variant="contained"
              startIcon={<Description />}
              onClick={() => {
                window.open(course.syllabusUrl, '_blank', 'noopener,noreferrer');
              }}
              sx={{ 
                bgcolor: 'success.main',
                '&:hover': { bgcolor: 'success.dark' }
              }}
            >
              عرض المنهج الدراسي
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Access Control */}
      {role === 'student' && enrollmentStatus !== 'active' && (
        <Card sx={{ mb: 4, bgcolor: 'warning.light' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              هذه الدورة مقفلة
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              تحتاج إلى إذن من المدرّس للوصول إلى محتوى هذه الدورة.
            </Typography>
            <Button
              variant="contained"
              color="success"
              href={`https://wa.me/972548010225?text=${encodeURIComponent(`مرحباً، أود الوصول إلى دورة: ${course.title}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              تواصل عبر واتساب
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lessons List */}
      {(role === 'teacher' || enrollmentStatus === 'active') && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            قائمة الدروس
          </Typography>
          
          {lessons.length > 0 ? (
            <List>
              {lessons.map((lesson, index) => (
                <ListItem key={lesson.id} disablePadding>
                  <ListItemButton
                    onClick={() => handleLessonClick(lesson)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PlayArrow color="primary" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {index + 1}. {lesson.title}
                          </Typography>
                          {lesson.durationMin && (
                            <Chip
                              label={`${lesson.durationMin} دقيقة`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              لا توجد دروس في هذه الدورة حالياً.
            </Typography>
          )}
        </Box>
      )}
    </Container>
  );
}