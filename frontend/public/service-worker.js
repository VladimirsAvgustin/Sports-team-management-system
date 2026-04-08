const CACHE_NAME = 'sports-team-v1'
const RUNTIME_CACHE = 'sports-team-runtime'
const API_CACHE = 'sports-team-api'

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
]

console.log('[SW] Service Worker loading...')

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Install event triggered')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened:', CACHE_NAME)
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('[SW] URLs cached successfully')
            return self.skipWaiting()
          })
          .catch(err => {
            console.error('[SW] Error caching URLs:', err)
            // Continue even if cache fails
            return self.skipWaiting()
          })
      })
      .catch(err => {
        console.error('[SW] Error opening cache:', err)
        return self.skipWaiting()
      })
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event triggered')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('[SW] Cache names found:', cacheNames)
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('[SW] Service Worker activated')
      return self.clients.claim()
    })
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip API calls to backend
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'basic') {
            return response
          }
          const responseToCache = response.clone()
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })
          return response
        })
        .catch(() => {
          return caches.match(request)
            .then(response => response || new Response('API request failed', { status: 503 }))
        })
    )
    return
  }

  // For everything else, use cache first, then network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response
          }

          const responseToCache = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })

          return response
        })
      })
      .catch(() => {
        // Return offline page or error response
        return caches.match('/index.html') || new Response('Offline', { status: 503 })
      })
  )
})

// Background sync for offline forms
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(
      syncPendingForms()
    )
  }
})

async function syncPendingForms() {
  try {
    const cache = await caches.open(API_CACHE)
    const requests = await cache.keys()
    
    for (const request of requests) {
      try {
        const response = await fetch(request)
        if (response.ok) {
          await cache.delete(request)
        }
      } catch (err) {
        console.log('Sync failed for:', request.url)
      }
    }
  } catch (err) {
    console.error('Background sync error:', err)
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [100, 50, 100],
    tag: 'notification',
    requireInteraction: false
  }

  event.waitUntil(
    self.registration.showNotification('Sports Team', options)
  )
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})
