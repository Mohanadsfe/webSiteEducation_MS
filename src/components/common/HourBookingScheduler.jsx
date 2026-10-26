import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Stack, Button, Chip, Paper, CircularProgress, Alert,
  ToggleButton, ToggleButtonGroup, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  Person, Email, Phone, EventAvailable, AccessTime, ChevronLeft, ChevronRight
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { auth } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import AppointmentsService, {
  slotConflicts,
  studentHoursOnDay,
  parseAppointmentStart,
} from '../../services/AppointmentsService';
import BookingSettingsService, {
  DEFAULT_BOOKING_SETTINGS,
  buildSlotStartHours,
  getHoursForDate,
  isHourBlockedForStudents,
} from '../../services/BookingSettingsService';
import {
  getPrayerTimesForDate,
  buildSalahOffWindows,
  ensurePrayerTimesFresh,
  slotHitsFridayJumuahClose,
} from '../../services/PrayerTimesService';
import { resolveStudentBookingIdentity } from '../../utils/studentIdentity';
import NotificationService from '../../services/NotificationService';
import BookingCancelPolicy from './BookingCancelPolicy';
import CancelBookingButton from './CancelBookingButton';
import { useLanguage } from '../../context/LanguageContext';

const WEEKDAY_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const WEEKDAY_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTH_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTH_HE = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יונ׳', 'יול׳', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

/**
 * Custom hour booking from Firestore — ~3 months ahead.
 * Month calendar + free hours only.
 */
