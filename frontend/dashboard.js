
const token = localStorage.getItem('token');
if (!token) location.href = 'index.html';

const entryTableBody = document.getElementById('entryTableBody');
const monthSelect = document.getElementById('monthSelect');
const personFilter = document.getElementById('personFilter');
const bankFilter = document.getElementById('bankFilter');

const balanceEl = document.getElementById('balance');

const currencyFilter = document.getElementById('currencyFilter');
const typeFilter = document.getElementById('typeFilter');
const descSearch = document.getElementById('descSearch');
const amountSearch = document.getElementById('amountSearch');
const cleanAmountInput = amountSearch.value.replace(/[^\d.-]/g, '');



monthSelect.onchange =
  bankFilter.onchange =
  typeFilter.onchange =
  currencyFilter.onchange =
  descSearch.oninput =
  amountSearch.oninput = renderEntries;

// Person checkboxes
document.addEventListener('change', (e) => {
  if (e.target.matches('#personOptions input[type="checkbox"]')) {
    renderEntries();
  }
});


let initialBankBalances = {}; // will be populated from form
const storedBalances = localStorage.getItem('initialBankBalances');
if (storedBalances) {
  initialBankBalances = JSON.parse(storedBalances);
}

let entries = [];



  fetchEntries(); // this will repopulate dropdowns automatically
  



// ✅ Corrected fetchEntries with dynamic person/bank dropdown population
async function fetchEntries() {
  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
    headers: { Authorization: `Bearer ${token}` }
  });
  entries = await res.json();

  populateFilters();
  renderBankBalanceForm();
  renderEntries();
   e.target.reset();
 fetchEntries(); // this will repopulate dropdowns automatically
  // ✅ ADD THIS HERE:
setTimeout(() => {
  populateBankDropdownFromBalances();
}, 0);

}



function populateNewEntryDropdowns() {
  const persons = [...new Set(entries.map(e => e.person))].filter(Boolean);
  const banks = [...new Set(entries.map(e => e.bank))].filter(Boolean);

  const personList = document.getElementById('personList');
  const bankList = document.getElementById('bankList');

  personList.innerHTML = persons.map(p => `<option value="${p}">`).join('');
  bankList.innerHTML = banks.map(b => `<option value="${b}">`).join('');

  console.log("👤 Loaded persons:", persons);
  console.log("🏦 Loaded banks:", banks);
}


// Populate New Entry bank dropdown based on Account Balances table
function populateBankDropdownFromBalances() {
  const bankTable = document.querySelector('#bankBalanceTableContainer table');
if (!bankTable) return;

const bankCells = bankTable.querySelectorAll('thead th');
  console.log("🏦 Bank headers found:", [...bankCells].map(th => th.textContent));

  const bankSelect = document.getElementById('newBank');
  bankSelect.innerHTML = '<option value="">Select bank</option>';

  bankCells.forEach((th, index) => {
    if (index > 0) {
      const bankName = th.textContent.trim();
      const option = document.createElement('option');
      option.value = bankName;
      option.textContent = bankName;
      bankSelect.appendChild(option);
    }
  });
}



function populateFilters() {
  const months = [...new Set(entries.map(e => e.date.slice(0, 7)))].sort();
  const prevMonth = monthSelect.value;
  const prevBank = bankFilter.value;

  monthSelect.innerHTML = `<option value="">All</option>` + months.map(m => `<option value="${m}">${m}</option>`).join('');
  monthSelect.value = months.includes(prevMonth) ? prevMonth : "";

  const banks = [...new Set(entries.map(e => e.bank))].filter(Boolean);
  bankFilter.innerHTML = `<option value="">All</option>` + banks.map(b => `<option value="${b}">${b}</option>`).join('');
  bankFilter.value = banks.includes(prevBank) ? prevBank : "";

  // ✅ PERSON DROPDOWN
  const persons = [...new Set(entries.map(e => e.person))].filter(Boolean);
  const personOptions = document.getElementById('personOptions');

// Add "All" checkbox at the top
personOptions.innerHTML = `
  <label style="display: block;">
    <input type="checkbox" id="selectAllPersons" checked />
    <strong>All</strong>
  </label>
` + persons
  .map(p => `
    <label style="display: block;">
      <input type="checkbox" name="personFilter" value="${p}" checked />
      ${p}
    </label>
  `).join('');

// Toggle all checkboxes when "All" is clicked
document.getElementById('selectAllPersons').addEventListener('change', function () {
  const all = this.checked;
  document.querySelectorAll('[name="personFilter"]').forEach(cb => {
    cb.checked = all;
  });
  renderEntries();
});

// Update "All" checkbox state if any single one is unchecked
document.querySelectorAll('[name="personFilter"]').forEach(cb => {
  cb.addEventListener('change', () => {
    const allChecked = Array.from(document.querySelectorAll('[name="personFilter"]')).every(cb => cb.checked);
    document.getElementById('selectAllPersons').checked = allChecked;
    renderEntries();
  });
});

  // Attach change listeners
  personOptions.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', renderEntries);
  });
}


