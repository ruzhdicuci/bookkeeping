
const token = localStorage.getItem('token');

if (!token) {
  console.error('❌ No token found. Please log in.');
  // Optionally redirect:
  // window.location.href = '/login.html';
}
const backend = 'https://bookkeeping-i8e0.onrender.com';



const entryTableBody = document.getElementById('entryTableBody');
const monthSelect = document.getElementById('monthSelect');
const catgorySelect = document.getElementById('categorySelect');
const personFilter = document.getElementById('personFilter');
const bankFilter = document.getElementById('bankFilter');

const balanceEl = document.getElementById('balance');

const currencyFilter = document.getElementById('currencyFilter');
const categoryFilter = document.getElementById('categoryFilter');
const typeFilter = document.getElementById('typeFilter');
const dateSearch = document.getElementById('dateSearch');
const descSearch = document.getElementById('descSearch');
const amountSearch = document.getElementById('amountSearch');



monthSelect.onchange =
  bankFilter.onchange =
  typeFilter.onchange =
  currencyFilter.onchange =
  categoryFilter.onchange =
  descSearch.oninput =
   dateSearch.oninput =
 
   amountSearch.oninput = renderEntries;


// Person checkboxes
document.addEventListener('change', (e) => {
  if (e.target.matches('#personOptions input[type="checkbox"]')) {
    renderEntries();
  }
});
window.entries = [];


let initialBankBalances = {};

async function loadInitialBankBalances() {
  try {
    const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/balances', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to load balances');

    initialBankBalances = await res.json();
    localStorage.setItem('initialBankBalances', JSON.stringify(initialBankBalances));
  } catch (err) {
    console.warn('⚠️ Could not load balances from backend. Using localStorage fallback.');
    const local = localStorage.getItem('initialBankBalances');
    if (local) initialBankBalances = JSON.parse(local);
  }
}


async function fetchEntries() {
  try {
    const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch entries');

    window.entries = await res.json();
    console.log("📦 Entries:", window.entries);

    renderEntries(); // ✅ This populates the table
    populateNewEntryDropdowns(); // ✅ Person, Bank, Category lists
    populateFilters(); // ✅ Category filter dropdown, months, etc.

  } catch (err) {
    console.error('❌ fetchEntries failed:', err);
  }
}




  function populateNewEntryDropdowns() {
    const persons = [...new Set(window.entries.map(e => e.person))].filter(Boolean);
    const banks = [...new Set(window.entries.map(e => e.bank))].filter(Boolean);
    const categories = [...new Set(window.entries.map(e => e.category))].filter(Boolean);

    const personList = document.getElementById('personList');
    const bankList = document.getElementById('bankList');
    const categoryList = document.getElementById('newCategoryList');

    if (personList) personList.innerHTML = persons.map(p => `<option value="${p}">`).join('');
    if (bankList) bankList.innerHTML = banks.map(b => `<option value="${b}">`).join('');
    if (categoryList) categoryList.innerHTML = categories.map(c => `<option value="${c}">`).join('');

    console.log("👤 Loaded persons:", persons);
    console.log("🏦 Loaded banks:", banks);
    console.log("🏷️ Loaded categories:", categories);
  }



