'use client';
import { openDB } from 'idb';

export async function getDB() {
  return await openDB('visualization-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('labelData')) {
        db.createObjectStore('labelData');
      }
      if (!db.objectStoreNames.contains('vecsData')) {
        db.createObjectStore('vecsData');
      }
    },
  });
}

export async function saveToCache(key, data) {
  const db = await getDB();
  await db.put(key === 'label' ? 'labelData' : 'vecsData', data, 'cached');
}

export async function getFromCache(key) {
  const db = await getDB();
  return await db.get(key === 'label' ? 'labelData' : 'vecsData', 'cached');
}

// ✅ 正确清除单个缓存
export async function deleteFromCache(key) {
  const db = await getDB();
  const storeName = key === 'label' ? 'labelData' : 'vecsData';
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).delete('cached');
  await tx.done;
}

// ✅ 新增：清除所有缓存
export async function clearAllCache() {
  const db = await getDB();
  await db.clear('labelData');
  await db.clear('vecsData');
}
