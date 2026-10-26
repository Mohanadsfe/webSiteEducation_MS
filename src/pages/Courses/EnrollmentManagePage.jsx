import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, Button, Stack, TextField, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, Paper, CircularProgress, Alert, IconButton, Autocomplete, Box
} from '@mui/material';
import { ArrowBack, PersonAdd, ContentCopy, Refresh, Search } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/FirebaseService';
import UsersService from '../../services/UsersService';
import CoursesService from '../../services/CoursesService';
import EnrollmentsService from '../../services/EnrollmentsService';
import { isOwnerAdminEmail } from '../../constants/admin';

/** Only platform owners may grant codes / update course access */
function canManage(user, profile) {
  return isOwnerAdminEmail(user?.email || profile?.email);
}

function studentLabel(s) {
  if (!s) return '';
  const name = `${s.firstName || ''} ${s.lastName || ''}`.trim()
    || s.displayName
    || s.fullName
    || '';
  const email = s.email || '';
  if (name && email) return `${name} — ${email}`;
  return name || email || s.id;
}

function studentSearchText(s) {
  return [
    s.firstName,
    s.lastName,
    s.displayName,
    s.fullName,
    s.email,
    s.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function EnrollmentManagePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');
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
      if (!canManage(user, u)) {
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

  const filteredEnrollments = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter((e) => {
      const student = students.find((s) => s.id === e.studentId);
      const hay = [
        e.studentEmail,
        e.accessCode,
        e.studentId,
        student && studentSearchText(student),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [enrollments, students, tableFilter]);

  const grant = async () => {
    if (!selectedStudent?.id) {
      setError('ابحث واختر طالباً بالبريد أو الاسم');
      return;
    }
    setGranting(true);
    setError('');
    try {
      const code = await EnrollmentsService.grantEnrollment(
        selectedStudent.id,
        selectedStudent.email || '',
        courseId,
        actorUid
      );
      setLastCode(code);
      setSelectedStudent(null);
      setInputValue('');
      await reload();
      alert(`تم منح الوصول.\nكود الطالب الشخصي: ${code}\nأرسله للطالب عبر واتساب.`);
    } catch (e) {
      setError(e.message || 'فشل منح الوصول');
    } finally {
      setGranting(false);
    }
  };

  const revoke = async (enrollmentId) => {
    if (
      !window.confirm(
        'إلغاء وصول هذا الطالب؟\nسيتم إبطال الكود فوراً ولن يستطيع فتح باقي فيديوهات هذه الدورة حتى لو احتفظ بالكود القديم.'
      )
    ) {
      return;
    }
    try {
      await EnrollmentsService.revokeEnrollment(enrollmentId);
      setLastCode('');
      await reload();
      alert('تم إلغاء الوصول وإبطال الكود.');
    } catch (e) {
      setError(e.message || 'فشل الإلغاء');
    }
  };

  const reGrant = async (enrollment) => {
    const studentId = enrollment.studentId;
    const email = enrollment.studentEmail || students.find((s) => s.id === studentId)?.email || '';
    if (!studentId) return;
    setGranting(true);
    setError('');
    try {
      const code = await EnrollmentsService.grantEnrollment(studentId, email, courseId, actorUid);
      setLastCode(code);
      await reload();
      alert(`تمت إعادة التفعيل.\nكود جديد: ${code}`);
    } catch (e) {
      setError(e.message || 'فشل إعادة التفعيل');
    } finally {
      setGranting(false);
    }
  };

  const regen = async (enrollmentId) => {
    try {
      const code = await EnrollmentsService.regenerateAccessCode(enrollmentId);
      setLastCode(code);
      await reload();
      alert(`كود جديد: ${code}`);
    } catch (e) {
      setError(e.message || 'فشل إنشاء كود جديد');
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      alert('تم نسخ الكود');
    } catch {
      /* ignore */
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
        موافقة الوصول + أكواد الطلاب
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {course?.title || courseId}
      </Typography>
      <Alert severity="warning" sx={{ mb: 2, textAlign: 'right' }}>
        الفيديو الأول مجاني للجميع. من الثاني يحتاج الطالب <strong>كوداً شخصياً فريداً</strong> لهذه الدورة فقط
        (لا يفتح دورات أخرى). يمكنك <strong>إلغاء الوصول في أي وقت</strong> حتى بعد إعطاء الكود — يُبطَل فوراً.
        {course?.courseGateCode
          ? ` · كود الدورة السحابي (مشترك): ${course.courseGateCode}`
          : ''}
      </Alert>

      {lastCode && (
        <Alert severity="success" sx={{ mb: 2, textAlign: 'right' }}>
          آخر كود: <strong>{lastCode}</strong>
          <Button size="small" onClick={() => copyCode(lastCode)} sx={{ mr: 1 }}>نسخ</Button>
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2.5, mb: 3, border: '1px solid rgba(26,107,181,0.15)' }}>
        <Typography fontWeight={800} sx={{ mb: 0.5 }}>
          منح وصول لطالب (بعد الدفع / الاتفاق)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ابحث بالبريد (Gmail) أو بالاسم ثم اختر من النتائج
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
          <Autocomplete
            sx={{ flex: 1, minWidth: 0 }}
            options={students}
            value={selectedStudent}
            onChange={(_, value) => setSelectedStudent(value)}
            inputValue={inputValue}
            onInputChange={(_, value) => setInputValue(value)}
            getOptionLabel={(s) => studentLabel(s)}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
            filterOptions={(options, state) => {
              const q = (state.inputValue || '').trim().toLowerCase();
              if (!q) return options.slice(0, 40);
              return options
                .filter((s) => studentSearchText(s).includes(q))
                .slice(0, 40);
            }}
            noOptionsText={
              inputValue.trim()
                ? 'لا يوجد طالب بهذا الاسم أو البريد'
                : 'اكتب للبحث…'
            }
            renderOption={(props, s) => {
              const { key, ...rest } = props;
              const name = `${s.firstName || ''} ${s.lastName || ''}`.trim()
                || s.displayName
                || 'بدون اسم';
              return (
                <Box component="li" key={key || s.id} {...rest} sx={{ display: 'block !important' }}>
                  <Typography fontWeight={800}>{name}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.email || '—'}</Typography>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="بحث بالطالب"
                placeholder="مثال: name@gmail.com أو أحمد"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <Search sx={{ ml: 1, color: 'text.secondary' }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <Button
            variant="contained"
            startIcon={granting ? <CircularProgress size={18} color="inherit" /> : <PersonAdd />}
            onClick={grant}
            disabled={granting || !selectedStudent}
            sx={{ minWidth: 200, fontWeight: 800, height: 56 }}
          >
            موافقة + إنشاء كود
          </Button>
        </Stack>
        {selectedStudent && (
          <Alert severity="info" sx={{ mt: 2, textAlign: 'right' }}>
            المحدد: <strong>{studentLabel(selectedStudent)}</strong>
          </Alert>
        )}
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <Typography fontWeight={800} sx={{ flex: 1 }}>
          الطلاب الموافق عليهم ({filteredEnrollments.length})
        </Typography>
        <TextField
          size="small"
          placeholder="تصفية الجدول بالاسم أو Gmail…"
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          sx={{ minWidth: { sm: 280 } }}
          InputProps={{
            startAdornment: <Search sx={{ ml: 1, color: 'text.secondary', fontSize: 20 }} />,
          }}
        />
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="right">الطالب</TableCell>
            <TableCell align="right">البريد</TableCell>
            <TableCell align="center">الحالة</TableCell>
            <TableCell align="center">كود الوصول الشخصي</TableCell>
            <TableCell align="center">إجراء</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredEnrollments.map((e) => {
            const student = students.find((s) => s.id === e.studentId);
            const name = student
              ? (`${student.firstName || ''} ${student.lastName || ''}`.trim()
                || student.displayName
                || '—')
              : e.studentId;
            return (
              <TableRow key={e.id} hover>
                <TableCell align="right">{name}</TableCell>
                <TableCell align="right">{e.studentEmail || student?.email || '—'}</TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={
                      e.status === 'active'
                        ? 'مفعّل'
                        : e.status === 'revoked'
                          ? 'ملغى'
                          : (e.status || '—')
                    }
                    color={e.status === 'active' ? 'success' : e.status === 'revoked' ? 'error' : 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  {e.status === 'active' && e.accessCode ? (
                    <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                      <Typography fontWeight={900} sx={{ letterSpacing: 1 }}>{e.accessCode}</Typography>
                      <IconButton size="small" onClick={() => copyCode(e.accessCode)}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="كود جديد" onClick={() => regen(e.id)}>
                        <Refresh fontSize="small" />
                      </IconButton>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">مُبطَل</Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                    {e.status === 'active' && (
                      <Button size="small" color="error" variant="contained" onClick={() => revoke(e.id)}>
                        إلغاء الوصول
                      </Button>
                    )}
                    {e.status === 'revoked' && (
                      <Button size="small" variant="outlined" onClick={() => reGrant(e)} disabled={granting}>
                        إعادة تفعيل + كود جديد
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
          {filteredEnrollments.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                {tableFilter.trim() ? 'لا نتائج لهذا البحث' : 'لا يوجد طلاب مسجّلون بعد'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Container>
  );
}
