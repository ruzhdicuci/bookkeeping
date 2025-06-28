// At the top of dexieDb.js
import Dexie from 'dexie';

const db = new Dexie('bookkeeping-db');

db.version(2).stores({
  entries: '_id, date, amount, category, person, bank, synced, lastUpdated',
  notes: '_id, title, content, done, synced, lastUpdated',
  balances: 'bank'
});

// ✅ Define your functions here (DO NOT export individually below)
async function saveNoteLocally(note) {
  note._id = note._id || crypto.randomUUID();
  note.lastUpdated = Date.now();
  note.synced = false;
  await db.notes.put(note);
}

async function saveAllNotesLocally(notesArray) {
  await db.notes.clear();
  await db.notes.bulkPut(notesArray);
}

// add your other functions: getCachedNotes, getUnsynced, markAsSynced, etc.

// ✅ Export everything ONCE at the bottom:
export {
  db,
  saveNoteLocally,
  saveAllNotesLocally,
  getCachedNotes,
  getUnsynced,
  markAsSynced,
  getCachedBankBalances,
  saveEntryLocally
};

// Save an array of balances (overwrites existing entries)
export async function saveBankBalances(balances) {
  try {
    await db.balances.clear(); // optional: remove old ones
    await db.balances.bulkPut(balances); // fast insert/update
  } catch (err) {
    console.error('❌ Failed to save balances in Dexie:', err);
  }
}

// Get all cached balances
export async function getCachedBankBalances() {
  try {
    return await db.balances.toArray();
  } catch (err) {
    console.error('❌ Failed to get cached balances from Dexie:', err);
    return [];
  }
}


// ✅ Get all unsynced entries or notes
export async function getUnsynced(type = "entries") {
  try {
    const table = db[type];
    if (!table || typeof table.where !== 'function') {
      console.warn(`⚠️ Dexie table '${type}' not found or invalid.`);
      return [];
    }

    const all = await table.toArray();
    return all.filter(item =>
      item.synced === false &&
      item._id &&
      typeof item._id === 'string'
    );
  } catch (err) {
    console.error(`❌ Dexie getUnsynced(${type}) failed:`, err);
    return [];
  }
}

// ✅ Mark item as synced
export async function markAsSynced(type, _id) {
  await db[type].update(_id, { synced: true });
}

// ✅ Get all cached entries
export async function getCachedEntries() {
  try {
    const all = await db.entries.toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date)); // newest first
  } catch (err) {
    console.error("❌ Failed to read cached entries:", err);
    return [];
  }
}

// ✅ Get all cached notes
export async function getCachedNotes() {
  return await db.notes.toArray();
}



// ✅ Save entry to entries table
export async function saveEntryLocally(entry) {
  entry._id = entry._id || crypto.randomUUID(); // Ensure ID is present
entry.synced = false;
  entry.lastUpdated = Date.now();
  await db.entries.put(entry);
}

// ✅ Save note to notes table
export async function saveNoteLocally(note) {
  note._id = note._id || crypto.randomUUID();
console.log("💾 Saving note locally:", note);
  if (!note._id || typeof note._id !== 'string') {
    console.error("❌ BAD _id passed to Dexie:", note);
    return;
  }

  note.synced = navigator.onLine;
  note.lastUpdated = Date.now();

  try {
    await db.notes.put(note);
  } catch (err) {
    console.error("❌ Dexie put failed:", err, note);
  }
}
