export interface Recording {
  id: string;
  name: string;
  blob: Blob;
  timestamp: number;
  duration: number;
}

const DB_NAME = 'StudioDB';
const STORE_NAME = 'recordings';

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveLocalRecording = async (recording: Recording) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(recording);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const getLocalRecordings = async (): Promise<Recording[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
  });
};

export const deleteLocalRecording = async (id: string) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};