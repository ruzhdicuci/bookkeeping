import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.mjs';

const db = new Dexie('bookkeeping-db');

db.version(2).stores({
  entries: '_id, date, amount, category, person, bank, synced, lastUpdated',
  notes: '_id, title, content, done, synced, lastUpdated',
  balances: 'bank'
});

// ✅ Save single note
async function saveNoteLocally(note) {
  if (!note._id) {
    note._id = crypto.randomUUID();
  } else if (typeof note._id !== 'string') {
    // Convert _id object to string (handles MongoDB ObjectId format)
    try {
      note._id = note._id.toString();
    } catch (e) {
      console.warn("⚠️ Could not convert _id to string, generating new one");
      note._id = crypto.randomUUID();
    }
  }

  note.synced = navigator.onLine;
  note.lastUpdated = Date.now();

  try {
    await db.notes.put(note);
  } catch (err) {
    console.error("❌ Dexie put failed:", err, note);
  }
}

// ✅ Save multiple notes (overwrite cache)
async function saveAllNotesLocally(notesArray) {
  try {
    await db.notes.clear();
    await db.notes.bulkPut(notesArray);
  } catch (err) {
    console.error("❌ Failed to bulk save notes:", err);
  }
}

// ✅ Save single entry
async function saveEntryLocally(entry) {
  entry._id = entry._id || crypto.randomUUID();
  entry.synced = false;
  entry.lastUpdated = Date.now();
  await db.entries.put(entry);
}

// ✅ Save balances
async function saveBankBalances(balances) {
  try {
    await db.balances.clear();
    await db.balances.bulkPut(balances);
  } catch (err) {
    console.error('❌ Failed to save balances in Dexie:', err);
  }
}

// ✅ Get functions
async function getCachedNotes() {
  return await db.notes.toArray();
}

async function getCachedEntries() {
  try {
    const all = await db.entries.toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    console.error("❌ Failed to read cached entries:", err);
    return [];
  }
}

async function getCachedBankBalances() {
  try {
    return await db.balances.toArray();
  } catch (err) {
    console.error('❌ Failed to get cached balances from Dexie:', err);
    return [];
  }
}

async function getUnsynced(type = "entries") {
  try {
    const table = db[type];
    if (!table || typeof table.where !== 'function') {
      console.warn(`⚠️ Dexie table '${type}' not found or invalid.`);
      return [];
    }

    const all = await table.toArray();

    console.log(`📋 All ${type} loaded from Dexie:`, all);

    const filtered = all.filter(item =>
      item.synced === false &&
      item._id &&
      typeof item._id === 'string'
    );

    console.log(`📦 Unsynced ${type} entries: ${filtered.length}`, filtered);

    return filtered;
  } catch (err) {
    console.error(`❌ Dexie getUnsynced(${type}) failed:`, err);
    return [];
  }
}

async function markAsSynced(type, _id) {
  await db[type].update(_id, { synced: true });
}

// ✅ Export all at once (no inline `export function` anymore!)
export {
  db,
  saveNoteLocally,
  saveAllNotesLocally,
  saveEntryLocally,
  saveBankBalances,
  getCachedNotes,
  getCachedEntries,
  getCachedBankBalances,
  getUnsynced,
  markAsSynced
};

window.db = db; // ✅ Expose Dexie globally for debugging