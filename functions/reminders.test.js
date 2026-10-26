const test = require('node:test');
const assert = require('node:assert/strict');
const { selectSmsJobs } = require('./reminders');
const {
  classifySendResults,
  isStaleTokenError,
  reminderMessage,
  tokensForStudent,
  tokensFromDocs,
} = require('./fcm');

function booking(overrides) {
  return {
    id: 'booking-1',
    studentId: 'student-a',
    status: 'confirmed',
    studentName: 'Sara',
    date: '2026-10-28T16:00:00',
    ...overrides,
  };
}

test('a lesson is reminded at 36 hours, 30 hours, and 3 hours, once each', () => {
  const lecture = booking();
  const tooEarly = selectSmsJobs([lecture], new Date('2026-10-27T01:00:00Z'));
  assert.equal(tooEarly.length, 0);

  const at36 = selectSmsJobs([lecture], new Date('2026-10-27T03:00:00Z'));
  assert.equal(at36.length, 1);
  assert.equal(at36[0].kind, 'hours36');
  assert.equal(at36[0].when, '2026-10-28 16:00');

  const at30 = selectSmsJobs([lecture], new Date('2026-10-27T09:00:00Z'));
  assert.equal(at30.length, 1);
  assert.equal(at30[0].kind, 'hours30');

  const at3 = selectSmsJobs([lecture], new Date('2026-10-28T12:00:00Z'));
  assert.equal(at3.length, 1);
  assert.equal(at3[0].kind, 'hours3');
});

test('a passed reminder is not sent late, and a sent one is not repeated', () => {
  const missed36 = selectSmsJobs(
    [booking()],
    new Date('2026-10-27T09:00:00Z')
  );
  assert.equal(missed36.length, 1);
  assert.equal(missed36[0].kind, 'hours30');

  const again = selectSmsJobs(
    [booking({ reminderHours30CloudSent: true })],
    new Date('2026-10-27T09:00:00Z')
  );
  assert.equal(again.length, 0);
});

test('three-hour reminder uses that booking student and is not repeated', () => {
  const now = new Date('2026-10-27T07:30:00Z');
  const lecture = booking({
    id: 'booking-2',
    studentId: 'student-b',
    date: '2026-10-27T12:00:00',
  });
  const jobs = selectSmsJobs([lecture], now);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].studentId, 'student-b');
  assert.equal(jobs[0].kind, 'hours3');
  assert.equal(jobs[0].when, '2026-10-27 12:00');

  const again = selectSmsJobs([
    { ...lecture, reminderHours3CloudSent: true },
  ], now);
  assert.equal(again.length, 0);
});

test('each booking keeps its own student id', () => {
  const jobs = selectSmsJobs([
    booking({ id: 'a', studentId: 'student-a', date: '2026-10-27T12:00:00' }),
    booking({ id: 'b', studentId: 'student-b', date: '2026-10-27T12:30:00' }),
  ], new Date('2026-10-27T07:30:00Z'));
  const byStudent = Object.fromEntries(jobs.map((job) => [job.studentId, job.id]));
  assert.equal(byStudent['student-a'], 'a');
  assert.equal(byStudent['student-b'], 'b');
});

test('only the booked student token is selected', () => {
  const tokens = {
    'student-a': [{ id: 'doc-a', token: 'token-a' }],
    'student-b': [{ id: 'doc-b', token: 'token-b' }],
  };
  const selected = tokensForStudent(tokens, 'student-a');
  assert.deepEqual(selected.map((row) => row.token), ['token-a']);
});

test('duplicate token rows collapse to one', () => {
  const rows = tokensFromDocs([
    { id: '1', token: 'same' },
    { id: '2', token: 'same' },
    { id: '3', token: ' other ' },
  ]);
  assert.deepEqual(rows.map((row) => row.token), ['same', 'other']);
});

test('reminder text names the lesson time and booking', () => {
  const message = reminderMessage({
    id: 'booking-9',
    kind: 'hours3',
    when: '2026-10-27 12:00',
    body: 'محاضرتك اليوم الساعة 12:00',
  });
  assert.equal(message.title, 'Booking Reminder');
  assert.match(message.body, /You have an upcoming lesson at 2026-10-27 12:00\./);
  assert.equal(message.data.bookingId, 'booking-9');
  assert.equal(message.data.url, '/my-bookings');
  assert.equal(message.data.lessonAt, '2026-10-27 12:00');
});

test('an invalid token is removed and a temporary failure is kept', () => {
  assert.equal(isStaleTokenError('messaging/registration-token-not-registered'), true);
  assert.equal(isStaleTokenError('messaging/unavailable'), false);
  const result = classifySendResults(
    [{ id: 'keep', token: 'good' }, { id: 'drop', token: 'old' }, { id: 'retry', token: 'later' }],
    [
      { success: true },
      { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      { success: false, error: { code: 'messaging/unavailable' } },
    ]
  );
  assert.equal(result.pushed, 1);
  assert.deepEqual(result.staleIds, ['drop']);
  assert.equal(result.failed, 1);
});
