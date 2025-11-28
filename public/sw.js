/**
 * Service Worker for Push Notifications
 *
 * This service worker handles:
 * - Push notification events from the server
 * - Notification click handling for navigation
 * - Notification close events for analytics
 */

// Cache name for offline support (optional)
const CACHE_NAME = 'digis-push-v1';

// Handle push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'Digis',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: '/' },
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        image: payload.image,
        tag: payload.tag,
        data: payload.data || data.data,
        actions: payload.actions,
        requireInteraction: payload.data?.type === 'call', // Keep call notifications visible
        vibrate: payload.data?.type === 'call' ? [200, 100, 200, 100, 200] : [100, 50, 100],
      };
    }
  } catch (err) {
    console.error('[SW] Error parsing push data:', err);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    image: data.image,
    tag: data.tag || 'default',
    data: data.data,
    actions: data.actions,
    requireInteraction: data.requireInteraction,
    vibrate: data.vibrate,
    // Show timestamp
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const action = event.action;

  // Handle action buttons
  if (action === 'view') {
    // View action - open the URL
  } else if (action === 'dismiss') {
    // Dismiss action - just close
    return;
  } else if (action === 'answer') {
    // Answer call action
    // URL should include call info
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close (for analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);

  // Could send analytics here
  // const notificationData = event.notification.data;
});

// Handle service worker install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(clients.claim());
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
