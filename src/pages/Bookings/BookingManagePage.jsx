import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, Box, Paper, Stack, Button, TextField, Chip, Alert,
  CircularProgress, Divider, MenuItem, IconButton, Checkbox, FormControlLabel, FormGroup,
  InputAdornment, ToggleButton, ToggleButtonGroup, Autocomplete, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import {
  ArrowBack, Save, Delete, PersonAdd, Refresh, EventBusy,
  Search, Email, Phone, AccessTime, CalendarMonth, Person, WhatsApp, Notifications, SwapHoriz
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import dayjs from 'dayjs';
import { auth } from '../../services/FirebaseService';
import UsersService from '../../services/UsersService';
import AppointmentsService, {
  parseAppointmentStart,
  slotConflicts,
  daysUntilExpiry,
} from '../../services/AppointmentsService';
import BookingSettingsService, {
  DEFAULT_BOOKING_SETTINGS,
  buildSlotStartHours,
  blockedSlotKey,
  parseBlockedSlotKey,
  getHoursForDate,
} from '../../services/BookingSettingsService';
import {
  DEFAULT_SALAH_OFF_WORK,
  getPrayerTimesForDate,
  buildSalahOffWindows,
  clearPrayerMemoryCache,
  PRAYER_NAMES,
} from '../../services/PrayerTimesService';
import { isOwnerAdminEmail } from '../../constants/admin';
import { useLanguage } from '../../context/LanguageContext';
import NotificationService from '../../services/NotificationService';
import { sendStudentNotice, noticeErrorText } from '../../services/SmsService';
import BookingCancelPolicy from '../../components/common/BookingCancelPolicy';
import {
  buildStudentLectureReminderMessage,
  buildWhatsAppToPhone,
} from '../../constants/payment';

const WEEKDAY_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function canManage(user, profile) {
  return isOwnerAdminEmail(user?.email || profile?.email) || profile?.role === 'teacher';
}

function studentLabel(s) {
  if (!s) return '';
  const name = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.displayName || '';
  return name ? `${name} — ${s.email || ''}` : (s.email || s.id);
}

export default function BookingManagePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [settings, setSettings] = useState({ ...DEFAULT_BOOKING_SETTINGS });
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [dayView, setDayView] = useState(''); // YYYY-MM-DD — show all bookings that day
  const [actorUid, setActorUid] = useState('');

  const [addForm, setAddForm] = useState({
    studentId: '',
    date: dayjs().format('YYYY-MM-DD'),
    time: '10:00',
    duration: 1,
    note: '',
  });
  const [blockDate, setBlockDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [dateHoursDraft, setDateHoursDraft] = useState({ startHour: 9, endHour: 21 });
  const [salahPreview, setSalahPreview] = useState({ loading: false, windows: [], error: '' });
  const [reassignBooking, setReassignBooking] = useState(null);
  const [reassignStudent, setReassignStudent] = useState(null);
  const [smsStudent, setSmsStudent] = useState(null);
  const [smsText, setSmsText] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsBookingId, setSmsBookingId] = useState('');

  const reload = async () => {
    const [s, list, st] = await Promise.all([
      BookingSettingsService.getSettings(),
      AppointmentsService.listAll().then(async (all) => {
        await AppointmentsService.purgeExpiredAppointments(all);
        // Legacy pending → confirmed (bookings no longer wait for owner accept)
        await Promise.all(
          all
            .filter((a) => {
              const stt = String(a.status || '').toLowerCase();
              return stt.includes('pending') || stt.includes('await');
            })
            .map(async (a) => {
              try {
                await AppointmentsService.updateBooking(a.id, {
                  status: 'confirmed',
                  confirmedAt: new Date(),
                  autoConfirmed: true,
                });
              } catch {
                /* ignore */
              }
            })
        );
        return AppointmentsService.listAll();
      }),
      UsersService.getAllStudents(),
    ]);
    setSettings(s);
    setBookings(
      list.slice().sort((a, b) => {
        const da = parseAppointmentStart(a)?.valueOf() || 0;
        const dbv = parseAppointmentStart(b)?.valueOf() || 0;
        return dbv - da;
      })
    );
    setStudents(st);
  };

  useEffect(() => {
    let unsubBookings = () => {};
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubBookings();
      unsubBookings = () => {};
      if (!user) {
        navigate('/login');
        return;
      }
      setActorUid(user.uid);
      const profile = await UsersService.getUser(user.uid);
      if (!canManage(user, profile)) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      unsubBookings = AppointmentsService.subscribeAll(
        (list) => {
          setBookings(list.slice().sort((a, b) => {
            const da = parseAppointmentStart(a)?.valueOf() || 0;
            const dbv = parseAppointmentStart(b)?.valueOf() || 0;
            return dbv - da;
          }));
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setError(err.message || 'فشل تحميل الحجوزات');
          setLoading(false);
        }
      );
      try {
        await reload();
      } catch (e) {
        setError(e.message || 'فشل التحميل');
      } finally {
        setLoading(false);
      }
    });
    return () => {
      unsubAuth();
      unsubBookings();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const bookingsByDay = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      const start = parseAppointmentStart(b);
      const key = start ? start.format('YYYY-MM-DD') : b.dateKey;
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    });
    // Sort each day's list by time ascending
    map.forEach((list) => {
      list.sort((a, b) => {
        const da = parseAppointmentStart(a)?.valueOf() || 0;
        const dbv = parseAppointmentStart(b)?.valueOf() || 0;
        return da - dbv;
      });
    });
    return map;
  }, [bookings]);

  const daysWithBookings = useMemo(() => {
    return [...bookingsByDay.keys()].sort((a, b) => a.localeCompare(b));
  }, [bookingsByDay]);

  const filteredBookings = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const now = dayjs();
    let list = bookings;

    if (dayView) {
      list = bookingsByDay.get(dayView) || [];
    } else {
      list = bookings.filter((b) => {
        const start = parseAppointmentStart(b);
        const isPast = start && start.isBefore(now);
        if (timeFilter === 'upcoming' && isPast) return false;
        if (timeFilter === 'past' && !isPast) return false;
        return true;
      });
    }

    if (!q) return list;

    return list.filter((b) => {
      const student = students.find((s) => s.id === b.studentId);
      const fullName = student
        ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
        : '';
      const hay = [
        b.studentName,
        b.studentEmail,
        b.studentPhone,
        fullName,
        student?.email,
        student?.displayName,
        b.date,
        b.title,
        b.note,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q) || q.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }, [bookings, bookingsByDay, filter, timeFilter, dayView, students]);

  const searchCounts = useMemo(() => {
    const now = dayjs();
    let upcoming = 0;
    let past = 0;
    bookings.forEach((b) => {
      const start = parseAppointmentStart(b);
      if (start && start.isBefore(now)) past += 1;
      else upcoming += 1;
    });
    return { all: bookings.length, upcoming, past };
  }, [bookings]);

  const openDayView = (dateStr) => {
    if (!dateStr) return;
    setDayView(dateStr);
    setTimeFilter('all');
    setOk(t(
      `عرض حجوزات يوم ${dateStr}`,
      `מציג הזמנות ליום ${dateStr}`
    ));
  };

  const clearDayView = () => {
    setDayView('');
    setTimeFilter('upcoming');
  };

  const slotChoices = useMemo(() => {
    return buildSlotStartHours(settings, blockDate || addForm.date).map(
      (h) => `${String(h).padStart(2, '0')}:00`
    );
  }, [settings, blockDate, addForm.date]);

  const addFormSlotChoices = useMemo(() => {
    return buildSlotStartHours(settings, addForm.date).map(
      (h) => `${String(h).padStart(2, '0')}:00`
    );
  }, [settings, addForm.date]);

  const setWeekdayHours = (day, field, value) => {
    setSettings((s) => {
      const key = String(day);
      const prev = (s.dayHours && s.dayHours[key]) || {
        startHour: s.startHour,
        endHour: s.endHour,
      };
      return {
        ...s,
        dayHours: {
          ...(s.dayHours || {}),
          [key]: {
            ...prev,
            [field]: Number(value),
          },
        },
      };
    });
  };

  const applyDefaultToAllWeekdays = () => {
    setSettings((s) => {
      const dayHours = {};
      (s.workDays || []).forEach((d) => {
        dayHours[String(d)] = { startHour: s.startHour, endHour: s.endHour };
      });
      return { ...s, dayHours };
    });
    setOk(t('طُبّقت الساعات الافتراضية على كل أيام العمل', 'שעות ברירת המחדל הוחלו על כל ימי העבודה'));
  };

  const saveDateHoursOverride = async () => {
    if (!blockDate) return;
    const range = getHoursForDate(settings, blockDate);
    const dateHours = {
      ...(settings.dateHours || {}),
      [blockDate]: {
        startHour: Number(dateHoursDraft.startHour ?? range.startHour),
        endHour: Number(dateHoursDraft.endHour ?? range.endHour),
      },
    };
    await persistBlockSettings(
      { dateHours },
      t(`ساعات ${blockDate} حُفظت لهذا اليوم فقط`, `שעות ${blockDate} נשמרו ליום זה בלבד`)
    );
  };

  const clearDateHoursOverride = async () => {
    if (!blockDate) return;
    const dateHours = { ...(settings.dateHours || {}) };
    delete dateHours[blockDate];
    await persistBlockSettings(
      { dateHours },
      t(`أُزيل تخصيص ساعات ${blockDate}`, `הוסר שינוי השעות ל-${blockDate}`)
    );
  };

  const saveHours = async () => {
    setSavingHours(true);
    setError('');
    setOk('');
    try {
      const next = await BookingSettingsService.saveSettings(settings, actorUid);
      setSettings(next);
      setOk(t('تم حفظ ساعات العمل', 'שעות העבודה נשמרו'));
    } catch (e) {
      setError(e.message || t('فشل حفظ الساعات', 'שמירת השעות נכשלה'));
    } finally {
      setSavingHours(false);
    }
  };

  const toggleWorkDay = (day) => {
    setSettings((s) => {
      const has = s.workDays.includes(day);
      const workDays = has
        ? s.workDays.filter((d) => d !== day)
        : [...s.workDays, day].sort((a, b) => a - b);
      const dayHours = { ...(s.dayHours || {}) };
      const key = String(day);
      if (has) {
        delete dayHours[key];
      } else if (!dayHours[key]) {
        dayHours[key] = { startHour: s.startHour, endHour: s.endHour };
      }
      return { ...s, workDays, dayHours };
    });
  };

  // Keep date-hours draft in sync with selected calendar day
  useEffect(() => {
    if (!blockDate) return;
    const range = getHoursForDate(settings, blockDate);
    setDateHoursDraft({ startHour: range.startHour, endHour: range.endHour });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockDate, settings.dateHours, settings.dayHours, settings.startHour, settings.endHour]);

  // Keep add-booking time inside that day's work hours
  useEffect(() => {
    if (!addFormSlotChoices.length) return;
    if (!addFormSlotChoices.includes(addForm.time)) {
      setAddForm((f) => ({ ...f, time: addFormSlotChoices[0] }));
    }
  }, [addFormSlotChoices, addForm.time]);

  // Preview salah windows for selected day (auto from internet / cache)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = settings.salahOffWork || DEFAULT_SALAH_OFF_WORK;
      if (cfg.enabled === false || !blockDate) {
        setSalahPreview({ loading: false, windows: [], error: '' });
        return;
      }
      setSalahPreview((p) => ({ ...p, loading: true, error: '' }));
      try {
        const timings = await getPrayerTimesForDate(blockDate, cfg);
        if (cancelled) return;
        setSalahPreview({
          loading: false,
          windows: buildSalahOffWindows(blockDate, timings, cfg),
          error: '',
        });
      } catch (e) {
        if (!cancelled) {
          setSalahPreview({
            loading: false,
            windows: [],
            error: e.message || '',
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [blockDate, settings.salahOffWork]);

  const persistBlockSettings = async (patch, okMsg) => {
    setSavingHours(true);
    setError('');
    try {
      const next = await BookingSettingsService.saveSettings({ ...settings, ...patch }, actorUid);
      setSettings(next);
      if (okMsg) setOk(okMsg);
    } catch (e) {
      setError(e.message || 'فشل');
    } finally {
      setSavingHours(false);
    }
  };

  const addBlockedDate = async () => {
    if (!blockDate) return;
    // Closing the whole day; clear per-hour blocks for that day (redundant)
    const blockedDates = [...new Set([...(settings.blockedDates || []), blockDate])];
    const blockedSlots = (settings.blockedSlots || []).filter(
      (k) => !String(k).startsWith(`${blockDate}|`)
    );
    await persistBlockSettings(
      { blockedDates, blockedSlots },
      t(`تم إغلاق يوم ${blockDate} بالكامل`, `היום ${blockDate} נחסם במלואו`)
    );
  };

  const removeBlockedDate = async (date) => {
    const blockedDates = (settings.blockedDates || []).filter((d) => d !== date);
    await persistBlockSettings(
      { blockedDates },
      t(`أُعيد فتح يوم ${date}`, `היום ${date} נפתח מחדש`)
    );
  };

  const toggleBlockedHour = async (time) => {
    if (!blockDate || !time) return;
    if ((settings.blockedDates || []).includes(blockDate)) {
      setError(t(
        'هذا اليوم مغلق بالكامل — أعد فتحه أولاً ثم أغلق ساعات محددة.',
        'היום חסום במלואו — פתחו אותו קודם ואז חסמו שעות.'
      ));
      return;
    }
    const key = blockedSlotKey(blockDate, time);
    const has = (settings.blockedSlots || []).includes(key);
    const blockedSlots = has
      ? (settings.blockedSlots || []).filter((k) => k !== key)
      : [...new Set([...(settings.blockedSlots || []), key])];
    await persistBlockSettings(
      { blockedSlots },
      has
        ? t(`فُتحت الساعة ${time} في ${blockDate}`, `השעה ${time} ב-${blockDate} נפתחה`)
        : t(`أُغلقت الساعة ${time} في ${blockDate}`, `השעה ${time} ב-${blockDate} נחסמה`)
    );
  };

  const removeBlockedSlot = async (key) => {
    const blockedSlots = (settings.blockedSlots || []).filter((k) => k !== key);
    await persistBlockSettings({ blockedSlots });
  };

  const blockAllHoursOnDay = async () => {
    if (!blockDate) return;
    const times = buildSlotStartHours(settings, blockDate).map(
      (h) => `${String(h).padStart(2, '0')}:00`
    );
    if ((settings.blockedDates || []).includes(blockDate)) {
      setOk(t('اليوم مغلق بالكامل مسبقاً', 'היום כבר חסום במלואו'));
      return;
    }
    const extra = times.map((time) => blockedSlotKey(blockDate, time));
    const blockedSlots = [...new Set([...(settings.blockedSlots || []), ...extra])];
    await persistBlockSettings(
      { blockedSlots },
      t(`أُغلقت كل ساعات ${blockDate}`, `כל שעות ${blockDate} נחסמו`)
    );
  };

  const deleteBooking = async (id) => {
    if (!window.confirm(t(
      'حذف هذا الحجز؟ ستعود الساعة متاحة في جدول الطلاب.',
      'למחוק הזמנה זו? השעה תחזור להיות פנויה בלוח.'
    ))) return;
    setError('');
    const prev = bookings;
    setBookings((list) => list.filter((b) => b.id !== id));
    try {
      await AppointmentsService.deleteBooking(id);
      setOk(t('تم الحذف — الساعة متاحة مجدداً في الجدول', 'נמחק — השעה פנויה שוב בלוח'));
    } catch (e) {
      console.error(e);
      setBookings(prev);
      setError(
        e?.code === 'permission-denied'
          || String(e?.message || '').includes('permission')
          ? t(
            'لا صلاحية حذف — سجّل بحساب المالك وانشر قواعد Firestore.',
            'אין הרשאת מחיקה — התחברו כבעלים ופרסמו את חוקי Firestore.'
          )
          : (e.message || t('فشل الحذف', 'המחיקה נכשלה'))
      );
    }
  };

  const addOwnerBooking = async () => {
    setError('');
    setOk('');
    const student = students.find((s) => s.id === addForm.studentId);
    if (!student) {
      setError(t('اختر طالباً محدداً من القائمة', 'בחרו תלמיד ספציפי מהרשימה'));
      return;
    }
    const start = dayjs(`${addForm.date}T${addForm.time}:00`);
    if (!start.isValid()) {
      setError(t('تاريخ/وقت غير صالح', 'תאריך/שעה לא תקינים'));
      return;
    }
    if (slotConflicts(start, Number(addForm.duration) || 1, bookings)) {
      setError(t('هذا الوقت متعارض مع حجز موجود', 'השעה מתנגשת עם הזמנה קיימת'));
      return;
    }

    try {
      const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email;
      const studentPhone = student.phoneNumber || student.phone || '';
      const created = await AppointmentsService.createOwnerBooking({
        studentId: student.id,
        studentEmail: student.email || '',
        studentName,
        studentPhone,
        teacherEmail: 'mohanadsfe@gmail.com',
        teacherName: 'مهند صفي',
        teacherPhone: '0548010225',
        title: t('حجز من المالك', 'הזמנה מהבעלים'),
        date: start.format('YYYY-MM-DDTHH:mm:ss'),
        duration: Number(addForm.duration) || 1,
        hours: Number(addForm.duration) || 1,
        status: 'confirmed',
        note: addForm.note || '',
        source: 'owner_manage',
        bookedBy: 'owner',
        assignedByOwner: true,
      });

      // Notify student (email) + open WhatsApp to that student
      try {
        await NotificationService.notifyStudentOwnerAssignedBooking({
          id: created.id,
          studentName,
          studentEmail: student.email || '',
          date: start.format('YYYY-MM-DD HH:mm'),
          duration: Number(addForm.duration) || 1,
          note: addForm.note || '',
        });
      } catch (e) {
        console.warn('student assign notify', e);
      }

      const waMsg = (
        `مرحباً ${studentName} 👋\n\n`
        + `قام المعلّم بحجز محاضرة لك:\n`
        + `📅 ${start.format('YYYY-MM-DD HH:mm')}\n`
        + `⏰ ${Number(addForm.duration) || 1} ساعة\n`
        + (addForm.note ? `📝 ${addForm.note}\n` : '')
        + `\nراجع «مواعيدي» في الموقع.\n`
        + `للإلغاء: قبل ٢٤ ساعة من الموعد، وإلا يبقى الحجز محتسباً.\n\nمعهد المعرفة`
      );
      if (studentPhone) {
        window.open(buildWhatsAppToPhone(studentPhone, waMsg), '_blank', 'noopener,noreferrer');
      }

      await reload();
      setOk(t(
        `تم حجز الموعد للطالب ${studentName} وإرسال إشعار`,
        `התור הוזמן לתלמיד ${studentName} ונשלחה הודעה`
      ));
    } catch (e) {
      setError(e.message || 'فشل الإضافة');
    }
  };

  const sendOneNotice = async (studentId, message, bookingId = '') => {
    const text = String(message || '').trim();
    if (!studentId) {
      setError(t('لا يوجد حساب لهذا الطالب', 'אין חשבון לתלמיד'));
      return;
    }
    if (!text) {
      setError(t('اكتب الرسالة', 'כתבו הודעה'));
      return;
    }
    if (bookingId) setSmsBookingId(bookingId);
    else setSmsSending(true);
    setError('');
    try {
      await sendStudentNotice(studentId, text);
      setOk(t('تم إرسال الإشعار للطالب', 'ההתראה נשלחה לתלמיד'));
      if (!bookingId) setSmsText('');
    } catch (e) {
      setError(noticeErrorText(e));
    } finally {
      setSmsSending(false);
      setSmsBookingId('');
    }
  };

  const sendStudentReminderChannels = (booking, kind = 'day_before') => {
    const start = parseAppointmentStart(booking);
    const when = start ? start.format('YYYY-MM-DD HH:mm') : (booking.date || '');
    const msg = buildStudentLectureReminderMessage(
      { ...booking, date: when },
      kind
    );
    const phone = booking.studentPhone || '';
    if (!phone) {
      setError(t('لا يوجد رقم هاتف لهذا الطالب', 'אין מספר טלפון לתלמיד זה'));
      return;
    }
    window.open(buildWhatsAppToPhone(phone, msg), '_blank', 'noopener,noreferrer');
    setOk(t('فُتح واتساب لتذكير الطالب', 'WhatsApp נפתח לתזכורת לתלמיד'));
  };

  const confirmReassign = async () => {
    if (!reassignBooking || !reassignStudent) {
      setError(t('اختر طالباً', 'בחרו תלמיד'));
      return;
    }
    try {
      const studentName = `${reassignStudent.firstName || ''} ${reassignStudent.lastName || ''}`.trim()
        || reassignStudent.email;
      const studentPhone = reassignStudent.phoneNumber || reassignStudent.phone || '';
      await AppointmentsService.updateBooking(reassignBooking.id, {
        studentId: reassignStudent.id,
        studentEmail: reassignStudent.email || '',
        studentName,
        studentPhone,
        assignedByOwner: true,
        reassignedAt: new Date(),
      });
      const start = parseAppointmentStart(reassignBooking);
      const when = start ? start.format('YYYY-MM-DD HH:mm') : (reassignBooking.date || '');
      try {
        await NotificationService.notifyStudentOwnerAssignedBooking({
          studentName,
          studentEmail: reassignStudent.email || '',
          date: when,
          duration: reassignBooking.duration || reassignBooking.hours || 1,
          note: 'تم تحويل هذا الموعد إليك من المعلّم',
        });
      } catch {
        /* ignore */
      }
      if (studentPhone) {
        window.open(
          buildWhatsAppToPhone(
            studentPhone,
            `مرحباً ${studentName} 👋\nتم تحويل محاضرة إليك:\n📅 ${when}\nراجع «مواعيدي».\nمعهد المعرفة`
          ),
          '_blank',
          'noopener,noreferrer'
        );
      }
      setReassignBooking(null);
      setReassignStudent(null);
      await reload();
      setOk(t('تم تعيين الحجز للطالب المحدد', 'ההזמנה הועברה לתלמיד שנבחר'));
    } catch (e) {
      setError(e.message || 'فشل');
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
        <Typography align="center">{t('غير مخوّل — للمالك فقط', 'אין הרשאה — לבעלים בלבד')}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, direction: 'rtl' }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ fontWeight: 800 }}>
          {t('العودة', 'חזרה')}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/my-bookings')} sx={{ fontWeight: 800 }}>
          {t('عرض مواعيد الطلاب', 'תצוגת תורים')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => reload().catch((e) => setError(e.message))}
          sx={{ fontWeight: 800 }}
        >
          {t('تحديث', 'רענון')}
        </Button>
      </Stack>

      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        {t('إدارة الحجوزات وساعات العمل', 'ניהול הזמנות ושעות עבודה')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t(
          'حدّد ساعات كل يوم، أغلق أياماً أو ساعات، واحجز لطالب محدد، وأدر الحجوزات.',
          'הגדירו שעות לכל יום, חסמו ימים או שעות, הזמינו לתלמיד ספציפי, ונהלו הזמנות.'
        )}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <BookingCancelPolicy dense />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, textAlign: 'right' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {ok && (
        <Alert severity="success" sx={{ mb: 2, textAlign: 'right' }} onClose={() => setOk('')}>
          {ok}
        </Alert>
      )}

      {/* Working hours */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid rgba(26,107,181,0.15)' }}>
        <Typography fontWeight={900} sx={{ mb: 0.5 }}>
          {t('ساعات العمل المتاحة للطلاب', 'שעות העבודה הפתוחות לתלמידים')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            'يمكنك تعيين ساعات مختلفة لكل يوم من أيام الأسبوع.',
            'ניתן להגדיר שעות שונות לכל יום בשבוע.'
          )}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label={t('افتراضي من', 'ברירת מחדל מ-')}
            type="number"
            value={settings.startHour}
            onChange={(e) => setSettings((s) => ({ ...s, startHour: Number(e.target.value) }))}
            inputProps={{ min: 0, max: 23 }}
            sx={{ width: 140 }}
          />
          <TextField
            label={t('افتراضي إلى (غير شاملة)', 'ברירת מחדל עד (לא כולל)')}
            type="number"
            value={settings.endHour}
            onChange={(e) => setSettings((s) => ({ ...s, endHour: Number(e.target.value) }))}
            inputProps={{ min: 1, max: 24 }}
            sx={{ width: 200 }}
            helperText={t('يُستخدم إن لم تُضبط ساعات اليوم', 'משמש אם לא הוגדרו שעות ליום')}
          />
          <TextField
            label={t('أيام للأمام', 'ימים קדימה')}
            type="number"
            value={settings.daysAhead}
            onChange={(e) => setSettings((s) => ({ ...s, daysAhead: Number(e.target.value) }))}
            sx={{ width: 140 }}
          />
          <TextField
            label={t('حد ساعات الطالب/يوم (2)', 'מקס׳ שעות תלמיד/יום (2)')}
            type="number"
            value={settings.maxHoursPerDay}
            onChange={(e) => setSettings((s) => ({
              ...s,
              maxHoursPerDay: Math.min(2, Math.max(1, Number(e.target.value) || 2)),
            }))}
            inputProps={{ min: 1, max: 2 }}
            sx={{ width: 200 }}
          />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
          <Typography fontWeight={800}>
            {t('ساعات كل يوم', 'שעות לכל יום')}
          </Typography>
          <Button size="small" onClick={applyDefaultToAllWeekdays} sx={{ fontWeight: 800 }}>
            {t('تطبيق الافتراضي على الكل', 'החל ברירת מחדל על הכל')}
          </Button>
        </Stack>

        <Stack spacing={1.25} sx={{ mb: 2 }}>
          {WEEKDAY_AR.map((label, day) => {
            const open = settings.workDays.includes(day);
            const hours = (settings.dayHours && settings.dayHours[String(day)]) || {
              startHour: settings.startHour,
              endHour: settings.endHour,
            };
            return (
              <Box
                key={day}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' },
                  gap: 1.25,
                  alignItems: 'center',
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: open ? 'rgba(26,107,181,0.06)' : 'rgba(0,0,0,0.03)',
                  border: '1px solid',
                  borderColor: open ? 'rgba(26,107,181,0.18)' : 'rgba(0,0,0,0.06)',
                  opacity: open ? 1 : 0.55,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={open}
                      onChange={() => toggleWorkDay(day)}
                    />
                  }
                  label={<Typography fontWeight={800}>{label}</Typography>}
                  sx={{ m: 0 }}
                />
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <TextField
                    size="small"
                    label={t('من', 'מ-')}
                    type="number"
                    disabled={!open}
                    value={hours.startHour}
                    onChange={(e) => setWeekdayHours(day, 'startHour', e.target.value)}
                    inputProps={{ min: 0, max: 23 }}
                    sx={{ width: 100 }}
                  />
                  <TextField
                    size="small"
                    label={t('إلى', 'עד')}
                    type="number"
                    disabled={!open}
                    value={hours.endHour}
                    onChange={(e) => setWeekdayHours(day, 'endHour', e.target.value)}
                    inputProps={{ min: 1, max: 24 }}
                    sx={{ width: 100 }}
                  />
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    {open
                      ? t(
                        `${hours.startHour}:00 → ${Math.max(hours.endHour - 1, hours.startHour)}:00`,
                        `${hours.startHour}:00 → ${Math.max(hours.endHour - 1, hours.startHour)}:00`
                      )
                      : t('مغلق', 'סגור')}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Stack>

        <TextField
          label={t('ملاحظة للطلاب (عربي)', 'הערה לתלמידים (ערבית)')}
          value={settings.noteAr || ''}
          onChange={(e) => setSettings((s) => ({ ...s, noteAr: e.target.value }))}
          fullWidth
          sx={{ mb: 1.5 }}
        />

        <Button
          variant="contained"
          startIcon={savingHours ? <CircularProgress size={16} color="inherit" /> : <Save />}
          onClick={saveHours}
          disabled={savingHours}
          sx={{ fontWeight: 900 }}
        >
          {t('حفظ ساعات العمل', 'שמירת שעות עבודה')}
        </Button>

        <Divider sx={{ my: 2.5 }} />

        {/* Islamic salah off-work */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <AccessTime color="primary" />
          <Typography fontWeight={900}>
            {t('إيقاف الحجز وقت الصلاة (تلقائي من الإنترنت)', 'הפסקת הזמנות בזמן תפילה (אוטומטי מהאינטרנט)')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t(
            'الموقع يحترم أوقات الصلاة ويحب أن يساعد الطالب: الساعة تبقى ظاهرة، وقبل الحجز رسالة لطيفة أن المعلّم يخرج للصلاة ~١٠ دقائق ثم يعود.',
            'האתר מכבד זמני תפילה ורוצה לעזור לתלמיד: השעה נשארת זמינה, ולפני ההזמנה הודעה נעימה שהמורה יוצא לתפילה כ־10 דק׳ ואז חוזר.'
          )}
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={settings.salahOffWork?.enabled !== false}
              onChange={(e) => setSettings((s) => ({
                ...s,
                salahOffWork: {
                  ...(s.salahOffWork || DEFAULT_SALAH_OFF_WORK),
                  enabled: e.target.checked,
                },
              }))}
            />
          }
          label={<Typography fontWeight={800}>{t('تفعيل إيقاف الصلاة', 'הפעלת חסימת תפילה')}</Typography>}
          sx={{ mb: 1.5 }}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1.5 }}>
          <TextField
            label={t('المدينة', 'עיר')}
            value={settings.salahOffWork?.city || ''}
            onChange={(e) => setSettings((s) => ({
              ...s,
              salahOffWork: { ...(s.salahOffWork || DEFAULT_SALAH_OFF_WORK), city: e.target.value },
            }))}
            fullWidth
          />
          <TextField
            label={t('البلد', 'מדינה')}
            value={settings.salahOffWork?.country || ''}
            onChange={(e) => setSettings((s) => ({
              ...s,
              salahOffWork: { ...(s.salahOffWork || DEFAULT_SALAH_OFF_WORK), country: e.target.value },
            }))}
            fullWidth
          />
          <TextField
            label={t('دقائق قبل', 'דק׳ לפני')}
            type="number"
            value={settings.salahOffWork?.minutesBefore ?? 5}
            onChange={(e) => setSettings((s) => ({
              ...s,
              salahOffWork: {
                ...(s.salahOffWork || DEFAULT_SALAH_OFF_WORK),
                minutesBefore: Number(e.target.value),
              },
            }))}
            inputProps={{ min: 0, max: 60 }}
            sx={{ minWidth: 120 }}
          />
          <TextField
            label={t('دقائق بعد', 'דק׳ אחרי')}
            type="number"
            value={settings.salahOffWork?.minutesAfter ?? 10}
            onChange={(e) => setSettings((s) => ({
              ...s,
              salahOffWork: {
                ...(s.salahOffWork || DEFAULT_SALAH_OFF_WORK),
                minutesAfter: Number(e.target.value),
              },
            }))}
            inputProps={{ min: 0, max: 60 }}
            sx={{ minWidth: 120 }}
          />
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          {PRAYER_NAMES.map((name) => {
            const on = (settings.salahOffWork?.prayers || PRAYER_NAMES).includes(name);
            return (
              <Chip
                key={name}
                clickable
                color={on ? 'primary' : 'default'}
                variant={on ? 'filled' : 'outlined'}
                label={name}
                onClick={() => {
                  setSettings((s) => {
                    const cur = s.salahOffWork || DEFAULT_SALAH_OFF_WORK;
                    const list = new Set(cur.prayers || PRAYER_NAMES);
                    if (list.has(name)) list.delete(name);
                    else list.add(name);
                    return {
                      ...s,
                      salahOffWork: { ...cur, prayers: [...list] },
                    };
                  });
                }}
                sx={{ fontWeight: 800 }}
              />
            );
          })}
        </Stack>

        <Box
          sx={{
            mb: 1.5,
            p: 1.75,
            borderRadius: 2.5,
            bgcolor: 'rgba(232,163,23,0.1)',
            border: '1px solid rgba(232,163,23,0.35)',
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.salahOffWork?.fridayCloseEnabled !== false}
                onChange={(e) => setSettings((s) => ({
                  ...s,
                  salahOffWork: {
                    ...(s.salahOffWork || DEFAULT_SALAH_OFF_WORK),
                    fridayCloseEnabled: e.target.checked,
                  },
                }))}
              />
            }
            label={(
              <Typography fontWeight={800}>
                {t(
                  'الجمعة: إغلاق ساعات صلاة الجمعة بالكامل (لا حجز)',
                  'שישי: סגירת שעות תפילת יום שישי לגמרי (אין הזמנה)'
                )}
              </Typography>
            )}
          />
          <Stack direction="row" spacing={1.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label={t('من', 'מ-')}
              type="number"
              value={settings.salahOffWork?.fridayCloseStartHour ?? 11}
              onChange={(e) => setSettings((s) => ({
                ...s,
                salahOffWork: {
                  ...(s.salahOffWork || DEFAULT_SALAH_OFF_WORK),
                  fridayCloseStartHour: Number(e.target.value),
                },
              }))}
              inputProps={{ min: 0, max: 23 }}
              sx={{ width: 110 }}
              disabled={settings.salahOffWork?.fridayCloseEnabled === false}
            />
            <TextField
              size="small"
              label={t('إلى (غير شاملة)', 'עד (לא כולל)')}
              type="number"
              value={settings.salahOffWork?.fridayCloseEndHour ?? 14}
              onChange={(e) => setSettings((s) => ({
                ...s,
                salahOffWork: {
                  ...(s.salahOffWork || DEFAULT_SALAH_OFF_WORK),
                  fridayCloseEndHour: Number(e.target.value),
                },
              }))}
              inputProps={{ min: 1, max: 24 }}
              sx={{ width: 140 }}
              disabled={settings.salahOffWork?.fridayCloseEnabled === false}
            />
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ alignSelf: 'center' }}>
              {t('افتراضي: 11:00 → 14:00', 'ברירת מחדל: 11:00 → 14:00')}
            </Typography>
          </Stack>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 1.5 }}>
          <TextField
            type="date"
            size="small"
            label={t('معاينة يوم', 'תצוגת יום')}
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="outlined"
            startIcon={salahPreview.loading ? <CircularProgress size={14} /> : <Refresh />}
            disabled={salahPreview.loading}
            onClick={async () => {
              setSalahPreview((p) => ({ ...p, loading: true, error: '' }));
              try {
                clearPrayerMemoryCache();
                const timings = await getPrayerTimesForDate(
                  blockDate,
                  settings.salahOffWork || DEFAULT_SALAH_OFF_WORK,
                  { force: true }
                );
                const windows = buildSalahOffWindows(
                  blockDate,
                  timings,
                  settings.salahOffWork || DEFAULT_SALAH_OFF_WORK
                );
                setSalahPreview({ loading: false, windows, error: '' });
                setOk(t('تم تحديث أوقات الصلاة من الإنترنت', 'זמני תפילה עודכנו מהאינטרנט'));
              } catch (e) {
                setSalahPreview({
                  loading: false,
                  windows: [],
                  error: e.message || t('فشل جلب أوقات الصلاة', 'טעינת זמני תפילה נכשלה'),
                });
              }
            }}
            sx={{ fontWeight: 800 }}
          >
            {t('تحديث أوقات الصلاة الآن', 'עדכן זמני תפילה עכשיו')}
          </Button>
          <Button variant="contained" onClick={saveHours} disabled={savingHours} sx={{ fontWeight: 800 }}>
            {t('حفظ إعدادات الصلاة', 'שמירת הגדרות תפילה')}
          </Button>
        </Stack>

        {salahPreview.error && (
          <Alert severity="error" sx={{ mb: 1.5, textAlign: 'right' }}>{salahPreview.error}</Alert>
        )}
        {salahPreview.windows.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {salahPreview.windows.map((w) => (
              <Chip
                key={w.name}
                color="warning"
                variant="outlined"
                label={`${w.name} ${w.salahTime} · ${w.start.format('HH:mm')}–${w.end.format('HH:mm')}`}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>
        )}

        <Divider sx={{ my: 2.5 }} />

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <EventBusy color="warning" />
          <Typography fontWeight={900}>
            {t('إغلاق أيام وساعات عن الطلاب', 'חסימת ימים ושעות מתלמידים')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            'أغلق يوماً كاملاً أو ساعات محددة فقط — الساعات المغلقة لا تظهر في جدول الحجز.',
            'חסמו יום שלם או שעות ספציפיות — שעות חסומות לא יופיעו בלוח ההזמנות.'
          )}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
          <TextField
            type="date"
            label={t('اختر اليوم', 'בחרו יום')}
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />
          <Button
            variant="contained"
            color="warning"
            startIcon={<EventBusy />}
            onClick={addBlockedDate}
            disabled={savingHours || !blockDate}
            sx={{ fontWeight: 800 }}
          >
            {t('إغلاق اليوم كاملاً', 'חסימת היום במלואו')}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<AccessTime />}
            onClick={blockAllHoursOnDay}
            disabled={savingHours || !blockDate || (settings.blockedDates || []).includes(blockDate)}
            sx={{ fontWeight: 800 }}
          >
            {t('إغلاق كل الساعات', 'חסימת כל השעות')}
          </Button>
        </Stack>

        {/* One-off hours for this calendar date */}
        <Box
          sx={{
            mb: 2,
            p: 1.75,
            borderRadius: 2.5,
            bgcolor: 'rgba(26,155,142,0.06)',
            border: '1px solid rgba(26,155,142,0.22)',
          }}
        >
          <Typography fontWeight={800} sx={{ mb: 0.5 }}>
            {t(
              `ساعات عمل خاصة لـ ${blockDate || '—'}`,
              `שעות עבודה מיוחדות ל-${blockDate || '—'}`
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
            {t(
              'اختياري: غيّر ساعات هذا التاريخ فقط (لا يؤثر على باقي نفس يوم الأسبوع).',
              'אופציונלי: שנו שעות לתאריך זה בלבד (לא משפיע על שאר אותו יום בשבוע).'
            )}
            {(settings.dateHours || {})[blockDate]
              ? ` · ${t('مفعّل', 'פעיל')}`
              : ` · ${t('يستخدم ساعات يوم الأسبوع', 'משתמש בשעות יום השבוע')}`}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField
              size="small"
              label={t('من', 'מ-')}
              type="number"
              value={dateHoursDraft.startHour}
              onChange={(e) => setDateHoursDraft((d) => ({ ...d, startHour: Number(e.target.value) }))}
              inputProps={{ min: 0, max: 23 }}
              sx={{ width: 110 }}
            />
            <TextField
              size="small"
              label={t('إلى', 'עד')}
              type="number"
              value={dateHoursDraft.endHour}
              onChange={(e) => setDateHoursDraft((d) => ({ ...d, endHour: Number(e.target.value) }))}
              inputProps={{ min: 1, max: 24 }}
              sx={{ width: 110 }}
            />
            <Button
              variant="contained"
              color="success"
              onClick={saveDateHoursOverride}
              disabled={savingHours || !blockDate}
              sx={{ fontWeight: 800 }}
            >
              {t('حفظ لهذا اليوم', 'שמירה ליום זה')}
            </Button>
            {(settings.dateHours || {})[blockDate] && (
              <Button
                variant="outlined"
                onClick={clearDateHoursOverride}
                disabled={savingHours}
                sx={{ fontWeight: 800 }}
              >
                {t('إزالة التخصيص', 'הסרת התאמה')}
              </Button>
            )}
          </Stack>
        </Box>

        <Typography fontWeight={800} sx={{ mb: 1 }}>
          {t(
            `ساعات ${blockDate || '—'} (اضغط لإغلاق / فتح)`,
            `שעות ${blockDate || '—'} (לחיצה לסגירה / פתיחה)`
          )}
        </Typography>
        {(settings.blockedDates || []).includes(blockDate) ? (
          <Alert severity="warning" sx={{ mb: 2, textAlign: 'right' }}>
            {t(
              'هذا اليوم مغلق بالكامل. احذف الإغلاق من القائمة بالأسفل لفتح ساعات محددة.',
              'היום חסום במלואו. הסירו את החסימה מהרשימה למטה כדי לפתוח שעות.'
            )}
          </Alert>
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {slotChoices.map((time) => {
              const key = blockedSlotKey(blockDate, time);
              const closed = (settings.blockedSlots || []).includes(key);
              return (
                <Chip
                  key={time}
                  label={time}
                  clickable
                  color={closed ? 'warning' : 'default'}
                  variant={closed ? 'filled' : 'outlined'}
                  onClick={() => toggleBlockedHour(time)}
                  disabled={savingHours || !blockDate}
                  sx={{
                    fontWeight: 800,
                    minWidth: 72,
                    opacity: closed ? 1 : 0.85,
                  }}
                />
              );
            })}
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {t(
            'البرتقالي = مغلق عن الطلاب · الرمادي = متاح',
            'כתום = חסום מתלמידים · אפור = פנוי'
          )}
        </Typography>

        <Typography fontWeight={800} sx={{ mb: 1 }}>
          {t('أيام مغلقة بالكامل', 'ימים חסומים במלואם')}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {(settings.blockedDates || []).map((d) => (
            <Chip
              key={d}
              label={d}
              onDelete={() => removeBlockedDate(d)}
              color="warning"
              variant="outlined"
            />
          ))}
          {(settings.blockedDates || []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('لا توجد أيام مغلقة بالكامل', 'אין ימים חסומים במלואם')}
            </Typography>
          )}
        </Stack>

        <Typography fontWeight={800} sx={{ mb: 1 }}>
          {t('ساعات مغلقة (محددة)', 'שעות חסומות (ספציפיות)')}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {(settings.blockedSlots || []).map((key) => {
            const parsed = parseBlockedSlotKey(key);
            return (
              <Chip
                key={key}
                icon={<AccessTime sx={{ fontSize: 16 }} />}
                label={parsed ? `${parsed.date} · ${parsed.time}` : key}
                onDelete={() => removeBlockedSlot(key)}
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            );
          })}
          {(settings.blockedSlots || []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('لا توجد ساعات مغلقة محددة', 'אין שעות חסומות ספציפיות')}
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Add booking */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid rgba(26,107,181,0.15)' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <PersonAdd color="primary" />
          <Typography fontWeight={900}>
            {t('حجز ساعة لطالب محدد', 'הזמנת שעה לתלמיד ספציפי')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            'اختر الطالب بالاسم أو Gmail، ثم التاريخ والساعة — يُرسل إشعار واتساب/بريد للطالب.',
            'בחרו תלמיד לפי שם או Gmail ואז תאריך ושעה — נשלחת הודעת WhatsApp/אימייל לתלמיד.'
          )}
        </Typography>
        <Stack spacing={2}>
          <Autocomplete
            options={students}
            value={students.find((s) => s.id === addForm.studentId) || null}
            onChange={(_, v) => setAddForm((f) => ({ ...f, studentId: v?.id || '' }))}
            getOptionLabel={(s) => studentLabel(s)}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
            filterOptions={(opts, state) => {
              const q = String(state.inputValue || '').trim().toLowerCase();
              if (!q) return opts;
              return opts.filter((s) => studentLabel(s).toLowerCase().includes(q)
                || String(s.email || '').toLowerCase().includes(q)
                || String(s.phoneNumber || '').includes(q));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('اختر الطالب (اسم / Gmail)', 'בחרו תלמיד (שם / Gmail)')}
                placeholder={t('ابحث…', 'חיפוש…')}
              />
            )}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="date"
              label={t('التاريخ', 'תאריך')}
              value={addForm.date}
              onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label={t('الوقت', 'שעה')}
              value={addForm.time}
              onChange={(e) => setAddForm((f) => ({ ...f, time: e.target.value }))}
              fullWidth
            >
              {addFormSlotChoices.map((slot) => (
                <MenuItem key={slot} value={slot}>{slot}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t('المدة', 'משך')}
              value={addForm.duration}
              onChange={(e) => setAddForm((f) => ({ ...f, duration: Number(e.target.value) }))}
              sx={{ minWidth: 120 }}
            >
              {[1, 2].map((h) => (
                <MenuItem key={h} value={h}>{h} {t('ساعة', 'שעות')}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label={t('ملاحظة (اختياري)', 'הערה (רשות)')}
            value={addForm.note}
            onChange={(e) => setAddForm((f) => ({ ...f, note: e.target.value }))}
            fullWidth
          />
          <Button variant="contained" onClick={addOwnerBooking} sx={{ fontWeight: 900, alignSelf: 'flex-start' }}>
            {t('حفظ الحجز', 'שמירת ההזמנה')}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Notifications color="primary" />
          <Typography fontWeight={900}>
            {t('إشعار لطالب محدد', 'התראה לתלמיד מסוים')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            'اختر الطالب، اكتب الرسالة، ثم اضغط إرسال مرة واحدة. تصل داخل الموقع وعلى جهازه إذا سمح بالإشعارات.',
            'בחרו תלמיד, כתבו הודעה, ולחצו שליחה פעם אחת. מגיעה באתר ובמכשיר אם אישר התראות.'
          )}
        </Typography>
        <Stack spacing={1.5}>
          <Autocomplete
            options={students}
            value={smsStudent}
            onChange={(_e, value) => setSmsStudent(value)}
            getOptionLabel={studentLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('الطالب', 'התלמיד')}
                placeholder={t('اسم أو بريد', 'שם או אימייל')}
              />
            )}
          />
          {smsStudent && (
            <Typography variant="body2" fontWeight={700}>
              {smsStudent.email || smsStudent.phoneNumber || smsStudent.phone}
            </Typography>
          )}
          <TextField
            label={t('الرسالة', 'ההודעה')}
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            inputProps={{ maxLength: 480 }}
          />
          <Button
            variant="contained"
            startIcon={smsSending ? <CircularProgress size={16} color="inherit" /> : <Notifications />}
            disabled={smsSending || !smsStudent || !smsText.trim()}
            onClick={() => sendOneNotice(smsStudent?.id, smsText)}
            sx={{ fontWeight: 900, alignSelf: 'flex-start' }}
          >
            {t('إرسال', 'שליחה')}
          </Button>
        </Stack>
      </Paper>

      {/* Bookings search + pretty cards */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3.5,
          border: '1px solid rgba(26,107,181,0.14)',
          background:
            'radial-gradient(700px 280px at 100% 0%, rgba(26,107,181,0.08), transparent 55%), #fff',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Search color="primary" />
          <Typography fontWeight={900} sx={{ fontSize: '1.2rem' }}>
            {t('بحث عن حجز طالب', 'חיפוש הזמנת תלמיד')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            'اكتب اسم الطالب أو Gmail — تظهر حجوزاته فوراً.',
            'הקלידו שם או Gmail — ההזמנות יופיעו מיד.'
          )}
        </Typography>

        <TextField
          fullWidth
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('مثال: أحمد  أو  name@gmail.com', 'לדוגמה: אחמד או name@gmail.com')}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'primary.main' }} />
              </InputAdornment>
            ),
            endAdornment: filter ? (
              <InputAdornment position="end">
                <Button size="small" onClick={() => setFilter('')} sx={{ fontWeight: 800 }}>
                  {t('مسح', 'נקה')}
                </Button>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: 'rgba(238,244,248,0.7)',
              fontWeight: 700,
            },
          }}
        />

        {/* Day view — click a day to see all its bookings */}
        <Box
          sx={{
            mb: 2.5,
            p: 2,
            borderRadius: 3,
            bgcolor: dayView ? 'rgba(26,107,181,0.08)' : 'rgba(238,244,248,0.65)',
            border: '1px solid',
            borderColor: dayView ? 'primary.light' : 'rgba(26,107,181,0.12)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <CalendarMonth color="primary" />
            <Typography fontWeight={900}>
              {t('حجوزات يوم محدد', 'הזמנות ליום מסוים')}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t(
              'اختر تاريخاً أو اضغط على يوم أدناه لعرض كل الحجوزات في ذلك اليوم.',
              'בחרו תאריך או לחצו על יום למטה כדי לראות את כל ההזמנות באותו יום.'
            )}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 1.5 }}>
            <TextField
              type="date"
              label={t('التاريخ', 'תאריך')}
              value={dayView || dayjs().format('YYYY-MM-DD')}
              onChange={(e) => openDayView(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            <Button
              variant="contained"
              onClick={() => openDayView(dayView || dayjs().format('YYYY-MM-DD'))}
              sx={{ fontWeight: 900 }}
            >
              {t('عرض حجوزات اليوم', 'הצג הזמנות היום')}
            </Button>
            {dayView && (
              <Button variant="outlined" onClick={clearDayView} sx={{ fontWeight: 800 }}>
                {t('إلغاء فلتر اليوم', 'בטל סינון יום')}
              </Button>
            )}
          </Stack>

          {daysWithBookings.length > 0 && (
            <>
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('أيام فيها حجوزات — اضغط للعرض', 'ימים עם הזמנות — לחצו להצגה')}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {daysWithBookings.map((d) => {
                  const count = bookingsByDay.get(d)?.length || 0;
                  const active = dayView === d;
                  const isToday = d === dayjs().format('YYYY-MM-DD');
                  return (
                    <Chip
                      key={d}
                      clickable
                      color={active ? 'primary' : isToday ? 'success' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      label={`${d} · ${count}`}
                      onClick={() => (active ? clearDayView() : openDayView(d))}
                      sx={{ fontWeight: 800 }}
                    />
                  );
                })}
              </Stack>
            </>
          )}

          {dayView && (
            <Alert severity="info" sx={{ mt: 1.5, textAlign: 'right' }}>
              {t(
                `يوم ${dayView}: ${filteredBookings.length} حجز (مرتّبة حسب الساعة)`,
                `יום ${dayView}: ${filteredBookings.length} הזמנות (לפי שעה)`
              )}
            </Alert>
          )}
        </Box>

        {!dayView && (
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={timeFilter}
            onChange={(_, v) => v && setTimeFilter(v)}
            sx={{
              mb: 2.5,
              borderRadius: 2.5,
              overflow: 'hidden',
              border: '1px solid rgba(26,107,181,0.12)',
              '& .MuiToggleButton-root': {
                fontWeight: 800,
                textTransform: 'none',
                border: 0,
                py: 1,
              },
            }}
          >
            <ToggleButton value="upcoming">
              {t(`القادمة (${searchCounts.upcoming})`, `קרובים (${searchCounts.upcoming})`)}
            </ToggleButton>
            <ToggleButton value="past">
              {t(`السابقة (${searchCounts.past})`, `קודמים (${searchCounts.past})`)}
            </ToggleButton>
            <ToggleButton value="all">
              {t(`الكل (${searchCounts.all})`, `הכל (${searchCounts.all})`)}
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        <Typography fontWeight={800} color="text.secondary" sx={{ mb: 1.5 }}>
          {dayView
            ? t(
              `حجوزات ${dayView}: ${filteredBookings.length}`,
              `הזמנות ${dayView}: ${filteredBookings.length}`
            )
            : filter.trim()
              ? t(
                `نتائج البحث: ${filteredBookings.length}`,
                `תוצאות חיפוש: ${filteredBookings.length}`
              )
              : t(
                `عرض ${filteredBookings.length} حجز`,
                `מוצגות ${filteredBookings.length} הזמנות`
              )}
        </Typography>

        <Stack spacing={1.5}>
          {filteredBookings.map((b) => {
            const start = parseAppointmentStart(b);
            const dayKey = start ? start.format('YYYY-MM-DD') : '';
            const left = daysUntilExpiry(b);
            const isBlocked = b.source === 'owner_block'
              || String(b.title || '').includes('غير متاح')
              || String(b.title || '').includes('לא זמין');
            return (
              <Box
                key={b.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '88px 1fr' },
                  gap: 1.75,
                  p: 1.75,
                  borderRadius: 3,
                  bgcolor: '#fff',
                  border: '1px solid rgba(26,107,181,0.12)',
                  boxShadow: '0 8px 22px rgba(15, 50, 90, 0.06)',
                  transition: '0.15s ease',
                  '&:hover': {
                    boxShadow: '0 12px 28px rgba(15, 50, 90, 0.1)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Box
                  component="button"
                  type="button"
                  onClick={() => dayKey && openDayView(dayKey)}
                  title={t('عرض كل حجوزات هذا اليوم', 'הצג את כל ההזמנות ביום זה')}
                  sx={{
                    border: 0,
                    cursor: dayKey ? 'pointer' : 'default',
                    borderRadius: 2.5,
                    bgcolor: dayView && dayView === dayKey
                      ? 'rgba(26,107,181,0.22)'
                      : 'rgba(26,107,181,0.1)',
                    color: 'primary.dark',
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    py: 1.25,
                    font: 'inherit',
                    transition: '0.15s ease',
                    '&:hover': dayKey ? {
                      bgcolor: 'rgba(26,107,181,0.28)',
                    } : undefined,
                  }}
                >
                  <CalendarMonth sx={{ fontSize: 20, mb: 0.25, opacity: 0.85 }} />
                  <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', lineHeight: 1 }}>
                    {start ? start.format('D') : '—'}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.8rem' }}>
                    {start ? start.format('MMM') : ''}
                  </Typography>
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.25}
                    justifyContent="space-between"
                    alignItems={{ md: 'flex-start' }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography fontWeight={900} sx={{ fontSize: '1.05rem' }}>
                          {b.studentName || t('بدون اسم', 'ללא שם')}
                        </Typography>
                        <Chip
                          size="small"
                          label={isBlocked ? t('مغلق', 'חסום') : t('مؤكد', 'מאושר')}
                          color={isBlocked ? 'default' : 'success'}
                          sx={{ fontWeight: 800 }}
                        />
                      </Stack>

                      <Stack spacing={0.35} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" fontWeight={700} noWrap>
                            {b.studentEmail || '—'}
                          </Typography>
                        </Stack>
                        {b.studentPhone ? (
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={700}>
                              {b.studentPhone}
                            </Typography>
                          </Stack>
                        ) : null}
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <AccessTime sx={{ fontSize: 16, color: 'primary.main' }} />
                            <Typography fontWeight={800}>
                              {start ? start.format('HH:mm') : '—'}
                            </Typography>
                          </Stack>
                          <Typography color="text.secondary" fontWeight={700}>
                            {b.duration || b.hours || 1} {t('ساعة', 'שעות')}
                          </Typography>
                          {start && (
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                              {start.format('YYYY-MM-DD')}
                            </Typography>
                          )}
                          {left != null && left <= 14 && (
                            <Typography variant="caption" color="warning.dark" fontWeight={700}>
                              {t(`${left}ي للحذف`, `${left} ימים למחיקה`)}
                            </Typography>
                          )}
                        </Stack>
                        {b.note ? (
                          <Typography variant="caption" color="text.secondary">
                            {b.note}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <IconButton
                        color="success"
                        onClick={() => sendStudentReminderChannels(b, 'day_before')}
                        title={t('تذكير واتساب للطالب', 'תזכורת WhatsApp לתלמיד')}
                      >
                        <WhatsApp />
                      </IconButton>
                      <IconButton
                        color="primary"
                        disabled={smsBookingId === b.id}
                        onClick={() => {
                          const start2 = parseAppointmentStart(b);
                          const when = start2 ? start2.format('YYYY-MM-DD HH:mm') : (b.date || '');
                          const mins = start2 ? start2.diff(dayjs(), 'minute') : 99999;
                          const kind = mins > 0 && mins <= 180 ? 'hours3' : 'day_before';
                          const msg = buildStudentLectureReminderMessage({ ...b, date: when }, kind);
                          sendOneNotice(b.studentId, msg, b.id);
                        }}
                        title={t('إرسال إشعار لهذا الطالب', 'שליחת התראה לתלמיד זה')}
                      >
                        {smsBookingId === b.id
                          ? <CircularProgress size={18} />
                          : <Notifications />}
                      </IconButton>
                      <IconButton
                        color="info"
                        onClick={() => {
                          setReassignBooking(b);
                          setReassignStudent(students.find((s) => s.id === b.studentId) || null);
                        }}
                        title={t('تعيين لطالب آخر', 'העברה לתלמיד אחר')}
                      >
                        <SwapHoriz />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => deleteBooking(b.id)}
                        title={t('حذف — تعود الساعة للجدول', 'מחיקה — השעה חוזרת ללוח')}
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            );
          })}

          {filteredBookings.length === 0 && (
            <Box
              sx={{
                py: 5,
                px: 2,
                textAlign: 'center',
                borderRadius: 3,
                border: '1px dashed rgba(26,107,181,0.28)',
                bgcolor: 'rgba(238,244,248,0.5)',
              }}
            >
              <Person sx={{ fontSize: 40, color: 'primary.light', mb: 1 }} />
              <Typography fontWeight={900} sx={{ mb: 0.5 }}>
                {filter.trim()
                  ? t('لا نتائج لهذا الاسم / Gmail', 'אין תוצאות לשם / Gmail זה')
                  : t('لا توجد حجوزات', 'אין הזמנות')}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {filter.trim()
                  ? t('جرّب اسماً أو بريداً آخر', 'נסו שם או אימייל אחר')
                  : t('الحجوزات الجديدة ستظهر هنا', 'הזמנות חדשות יופיעו כאן')}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      <Dialog
        open={Boolean(reassignBooking)}
        onClose={() => { setReassignBooking(null); setReassignStudent(null); }}
        fullWidth
        maxWidth="sm"
        dir="rtl"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t('تعيين هذا الحجز لطالب محدد', 'שיוך הזמנה זו לתלמיד ספציפי')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 2 }}>
            {reassignBooking
              ? `${reassignBooking.studentName || '—'} · ${reassignBooking.date || ''}`
              : ''}
          </Typography>
          <Autocomplete
            options={students}
            value={reassignStudent}
            onChange={(_, v) => setReassignStudent(v)}
            getOptionLabel={(s) => studentLabel(s)}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('الطالب الجديد (اسم / Gmail)', 'תלמיד חדש (שם / Gmail)')}
              />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setReassignBooking(null); setReassignStudent(null); }} sx={{ fontWeight: 800 }}>
            {t('إلغاء', 'ביטול')}
          </Button>
          <Button variant="contained" onClick={confirmReassign} sx={{ fontWeight: 900 }}>
            {t('حفظ التعيين', 'שמירת השיוך')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