function populatePersonCheckboxes() {
  const persons = [...new Set(entries.map(e => e.person))].filter(Boolean);
  const container = document.getElementById('personOptions');

  const saved = JSON.parse(localStorage.getItem('personFilterValues') || '[]');

  container.innerHTML = persons.map(p => `
    <label>
      <input type="checkbox" value="${p}" ${saved.includes(p) ? 'checked' : ''} onchange="handlePersonCheckboxChange()"> ${p}
    </label>
  `).join('');
}

function handlePersonCheckboxChange() {
  const selected = [...document.querySelectorAll('#personOptions input:checked')].map(cb => cb.value);
  localStorage.setItem('personFilterValues', JSON.stringify(selected));
  renderEntries();
}


function renderEntries() {
   const searchAmount = parseFloat(amountSearch.value);

  const filtered = entries.filter(e =>
    (!monthSelect.value || e.date.startsWith(monthSelect.value)) &&
(() => {
  const selected = Array.from(document.querySelectorAll('[name="personFilter"]:checked')).map(cb => cb.value);
  return selected.length === 0 || selected.includes(e.person);
})()
 &&
    (!bankFilter.value || e.bank === bankFilter.value) &&
    (!typeFilter.value || e.type === typeFilter.value) &&
    (!currencyFilter.value || e.currency === currencyFilter.value) &&
    (!descSearch.value || e.description.toLowerCase().includes(descSearch.value.toLowerCase())) &&
    (amountSearch.value === '' || String(e.amount).includes(amountSearch.value))
    
  );


  entryTableBody.innerHTML = '';

  let incomeTotal = 0;
  let expenseTotal = 0;
 



filtered.forEach(e => {
if (e.type === 'income') {
  incomeTotal += e.amount;
} else if (e.type === 'expense' || e.type === 'transfer') {
  expenseTotal += e.amount;
}

  const row = document.createElement('tr');
  row.dataset.id = e._id;
  row.innerHTML = `
    <td contenteditable="true" data-field="date">${e.date}</td>
    <td contenteditable="true" data-field="description">${e.description}</td>
    <td contenteditable="true" data-field="amount">${e.amount}</td>
    <td contenteditable="true" data-field="currency">${e.currency || ''}</td>
    <td contenteditable="true" data-field="type">${e.type}</td>
    <td contenteditable="true" data-field="person">${e.person}</td>
    <td contenteditable="true" data-field="bank">${e.bank}</td>
    <td><button onclick="deleteEntry('${e._id}')" > Delete</button></td>
  `;
  row.querySelectorAll('[contenteditable]').forEach(cell => {
    cell.addEventListener('blur', () => saveEdit(row));
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cell.blur();
      }
    });
  });
  entryTableBody.appendChild(row);
 
});

  const balance = incomeTotal - expenseTotal;
  document.getElementById('totalIncome').textContent = incomeTotal.toFixed(2);
  document.getElementById('totalExpense').textContent = expenseTotal.toFixed(2);
  document.getElementById('totalBalance').textContent = balance.toFixed(2);
  balanceEl.textContent = balance.toFixed(2);




  filtered.forEach(e => {
    balance += e.type === 'income' ? e.amount : -e.amount;
    const row = document.createElement('tr');
    row.dataset.id = e._id;
   row.innerHTML = `
  <td contenteditable="true" data-field="date">${e.date}</td>
  <td contenteditable="true" data-field="description">${e.description}</td>
  <td contenteditable="true" data-field="amount">${e.amount}</td>
  <td contenteditable="true" data-field="currency">${e.currency || ''}</td>
  <td contenteditable="true" data-field="type">${e.type}</td>
  <td contenteditable="true" data-field="person">${e.person}</td>
  <td contenteditable="true" data-field="bank">${e.bank}</td>
  <td><button onclick="deleteEntry('${e._id}')">🗑️</button></td>
`;

    row.querySelectorAll('[contenteditable]').forEach(cell => {
      cell.addEventListener('blur', () => saveEdit(row));
      cell.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          cell.blur();
        }
      });
    });
    entryTableBody.appendChild(row);
  });

  balanceEl.textContent = balance.toFixed(2);
 
}

