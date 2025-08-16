import { ref } from "vue";

interface CacheItem<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
}

interface UserData {
  templates: any[];
  sessions: any[];
  lastSync: number;
  user: any;
}

export const useIndexedDB = () => {
  const isSupported = ref(false);
  const dbName = "FremvDB";
  const version = 1;
  let db: IDBDatabase | null = null;

  // Check if IndexedDB is supported
  const checkSupport = () => {
    isSupported.value = "indexedDB" in window;
    return isSupported.value;
  };

  // Initialize database
  const initDB = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!checkSupport()) {
        reject(new Error("IndexedDB not supported"));
        return;
      }

      const request = indexedDB.open(dbName, version);

      request.onerror = () => {
        console.error("❌ IndexedDB error:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log("✅ IndexedDB initialized successfully");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains("userData")) {
          const userDataStore = db.createObjectStore("userData", { keyPath: "userId" });
          userDataStore.createIndex("lastSync", "lastSync", { unique: false });
        }

        if (!db.objectStoreNames.contains("cache")) {
          const cacheStore = db.createObjectStore("cache", { keyPath: "key" });
          cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
        }

        if (!db.objectStoreNames.contains("pendingChanges")) {
          const pendingStore = db.createObjectStore("pendingChanges", { keyPath: "id", autoIncrement: true });
          pendingStore.createIndex("type", "type", { unique: false });
          pendingStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        console.log("✅ IndexedDB schema upgraded");
      };
    });
  };

  // Store user data
  const storeUserData = async (userId: string, data: Partial<UserData>): Promise<void> => {
    if (!db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["userData"], "readwrite");
      const store = transaction.objectStore("userData");

      // Final data sanitization to ensure IndexedDB compatibility
      const sanitizeData = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== "object") return obj;
        if (obj instanceof Date) return obj.toISOString();

        if (Array.isArray(obj)) {
          return obj.map((item) => sanitizeData(item));
        }

        const clean: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Skip Vue reactive properties and functions
          if (key.startsWith("__v_") || typeof value === "function") {
            continue;
          }

          // Skip undefined values
          if (value === undefined) {
            continue;
          }

          try {
            // Test if this value can be serialized
            JSON.stringify(value);
            clean[key] = sanitizeData(value);
          } catch {
            // Skip non-serializable values
            console.warn(`⚠️ Skipping non-serializable property: ${key}`, value);
            continue;
          }
        }
        return clean;
      };

      const userData: UserData = {
        templates: sanitizeData(data.templates) || [],
        sessions: sanitizeData(data.sessions) || [],
        lastSync: data.lastSync || Date.now(),
        user: sanitizeData(data.user) || null,
      };

      console.log("🧹 Final sanitized data for IndexedDB:", {
        templatesCount: userData.templates?.length || 0,
        sessionsCount: userData.sessions?.length || 0,
        userKeys: userData.user ? Object.keys(userData.user) : [],
      });

      const request = store.put({ userId, ...userData });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // Get user data
  const getUserData = async (userId: string): Promise<UserData | null> => {
    if (!db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["userData"], "readonly");
      const store = transaction.objectStore("userData");
      const request = store.get(userId);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  };

  // Store cache item
  const storeCache = async <T>(key: string, data: T, ttlMinutes: number = 60): Promise<void> => {
    if (!db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["cache"], "readwrite");
      const store = transaction.objectStore("cache");

      const cacheItem: CacheItem<T> = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttlMinutes * 60 * 1000,
      };

      const request = store.put(cacheItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // Get cache item
  const getCache = async <T>(key: string): Promise<T | null> => {
    if (!db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["cache"], "readonly");
      const store = transaction.objectStore("cache");
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result) {
          const item: CacheItem<T> = request.result;

          // Check if expired
          if (item.expiresAt && Date.now() > item.expiresAt) {
            // Remove expired item
            deleteCache(key);
            resolve(null);
            return;
          }

          resolve(item.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  };

  // Delete cache item
  const deleteCache = async (key: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["cache"], "readwrite");
      const store = transaction.objectStore("cache");
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // Store pending change for later sync
  const storePendingChange = async (type: string, data: any): Promise<void> => {
    if (!db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["pendingChanges"], "readwrite");
      const store = transaction.objectStore("pendingChanges");

      const pendingChange = {
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const request = store.add(pendingChange);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // Get pending changes
  const getPendingChanges = async (): Promise<any[]> => {
    if (!db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["pendingChanges"], "readonly");
      const store = transaction.objectStore("pendingChanges");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  };

  // Remove pending change after successful sync
  const removePendingChange = async (id: number): Promise<void> => {
    if (!db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["pendingChanges"], "readwrite");
      const store = transaction.objectStore("pendingChanges");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // Clear expired cache items
  const cleanupExpiredCache = async (): Promise<void> => {
    if (!db) return;

    try {
      const transaction = db.transaction(["cache"], "readwrite");
      const store = transaction.objectStore("cache");
      const index = store.index("expiresAt");
      const now = Date.now();

      const request = index.openCursor(IDBKeyRange.upperBound(now));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    } catch (error) {
      console.error("Error cleaning up expired cache:", error);
    }
  };

  // Clear all data for a user
  const clearUserData = async (userId: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["userData", "cache", "pendingChanges"], "readwrite");

      // Clear user data
      const userDataStore = transaction.objectStore("userData");
      userDataStore.delete(userId);

      // Clear cache
      const cacheStore = transaction.objectStore("cache");
      cacheStore.clear();

      // Clear pending changes
      const pendingStore = transaction.objectStore("pendingChanges");
      pendingStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  };

  return {
    isSupported,
    initDB,
    storeUserData,
    getUserData,
    storeCache,
    getCache,
    deleteCache,
    storePendingChange,
    getPendingChanges,
    removePendingChange,
    cleanupExpiredCache,
    clearUserData,
  };
};
