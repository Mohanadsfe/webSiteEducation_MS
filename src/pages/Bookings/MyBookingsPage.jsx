import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, Box, Stack, Button, CircularProgress, Alert, ToggleButton, ToggleButtonGroup, IconButton
} from '@mui/material';
import {
  EventNote, ArrowBack, AccessTime, Person, Phone, Email, CalendarMonth, Add, Delete
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import dayjs from 'dayjs';
import { auth } from '../../services/FirebaseService';
import AppointmentsService, {
  BOOKING_RETENTION_DAYS,
  daysUntilExpiry,
  parseAppointmentStart,
} from '../../services/AppointmentsService';
import { isOwnerAdminEmail } from '../../constants/admin';
import { useLanguage } from '../../context/LanguageContext';
import UsersService from '../../services/UsersService';
import BookingCancelPolicy from '../../components/common/BookingCancelPolicy';

function statusMeta(status, t) {
  const s = String(status || '').toLowerCase();
  if (s === 'rejected' || s === 'cancelled' || s === 'canceled') {
    return {
      label: t('ملغى', 'בוטל'),
      color: '#b91c1c',
      bg: 'rgba(198, 40, 40, 0.12)',
    };
  }
  // Bookings are accepted immediately — no owner wait
  return {
    label: t('مؤكد', 'מאושר'),
    color: '#0f766e',
    bg: 'rgba(26, 155, 142, 0.14)',
  };
}

function BookingCard({ booking, isOwner, t, onDelete }) {
  const start = parseAppointmentStart(booking);
  const left = daysUntilExpiry(booking);
  const status = statusMeta(booking.status, t);
  const hours = booking.duration || booking.hours || 1;
  const isPast = start ? start.isBefore(dayjs()) : false;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '96px 1fr' },
        gap: { xs: 1.5, sm: 2 },
        p: { xs: 1.75, sm: 2 },
        borderRadius: 3,
        bgcolor: '#fff',
        border: '1px solid rgba(26,107,181,0.12)',
        boxShadow: '0 8px 24px rgba(15, 50, 90, 0.06)',
        opacity: isPast ? 0.78 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 28px rgba(15, 50, 90, 0.1)',
        },
      }}
    >
      <Box
        sx={{
          borderRadius: 2.5,
          bgcolor: isPast ? 'rgba(90,111,130,0.1)' : 'rgba(26,107,181,0.1)',
          color: isPast ? 'text.secondary' : 'primary.dark',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          py: { xs: 1.25, sm: 1.5 },
          px: 1,
          minHeight: { sm: '100%' },
        }}
      >
        <CalendarMonth sx={{ fontSize: 22, mb: 0.25, opacity: 0.85 }} />
        <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', lineHeight: 1 }}>
          {start ? start.format('D') : '—'}
        </Typography>
        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
          {start ? start.format('MMM') : ''}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>
          {start ? start.format('YYYY') : ''}
        </Typography>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Typography fontWeight={900} sx={{ fontSize: '1.05rem' }}>
            {booking.title || t('درس خاص', 'שיעור פרטי')}
          </Typography>
          <Box
            sx={{
              px: 1.1,
              py: 0.35,
              borderRadius: 999,
              bgcolor: status.bg,
              color: status.color,
              fontWeight: 800,
              fontSize: '0.78rem',
            }}
          >
            {status.label}
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <AccessTime sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography fontWeight={800}>
              {start ? start.format('HH:mm') : '—'}
            </Typography>
          </Stack>
          <Typography color="text.secondary" fontWeight={700}>
            {hours} {t('ساعة', 'שעות')}
          </Typography>
          {left != null && left <= 14 && (
            <Typography variant="caption" color="warning.dark" fontWeight={700}>
              {left > 0
                ? t(`يُحفظ ${left} يوماً`, `נשמר ${left} ימים`)
                : t('يُحذف قريباً', 'יימחק בקרוב')}
            </Typography>
          )}
        </Stack>

        {isOwner && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="flex-start"
            justifyContent="space-between"
            sx={{ mt: 1.25 }}
          >
            <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight={700}>
                  {booking.studentName || '—'}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" noWrap>
                  {booking.studentEmail || '—'}
                </Typography>
              </Stack>
              {booking.studentPhone ? (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {booking.studentPhone}
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
            {onDelete && (
              <IconButton
                color="error"
                size="small"
                onClick={() => onDelete(booking.id)}
                title={t('حذف فوري', 'מחיקה מיידית')}
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [filter, setFilter] = useState('upcoming');

  const deleteBookingNow = async (id) => {
    if (!window.confirm(t('حذف هذا الحجز فوراً؟', 'למחוק הזמנה זו מיד?'))) return;
    const prev = bookings;
    setBookings((list) => list.filter((b) => b.id !== id));
    try {
      await AppointmentsService.deleteBooking(id);
    } catch (e) {
      console.error(e);
      setBookings(prev);
      setError(e.message || t('فشل الحذف', 'המחיקה נכשלה'));
    }
  };

  const load = async (uid, owner) => {
    setLoading(true);
    setError('');
    try {
      let list;
      if (owner) {
        const all = await AppointmentsService.listAll();
        await AppointmentsService.purgeExpiredAppointments(all);
        list = await AppointmentsService.listAll();
      } else {
        list = await AppointmentsService.listForStudent(uid);
      }
      setBookings(
        list.slice().sort((a, b) => {
          const da = parseAppointmentStart(a)?.valueOf() || 0;
          const dbv = parseAppointmentStart(b)?.valueOf() || 0;
          return da - dbv;
        })
      );
    } catch (e) {
      console.error(e);
      setError(e.message || t('فشل تحميل الحجوزات', 'טעינת ההזמנות נכשלה'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      const profile = await UsersService.getUser(user.uid);
      const owner = isOwnerAdminEmail(user.email) || profile?.role === 'teacher';
      setIsOwner(owner);
      await load(user.uid, owner);
    });
    return unsub;
  }, [navigate]);

  const counts = useMemo(() => {
    const now = dayjs();
    let upcoming = 0;
    let past = 0;
    bookings.forEach((b) => {
      const start = parseAppointmentStart(b);
      if (start && start.isBefore(now)) past += 1;
      else upcoming += 1;
    });
    return { upcoming, past, all: bookings.length };
  }, [bookings]);

  const visible = useMemo(() => {
    const now = dayjs();
    if (filter === 'all') return [...bookings].reverse();
    if (filter === 'past') {
      return bookings
        .filter((b) => {
          const start = parseAppointmentStart(b);
          return start && start.isBefore(now);
        })
        .reverse();
    }
    return bookings.filter((b) => {
      const start = parseAppointmentStart(b);
      return !start || !start.isBefore(now);
    });
  }, [bookings, filter]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        direction: 'rtl',
        background:
          'radial-gradient(900px 420px at 100% -10%, rgba(26,107,181,0.14), transparent 55%), radial-gradient(700px 380px at 0% 100%, rgba(26,155,142,0.1), transparent 50%), linear-gradient(180deg, #eef4f8 0%, #f7fbff 40%, #ffffff 100%)',
        pb: 6,
      }}
    >
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2.5 }} flexWrap="wrap" useFlexGap>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ fontWeight: 800 }}
          >
            {t('العودة', 'חזרה')}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/')}
            sx={{ fontWeight: 900, borderRadius: 2 }}
          >
            {t('حجز جديد', 'הזמנה חדשה')}
          </Button>
          {isOwner && (
            <Button
              variant="outlined"
              onClick={() => navigate('/booking-manage')}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              {t('إدارة', 'ניהול')}
            </Button>
          )}
        </Stack>

        <Box sx={{ mb: 2.5 }}>
          <BookingCancelPolicy />
        </Box>

        <Box
          sx={{
            p: { xs: 2.25, sm: 3 },
            mb: 2.5,
            borderRadius: 3.5,
            color: '#fff',
            background: 'linear-gradient(120deg, #0b3d5c 0%, #1a6bb5 55%, #1a9b8e 100%)',
            boxShadow: '0 16px 40px rgba(11, 61, 92, 0.22)',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.18)',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              <EventNote />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.45rem', sm: '1.75rem' } }}>
                {isOwner
                  ? t('الحجوزات', 'ההזמנות')
                  : t('مواعيدي', 'התורים שלי')}
              </Typography>
              <Typography sx={{ opacity: 0.92, fontWeight: 600 }}>
                {t(
                  `${counts.upcoming} قادمة · ${counts.past} سابقة · تُحفظ ${BOOKING_RETENTION_DAYS} يوماً`,
                  `${counts.upcoming} קרובים · ${counts.past} קודמים · נשמרים ${BOOKING_RETENTION_DAYS} יום`
                )}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <ToggleButtonGroup
          exclusive
          fullWidth
          value={filter}
          onChange={(_, v) => v && setFilter(v)}
          sx={{
            mb: 2.5,
            bgcolor: '#fff',
            borderRadius: 2.5,
            border: '1px solid rgba(26,107,181,0.12)',
            overflow: 'hidden',
            '& .MuiToggleButton-root': {
              fontWeight: 800,
              py: 1.1,
              border: 0,
              textTransform: 'none',
            },
          }}
        >
          <ToggleButton value="upcoming">
            {t(`القادمة (${counts.upcoming})`, `קרובים (${counts.upcoming})`)}
          </ToggleButton>
          <ToggleButton value="past">
            {t(`السابقة (${counts.past})`, `קודמים (${counts.past})`)}
          </ToggleButton>
          <ToggleButton value="all">
            {t(`الكل (${counts.all})`, `הכל (${counts.all})`)}
          </ToggleButton>
        </ToggleButtonGroup>

        {error && (
          <Alert severity="error" sx={{ mb: 2, textAlign: 'right' }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : visible.length === 0 ? (
          <Box
            sx={{
              py: 6,
              px: 3,
              textAlign: 'center',
              borderRadius: 3.5,
              bgcolor: 'rgba(255,255,255,0.9)',
              border: '1px dashed rgba(26,107,181,0.28)',
            }}
          >
            <EventNote sx={{ fontSize: 42, color: 'primary.light', mb: 1 }} />
            <Typography fontWeight={900} sx={{ mb: 0.75, fontSize: '1.15rem' }}>
              {filter === 'upcoming'
                ? t('لا مواعيد قادمة', 'אין תורים קרובים')
                : filter === 'past'
                  ? t('لا مواعيد سابقة', 'אין תורים קודמים')
                  : t('لا حجوزات بعد', 'אין הזמנות עדיין')}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5 }}>
              {t('احجز ساعة من الصفحة الرئيسية بسهولة.', 'הזמינו שעה מדף הבית בקלות.')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/')}
              sx={{ fontWeight: 900, borderRadius: 2, px: 3 }}
            >
              {t('احجز الآن', 'הזמינו עכשיו')}
            </Button>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {visible.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                isOwner={isOwner}
                t={t}
                onDelete={isOwner ? deleteBookingNow : undefined}
              />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
