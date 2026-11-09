const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jerusalem';
const DAY_MS = 24 * 60 * 60 * 1000;
const LATE_CANCEL_LIMIT = 3;

function dayStart(start) {
  return dayjs(start).tz(TZ).startOf('day');
}

/** True while more than 24 hours remain before the calendar day of the lesson. */
function isEarlyCancel(start, nowInput) {
  const now = dayjs(nowInput).tz(TZ);
  return dayStart(start).valueOf() - now.valueOf() > DAY_MS;
}

function calendarLink(start, hours, title, details) {
  const begin = dayjs(start).utc();
  const end = dayjs(start).add(Number(hours) || 1, 'hour').utc();
  const stamp = (value) => value.format('YYYYMMDD[T]HHmmss[Z]');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'محاضرة — معهد المعرفة',
    dates: `${stamp(begin)}/${stamp(end)}`,
    details: details || 'معهد المعرفة',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

module.exports = {
  TZ,
  DAY_MS,
  LATE_CANCEL_LIMIT,
  isEarlyCancel,
  calendarLink,
};
