// Service worker — push notifications removed, using email via SendGrid instead.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