async function saveEdit(row) {
  const id = row.dataset.id;
  const updated = {};
  row.querySelectorAll('[contenteditable]').forEach(cell => {
    const field = cell.dataset.field;
    updated[field] = field === 'amount' ? parseFloat(cell.textContent) : cell.textContent.trim();
  });

  await fetch(`https://bookkeeping-i8e0.onrender.com/api/entries/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updated)
  });

  fetchEntries();
}

async function deleteEntry(id) {
  await fetch(`https://bookkeeping-i8e0.onrender.com/api/entries/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  fetchEntries();
}



function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const rows = [...entryTableBody.querySelectorAll('tr')].map(row =>
    [...row.children].map(td => td.textContent)
  );

  pdf.text("Monthly Report", 20, 10);
  rows.forEach((r, i) => {
    pdf.text(r.join(" | "), 10, 20 + i * 10);
  });

  pdf.save("monthly_report.pdf");
}

function toggleTheme() {
  document.body.classList.toggle('dark');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html'; // ✅ use correct login page
}




// Safely import only the entries section from a combined CSV

document.getElementById('importCSV').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.trim().split('\n');

  // Skip to 'Entries' section if the file is combined
  const entriesStartIndex = lines.findIndex(line => line.trim() === 'Entries');
  const headersIndex = entriesStartIndex >= 0 ? entriesStartIndex + 1 : 0;

  const headers = lines[headersIndex].split(',');

  for (let i = headersIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim() === 'Bank Balances') break;

    const row = line.split(',');
    if (row.length < 7) continue;

    const entry = {
      date: row[0],
      description: row[1],
      amount: parseFloat(row[2]),
      currency: row[3],
      type: row[4],
      person: row[5],
      bank: row[6]
    };

    await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entry)
    });
  }

  alert('✅ Entries Imported!');
  fetchEntries();
});


// Export both entries and bank balances into a single CSV file
function exportCombinedCSV() {
  const entryHeaders = ['date', 'description', 'amount', 'currency', 'type', 'person', 'bank'];
  const entryRows = entries.map(e => [e.date, e.description, e.amount, e.currency, e.type, e.person, e.bank]);

  const bankHeaders = ['Bank', ...new Set(entries.map(e => e.bank).filter(Boolean))];
  const initialRow = ['Initial'];
  const changeRow = ['Change'];

  // Get banks in consistent order
  const banks = bankHeaders.slice(1);

  // Build initial balances row
  banks.forEach(bank => {
    initialRow.push(initialBankBalances[bank] ?? 0);
  });

  // Calculate net changes
  const changes = {};
  banks.forEach(bank => changes[bank] = 0);
  entries.forEach(e => {
    if (changes[e.bank] != null) {
      changes[e.bank] += e.type === 'income' ? e.amount : -e.amount;
    }
  });
  banks.forEach(bank => {
    changeRow.push(changes[bank].toFixed(2));
  });

  const csvSections = [];
  csvSections.push('Entries');
  csvSections.push(entryHeaders.join(','));
  csvSections.push(...entryRows.map(r => r.join(',')));
  csvSections.push('', 'Bank Balances');
  csvSections.push(bankHeaders.join(','));
  csvSections.push(initialRow.join(','));
  csvSections.push(changeRow.join(','));

  const csvContent = csvSections.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'bookkeeping_combined.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}



async function deleteAllEntries() {
  if (!confirm("Are you sure you want to delete all entries?")) return;

  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/entries/delete-all', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  if (data.success) {
    alert("✅ All entries deleted.");
    fetchEntries();
  }
}


