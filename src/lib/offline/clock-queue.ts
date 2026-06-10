export type QueuedClockActionType = "clockIn" | "clockOut" | "toggleBreak";

export type QueuedClockAction = {
  id: string;
  type: QueuedClockActionType;
  clientTimestamp: string;
  createdAt: string;
};

const DB_NAME = "vrema-offline";
const DB_VERSION = 1;
const STORE = "clock-queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB konnte nicht geöffnet werden"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

export async function enqueueClockAction(
  type: QueuedClockActionType,
  clientTimestamp = new Date().toISOString(),
): Promise<QueuedClockAction> {
  const action: QueuedClockAction = {
    id: crypto.randomUUID(),
    type,
    clientTimestamp,
    createdAt: new Date().toISOString(),
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).add(action);
  });
  db.close();
  return action;
}

export async function getQueuedClockActions(): Promise<QueuedClockAction[]> {
  const db = await openDb();
  const items = await new Promise<QueuedClockAction[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedClockAction[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeQueuedClockActions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE);
    for (const id of ids) store.delete(id);
  });
  db.close();
}

export async function getQueuedClockCount(): Promise<number> {
  const items = await getQueuedClockActions();
  return items.length;
}
