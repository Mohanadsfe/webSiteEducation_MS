import dayjs from 'dayjs';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './FirebaseService';

const CACHE_DOC_ID = 'prayer_times_cache';
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export const DEFAULT_SALAH_OFF_WORK = {
  enabled: true,
  city: 'Nazareth',
  country: 'Israel',
  /** Muslim World League — common for region */
  method: 3,
  minutesBefore: 5,
  minutesAfter: 10,
  prayers: [...PRAYER_NAMES],
  /**
   * Friday (Jumu'ah): fully close these hours — no booking at all.
   * endHour is exclusive (11→14 closes 11:00, 12:00, 13:00).
   */
  fridayCloseEnabled: true,
  fridayCloseStartHour: 11,
  fridayCloseEndHour: 14,
};

/** In-memory month cache: key = `${year}-${month}|city|country|method` */
const memoryCache = new Map();

function cacheKey(year, month, cfg) {
  return `${year}-${String(month).padStart(2, '0')}|${cfg.city}|${cfg.country}|${cfg.method}`;
}

function parseHm(hm) {
  // Aladhan returns "HH:mm" or sometimes with timezone suffix
  const m = String(hm || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

function normalizeSalahConfig(raw = {}) {
  const base = { ...DEFAULT_SALAH_OFF_WORK, ...raw };
  const prayers = Array.isArray(raw.prayers) && raw.prayers.length
    ? raw.prayers.filter((p) => PRAYER_NAMES.includes(p))
    : [...PRAYER_NAMES];
  let fridayCloseStartHour = Math.min(23, Math.max(0, Number(
    base.fridayCloseStartHour ?? DEFAULT_SALAH_OFF_WORK.fridayCloseStartHour
  )));
  let fridayCloseEndHour = Math.min(24, Math.max(1, Number(
    base.fridayCloseEndHour ?? DEFAULT_SALAH_OFF_WORK.fridayCloseEndHour
  )));
  if (fridayCloseEndHour <= fridayCloseStartHour) {
    fridayCloseEndHour = Math.min(24, fridayCloseStartHour + 1);
  }

  return {
    enabled: raw.enabled !== false,
    city: String(base.city || DEFAULT_SALAH_OFF_WORK.city).trim() || DEFAULT_SALAH_OFF_WORK.city,
    country: String(base.country || DEFAULT_SALAH_OFF_WORK.country).trim() || DEFAULT_SALAH_OFF_WORK.country,
    method: Math.min(15, Math.max(0, Number(base.method ?? 3))),
    minutesBefore: Math.min(60, Math.max(0, Number(base.minutesBefore ?? 5))),
    minutesAfter: Math.min(60, Math.max(0, Number(base.minutesAfter ?? 10))),
    prayers: prayers.length ? prayers : [...PRAYER_NAMES],
    fridayCloseEnabled: raw.fridayCloseEnabled !== false,
    fridayCloseStartHour,
    fridayCloseEndHour,
  };
}

/** Friday = day() 5. Hours [start, end) fully closed for Jumu'ah. */
export function isFridayJumuahClosedHour(dateStr, hour, salahConfig) {
  const cfg = normalizeSalahConfig(salahConfig || {});
  if (!cfg.enabled || cfg.fridayCloseEnabled === false) return false;
  const d = dayjs(String(dateStr || '').slice(0, 10));
  if (!d.isValid() || d.day() !== 5) return false; // 5 = Friday
  const h = Number(hour);
  if (!Number.isFinite(h)) return false;
  return h >= cfg.fridayCloseStartHour && h < cfg.fridayCloseEndHour;
}

/** True if any hour in [startHour, startHour+duration) is Friday-closed */
export function slotHitsFridayJumuahClose(dateStr, startHour, durationHours, salahConfig) {
  const dur = Number(durationHours) || 1;
  for (let h = Number(startHour); h < Number(startHour) + dur; h += 1) {
    if (isFridayJumuahClosedHour(dateStr, h, salahConfig)) return true;
  }
  return false;
}

async function readFirestoreMonth(key) {
  try {
    const snap = await getDoc(doc(db, 'site_settings', CACHE_DOC_ID));
    if (!snap.exists()) return null;
    const months = snap.data()?.months || {};
    const entry = months[key];
    if (!entry?.days || !entry?.fetchedAt) return null;
    // Refresh if older than 36 hours (times update / method tweaks)
    const age = Date.now() - (typeof entry.fetchedAt?.toMillis === 'function'
      ? entry.fetchedAt.toMillis()
      : Number(entry.fetchedAt) || 0);
    if (age > 36 * 60 * 60 * 1000) return null;
    return entry.days;
  } catch {
    return null;
  }
}

async function writeFirestoreMonth(key, days) {
  try {
    const ref = doc(db, 'site_settings', CACHE_DOC_ID);
    const snap = await getDoc(ref);
    const prev = snap.exists() ? (snap.data() || {}) : {};
    const months = { ...(prev.months || {}) };
    // Keep cache lean — drop months older than ~4 months
    const cutoff = dayjs().subtract(1, 'month').format('YYYY-MM');
    Object.keys(months).forEach((k) => {
      const ym = k.split('|')[0];
      if (ym && ym < cutoff) delete months[k];
    });
    months[key] = { days, fetchedAt: new Date() };
    await setDoc(ref, { ...prev, months, updatedAt: new Date() }, { merge: true });
  } catch (e) {
    console.warn('prayer cache write failed', e);
  }
}

/**
 * Fetch a full month of prayer times from Aladhan (internet).
 * Auto-cached in memory + Firestore; refreshes when stale or config changes.
 */
export function clearPrayerMemoryCache() {
  memoryCache.clear();
}

export async function fetchMonthPrayerTimes(year, month, salahConfig, { force = false } = {}) {
  const cfg = normalizeSalahConfig(salahConfig);
  const key = cacheKey(year, month, cfg);

  if (!force && memoryCache.has(key)) return memoryCache.get(key);

  if (!force) {
    const fromFs = await readFirestoreMonth(key);
    if (fromFs) {
      memoryCache.set(key, fromFs);
      return fromFs;
    }
  } else {
    memoryCache.delete(key);
  }

  const url =
    `https://api.aladhan.com/v1/calendarByCity/${year}/${month}`
    + `?city=${encodeURIComponent(cfg.city)}`
    + `&country=${encodeURIComponent(cfg.country)}`
    + `&method=${cfg.method}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Prayer API ${res.status}`);
  const json = await res.json();
  const rows = Array.isArray(json?.data) ? json.data : [];

  const days = {};
  rows.forEach((row) => {
    const dateStr = row?.date?.gregorian?.date; // DD-MM-YYYY
    if (!dateStr) return;
    const [dd, mm, yyyy] = dateStr.split('-');
    const iso = `${yyyy}-${mm}-${dd}`;
    const timings = row.timings || {};
    const clean = {};
    PRAYER_NAMES.forEach((name) => {
      const parsed = parseHm(timings[name]);
      if (parsed) {
        clean[name] = `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
      }
    });
    days[iso] = clean;
  });

  memoryCache.set(key, days);
  writeFirestoreMonth(key, days); // fire-and-forget
  return days;
}

export async function getPrayerTimesForDate(dateStr, salahConfig, opts = {}) {
  const d = dayjs(String(dateStr).slice(0, 10));
  if (!d.isValid()) return null;
  const days = await fetchMonthPrayerTimes(d.year(), d.month() + 1, salahConfig, opts);
  return days[d.format('YYYY-MM-DD')] || null;
}

/**
 * Off-work windows: [salah - minutesBefore, salah + minutesAfter]
 */
export function buildSalahOffWindows(dateStr, timings, salahConfig) {
  const cfg = normalizeSalahConfig(salahConfig);
  if (!cfg.enabled || !timings) return [];
  const date = String(dateStr).slice(0, 10);
  const windows = [];

  (cfg.prayers || PRAYER_NAMES).forEach((name) => {
    const hm = timings[name];
    const parsed = parseHm(hm);
    if (!parsed) return;
    const salah = dayjs(`${date}T${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}:00`);
    if (!salah.isValid()) return;
    windows.push({
      name,
      salahTime: salah.format('HH:mm'),
      start: salah.subtract(cfg.minutesBefore, 'minute'),
      end: salah.add(cfg.minutesAfter, 'minute'),
    });
  });

  return windows;
}

/** True if [slotStart, slotStart+durationHours) overlaps any salah off-work window */
export function slotOverlapsSalahOff(slotStart, durationHours, windows) {
  if (!windows?.length) return false;
  const s = dayjs(slotStart);
  const e = s.add(Number(durationHours) || 1, 'hour');
  return windows.some((w) => s.isBefore(w.end) && e.isAfter(w.start));
}

/**
 * Prefetch current + next month so schedule stays updated automatically.
 */
export async function ensurePrayerTimesFresh(salahConfig, aroundDate = dayjs()) {
  const cfg = normalizeSalahConfig(salahConfig);
  if (!cfg.enabled) return;
  const d = dayjs(aroundDate);
  await fetchMonthPrayerTimes(d.year(), d.month() + 1, cfg);
  const next = d.add(1, 'month');
  if (next.month() !== d.month() || next.year() !== d.year()) {
    await fetchMonthPrayerTimes(next.year(), next.month() + 1, cfg);
  }
}

export { normalizeSalahConfig, PRAYER_NAMES };

export default {
  fetchMonthPrayerTimes,
  getPrayerTimesForDate,
  buildSalahOffWindows,
  slotOverlapsSalahOff,
  ensurePrayerTimesFresh,
  normalizeSalahConfig,
  isFridayJumuahClosedHour,
  slotHitsFridayJumuahClose,
  DEFAULT_SALAH_OFF_WORK,
  PRAYER_NAMES,
};
