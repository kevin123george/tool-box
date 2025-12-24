console.log('Service Worker loaded');

self.addEventListener('install', function(event) {
    console.log('Service Worker installing');
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating');
    return self.clients.claim();
});

self.addEventListener('push', function(event) {
    console.log('Push received');

    if (!event.data) {
        console.log('Push event but no data');
        return;
    }

    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
        body: data.body,
        icon: data.icon || '/icon.png',
        badge: data.badge || '/badge.png',
        vibrate: data.vibrate || [200, 100, 200],
        data: data.data || {},
        tag: data.type,
        requireInteraction: data.type.includes('alert'),
        actions: [
            {
                action: 'view',
                title: 'View'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event.action);
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});