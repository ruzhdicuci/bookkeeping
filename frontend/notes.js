const apiBase = 'https://bookkeeping-i8e0.onrender.com';
let notes = [];
let hideDone = false;

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function goToDashboard() {
  window.location.href = 'dashboard.html';
}

window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
  loadNotesFromDB();
});

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

  let filtered = hideDone ? notes.filter(n => !n.done) : [...notes];

  const sorted = filtered.sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  for (const note of sorted) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-entry';
    if (note.done) noteDiv.classList.add('done');

    const formattedDate = new Date(note.createdAt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    noteDiv.innerHTML = `
      <div class="note-title"><strong>${note.title}</strong></div>
      <small>${formattedDate}</small>
      <p>${note.content}</p>
      <div class="note-buttons">
        <button onclick="toggleDone('${note._id}')">${note.done ? '✅' : '✔️'}</button>
        <button onclick="editNote('${note._id}')">✏️</button>
        <button onclick="deleteNote('${note._id}')">🗑️</button>
      </div>
    `;
    container.appendChild(noteDiv);
  }
}

async function saveNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if (!title || !content) return alert('Please enter both title and content');

  const token = localStorage.getItem('token');
  const res = await fetch(`${apiBase}/api/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title, content })
  });

  if (res.ok) {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    loadNotesFromDB();
  } else {
    alert('Failed to save note');
  }
}

async function deleteNote(id) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${apiBase}/api/notes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) loadNotesFromDB();
}

function toggleHideDone() {
  hideDone = !hideDone;
  renderNotes();
}

function editNote(id) {
  const note = notes.find(n => n._id === id);
  if (!note) return;
  document.getElementById('noteTitle').value = note.title;
  document.getElementById('noteContent').value = note.content;
  deleteNote(id); // Replace old one on save
}

async function toggleDone(id) {
  const token = localStorage.getItem('token');
  const note = notes.find(n => n._id === id);
  if (!note) return;

  await fetch(`${apiBase}/api/notes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ done: !note.done })
  });

  loadNotesFromDB();
}