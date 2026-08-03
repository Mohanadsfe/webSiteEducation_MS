import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Button, Stack, TextField, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, Paper, CircularProgress, Alert, MenuItem
} from '@mui/material';
import { ArrowBack, PersonAdd } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/FirebaseService';
import UsersService from '../../services/UsersService';
import CoursesService from '../../services/CoursesService';
import EnrollmentsService from '../../services/EnrollmentsService';

export default function EnrollmentManagePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actorUid, setActorUid] = useState('');

  const reload = async () => {
    const c = await CoursesService.getCourse(courseId);
    setCourse(c);
    const list = await EnrollmentsService.getEnrollmentsForCourse(courseId);
    setEnrollments(list);
    const allStudents = await UsersService.getAllStudents();
    setStudents(allStudents);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setActorUid(user.uid);
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

  const grant = async () => {
    if (!selectedStudentId) return alert('اختر طالباً');
    const student = students.find((s) => s.id === selectedStudentId);
    try {
      await EnrollmentsService.grantEnrollment(
        selectedStudentId,
        student?.email || '',
        courseId,
        actorUid
      );
      setSelectedStudentId('');
      await reload();
    } catch (e) {
      setError(e.message || 'فشل منح الوصول');
    }
  };

  const revoke = async (enrollmentId) => {
    if (!window.confirm('إلغاء وصول هذا الطالب؟')) return;
    try {
      await EnrollmentsService.revokeEnrollment(enrollmentId);
      await reload();
    } catch (e) {
      setError(e.message || 'فشل الإلغاء');
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
        إدارة الوصول للدورة
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {course?.title || courseId}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography fontWeight={800} sx={{ mb: 2 }}>منح وصول لطالب</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="الطالب"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            fullWidth
          >
            {students.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email} — {s.email}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={grant}
            sx={{ minWidth: 160 }}
          >
            منح الوصول
          </Button>
        </Stack>
      </Paper>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="right">الطالب</TableCell>
            <TableCell align="right">البريد</TableCell>
            <TableCell align="center">الحالة</TableCell>
            <TableCell align="center">إجراء</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {enrollments.map((e) => {
            const student = students.find((s) => s.id === e.studentId);
            const name = student
              ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
              : e.studentId;
            return (
              <TableRow key={e.id} hover>
                <TableCell align="right">{name || '—'}</TableCell>
                <TableCell align="right">{e.studentEmail || student?.email || '—'}</TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={e.status || '—'}
                    color={e.status === 'active' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  {e.status === 'active' && (
                    <Button size="small" color="error" onClick={() => revoke(e.id)}>
                      إلغاء
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {enrollments.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">لا يوجد طلاب مسجّلون بعد</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Container>
  );
}
