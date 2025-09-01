'use client';

interface BookContent {
  id: string;
  content: any;
  cachedAt: number;
}

interface UserPreference {
  key: string;
  value: any;
  updatedAt: number;
}

export class CapacitorStorage {
  // Store book content using Capacitor Filesystem
  static async storeBookContent(bookId: string, content: any): Promise<void> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        
        const data = JSON.stringify({
          id: bookId,
          content,
          cachedAt: Date.now()
        });
        
        await Filesystem.writeFile({
          path: `books/${bookId}.json`,
          data,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });
        
        console.log(`📚 Stored book content natively: ${bookId}`);
      } else {
        // Fallback to IndexedDB for web
        await this.storeInIndexedDB('book-content', bookId, { content, cachedAt: Date.now() });
      }
    } catch (error) {
      console.error('Failed to store book content:', error);
      // Always fallback to IndexedDB
      await this.storeInIndexedDB('book-content', bookId, { content, cachedAt: Date.now() });
    }
  }

  // Retrieve book content
  static async getBookContent(bookId: string): Promise<any> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        
        const result = await Filesystem.readFile({
          path: `books/${bookId}.json`,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });
        
        const data = JSON.parse(result.data as string);
        console.log(`📚 Retrieved book content natively: ${bookId}`);
        return data.content;
      } else {
        // Fallback to IndexedDB for web
        const data = await this.getFromIndexedDB('book-content', bookId);
        return data?.content;
      }
    } catch (error) {
      console.log(`Book content not found natively: ${bookId}, trying IndexedDB`);
      // Fallback to IndexedDB
      const data = await this.getFromIndexedDB('book-content', bookId);
      return data?.content;
    }
  }

  // Store user preferences
  static async storeUserPreferences(key: string, value: any): Promise<void> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Preferences } = await import('@capacitor/preferences');
        
        await Preferences.set({
          key,
          value: JSON.stringify({
            value,
            updatedAt: Date.now()
          }),
        });
        
        console.log(`⚙️ Stored preference natively: ${key}`);
      } else {
        // Fallback to localStorage for web
        localStorage.setItem(`bookbridge_${key}`, JSON.stringify({
          value,
          updatedAt: Date.now()
        }));
      }
    } catch (error) {
      console.error('Failed to store preferences:', error);
      // Fallback to localStorage
      localStorage.setItem(`bookbridge_${key}`, JSON.stringify({
        value,
        updatedAt: Date.now()
      }));
    }
  }

  // Get user preferences
  static async getUserPreferences(key: string): Promise<any> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Preferences } = await import('@capacitor/preferences');
        
        const result = await Preferences.get({ key });
        if (result.value) {
          const data = JSON.parse(result.value);
          console.log(`⚙️ Retrieved preference natively: ${key}`);
          return data.value;
        }
      } else {
        // Fallback to localStorage for web
        const stored = localStorage.getItem(`bookbridge_${key}`);
        if (stored) {
          const data = JSON.parse(stored);
          return data.value;
        }
      }
    } catch (error) {
      console.log(`Preference not found: ${key}`);
    }
    return null;
  }

  // Store large audio files using Filesystem API
  static async storeAudioFile(
    bookId: string, 
    chunkIndex: number, 
    audioBlob: Blob
  ): Promise<void> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        // Convert blob to base64
        const base64Data = await this.blobToBase64(audioBlob);
        
        // Store audio file
        await Filesystem.writeFile({
          path: `audio/${bookId}_${chunkIndex}.mp3`,
          data: base64Data,
          directory: Directory.Data,
        });
        
        console.log(`🎵 Stored audio natively: ${bookId}_${chunkIndex}`);
      }
    } catch (error) {
      console.error('Native audio storage failed:', error);
      // Current IndexedDB system will handle fallback
    }
  }

  // Get stored audio file
  static async getAudioFile(bookId: string, chunkIndex: number): Promise<string | null> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        const result = await Filesystem.readFile({
          path: `audio/${bookId}_${chunkIndex}.mp3`,
          directory: Directory.Data,
        });
        
        return `data:audio/mp3;base64,${result.data}`;
      }
    } catch (error) {
      console.log(`Audio file not found natively: ${bookId}_${chunkIndex}`);
    }
    return null;
  }

  // Store raw book files (PDF, EPUB, etc.)
  static async storeRawBookFile(
    bookId: string, 
    fileName: string, 
    fileBlob: Blob,
    mimeType: string
  ): Promise<void> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        const base64Data = await this.blobToBase64(fileBlob);
        const extension = fileName.split('.').pop() || 'bin';
        
        await Filesystem.writeFile({
          path: `raw-books/${bookId}.${extension}`,
          data: base64Data,
          directory: Directory.Data,
        });
        
        // Store metadata for the raw file
        await this.storeUserPreferences(`raw-book-${bookId}`, {
          fileName,
          mimeType,
          size: fileBlob.size,
          storedAt: Date.now()
        });
        
        console.log(`📖 Stored raw book natively: ${bookId}`);
      }
    } catch (error) {
      console.error('Native raw book storage failed:', error);
    }
  }

  // Get raw book file
  static async getRawBookFile(bookId: string): Promise<{ data: string; metadata: any } | null> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        const metadata = await this.getUserPreferences(`raw-book-${bookId}`);
        if (!metadata) return null;
        
        const extension = metadata.fileName.split('.').pop() || 'bin';
        const result = await Filesystem.readFile({
          path: `raw-books/${bookId}.${extension}`,
          directory: Directory.Data,
        });
        
        return {
          data: `data:${metadata.mimeType};base64,${result.data}`,
          metadata
        };
      }
    } catch (error) {
      console.log(`Raw book file not found natively: ${bookId}`);
    }
    return null;
  }

  // List all stored files for a book
  static async listBookFiles(bookId: string): Promise<{
    content: boolean;
    rawFile: boolean;
    audioFiles: number[];
  }> {
    const result = {
      content: false,
      rawFile: false,
      audioFiles: [] as number[]
    };

    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        // Check for processed content
        try {
          await Filesystem.readFile({
            path: `books/${bookId}.json`,
            directory: Directory.Data,
          });
          result.content = true;
        } catch {}

        // Check for raw file
        const rawMetadata = await this.getUserPreferences(`raw-book-${bookId}`);
        result.rawFile = !!rawMetadata;

        // Check for audio files
        try {
          const audioDir = await Filesystem.readdir({
            path: 'audio',
            directory: Directory.Data,
          });
          
          const audioPattern = new RegExp(`^${bookId}_(\\d+)\\.mp3$`);
          result.audioFiles = audioDir.files
            .map(file => {
              const match = file.name.match(audioPattern);
              return match ? parseInt(match[1]) : null;
            })
            .filter(index => index !== null)
            .sort((a, b) => a - b);
        } catch {}
      }
    } catch (error) {
      console.error('Failed to list book files:', error);
    }

    return result;
  }

  // Delete all files for a book
  static async deleteBookFiles(bookId: string): Promise<void> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        // Delete processed content
        try {
          await Filesystem.deleteFile({
            path: `books/${bookId}.json`,
            directory: Directory.Data,
          });
        } catch {}

        // Delete raw file
        const rawMetadata = await this.getUserPreferences(`raw-book-${bookId}`);
        if (rawMetadata) {
          const extension = rawMetadata.fileName.split('.').pop() || 'bin';
          try {
            await Filesystem.deleteFile({
              path: `raw-books/${bookId}.${extension}`,
              directory: Directory.Data,
            });
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.remove({ key: `raw-book-${bookId}` });
          } catch {}
        }

        // Delete audio files
        const files = await this.listBookFiles(bookId);
        for (const chunkIndex of files.audioFiles) {
          try {
            await Filesystem.deleteFile({
              path: `audio/${bookId}_${chunkIndex}.mp3`,
              directory: Directory.Data,
            });
          } catch {}
        }
        
        console.log(`🗑️ Deleted all files for book: ${bookId}`);
      }
    } catch (error) {
      console.error('Failed to delete book files:', error);
    }
  }

  // Helper function to convert blob to base64
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // IndexedDB fallback methods
  private static async storeInIndexedDB(storeName: string, key: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BookBridgeCapacitor', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        store.put(data, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private static async getFromIndexedDB(storeName: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BookBridgeCapacitor', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          resolve(null);
          return;
        }
        
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}