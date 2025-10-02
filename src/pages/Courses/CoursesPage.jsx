import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stack, Snackbar, Alert } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import CourseCard from '../../components/courses/CourseCard';
import CoursesService from '../../services/CoursesService';
import EnrollmentsService from '../../services/EnrollmentsService';
import UsersService from '../../services/UsersService';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    category: 'general',
    isActive: true,
    syllabusUrl: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userData = await UsersService.getUser(user.uid);
        setRole(userData?.role || '');
        
        if (userData?.role === 'student') {
          // Load enrolled courses for students
          const enrollments = await EnrollmentsService.getActiveEnrollmentsForStudent(user.uid);
          const enrolledCourseIds = enrollments.map(e => e.courseId);
          const allCourses = await CoursesService.listCourses();
          const enrolledCoursesData = allCourses.filter(c => enrolledCourseIds.includes(c.id));
          setEnrolledCourses(enrolledCoursesData);
          setCourses(allCourses.filter(c => !enrolledCourseIds.includes(c.id))); // Locked courses
        } else {
          // Load all courses for teachers
          const allCourses = await CoursesService.listCourses();
          setCourses(allCourses);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [navigate]);

  const handleAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      title: '',
      description: '',
      thumbnailUrl: '',
      category: 'general',
      isActive: true,
      syllabusUrl: ''
    });
    setOpenDialog(true);
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      category: course.category,
      isActive: course.isActive,
      syllabusUrl: course.syllabusUrl || ''
    });
    setOpenDialog(true);
  };

  const handleSaveCourse = async () => {
    try {
      if (editingCourse) {
        await CoursesService.updateCourse(editingCourse.id, courseForm);
        setSnackbar({ open: true, message: 'تم تحديث الدورة بنجاح', severity: 'success' });
      } else {
        await CoursesService.addCourse({
          ...courseForm,
          createdBy: user.uid,
          createdAt: new Date()
        });
        setSnackbar({ open: true, message: 'تم إضافة الدورة بنجاح', severity: 'success' });
      }
      
      // Refresh courses
      const allCourses = await CoursesService.listCourses();
      if (role === 'student') {
        const enrollments = await EnrollmentsService.getActiveEnrollmentsForStudent(user.uid);
        const enrolledCourseIds = enrollments.map(e => e.courseId);
        const enrolledCoursesData = allCourses.filter(c => enrolledCourseIds.includes(c.id));
        setEnrolledCourses(enrolledCoursesData);
        setCourses(allCourses.filter(c => !enrolledCourseIds.includes(c.id)));
      } else {
        setCourses(allCourses);
      }
      
      setOpenDialog(false);
    } catch (error) {
      setSnackbar({ open: true, message: 'حدث خطأ: ' + error.message, severity: 'error' });
    }
  };

  const handleDeleteCourse = async (course) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الدورة؟')) {
      try {
        await CoursesService.deleteCourse(course.id);
        setSnackbar({ open: true, message: 'تم حذف الدورة بنجاح', severity: 'success' });
        
        // Refresh courses
        const allCourses = await CoursesService.listCourses();
        if (role === 'student') {
          const enrollments = await EnrollmentsService.getActiveEnrollmentsForStudent(user.uid);
          const enrolledCourseIds = enrollments.map(e => e.courseId);
          const enrolledCoursesData = allCourses.filter(c => enrolledCourseIds.includes(c.id));
          setEnrolledCourses(enrolledCoursesData);
          setCourses(allCourses.filter(c => !enrolledCourseIds.includes(c.id)));
        } else {
          setCourses(allCourses);
        }
      } catch (error) {
        setSnackbar({ open: true, message: 'حدث خطأ: ' + error.message, severity: 'error' });
      }
    }
  };

  const handleManageLessons = (course) => {
    navigate(`/courses/${course.id}/lessons`);
  };

  const handleManageEnrollments = (course) => {
    navigate(`/courses/${course.id}/enrollments`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography align="center">جاري التحميل...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          الدورات التعليمية
        </Typography>
        {role === 'teacher' && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddCourse}
            sx={{ borderRadius: 2 }}
          >
            إضافة دورة جديدة
          </Button>
        )}
      </Box>

      {/* Enrolled Courses for Students */}
      {role === 'student' && enrolledCourses.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            دوراتي المسجلة
          </Typography>
          <Grid container spacing={3}>
            {enrolledCourses.map(course => (
              <Grid item xs={12} sm={6} md={4} key={course.id}>
                <CourseCard
                  course={course}
                  locked={false}
                  isTeacher={false}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* All Courses / Locked Courses */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          {role === 'student' ? 'دورات أخرى' : 'جميع الدورات'}
        </Typography>
        <Grid container spacing={3}>
          {courses.map(course => (
            <Grid item xs={12} sm={6} md={4} key={course.id}>
              <CourseCard
                course={course}
                locked={role === 'student'}
                isTeacher={role === 'teacher'}
                onEdit={handleEditCourse}
                onDelete={handleDeleteCourse}
                onManageLessons={handleManageLessons}
                onManageEnrollments={handleManageEnrollments}
              />
            </Grid>
          ))}
        </Grid>

        {courses.length === 0 && (
          <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
            لا توجد دورات حالياً.
          </Typography>
        )}
      </Box>

      {/* Add/Edit Course Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCourse ? 'تعديل الدورة' : 'إضافة دورة جديدة'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="عنوان الدورة"
              fullWidth
              value={courseForm.title}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
            />
            <TextField
              label="وصف الدورة"
              fullWidth
              multiline
              rows={3}
              value={courseForm.description}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
            />
            <TextField
              label="رابط الصورة"
              fullWidth
              value={courseForm.thumbnailUrl}
              onChange={(e) => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })}
            />
            <TextField
              select
              label="الفئة"
              fullWidth
              value={courseForm.category}
              onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
            >
              <MenuItem value="general">عام</MenuItem>
              <MenuItem value="tutoring">خصوصي</MenuItem>
              <MenuItem value="exam">امتحان</MenuItem>
            </TextField>
            <TextField
              label="رابط المنهج الدراسي (Google Drive)"
              fullWidth
              value={courseForm.syllabusUrl}
              onChange={(e) => setCourseForm({ ...courseForm, syllabusUrl: e.target.value })}
              placeholder="https://drive.google.com/file/d/..."
              helperText="انسخ رابط المشاركة من Google Drive للمنهج الدراسي"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveCourse} variant="contained">
            {editingCourse ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}