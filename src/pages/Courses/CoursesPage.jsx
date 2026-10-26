import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Container, Typography, Grid, Box, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Stack, Snackbar, Alert, CircularProgress, Chip, Paper
} from '@mui/material';
import { Add, PhotoCamera, Link as LinkIcon, DeleteOutline, NewReleases, AutoAwesome } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { auth } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import CourseCard from '../../components/courses/CourseCard';
import CoursesService from '../../services/CoursesService';
import EnrollmentsService from '../../services/EnrollmentsService';
import UsersService from '../../services/UsersService';
import WhatsNewService, { markUpdatesSeen } from '../../services/WhatsNewService';
import ContentTrackField from '../../components/common/ContentTrackField';
import useStudyTrack from '../../hooks/useStudyTrack';
import { matchesTrackCategory, normalizeContentTrack } from '../../constants/tracks';
import { compressImageFile } from '../../utils/compressImage';
import { isOwnerAdminEmail } from '../../constants/admin';
import CourseContentLicense from '../../components/courses/CourseContentLicense';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  /** Only platform owners can add / edit courses, videos, access codes */
  const canManageCourses = isOwnerAdminEmail(user?.email);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    category: 'academic',
    isActive: true,
    syllabusUrl: '',
    courseGateCode: '',
  });
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [whatsNew, setWhatsNew] = useState({ items: [], latestAt: 0 });
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const { track } = useStudyTrack();

  const onPickThumbnail = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingThumb(true);
    try {
      const dataUrl = await compressImageFile(file, { maxWidth: 900, quality: 0.75 });
      setCourseForm((f) => ({ ...f, thumbnailUrl: dataUrl }));
      setSnackbar({ open: true, message: 'تم رفع صورة الدورة', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.message || 'فشل رفع الصورة',
        severity: 'error',
      });
    } finally {
      setUploadingThumb(false);
    }
  };

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

        // What's new feed — show updates, then mark as seen for navbar badge
        try {
          const feed = await WhatsNewService.getFeed();
          setWhatsNew(feed);
          markUpdatesSeen(Math.max(Date.now(), feed.latestAt || 0));
        } catch (e) {
          console.warn('whats new feed', e);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [navigate]);

  const unseenUpdates = useMemo(() => {
    // Items newer than previous visit (before we marked seen this session)
    // Use a snapshot: items from last 14 days for the board
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return (whatsNew.items || []).filter((it) => {
      const ms = typeof it.at?.toMillis === 'function'
        ? it.at.toMillis()
        : (it.at instanceof Date ? it.at.getTime() : Number(new Date(it.at)) || 0);
      return ms >= cutoff;
    }).slice(0, 8);
  }, [whatsNew]);

  const handleAddCourse = () => {
    if (!canManageCourses) return;
    setEditingCourse(null);
    setCourseForm({
      title: '',
      description: '',
      thumbnailUrl: '',
      category: 'academic',
      isActive: true,
      syllabusUrl: '',
      courseGateCode: '',
    });
    setOpenDialog(true);
  };

  const handleEditCourse = (course) => {
    if (!canManageCourses) return;
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      category: normalizeContentTrack(course.category),
      isActive: course.isActive,
      syllabusUrl: course.syllabusUrl || '',
      courseGateCode: course.courseGateCode || '',
    });
    setOpenDialog(true);
  };

  const visibleEnrolled = useMemo(
    () => (role === 'student' && track
      ? enrolledCourses.filter((c) => matchesTrackCategory(c.category, track))
      : enrolledCourses),
    [enrolledCourses, role, track]
  );

  const visibleCourses = useMemo(
    () => (role === 'student' && track
      ? courses.filter((c) => matchesTrackCategory(c.category, track))
      : courses),
    [courses, role, track]
  );

  const handleSaveCourse = async () => {
    if (!canManageCourses) return;
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
    if (!canManageCourses) return;
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
    if (!canManageCourses) return;
    navigate(`/courses/${course.id}/lessons`);
  };

  const handleManageEnrollments = (course) => {
    if (!canManageCourses) return;
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          الدورات التعليمية
        </Typography>
        {canManageCourses && (
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

      {unseenUpdates.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 3,
            direction: 'rtl',
            border: '1px solid rgba(198,40,40,0.22)',
            background:
              'radial-gradient(600px 180px at 100% 0%, rgba(198,40,40,0.1), transparent 55%), #fff8f8',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <NewReleases color="error" />
            <Typography fontWeight={900} sx={{ fontSize: '1.1rem' }}>
              ما الجديد في الدورات
            </Typography>
            <Chip
              size="small"
              color="error"
              icon={<AutoAwesome sx={{ fontSize: 14 }} />}
              label={`${unseenUpdates.length} تحديث`}
              sx={{ fontWeight: 800 }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 1.25 }}>
            دورات ودروس أُضيفت مؤخراً — اضغط للانتقال مباشرة.
          </Typography>
          <Stack spacing={0.75}>
            {unseenUpdates.map((it) => {
              const when = dayjs(
                typeof it.at?.toDate === 'function' ? it.at.toDate() : it.at
              );
              return (
                <Box
                  key={it.id}
                  component={it.courseId ? Link : 'div'}
                  to={it.courseId ? `/courses/${it.courseId}` : undefined}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    p: 1.1,
                    borderRadius: 2,
                    textDecoration: 'none',
                    color: 'inherit',
                    bgcolor: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(26,107,181,0.1)',
                    '&:hover': it.courseId ? { bgcolor: 'rgba(26,107,181,0.06)' } : undefined,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={800} noWrap>
                      {it.type === 'lesson' ? 'درس جديد: ' : 'دورة جديدة: '}
                      {it.title}
                    </Typography>
                    {it.courseTitle && it.type === 'lesson' && (
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        في دورة {it.courseTitle}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ flexShrink: 0 }}>
                    {when.isValid() ? when.format('D/M') : ''}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {canManageCourses && (
        <Alert severity="info" sx={{ mb: 3, textAlign: 'right', direction: 'rtl' }}>
          عند إضافة/تعديل دورة: اختر المسار <strong>أكاديمي</strong> أو <strong>בגרות</strong> حتى تظهر فقط للطلاب في ذلك المسار.
          إضافة دورة أو درس يظهر تلقائياً كـ «جديد» للطلاب.
        </Alert>
      )}
      {role === 'student' && track && (
        <Alert severity="success" sx={{ mb: 3, textAlign: 'right', direction: 'rtl' }}>
          تعرض فقط دورات مسار{track === 'bagrut' ? ' البجروت / المدرسة' : ' الأكاديمي'}.
        </Alert>
      )}

      {/* Enrolled Courses for Students */}
      {role === 'student' && visibleEnrolled.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            دوراتي المسجلة
          </Typography>
          <Grid container spacing={3}>
            {visibleEnrolled.map(course => (
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
          {visibleCourses.map(course => (
            <Grid item xs={12} sm={6} md={4} key={course.id}>
              <CourseCard
                course={course}
                locked={role === 'student' && !canManageCourses}
                isTeacher={canManageCourses}
                onEdit={handleEditCourse}
                onDelete={handleDeleteCourse}
                onManageLessons={handleManageLessons}
                onManageEnrollments={handleManageEnrollments}
              />
            </Grid>
          ))}
        </Grid>

        {visibleCourses.length === 0 && (
          <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
            لا توجد دورات حالياً.
          </Typography>
        )}

        <CourseContentLicense />
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
            <Box>
              <Typography fontWeight={800} sx={{ mb: 1, textAlign: 'right' }}>
                صورة الدورة
              </Typography>
              {courseForm.thumbnailUrl ? (
                <Box
                  component="img"
                  src={courseForm.thumbnailUrl}
                  alt="معاينة"
                  sx={{
                    width: '100%',
                    maxHeight: 180,
                    objectFit: 'cover',
                    borderRadius: 2,
                    mb: 1.5,
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: 120,
                    borderRadius: 2,
                    mb: 1.5,
                    bgcolor: 'rgba(26,107,181,0.06)',
                    border: '1px dashed rgba(26,107,181,0.35)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'text.secondary',
                    fontWeight: 700,
                  }}
                >
                  لا توجد صورة بعد
                </Box>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickThumbnail}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5 }}>
                <Button
                  variant="contained"
                  startIcon={uploadingThumb ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera />}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingThumb}
                  sx={{ fontWeight: 800 }}
                >
                  رفع صورة من الجهاز
                </Button>
                {courseForm.thumbnailUrl && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<DeleteOutline />}
                    onClick={() => setCourseForm((f) => ({ ...f, thumbnailUrl: '' }))}
                  >
                    إزالة الصورة
                  </Button>
                )}
              </Stack>
              <TextField
                label="أو رابط الصورة (اختياري)"
                fullWidth
                value={
                  courseForm.thumbnailUrl?.startsWith('data:')
                    ? ''
                    : courseForm.thumbnailUrl
                }
                onChange={(e) => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })}
                placeholder="https://..."
                InputProps={{
                  startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                helperText="يمكنك رفع صورة أو لصق رابط — الرفع من الجهاز أوضح"
              />
            </Box>
            <ContentTrackField
              value={normalizeContentTrack(courseForm.category)}
              onChange={(category) => setCourseForm({ ...courseForm, category })}
            />
            <TextField
              label="رابط المنهج الدراسي (Google Drive)"
              fullWidth
              value={courseForm.syllabusUrl}
              onChange={(e) => setCourseForm({ ...courseForm, syllabusUrl: e.target.value })}
              placeholder="https://drive.google.com/file/d/..."
              helperText="انسخ رابط المشاركة من Google Drive للمنهج الدراسي"
            />
            <TextField
              label="كود الدورة السحابي (اختياري)"
              fullWidth
              value={courseForm.courseGateCode}
              onChange={(e) => setCourseForm({ ...courseForm, courseGateCode: e.target.value })}
              helperText="إن وُجد: كل طالب موافق عليه يُدخله مع كوده الشخصي لفتح الدروس (مثلاً كلمة مرور مشاركة السحابة)"
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