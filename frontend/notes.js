import {
  db,
  saveNoteLocally,
  saveAllNotesLocally,
  getCachedNotes,
  getUnsynced,
  markAsSynced
} from './dexieDb.js';

const apiBase = 'https://bookkeeping-i8e0.onrender.com';
let notes = [];
let hideDone = false;
let editingNoteId = null;

let currentSort = 'date'; // or 'title'

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function goToDashboard() {
  location.replace('dashboard.html');
}

// ✅ Sync notes with backend or fallback to Dexie
async function loadNotes() {
  try {
    const token = localStorage.getItem('token');
    const online = window.navigator.onLine;

    let notes;
    if (online && token) {
      const res = await fetch(`${apiBase}/api/notes`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Failed to fetch notes");

      notes = await res.json();

      // 🛠️ Sanitize _id values
      notes = notes.map(note => {
        if (typeof note._id !== 'string') {
          try {
            note._id = note._id.toString();
          } catch {
            note._id = crypto.randomUUID();
          }
        }
        return note;
      });

      await db.notes.clear();
      await db.notes.bulkPut(notes);
    } else {
      console.warn('📴 Offline: loading notes from Dexie');
      notes = await db.notes.toArray();
    }

    renderNotes(notes, currentSort);
  } catch (err) {
    console.error('Failed to load notes', err);
    const fallbackNotes = await db.notes.toArray();
    renderNotes(fallbackNotes, currentSort); // On error fallback
  }
}


function renderNotes(inputNotes = notes, sortBy = currentSort) {
  const container = document.getElementById('notesList');
  container.innerHTML = '';

  // ✅ Filter out corrupted/incomplete notes
  const cleanNotes = inputNotes.filter(n => n && n.title && n.content && n.createdAt);

  const filtered = hideDone ? inputNotes.filter(n => !n.done) : [...inputNotes];
 const sorted = sortBy === 'title'
  ? filtered.sort((a, b) => a.title.localeCompare(b.title))
  : filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const groups = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    'Last Week': [],
    Older: []
  };

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);

for (const note of sorted) {
  if (!note.createdAt || isNaN(new Date(note.createdAt))) continue; // ✅ skip bad notes

  const created = new Date(note.createdAt);
  const createdDate = created.toDateString();

  if (createdDate === today.toDateString()) {
    groups.Today.push(note);
  } else if (createdDate === yesterday.toDateString()) {
    groups.Yesterday.push(note);
  } else if (created > oneWeekAgo) {
    groups['This Week'].push(note);
  } else if (created <= oneWeekAgo) {
    groups['Last Week'].push(note);
  } else {
    groups.Older.push(note);
  }
}

  // Render each group
  for (const label of ['Today', 'Yesterday', 'This Week', 'Last Week', 'Older']) {
    if (groups[label].length > 0) {
      const heading = document.createElement('h4');
      heading.textContent = label;
      heading.className = 'date-group-heading';
      container.appendChild(heading);

for (const note of groups[label]) {
  if (!note.createdAt || isNaN(new Date(note.createdAt))) continue; // ✅ skip broken notes

  const noteDiv = document.createElement('div');
  noteDiv.className = `note-entry ${note.done ? 'done' : ''}`;
  noteDiv.setAttribute('data-id', note._id);

  const date = new Date(note.createdAt);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();

  noteDiv.innerHTML = `
    <div class="note-card ${note.done ? 'done' : ''}">
      <div class="note-date-vertical">
        <div class="note-day">${day}</div>
        <div class="note-month">${month}</div>
        <div class="note-year">${year}</div>
      </div>
      <div class="note-main">
        <div class="note-title"><strong>${note.title}</strong></div>
        <div class="note-content">${note.content}</div>
      </div>
      <div class="note-buttons">
        <button data-label="Done" onclick="toggleDone('${note._id}')">✔️</button>
        <button data-label="Edit" onclick="editNote('${note._id}')">✏️</button>
        <button data-label="Delete" onclick="openDeleteModal('${note._id}')">🗑️</button>
      </div>
    </div>
  `;
  container.appendChild(noteDiv);
}
    }
  }
}





