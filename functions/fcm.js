const STALE_TOKEN_CODES = new Set([
  'messaging/invalid-argument',
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

const BOOKING_URL = '/my-bookings';

function isStaleTokenError(code) {
  return STALE_TOKEN_CODES.has(String(code || ''));
}

/** One record per token string. The document id is kept so a stale token can be deleted. */
function tokensFromDocs(docs) {
  const seen = new Set();
  const out = [];
  for (const doc of docs || []) {
    const token = String(doc && doc.token ? doc.token : '').trim();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push({ id: String(doc.id || token), token });
  }
  return out;
}

function tokensForStudent(tokensByStudent, studentId) {
  const rows = tokensByStudent && tokensByStudent[studentId];
  return tokensFromDocs(rows);
}

function reminderMessage(job) {
  const when = String((job && job.when) || '').trim();
  const english = when
    ? `You have an upcoming lesson at ${when}.`
    : 'You have an upcoming lesson.';
  const detail = String((job && job.body) || '').trim();
  const body = detail ? `${english}\n${detail}` : english;
  return {
    title: 'Booking Reminder',
    body,
    data: {
      title: 'Booking Reminder',
      body,
      url: BOOKING_URL,
      bookingId: String((job && job.id) || ''),
      kind: String((job && job.kind) || ''),
      lessonAt: when,
    },
  };
}

function noticeMessage(text) {
  const body = String(text || '').trim();
  return {
    title: 'معهد المعرفة',
    body,
    data: {
      title: 'معهد المعرفة',
      body,
      url: BOOKING_URL,
      bookingId: '',
      kind: 'manual',
      lessonAt: '',
    },
  };
}

function classifySendResults(tokenRecords, responses) {
  const staleIds = [];
  let pushed = 0;
  let failed = 0;
  (responses || []).forEach((res, index) => {
    if (res && res.success) {
      pushed += 1;
      return;
    }
    const code = res && res.error ? res.error.code : '';
    const record = tokenRecords[index];
    if (record && isStaleTokenError(code)) staleIds.push(record.id);
    else failed += 1;
  });
  return { pushed, staleIds, failed };
}

/**
 * Send one reminder to this student's tokens.
 * A bad token is reported for deletion. Other tokens and other students continue.
 */
async function sendToTokens(messaging, tokenRecords, message) {
  const records = tokensFromDocs(tokenRecords);
  if (!records.length) return { pushed: 0, staleIds: [], failed: 0 };
  const response = await messaging.sendEachForMulticast({
    tokens: records.map((row) => row.token),
    notification: {
      title: message.title,
      body: message.body,
    },
    data: message.data,
    webpush: {
      headers: { Urgency: 'high' },
      fcmOptions: { link: 'https://msacademic-c9f4c.web.app/my-bookings' },
      notification: { icon: 'https://msacademic-c9f4c.web.app/ms-education.svg' },
    },
  });
  return classifySendResults(records, response && response.responses);
}

module.exports = {
  isStaleTokenError,
  tokensFromDocs,
  tokensForStudent,
  reminderMessage,
  noticeMessage,
  classifySendResults,
  sendToTokens,
};
