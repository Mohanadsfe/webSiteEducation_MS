/* Background booking reminders. Served from the site root by Create React App. */
importScripts('https://www.gstatic.com/firebasejs/11.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.3.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBeZziCiUpZSjJ3tsSFSLEyQrE6OdCUETI',
  authDomain: 'msacademic-c9f4c.firebaseapp.com',
  projectId: 'msacademic-c9f4c',
  storageBucket: 'msacademic-c9f4c.appspot.com',
  messagingSenderId: '1091960877761',
  appId: '1:1091960877761:web:8fbb5f404588bf457e1a40',
});

const messaging = firebase.messaging();

// A message that already includes a notification is shown by the browser.
// Showing it again here would duplicate the lock-screen alert.
messaging.onBackgroundMessage((payload) => {
  if (payload && payload.notification) return;
  const data = (payload && payload.data) || {};
  const title = data.title || 'Booking Reminder';
  const body = data.body || '';
  return self.registration.showNotification(title, {
    body,
    icon: '/ms-education.svg',
    badge: '/ms-education.svg',
    data: { url: data.url || '/my-bookings' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || '/my-bookings';
  const target = new URL(raw, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const same = windows.find((client) => client.url.startsWith(self.location.origin));
    if (same) {
      await same.focus();
      if (typeof same.navigate === 'function') {
        try {
          await same.navigate(target);
        } catch (e) {
          /* The focused tab stays open on this site. */
        }
      }
      return;
    }
    await self.clients.openWindow(target);
  })());
});
