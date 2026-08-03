import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Stack, Typography, Alert
} from '@mui/material';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../../services/FirebaseService';
import UsersService from '../../services/UsersService';
import EnrollmentsService from '../../services/EnrollmentsService';
import CoursesService from '../../services/CoursesService';

/**
 * Teacher: after Bit/WhatsApp payment, confirm → create purchase and/or unlock course.
 */
export default function ConfirmPaymentDialog({ open, onClose }) {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    studentId: '',
    title: '',
    hours: 10,
    price: 0,
    category: 'academic',
    courseId: '',
    grantCourse: false,
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [s, c] = await Promise.all([
          UsersService.getAllStudents(),
          CoursesService.listCourses(),
        ]);
        setStudents(s);
        setCourses(c);
      } catch (e) {
        setError(e.message || 'فشل التحميل');
      }
    })();
  }, [open]);

  const save = async () => {
    if (!form.studentId) return alert('اختر الطالب');
    if (!form.title.trim() && !form.grantCourse) return alert('أدخل عنوان الباقة أو اختر دورة');
    setSaving(true);
    setError('');
    try {
      const student = students.find((x) => x.id === form.studentId);
      if (form.title.trim() && Number(form.hours) > 0) {
        await addDoc(collection(db, 'purchases'), {
          studentId: form.studentId,
          studentEmail: student?.email || '',
          title: form.title.trim(),
          hours: Number(form.hours),
          hoursUsed: 0,
          price: Number(form.price) || 0,
          category: form.category,
          active: true,
          paymentConfirmed: true,
          confirmedBy: auth.currentUser?.uid || '',
          confirmedAt: new Date(),
          createdAt: new Date(),
        });
      }
      if (form.grantCourse && form.courseId) {
        await EnrollmentsService.grantEnrollment(
          form.studentId,
          student?.email || '',
          form.courseId,
          auth.currentUser?.uid || ''
        );
      }
      onClose?.(true);
      setForm({
        studentId: '',
        title: '',
        hours: 10,
        price: 0,
        category: 'academic',
        courseId: '',
        grantCourse: false,
      });
    } catch (e) {
      setError(e.message || 'فشل تأكيد الدفع');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose?.(false)} fullWidth maxWidth="sm">
      <DialogTitle sx={{ textAlign: 'right', direction: 'rtl', fontWeight: 900 }}>
        تأكيد دفع → منح ساعات / دورة
      </DialogTitle>
      <DialogContent sx={{ direction: 'rtl' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          بعد استلام Bit أو إثبات الدفع عبر واتساب، أكّد هنا لمنح الساعات أو فتح الدورة تلقائياً.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="الطالب"
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            fullWidth
          >
            {students.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email} — {s.email}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="عنوان الباقة / الساعات"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            fullWidth
            placeholder="مثال: رزمة بجروت رياضيات 10 ساعات"
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="الساعات"
              type="number"
              value={form.hours}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
              fullWidth
            />
            <TextField
              label="السعر ₪"
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              fullWidth
            />
          </Stack>
          <TextField
            select
            label="المسار (لمن تظهر الباقة)"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <MenuItem value="academic">أكاديمي / جامعة</MenuItem>
            <MenuItem value="bagrut">בגרות / مدرسة</MenuItem>
            <MenuItem value="both">للمسارين معاً</MenuItem>
          </TextField>
          <TextField
            select
            label="فتح دورة أيضاً؟ (اختياري)"
            value={form.courseId}
            onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({ ...f, courseId: v, grantCourse: !!v }));
            }}
            fullWidth
          >
            <MenuItem value="">لا — ساعات فقط</MenuItem>
            {courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ direction: 'rtl' }}>
        <Button onClick={() => onClose?.(false)}>إلغاء</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          تأكيد ومنح
        </Button>
      </DialogActions>
    </Dialog>
  );
}
