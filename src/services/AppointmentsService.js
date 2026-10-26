import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import dayjs from 'dayjs';
import { db } from './FirebaseService';

export const BOOKING_RETENTION_DAYS = 90;

/** Statuses that still occupy a time slot */
const BLOCKING_STATUSES = new Set([
  'pending_owner',
  'awaiting',
  'awaiting_owner',
  'confirmed',
  'active',
  'paid',
  'approved',
]);

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && typeof value.seconds === 'number') return value.seconds * 1000;
  const d = dayjs(value);
  return d.isValid() ? d.valueOf() : null;
}

/** Booking kept until the lesson is over, then 90 days from createdAt (or expiresAt). */
export function isAppointmentExpired(appt, nowMs = Date.now()) {
  const lessonMs = toMillis(appt?.date)
    || (appt?.dateKey && appt?.startTime
      ? toMillis(`${appt.dateKey}T${appt.startTime}:00`)
      : null);
  // A lesson that has not started yet must stay on the schedule.
  if (lessonMs != null && lessonMs > nowMs) return false;

  const expiresMs = toMillis(appt?.expiresAt);
  if (expiresMs != null) return nowMs >= expiresMs;

  const createdMs = toMillis(appt?.createdAt);
  if (createdMs != null) {
    return nowMs >= createdMs + BOOKING_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  }

  if (lessonMs != null) {
    return nowMs >= lessonMs + BOOKING_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  }
  return false;
}

function cleanForFirestore(value) {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value;
  if (typeof value?.toMillis === 'function') return value;
  if (Array.isArray(value)) {
    return value.map(cleanForFirestore).filter((v) => v !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    Object.entries(value).forEach(([key, inner]) => {
      const cleaned = cleanForFirestore(inner);
      if (cleaned !== undefined) out[key] = cleaned;
    });
    return out;
  }
  return value;
}

export function bookingExpiresAt(fromDate = new Date()) {
  return dayjs(fromDate).add(BOOKING_RETENTION_DAYS, 'day').toDate();
}

export function daysUntilExpiry(appt) {
  const expiresMs = toMillis(appt?.expiresAt);
  if (expiresMs == null) {
    const createdMs = toMillis(appt?.createdAt);
    if (createdMs == null) return null;
    const left = createdMs + BOOKING_RETENTION_DAYS * 24 * 60 * 60 * 1000 - Date.now();
    return Math.ceil(left / (24 * 60 * 60 * 1000));
  }
  return Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000));
}

export function isBlockingAppointment(appt) {
  if (isAppointmentExpired(appt)) return false;
  const status = String(appt?.status || '').toLowerCase();
  if (!status) return true;
  if (
    status === 'revoked'
    || status === 'cancelled'
    || status === 'canceled'
    || status === 'rejected'
  ) {
    return false;
  }
  return (
    BLOCKING_STATUSES.has(status)
    || status.includes('pending')
    || status.includes('await')
  );
}

/** Student may cancel on the site only when the lecture is more than 24 hours away. */
export const STUDENT_CANCEL_LEAD_MS = 24 * 60 * 60 * 1000;

export function studentCanCancelBooking(appt, nowMs = Date.now()) {
  const start = parseAppointmentStart(appt);
  if (!start) return false;
  return start.valueOf() - nowMs > STUDENT_CANCEL_LEAD_MS;
}

function startAtFromPayload(payload) {
  const start = parseAppointmentStart(payload);
  return start ? start.toDate() : undefined;
}

export function parseAppointmentStart(appt) {
  const raw = appt?.date;
  if (raw) {
    if (typeof raw.toDate === 'function') {
      const d = dayjs(raw.toDate());
      if (d.isValid()) return d;
    } else if (raw instanceof Date || typeof raw === 'string' || typeof raw === 'number') {
      const d = dayjs(raw);
      if (d.isValid()) return d;
    } else if (typeof raw === 'object' && typeof raw.seconds === 'number') {
      const d = dayjs(raw.seconds * 1000);
      if (d.isValid()) return d;
    }
  }
  if (appt?.dateKey && appt?.startTime) {
    const d = dayjs(`${appt.dateKey}T${appt.startTime}:00`);
    if (d.isValid()) return d;
  }
  return null;
}

export function appointmentEnd(appt) {
  const start = parseAppointmentStart(appt);
  if (!start) return null;
  const hours = Number(appt.duration || appt.hours || 1) || 1;
  return start.add(hours, 'hour');
}

/** True if [start, start+duration) overlaps an existing blocking appointment */
export function slotConflicts(start, durationHours, appointments) {
  const s = dayjs(start);
  const e = s.add(durationHours, 'hour');
  return appointments.some((appt) => {
    if (!isBlockingAppointment(appt)) return false;
    const a = parseAppointmentStart(appt);
    const b = appointmentEnd(appt);
    if (!a || !b) return false;
    return s.isBefore(b) && e.isAfter(a);
  });
}

