/**
 * Student identity watermark helpers for course video players.
 * Identity must come from the authenticated Firestore profile — never from free-form inputs.
 */

export const INSTITUTE_NAME = 'معهد المعرفة';

/** Positions inside the player; bottom ones sit above typical iframe controls. */
export const WATERMARK_POSITIONS = [
  { id: 'top-left', top: '7%', left: '3%', right: 'auto', bottom: 'auto', transform: 'none' },
  { id: 'top-right', top: '7%', right: '3%', left: 'auto', bottom: 'auto', transform: 'none' },
  { id: 'bottom-left', bottom: '14%', left: '3%', top: 'auto', right: 'auto', transform: 'none' },
  { id: 'bottom-right', bottom: '14%', right: '3%', top: 'auto', left: 'auto', transform: 'none' },
  { id: 'center', top: '48%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' },
];

/**
 * Build full name from Firestore user profile fields only.
 * @param {object|null} profile
 */
export function getProfileFullName(profile) {
  if (!profile || typeof profile !== 'object') return '';
  const composed = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  if (composed) return composed;
  if (typeof profile.fullName === 'string' && profile.fullName.trim()) return profile.fullName.trim();
  if (typeof profile.displayName === 'string' && profile.displayName.trim()) return profile.displayName.trim();
  return '';
}

/**
 * Phone from profile only (no invented placeholders).
 * @param {object|null} profile
 */
export function getProfilePhone(profile) {
  if (!profile || typeof profile !== 'object') return '';
  const raw = profile.phoneNumber || profile.phone || '';
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Format watermark text. Omits missing name/phone segments; never invents data.
 * Preferred: "Student: {fullName} | Phone: {phoneNumber} | معهد المعرفة"
 *
 * @param {{ fullName?: string, phoneNumber?: string }} identity
 * @returns {string}
 */
export function buildStudentWatermarkText(identity = {}) {
  const fullName = (identity.fullName || '').trim();
  const phoneNumber = (identity.phoneNumber || '').trim();
  const parts = [];
  if (fullName) parts.push(`Student: ${fullName}`);
  if (phoneNumber) parts.push(`Phone: ${phoneNumber}`);
  parts.push(INSTITUTE_NAME);
  return parts.join(' | ');
}

export function buildWatermarkTextFromProfile(profile) {
  return buildStudentWatermarkText({
    fullName: getProfileFullName(profile),
    phoneNumber: getProfilePhone(profile),
  });
}

/** Random delay between moves (ms), inclusive 8–15 seconds. */
export function nextWatermarkMoveDelayMs() {
  return 8000 + Math.floor(Math.random() * 7001);
}

/**
 * Pick a different position index than the current one when possible.
 * @param {number} currentIndex
 * @param {number} [count]
 */
export function nextWatermarkPositionIndex(currentIndex, count = WATERMARK_POSITIONS.length) {
  if (count <= 1) return 0;
  let next = currentIndex;
  let guard = 0;
  while (next === currentIndex && guard < 8) {
    next = Math.floor(Math.random() * count);
    guard += 1;
  }
  return next;
}
