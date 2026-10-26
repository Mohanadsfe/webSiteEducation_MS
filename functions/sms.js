/**
 * Send one SMS. Twilio is used when the three TWILIO_* values are set.
 * Returns { ok, error }.
 */
async function sendSms(to, body, credentials) {
  const sid = credentials.accountSid || '';
  const token = credentials.authToken || '';
  const from = credentials.fromNumber || '';
  if (!sid || !token || !from) {
    return { ok: false, error: 'Twilio is not configured' };
  }

  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, error: `Twilio ${res.status}: ${detail.slice(0, 300)}` };
  }
  return { ok: true };
}

module.exports = { sendSms };
