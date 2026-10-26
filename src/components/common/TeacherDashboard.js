import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Box, Typography, Paper, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Stack, MenuItem, Divider, CircularProgress, Alert
} from '@mui/material';
import { Edit, CheckCircle, Delete } from '@mui/icons-material';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, onSnapshot, orderBy, query, updateDoc, getDoc,
  addDoc, deleteDoc
} from 'firebase/firestore'; // ESLint fix
import UsersService from '../../services/UsersService';
import ExamsService from '../../services/ExamsService';
import ConfirmPaymentDialog from './ConfirmPaymentDialog';
import { isOwnerAdminEmail } from '../../constants/admin';

function formatDate(d) {
  try {
    const date = d?.toDate ? d.toDate() : new Date(d);
    return new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'medium', timeStyle: 'short'
    }).format(date);
  } catch {
    return String(d || '');
  }
}

export default function TeacherDashboard() {
  const [role, setRole] = useState('');
  const [currentUid, setCurrentUid] = useState('');
  const [tab, setTab] = useState(0);

  const [users, setUsers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [studentExams, setStudentExams] = useState([]);

  // dialogs
  const [editPurchaseOpen, setEditPurchaseOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [studentEditOpen, setStudentEditOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({ id: '', firstName: '', lastName: '', phoneNumber: '', email: '', role: 'student' });
  const [deletingUid, setDeletingUid] = useState(null);
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);

  // purchase form (for add/edit inline)
  const [purchaseForm, setPurchaseForm] = useState({
    id: null,
    title: '',
    hours: 10,
    price: 0,
    category: 'academic',
    active: true,
    hoursUsed: 0
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setRole(''); setCurrentUid(''); return; }
      setCurrentUid(user.uid);
      try {
        const udoc = await getDoc(doc(db, 'users', user.uid));
        const data = udoc.exists() ? udoc.data() : {};
        const userRole = data.role || '';
        const email = (user.email || data.email || '').toLowerCase();
        const isAdminOverride = isOwnerAdminEmail(email);
        setRole(userRole === 'teacher' || isAdminOverride ? 'teacher' : userRole);
      } catch (e) {
        console.error('Failed to load role', e);
        setRole('');
      }
    });
    return unsub;
  }, []);

  const isTeacher = role === 'teacher';

  useEffect(() => {
    if (!isTeacher) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => {
      setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPurchases = onSnapshot(
      query(collection(db, 'purchases'), orderBy('createdAt', 'desc')),
      (s) => setPurchases(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubAppts = onSnapshot(
      query(collection(db, 'appointments'), orderBy('date', 'desc')),
      (s) => setAppointments(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubExams = ExamsService.listenAllExams(setStudentExams);
    return () => { unsubUsers(); unsubPurchases(); unsubAppts(); unsubExams(); };
  }, [isTeacher]);

  const usersById = useMemo(() => {
    const m = new Map();
    users.forEach(u => m.set(u.id, u));
    return m;
  }, [users]);

  // aggregate per student (hours); rows include all users so admin can delete anyone
  const perStudent = useMemo(() => {
    const agg = {};
    users.forEach(u => {
      agg[u.id] = { totalHours: 0, usedHours: 0, purchases: [], nextLesson: null };
    });
    purchases.forEach(p => {
      if (!agg[p.studentId]) return;
      agg[p.studentId].totalHours += Number(p.hours || 0);
      agg[p.studentId].usedHours += Number(p.hoursUsed || 0);
      agg[p.studentId].purchases.push(p);
    });
    const now = Date.now();
    appointments.forEach(a => {
      const sid = a.studentId;
      if (!agg[sid]) return;
      const t = a.date?.toDate ? a.date.toDate().getTime() : (new Date(a.date)).getTime();
      if (a.status === 'scheduled' && t > now) {
        const prev = agg[sid].nextLesson?.getTime?.() || Infinity;
        if (t < prev) agg[sid].nextLesson = new Date(t);
      }
      if (a.status === 'completed') {
        agg[sid].usedHours += Number(a.duration || 1);
      }
    });
    Object.values(agg).forEach(x => x.remaining = Math.max(0, (x.totalHours || 0) - (x.usedHours || 0)));
    return agg;
  }, [users, purchases, appointments]);

  const studentsRows = useMemo(() => {
    return Object.entries(perStudent).map(([studentId, data]) => {
      const u = usersById.get(studentId) || {};
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || studentId;
      return {
        id: studentId,
        name,
        email: u.email || '',
        phone: u.phoneNumber || '',
        role: u.role || 'student',
        total: data.totalHours,
        used: data.usedHours,
        remaining: data.remaining,
        nextLesson: data.nextLesson ? formatDate(data.nextLesson) : '—',
        purchases: data.purchases,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [perStudent, usersById]);

  const scheduledAppts = useMemo(
    () => appointments.sort((a,b) => {
      const ta = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const tb = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return tb - ta; // newest first
    }),
    [appointments]
  );

  // -------- appointments actions --------
  const deductHoursForAppointment = async (appointmentId) => {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt?.studentId) return;
    const duration = Number(appt.duration || 1);
    const studentPurchases = purchases
      .filter((p) => p.studentId === appt.studentId && p.active !== false)
      .sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return ta - tb;
      });
    let left = duration;
    for (const p of studentPurchases) {
      if (left <= 0) break;
      const hours = Number(p.hours || 0);
      const used = Number(p.hoursUsed || 0);
      const rem = Math.max(0, hours - used);
      if (rem <= 0) continue;
      const take = Math.min(rem, left);
      await updateDoc(doc(db, 'purchases', p.id), { hoursUsed: used + take });
      left -= take;
    }
  };

  const setApptStatus = async (id, status) => {
    try {
      const prev = appointments.find((a) => a.id === id);
      await updateDoc(doc(db, 'appointments', id), { status });
      if (status === 'completed' && prev?.status !== 'completed') {
        await deductHoursForAppointment(id);
      }
    } catch (e) { console.error(e); alert('فشل تحديث الموعد'); }
  };
  const deleteAppt = async (id) => {
    if (!window.confirm('هل تريد حذف هذا الموعد نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (e) { console.error(e); alert('فشل حذف الموعد'); }
  };

  // -------- student profile edit --------
  const openStudentEdit = (row) => {
    setStudentForm({
      id: row.id,
      firstName: (usersById.get(row.id)?.firstName) || '',
      lastName: (usersById.get(row.id)?.lastName) || '',
      phoneNumber: (usersById.get(row.id)?.phoneNumber) || '',
      email: (usersById.get(row.id)?.email) || '',
      role: (usersById.get(row.id)?.role) || 'student'
    });
    setStudentEditOpen(true);
  };
  const saveStudent = async () => {
    try {
      await updateDoc(doc(db, 'users', studentForm.id), {
        firstName: studentForm.firstName,
        lastName: studentForm.lastName,
        phoneNumber: studentForm.phoneNumber,
        email: studentForm.email,
        role: studentForm.role
      });
      setStudentEditOpen(false);
    } catch (e) { console.error(e); alert('فشل حفظ بيانات الطالب'); }
  };

  const deleteUserCompletely = async (row) => {
    if (!row?.id) return;
    if (row.id === currentUid) {
      alert('لا يمكنك حذف حسابك بنفسك');
      return;
    }
    const label = row.name || row.email || row.id;
    const ok = window.confirm(
      `هل تريد حذف المستخدم "${label}" وكل بياناته نهائياً؟\n(التسجيلات، الباقات، المواعيد، وملف المستخدم)\nلا يمكن التراجع عن هذا الإجراء.`
    );
    if (!ok) return;
    const ok2 = window.confirm('تأكيد أخير: حذف نهائي لكل بيانات هذا المستخدم؟');
    if (!ok2) return;

    setDeletingUid(row.id);
    try {
      await UsersService.deleteUserAndData(row.id);
      if (studentEditOpen && studentForm.id === row.id) setStudentEditOpen(false);
      if (selectedStudentId === row.id) {
        setEditPurchaseOpen(false);
        setSelectedStudentId(null);
      }
      alert('تم حذف المستخدم وكل بياناته بنجاح');
    } catch (e) {
      console.error(e);
      alert(e?.message || 'فشل حذف المستخدم');
    } finally {
      setDeletingUid(null);
    }
  };

  const roleLabel = (r) => {
    if (r === 'teacher') return 'مدرّس';
    if (r === 'pending') return 'بانتظار الموافقة';
    return 'طالب';
  };

  const examRows = useMemo(() => {
    return studentExams.map((exam) => {
      const u = usersById.get(exam.studentId) || {};
      const name =
        exam.studentName ||
        `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
        exam.studentEmail ||
        exam.studentId;
      const days = ExamsService.daysUntil(exam.examDate);
      return {
        ...exam,
        displayName: name,
        email: exam.studentEmail || u.email || '',
        daysLeft: days,
      };
    });
  }, [studentExams, usersById]);

  const deleteStudentExam = async (exam) => {
    if (!window.confirm(`حذف امتحان "${exam.examName}" للطالب ${exam.displayName}؟`)) return;
    try {
      await ExamsService.deleteExam(exam.id);
    } catch (e) {
      console.error(e);
      alert('فشل حذف الامتحان');
    }
  };

  const examStatusChip = (days) => {
    if (days === null) return <Chip size="small" label="—" />;
    if (days < 0) return <Chip size="small" label="انتهى" />;
    if (days === 0) return <Chip size="small" color="error" label="اليوم" />;
    if (days === 1) return <Chip size="small" color="warning" label="غداً" />;
    if (days <= 7) return <Chip size="small" color="info" label={`بعد ${days} أيام`} />;
    return <Chip size="small" color="success" label={`بعد ${days} يوم`} />;
  };

  // -------- purchases manage (per student) --------
  const openPurchasesFor = (studentId) => {
    setSelectedStudentId(studentId);
    setPurchaseForm({ id: null, title: '', hours: 10, price: 0, category: 'academic', active: true, hoursUsed: 0 });
    setEditPurchaseOpen(true);
  };
  const studentPurchases = useMemo(
    () => purchases.filter(p => p.studentId === selectedStudentId),
    [purchases, selectedStudentId]
  );
  const savePurchase = async () => {
    const f = purchaseForm;
    if (!f.title || !f.hours) return alert('أدخل العنوان والساعات');
    try {
      if (f.id) {
        await updateDoc(doc(db, 'purchases', f.id), {
          title: f.title,
          hours: Number(f.hours),
          price: Number(f.price || 0),
          category: f.category,
          active: !!f.active,
          hoursUsed: Number(f.hoursUsed || 0)
        });
      } else {
        await addDoc(collection(db, 'purchases'), {
          studentId: selectedStudentId,
          title: f.title,
          hours: Number(f.hours),
          price: Number(f.price || 0),
          category: f.category,
          active: !!f.active,
          hoursUsed: Number(f.hoursUsed || 0),
          createdAt: new Date()
        });
      }
      setPurchaseForm({ id: null, title: '', hours: 10, price: 0, category: 'academic', active: true, hoursUsed: 0 });
    } catch (e) { console.error(e); alert('فشل حفظ الرزمة'); }
  };
  const editPurchaseRow = (p) => {
    setPurchaseForm({
      id: p.id,
      title: p.title || '',
      hours: Number(p.hours || 0),
      price: Number(p.price || 0),
      category: p.category || 'tutoring',
      active: !!p.active,
      hoursUsed: Number(p.hoursUsed || 0)
    });
  };
  const deletePurchaseRow = async (id) => {
    if (!window.confirm('حذف هذه الرزمة')) return;
    try { await deleteDoc(doc(db, 'purchases', id)); }
    catch (e) { console.error(e); alert('فشل حذف الرزمة'); }
  };

  if (!isTeacher) {
    return (
      <Container sx={{ py: 6 }}>
        <Typography align="center" variant="h6">غير مخوّل — هذه الصفحة للمدرّس فقط</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }} spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(90deg,#0d47a1,#1976d2,#42a5f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          لوحة التحكم للمدرّس
        </Typography>
        <Button variant="contained" color="success" onClick={() => setConfirmPayOpen(true)}>
          تأكيد دفع → منح ساعات/دورة
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="المستخدمون والساعات" />
          <Tab label="المواعيد" />
          <Tab label="امتحانات الطلاب" />
        </Tabs>

        {/* Tab 0: users + hours */}
        {tab === 0 && (
          <Box sx={{ mt: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="right">المستخدم</TableCell>
                  <TableCell align="right">البريد</TableCell>
                  <TableCell align="center">الدور</TableCell>
                  <TableCell align="center">المشتراة</TableCell>
                  <TableCell align="center">المستخدمة</TableCell>
                  <TableCell align="center">المتبقية</TableCell>
                  <TableCell align="right">أقرب موعد</TableCell>
                  <TableCell align="center">إدارة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentsRows.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell align="right">{r.name}</TableCell>
                    <TableCell align="right">{r.email}</TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={roleLabel(r.role)} color={r.role === 'teacher' ? 'primary' : r.role === 'pending' ? 'warning' : 'default'} />
                    </TableCell>
                    <TableCell align="center">{r.total}</TableCell>
                    <TableCell align="center">{r.used}</TableCell>
                    <TableCell align="center">
                      <Chip label={r.remaining} color={r.remaining > 0 ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell align="right">{r.nextLesson}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                        <Button size="small" variant="outlined" onClick={() => openPurchasesFor(r.id)}>
                          إدارة الرزمات
                        </Button>
                        <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => openStudentEdit(r)}>
                          تعديل بيانات
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={deletingUid === r.id ? <CircularProgress size={14} color="inherit" /> : <Delete />}
                          disabled={!!deletingUid || r.id === currentUid}
                          onClick={() => deleteUserCompletely(r)}
                        >
                          حذف الكل
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {studentsRows.length === 0 && (
                  <TableRow><TableCell colSpan={8} align="center">لا يوجد مستخدمون</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 1: appointments */}
        {tab === 1 && (
          <Box sx={{ mt: 2, overflowX: 'auto' }}>
            <Alert severity="info" sx={{ mb: 2, textAlign: 'right', direction: 'rtl' }}>
              الحجوزات تُقبل فوراً عند الطالب. احذف أي موعد لإعادة الساعة متاحة في الجدول.
            </Alert>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="right">الطالب</TableCell>
                  <TableCell align="right">التاريخ</TableCell>
                  <TableCell align="center">المدة (س)</TableCell>
                  <TableCell align="center">الدفع</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scheduledAppts.map(a => {
                  const u = usersById.get(a.studentId) || {};
                  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || a.studentName || a.studentId;
                  const statusLabel =
                    a.status === 'completed' ? 'مكتمل' :
                    a.status === 'cancelled' ? 'ملغى' :
                    a.status === 'rejected' ? 'مرفوض' :
                    'مؤكّد';
                  return (
                    <TableRow key={a.id} hover>
                      <TableCell align="right">{name}</TableCell>
                      <TableCell align="right">{formatDate(a.date)}</TableCell>
                      <TableCell align="center">{a.duration || a.hours || 1}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={a.paymentMethod || '—'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={statusLabel}
                          color={
                            a.status === 'cancelled' || a.status === 'rejected' ? 'default' :
                            a.status === 'completed' ? 'primary' : 'success'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton size="small" color="success" title="وضع مكتمل" onClick={() => setApptStatus(a.id, 'completed')}>
                            <CheckCircle />
                          </IconButton>
                          <IconButton size="small" color="error" title="حذف — تعود الساعة للجدول" onClick={() => deleteAppt(a.id)}>
                            <Delete />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {scheduledAppts.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">لا توجد مواعيد</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 2: student exams */}
        {tab === 2 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'right', direction: 'rtl' }}>
              امتحانات أضافها الطلاب (الاسم + التاريخ + صورة). يظهر تذكير مشجّع للطالب قبل الموعد.
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 2,
              }}
            >
              {examRows.map((exam) => (
                <Paper
                  key={exam.id}
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.07)',
                  }}
                >
                  <Box
                    sx={{
                      height: 120,
                      backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,0.65)), url(${ExamsService.coverOf(exam)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                    }}
                  >
                    {examStatusChip(exam.daysLeft)}
                    <IconButton
                      size="small"
                      color="error"
                      title="حذف"
                      onClick={() => deleteStudentExam(exam)}
                      sx={{ bgcolor: 'rgba(255,255,255,0.92)' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ p: 1.75, direction: 'rtl', textAlign: 'right' }}>
                    <Typography fontWeight={900}>{exam.examName}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                      {exam.displayName} · {exam.email}
                    </Typography>
                    <Typography variant="body2" color="primary" fontWeight={700} sx={{ mt: 0.75 }}>
                      📅 {ExamsService.formatExamDate(exam.examDate)}
                    </Typography>
                    {exam.notes ? (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {exam.notes}
                      </Typography>
                    ) : null}
                  </Box>
                </Paper>
              ))}
            </Box>
            {examRows.length === 0 && (
              <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
                لا توجد امتحانات مسجّلة من الطلاب بعد
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* purchases manager (per student) */}
      <Dialog open={editPurchaseOpen} onClose={() => setEditPurchaseOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ textAlign: 'right', direction: 'rtl' }}>إدارة باقات الطالب</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          {/* Add / Edit form */}
          <Stack spacing={2} sx={{ my: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {purchaseForm.id ? 'تعديل الرزمة' : 'إضافة باقة جديدة'}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="العنوان"
                value={purchaseForm.title}
                onChange={e => setPurchaseForm(f => ({ ...f, title: e.target.value }))}
                fullWidth
              />
              <TextField
                label="الساعات"
                type="number"
                value={purchaseForm.hours}
                onChange={e => setPurchaseForm(f => ({ ...f, hours: e.target.value }))}
                sx={{ width: 140 }}
              />
              <TextField
                label="السعر (₪)"
                type="number"
                value={purchaseForm.price}
                onChange={e => setPurchaseForm(f => ({ ...f, price: e.target.value }))}
                sx={{ width: 160 }}
              />
              <TextField
                label="الفئة"
                select
                value={purchaseForm.category}
                onChange={e => setPurchaseForm(f => ({ ...f, category: e.target.value }))}
                sx={{ width: 200 }}
              >
                <MenuItem value="academic">أكاديمي / جامعة</MenuItem>
                <MenuItem value="bagrut">בגרות / مدرسة</MenuItem>
                <MenuItem value="both">للمسارين معاً</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="ساعات مستخدمة (يدوياً)"
                type="number"
                value={purchaseForm.hoursUsed}
                onChange={e => setPurchaseForm(f => ({ ...f, hoursUsed: e.target.value }))}
                sx={{ width: 220 }}
              />
              <Button
                variant={purchaseForm.active ? 'contained' : 'outlined'}
                onClick={() => setPurchaseForm(f => ({ ...f, active: !f.active }))}
                sx={{ width: 180 }}
              >
                {purchaseForm.active ? 'نشِطة' : 'غير نشِطة'}
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button variant="contained" onClick={savePurchase}>
                {purchaseForm.id ? 'حفظ التعديلات' : 'إضافة الباقة'}
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* List of purchases */}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right">العنوان</TableCell>
                <TableCell align="center">الفئة</TableCell>
                <TableCell align="center">الساعات</TableCell>
                <TableCell align="center">المستخدمة</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studentPurchases.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell align="right">{p.title}</TableCell>
                  <TableCell align="center">{p.category === 'exam' ? 'امتحانات' : 'خصوصية'}</TableCell>
                  <TableCell align="center">{p.hours}</TableCell>
                  <TableCell align="center">{p.hoursUsed || 0}</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={p.active ? 'نشِطة' : 'غير نشِطة'} color={p.active ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <IconButton size="small" onClick={() => editPurchaseRow(p)}><Edit /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deletePurchaseRow(p.id)}><Delete /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {studentPurchases.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center">لا توجد باقات لهذا الطالب</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl' }}>
          <Button onClick={() => setEditPurchaseOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* student edit dialog */}
      <Dialog open={studentEditOpen} onClose={() => setStudentEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ textAlign: 'right', direction: 'rtl' }}>تعديل بيانات الطالب</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="الاسم" value={studentForm.firstName} onChange={e => setStudentForm(f => ({ ...f, firstName: e.target.value }))} fullWidth />
              <TextField label="العائلة" value={studentForm.lastName} onChange={e => setStudentForm(f => ({ ...f, lastName: e.target.value }))} fullWidth />
            </Stack>
            <TextField label="الهاتف" value={studentForm.phoneNumber} onChange={e => setStudentForm(f => ({ ...f, phoneNumber: e.target.value }))} />
            <TextField label="البريد" value={studentForm.email} onChange={e => setStudentForm(f => ({ ...f, email: e.target.value }))} />
            <TextField label="الدور" select value={studentForm.role} onChange={e => setStudentForm(f => ({ ...f, role: e.target.value }))}>
              <MenuItem value="student">طالب</MenuItem>
              <MenuItem value="teacher">مدرّس</MenuItem>
              <MenuItem value="pending">بانتظار الموافقة</MenuItem>
            </TextField>
            <Divider />
            <Button
              variant="outlined"
              color="error"
              startIcon={deletingUid === studentForm.id ? <CircularProgress size={16} color="inherit" /> : <Delete />}
              disabled={!!deletingUid || studentForm.id === currentUid}
              onClick={() => deleteUserCompletely({
                id: studentForm.id,
                name: `${studentForm.firstName || ''} ${studentForm.lastName || ''}`.trim(),
                email: studentForm.email
              })}
            >
              حذف المستخدم وكل بياناته
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl' }}>
          <Button onClick={() => setStudentEditOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={saveStudent}>حفظ</Button>
        </DialogActions>
      </Dialog>

      <ConfirmPaymentDialog
        open={confirmPayOpen}
        onClose={() => setConfirmPayOpen(false)}
      />
    </Container>
  );
}
