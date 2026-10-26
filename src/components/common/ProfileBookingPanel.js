import React, { useEffect, useState } from 'react';
import {
  Paper, Typography, Stack, TextField, Button, Alert, Chip
} from '@mui/material';
import { Payment, Person, Email, Phone } from '@mui/icons-material';
import dayjs from 'dayjs';
import { auth } from '../../services/FirebaseService';
import AppointmentsService from '../../services/AppointmentsService';
import { useLanguage } from '../../context/LanguageContext';
import PaymentMethodDialog from './PaymentMethodDialog';
import { resolveStudentBookingIdentity } from '../../utils/studentIdentity';

/**
 * Book with signed-in profile — no re-typing name/email/phone each lesson.
 */
export default function ProfileBookingPanel({
  studentName = '',
  studentEmail = '',
  studentPhone = '',
}) {
  const { t } = useLanguage();
  const today = dayjs().format('YYYY-MM-DD');
  const [time, setTime] = useState(dayjs().add(1, 'hour').format('HH:00'));
  const [saving, setSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentItem, setPaymentItem] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [info, setInfo] = useState('');
  const [liveProfile, setLiveProfile] = useState({
    name: studentName,
    email: studentEmail,
    phone: studentPhone,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const idn = await resolveStudentBookingIdentity();
      if (cancelled) return;
      setLiveProfile({
        name: idn.studentName || studentName || '',
        email: idn.studentEmail || studentEmail || '',
        phone: idn.studentPhone || studentPhone || '',
      });
    })();
    return () => { cancelled = true; };
  }, [studentName, studentEmail, studentPhone]);

  const user = auth.currentUser;
  const name = liveProfile.name || studentName || user?.displayName || '';
  const email = liveProfile.email || studentEmail || user?.email || '';
  const phone = liveProfile.phone || studentPhone || '';

  const startBooking = async () => {
    if (!user) {
      alert(t('يجب تسجيل الدخول أولاً', 'יש להתחבר קודם'));
      return;
    }
    if (!time) {
      alert(t('اختر وقت الدرس', 'בחרו שעת שיעור'));
      return;
    }

    setSaving(true);
    setInfo('');
    try {
      // Fresh read from Firestore so booking never uses owner/stale data
      const idn = await resolveStudentBookingIdentity(user.uid);
      const finalName = idn.studentName || name;
      const finalEmail = idn.studentEmail || email;
      const finalPhone = idn.studentPhone || phone;

      if (!finalName || !finalEmail) {
        alert(
          t(
            'أكمل الاسم والبريد في ملفك الشخصي أولاً (من التسجيل)، ثم احجز.',
            'השלימו שם ואימייל בפרופיל קודם, ואז הזמינו.'
          )
        );
        setSaving(false);
        return;
      }

      setLiveProfile({ name: finalName, email: finalEmail, phone: finalPhone });

      const created = await AppointmentsService.createConfirmedBooking({
        studentId: user.uid,
        studentEmail: finalEmail,
        studentName: finalName,
        studentPhone: finalPhone,
        teacherEmail: 'mohanadsfe@gmail.com',
        teacherName: 'مهند صفي',
        teacherPhone: '0548010225',
        title: t('حجز ساعة دراسية', 'הזמנת שעת לימוד'),
        date: `${today}T${time}:00`,
        duration: 1,
        hours: 1,
        paymentMethod: '',
        paymentStatus: 'awaiting',
        source: 'profile_booking',
        bookedBy: 'student',
        sameDayOnly: true,
      });
      setBookingId(created.id);
      setPaymentItem({
        title: `${created.title} — ${today} ${time}`,
        category: 'tutoring',
        bookingId: created.id,
        studentName: finalName,
        studentEmail: finalEmail,
        studentPhone: finalPhone,
      });
      setPaymentOpen(true);
      setInfo(
        t(
          'تم الحجز فوراً. اختر طريقة الدفع.',
          'ההזמנה אושרה מיד. בחרו אמצעי תשלום.'
        )
      );
    } catch (e) {
      console.error(e);
      alert(
        t(
          'فشل الحجز — تحقق من تسجيل الدخول وصلاحيات Firestore',
          'ההזמנה נכשלה — בדקו התחברות והרשאות'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.25 },
        mb: 2.5,
        borderRadius: 3,
        border: '1px solid rgba(26,107,181,0.16)',
        bgcolor: '#fff',
        direction: 'rtl',
      }}
    >
      <Typography fontWeight={900} sx={{ mb: 0.5, fontSize: '1.15rem' }}>
        {t('احجز بحسابك (بدون إعادة كتابة البيانات)', 'הזמנה עם החשבון (בלי להקליד שוב)')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t(
          'نستخدم بياناتك من التسجيل تلقائياً لكل درس. اختر الوقت فقط ثم ادفع.',
          'משתמשים בפרטים מההרשמה אוטומטית לכל שיעור. בחרו שעה בלבד ואז שלמו.'
        )}
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip icon={<Person />} label={name || t('بدون اسم', 'ללא שם')} sx={{ fontWeight: 700 }} />
        <Chip icon={<Email />} label={email || '—'} sx={{ fontWeight: 700 }} />
        <Chip
          icon={<Phone />}
          label={phone || t('لا يوجد هاتف في الملف', 'אין טלפון בפרופיל')}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <TextField
          label={t('تاريخ الدرس (اليوم)', 'תאריך השיעור (היום)')}
          type="date"
          value={today}
          InputLabelProps={{ shrink: true }}
          inputProps={{ readOnly: true }}
          size="small"
          sx={{ minWidth: 180 }}
        />
        <TextField
          label={t('وقت الدرس', 'שעת השיעור')}
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          sx={{ minWidth: 160 }}
        />
        <Button
          variant="contained"
          startIcon={<Payment />}
          disabled={saving}
          onClick={startBooking}
          sx={{ fontWeight: 900, px: 2.5, py: 1 }}
        >
          {saving
            ? t('جارِ…', 'טוען…')
            : t('تأكيد الحجز والدفع', 'אישור הזמנה ותשלום')}
        </Button>
      </Stack>

      {info && (
        <Alert severity="success" sx={{ mt: 1.5, textAlign: 'right' }}>
          {info}
        </Alert>
      )}

      <PaymentMethodDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        item={paymentItem}
        bookingId={bookingId}
      />
    </Paper>
  );
}