// Populate New Entry bank dropdown based on Account Balances table
function populateBankDropdownFromBalances() {
  const bankTable = document.querySelector('#bankBalanceTableContainer table');
if (!bankTable) return;

const bankCells = bankTable.querySelectorAll('thead th');
const banks = [...bankCells].slice(1).map(th => th.textContent.replace(/\s+/g, ' ').trim());
console.log("🏦 Bank headers found:", banks);



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

  monthSelect.innerHTML = `<option value="">All</option>` +
    months.map(m => `<option value="${m}">${m}</option>`).join('');
  monthSelect.value = months.includes(prevMonth) ? prevMonth : "";

  const banks = [...new Set(entries.map(e => e.bank))].filter(Boolean);
  bankFilter.innerHTML = `<option value="">All</option>` +
    banks.map(b => `<option value="${b}">${b}</option>`).join('');
  bankFilter.value = banks.includes(prevBank) ? prevBank : "";

  // ✅ CATEGORY FILTER — THIS IS MISSING
  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    const categories = [...new Set(entries.map(e => e.category).filter(Boolean))];
    categoryFilter.innerHTML =
      `<option value="All">All</option>` +
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // ✅ PERSON CHECKBOX FILTERS
  const persons = [...new Set(entries.map(e => e.person))].filter(Boolean);
  const personOptions = document.getElementById('personOptions');

  personOptions.innerHTML = `
    <div class="personOptionGroup">
      <label><input type="checkbox" id="selectAllPersons" /> <strong>All</strong></label>
      ${persons.map(p => `
        <label>
          <input type="checkbox" class="personOption" name="personFilter" value="${p}" checked />
          ${p}
        </label>
      `).join('')}
    </div>
  `;

  // Handle "Select All"
  document.getElementById('selectAllPersons').addEventListener('change', function () {
    const allChecked = this.checked;
    document.querySelectorAll('.personOption').forEach(cb => cb.checked = allChecked);
    renderEntries();
  });

  // Handle individual checkboxes
  document.querySelectorAll('.personOption').forEach(cb => {
    cb.addEventListener('change', () => {
      const all = document.querySelectorAll('.personOption');
      const checked = document.querySelectorAll('.personOption:checked');
      document.getElementById('selectAllPersons').checked = all.length === checked.length;
      renderEntries();
    });
  });
}