document.getElementById('entryForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const entry = {
    date: document.getElementById('newDate').value,
    description: document.getElementById('newDescription').value,
    amount: parseFloat(document.getElementById('newAmount').value),
    currency: document.getElementById('newCurrency').value,
    type: document.getElementById('newType').value,
    person: document.getElementById('newPerson').value,
    bank: document.getElementById('newBank').value,
  };

  await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entry)
  });

  


  e.target.reset();
  fetchEntries();
  populateNewEntryDropdowns();

});



function renderBankBalanceForm() {
  const container = document.getElementById('bankBalanceTableContainer');
  const banks = [...new Set(entries.map(e => e.bank).filter(Boolean))];

  if (!banks.length) {
    container.innerHTML = `<p>No bank data available yet.</p>`;
    return;
  }

  // Collect net changes
  const changes = {};
  banks.forEach(bank => {
    changes[bank] = 0;
  });

  entries.forEach(e => {
    if (changes[e.bank] != null) {
      changes[e.bank] += (e.type === 'income' ? e.amount : -e.amount);
    }
  });

  // Create table HTML
  let html = '<table><thead><tr><th></th>';
  banks.forEach(bank => {
    html += `<th>${bank}</th>`;
  });
  html += '</tr></thead><tbody>';

  // Row 1: Initial balances (editable)
  html += '<tr><td><strong>Initial</strong></td>';
  banks.forEach(bank => {
    const val = initialBankBalances[bank] ?? 0;
    html += `<td>
  <input type="number" step="0.01" data-bank="${bank}" value="${val}" ${window.initialLocked ? 'readonly' : ''} />
</td>
`;
  });
  html += '</tr>';

  // Row 2: Net change from entries
  html += '<tr><td><strong>Change</strong></td>';
  banks.forEach(bank => {
    const delta = changes[bank] ?? 0;
    const color = delta < 0 ? '#ff695d' : '#13a07f';
    html += `<td style="color:${color}">${delta.toFixed(2)}</td>`;
  });
  html += '</tr>';

  html += '</tbody></table><button id="saveBankBalances" onclick="saveBankBalances()">Save</button>';
html += `<button id="lockbalance" onclick="toggleLock()">${window.initialLocked ? 'Unlock' : 'Lock'}</button>`;



  container.innerHTML = html;
}

//

window.initialLocked = false;

function toggleLock() {
  window.initialLocked = !window.initialLocked;
  renderBankBalanceForm(); // re-render to apply readonly toggle
}



function saveBankBalances() {
  const inputs = document.querySelectorAll('[data-bank]');
  inputs.forEach(input => {
    const bank = input.dataset.bank;
    initialBankBalances[bank] = parseFloat(input.value) || 0;
  });

  // ✅ Save to localStorage
  localStorage.setItem('initialBankBalances', JSON.stringify(initialBankBalances));

  renderBankBalanceForm();
  renderEntries();
}


document.getElementById('bankBalanceForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const inputs = document.querySelectorAll('#bankInputs input');
  inputs.forEach(input => {
    const bank = input.dataset.bank;
    initialBankBalances[bank] = parseFloat(input.value) || 0;
  });

  renderEntries(); // update chart + table + balances
balanceEl.textContent = balance.toFixed(2);

});



// Wait for render to complete
setTimeout(() => {
  const mainTable = document.querySelector('table'); // or a better selector if needed
  const bankTable = document.querySelector('#bankBalanceTableContainer table');
  if (mainTable && bankTable) {
    bankTable.style.width = `${mainTable.offsetWidth}px`;
  }
}, 0);



// Backup all entries and initial balances to a JSON file
function backupData() {
  const backup = {
    entries,
    initialBankBalances
  };

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:T]/g, '-').split('.')[0]; // e.g., 2025-05-22-15-32-10
  const filename = `bookkeeping_backup_${timestamp}.json`;

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();
}



