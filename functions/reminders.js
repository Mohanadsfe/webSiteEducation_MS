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

function dayBeforeText(appt, start) {
  const name = appt.studentName || 'طالبنا';
  const hours = appt.duration || appt.hours || 1;
  return (
    `مرحباً ${name}، تذكير من معهد المعرفة: `
    + `محاضرتك غداً ${start.format('YYYY-MM-DD')} الساعة ${start.format('HH:mm')} (${hours} ساعة). `
    + 'للإلغاء: قبل 24 ساعة من الموعد.'
  );
}

function hours3Text(appt, start, minutesLeft) {
  const name = appt.studentName || 'طالبنا';
  const hoursLeft = Math.max(1, Math.round(minutesLeft / 60));
  const leftLabel = hoursLeft === 1
    ? 'ساعة واحدة'
    : hoursLeft === 2
      ? 'ساعتين'
      : `${hoursLeft} ساعات`;
  return (
    `مرحباً ${name}، تذكير من معهد المعرفة: `
    + `محاضرتك اليوم الساعة ${start.format('HH:mm')} (بعد حوالي ${leftLabel}). `
    + 'نتمنى لك درساً موفقاً.'
  );
}

/**
 * SMS jobs that should go out now.
 * - Day before the lecture, from 08:00 Jerusalem time
 * - On the lecture day, once the start is within 3 hours
 * Each kind is sent once (flags on the booking).
 */
function selectSmsJobs(appointments, nowInput) {
  const now = dayjs(nowInput).tz(TZ);
  const tomorrow = now.add(1, 'day').format('YYYY-MM-DD');
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

    if (
      start.format('YYYY-MM-DD') === tomorrow
      && now.hour() >= 8
      && !appt.reminderDayBeforeCloudSent
    ) {
      jobs.push({
        id: appt.id,
        studentId,
        kind: 'day_before',
        when: start.format('YYYY-MM-DD HH:mm'),
        body: dayBeforeText(appt, start),
      });
    }

    if (minutesLeft <= 180 && !appt.reminderHours3CloudSent) {
      jobs.push({
        id: appt.id,
        studentId,
        kind: 'hours3',
        when: start.format('YYYY-MM-DD HH:mm'),
        body: hours3Text(appt, start, minutesLeft),
      });
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
