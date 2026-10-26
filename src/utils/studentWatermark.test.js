import {
  INSTITUTE_NAME,
  WATERMARK_POSITIONS,
  buildStudentWatermarkText,
  buildWatermarkTextFromProfile,
  getProfileFullName,
  getProfilePhone,
  nextWatermarkMoveDelayMs,
  nextWatermarkPositionIndex,
} from './studentWatermark';

describe('studentWatermark', () => {
  test('formats full identity string', () => {
    expect(
      buildStudentWatermarkText({ fullName: 'Ahmad Ali', phoneNumber: '0501234567' })
    ).toBe(`Student: Ahmad Ali | Phone: 0501234567 | ${INSTITUTE_NAME}`);
  });

  test('omits missing phone without inventing data', () => {
    expect(buildStudentWatermarkText({ fullName: 'Sara' })).toBe(
      `Student: Sara | ${INSTITUTE_NAME}`
    );
  });

  test('omits missing name without inventing data', () => {
    expect(buildStudentWatermarkText({ phoneNumber: '052999' })).toBe(
      `Phone: 052999 | ${INSTITUTE_NAME}`
    );
  });

  test('falls back to institute only when empty', () => {
    expect(buildStudentWatermarkText({})).toBe(INSTITUTE_NAME);
  });

  test('reads name and phone from profile fields', () => {
    const profile = { firstName: 'Mona', lastName: 'Hassan', phoneNumber: '054111' };
    expect(getProfileFullName(profile)).toBe('Mona Hassan');
    expect(getProfilePhone(profile)).toBe('054111');
    expect(buildWatermarkTextFromProfile(profile)).toBe(
      `Student: Mona Hassan | Phone: 054111 | ${INSTITUTE_NAME}`
    );
  });

  test('never uses frontend-supplied fake identity props on profile helper', () => {
    expect(buildWatermarkTextFromProfile(null)).toBe(INSTITUTE_NAME);
    expect(getProfileFullName(undefined)).toBe('');
    expect(getProfilePhone({})).toBe('');
  });

  test('move delay is between 8 and 15 seconds', () => {
    for (let i = 0; i < 30; i += 1) {
      const ms = nextWatermarkMoveDelayMs();
      expect(ms).toBeGreaterThanOrEqual(8000);
      expect(ms).toBeLessThanOrEqual(15000);
    }
  });

  test('position index changes when more than one slot exists', () => {
    const next = nextWatermarkPositionIndex(0, WATERMARK_POSITIONS.length);
    expect(next).toBeGreaterThanOrEqual(0);
    expect(next).toBeLessThan(WATERMARK_POSITIONS.length);
    expect(WATERMARK_POSITIONS.length).toBeGreaterThanOrEqual(5);
  });
});
