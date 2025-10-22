// Service Worker for Relosity AI Platform
const CACHE_NAME = 'relosity-ai-v1.0.0';
const STATIC_CACHE = 'relosity-static-v1.0.0';
const DYNAMIC_CACHE = 'relosity-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/style.css',
    '/dashboard.css',
    '/app.js',
    '/dashboard.js',
    '/manifest.json',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Error caching static files', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Firebase and external API requests
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('openai') || 
        url.hostname.includes('googleapis')) {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache', request.url);
                    return cachedResponse;
                }
                
                // Otherwise fetch from network
                return fetch(request)
                    .then((response) => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Cache dynamic content
                        caches.open(DYNAMIC_CACHE)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        
                        // Return cached version of the file
                        return caches.match(request);
                    });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'إشعار جديد من Relosity AI',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'فتح التطبيق',
                icon: '/assets/icons/open-icon.png'
            },
            {
                action: 'close',
                title: 'إغلاق',
                icon: '/assets/icons/close-icon.png'
            }
        ],
        requireInteraction: true,
        silent: false
    };
    
    event.waitUntil(
        self.registration.showNotification('Relosity AI', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked', event.action);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/dashboard.html')
        );
    }
});

// Message event for communication with main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        const urlsToCache = event.data.urls;
        event.waitUntil(
            caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                    return cache.addAll(urlsToCache);
                })
        );
    }
});

// Background sync function
async function doBackgroundSync() {
    try {
        console.log('Service Worker: Performing background sync');
        
        // Get pending offline actions from IndexedDB
        const pendingActions = await getPendingActions();
        
        for (const action of pendingActions) {
            try {
                await processOfflineAction(action);
                await removePendingAction(action.id);
            } catch (error) {
                console.error('Service Worker: Error processing offline action', error);
            }
        }
        
        console.log('Service Worker: Background sync completed');
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
    }
}

// Get pending actions from IndexedDB
async function getPendingActions() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('RelosityOfflineDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pendingActions'], 'readonly');
            const store = transaction.objectStore('pendingActions');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('pendingActions')) {
                db.createObjectStore('pendingActions', { keyPath: 'id' });
            }
        };
    });
}

// Process offline action
async function processOfflineAction(action) {
    const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
}

// Remove pending action from IndexedDB
async function removePendingAction(actionId) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('RelosityOfflineDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pendingActions'], 'readwrite');
            const store = transaction.objectStore('pendingActions');
            const deleteRequest = store.delete(actionId);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
    });
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('Service Worker: Periodic sync', event.tag);
    
    if (event.tag === 'content-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Handle app updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'APP_UPDATE_AVAILABLE') {
        console.log('Service Worker: App update available');
        
        // Notify all clients about the update
        self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                client.postMessage({
                    type: 'APP_UPDATE_AVAILABLE',
                    message: 'تحديث جديد متاح للتطبيق'
                });
            });
        });
    }
});

// Cache management
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
        name.startsWith('relosity-') && 
        name !== STATIC_CACHE && 
        name !== DYNAMIC_CACHE
    );
    
    return Promise.all(
        oldCaches.map(cacheName => caches.delete(cacheName))
    );
}

// Initialize IndexedDB for offline storage
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('RelosityOfflineDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = () => {
            const db = request.result;
            
            // Create object stores
            if (!db.objectStoreNames.contains('pendingActions')) {
                db.createObjectStore('pendingActions', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('conversations')) {
                db.createObjectStore('conversations', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

// Initialize on service worker start
initIndexedDB().catch(console.error);

console.log('Service Worker: Loaded successfully');