/** How many hours this student already has booked on a calendar day (blocking only) */
export function studentHoursOnDay(studentId, dayStr, appointments) {
  return appointments.reduce((sum, appt) => {
    if (appt.studentId !== studentId) return sum;
    if (!isBlockingAppointment(appt)) return sum;
    const start = parseAppointmentStart(appt);
    if (!start || start.format('YYYY-MM-DD') !== dayStr) return sum;
    return sum + (Number(appt.duration || appt.hours || 1) || 1);
  }, 0);
}

export class AppointmentsService {
  static async listAll() {
    const snap = await getDocs(collection(db, 'appointments'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /** Delete appointments past the 90-day retention (from DB). */
  static async purgeExpiredAppointments(list = null) {
    const appointments = list || (await this.listAll());
    const expired = appointments.filter((a) => isAppointmentExpired(a));
    let removed = 0;
    await Promise.all(
      expired.map(async (a) => {
        try {
          await deleteDoc(doc(db, 'appointments', a.id));
          removed += 1;
        } catch (e) {
          console.warn('Could not delete expired appointment', a.id, e);
        }
      })
    );
    return removed;
  }

  /** Live listener — all appointments (used to hide booked slots). Does not delete. */
  static subscribeAll(onData, onError) {
    return onSnapshot(
      collection(db, 'appointments'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => !isAppointmentExpired(a));
        onData(list);
      },
      onError
    );
  }

  static subscribeForStudent(studentId, onData, onError) {
    const q1 = query(
      collection(db, 'appointments'),
      where('studentId', '==', studentId)
    );
    return onSnapshot(
      q1,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => !isAppointmentExpired(a));
        onData(list);
      },
      onError
    );
  }

  static async listForStudent(studentId) {
    const q1 = query(
      collection(db, 'appointments'),
      where('studentId', '==', studentId)
    );
    const snap = await getDocs(q1);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    await this.purgeExpiredAppointments(list);
    return list.filter((a) => !isAppointmentExpired(a));
  }

  /** Student books — accepted immediately (no owner approval wait). */
  static async createPendingBooking(payload) {
    return this.createConfirmedBooking(payload);
  }

  static async createConfirmedBooking(payload) {
    const createdAt = new Date();
    const data = cleanForFirestore({
      ...payload,
      status: 'confirmed',
      paymentStatus: payload.paymentStatus || 'awaiting',
      confirmedAt: createdAt,
      createdAt,
      startAt: startAtFromPayload(payload),
      expiresAt: bookingExpiresAt(createdAt),
      retentionDays: BOOKING_RETENTION_DAYS,
    });
    const ref = await addDoc(collection(db, 'appointments'), data);
    return { id: ref.id, ...data };
  }

  /** Owner/teacher creates a booking for any student (or blocks a slot). */
  static async createOwnerBooking(payload) {
    const createdAt = new Date();
    const data = {
      ...payload,
      status: payload.status || 'confirmed',
      paymentStatus: payload.paymentStatus || 'owner_set',
      createdAt,
      startAt: startAtFromPayload(payload),
      expiresAt: bookingExpiresAt(createdAt),
      retentionDays: BOOKING_RETENTION_DAYS,
      bookedBy: payload.bookedBy || 'owner',
      source: payload.source || 'owner_manage',
    };
    if (!data.startAt) delete data.startAt;
    const ref = await addDoc(collection(db, 'appointments'), data);
    return { id: ref.id, ...data };
  }

  static async updateBooking(bookingId, data) {
    await updateDoc(doc(db, 'appointments', bookingId), {
      ...data,
      updatedAt: new Date(),
    });
  }

  static async markReminderSent(bookingId, kind) {
    let patch;
    if (kind === 'hours3' || kind === 'hours5') {
      // Same stored flag as the old 5-hour reminder (Firestore student rules allow it).
      patch = { reminderHours5Sent: true, reminderHours5SentAt: new Date() };
    } else if (kind === 'sms_hours3' || kind === 'sms_hours5') {
      patch = { reminderHours3SmsSent: true, reminderHours3SmsSentAt: new Date() };
    } else if (kind === 'sms_day_before') {
      patch = { reminderDayBeforeSmsSent: true, reminderDayBeforeSmsSentAt: new Date() };
    } else if (kind === 'morning') {
      // legacy morning-of flag
      patch = { reminderMorningSent: true, reminderMorningSentAt: new Date() };
    } else {
      patch = { reminderDayBeforeSent: true, reminderDayBeforeSentAt: new Date() };
    }
    await this.updateBooking(bookingId, patch);
  }

  /** Hard-delete from Firestore immediately (owner/teacher). */
  static async deleteBooking(bookingId) {
    if (!bookingId) throw new Error('missing booking id');
    await deleteDoc(doc(db, 'appointments', bookingId));
  }
}

export default AppointmentsService;
