/**
 * Student study tracks: academic (college/uni) vs bagrut/school.
 * Images: education / Israeli-school-style study visuals (Unsplash).
 */
export const TRACKS = {
  academic: {
    id: 'academic',
    titleAr: 'طالب أكاديمي',
    titleHe: 'סטודנט אקדמי',
    subtitleAr: 'جامعة · كلية · هندسة · برمجة',
    subtitleHe: 'אוניברסיטה · מכללה · הנדסה · תכנות',
    descriptionAr: 'جداول محاضرات، رزمات خصوصية، ودورات جامعية تناسب مسارك الأكاديمي.',
    descriptionHe: 'לוח שיעורים, חבילות פרטיות וקורסים אקדמיים למסלול שלך.',
    image:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    accent: '#1a6bb5',
    accentSoft: 'rgba(26, 107, 181, 0.14)',
    featuresAr: ['حجز ساعات دراسية', 'دورات جامعية مسجّلة', 'متابعة الساعات المتبقية'],
    featuresHe: ['הזמנת שעות לימוד', 'קורסים אקדמיים מוקלטים', 'מעקב שעות שנותרו'],
    bundleCategories: ['tutoring', 'academic'],
    courseCategories: ['tutoring', 'academic', 'general'],
  },
  bagrut: {
    id: 'bagrut',
    titleAr: 'בגרות / مدرسة',
    titleHe: 'בגרות / תיכון',
    subtitleAr: 'בגרויות · תיכון · יחידות לימוד',
    subtitleHe: 'בגרויות · תיכון · יחידות לימוד',
    descriptionAr: 'تحضير للبجروت، جداول امتحانات، ورزمات محاضرات حسب المواد والموעדים.',
    descriptionHe: 'הכנה לבגרות, לוחות מבחנים וחבילות הרצאות לפי מקצועות ומועדים.',
    image:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    imageAlt:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
    accent: '#c0392b',
    accentSoft: 'rgba(192, 57, 43, 0.14)',
    featuresAr: ['امتحانات בגרויות ومواعيد شخصية', 'محاضرات امتحانات', 'تذكيرات مشجّعة قبل الموعد'],
    featuresHe: ['מבחני בגרות ומועדים אישיים', 'הרצאות לבחינות', 'תזכורות מעודדות לפני המועד'],
    bundleCategories: ['exam', 'bagrut'],
    courseCategories: ['exam', 'bagrut', 'general'],
  },
};

export const TRACK_STORAGE_KEY = 'ms_study_track';

/** Teacher picks this when creating packs/courses — controls who sees the item */
export const CONTENT_TRACK_OPTIONS = [
  {
    value: 'academic',
    labelAr: 'أكاديمي / جامعة',
    labelHe: 'אקדמי / אוניברסיטה',
    hintAr: 'يظهر فقط لطلاب المسار الأكاديمي',
    hintHe: 'מוצג רק לסטודנטים במסלול האקדמי',
  },
  {
    value: 'bagrut',
    labelAr: 'בגרות / مدرسة',
    labelHe: 'בגרות / תיכון',
    hintAr: 'يظهر فقط لطلاب مسار البجروت / المدرسة',
    hintHe: 'מוצג רק לתלמידי בגרות / תיכון',
  },
  {
    value: 'both',
    labelAr: 'للمسارين معاً',
    labelHe: 'לשני המסלולים',
    hintAr: 'يظهر لجميع الطلاب',
    hintHe: 'מוצג לכל התלמידים',
  },
];

export function getTrackConfig(trackId) {
  return TRACKS[trackId] || null;
}

/** Normalize legacy categories (tutoring/exam/general) to track visibility */
export function normalizeContentTrack(category) {
  const cat = (category || '').toLowerCase();
  if (cat === 'bagrut' || cat === 'exam') return 'bagrut';
  if (cat === 'academic' || cat === 'tutoring') return 'academic';
  if (cat === 'both' || cat === 'general') return 'both';
  return cat || 'both';
}

export function contentTrackLabel(category) {
  const track = normalizeContentTrack(category);
  const opt = CONTENT_TRACK_OPTIONS.find((o) => o.value === track);
  return opt ? opt.labelAr : category || '—';
}

export function matchesTrackCategory(category, trackId) {
  const track = getTrackConfig(trackId);
  if (!track) return true;
  const visibility = normalizeContentTrack(category);
  if (visibility === 'both') return true;
  return visibility === trackId;
}
