// Standard Web Push Service Worker for LEO Portal
// Compatible with iOS 16.4+ and all standard browser push protocols

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.notification.body,
        icon: payload.notification.icon || 'https://i.imgur.com/MP1YFNf.png',
        badge: 'https://i.imgur.com/MP1YFNf.png',
        vibrate: [100, 50, 100],
        data: payload.notification.data || { url: '/dashboard' },
      };

      event.waitUntil(
        self.registration.showNotification(payload.notification.title, options)
      );
    } catch (e) {
      console.error('Error handling push event:', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Extract the URL from the notification data
  const urlToOpen = event.notification.data ? event.notification.data.url : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if a window with the target URL is already open
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});