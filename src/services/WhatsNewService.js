import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './FirebaseService';

const DOC_ID = 'whats_new';
const STORAGE_KEY = 'ms_whats_new_seen_at';
const MAX_ITEMS = 25;

/** How long a course stays marked "جديد" even after seen (ms) — 14 days */
export const NEW_BADGE_MS = 14 * 24 * 60 * 60 * 1000;

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : 0;
}

export function getSeenAt() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function markUpdatesSeen(at = Date.now()) {
  try {
    localStorage.setItem(STORAGE_KEY, String(at));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event('ms-whats-new-seen'));
  } catch {
    /* ignore */
  }
}

export function courseActivityMs(course) {
  return Math.max(
    toMillis(course?.contentUpdatedAt),
    toMillis(course?.updatedAt),
    toMillis(course?.createdAt),
    0
  );
}

/** True if course is newly added or recently updated with lessons */
export function isCourseNewish(course, now = Date.now()) {
  const ms = courseActivityMs(course);
  if (!ms) return false;
  return now - ms <= NEW_BADGE_MS;
}

export function isCourseUnseen(course, seenAt = getSeenAt()) {
  const ms = courseActivityMs(course);
  if (!ms) return false;
  return ms > seenAt;
}

export function countUnseenCourses(courses, seenAt = getSeenAt()) {
  return (courses || []).filter((c) => isCourseUnseen(c, seenAt)).length;
}

export class WhatsNewService {
  static async getFeed() {
    try {
      const snap = await getDoc(doc(db, 'site_settings', DOC_ID));
      if (!snap.exists()) return { items: [], latestAt: 0 };
      const data = snap.data() || {};
      const items = Array.isArray(data.items) ? data.items : [];
      return {
        items,
        latestAt: toMillis(data.latestAt) || (items[0] ? toMillis(items[0].at) : 0),
      };
    } catch (e) {
      console.warn('whats_new read failed', e);
      return { items: [], latestAt: 0 };
    }
  }

  /** Owner publishes a site update when adding a course or lesson */
  static async pushUpdate({ type, title, courseId, courseTitle }) {
    const at = new Date();
    const entry = {
      id: `${type}_${courseId || 'x'}_${at.getTime()}`,
      type: type === 'lesson' ? 'lesson' : 'course',
      title: String(title || '').trim() || (type === 'lesson' ? 'درس جديد' : 'دورة جديدة'),
      courseId: courseId || '',
      courseTitle: String(courseTitle || '').trim(),
      at,
    };

    try {
      const ref = doc(db, 'site_settings', DOC_ID);
      const snap = await getDoc(ref);
      const prev = snap.exists() ? (snap.data() || {}) : {};
      const prevItems = Array.isArray(prev.items) ? prev.items : [];
      const items = [entry, ...prevItems].slice(0, MAX_ITEMS);
      await setDoc(
        ref,
        {
          items,
          latestAt: at,
          updatedAt: at,
        },
        { merge: true }
      );
      return entry;
    } catch (e) {
      console.warn('whats_new push failed', e);
      return entry;
    }
  }

  static countUnseenFeed(feed, seenAt = getSeenAt()) {
    const items = feed?.items || [];
    return items.filter((it) => toMillis(it.at) > seenAt).length;
  }
}

export default WhatsNewService;
