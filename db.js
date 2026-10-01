// IndexedDB 래퍼: 모든 기록과 사진은 이 기기 안에만 저장된다.
const DB_NAME = 'snackjournal';
const DB_VERSION = 1;
const STORE = 'entries';

let dbPromise;

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('time', 'time');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const result = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export const db = {
  put: (entry) => tx('readwrite', (s) => s.put(entry)),
  get: (id) => tx('readonly', (s) => s.get(id)),
  delete: (id) => tx('readwrite', (s) => s.delete(id)),
  clear: () => tx('readwrite', (s) => s.clear()),
  all: () =>
    tx('readonly', (s) => s.getAll()).then((list) => list.sort((a, b) => b.time.localeCompare(a.time))),
};
