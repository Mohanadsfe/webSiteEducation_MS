import { doc, getDoc, setDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { db } from './FirebaseService';
import {
  DEFAULT_SALAH_OFF_WORK,
  normalizeSalahConfig,
  isFridayJumuahClosedHour,
} from './PrayerTimesService';

export const BOOKING_SETTINGS_ID = 'booking_hours';

export const DEFAULT_BOOKING_SETTINGS = {
  startHour: 9,
  endHour: 21,
  /** ~3 months open for student booking */
  daysAhead: 90,
  maxHoursPerDay: 2,
  /** 0=Sunday … 6=Saturday */
  workDays: [0, 1, 2, 3, 4, 5, 6],
  /**
   * Per-weekday hours (may differ each day).
   * Keys "0"…"6" → { startHour, endHour }
   * Missing key → use global startHour/endHour.
   */
  dayHours: {},
  /**
   * One-off calendar-date hours: "YYYY-MM-DD" → { startHour, endHour }
   * Overrides weekday + global for that date only.
   */
  dateHours: {},
  /** Full calendar days closed for students: YYYY-MM-DD */
  blockedDates: [],
  /** Specific hours closed: YYYY-MM-DD|HH:00 */
  blockedSlots: [],
  /** Islamic salah off-work windows (auto from internet) */
  salahOffWork: { ...DEFAULT_SALAH_OFF_WORK },
  noteAr: '',
  noteHe: '',
};

function clampRange(startRaw, endRaw, fallbackStart, fallbackEnd) {
  let startHour = Math.min(23, Math.max(0, Number(startRaw ?? fallbackStart)));
  let endHour = Math.min(24, Math.max(1, Number(endRaw ?? fallbackEnd)));
  if (endHour <= startHour) endHour = Math.min(24, startHour + 1);
  return { startHour, endHour };
}

function normalizeHourMap(raw, keyFilter) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  Object.keys(raw).forEach((key) => {
    if (keyFilter && !keyFilter(key)) return;
    const entry = raw[key];
    if (!entry || typeof entry !== 'object') return;
    out[key] = clampRange(entry.startHour, entry.endHour, 9, 21);
  });
  return out;
}

/** Build key for a single blocked hour */
export function blockedSlotKey(dateStr, timeStr) {
  const date = String(dateStr || '').trim().slice(0, 10);
  const time = String(timeStr || '').trim().slice(0, 5);
  if (!date || !time) return '';
  return `${date}|${time}`;
}

export function parseBlockedSlotKey(key) {
  const [date, time] = String(key || '').split('|');
  if (!date || !time) return null;
  return { date, time };
}

function normalizeBlockedSlots(raw) {
  if (!Array.isArray(raw)) return [];
  const keys = raw
    .map((item) => {
      if (typeof item === 'string') {
        if (item.includes('|')) return blockedSlotKey(...item.split('|'));
        return '';
      }
      if (item && typeof item === 'object') {
        return blockedSlotKey(item.date, item.time || item.hour);
      }
      return '';
    })
    .filter(Boolean);
  return [...new Set(keys)].sort();
}

