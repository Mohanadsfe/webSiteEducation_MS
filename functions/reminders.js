const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jerusalem';
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const CLOSED = new Set(['rejected', 'cancelled', 'canceled', 'revoked']);

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && typeof value._seconds === 'number') {
    return value._seconds * 1000;
  }
  const d = dayjs(value);
  return d.isValid() ? d.valueOf() : null;
}

/** Israeli mobiles stored as 05… become +9725… */
function toE164(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `972${digits.slice(1)}`;
  if (digits.length < 11 || digits.length > 15) return '';
  return `+${digits}`;
}

function parseStart(raw) {
  if (!raw) return null;
  if (typeof raw.toDate === 'function') return dayjs(raw.toDate()).tz(TZ);
  if (raw instanceof Date) return dayjs(raw).tz(TZ);
  if (typeof raw === 'object' && typeof raw._seconds === 'number') {
    return dayjs.unix(raw._seconds).tz(TZ);
  }
  const s = String(raw).trim();
  const formats = [
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DDTHH:mm',
    'YYYY-MM-DD HH:mm',
  ];
  for (const format of formats) {
    const d = dayjs.tz(s, format, TZ);
    if (d.isValid()) return d;
  }
  return null;
}

function isActive(appt, now) {
  const status = String(appt.status || '').toLowerCase();
  if (CLOSED.has(status)) return false;
  const expiresMs = toMillis(appt.expiresAt);
  if (expiresMs != null && now.valueOf() >= expiresMs) return false;
  const createdMs = toMillis(appt.createdAt);
  if (expiresMs == null && createdMs != null && now.valueOf() >= createdMs + RETENTION_MS) {
    return false;
  }
  return true;
}

const MINUTES_36H = 36 * 60;
const MINUTES_30H = 30 * 60;
const MINUTES_3H = 3 * 60;

function hoursLabel(hoursLeft) {
  if (hoursLeft <= 1) return 'ساعة واحدة';
  if (hoursLeft === 2) return 'ساعتين';
  return `${hoursLeft} ساعات`;
}

function reminderText(appt, start, minutesLeft) {
  const name = appt.studentName || 'طالبنا';
  const hours = appt.duration || appt.hours || 1;
  const hoursLeft = Math.max(1, Math.round(minutesLeft / 60));
  const cancelNote = minutesLeft > 24 * 60
    ? ' للإلغاء من الموقع: قبل 24 ساعة من الموعد.'
    : '';
  return (
    `مرحباً ${name}، تذكير من معهد المعرفة: `
    + `محاضرتك ${start.format('YYYY-MM-DD')} الساعة ${start.format('HH:mm')} (${hours} ساعة)، `
    + `بعد حوالي ${hoursLabel(hoursLeft)}.${cancelNote}`
  );
}

/**
 * Reminders that should go out now. The job runs every 15 minutes.
 * Each lesson is notified three times, once each:
 * - from 36 hours before, until the 30-hour reminder
 * - from 30 hours before, until the 3-hour reminder
 * - from 3 hours before, until the lesson starts
 * A lesson booked after a window has opened does not receive the earlier notices.
 */
function selectSmsJobs(appointments, nowInput) {
  const now = dayjs(nowInput).tz(TZ);
  const jobs = [];

  for (const appt of appointments) {
    if (!appt || !appt.id || !isActive(appt, now)) continue;
    const start = parseStart(appt.date)
      || (appt.dateKey && appt.startTime
        ? parseStart(`${appt.dateKey}T${appt.startTime}:00`)
        : null);
    if (!start) continue;
    const studentId = String(appt.studentId || '');
    if (!studentId) continue;

    const minutesLeft = start.diff(now, 'minute');
    if (minutesLeft <= 0) continue;

    const when = start.format('YYYY-MM-DD HH:mm');
    const body = reminderText(appt, start, minutesLeft);
    const base = { id: appt.id, studentId, when, body };

    if (
      minutesLeft <= MINUTES_36H
      && minutesLeft > MINUTES_30H
      && !appt.reminderHours36CloudSent
    ) {
      jobs.push({ ...base, kind: 'hours36' });
    } else if (
      minutesLeft <= MINUTES_30H
      && minutesLeft > MINUTES_3H
      && !appt.reminderHours30CloudSent
    ) {
      jobs.push({ ...base, kind: 'hours30' });
    } else if (minutesLeft <= MINUTES_3H && !appt.reminderHours3CloudSent) {
      jobs.push({ ...base, kind: 'hours3' });
    }
  }

  return jobs;
}

module.exports = {
  TZ,
  toE164,
  parseStart,
  selectSmsJobs,
};
