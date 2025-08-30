// Custom service worker extension for background sync
// This file extends the auto-generated service worker with background sync functionality

// Import background sync service
importScripts('/js/background-sync-sw.js');

// Listen for sync events
self.addEventListener('sync', async (event) => {
  console.log('ServiceWorker: Sync event received:', event.tag);
  
  switch (event.tag) {
    case 'background-sync-reading-progress':
      event.waitUntil(syncReadingProgress());
      break;
    case 'background-sync-bookmarks':
      event.waitUntil(syncBookmarks());
      break;
    case 'background-sync-preferences':
      event.waitUntil(syncPreferences());
      break;
    default:
      console.log('ServiceWorker: Unknown sync tag:', event.tag);
  }
});

// Sync reading progress
async function syncReadingProgress() {
  try {
    console.log('ServiceWorker: Syncing reading progress...');
    
    // Open IndexedDB
    const db = await openSyncDatabase();
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const index = store.index('type');
    const items = await getAllFromIndex(index, 'reading-progress');
    
    console.log(`ServiceWorker: Found ${items.length} reading progress items to sync`);
    
    // Process each item
    for (const item of items) {
      try {
        const response = await fetch('/api/reading-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data)
        });
        
        if (response.ok) {
          await removeFromSyncQueue(item.id);
          console.log(`ServiceWorker: Successfully synced reading progress ${item.id}`);
        } else {
          console.error(`ServiceWorker: Failed to sync reading progress ${item.id}:`, response.status);
        }
      } catch (error) {
        console.error(`ServiceWorker: Error syncing reading progress ${item.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('ServiceWorker: Error in syncReadingProgress:', error);
  }
}

// Sync bookmarks
async function syncBookmarks() {
  try {
    console.log('ServiceWorker: Syncing bookmarks...');
    
    const db = await openSyncDatabase();
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const index = store.index('type');
    const items = await getAllFromIndex(index, 'bookmark');
    
    console.log(`ServiceWorker: Found ${items.length} bookmark items to sync`);
    
    for (const item of items) {
      try {
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data)
        });
        
        if (response.ok) {
          await removeFromSyncQueue(item.id);
          console.log(`ServiceWorker: Successfully synced bookmark ${item.id}`);
        } else {
          console.error(`ServiceWorker: Failed to sync bookmark ${item.id}:`, response.status);
        }
      } catch (error) {
        console.error(`ServiceWorker: Error syncing bookmark ${item.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('ServiceWorker: Error in syncBookmarks:', error);
  }
}

// Sync preferences
async function syncPreferences() {
  try {
    console.log('ServiceWorker: Syncing preferences...');
    
    const db = await openSyncDatabase();
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const index = store.index('type');
    const items = await getAllFromIndex(index, 'preference');
    
    console.log(`ServiceWorker: Found ${items.length} preference items to sync`);
    
    for (const item of items) {
      try {
        const response = await fetch('/api/user/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: item.userId,
            preferences: item.data
          })
        });
        
        if (response.ok) {
          await removeFromSyncQueue(item.id);
          console.log(`ServiceWorker: Successfully synced preferences ${item.id}`);
        } else {
          console.error(`ServiceWorker: Failed to sync preferences ${item.id}:`, response.status);
        }
      } catch (error) {
        console.error(`ServiceWorker: Error syncing preferences ${item.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('ServiceWorker: Error in syncPreferences:', error);
  }
}

// Database helper functions
function openSyncDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bookbridge-sync', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('userId', 'userId', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('priority', 'priority', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('syncHistory')) {
        const historyStore = db.createObjectStore('syncHistory', { keyPath: 'id' });
        historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        historyStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

function getAllFromIndex(index, query) {
  return new Promise((resolve, reject) => {
    const request = index.getAll(query);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeFromSyncQueue(itemId) {
  const db = await openSyncDatabase();
  const transaction = db.transaction(['syncQueue'], 'readwrite');
  const store = transaction.objectStore('syncQueue');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(itemId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

console.log('ServiceWorker: Background sync extension loaded');