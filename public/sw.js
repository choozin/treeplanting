// This is the code to add to your existing public/sw.js file

self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.notification.body,
    icon: data.notification.icon,
    data: {
        url: data.notification.data.url
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.notification.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});