// Restore from JSON backup file (with safe ID handling)
function restoreBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(evt) {
    const data = JSON.parse(evt.target.result);

    if (Array.isArray(data.entries)) {
      for (const entry of data.entries) {
        if (entry._id) delete entry._id; // 🧼 Remove _id to avoid MongoDB duplicate error

        await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entry)
        });
      }
    }

    if (data.initialBankBalances) {
      localStorage.setItem('initialBankBalances', JSON.stringify(data.initialBankBalances));
    }

    alert('✅ Backup restored!');
    fetchEntries();
  };

  reader.readAsText(file);
}


// Fetch and populate login dropdown with registered users
async function populateLoginUserDropdown() {
  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/users');
  const users = await res.json();

  const loginSelect = document.getElementById('loginUserSelect');
  loginSelect.innerHTML = users.map(email => `<option value="${email}">${email}</option>`).join('');

  const lastUser = localStorage.getItem('lastLoginUser');
  if (lastUser && users.includes(lastUser)) {
    loginSelect.value = lastUser;
  }
}

// Fetch and populate login dropdown with registered users
async function populateLoginUserDropdown() {
  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/users');
  const users = await res.json();

  const loginSelect = document.getElementById('loginUserSelect');
  loginSelect.innerHTML = users.map(email => `<option value="${email}">${email}</option>`).join('');

  const lastUser = localStorage.getItem('lastLoginUser');
  if (lastUser && users.includes(lastUser)) {
    loginSelect.value = lastUser;
  }
}

// Triggered on login submit
async function loginWithSelectedUser() {
  const email = document.getElementById('loginUserSelect').value;
  const password = document.getElementById('loginPassword').value;

  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', email);
    localStorage.setItem('lastLoginUser', email);
    location.href = 'dashboard.html';
  } else {
    alert(data.message);
  }
}

// Call on login page load
window.addEventListener('DOMContentLoaded', populateLoginUserDropdown);







// Entry point to trigger popup
function openUserManager() {
  showUserManagerModal();
}

// Show clean user manager modal (with delete and change PW only)
async function showUserManagerModal() {
  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/users');
  const users = await res.json();

  const currentUser = localStorage.getItem('currentUser') || 'default';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>User Management</h3>
      <ul id="userList">
        ${users.map(user => `
          <li>
            ${user}
            ${user !== currentUser ? `
              <button onclick="deleteUser('${user}')">🗑️</button>
            ` : ''}
            <button onclick="showChangePassword('${user}')">🔒 Change PW</button>
          </li>
        `).join('')}
      </ul>
      <button onclick="closeModal()">❌ Close</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.querySelector('.modal');
  if (modal) modal.remove();
}



function deleteUser(email) {
  fetch(`https://bookkeeping-i8e0.onrender.com/api/users/${encodeURIComponent(email)}`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'User deleted');
      closeModal();
      showUserManagerModal();
    })
    .catch(err => alert('❌ Could not delete user'));
}

function showChangePassword(email) {
  const newPassword = prompt(`Set new password for ${email}:`);
  if (!newPassword) return;

  fetch(`https://bookkeeping-i8e0.onrender.com/api/users/${encodeURIComponent(email)}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword })
  })
    .then(res => res.json())
    .then(data => alert(data.message || 'Password updated.'))
    .catch(err => alert('❌ Failed to change password'));
}


function showChangePassword(user) {
  const newPassword = prompt(`Set new password for ${user}:`);
  if (!newPassword) return;

  fetch(`https://bookkeeping-i8e0.onrender.com/api/users/${encodeURIComponent(user)}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword })
  })
    .then(res => res.json())
    .then(data => alert(data.message || 'Password updated.'))
    .catch(err => alert('❌ Failed to change password'));
}

function getSelectedPersons() {
  return Array.from(document.querySelectorAll('#personOptions input[type="checkbox"]:checked')).map(cb => cb.value);
}

function togglePersonDropdown() {
  const options = document.getElementById('personOptions');
  options.style.display = options.style.display === 'none' ? 'block' : 'none';
}
