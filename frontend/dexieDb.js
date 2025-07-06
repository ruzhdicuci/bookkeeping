import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.mjs';

// ✅ Set backend base URL
const backend =
  location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://bookkeeping-i8e0.onrender.com';

export const db = new Dexie('bookkeeping-db');

// Always keep the highest version here
db.version(301).stores({
  entries: '_id, date, amount, category, person, bank, synced, lastUpdated, note',
  notes: '_id, title, content, done, synced, lastUpdated',
  balances: 'bank',
  customCards: '++id,name,limit,synced,lastUpdated'
});


// ✅ Universal Dexie write fallback handler
async function safeDexieWrite(fn, fallbackMessage = "⚠️ Offline cache issue. Reloading...") {
  try {
    await fn();
  } catch (err) {
    console.error("❌ Dexie write failed:", err);
    if (err.name === "InvalidStateError" || err.message.includes("indexedDB")) {
      alert(fallbackMessage);
      location.reload();
    }
  }
}


// ✅ Save single note
async function saveNoteLocally(note) {
  if (!note._id) {
    note._id = crypto.randomUUID();
  } else if (typeof note._id !== 'string') {
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

async function saveAllCustomCards(cards) {
  try {
    await db.customCards.clear();
    await db.customCards.bulkPut(cards.map(card => ({
      ...card,
      synced: navigator.onLine,
      lastUpdated: Date.now()
    })));
  } catch (err) {
    console.error('❌ Failed to save custom cards:', err);
  }
}

async function getCachedCustomCards() {
  try {
    return await db.customCards.toArray();
  } catch (err) {
    console.error("❌ Failed to load custom cards from Dexie:", err);
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

// ✅ Sync to MongoDB
// ✅ Sync to MongoDB with cleaned _id
async function syncCustomCardsToMongo() {
  try {
    const token = localStorage.getItem('token');

    const sanitizedCards = window.customCreditCards.map(card => {
      const { _id, ...rest } = card;
      return rest; // ✅ this returns the cleaned card without _id
    });

    const res = await fetch(`${backend}/api/custom-limits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ cards: sanitizedCards }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.details || errData.error || "Unknown error");
    }

    console.log("✅ Synced custom cards to MongoDB");
  } catch (err) {
    console.error("❌ Failed to sync custom cards to MongoDB:", err.message || err);
  }
}

// ✅ Load from MongoDB
async function loadCustomCardsFromMongo() {
  try {
    const res = await fetch(`${backend}/api/custom-limits`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await res.json();
    if (data.cards) {
      window.customCreditCards = data.cards;
      await saveAllCustomCards(data.cards);
    }
  } catch (err) {
    console.warn("⚠️ Failed to load custom cards from MongoDB:", err);
  }
}

async function getUnsyncedCustomCards() {
  try {
    const all = await db.customCards.toArray();
    return all.filter(card => card.synced === false);
  } catch (err) {
    console.error("❌ Failed to get unsynced custom cards:", err);
    return [];
  }
}

async function markAsSynced(type, _id) {
  await db[type].update(_id, { synced: true });
}

// ✅ Export all at once
export {
  saveNoteLocally,
  saveAllNotesLocally,
  saveEntryLocally,
  saveBankBalances,
  getCachedNotes,
  getCachedEntries,
  getCachedBankBalances,
  getUnsynced,
  markAsSynced,
  saveAllCustomCards,
  getCachedCustomCards,
  syncCustomCardsToMongo,
  loadCustomCardsFromMongo,
  getUnsyncedCustomCards,
  safeDexieWrite
};

window.db = db; // ✅ For debugging