function renderEntries() {
  const dateQuery = dateSearch.value.trim().toLowerCase();
  const searchAmount = parseFloat(amountSearch.value || "0");
  const selectedPersons = Array.from(document.querySelectorAll('.personOption:checked')).map(cb => cb.value);
  const categoryFilter = document.getElementById('categoryFilter');
  const categoryValue = categoryFilter?.value || "All";
const dayQuery = dateSearch.value.trim();
let selectedDays = new Set();

dayQuery.split(',').forEach(part => {
  const trimmed = part.trim();
  if (trimmed.includes('-')) {
    const [start, end] = trimmed.split('-').map(Number);
    for (let i = start; i <= end; i++) {
      selectedDays.add(i.toString().padStart(2, '0'));
    }
  } else if (trimmed) {
    selectedDays.add(trimmed.padStart(2, '0'));
  }
});

  // ✅ Filter entries
  const filtered = entries.filter(e => {
    const daySearch = dateSearch.value.trim();
const entryDay = e.date?.split('-')[2];
    const description = (e.description || '').toLowerCase();

 return (
  (selectedDays.size === 0 || selectedDays.has(entryDay)) &&
  (!monthSelect.value || e.date.startsWith(monthSelect.value)) &&
  (selectedPersons.length === 0 || selectedPersons.includes(e.person)) &&
  (!bankFilter.value || e.bank === bankFilter.value) &&
  (!typeFilter.value || e.type === typeFilter.value) &&
  (!currencyFilter.value || e.currency === currencyFilter.value) &&
  (!descSearch.value || (e.description || '').toLowerCase().includes(descSearch.value.toLowerCase())) &&
  (categoryValue === "All" || e.category === categoryValue) &&
(amountSearch.value === '' || (e.amount + '').toLowerCase().includes(amountSearch.value.toLowerCase()))
);
  });

  // ✅ Rebuild table
  entryTableBody.innerHTML = '';
  filtered.forEach(e => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${e.date}</td>
      <td>${e.description}</td>
      <td>${e.amount}</td>
      <td>${e.currency || ''}</td>
      <td>${e.type}</td>
      <td>${e.person}</td>
      <td>${e.bank}</td>
      <td>${e.category || ''}</td>
      <td>
        <button onclick="editEntry('${e._id}')">✏️</button>
        <button onclick="deleteEntry('${e._id}')">🗑️</button>
      </td>
    `;
    entryTableBody.appendChild(row);
  });

  // ✅ Update totals
  let incomeTotal = 0, expenseTotal = 0;
  filtered.forEach(e => {
    const amount = parseFloat(e.amount) || 0;
    if ((e.type || '').toLowerCase() === 'income') incomeTotal += amount;
    else expenseTotal += amount;
  });

  document.getElementById('totalIncome').textContent = incomeTotal.toFixed(2);
  document.getElementById('totalExpense').textContent = expenseTotal.toFixed(2);
  document.getElementById('totalBalance').textContent = (incomeTotal - expenseTotal).toFixed(2);
}




function editEntry(id) {
  const entry = window.entries.find(e => e._id === id);
  if (!entry) return alert("Entry not found.");

  // Prefill form fields
  
  document.getElementById('newDate')._flatpickr.setDate(new Date(entry.date));

  document.getElementById('newDescription').value = entry.description;
  document.getElementById('newCategory').value = entry.category || '';
  document.getElementById('newAmount').value = entry.amount;
  document.getElementById('newCurrency').value = entry.currency;
  document.getElementById('newType').value = entry.type;
  document.getElementById('newPerson').value = entry.person;
  document.getElementById('newBank').value = entry.bank;

  document.getElementById('entryForm').dataset.editId = id;
  document.getElementById('newDescription').focus();
}





async function saveEdit(row) {
  const id = row.dataset.id;
  const updated = {};

  row.querySelectorAll('[contenteditable]').forEach(cell => {
    const field = cell.dataset.field;
    if (!field) return;

    let value = cell.textContent.trim();
    if (field === 'amount') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        alert('❌ Invalid number in Amount field.');
        return;
      }
      updated[field] = num;
    } else {
      updated[field] = value;
    }
  });

  // Optional: require all fields to be non-empty
  if (!updated.date || !updated.description || isNaN(updated.amount)) {
    alert("⚠️ Some required fields are empty or invalid.");
    return;
  }

  try {
    const res = await fetch(`https://bookkeeping-i8e0.onrender.com/api/entries/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updated)
    });

    if (!res.ok) {
      const data = await res.json();
      alert(`❌ Failed to save: ${data.message || res.statusText}`);
    } else {
      fetchEntries();
    }
  } catch (err) {
    console.error('❌ Save error:', err);
    alert('❌ Could not save changes.');
  }
}


