import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Button, Stack, TextField, Table, TableHead,
  TableRow, TableCell, TableBody, IconButton, Paper, CircularProgress, Alert
} from '@mui/material';
import { Delete, ArrowBack, Save } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/FirebaseService';
import UsersService from '../../services/UsersService';
import CoursesService from '../../services/CoursesService';

export default function LessonManagePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    driveFileId: '',
    order: 1,
    durationMin: 60,
  });

  const reload = async () => {
    const c = await CoursesService.getCourse(courseId);
    setCourse(c);
    const list = await CoursesService.listLessons(courseId);
    setLessons(list);
    setForm((f) => ({ ...f, order: (list.length || 0) + 1 }));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      const u = await UsersService.getUser(user.uid);
      if (u?.role !== 'teacher') {
        setRole(u?.role || '');
        setLoading(false);
        return;
      }
      setRole('teacher');
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

  const addLesson = async () => {
    if (!form.title.trim()) return alert('أدخل عنوان الدرس');
    setSaving(true);
    setError('');
    try {
      await CoursesService.addLesson(courseId, {
        title: form.title.trim(),
        driveFileId: form.driveFileId.trim(),
        order: Number(form.order) || lessons.length + 1,
        durationMin: Number(form.durationMin) || 60,
        createdAt: new Date(),
      });
      setForm({ title: '', driveFileId: '', order: lessons.length + 2, durationMin: 60 });
      await reload();
    } catch (e) {
      setError(e.message || 'فشل إضافة الدرس');
    } finally {
      setSaving(false);
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

  if (role !== 'teacher') {
    return (
      <Container sx={{ py: 6 }}>
        <Typography align="center">غير مخوّل — للمدرّس فقط</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4, direction: 'rtl' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/courses')} sx={{ mb: 2 }}>
        رجوع للدورات
      </Button>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        إدارة الدروس
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {course?.title || courseId}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography fontWeight={800} sx={{ mb: 2 }}>إضافة درس</Typography>
        <Stack spacing={2}>
          <TextField
            label="عنوان الدرس"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Google Drive File ID"
            value={form.driveFileId}
            onChange={(e) => setForm((f) => ({ ...f, driveFileId: e.target.value }))}
            fullWidth
            helperText="معرّف ملف الفيديو من Google Drive"
          />
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
              إضافة
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="right">#</TableCell>
            <TableCell align="right">العنوان</TableCell>
            <TableCell align="right">Drive ID</TableCell>
            <TableCell align="center">المدة</TableCell>
            <TableCell align="center">حذف</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lessons.map((l) => (
            <TableRow key={l.id} hover>
              <TableCell align="right">{l.order}</TableCell>
              <TableCell align="right">{l.title}</TableCell>
              <TableCell align="right" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {l.driveFileId || '—'}
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
              <TableCell colSpan={5} align="center">لا توجد دروس بعد</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Container>
  );
}
