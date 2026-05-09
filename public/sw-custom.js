// custom service worker logic for pushing
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Notification', body: 'New updates are available!' };
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/maskable_icon.png'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
