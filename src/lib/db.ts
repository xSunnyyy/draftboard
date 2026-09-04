import type { Draft } from '../types'

const DB_NAME = 'draftboard'
const DB_VERSION = 1
const DRAFTS_STORE = 'drafts'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFTS_STORE, mode)
    const store = tx.objectStore(DRAFTS_STORE)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listDrafts(): Promise<Draft[]> {
  const all = await withStore<Draft[]>('readonly', (s) => s.getAll())
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function saveDraft(draft: Draft): Promise<void> {
  return withStore('readwrite', (s) => s.put(draft)).then(() => undefined)
}

export function deleteDraft(id: string): Promise<void> {
  return withStore('readwrite', (s) => s.delete(id)).then(() => undefined)
}

export function getDraft(id: string): Promise<Draft | undefined> {
  return withStore('readonly', (s) => s.get(id))
}
