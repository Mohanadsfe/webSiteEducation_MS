/* Lecture reminders. The Cloud Function pushes here; the page does not have to be open. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'معهد المعرفة';
  const body = data.body || '';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/ms-education.svg',
    badge: '/ms-education.svg',
    data: { url: data.url || '/my-bookings' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/my-bookings';
  event.waitUntil(self.clients.openWindow(url));
});
