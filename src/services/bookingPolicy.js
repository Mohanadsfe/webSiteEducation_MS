import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const BOOKING_TZ = 'Asia/Jerusalem';
export const LATE_CANCEL_LIMIT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function bookingDayStart(dateKey) {
  return dayjs.tz(`${dateKey} 00:00:00`, 'YYYY-MM-DD HH:mm:ss', BOOKING_TZ);
}

export function lessonStart(dateKey, startTime) {
  return dayjs.tz(`${dateKey} ${startTime}`, 'YYYY-MM-DD HH:mm', BOOKING_TZ);
}

/** A day can be booked only when that day starts at least 24 hours from now. */
export function canBookOnDay(dateKey, now = new Date()) {
  if (!dateKey) return false;
  const start = bookingDayStart(dateKey);
  if (!start.isValid()) return false;
  return start.valueOf() - dayjs(now).valueOf() >= DAY_MS;
}

/** Early cancel is only while more than 24 hours remain before the booking day. */
export function isEarlyCancel(start, now = new Date()) {
  if (!start || !start.isValid?.()) return false;
  const day = dayjs(start).tz(BOOKING_TZ).startOf('day');
  return day.valueOf() - dayjs(now).valueOf() > DAY_MS;
}

export function calendarLink(start, hours, title) {
  if (!start || !start.isValid?.()) return '';
  const begin = dayjs(start).utc();
  const end = dayjs(start).add(Number(hours) || 1, 'hour').utc();
  const stamp = (value) => value.format('YYYYMMDD[T]HHmmss[Z]');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'محاضرة — معهد المعرفة',
    dates: `${stamp(begin)}/${stamp(end)}`,
    details: 'معهد المعرفة — يمكن إضافة هذا الموعد إلى جدول الهاتف.',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

