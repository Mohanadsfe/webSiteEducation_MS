const test = require('node:test');
const assert = require('node:assert/strict');
const { accountWipeTargets } = require('./account');

test('account removal covers the student records and skips a blank email', () => {
  const targets = accountWipeTargets('student-1', '');
  const keys = targets.map((row) => `${row.collection}.${row.field}`);
  assert.ok(keys.includes('appointments.studentId'));
  assert.ok(keys.includes('notifications.userId'));
  assert.ok(keys.includes('enrollments.studentId'));
  assert.ok(keys.includes('purchases.studentId'));
  assert.ok(keys.includes('student_exams.studentId'));
  assert.ok(keys.includes('opinions.userId'));
  assert.equal(keys.some((key) => key.endsWith('studentEmail')), false);
});

test('the same email on older records is included', () => {
  const targets = accountWipeTargets('student-1', 'sara@example.com');
  const emailRows = targets.filter((row) => row.value === 'sara@example.com');
  assert.deepEqual(emailRows.map((row) => row.collection).sort(), [
    'appointments',
    'enrollments',
    'opinions',
    'purchases',
  ]);
});