async function deleteEntry(id) {
  await fetch(`https://bookkeeping-i8e0.onrender.com/api/entries/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  await fetchEntries();             // Reload updated entries
  renderEntries();                  // Refresh visible table
  populateNewEntryDropdowns();     // Rebuild inputs with updated data
  populateFilters();               // Rebuild filters
  renderBankBalanceForm();         // ✅ Refresh bank balance table
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
  const body = document.body;
  const icon = document.getElementById('themeToggle');

  const isDark = body.classList.toggle('dark');
  if (icon) {
    icon.textContent = isDark ? '☀️' : '🌙';
  }
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





async function fetchBalancesFromBackend() {
  try {
    const res = await fetch(`${backend}/api/balances`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    initialBankBalances = data;
    localStorage.setItem('initialBankBalances', JSON.stringify(initialBankBalances));
  } catch (err) {
    console.warn('⚠️ Could not fetch balances from cloud. Using localStorage fallback.');
    const stored = localStorage.getItem('initialBankBalances');
    if (stored) initialBankBalances = JSON.parse(stored);
  }
}




function renderBankBalanceForm() {
  const container = document.getElementById('bankBalanceTableContainer');
  const banks = [...new Set(entries.map(e => e.bank).filter(Boolean))];

  if (!banks.length) {
    container.innerHTML = `<p>No bank data available yet.</p>`;
    return;
  }

  // Collect net changes
  const changes = {};
  banks.forEach(bank => (changes[bank] = 0));

  entries.forEach(e => {
    const bank = e.bank;
    const type = (e.type || '').trim().toLowerCase();
    const amount = Math.abs(parseFloat(e.amount)) || 0;

    if (changes[bank] != null) {
      changes[bank] += (type === 'income') ? amount : -amount;
    }
  });

  // Create table HTML
  let html = '<table><thead><tr><th></th>';
  banks.forEach(bank => {
    html += `<th>${bank}</th>`;
  });
  html += '</tr></thead><tbody>';

  // Row 1: Initial balances
  html += '<tr><td><a id="h4">26 Maj 2025</a></td>';
  banks.forEach(bank => {
    const val = initialBankBalances[bank] ?? 0;
    html += `<td><input type="number" step="0.01" data-bank="${bank}" value="${val}" ${window.initialLocked ? 'readonly' : ''} /></td>`;
  });
  html += '</tr>';

  // Row 2: Change
  html += '<tr><td><a id="h4">Change</a></td>';
  banks.forEach(bank => {
    const delta = changes[bank] ?? 0;
    const color = delta < 0 ? '#ff695d' : '#13a07f';
    html += `<td id="center1" style="color:${color}">${delta.toFixed(2)}</td>`;
  });
  html += '</tr>';
  html += '</tbody></table>';


  // ✅ Calculate totals
  let totalPositive = 0;
  let totalNegative = 0;
  Object.values(changes).forEach(val => {
    if (val > 0) totalPositive += val;
    else totalNegative += val;
  });

  // ✅ Append summary
html += `
  <div style="display: flex; align-items: center; gap: 1.5rem; margin-top: 1rem; flex-wrap: wrap;">
    <button id="saveBankBalances" onclick="saveBankBalances()">Save</button>
    <button id="lockbalance" onclick="toggleLock()">${window.initialLocked ? 'Unlock' : 'Lock'}</button>
    
    <div style="display: flex; gap: 1rem; align-items: center;">
      <span>Total Plus:&nbsp; 
        <span style="color: rgb(15, 158, 123); font-size: 22px; ">+${totalPositive.toFixed(2)}</span>
      </span>&nbsp;&nbsp;
      <span>Total Minus:&nbsp; 
        <span style="color: rgb(254, 110, 38); font-size: 22px; ">${totalNegative.toFixed(2)}</span>
      </span>
    </div>
  </div>
`;

  container.innerHTML = html;
    // ✅ Trigger update for dependent components (like credit limit table)
  window.dispatchEvent(new Event('bankBalanceUpdated'));
}

window.initialLocked = true;



async function saveBankBalances() {
  const inputs = document.querySelectorAll('[data-bank]');
  inputs.forEach(input => {
    const bank = input.dataset.bank;
    initialBankBalances[bank] = parseFloat(input.value) || 0;
  });

  localStorage.setItem('initialBankBalances', JSON.stringify(initialBankBalances)); // Optional

  // ✅ Save to MongoDB backend
  await fetch('https://bookkeeping-i8e0.onrender.com/api/balances', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(initialBankBalances),
  });

  renderBankBalanceForm();
  renderEntries();
}







// Resize alignment for consistency
setTimeout(() => {
  const mainTable = document.querySelector('table');
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
  const loginSelect = document.getElementById('loginUserSelect');
  if (!loginSelect) return; // ✅ exit safely if not on login page

  try {
    const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/users');
    const users = await res.json();

    loginSelect.innerHTML = users.map(email => `<option value="${email}">${email}</option>`).join('');

    const lastUser = localStorage.getItem('lastLoginUser');
    if (lastUser && users.includes(lastUser)) {
      loginSelect.value = lastUser;
    }
  } catch (err) {
    console.error('❌ Failed to fetch users:', err);
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

    // ✅ Redirect only after login — fetch will run on dashboard page
    location.href = 'dashboard.html';

  } else {
    alert(data.message);
  }
}



// Save to backend
async function saveBankBalancesToBackend() {
  await fetch('https://bookkeeping-i8e0.onrender.com/api/balances', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(initialBankBalances)
  });
}

// Load from backend
async function loadBankBalancesFromBackend() {
  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/balances', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  initialBankBalances = await res.json();
  localStorage.setItem('initialBankBalances', JSON.stringify(initialBankBalances));
}



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
  if (options) {
    options.style.display = options.style.display === 'none' ? 'block' : 'none';
  }
}

function calculateCurrentBankBalance(bankName) {
  return entries
    .filter(e => e.bank === bankName)
    .reduce((sum, e) => {
      const amount = parseFloat(e.amount) || 0;
      return e.type === 'Income' ? sum + amount
           : e.type === 'Expense' ? sum - amount
           : sum;
    }, 0);
}




function toggleLock() {
  window.initialLocked = !window.initialLocked;
  renderBankBalanceForm();
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




        // Initial zoom level
        let zoomLevel = 1;

        // Function to update the zoom
        function updateZoom() {
            document.body.style.zoom = zoomLevel;
        }

        // Zoom in button
        document.getElementById('zoomInButton').addEventListener('click', () => {
            zoomLevel += 0.1;
            updateZoom();
        });

        // Zoom out button
        document.getElementById('zoomOutButton').addEventListener('click', () => {
            zoomLevel -= 0.1;
            updateZoom();
        });

        // Reset zoom button
        document.getElementById('resetZoomButton').addEventListener('click', () => {
            zoomLevel = 1;
            updateZoom();
        });
 

 document.addEventListener('click', function (e) {
  const dropdown = document.getElementById('personOptions');
  const toggle = document.getElementById('personMultiSelect');

  if (!dropdown || !toggle) return;

  // If the dropdown is open and the click is outside both the toggle and the dropdown
  if (
    dropdown.style.display === 'block' &&
    !dropdown.contains(e.target) &&
    !toggle.contains(e.target)
  ) {
    dropdown.style.display = 'none';
  }
});



  
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('newDate');
  if (!dateInput) return;

  const fp = flatpickr(dateInput, {
    dateFormat: "Y-m-d",
    defaultDate: new Date()
  });

  if (!dateInput.value) {
    fp.setDate(new Date());
  }
});




// ✅ Initialization
window.addEventListener('DOMContentLoaded', async () => {
  await fetchEntries();
  await loadInitialBankBalances();
  await loadCreditLimits();

  populateNewEntryDropdowns();
  populateFilters();
  renderEntries();
  renderBankBalanceForm();
});

// ✅ Lockable inputs
const limitInputs = {
  ubs: document.getElementById('creditLimit-ubs'),
  corner: document.getElementById('creditLimit-corner'),
  pfm: document.getElementById('creditLimit-pfm'),
  cembra: document.getElementById('creditLimit-cembra'),
};

const lockBtn = document.getElementById('lockBtn');
const unlockBtn = document.getElementById('unlockBtn');

function setLockState(locked) {
  Object.values(limitInputs).forEach(input => input.disabled = locked);
  lockBtn.style.display = locked ? 'none' : 'inline-block';
  unlockBtn.style.display = locked ? 'inline-block' : 'none';
}

// ✅ Render credit limit calculationsunction renderCreditLimitTable() {
  function renderCreditLimitTable() {
  const limits = {
    "UBS Master": parseFloat(document.getElementById("creditLimit-ubs")?.value || 0),
    "Corner": parseFloat(document.getElementById("creditLimit-corner")?.value || 0),
    "Postfinance Master": parseFloat(document.getElementById("creditLimit-pfm")?.value || 0),
    "Cembra": parseFloat(document.getElementById("creditLimit-cembra")?.value || 0)
  };

  const banks = Object.keys(limits);
  const changes = {};
  const allChanges = {};

  const headerCells = document.querySelectorAll("#bankBalanceTableContainer thead th");
  const changeCells = document.querySelectorAll("#bankBalanceTableContainer tbody tr:nth-child(2) td");
console.log("🔍 Parsed bank headers:", [...headerCells].map(th => `[${th.textContent.trim()}]`));

  headerCells.forEach((th, i) => {
    const bank = th.textContent.trim();
    const val = parseFloat(changeCells[i]?.textContent) || 0;
    allChanges[bank] = val;
    if (banks.includes(bank)) {
      changes[bank] = val;
    }
  });

  if (!("Cembra" in allChanges)) {
    allChanges["Cembra"] = 0;
  }

  const totalPlus = Object.entries(allChanges)
    .filter(([_, value]) => value > 0)
    .reduce((sum, [, value]) => sum + value, 0);

  let totalLimit = 0, totalUsed = 0;
  banks.forEach(bank => {
    const credit = limits[bank];
    const used = Math.abs(changes[bank] || 0);
    totalLimit += credit;
    totalUsed += used;
  });

  const difference = totalLimit - totalUsed;
  const limitPlusTotal = difference + totalPlus;

 document.getElementById("totalLimit").value = totalLimit.toFixed(2);
document.getElementById("totalUsed").value = totalUsed.toFixed(2);
document.getElementById("diffUsed").value = difference.toFixed(2);
document.getElementById("limitPlusTotal").value = limitPlusTotal.toFixed(2);

  applyValueColor(document.getElementById('totalUsed'), totalUsed);
  applyValueColor(document.getElementById('limitPlusTotal'), limitPlusTotal);
  applyValueColor(document.getElementById("diffUsed"), difference);

 
} // ← ✅ END of renderCreditLimitTable

// ✅ Load credit limits from backend
async function loadCreditLimits() {
  try {
    const res = await fetch(`${backend}/api/limits`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    limitInputs.ubs.value = (data.ubs ?? 3000).toString();
    limitInputs.corner.value = (data.corner ?? 9900).toString();
    limitInputs.pfm.value = (data.pfm ?? 1000).toString();
    limitInputs.cembra.value = (data.cembra ?? 10000).toString();

    window.initialLocked = data.locked ?? true;
    setLockState(window.initialLocked);
    renderCreditLimitTable();
  } catch (err) {
    console.error("❌ Failed to load limits:", err);
  }
}

// ✅ Save to backend
function saveCreditLimits() {
  const limits = {
    ubs: parseFloat(limitInputs.ubs.value || 0),
    corner: parseFloat(limitInputs.corner.value || 0),
    pfm: parseFloat(limitInputs.pfm.value || 0),
    cembra: parseFloat(limitInputs.cembra.value || 0),
    locked: window.initialLocked ?? true
  };

  fetch(`${backend}/api/limits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(limits)
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to save credit limits.");
      alert("✅ Kredit limits saved");
      renderCreditLimitTable();
    })
    .catch(err => {
      console.error("❌ Failed to save limits:", err);
      alert("❌ Could not save limits");
    });
}

// ✅ Hook up lock/unlock
unlockBtn.addEventListener('click', () => {
  setLockState(false); // just unlocks inputs
  // Don't save yet
});
lockBtn.addEventListener('click', () => {
  setLockState(true);
  saveCreditLimits();
});

// ✅ Recalculate on input change
['creditLimit-ubs', 'creditLimit-corner', 'creditLimit-pfm', 'creditLimit-cembra'].forEach(id => {
  const input = document.getElementById(id);
  if (input) input.addEventListener('input', renderCreditLimitTable);
});

window.addEventListener('entriesUpdated', renderCreditLimitTable);
window.addEventListener('bankBalanceUpdated', renderCreditLimitTable);

// ✅ Color helper
function applyValueColor(input, value) {
  input.classList.remove('positive', 'negative', 'neutral');
  if (value > 0) input.classList.add('positive');
  else if (value < 0) input.classList.add('negative');
  else input.classList.add('neutral');
  input.value = value.toFixed(2);
}