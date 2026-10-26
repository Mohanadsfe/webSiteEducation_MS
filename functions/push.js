const webpush = require('web-push');

function ready(credentials) {
  if (!credentials?.publicKey || !credentials?.privateKey) return false;
  webpush.setVapidDetails(
    credentials.subject || 'mailto:mohanadsfe@gmail.com',
    credentials.publicKey,
    credentials.privateKey
  );
  return true;
}

async function sendWebPush(subscription, payload, credentials) {
  if (!ready(credentials)) {
    return { ok: false, error: 'missing web push keys' };
  }
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return { ok: false, error: 'bad subscription' };
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      statusCode: e.statusCode || 0,
      error: e.body || e.message || 'push failed',
    };
  }
}

module.exports = { sendWebPush };
