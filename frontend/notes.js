const apiBase = 'https://bookkeeping-i8e0.onrender.com';
let notes = [];
let hideDone = false;
let editingNoteId = null;
let deleteTargetId = null;

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function goToDashboard() {
  window.location.href = 'dashboard.html';
}



async function loadNotesFromDB() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${apiBase}/api/notes`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.ok) {
    notes = await res.json();
    renderNotes();
  } else {
    console.error('Failed to fetch notes');
  }
}

function renderNotes(sortBy = 'date') {
  const container = document.getElementById('notesList');
  container.innerHTML = '';

  const filtered = hideDone ? notes.filter(n => !n.done) : [...notes];
  const sorted = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-entry';
        noteDiv.setAttribute('data-id', note._id);

        const date = new Date(note.createdAt);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();

        noteDiv.innerHTML = `
          <div class="note-card">
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
              <button data-label="Delete" onclick="openDeleteModal('${note._id}')">🥡</button>
            </div>
          </div>
        `;
        container.appendChild(noteDiv);
      }
    }
  }
}



async function saveNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if (!title || !content) return alert('Please enter both title and content');

  const token = localStorage.getItem('token');
  const method = editingNoteId ? 'PUT' : 'POST';
  const url = editingNoteId
    ? `${apiBase}/api/notes/${editingNoteId}`
    : `${apiBase}/api/notes`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title, content })
  });

  if (res.ok) {
    editingNoteId = null;
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    loadNotesFromDB();
  } else {
    alert('Failed to save note');
  }
}

function toggleHideDone() {
  hideDone = !hideDone;
  const btn = document.getElementById('toggleHideBtn');
  if (btn) btn.textContent = hideDone ? '📑 Show Done' : '🪪 Hide Done';
  renderNotes();
}

function editNote(id) {
  const note = notes.find(n => n._id === id);
  if (!note) return;

  editingNoteId = id;
  document.getElementById('noteTitle').value = note.title;
  document.getElementById('noteContent').value = note.content;

  renderNotes();
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
  renderNotes();
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
    loadNotesFromDB();
  }
});

let toggleDoneTargetId = null;
let toggleDoneCurrentState = false;

function closeDoneModal() {
  toggleDoneTargetId = null;
  document.getElementById('doneModal').classList.add('hidden');
}



window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }

  loadNotesFromDB();

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
        loadNotesFromDB();
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
      loadNotesFromDB();
    });
  }
});