import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Box, Typography, Paper, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Stack, MenuItem, Divider
} from '@mui/material';
import { Edit, CheckCircle, Cancel, Delete } from '@mui/icons-material';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, onSnapshot, orderBy, query, updateDoc, getDoc,
  addDoc, deleteDoc
} from 'firebase/firestore'; // ESLint fix

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
  const [tab, setTab] = useState(0);

  const [users, setUsers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // dialogs
  const [editPurchaseOpen, setEditPurchaseOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [studentEditOpen, setStudentEditOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({ id: '', firstName: '', lastName: '', phoneNumber: '', email: '', role: 'student' });

  // purchase form (for add/edit inline)
  const [purchaseForm, setPurchaseForm] = useState({
    id: null,
    title: '',
    hours: 10,
    price: 0,
    category: 'tutoring',
    active: true,
    hoursUsed: 0
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setRole(''); return; }
      try {
        const udoc = await getDoc(doc(db, 'users', user.uid));
        setRole(udoc.exists() ? (udoc.data().role || '') : '');
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
    return () => { unsubUsers(); unsubPurchases(); unsubAppts(); };
  }, [isTeacher]);

  const usersById = useMemo(() => {
    const m = new Map();
    users.forEach(u => m.set(u.id, u));
    return m;
  }, [users]);

  // aggregate per student
  const perStudent = useMemo(() => {
    const agg = {};
    users.forEach(u => {
      if (u.role === 'student') agg[u.id] = { totalHours: 0, usedHours: 0, purchases: [], nextLesson: null };
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
  const setApptStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
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

  // -------- purchases manage (per student) --------
  const openPurchasesFor = (studentId) => {
    setSelectedStudentId(studentId);
    setPurchaseForm({ id: null, title: '', hours: 10, price: 0, category: 'tutoring', active: true, hoursUsed: 0 });
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
      setPurchaseForm({ id: null, title: '', hours: 10, price: 0, category: 'tutoring', active: true, hoursUsed: 0 });
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
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, background: 'linear-gradient(90deg,#0d47a1,#1976d2,#42a5f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        لوحة التحكم للمدرّس
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="الطلاب والساعات" />
          <Tab label="المواعيد" />
        </Tabs>

        {/* Tab 0: students + hours */}
        {tab === 0 && (
          <Box sx={{ mt: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="right">الطالب</TableCell>
                  <TableCell align="right">البريد</TableCell>
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
                    <TableCell align="center">{r.total}</TableCell>
                    <TableCell align="center">{r.used}</TableCell>
                    <TableCell align="center">
                      <Chip label={r.remaining} color={r.remaining > 0 ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell align="right">{r.nextLesson}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button size="small" variant="outlined" onClick={() => openPurchasesFor(r.id)}>
                          إدارة الرزمات
                        </Button>
                        <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => openStudentEdit(r)}>
                          تعديل بيانات
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {studentsRows.length === 0 && (
                  <TableRow><TableCell colSpan={7} align="center">لا يوجد طلاب</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 1: appointments */}
        {tab === 1 && (
          <Box sx={{ mt: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="right">الطالب</TableCell>
                  <TableCell align="right">التاريخ</TableCell>
                  <TableCell align="center">المدة (س)</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scheduledAppts.map(a => {
                  const u = usersById.get(a.studentId) || {};
                  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || a.studentName || a.studentId;
                  return (
                    <TableRow key={a.id} hover>
                      <TableCell align="right">{name}</TableCell>
                      <TableCell align="right">{formatDate(a.date)}</TableCell>
                      <TableCell align="center">{a.duration || 1}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={a.status || 'scheduled'}
                          color={
                            a.status === 'completed' ? 'success' :
                            a.status === 'cancelled' ? 'default' : 'primary'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton size="small" color="success" title="وضع مكتمل" onClick={() => setApptStatus(a.id, 'completed')}>
                            <CheckCircle />
                          </IconButton>
                          <IconButton size="small" color="default" title="إلغاء (يبقى في السجل)" onClick={() => setApptStatus(a.id, 'cancelled')}>
                            <Cancel />
                          </IconButton>
                          <IconButton size="small" color="error" title="حذف نهائي" onClick={() => deleteAppt(a.id)}>
                            <Delete />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {scheduledAppts.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">لا توجد مواعيد</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
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
                <MenuItem value="tutoring">دروس خصوصية</MenuItem>
                <MenuItem value="exam">محاضرات امتحانات</MenuItem>
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
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl' }}>
          <Button onClick={() => setStudentEditOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={saveStudent}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
