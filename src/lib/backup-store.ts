// IndexedDB-backed storage for farm backup blobs with retention pruning.
import type { FarmBackup } from './farm-backup';

const DB_NAME = 'farm_backups_db';
const STORE = 'backups';
const VERSION = 1;

export interface StoredBackup {
  id: string;            // `${farm_id}:${iso}`
  farm_id: string;
  created_at: string;    // ISO
  size: number;
  trigger: 'manual' | 'auto';
  backup: FarmBackup;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('farm_id', 'farm_id', { unique: false });
        os.createIndex('created_at', 'created_at', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBackup(farmId: string, backup: FarmBackup, trigger: 'manual' | 'auto'): Promise<StoredBackup> {
  const db = await openDb();
  const iso = new Date().toISOString();
  const serialized = JSON.stringify(backup);
  const entry: StoredBackup = {
    id: `${farmId}:${iso}`,
    farm_id: farmId,
    created_at: iso,
    size: serialized.length,
    trigger,
    backup,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return entry;
}

export async function listBackups(farmId: string): Promise<StoredBackup[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('farm_id').getAll(farmId);
    req.onsuccess = () => {
      const items = (req.result as StoredBackup[]).sort((a, b) => b.created_at.localeCompare(a.created_at));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBackup(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function pruneBackups(farmId: string, retentionDays: number, keepMax = 30): Promise<number> {
  const items = await listBackups(farmId);
  const cutoff = Date.now() - retentionDays * 86400000;
  const toDelete = items.filter((b, idx) => {
    const ageMs = Date.parse(b.created_at);
    return ageMs < cutoff || idx >= keepMax;
  });
  for (const b of toDelete) await deleteBackup(b.id);
  return toDelete.length;
}
