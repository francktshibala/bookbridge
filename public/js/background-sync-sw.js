// Background sync service worker utilities
// Shared utilities for handling background sync operations

// Utility to handle fetch with retry logic
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        throw new Error(`Client error: ${response.status}`);
      }
      
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      
      // If it's a network error, wait before retry
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError;
}

// Utility to send notifications about sync status
async function sendSyncNotification(title, body, actions = []) {
  if ('Notification' in self && self.Notification.permission === 'granted') {
    try {
      await self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        actions,
        tag: 'sync-notification',
        requireInteraction: false,
        silent: true
      });
    } catch (error) {
      console.error('ServiceWorker: Failed to show notification:', error);
    }
  }
}

// Enhanced sync with progress tracking
async function syncWithProgress(items, syncFunction, type) {
  let successCount = 0;
  let failureCount = 0;
  const total = items.length;
  
  if (total === 0) {
    console.log(`ServiceWorker: No ${type} items to sync`);
    return { success: 0, failed: 0 };
  }
  
  console.log(`ServiceWorker: Starting sync of ${total} ${type} items`);
  
  // Process items in smaller batches to avoid overwhelming the server
  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(item => syncFunction(item))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successCount++;
      } else {
        failureCount++;
        console.error(`ServiceWorker: Failed to sync ${type} item:`, result.reason);
      }
    });
    
    // Small delay between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const message = `Synced ${successCount}/${total} ${type} items`;
  console.log(`ServiceWorker: ${message}`);
  
  // Show notification for significant sync operations
  if (total > 5) {
    await sendSyncNotification(
      'BookBridge Sync Complete',
      message
    );
  }
  
  return { success: successCount, failed: failureCount };
}

// Enhanced error handling for sync operations
function handleSyncError(error, context) {
  console.error(`ServiceWorker: Sync error in ${context}:`, error);
  
  // Log different types of errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    console.log('ServiceWorker: Network error detected, items will retry on next sync');
  } else if (error.message.includes('Client error')) {
    console.log('ServiceWorker: Client error detected, item may need manual intervention');
  } else {
    console.log('ServiceWorker: Server error detected, will retry');
  }
}

// Database cleanup utility
async function cleanupSyncDatabase() {
  try {
    const db = await openSyncDatabase();
    const transaction = db.transaction(['syncHistory'], 'readwrite');
    const store = transaction.objectStore('syncHistory');
    
    // Remove history items older than 7 days
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const index = store.index('timestamp');
    
    const request = index.openCursor(IDBKeyRange.upperBound(weekAgo));
    let deleteCount = 0;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        deleteCount++;
        cursor.continue();
      } else if (deleteCount > 0) {
        console.log(`ServiceWorker: Cleaned up ${deleteCount} old sync history records`);
      }
    };
    
  } catch (error) {
    console.error('ServiceWorker: Error cleaning up sync database:', error);
  }
}

// Periodic cleanup - run every 24 hours
setInterval(cleanupSyncDatabase, 24 * 60 * 60 * 1000);

console.log('ServiceWorker: Background sync utilities loaded');