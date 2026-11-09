const dayjs = require('dayjs');
const { calendarLink } = require('./bookingPolicy');

const OWNERS = ['safi89099@gmail.com', 'mohanadsfe@gmail.com'];

function studentBlock(job) {
  return [
    `الطالب: ${job.studentName || '—'}`,
    `البريد: ${job.studentEmail || '—'}`,
    `الهاتف: ${job.studentPhone || '—'}`,
    `الموعد: ${job.when || '—'}`,
    `المدة: ${job.duration || 1} ساعة`,
    `رقم الحجز: ${job.id || '—'}`,
  ].join('\n');
}

function buildReminderMail(job) {
  const start = dayjs(job.startIso || job.when);
  const link = calendarLink(
    start,
    job.duration,
    'محاضرة — معهد المعرفة',
    `الموعد ${job.when || ''}`
  );
  const calendarNote = [
    'يمكنك ربط هذه الرسالة بجدول هاتفك من هذا الرابط، فيصلك التذكير بسهولة:',
    link,
  ].join('\n');

  if (job.kind === 'hours3') {
    return {
      subject: `استعد — لديك حجز ${job.when || ''}`.trim(),
      student: [
        `مرحباً ${job.studentName || 'طالبنا'}،`,
        '',
        'استعد، لديك حجز.',
        `محاضرتك في معهد المعرفة: ${job.when || '—'} (${job.duration || 1} ساعة).`,
        'كن مستعداً.',
        '',
        calendarNote,
        '',
        'معهد المعرفة',
      ].join('\n'),
      owner: [
        'تذكير قبل ٣ ساعات. الحجز لم يُلغَ.',
        '',
        studentBlock(job),
        '',
        'الرسالة للطالب: استعد، لديك حجز.',
      ].join('\n'),
    };
  }

  return {
    subject: `تذكير قبل ٤٨ ساعة — ${job.when || ''}`.trim(),
    student: [
      `مرحباً ${job.studentName || 'طالبنا'}،`,
      '',
      `تذكير من معهد المعرفة: محاضرتك ${job.when || '—'} (${job.duration || 1} ساعة).`,
      'يمكن إلغاء المحاضرة قبل 24 ساعة من يوم الحجز، وليس قبل 24 ساعة من ساعة المحاضرة.',
      'إذا لم يُلغَ الحجز قبل ذلك، يُحتسب الحجز ولا يُرد المبلغ.',
      '',
      calendarNote,
      '',
      'معهد المعرفة',
    ].join('\n'),
    owner: [
      'تذكير قبل ٤٨ ساعة.',
      '',
      studentBlock(job),
      '',
      'الإلغاء للطالب: قبل 24 ساعة من يوم الحجز، وليس من ساعة المحاضرة.',
    ].join('\n'),
  };
}

async function postMail(to, subject, message) {
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: subject,
      name: 'معهد المعرفة',
      email: 'mohanadsfe@gmail.com',
      message,
      _captcha: 'false',
      _template: 'box',
    }),
  });
  return res.ok;
}

async function sendReminderEmails(job) {
  const mail = buildReminderMail(job);
  const targets = [];
  const studentEmail = String(job.studentEmail || '').trim();
  if (studentEmail.includes('@')) targets.push({ to: studentEmail, body: mail.student });
  OWNERS.forEach((owner) => targets.push({ to: owner, body: mail.owner }));

  let sent = 0;
  for (const row of targets) {
    try {
      const ok = await postMail(row.to, mail.subject, row.body);
      if (ok) sent += 1;
    } catch (e) {
      console.error('Reminder email failed', job.id, e.message || 'mail-failed');
    }
  }
  return { sent };
}

module.exports = { buildReminderMail, sendReminderEmails };
