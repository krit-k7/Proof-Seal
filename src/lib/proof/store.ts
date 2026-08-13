import type { ProofMetadata } from './types';

const DB_NAME = 'shadowstamp';
const DB_VERSION = 1;
const STORE_NAME = 'proofs';

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('owner', 'owner', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const resolveRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const saveProof = async (metadata: ProofMetadata): Promise<void> => {
  const db = await openDatabase();
  const store = db
    .transaction(STORE_NAME, 'readwrite')
    .objectStore(STORE_NAME);
  await resolveRequest(store.put(metadata));
};

export const getProof = async (id: string): Promise<ProofMetadata | undefined> => {
  const db = await openDatabase();
  const store = db.transaction(STORE_NAME).objectStore(STORE_NAME);
  return resolveRequest(store.get(id));
};

export const getAllProofs = async (): Promise<ProofMetadata[]> => {
  const db = await openDatabase();
  const store = db.transaction(STORE_NAME).objectStore(STORE_NAME);
  return resolveRequest(store.getAll());
};

export const deleteProof = async (id: string): Promise<void> => {
  const db = await openDatabase();
  const store = db
    .transaction(STORE_NAME, 'readwrite')
    .objectStore(STORE_NAME);
  await resolveRequest(store.delete(id));
};