export default function HourBookingScheduler() {
  const { t, isHe } = useLanguage();

  const [settings, setSettings] = useState({ ...DEFAULT_BOOKING_SETTINGS, daysAhead: 90 });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [monthCursor, setMonthCursor] = useState(dayjs().startOf('month'));
  const [selectedDay, setSelectedDay] = useState(dayjs().format('YYYY-MM-DD'));
  const [duration, setDuration] = useState(1); // max 2 hours per day
  const [selectedSlot, setSelectedSlot] = useState('');
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [salahWindows, setSalahWindows] = useState([]);
  const [salahNoticeOpen, setSalahNoticeOpen] = useState(false);
  const [pendingSalahPrayers, setPendingSalahPrayers] = useState([]);
  const [uid, setUid] = useState(() => auth.currentUser?.uid || '');

  const rangeEnd = useMemo(
    () => dayjs().startOf('day').add(settings.daysAhead || 90, 'day'),
    [settings.daysAhead]
  );
  const minMonth = dayjs().startOf('month');
  const maxMonth = rangeEnd.startOf('month');

  const bookableDaySet = useMemo(() => {
    const set = new Set();
    const start = dayjs().startOf('day');
    const ahead = settings.daysAhead || 90;
    const workDays = settings.workDays || DEFAULT_BOOKING_SETTINGS.workDays;
    const blocked = new Set(settings.blockedDates || []);
    for (let i = 0; i < ahead; i += 1) {
      const d = start.add(i, 'day');
      const key = d.format('YYYY-MM-DD');
      if (!workDays.includes(d.day())) continue;
      if (blocked.has(key)) continue;
      set.add(key);
    }
    return set;
  }, [settings]);

  const monthCells = useMemo(() => {
    const first = monthCursor.startOf('month');
    const daysInMonth = first.daysInMonth();
    const startPad = first.day(); // 0 Sunday
    const cells = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(first.date(d));
    }
    return cells;
  }, [monthCursor]);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setUid(user?.uid || '');
  }), []);

  useEffect(() => {
    if (!bookableDaySet.size) return;
    if (!bookableDaySet.has(selectedDay)) {
      const first = [...bookableDaySet][0];
      setSelectedDay(first);
      setSelectedSlot('');
      setMonthCursor(dayjs(first).startOf('month'));
    }
  }, [bookableDaySet, selectedDay]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [idn, s] = await Promise.all([
        resolveStudentBookingIdentity(),
        BookingSettingsService.getSettings(),
      ]);
      if (cancelled) return;
      // Always allow at least ~3 months for students even if old settings say 14
      const next = { ...s, daysAhead: Math.max(Number(s.daysAhead) || 90, 90) };
      setSettings(next);
      setProfile({
        name: idn.studentName || '',
        email: idn.studentEmail || '',
        phone: idn.studentPhone || '',
      });
      // Prefetch salah times from internet (auto-refresh when cache is stale)
      if (next.salahOffWork?.enabled !== false) {
        ensurePrayerTimesFresh(next.salahOffWork).catch((e) => console.warn('salah prefetch', e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = AppointmentsService.subscribeAll(
      (list) => {
        setAppointments(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(t('تعذر تحميل المواعيد', 'לא ניתן לטעון תורים'));
        setLoading(false);
      }
    );
    return unsub;
  }, [t]);

  // Load salah off-work windows for the selected day (internet → cache)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = settings.salahOffWork;
      if (!cfg || cfg.enabled === false) {
        setSalahWindows([]);
        return;
      }
      try {
        const timings = await getPrayerTimesForDate(selectedDay, cfg);
        if (cancelled) return;
        setSalahWindows(buildSalahOffWindows(selectedDay, timings, cfg));
      } catch (e) {
        console.warn('salah times load failed', e);
        if (!cancelled) setSalahWindows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDay, settings.salahOffWork]);

  const availableSlots = useMemo(() => {
    const uid = auth.currentUser?.uid || '';
    const maxPerDay = Math.min(Number(settings.maxHoursPerDay) || 2, 2);
    const already = studentHoursOnDay(uid, selectedDay, appointments);
    const remaining = Math.max(0, maxPerDay - already);
    if (duration > remaining) return [];
    if (!bookableDaySet.has(selectedDay)) return [];

    const dayRange = getHoursForDate(settings, selectedDay);
    const slotHours = buildSlotStartHours(settings, selectedDay);
    const now = dayjs();
    return slotHours.filter((hour) => {
      const time = `${String(hour).padStart(2, '0')}:00`;
      const start = dayjs(`${selectedDay}T${time}:00`);
      if (!start.isValid()) return false;
      if (start.isBefore(now.add(20, 'minute'))) return false;
      if (hour + duration > dayRange.endHour) return false;
      if (isHourBlockedForStudents(settings, selectedDay, time)) return false;
      // Friday Jumu'ah: 11:00–14:00 fully closed (no booking)
      if (slotHitsFridayJumuahClose(selectedDay, hour, duration, settings.salahOffWork)) {
        return false;
      }
      // Multi-hour booking: every hour in the range must be free
      if (duration > 1) {
        for (let h = hour; h < hour + duration; h += 1) {
          const t = `${String(h).padStart(2, '0')}:00`;
          if (h >= dayRange.endHour) return false;
          if (isHourBlockedForStudents(settings, selectedDay, t)) return false;
        }
      }
      return !slotConflicts(start, duration, appointments);
    }).map((hour) => `${String(hour).padStart(2, '0')}:00`);
  }, [selectedDay, duration, appointments, settings, bookableDaySet]);

  useEffect(() => {
    if (selectedSlot && !availableSlots.includes(selectedSlot)) setSelectedSlot('');
  }, [availableSlots, selectedSlot]);

  const dayHoursUsed = studentHoursOnDay(auth.currentUser?.uid || '', selectedDay, appointments);
  const maxPerDay = Math.min(Number(settings.maxHoursPerDay) || 2, 2);
  const selectedLabel = dayjs(selectedDay);
  const myUpcoming = useMemo(() => {
    if (!uid) return [];
    const now = dayjs();
    return appointments
      .filter((a) => a.studentId === uid)
      .filter((a) => {
        const start = parseAppointmentStart(a);
        return !start || !start.isBefore(now);
      })
      .sort((a, b) => (parseAppointmentStart(a)?.valueOf() || 0) - (parseAppointmentStart(b)?.valueOf() || 0));
  }, [appointments, uid]);

  const prayersInSlot = (slot, dur = duration) => {
    if (!slot || !salahWindows.length) return [];
    const start = dayjs(`${selectedDay}T${slot}:00`);
    if (!start.isValid()) return [];
    const end = start.add(Number(dur) || 1, 'hour');
    return salahWindows.filter((w) => start.isBefore(w.end) && end.isAfter(w.start));
  };

  const shiftMonth = (dir) => {
    const next = monthCursor.add(dir, 'month').startOf('month');
    if (next.isBefore(minMonth, 'month') || next.isAfter(maxMonth, 'month')) return;
    setMonthCursor(next);
  };

  const performBooking = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert(t('يجب تسجيل الدخول أولاً', 'יש להתחבר קודם'));
      return;
    }
    if (!selectedSlot) {
      alert(t('اختر ساعة متاحة', 'בחרו שעה פנויה'));
      return;
    }

    setSaving(true);
    setError('');
    setSaved('');
    try {
      const idn = await resolveStudentBookingIdentity(user.uid);
      const studentEmail = idn.studentEmail || profile.email || user.email || '';
      const studentName = idn.studentName || profile.name || studentEmail || 'طالب';
      const studentPhone = idn.studentPhone || profile.phone || '';

      if (!studentEmail) {
        alert(t('أكمل البريد في ملفك الشخصي ثم احجز.', 'השלימו אימייל בפרופיל ואז הזמינו.'));
        setSaving(false);
        return;
      }

      const start = dayjs(`${selectedDay}T${selectedSlot}:00`);
      const salahInHour = prayersInSlot(selectedSlot, duration);
      let fresh = appointments;
      try {
        fresh = await AppointmentsService.listAll();
      } catch (readErr) {
        console.warn('Could not refresh appointments before save', readErr);
      }
      if (slotConflicts(start, duration, fresh)) {
        setError(t('هذا الموعد أصبح محجوزاً — اختر وقتاً آخر', 'התור נתפס — בחרו שעה אחרת'));
        setAppointments(fresh);
        setSelectedSlot('');
        setSaving(false);
        return;
      }
      const used = studentHoursOnDay(user.uid, selectedDay, fresh);
      if (used + duration > maxPerDay) {
        setError(t(`حد أقصى ${maxPerDay} ساعات في نفس اليوم`, `מקסימום ${maxPerDay} שעות באותו יום`));
        setSaving(false);
        return;
      }

      const payload = {
        studentId: user.uid,
        studentEmail,
        studentName,
        studentPhone,
        teacherEmail: 'mohanadsfe@gmail.com',
        teacherName: 'مهند صفي',
        teacherPhone: '0548010225',
        title: t('حجز ساعة دراسية', 'הזמנת שעת לימוד'),
        date: start.format('YYYY-MM-DDTHH:mm:ss'),
        dateKey: selectedDay,
        startTime: selectedSlot,
        duration,
        hours: duration,
        status: 'confirmed',
        paymentMethod: '',
        paymentStatus: 'awaiting',
        source: 'firestore_scheduler',
        bookedBy: 'student',
        salahNoticeAccepted: salahInHour.length > 0,
        salahAcceptNote: salahInHour.length > 0
          ? 'وافق الطالب: يذهب المعلّم للصلاة ثم يعود، أو تكون المحاضرة ٤٥ دقيقة بدل ٦٠ دقيقة.'
          : '',
        salahDuringLesson: salahInHour.map((w) => ({
          name: String(w.name || ''),
          time: String(w.salahTime || ''),
        })),
      };

      const created = await AppointmentsService.createConfirmedBooking(payload);
      setAppointments((prev) => (
        prev.some((a) => a.id === created.id) ? prev : [...prev, created]
      ));
      try {
        await NotificationService.notifyOwnerOfBooking({
          id: created.id,
          studentName,
          studentEmail,
          studentPhone,
          date: `${selectedDay} ${selectedSlot}`,
          duration,
          hours: duration,
          status: 'confirmed',
        });
      } catch (mailErr) {
        console.warn('Owner booking email failed', mailErr);
      }
      try {
        await NotificationService.notifyStudentBookingConfirmed({
          id: created.id,
          studentName,
          studentEmail,
          date: `${selectedDay} ${selectedSlot}`,
          duration,
          hours: duration,
          bookedBy: 'student',
        });
      } catch (mailErr) {
        console.warn('Student booking email failed', mailErr);
      }

      setSaved(t(
        `تم الحجز: ${selectedDay} الساعة ${selectedSlot}. أُرسلت تفاصيل الحجز إلى بريد الطالبة وإلى بريدك، من معهد المعرفة.`,
        `ההזמנה נשמרה: ${selectedDay} בשעה ${selectedSlot}. פרטי ההזמנה נשלחו למייל התלמידה ולמייל שלך, מ-MS Education.`
      ));
      setSelectedSlot('');
      setProfile({ name: studentName, email: studentEmail, phone: studentPhone });
    } catch (e) {
      console.error(e);
      const denied = String(e?.code || e?.message || '').includes('permission');
      setError(denied
        ? t(
          'لم يُحفظ الحجز بسبب الصلاحيات. سجّل الخروج ثم الدخول وحاول مرة أخرى.',
          'ההזמנה לא נשמרה בגלל הרשאות. התנתקו, התחברו ונסו שוב.'
        )
        : (e.message || t('فشل الحجز', 'ההזמנה נכשלה')));
    } finally {
      setSaving(false);
    }
  };

  const confirmBooking = () => {
    const user = auth.currentUser;
    if (!user) {
      alert(t('يجب تسجيل الدخول أولاً', 'יש להתחבר קודם'));
      return;
    }
    if (!selectedSlot) {
      alert(t('اختر ساعة متاحة', 'בחרו שעה פנויה'));
      return;
    }

    const overlapping = prayersInSlot(selectedSlot, duration);
    if (
      settings.salahOffWork?.enabled !== false
      && overlapping.length > 0
    ) {
      setPendingSalahPrayers(overlapping);
      setSalahNoticeOpen(true);
      return;
    }
    performBooking();
  };

  const acceptSalahAndBook = () => {
    setSalahNoticeOpen(false);
    performBooking();
  };

  const declineSalahHour = () => {
    setSalahNoticeOpen(false);
    setPendingSalahPrayers([]);
    setSelectedSlot('');
  };

  const monthTitle = isHe
    ? `${MONTH_HE[monthCursor.month()]} ${monthCursor.year()}`
    : `${MONTH_AR[monthCursor.month()]} ${monthCursor.year()}`;

  return (
    <Box
      sx={{
        borderRadius: 3.5,
        overflow: 'hidden',
        border: '1px solid rgba(26,107,181,0.14)',
        bgcolor: '#fff',
        direction: 'rtl',
        boxShadow: '0 14px 36px rgba(15, 50, 90, 0.08)',
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 2.5 },
          py: 2,
          color: '#fff',
          background: 'linear-gradient(120deg, #0b3d5c 0%, #1a6bb5 50%, #1a9b8e 100%)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.18)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <EventAvailable />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.15rem', md: '1.35rem' } }}>
                {t('احجز موعدك', 'הזמינו תור')}
              </Typography>
              <Typography sx={{ opacity: 0.9, fontWeight: 600, fontSize: '0.85rem' }}>
                {t('مفتوح لـ 3 أشهر قادمة · الساعات المحجوزة مخفية', 'פתוח ל־3 חודשים · שעות תפוסות מוסתרות')}
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            component={RouterLink}
            to="/my-bookings"
            sx={{
              fontWeight: 800,
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.45)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
            }}
          >
            {t('مواعيدي', 'התורים שלי')}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip icon={<Person />} label={profile.name || t('بدون اسم', 'ללא שם')} sx={{ fontWeight: 700 }} />
          <Chip icon={<Email />} label={profile.email || '—'} sx={{ fontWeight: 700 }} />
          <Chip
            icon={<Phone />}
            label={profile.phone || t('لا يوجد هاتف', 'אין טלפון')}
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        {uid && (
          <Box sx={{ mb: 2 }}>
            <Typography fontWeight={900} sx={{ mb: 1 }}>
              {t('حجوزاتي', 'ההזמנות שלי')}
            </Typography>
            {myUpcoming.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('لا يوجد حجز قادم. اختر يوماً وساعة بالأسفل.', 'אין הזמנה קרובה. בחרו יום ושעה למטה.')}
              </Typography>
            ) : (
              <Stack spacing={1}>
                {myUpcoming.map((b) => {
                  const start = parseAppointmentStart(b);
                  return (
                    <Box
                      key={b.id}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: '1px solid rgba(198,40,40,0.28)',
                        bgcolor: 'rgba(198,40,40,0.05)',
                      }}
                    >
                      <Typography fontWeight={800}>
                        {start ? start.format('YYYY-MM-DD HH:mm') : (b.dateKey || '—')}
                        {' · '}
                        {b.duration || b.hours || 1} {t('ساعة', 'שעות')}
                      </Typography>
                      <CancelBookingButton booking={b} />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}

        {saved && (
          <Alert severity="success" sx={{ mb: 2, textAlign: 'right' }} onClose={() => setSaved('')}>
            {saved}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2, textAlign: 'right' }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {(settings.noteAr || settings.noteHe) && (
          <Alert severity="info" sx={{ mb: 2, textAlign: 'right' }}>
            {isHe ? (settings.noteHe || settings.noteAr) : (settings.noteAr || settings.noteHe)}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
            gap: 2.5,
            alignItems: 'start',
          }}
        >
          {/* Month calendar */}
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 3,
              border: '1px solid rgba(26,107,181,0.12)',
              bgcolor: 'rgba(238,244,248,0.55)',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <IconButton
                size="small"
                onClick={() => shiftMonth(1)}
                disabled={monthCursor.isSame(maxMonth, 'month') || monthCursor.isAfter(maxMonth, 'month')}
              >
                <ChevronRight />
              </IconButton>
              <Typography fontWeight={900}>{monthTitle}</Typography>
              <IconButton
                size="small"
                onClick={() => shiftMonth(-1)}
                disabled={monthCursor.isSame(minMonth, 'month') || monthCursor.isBefore(minMonth, 'month')}
              >
                <ChevronLeft />
              </IconButton>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
                mb: 0.75,
              }}
            >
              {(isHe ? WEEKDAY_HE : WEEKDAY_AR).map((w) => (
                <Typography
                  key={w}
                  variant="caption"
                  align="center"
                  sx={{ fontWeight: 800, color: 'text.secondary', py: 0.5 }}
                >
                  {w}
                </Typography>
              ))}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
              }}
            >
              {monthCells.map((d, idx) => {
                if (!d) return <Box key={`e-${idx}`} />;
                const key = d.format('YYYY-MM-DD');
                const open = bookableDaySet.has(key);
                const active = key === selectedDay;
                const isToday = key === dayjs().format('YYYY-MM-DD');
                return (
                  <Button
                    key={key}
                    disabled={!open}
                    onClick={() => {
                      setSelectedDay(key);
                      setSelectedSlot('');
                    }}
                    sx={{
                      minWidth: 0,
                      height: 42,
                      borderRadius: 2,
                      fontWeight: 900,
                      p: 0,
                      bgcolor: active ? 'primary.main' : open ? '#fff' : 'transparent',
                      color: active ? '#fff' : open ? 'text.primary' : 'text.disabled',
                      border: active
                        ? 'none'
                        : open
                          ? '1px solid rgba(26,107,181,0.18)'
                          : '1px solid transparent',
                      boxShadow: active ? '0 6px 14px rgba(26,107,181,0.28)' : 'none',
                      outline: isToday && !active ? '2px solid rgba(26,155,142,0.45)' : 'none',
                      outlineOffset: -1,
                      '&:hover': {
                        bgcolor: active ? 'primary.dark' : open ? 'rgba(26,107,181,0.08)' : 'transparent',
                      },
                    }}
                  >
                    {d.date()}
                  </Button>
                );
              })}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25, textAlign: 'center' }}>
              {t('يمكنك اختيار أي يوم متاح خلال 3 أشهر', 'ניתן לבחור כל יום פנוי בתוך 3 חודשים')}
            </Typography>
          </Paper>

          {/* Times + duration */}
          <Box>
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: 'rgba(26,107,181,0.08)',
                border: '1px solid rgba(26,107,181,0.12)',
              }}
            >
              <Typography fontWeight={900}>
                {selectedLabel.isValid()
                  ? `${(isHe ? WEEKDAY_HE : WEEKDAY_AR)[selectedLabel.day()]} · ${selectedLabel.format('D/M/YYYY')}`
                  : selectedDay}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {t(
                  `${dayHoursUsed} / ${maxPerDay} ساعات محجوزة لك اليوم`,
                  `${dayHoursUsed} / ${maxPerDay} שעות להזמנה שלכם היום`
                )}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <BookingCancelPolicy dense />
            </Box>

            {settings.salahOffWork?.enabled !== false && (
              dayjs(selectedDay).day() === 5
              || salahWindows.length > 0
            ) && (
              <Alert severity="info" sx={{ mb: 2, textAlign: 'right', py: 0.75 }}>
                <Typography variant="caption" fontWeight={800} display="block" sx={{ mb: 0.5 }}>
                  نحترم أوقات الصلاة ونحب أن نساعدك على الحجز بوضوح — الساعات التي فيها صلاة معلَّمة بـ «صلاة».
                </Typography>
                {dayjs(selectedDay).day() === 5
                  && settings.salahOffWork?.fridayCloseEnabled !== false && (
                  <Typography variant="caption" fontWeight={800} display="block" sx={{ mb: 0.75, color: 'warning.dark' }}>
                    يوم الجمعة: ساعات صلاة الجمعة من{' '}
                    {String(settings.salahOffWork?.fridayCloseStartHour ?? 11).padStart(2, '0')}:00
                    {' '}إلى{' '}
                    {String(settings.salahOffWork?.fridayCloseEndHour ?? 14).padStart(2, '0')}:00
                    {' '}مغلقة بالكامل احتراماً لصلاة الجمعة.
                  </Typography>
                )}
                {salahWindows.length > 0 && (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {salahWindows.map((w) => (
                      <Chip
                        key={w.name}
                        size="small"
                        label={`${w.name} ${w.salahTime}`}
                        sx={{ fontWeight: 700, height: 24 }}
                      />
                    ))}
                  </Stack>
                )}
              </Alert>
            )}

            <Typography fontWeight={800} sx={{ mb: 1 }}>
              {t('مدة الدرس', 'משך השיעור')}
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={duration}
              onChange={(_, v) => {
                if (v != null) {
                  setDuration(v);
                  setSelectedSlot('');
                }
              }}
              sx={{
                mb: 2,
                bgcolor: '#fff',
                borderRadius: 2,
                border: '1px solid rgba(26,107,181,0.12)',
                overflow: 'hidden',
                '& .MuiToggleButton-root': {
                  fontWeight: 800,
                  textTransform: 'none',
                  border: 0,
                  py: 1,
                },
              }}
            >
              {[1, 2].map((h) => (
                <ToggleButton key={h} value={h}>
                  {h} {t('ساعة', 'שעות')}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Typography fontWeight={800} sx={{ mb: 1 }}>
              {t('الساعات المتاحة', 'שעות פנויות')}
            </Typography>

            {loading ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress size={28} />
              </Box>
            ) : availableSlots.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2, textAlign: 'right' }}>
                {t(
                  'لا ساعات متاحة لهذا اليوم — جرّب يوماً آخر من التقويم.',
                  'אין שעות פנויות ליום זה — נסו יום אחר בלוח.'
                )}
              </Alert>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, 1fr)' },
                  gap: 1,
                  mb: 2,
                }}
              >
                {availableSlots.map((slot) => {
                  const active = selectedSlot === slot;
                  const hasSalah = prayersInSlot(slot, duration).length > 0;
                  return (
                    <Button
                      key={slot}
                      variant={active ? 'contained' : 'outlined'}
                      color={hasSalah && !active ? 'warning' : 'primary'}
                      onClick={() => setSelectedSlot(slot)}
                      sx={{
                        fontWeight: 800,
                        borderRadius: 2,
                        py: 1.15,
                        flexDirection: 'column',
                        gap: 0.25,
                        boxShadow: active ? '0 8px 18px rgba(26,107,181,0.25)' : 'none',
                      }}
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <AccessTime sx={{ fontSize: 16 }} />
                        <span>{slot}</span>
                      </Stack>
                      {hasSalah && (
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            opacity: 0.95,
                            lineHeight: 1.1,
                          }}
                        >
                          صلاة
                        </Typography>
                      )}
                    </Button>
                  );
                })}
              </Box>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={saving || !selectedSlot}
              onClick={confirmBooking}
              sx={{
                fontWeight: 900,
                py: 1.4,
                borderRadius: 2.5,
                background: selectedSlot
                  ? 'linear-gradient(120deg, #0b3d5c, #1a6bb5 55%, #1a9b8e)'
                  : undefined,
              }}
            >
              {saving
                ? t('جارِ الحجز…', 'שומרים…')
                : selectedSlot
                  ? t(`تأكيد ${selectedDay} · ${selectedSlot}`, `אישור ${selectedDay} · ${selectedSlot}`)
                  : t('اختر يوماً وساعة', 'בחרו יום ושעה')}
            </Button>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={salahNoticeOpen}
        onClose={declineSalahHour}
        dir="rtl"
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 460 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
          موافقة قبل حجز ساعة فيها صلاة
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 800, mb: 1.5, lineHeight: 1.9 }}>
            هذه الساعة فيها صلاة. قبل أن يُقبل الحجز، يجب أن توافق أنت على أحد الأمرين:
          </Typography>
          {pendingSalahPrayers.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              {pendingSalahPrayers.map((w) => (
                <Chip
                  key={`${w.name}-${w.salahTime}`}
                  size="small"
                  color="warning"
                  label={`${w.name} · ${w.salahTime}`}
                  sx={{ fontWeight: 800 }}
                />
              ))}
            </Stack>
          )}
          <Typography sx={{ fontWeight: 700, lineHeight: 1.95, mb: 1.25 }}>
            ١. يذهب المعلّم إلى الصلاة، ثم يعود ويكمل المحاضرة معك.
          </Typography>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.95 }}>
            ٢. أو تكون المحاضرة ٤٥ دقيقة، وليس ساعة كاملة (٦٠ دقيقة).
          </Typography>
          <Typography color="text.secondary" sx={{ fontWeight: 700, lineHeight: 1.85, mt: 1.5 }}>
            بالضغط على «أوافق» أنت تقبل ذلك، وبعدها فقط يُحفظ الحجز.
            إذا لم توافق، اختر ساعة أخرى.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={declineSalahHour}
            sx={{ fontWeight: 800 }}
          >
            لا أوافق — ساعة أخرى
          </Button>
          <Button
            variant="contained"
            onClick={acceptSalahAndBook}
            disabled={saving}
            sx={{ fontWeight: 900 }}
          >
            أوافق وأحجز
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
