const test = require('node:test');
const assert = require('node:assert/strict');
const { isEarlyCancel } = require('./bookingPolicy');
const { buildReminderMail } = require('./mail');

test('cancel deadline is 24 hours before the booking day, not the lesson hour', () => {
  const lesson = new Date('2026-10-28T14:00:00Z');
  assert.equal(isEarlyCancel(lesson, new Date('2026-10-26T20:00:00Z')), true);
  assert.equal(isEarlyCancel(lesson, new Date('2026-10-26T23:00:00Z')), false);
  assert.equal(isEarlyCancel(lesson, new Date('2026-10-27T10:00:00Z')), false);
});

test('48-hour mail explains the day rule and 3-hour mail says to be ready', () => {
  const early = buildReminderMail({
    kind: 'hours48',
    studentName: 'Sara',
    studentEmail: 'sara@example.com',
    when: '2026-10-28 16:00',
    startIso: '2026-10-28T14:00:00.000Z',
    duration: 1,
    id: 'b1',
  });
  assert.match(early.student, /يوم الحجز/);
  assert.match(early.student, /جدول هاتفك/);
  assert.match(early.owner, /sara@example.com/);

  const soon = buildReminderMail({
    kind: 'hours3',
    studentName: 'Sara',
    when: '2026-10-28 16:00',
    startIso: '2026-10-28T14:00:00.000Z',
    duration: 1,
    id: 'b1',
  });
  assert.match(soon.student, /استعد، لديك حجز/);
});