// Save to Dexie and sync to cloud when online
async function syncNotesToCloud() {
  const unsynced = await getUnsynced("notes");
  console.log("🧪 Unsynced notes:", unsynced);

  for (const note of unsynced) {
    const cleanNote = JSON.parse(JSON.stringify(note));

    if (typeof cleanNote._id === 'object' && cleanNote._id !== null) {
      cleanNote._id = cleanNote._id.$oid || cleanNote._id.toString();
    }

    if (!cleanNote._id || typeof cleanNote._id !== 'string') {
      console.error("❌ Invalid or missing _id on cleanNote:", cleanNote);
      alert("❌ _id is still missing! Cannot sync note.");
      continue;
    }

    // ⬅️ Force-add all required fields
    const noteToSend = {
      _id: cleanNote._id,
      userId: cleanNote.userId || localStorage.getItem('userId'),
      title: cleanNote.title || '',
      content: cleanNote.content || '',
      done: cleanNote.done ?? false,
      createdAt: cleanNote.createdAt || new Date().toISOString(),
      synced: true,
      lastUpdated: cleanNote.lastUpdated || Date.now()
    };

    console.log("📤 Final note to send:", noteToSend);

    try {
      const res = await fetch(`${apiBase}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(noteToSend)
      });

      if (res.ok) {
        console.log(`✅ Synced note: ${noteToSend._id}`);
        await markAsSynced("notes", noteToSend._id);
      } else {
        const text = await res.text();
        console.error(`❌ Server rejected note (${res.status}):`, text);
      }
    } catch (err) {
      console.warn("❌ Sync failed:", err);
    }
  }
}
// sync to cloud


async function saveNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if (!title || !content) return alert('Please enter both title and content');

  const token = localStorage.getItem('token');
  const method = editingNoteId ? 'PUT' : 'POST';
  const url = editingNoteId
    ? `${apiBase}/api/notes/${editingNoteId}`
    : `${apiBase}/api/notes`;

const note = {
  _id: editingNoteId || crypto.randomUUID(),
  title,
  content,
  done: false,
  createdAt: new Date().toISOString(),
  synced: false, // 🔁 mark it as unsynced initially
  lastUpdated: new Date().toISOString() // 🕓 needed by Dexie
};

  try {
    await saveNoteLocally(note); // 💾 Always save locally first
  } catch (err) {
    console.error("❌ Failed to save note locally:", err);
    return;
  }

  // 🔁 Try to sync to backend if online
  if (navigator.onLine) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(note)
      });

      if (res.ok) {
        await markAsSynced("notes", note._id);
      } else {
        alert('❌ Failed to sync note to server');
      }
    } catch (err) {
      console.warn("🔁 Sync error — will retry later", err);
    }
  }

  // ✅ Reset form and reload
  editingNoteId = null;
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').value = '';
  loadNotes();
}

// sync note

function toggleHideDone() {
  hideDone = !hideDone;
  const btn = document.getElementById('toggleHideBtn');
  btn.textContent = hideDone ? '📑 Show Done' : '🪪 Hide Done';
  renderNotes(notes, currentSort);
}

function editNote(id) {
  const note = notes.find(n => n._id === id);
  if (!note) return;

  editingNoteId = id;
  document.getElementById('noteTitle').value = note.title;
  document.getElementById('noteContent').value = note.content;

  renderNotes(notes, currentSort);
  setTimeout(() => {
    const card = document.querySelector(`.note-entry[data-id="${id}"]`);
    if (card) {
      card.classList.add('highlight');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => card.classList.remove('highlight'), 1200);
    }
  }, 100);
}


function cancelEdit() {
  editingNoteId = null;
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').value = '';
  renderNotes(notes, currentSort);
}

function formatNoteDate(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day} ${month} ${year}, ${time}`;
}

let noteToDeleteId = null;
function openDeleteModal(id) {
  noteToDeleteId = id;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  noteToDeleteId = null;
  document.getElementById('deleteModal').classList.add('hidden');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!noteToDeleteId) return;
  const token = localStorage.getItem('token');
  const res = await fetch(`${apiBase}/api/notes/${noteToDeleteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    closeDeleteModal();
    loadNotes();
  }
});

let toggleDoneTargetId = null;
let toggleDoneCurrentState = false;

function closeDoneModal() {
  toggleDoneTargetId = null;
  document.getElementById('doneModal').classList.add('hidden');
}

async function toggleDone(id) {
  const note = notes.find(n => n._id === id);
  if (!note) return;

  const updatedDone = !note.done;
  note.done = updatedDone;
  note.synced = false;
  note.lastUpdated = Date.now();

  await saveNoteLocally(note); // local first

  if (navigator.onLine) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ done: updatedDone })
      });

      if (res.ok) await markAsSynced("notes", id);
    } catch (err) {
      console.warn("🔁 Could not sync toggle done", err);
    }
  }

  loadNotes();
}

window.addEventListener('DOMContentLoaded', async () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }

  try {
    const cached = await getCachedNotes();
    if (cached.length) {
      console.log("📦 Showing cached notes");
      notes = cached;             // ✅ IMPORTANT: update global notes array
      window.notes = notes;
      renderNotes(notes, currentSort); // After successful backend load
    }
  } catch (err) {
    console.warn("⚠️ Could not load cached notes", err);
  }

  await loadNotes(); // This will override notes again with fresh data

  if (navigator.onLine) syncNotesToCloud();
}); // ✅ This closes the async DOMContentLoaded block cleanly

// ✅ Outside the DOMContentLoaded scope — run anytime:
const cancelDelete = document.getElementById('cancelDeleteBtn');
if (cancelDelete) {
  cancelDelete.addEventListener('click', closeDeleteModal);
}

const cancelDone = document.getElementById('cancelDoneBtn');
if (cancelDone) {
  cancelDone.addEventListener('click', closeDoneModal);
}

const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!noteToDeleteId) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${apiBase}/api/notes/${noteToDeleteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      closeDeleteModal();
      loadNotes(); // ✅ Use loadNotes, not loadNotesFromDB
    }
  });
}

const confirmDoneBtn = document.getElementById('confirmDoneBtn');
if (confirmDoneBtn) {
  confirmDoneBtn.addEventListener('click', async () => {
    if (!toggleDoneTargetId) return;
    const token = localStorage.getItem('token');
    await fetch(`${apiBase}/api/notes/${toggleDoneTargetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ done: !toggleDoneCurrentState })
    });
    closeDoneModal();
    loadNotes(); // ✅ Use unified function
  });
}


  // Using JavaScript to open the page in fullscreen mode
    const elem = document.documentElement;
    function openFullscreen() {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
    }
    
    function closeFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }


    function setFontSize(size) {
  document.documentElement.style.setProperty('--app-font-size', size + 'px');
  console.log(`🔠 Font size set to ${size}px`);
}



