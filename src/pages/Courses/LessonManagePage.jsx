import React, { useEffect, useRef, useState } from 'react';
import {
  Container, Typography, Box, Button, Stack, TextField, Table, TableHead,
  TableRow, TableCell, TableBody, IconButton, Paper, CircularProgress, Alert
} from '@mui/material';
import { Delete, ArrowBack, Save, CloudUpload, PhotoCamera, DeleteOutline } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/FirebaseService';
import UsersService from '../../services/UsersService';
import CoursesService from '../../services/CoursesService';
import { isOwnerAdminEmail } from '../../constants/admin';
import { normalizeCloudVideoInput } from '../../utils/cloudVideoLink';
import { compressImageFile } from '../../utils/compressImage';

/** Only platform owners may add/edit course videos */
function canManageCourses(user, profile) {
  return isOwnerAdminEmail(user?.email || profile?.email);
}

export default function LessonManagePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [allowed, setAllowed] = useState(false);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [error, setError] = useState('');
  const [linkHint, setLinkHint] = useState('');
  const [form, setForm] = useState({
    title: '',
    cloudLink: '',
    order: 1,
    durationMin: 60,
    thumbnailUrl: '',
    learnHint: '',
  });

  const reload = async () => {
    const c = await CoursesService.getCourse(courseId);
    setCourse(c);
    const list = await CoursesService.listLessons(courseId);
    setLessons(list);
    try {
      await CoursesService.publishLessonCatalog(courseId);
    } catch {
      /* ignore */
    }
    setForm((f) => ({ ...f, order: (list.length || 0) + 1 }));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      const u = await UsersService.getUser(user.uid);
      if (!canManageCourses(user, u)) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      try {
        await reload();
      } catch (e) {
        setError(e.message || 'فشل التحميل');
      } finally {
        setLoading(false);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, navigate]);

  const onLinkChange = (value) => {
    setForm((f) => ({ ...f, cloudLink: value }));
    const n = normalizeCloudVideoInput(value);
    setLinkHint(n.note || (n.provider === 'google_drive' ? `Drive ID: ${n.driveFileId}` : n.provider || ''));
  };

  const onPickThumb = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingThumb(true);
    setError('');
    try {
      const dataUrl = await compressImageFile(file, { maxWidth: 640, quality: 0.72 });
      setForm((f) => ({ ...f, thumbnailUrl: dataUrl }));
    } catch (err) {
      setError(err?.message || 'فشل رفع صورة المقطع');
    } finally {
      setUploadingThumb(false);
    }
  };

  const addLesson = async () => {
    if (!form.title.trim()) return alert('أدخل عنوان الدرس');
    if (!form.cloudLink.trim()) return alert('الصق رابط الفيديو من السحابة (Drive / iCloud / رابط)');

    const normalized = normalizeCloudVideoInput(form.cloudLink);
    if (!normalized.driveFileId && !normalized.videoUrl) {
      return alert('رابط غير صالح');
    }

    setSaving(true);
    setError('');
    try {
      await CoursesService.addLesson(courseId, {
        title: form.title.trim(),
        driveFileId: normalized.driveFileId,
        videoUrl: normalized.videoUrl,
        provider: normalized.provider,
        order: Number(form.order) || lessons.length + 1,
        durationMin: Number(form.durationMin) || 60,
        thumbnailUrl: form.thumbnailUrl || '',
        learnHint: form.learnHint.trim(),
        createdAt: new Date(),
      });
      setForm({
        title: '',
        cloudLink: '',
        order: lessons.length + 2,
        durationMin: 60,
        thumbnailUrl: '',
        learnHint: '',
      });
      setLinkHint('');
      await reload();
    } catch (e) {
      setError(e.message || 'فشل إضافة الدرس');
    } finally {
      setSaving(false);
    }
  };

  const updateLessonThumb = async (lessonId, file) => {
    if (!file) return;
    setUploadingThumb(true);
    setError('');
    try {
      const dataUrl = await compressImageFile(file, { maxWidth: 640, quality: 0.72 });
      await CoursesService.updateLesson(courseId, lessonId, { thumbnailUrl: dataUrl });
      await reload();
    } catch (e) {
      setError(e.message || 'فشل تحديث الصورة');
    } finally {
      setUploadingThumb(false);
    }
  };

  const removeLesson = async (lessonId) => {
    if (!window.confirm('حذف هذا الدرس؟')) return;
    try {
      await CoursesService.deleteLesson(courseId, lessonId);
      await reload();
    } catch (e) {
      setError(e.message || 'فشل الحذف');
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container sx={{ py: 6 }}>
        <Typography align="center">غير مخوّل — لصاحب المنصة فقط</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4, direction: 'rtl' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/courses')} sx={{ mb: 2 }}>
        رجوع للدورات
      </Button>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        رفع / ربط فيديوهات الدورة
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        {course?.title || courseId}
      </Typography>
      <Alert severity="info" sx={{ mb: 3, textAlign: 'right' }}>
        أضف صورة من مقطع الفيديو + جملة قصيرة عما سيتعلمه الطالب في هذا القسم — تظهر في قائمة الفيديوهات.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CloudUpload color="primary" />
          <Typography fontWeight={800}>إضافة درس من السحابة</Typography>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label="عنوان الدرس"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            fullWidth
          />
          <TextField
            label="رابط الفيديو (Drive / iCloud / رابط)"
            value={form.cloudLink}
            onChange={(e) => onLinkChange(e.target.value)}
            fullWidth
            placeholder="https://drive.google.com/file/d/...."
            helperText={linkHint || 'مثال Drive: انسخ رابط المشاركة ← يُستخرج المعرّف تلقائياً'}
          />
          <TextField
            label="ماذا سيتعلم الطالب في هذا القسم؟ (اختياري)"
            value={form.learnHint}
            onChange={(e) => setForm((f) => ({ ...f, learnHint: e.target.value }))}
            fullWidth
            multiline
            rows={2}
            placeholder="مثال: حل معادلات الدرجة الثانية خطوة بخطوة"
          />

          <Box>
            <Typography fontWeight={800} sx={{ mb: 1 }}>صورة من الفيديو (معاينة القسم)</Typography>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onPickThumb}
            />
            {form.thumbnailUrl ? (
              <Box
                component="img"
                src={form.thumbnailUrl}
                alt="معاينة القسم"
                sx={{
                  width: '100%',
                  maxWidth: 360,
                  maxHeight: 160,
                  objectFit: 'cover',
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(0,0,0,0.08)',
                  display: 'block',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 360,
                  height: 100,
                  borderRadius: 2,
                  mb: 1,
                  bgcolor: 'rgba(26,107,181,0.06)',
                  border: '1px dashed rgba(26,107,181,0.35)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'text.secondary',
                  fontWeight: 700,
                }}
              >
                لقطة من الفيديو تظهر للطالب في القائمة
              </Box>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={uploadingThumb ? <CircularProgress size={16} /> : <PhotoCamera />}
                onClick={() => fileRef.current?.click()}
                disabled={uploadingThumb}
              >
                رفع صورة
              </Button>
              {form.thumbnailUrl && (
                <Button
                  color="inherit"
                  startIcon={<DeleteOutline />}
                  onClick={() => setForm((f) => ({ ...f, thumbnailUrl: '' }))}
                >
                  إزالة الصورة
                </Button>
              )}
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="الترتيب"
              type="number"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
              sx={{ width: 140 }}
            />
            <TextField
              label="المدة (دقيقة)"
              type="number"
              value={form.durationMin}
              onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
              sx={{ width: 160 }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={addLesson}
              disabled={saving}
            >
              حفظ الدرس
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="right">#</TableCell>
            <TableCell align="right">صورة</TableCell>
            <TableCell align="right">العنوان / المحتوى</TableCell>
            <TableCell align="right">المصدر</TableCell>
            <TableCell align="center">المدة</TableCell>
            <TableCell align="center">إجراء</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lessons.map((l) => (
            <TableRow key={l.id} hover>
              <TableCell align="right">{l.order}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} alignItems="center">
                  {l.thumbnailUrl ? (
                    <Box
                      component="img"
                      src={l.thumbnailUrl}
                      alt=""
                      sx={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 1 }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 64,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: 'rgba(0,0,0,0.06)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11,
                        color: 'text.secondary',
                      }}
                    >
                      —
                    </Box>
                  )}
                  <Button
                    size="small"
                    component="label"
                    disabled={uploadingThumb}
                  >
                    تغيير
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        updateLessonThumb(l.id, file);
                      }}
                    />
                  </Button>
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{l.title}</Typography>
                {l.learnHint ? (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {l.learnHint}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell align="right" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {l.provider || (l.driveFileId ? 'drive' : '—')}
              </TableCell>
              <TableCell align="center">{l.durationMin || '—'}</TableCell>
              <TableCell align="center">
                <IconButton color="error" onClick={() => removeLesson(l.id)}>
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {lessons.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">لا توجد دروس بعد</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Container>
  );
}
