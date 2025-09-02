import { ref } from "vue";

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

  // Keep version at 1 unless you change the schema (then bump).
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

        // Drop legacy generic cache store if it exists (not used anymore)
        if (upgradedDB.objectStoreNames.contains("cache")) {
          upgradedDB.deleteObjectStore("cache");
        }

        // pendingChanges: autoIncrement id + { type, data, timestamp, retryCount }
        if (!upgradedDB.objectStoreNames.contains("pendingChanges")) {
          const pendingStore = upgradedDB.createObjectStore("pendingChanges", { keyPath: "id", autoIncrement: true });
          pendingStore.createIndex("type", "type", { unique: false });
          pendingStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };

      request.onsuccess = () => {
        db = request.result;

        // Close the DB if a versionchange happens elsewhere (avoid blocked upgrades)
        db.onversionchange = () => {
          console.warn("ℹ️ IndexedDB version change detected; closing old connection.");
          db?.close();
          db = null;
        };

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

  // ----- generic cache (removed) -----

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
    return;
  };

  const clearUserData = async (userId: string): Promise<void> => {
    ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(["userData", "pendingChanges"], "readwrite");

      tx.objectStore("userData").delete(userId);
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

    // cache (removed; keep maintenance no-op for compatibility)
    cleanupExpiredCache,

    // pending changes
    storePendingChange,
    getPendingChanges,
    removePendingChange,
  };
};
