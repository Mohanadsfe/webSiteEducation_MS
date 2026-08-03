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
