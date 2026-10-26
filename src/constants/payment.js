/**
 * Payment / owner contact settings.
 * Fill VISA_* fields when you have a real Israeli card gateway (PayPlus / Cardcom / Stripe).
 */
export const OWNER_PHONE_DISPLAY = '054-801-0225';
export const OWNER_PHONE_DIGITS = '0548010225';
export const OWNER_WHATSAPP = '972548010225'; // wa.me format, no +

/**
 * Visa / credit-card online checkout
 * Leave empty until you get merchant credentials — the UI will offer WhatsApp for a payment link.
 *
 * What to send the developer to connect Visa:
 * - Provider name: PayPlus | Cardcom | Tranzila | Meshulam/Grow | Stripe
 * - Public/publishable key or payment-page URL
 * - Terminal / merchant / page ID
 * - (Secret keys go only in a server/Cloud Function — never in this frontend file)
 */
export const VISA_PAYMENT_PAGE_URL = ''; // e.g. 'https://payments.payplus.co.il/...'
export const VISA_PROVIDER_NAME = ''; // e.g. 'PayPlus'

export function buildWhatsAppUrl(message) {
  return `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/** Digits only for wa.me — keep leading country code when possible */
export function normalizePhoneForWhatsApp(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length >= 9) {
    digits = `972${digits.slice(1)}`;
  }
  return digits;
}

/** WhatsApp chat to a student (or any) phone with prefilled text */
export function buildWhatsAppToPhone(phone, message) {
  const to = normalizePhoneForWhatsApp(phone);
  if (!to) {
    return `https://wa.me/?text=${encodeURIComponent(message || '')}`;
  }
  return `https://wa.me/${to}?text=${encodeURIComponent(message || '')}`;
}

/** SMS compose link (works on mobile) */
export function buildSmsUrl(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  const body = encodeURIComponent(message || '');
  if (digits) return `sms:${digits}?&body=${body}`;
  return `sms:?&body=${body}`;
}

/** Arabic reminder texts for student lecture */
export function buildStudentLectureReminderMessage(booking, kind = 'day_before') {
  const name = booking?.studentName || 'طالبنا العزيز';
  const when = booking?.date || '—';
  const hours = booking?.duration || booking?.hours || 1;
  if (kind === 'hours3' || kind === 'hours5') {
    return (
      `مرحباً ${name} 👋\n\n`
      + `تذكير: محاضرتك اليوم بعد حوالي ٣ ساعات.\n`
      + `📅 الموعد: ${when}\n`
      + `⏰ المدة: ${hours} ساعة\n\n`
      + `نتمنى لك درساً موفقاً — معهد المعرفة.\n\n`
      + `ملاحظة: لإلغاء المحاضرة يُرجى الإلغاء قبل ٢٤ ساعة من الموعد، وإلا يبقى الحجز محتسباً.`
    );
  }
  return (
    `مرحباً ${name} 👋\n\n`
    + `تذكير: لديك محاضرة غداً.\n`
    + `📅 الموعد: ${when}\n`
    + `⏰ المدة: ${hours} ساعة\n\n`
    + `حضّر نفسك — معهد المعرفة.\n\n`
    + `ملاحظة: لإلغاء المحاضرة يُرجى الإلغاء قبل ٢٤ ساعة من الموعد، وإلا يبقى الحجز محتسباً.`
  );
}

export function buildPurchaseContextMessage(item) {
  if (!item) return '';
  const lines = [];
  if (item.title) lines.push(`📌 ${item.title}`);
  if (item.hours) lines.push(`⏰ ${item.hours} שעות / ساعات`);
  if (item.price != null && item.price !== '') lines.push(`💰 ₪${item.price}`);
  if (item.category) {
    const catMap = {
      exam: 'محاضرات امتحانات / הרצאות לבחינות',
      bagrut: 'בגרות / مدرسة',
      academic: 'أكاديمي / אקדמי',
      tutoring: 'دروس خصوصية / שיעורים פרטיים',
    };
    lines.push(`📖 ${catMap[item.category] || String(item.category)}`);
  }
  return lines.join('\n');
}
