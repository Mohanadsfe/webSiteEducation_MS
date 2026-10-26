import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, AlertTitle, Button } from '@mui/material';
import { onAuthStateChanged } from 'firebase/auth';
import dayjs from 'dayjs';
import { auth } from '../../services/FirebaseService';
import AppointmentsService, {
  isAppointmentExpired,
  parseAppointmentStart,
} from '../../services/AppointmentsService';
import NotificationService from '../../services/NotificationService';
import { useLanguage } from '../../context/LanguageContext';

const LOCAL_KEY = 'ms_booking_reminders_sent';

function localSeen(bookingId, kind) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return Boolean(data[`${bookingId}_${kind}`]);
  } catch {
    return false;
  }
}

function markLocalSeen(bookingId, kind) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[`${bookingId}_${kind}`] = Date.now();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function isActiveBooking(appt) {
  if (isAppointmentExpired(appt)) return false;
  const s = String(appt.status || '').toLowerCase();
  if (s === 'rejected' || s === 'cancelled' || s === 'canceled' || s === 'revoked') return false;
  return true;
}

/**
 * On-site notice while the student has the site open.
 * The scheduled Cloud Function sends the same three reminders with no click:
 * about 36 hours before, about 30 hours before, and about 3 hours before.
 */
function reminderKind(appt, now) {
  const start = parseAppointmentStart(appt);
  if (!start) return null;
  const minutesLeft = start.diff(now, 'minute');
  if (minutesLeft <= 0) return null;
  if (minutesLeft <= 3 * 60) {
    if (appt.reminderHours5Sent || appt.reminderHours3Sent || localSeen(appt.id, 'hours3') || localSeen(appt.id, 'hours5')) {
      return null;
    }
    return 'hours3';
  }
  if (minutesLeft <= 30 * 60) {
    if (appt.reminderMorningSent || localSeen(appt.id, 'hours30')) return null;
    return 'hours30';
  }
  if (minutesLeft <= 36 * 60) {
    if (appt.reminderDayBeforeSent || localSeen(appt.id, 'hours36') || localSeen(appt.id, 'day_before')) {
      return null;
    }
    return 'hours36';
  }
  return null;
}

function pickReminder(list) {
  const now = dayjs();
  const hit = list.find((appt) => isActiveBooking(appt) && reminderKind(appt, now));
  if (!hit) return null;
  return { booking: hit, kind: reminderKind(hit, now) };
}

function showBrowserNotification(title, body) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification(title, { body, lang: 'ar' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') {
          // eslint-disable-next-line no-new
          new Notification(title, { body, lang: 'ar' });
        }
      });
    }
  } catch {
    /* ignore */
  }
}

export default function BookingReminder() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const run = async (uid) => {
      try {
        const list = await AppointmentsService.listForStudent(uid);
        if (cancelled) return;
        const hit = pickReminder(list);
        if (!hit) return;

        const { booking, kind } = hit;
        const start = parseAppointmentStart(booking);
        const when = start ? start.format('YYYY-MM-DD HH:mm') : (booking.date || '');

        const lead = kind === 'hours36' ? '٣٦' : kind === 'hours30' ? '٣٠' : '٣';
        const ttl = `تذكير — محاضرتك بعد حوالي ${lead} ساعة`;
        const msg = `مرحباً! محاضرتك ${when} (${booking.duration || booking.hours || 1} ساعة)، بعد حوالي ${lead} ساعة.\n\nمعهد المعرفة.`;

        markLocalSeen(booking.id, kind);
        try {
          await AppointmentsService.markReminderSent(booking.id, kind);
        } catch (e) {
          console.warn('Could not persist reminder flag', e);
        }

        try {
          await NotificationService.notifyStudentBookingReminder(
            {
              id: booking.id,
              studentName: booking.studentName,
              studentEmail: booking.studentEmail,
              studentPhone: booking.studentPhone,
              date: when,
              duration: booking.duration || booking.hours || 1,
            },
            kind
          );
        } catch (e) {
          console.warn('Reminder email failed', e);
        }

        showBrowserNotification(ttl, msg);
        if (!cancelled) {
          setTitle(ttl);
          setMessage(msg);
          setOpen(true);
        }
      } catch (e) {
        console.error('BookingReminder', e);
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (!user) {
        setOpen(false);
        return;
      }
      run(user.uid);
      timer = setInterval(() => run(user.uid), 3 * 60 * 1000);
    });

    return () => {
      cancelled = true;
      unsub();
      if (timer) clearInterval(timer);
    };
  }, [t]);

  return (
    <Snackbar
      open={open}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ direction: 'rtl', maxWidth: 560, width: '100%', px: 1, mt: 7 }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={() => setOpen(false)}
        sx={{
          width: '100%',
          alignItems: 'flex-start',
          bgcolor: '#0b3d5c',
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <AlertTitle sx={{ fontWeight: 900 }}>{title}</AlertTitle>
        <div style={{ whiteSpace: 'pre-line', fontWeight: 600, lineHeight: 1.7 }}>{message}</div>
        <Button color="inherit" size="small" onClick={() => setOpen(false)} sx={{ fontWeight: 800, mt: 1 }}>
          {t('حسناً', 'אישור')}
        </Button>
      </Alert>
    </Snackbar>
  );
}
