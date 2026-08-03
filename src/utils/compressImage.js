/**
 * Compress a selected image file to a JPEG data URL (kept small for Firestore).
 */
export function compressImageFile(file, { maxWidth = 720, quality = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('اختر ملف صورة صالح'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('الصورة كبيرة جداً (الحد 8MB)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          // Firestore doc limit ~1MB; keep a safety margin
          if (dataUrl.length > 900000) {
            const smaller = canvas.toDataURL('image/jpeg', 0.55);
            if (smaller.length > 900000) {
              reject(new Error('الصورة ما زالت كبيرة بعد الضغط — جرّب صورة أصغر'));
              return;
            }
            resolve(smaller);
            return;
          }
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export const EXAM_PRESET_COVERS = [
  {
    id: 'study1',
    url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
    labelAr: 'مذاكرة',
    labelHe: 'למידה',
  },
  {
    id: 'books',
    url: 'https://images.unsplash.com/photo-14565130808-8221ff45d9e1?auto=format&fit=crop&w=800&q=80',
    labelAr: 'كتب',
    labelHe: 'ספרים',
  },
  {
    id: 'school',
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
    labelAr: 'مدرسة',
    labelHe: 'בית ספר',
  },
  {
    id: 'campus',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    labelAr: 'جامعة',
    labelHe: 'אוניברסיטה',
  },
];
