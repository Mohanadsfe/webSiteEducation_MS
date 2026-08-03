/**
 * Bundle purchase terms — placeholder until the owner uploads the official document.
 * When ready: put a PDF/Drive link in Firestore `site_settings/terms` → field `termsDocUrl`
 * or set TERMS_DOC_URL below.
 */
export const TERMS_DOC_URL = ''; // e.g. 'https://drive.google.com/file/d/.../view'

export const PLACEHOLDER_TERMS = {
  titleAr: 'شروط وأحكام شراء الرزمات',
  titleHe: 'תנאי רכישת החבילות',
  noticeAr:
    'هذه نسخة مؤقتة. صاحب المنصة سيرفع المستند الرسمي لاحقاً. يجب قراءتها والموافقة عليها قبل الدفع.',
  noticeHe:
    'זו גרסה זמנית. בעל הפלטפורמה יעלה את המסמך הרשמי בהמשך. חובה לקרוא ולהסכים לפני התשלום.',
  sections: [
    {
      titleAr: 'الدفع والاسترداد',
      titleHe: 'תשלום והחזרים',
      bodyAr:
        '• الدفع مقدّماً حسب الاتفاق بعد أول درس أو حسب ما يحدده المعلّم.\n• بعد إتمام الدفع لا يمكن استرداد المبلغ.\n• الساعات تُحفظ لاستخدام الطالب حسب الاتفاق.',
      bodyHe:
        '• התשלום מראש לפי ההסכמה.\n• לאחר התשלום אין החזר כספי.\n• השעות נשמרות לשימוש התלמיד לפי ההסכמה.',
    },
    {
      titleAr: 'الخصم والعروض',
      titleHe: 'הנחות ומבצעים',
      bodyAr:
        '• الأسعار والخصومات المعروضة على صفحة الرزمات هي المعتمدة وقت الشراء.\n• الخصم لا يُجمع مع عروض أخرى إلا إذا وافق المعلّم كتابياً.',
      bodyHe:
        '• המחירים וההנחות בעמוד החבילות תקפים בזמן הרכישה.\n• ההנחה אינה מצטרפת למבצעים אחרים אלא אם אושר בכתב.',
    },
    {
      titleAr: 'جدولة الدروس',
      titleHe: 'תיאום שיעורים',
      bodyAr:
        '• يُفضّل الحجز قبل 24 ساعة على الأقل.\n• الإلغاء قبل أقل من 4 ساعات قد يُحسب من الساعات.\n• التواصل عبر واتساب: 054-801-0225.',
      bodyHe:
        '• מומלץ לתאם לפחות 24 שעות מראש.\n• ביטול בפחות מ־4 שעות עלול להיחשב מהשעות.\n• יצירת קשר בוואטסאפ: 054-801-0225.',
    },
    {
      titleAr: 'الموافقة',
      titleHe: 'הסכמה',
      bodyAr:
        'بالضغط على «أوافق وأتابع للدفع» فإنك تؤكد أنك قرأت الشروط وتوافق عليها لصالح صاحب المنصة (المعلّم).',
      bodyHe:
        'בלחיצה על «אני מסכים/ה וממשיך/ה לתשלום» אתם מאשרים שקראתם את התנאים ומסכימים להם לטובת בעל הפלטפורמה (המורה).',
    },
  ],
};

export function computePricing(bundle) {
  const finalPrice = Number(bundle?.price) || 0;
  let originalPrice = Number(bundle?.originalPrice);
  if (!originalPrice || originalPrice < finalPrice) {
    const pct = Number(bundle?.discountPercent) || 0;
    originalPrice = pct > 0 && pct < 100
      ? Math.round((finalPrice / (1 - pct / 100)) * 100) / 100
      : finalPrice;
  }
  const discountPercent =
    originalPrice > finalPrice
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : Number(bundle?.discountPercent) || 0;
  const saved = Math.max(0, Math.round((originalPrice - finalPrice) * 100) / 100);
  return { finalPrice, originalPrice, discountPercent, saved };
}
