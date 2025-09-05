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

type PendingChange = {
  id?: number; // autoIncrement key (present when fetched)
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
};

export const useIndexedDB = () => {
  const isSupported = ref(false);

  // Keep this in sync across branches. Bump when schema changes.
  const DB_NAME = "LIFTDB";
  const DB_VERSION = 2;

  let db: IDBDatabase | null = null;

  // ----- helpers -----
  const hasWindow = () => typeof window !== "undefined";
  const checkSupport = () => {
    isSupported.value = hasWindow() && "indexedDB" in window;
    return isSupported.value;
  };

  const ensureDB = () => {
    if (!db) throw new Error("Database not initialized");
  };

  // ----- init -----
  const initDB = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!checkSupport()) {
        reject(new Error("IndexedDB not supported"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("❌ IndexedDB error:", request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn("⚠️ IndexedDB open request is blocked by another tab/session.");
      };

      request.onupgradeneeded = (event) => {
        const upgradedDB = (event.target as IDBOpenDBRequest).result;

        // userData: { userId (keyPath), templates, sessions, lastSync, user }
        if (!upgradedDB.objectStoreNames.contains("userData")) {
          const userDataStore = upgradedDB.createObjectStore("userData", { keyPath: "userId" });
          userDataStore.createIndex("lastSync", "lastSync", { unique: false });
        }

        // cache: { key (keyPath), data, timestamp, expiresAt }
        if (!upgradedDB.objectStoreNames.contains("cache")) {
          const cacheStore = upgradedDB.createObjectStore("cache", { keyPath: "key" });
          cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
        }

        // pendingChanges: autoIncrement id + { type, data, timestamp, retryCount }
        if (!upgradedDB.objectStoreNames.contains("pendingChanges")) {
          const pendingStore = upgradedDB.createObjectStore("pendingChanges", { keyPath: "id", autoIncrement: true });
          pendingStore.createIndex("type", "type", { unique: false });
          pendingStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        console.log("✅ IndexedDB schema prepared/updated");
      };

      request.onsuccess = () => {
        db = request.result;

        // Close the DB if a versionchange happens elsewhere (avoid blocked upgrades)
        db.onversionchange = () => {
          console.warn("ℹ️ IndexedDB version change detected; closing old connection.");
          db?.close();
          db = null;
        };

        console.log("✅ IndexedDB initialized successfully");
        resolve();
      };
    });

  // ----- sanitize to keep only serializable data -----
  const sanitize = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== "object") return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map((v) => sanitize(v));

    const clean: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("__v_") || typeof value === "function") continue;
      if (value === undefined) continue;

      try {
        JSON.stringify(value); // probe serializability
        clean[key] = sanitize(value);
      } catch {
        console.warn(`⚠️ Skipping non-serializable property: ${key}`, value);
      }
    }
    return clean;
  };

  // ----- user data -----
  const storeUserData = async (userId: string, data: Partial<UserData>): Promise<void> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["userData"], "readwrite");
      const store = tx.objectStore("userData");

      const userData: UserData = {
        templates: sanitize(data.templates) || [],
        sessions: sanitize(data.sessions) || [],
        lastSync: data.lastSync ?? Date.now(),
        user: sanitize(data.user) ?? null,
      };

      // Simple telemetry (safe)
      try {
        console.log("🧹 Final sanitized data:", {
          templatesCount: Array.isArray(userData.templates) ? userData.templates.length : 0,
          sessionsCount: Array.isArray(userData.sessions) ? userData.sessions.length : 0,
          userKeys: userData.user ? Object.keys(userData.user) : [],
        });
      } catch {
        // ignore console failures
      }

      const req = store.put({ userId, ...userData });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  const getUserData = async (userId: string): Promise<UserData | null> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["userData"], "readonly");
      const store = tx.objectStore("userData");
      const req = store.get(userId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  };

  // ----- generic cache -----
  const storeCache = async <T>(key: string, data: T, ttlMinutes = 60): Promise<void> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["cache"], "readwrite");
      const store = tx.objectStore("cache");

      const cacheItem: CacheItem<T> = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttlMinutes * 60 * 1000,
      };

      const req = store.put(cacheItem);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  const getCache = async <T>(key: string): Promise<T | null> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["cache"], "readonly");
      const store = tx.objectStore("cache");
      const req = store.get(key);

      req.onsuccess = () => {
        const item = req.result as CacheItem<T> | undefined;
        if (!item) {
          resolve(null);
          return;
        }

        if (item.expiresAt && Date.now() > item.expiresAt) {
          // clean up expired entry (best-effort, separate tx)
          deleteCache(key).catch(() => {});
          resolve(null);
          return;
        }

        resolve(item.data);
      };
      req.onerror = () => reject(req.error);
    });
  };

  const deleteCache = async (key: string): Promise<void> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["cache"], "readwrite");
      const store = tx.objectStore("cache");
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  // ----- pending changes -----
  const storePendingChange = async (type: string, data: any): Promise<number | void> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["pendingChanges"], "readwrite");
      const store = tx.objectStore("pendingChanges");

      const payload: PendingChange = {
        type,
        data: sanitize(data),
        timestamp: Date.now(),
        retryCount: 0,
      };

      const req = store.add(payload);
      req.onsuccess = () => {
        // Return the generated id for debugging if needed
        resolve(req.result as number);
      };
      req.onerror = () => reject(req.error);
    });
  };

  const getPendingChanges = async (): Promise<PendingChange[]> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["pendingChanges"], "readonly");
      const store = tx.objectStore("pendingChanges");
      const req = store.getAll();

      req.onsuccess = () => resolve((req.result as PendingChange[]) || []);
      req.onerror = () => reject(req.error);
    });
  };

  const removePendingChange = async (id: number): Promise<void> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["pendingChanges"], "readwrite");
      const store = tx.objectStore("pendingChanges");
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  // ----- maintenance -----
  const cleanupExpiredCache = async (): Promise<void> => {
    if (!db) return; // no-op if not initialized
    try {
      const tx = db.transaction(["cache"], "readwrite");
      const store = tx.objectStore("cache");
      const index = store.index("expiresAt");
      const now = Date.now();

      const req = index.openCursor(IDBKeyRange.upperBound(now));
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      // errors are purposely swallowed (background maintenance)
    } catch (err) {
      console.error("Error cleaning up expired cache:", err);
    }
  };

  const clearUserData = async (userId: string): Promise<void> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["userData", "cache", "pendingChanges"], "readwrite");

      tx.objectStore("userData").delete(userId);
      tx.objectStore("cache").clear();
      tx.objectStore("pendingChanges").clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  return {
    isSupported,
    initDB,

    // user data
    storeUserData,
    getUserData,
    clearUserData,

    // cache
    storeCache,
    getCache,
    deleteCache,
    cleanupExpiredCache,

    // pending changes
    storePendingChange,
    getPendingChanges,
    removePendingChange,
  };
};