window.setFontSize  = setFontSize 
window.openFullscreen  = openFullscreen 
window.closeFullscreen  = closeFullscreen 
window.goToDashboard = goToDashboard;
window.openDeleteModal = openDeleteModal;
window.toggleHideDone = toggleHideDone;
window.editNote = editNote;
window.toggleTheme = toggleTheme;
window.toggleDone = toggleDone;
window.saveNote = saveNote;
window.cancelEdit = cancelEdit;
window.formatNoteDate = formatNoteDate;
window.syncNotesToCloud = syncNotesToCloud; // ✅ optional if used from DOM or window
window.renderNotes = renderNotes
window.loadNotes = loadNotes;

// all your other functions above...
// like renderNotes(), saveNoteLocally(), getCachedNotes()...

window.addEventListener('online', async () => {
  const token = localStorage.getItem('token');
  const unsyncedNotes = await getUnsynced("notes");

  for (const note of unsyncedNotes) {
    const cleanNote = JSON.parse(JSON.stringify(note));
    const noteToSend = {
      _id: cleanNote._id,
      userId: cleanNote.userId || localStorage.getItem('userId'),
      title: cleanNote.title || '',
      content: cleanNote.content || '',
      done: cleanNote.done ?? false,
      createdAt: cleanNote.createdAt || new Date().toISOString(),
      synced: true,
      lastUpdated: cleanNote.lastUpdated || Date.now()
    };

    try {
      const res = await fetch(`${apiBase}/api/notes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteToSend)
      });

      if (res.ok) {
        await markAsSynced("notes", noteToSend._id);
      } else {
        const errText = await res.text();
        console.error(`❌ Failed to sync during 'online' event (${res.status}):`, errText);
      }
    } catch (err) {
      console.warn("❌ Sync error during 'online' event:", err);
    }
  }

  await loadNotes();
});


