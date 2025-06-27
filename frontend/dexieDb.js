import Dexie from 'dexie';

const db = new Dexie('bookkeeping-db');
db.version(1).stores({
  'offline-entries': '++id',
  entries: '_id, date, amount, category, person, bank, synced, lastUpdated',
  notes: '_id, title, content, done, synced, lastUpdated'
});

export function saveEntryLocally(entry) {
  return db['offline-entries'].add(entry);
}

export function getUnsynced() {
  return db['offline-entries'].toArray();
}

export function markAsSynced(id) {
  return db['offline-entries'].delete(id);
}

export default db;

// ✅ For entries
export async function saveEntryLocally(entry) {
  entry._id = entry._id || crypto.randomUUID(); // Ensure ID is always present
  entry.synced = navigator.onLine;
  entry.lastUpdated = Date.now();
  await db.entries.put(entry);
}

// ✅ For notes
export async function saveNoteLocally(note) {
  note._id = note._id || crypto.randomUUID();

  // 🛑 Defensive check
  if (!note._id || typeof note._id !== 'string') {
    console.error("❌ BAD _id passed to Dexie:", note);
    return; // Stop before Dexie crashes
  }

  note.synced = navigator.onLine;
  note.lastUpdated = Date.now();

  try {
    await db.notes.put(note);
  } catch (err) {
    console.error("❌ Dexie put failed:", err, note);
  }
}

// Get unsynced entries or notes from local cache
export async function getUnsynced(type = "entries") {
  try {
    const table = db[type];

    // ✅ Check that 'synced' is an indexed field and the table exists
    if (!table || typeof table.where !== 'function') {
      console.warn(`⚠️ Dexie table '${type}' not found or invalid.`);
      return [];
    }

    // ✅ Extra defensive: filter only valid records where synced === false
    const all = await table.toArray();
    const filtered = all.filter(item =>
      item.synced === false &&
      item._id &&
      typeof item._id === 'string'
    );

    if (filtered.length < all.length) {
      console.warn(`⚠️ Filtered out ${all.length - filtered.length} invalid '${type}' entries`);
    }

    return filtered;
  } catch (err) {
    console.error(`❌ Dexie getUnsynced(${type}) failed:`, err);
    return [];
  }
}


// Get all cached notes
export async function getCachedNotes() {
  return await db.notes.toArray();
}


// Mark an entry/note as synced
export async function markAsSynced(type, _id) {
  await db[type].update(_id, { synced: true });
}

// Get all cached bookkeeping entries
export async function getCachedEntries() {
  return await db.entries.toArray();
}