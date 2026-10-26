/**
 * Parse cloud video links (Google Drive / generic URL).
 * iCloud share links usually cannot be embedded — store as open link.
 */

export function extractDriveFileId(input) {
  const raw = (input || '').trim();
  if (!raw) return '';

  // Already a bare file id
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw) && !raw.includes('/') && !raw.includes('http')) {
    return raw;
  }

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) return m[1];
  }
  return '';
}

export function isICloudLink(url) {
  return /icloud\.com/i.test(url || '');
}

export function isDriveLink(url) {
  return /drive\.google\.com|docs\.google\.com/i.test(url || '');
}

/**
 * Normalize owner paste into lesson fields.
 * @returns {{ driveFileId: string, videoUrl: string, provider: string, note: string }}
 */
export function normalizeCloudVideoInput(input) {
  const raw = (input || '').trim();
  if (!raw) {
    return { driveFileId: '', videoUrl: '', provider: '', note: '' };
  }

  const driveId = extractDriveFileId(raw);
  if (driveId) {
    return {
      driveFileId: driveId,
      videoUrl: `https://drive.google.com/file/d/${driveId}/view`,
      provider: 'google_drive',
      note: '',
    };
  }

  if (isICloudLink(raw)) {
    return {
      driveFileId: '',
      videoUrl: raw,
      provider: 'icloud',
      note: 'رابط iCloud يُفتح في نافذة جديدة (لا يُضمَّن داخل الموقع مثل Drive).',
    };
  }

  if (/^https?:\/\//i.test(raw)) {
    return {
      driveFileId: '',
      videoUrl: raw,
      provider: 'url',
      note: '',
    };
  }

  return {
    driveFileId: raw,
    videoUrl: '',
    provider: 'raw_id',
    note: '',
  };
}

/** Random short access code for one student (owner sends via WhatsApp) */
export function generateStudentAccessCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
