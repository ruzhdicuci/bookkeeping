import Dexie from "https://cdn.jsdelivr.net/npm/dexie@3.2.3/+esm";

export const db = new Dexie("BookkeepingApp");

db.version(1).stores({
  entries: "_id, date, amount, category, person, bank, synced, lastUpdated",
  notes: "_id, title, content, done, synced, lastUpdated"
});

// Save or update an entry locally
export async function saveEntryLocally(entry) {
  entry.synced = navigator.onLine;
  entry.lastUpdated = Date.now();
  await db.entries.put(entry);
}

// Save or update a note locally
export async function saveNoteLocally(note) {
  note._id = note._id || crypto.randomUUID();
  note.synced = navigator.onLine;
  note.lastUpdated = Date.now();
  await db.notes.put(note);
}


// Get unsynced entries or notes from local cache
export async function getUnsynced(type = "entries") {
  const all = await db[type].where("synced").equals(false).toArray();
  return all.filter(item => item._id && typeof item._id === 'string');
}

// Get all cached notes
export async function getCachedNotes() {
  return await db.notes.toArray();
}


// Mark an entry/note as synced
export async function markAsSynced(type, _id) {
  await db[type].update(_id, { synced: true });
}