function normalize(raw = {}) {
  const { startHour, endHour } = clampRange(
    raw.startHour,
    raw.endHour,
    DEFAULT_BOOKING_SETTINGS.startHour,
    DEFAULT_BOOKING_SETTINGS.endHour
  );

  const workDays = Array.isArray(raw.workDays)
    ? [...new Set(raw.workDays.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6))]
    : [...DEFAULT_BOOKING_SETTINGS.workDays];

  const blockedDates = Array.isArray(raw.blockedDates)
    ? [...new Set(raw.blockedDates.map((d) => String(d).trim()).filter(Boolean))]
    : [];

  // Seed dayHours from existing work days if empty (so owner sees editable rows)
  let dayHours = normalizeHourMap(
    raw.dayHours,
    (k) => /^\d$/.test(k) && Number(k) >= 0 && Number(k) <= 6
  );

  // If no per-day config yet, initialize from global defaults for enabled work days
  if (!Object.keys(dayHours).length && workDays.length) {
    workDays.forEach((d) => {
      dayHours[String(d)] = { startHour, endHour };
    });
  }

  const dateHours = normalizeHourMap(
    raw.dateHours,
    (k) => /^\d{4}-\d{2}-\d{2}$/.test(k)
  );

  return {
    startHour,
    endHour,
    daysAhead: Math.min(120, Math.max(1, Number(raw.daysAhead ?? DEFAULT_BOOKING_SETTINGS.daysAhead))),
    maxHoursPerDay: Math.min(2, Math.max(1, Number(raw.maxHoursPerDay ?? DEFAULT_BOOKING_SETTINGS.maxHoursPerDay))),
    workDays: workDays.length ? workDays : [...DEFAULT_BOOKING_SETTINGS.workDays],
    dayHours,
    dateHours,
    blockedDates,
    blockedSlots: normalizeBlockedSlots(raw.blockedSlots),
    salahOffWork: normalizeSalahConfig(raw.salahOffWork || DEFAULT_SALAH_OFF_WORK),
    noteAr: raw.noteAr || '',
    noteHe: raw.noteHe || '',
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * Resolve work hours for a calendar date.
 * Priority: dateHours (one-off) → dayHours[weekday] → global start/end
 */
export function getHoursForDate(settings, dateStr) {
  const s = normalize(settings);
  const date = String(dateStr || '').slice(0, 10);
  const d = dayjs(date);
  if (!d.isValid()) {
    return { startHour: s.startHour, endHour: s.endHour, source: 'default' };
  }

  if (s.dateHours && s.dateHours[date]) {
    return { ...s.dateHours[date], source: 'date' };
  }

  const weekday = String(d.day());
  if (s.dayHours && s.dayHours[weekday]) {
    return { ...s.dayHours[weekday], source: 'weekday' };
  }

  return { startHour: s.startHour, endHour: s.endHour, source: 'default' };
}

/** Slot start hours for a day (or global default if no date). */
export function buildSlotStartHours(settings, dateStr = null) {
  const range = dateStr
    ? getHoursForDate(settings, dateStr)
    : (() => {
      const s = normalize(settings);
      return { startHour: s.startHour, endHour: s.endHour };
    })();

  const hours = [];
  for (let h = range.startHour; h < range.endHour; h += 1) hours.push(h);
  return hours;
}

/** True if this hour must stay hidden from students */
export function isHourBlockedForStudents(settings, dateStr, timeStr) {
  const s = normalize(settings);
  const date = String(dateStr || '').slice(0, 10);
  const time = String(timeStr || '').slice(0, 5);
  if (!date || !time) return false;
  if ((s.blockedDates || []).includes(date)) return true;
  if ((s.blockedSlots || []).includes(blockedSlotKey(date, time))) return true;
  const hour = Number(String(time).split(':')[0]);
  if (isFridayJumuahClosedHour(date, hour, s.salahOffWork)) return true;
  return false;
}

export class BookingSettingsService {
  static async getSettings() {
    try {
      const snap = await getDoc(doc(db, 'site_settings', BOOKING_SETTINGS_ID));
      if (!snap.exists()) return { ...DEFAULT_BOOKING_SETTINGS };
      return normalize(snap.data());
    } catch (e) {
      console.warn('booking settings read failed', e);
      return { ...DEFAULT_BOOKING_SETTINGS };
    }
  }

  static async saveSettings(partial, updatedBy = '') {
    const current = await this.getSettings();
    const next = normalize({ ...current, ...partial });
    await setDoc(
      doc(db, 'site_settings', BOOKING_SETTINGS_ID),
      {
        ...next,
        updatedAt: new Date(),
        updatedBy: updatedBy || null,
      },
      { merge: true }
    );
    return next;
  }
}

export default BookingSettingsService;
