
const apiBase = 'https://bookkeeping-i8e0.onrender.com';
const token = localStorage.getItem('token');

if (!token) {
  console.error('❌ No token found. Please log in.');
  // Optionally redirect:
  // window.location.href = '/login.html';
}




const entryTableBody = document.getElementById('entryTableBody');

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
let entries = [];

// Set up event listeners for other filters
bankFilter.onchange =
  typeFilter.onchange =
  currencyFilter.onchange =
  categoryFilter.onchange =
  descSearch.oninput =
  dateSearch.oninput =
  amountSearch.oninput = renderEntries;

document.getElementById('categorySearch').addEventListener('input', renderEntries);

// ✅ Setup for new checkbox-based month filter
document.querySelectorAll('.monthOption, #selectAllMonths').forEach(cb => {
  cb.addEventListener('change', renderEntries);
});

// Attach event listener to month checkboxes
document.querySelectorAll('#monthOptions input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => {
    renderBankBalanceForm(); // ✅ re-calculate table
  });
});
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

    const data = await res.json();
    entries = data; // ✅ Assign after fetch
    console.log("📦 Entries:", entries);

    renderEntries(); // ✅ Use only after assignment
    populateNewEntryDropdowns();
    populateFilters();

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
  if (!window.entries || !Array.isArray(window.entries)) return;

  const months = [...new Set(entries.map(e => e.date?.slice(0, 7)))].sort();
  const banks = [...new Set(entries.map(e => e.bank).filter(Boolean))];
  const categories = [...new Set(entries.map(e => e.category).filter(Boolean))];
  const persons = [...new Set(entries.map(e => e.person).filter(Boolean))];

// ✅ MONTH CHECKBOX FILTER
const uniqueMonths = [...new Set(entries.map(e => e.date?.slice(0, 7)))].filter(Boolean).sort();
const monthContainer = document.getElementById('monthOptions');

monthContainer.innerHTML = `
  <label><input type="checkbox" id="selectAllMonths" checked /> <strong>All</strong></label>
  <hr style="margin: 4px 0;">
  ${uniqueMonths.map(m => `
    <label>
      <input type="checkbox" class="monthOption" value="${m}" checked />
      ${m}
    </label>
  `).join('')}
`;

// ✅ Handle Select All
document.getElementById('selectAllMonths').addEventListener('change', function () {
  const allChecked = this.checked;
  document.querySelectorAll('.monthOption').forEach(cb => cb.checked = allChecked);
  renderEntries();
  renderBankBalanceForm(); // ✅ update banks too
});

// ✅ Handle individual changes
document.querySelectorAll('.monthOption').forEach(cb => {
  cb.addEventListener('change', () => {
    const all = document.querySelectorAll('.monthOption');
    const checked = document.querySelectorAll('.monthOption:checked');
    document.getElementById('selectAllMonths').checked = all.length === checked.length;

    renderEntries();
    renderBankBalanceForm(); // ✅ update banks too
  });
});

  // ✅ Bank dropdown
  const bankFilter = document.getElementById('bankFilter');
  if (bankFilter) {
    const prevBank = bankFilter.value;
    bankFilter.innerHTML = `<option value="">All</option>` + banks.map(b => `<option value="${b}">${b}</option>`).join('');
    bankFilter.value = banks.includes(prevBank) ? prevBank : "";
  }

  // ✅ Category dropdown
  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    categoryFilter.innerHTML = `<option value="All">All</option>` + categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // ✅ Person checkboxes
  const personOptions = document.getElementById('personOptions');
  if (personOptions) {
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

    const selectAllBox = document.getElementById('selectAllPersons');
    if (selectAllBox) {
      selectAllBox.addEventListener('change', function () {
        document.querySelectorAll('.personOption').forEach(cb => cb.checked = this.checked);
        renderEntries();
      });
    }

    document.querySelectorAll('.personOption').forEach(cb => {
      cb.addEventListener('change', () => {
        const all = document.querySelectorAll('.personOption');
        const checked = document.querySelectorAll('.personOption:checked');
        if (selectAllBox) selectAllBox.checked = all.length === checked.length;
        renderEntries();
      });
    });
  }
}

function getDateLabel(dateStr) {
  const entryDate = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(entryDate, today)) return "Today";
  if (isSameDay(entryDate, yesterday)) return "Yesterday";

  const diffDays = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "This Week";

  return entryDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function renderEntries() {
  const dateSearch = document.getElementById('dateSearch')?.value.trim();
  const descSearch = document.getElementById('descSearch')?.value.trim();
  const amountSearch = document.getElementById('amountSearch')?.value.trim();
  const bankSearch = document.getElementById('bankSearch')?.value.trim();
  const personSearch = document.getElementById('personSearch')?.value.trim();
  const categorySearch = document.getElementById('categorySearch')?.value.trim();

  const selectedMonths = Array.from(document.querySelectorAll('.monthOption:checked')).map(cb => cb.value);
  const selectedPersons = Array.from(document.querySelectorAll('.personOption:checked')).map(cb => cb.value);
  const categoryValue = document.getElementById('categoryFilter')?.value || "All";
  const statusValue = document.getElementById('statusFilter')?.value || 'All';

  const matchesMulti = (query, target) =>
    !query || query
      .split(',')
      .map(s => s.trim().toLowerCase())
      .some(val => (target || '').toLowerCase().includes(val));

  const filtered = entries.filter(e => {
    const entryDay = e.date?.split('-')[2];
    const personMatches =
      personSearch?.length > 0
        ? matchesMulti(personSearch, e.person)
        : selectedPersons.length === 0 || selectedPersons.includes(e.person);

    const bankMatches =
      bankSearch?.length > 0
        ? matchesMulti(bankSearch, e.bank)
        : !bankFilter.value || e.bank === bankFilter.value;

    return (
      matchesMulti(dateSearch, entryDay) &&
      (selectedMonths.length === 0 || selectedMonths.includes(e.date?.slice(0, 7))) &&
      personMatches &&
      bankMatches &&
      (!typeFilter.value || e.type === typeFilter.value) &&
      (!currencyFilter.value || e.currency === currencyFilter.value) &&
      matchesMulti(descSearch, e.description) &&
      (categoryValue === "All" || e.category === categoryValue) &&
      matchesMulti(categorySearch, e.category) &&
      (statusValue === 'All' || e.status === statusValue) &&
      matchesMulti(amountSearch, e.amount + '')
    );
  });

  // ✅ Render cards
 const container = document.getElementById('entryTableBody');
if (!container) {
  console.error("❌ Missing #entryTableBody container in DOM");
  return;
}
container.innerHTML = '';



let lastDateGroup = null;

filtered
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .forEach(e => {
    const dateGroupLabel = new Date(e.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    if (dateGroupLabel !== lastDateGroup) {
      const label = document.createElement('div');
      label.className = 'entry-date-label';
      label.textContent = dateGroupLabel;
      container.appendChild(label);
      lastDateGroup = dateGroupLabel;
    }

    const isEditing = document.getElementById('entryForm')?.dataset.editId === e._id;
    const amountClass = e.type === 'Income' ? 'income' : 'expense';

    const card = document.createElement('div');
    card.className = 'entry-card';
    if (isEditing) card.classList.add('editing-row');

    card.innerHTML = `
      <div class="entry-date">
    <div class="date-block">
      <div class="day">${new Date(e.date).getDate().toString().padStart(2, '0')}</div>
      <div class="month-year">
        ${new Date(e.date).toLocaleString('default', { month: 'short' })}<br>
        ${new Date(e.date).getFullYear()}
      </div>
       </div>
  </div>
      <div class="entry-main">
        <div class="description">${e.description}</div>
        <div class="meta">
          ${e.category || ''} • ${e.person} • ${e.bank}
        </div>
       <div class="status">
  <span class="status-pill ${e.status === 'Paid' ? 'paid' : 'open'}">
    ${e.status}
  </span>
</div>
      </div>
       <div class="entry-amount">
    <div class="amount-line">
      <span class="currency small">CHF</span>
      <span class="amount ${amountClass}">${parseFloat(e.amount).toFixed(2)}</span>
    </div>
        <div class="buttons">
          ${
            isEditing
              ? `<button onclick="cancelEdit()" class="action-btn">❌ Cancel</button>`
              : `<button onclick="editEntry('${e._id}')" class="action-btn">✏️</button>`
          }
          <button onclick="duplicateEntry('${e._id}')" class="action-btn">📄</button>
          <button onclick="showDeleteModal('${e._id}')" class="action-btn">🗑️</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // ✅ Totals + Averages
  let incomeTotal = 0, expenseTotal = 0;
  filtered.forEach(e => {
    const amount = parseFloat(e.amount) || 0;
    if ((e.type || '').toLowerCase() === 'income') incomeTotal += amount;
    else expenseTotal += amount;
  });

  const monthsUsed = [...new Set(filtered.map(e => e.date?.slice(0, 7)))].filter(Boolean);
  const avgIncome = incomeTotal / monthsUsed.length || 0;
  const avgExpense = expenseTotal / monthsUsed.length || 0;

  document.getElementById('monthlyAverageCard').innerHTML = `
    <div class="average-card-container">
      <div class="average-card">Avg Income <a class="income-color">${avgIncome.toFixed(2)}</a></div>
      <div class="average-card">Avg Expenses <a class="expense-color">${avgExpense.toFixed(2)}</a></div>
      <div class="average-card">Avg Balance <a class="balance-color">${(avgIncome - avgExpense).toFixed(2)}</a></div>
    </div>
  `;

  document.getElementById('totalIncome').textContent = incomeTotal.toFixed(2);
  document.getElementById('totalExpense').textContent = expenseTotal.toFixed(2);
  document.getElementById('totalBalance').textContent = (incomeTotal - expenseTotal).toFixed(2);
}

function editEntry(id) {
  const form = document.getElementById('entryForm');
  if (form) {
    form.dataset.editId = id;
  }

  const entry = entries.find(e => e._id === id);
  if (!entry) return alert("❌ Entry not found");

  // Prefill form fields
  document.getElementById('newDate')._flatpickr.setDate(new Date(entry.date));
  document.getElementById('newDescription').value = entry.description;
  document.getElementById('newCategory').value = entry.category || '';
  document.getElementById('newAmount').value = entry.amount;
  document.getElementById('newCurrency').value = entry.currency;
  document.getElementById('newType').value = entry.type;
  document.getElementById('newPerson').value = entry.person;
  document.getElementById('newBank').value = entry.bank;
  document.getElementById('newStatus').value = entry.status || 'Paid';

  document.getElementById('newDescription').focus();
  document.getElementById('cancelEditBtn')?.classList.remove('hidden');
updateEntryButtonLabel(); // still update Add/Save text

  renderEntries(); // ✅ Highlight row and show cancel button
setTimeout(() => {
  const rows = document.querySelectorAll('#entryTableBody tr');
  const editForm = document.getElementById('entryForm');
  const editingId = editForm?.dataset.editId;

  for (const row of rows) {
    const idAttr = row.querySelector('button[onclick^="editEntry("]')?.getAttribute('onclick');
    const rowId = idAttr?.match(/'([^']+)'/)?.[1];
    if (rowId === editingId) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      break;
    }
  }
}, 150);
}

async function updateStatus(id, newStatus) {
  console.log("Sending status update", id, newStatus);

  const res = await fetch(`${apiBase}/api/entries/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status: newStatus })
  });

  const data = await res.json();
  console.log("Server response", data);

  if (res.ok) {
    const index = entries.findIndex(e => e._id === id);
    if (index !== -1) {
      entries[index] = data;
      renderEntries(); // Re-render the table with updated status
    }
  } else {
    alert("❌ Failed to update status");
  }
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

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.opacity = '0';
    }, 2000);
  }



async function duplicateEntry(id) {
  const entry = entries.find(e => e._id === id);
  if (!entry) return alert("Entry not found");

  const copy = { ...entry };
  delete copy._id;
  copy.description += ' (Copy)';

  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(copy)
  });

  if (res.ok) {
    await fetchEntries();
    renderEntries();
    populateNewEntryDropdowns();
    populateFilters();
    renderBankBalanceForm();
    showToast("✅ Entry duplicated");

    // ✅ Scroll to the duplicated entry by description
    const targetDescription = copy.description;

    setTimeout(() => {
      const rows = document.querySelectorAll('#entryTableBody tr');
      for (const row of rows) {
        const descCell = row.querySelector('td:nth-child(2)');
        if (descCell && descCell.textContent?.trim().includes('(Copy)')) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('highlight-row');
          setTimeout(() => row.classList.remove('highlight-row'), 2000);
          break;
        }
      }
    }, 300); // ✅ longer delay to ensure DOM is fully rendered
  } else {
    alert("❌ Failed to duplicate entry");
  }
} // ✅ this is the closing bracket for the entire function





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

  const entriesStart = lines.findIndex(l => l.trim() === 'Entries');
  const bankStart = lines.findIndex(l => l.trim() === 'Bank Balances');

  // ✅ 1. Parse and import entries
  const entryHeaders = lines[entriesStart + 1].split(',');
  for (let i = entriesStart + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === 'Bank Balances') break;

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

    await fetch(`${backend}/api/entries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entry)
    });
  }

  // ✅ 2. Parse and import initial balances
  if (bankStart !== -1 && lines.length > bankStart + 2) {
    const bankHeaders = lines[bankStart + 1].split(',').slice(1); // remove 'Bank'
    const initialValues = lines[bankStart + 2].split(',').slice(1); // remove 'Initial'

    const balances = {};
    bankHeaders.forEach((bank, i) => {
      balances[bank.trim()] = parseFloat(initialValues[i]) || 0;
    });

    await fetch(`${backend}/api/balances`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(balances)
    });
  }

  alert('✅ CSV Imported!');
  await fetchEntries();
  await loadInitialBankBalances();
  renderBankBalanceForm();
});



function exportCombinedCSV() {
  const entryHeaders = ['date', 'description', 'amount', 'currency', 'type', 'person', 'bank'];
  const entryRows = entries.map(e => [
    e.date, e.description, e.amount, e.currency, e.type, e.person, e.bank
  ]);

  const banks = Object.keys(initialBankBalances);
  const bankHeaders = ['Bank', ...banks];

  const initialRow = ['Initial'];
  const changeRow = ['Change'];

  // Initial balances
  banks.forEach(bank => {
    initialRow.push(initialBankBalances[bank] ?? 0);
  });

  // Calculate net balance changes per bank
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

banks.forEach(bank => {
  changeRow.push(changes[bank].toFixed(2));
});

  // Build CSV
  const csvSections = [];
  csvSections.push('Entries');
  csvSections.push(entryHeaders.join(','));
  csvSections.push(...entryRows.map(r => r.join(',')));
  csvSections.push('', 'Bank Balances');
  csvSections.push(bankHeaders.join(','));
  csvSections.push(initialRow.join(','));
  csvSections.push(changeRow.join(','));

  // Generate timestamped filename
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-'); // e.g. "2025-06-08T11-45-30-123Z"
  const filename = `bookkeeping_combined_${timestamp}.csv`;

  const csvContent = csvSections.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
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
  const selectedMonths = Array.from(document.querySelectorAll('#monthOptions input[type="checkbox"]:checked')).map(cb => cb.value);

  if (!banks.length) {
    container.innerHTML = `<p>No bank data available yet.</p>`;
    return;
  }

// ✅ Apply status filtering for balance calculations
const statusFilter = document.getElementById('statusFilter')?.value || 'All';

const changes = {};
banks.forEach(bank => changes[bank] = 0);

entries.forEach(e => {
  const bank = e.bank;
  const type = (e.type || '').trim().toLowerCase();
  const amount = Math.abs(parseFloat(e.amount)) || 0;
  const status = e.status || 'Open';

  const include =
    statusFilter === 'All' ||
    (statusFilter === 'Paid' && status === 'Paid') ||
    (statusFilter === 'Open' && status === 'Open');

  const month = e.date?.slice(0, 7);
  const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(month);

  if (include && monthMatch && bank in changes) {
    changes[bank] += type === 'income' ? amount : -amount;
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
const difference = totalPositive + totalNegative;
const formattedDifference = (difference >= 0 ? '+' : '') + difference.toFixed(2);

html += `
  <div style="display: flex; align-items: center; gap: 1.5rem; margin-top: 1rem; flex-wrap: wrap;">
    <button id="saveBankBalances" onclick="saveBankBalances()">Save</button>
    <button id="lockbalance" onclick="toggleLock()">${window.initialLocked ? 'Unlock' : 'Lock'}</button>

    <div style="display: flex; gap: 1.5rem; align-items: center;">
      <span>Total Plus:&nbsp; 
        <span style="color: #00bfff; font-size: 22px;">+${totalPositive.toFixed(2)}</span>
      </span>
      <span>Total Minus:&nbsp; 
        <span style="color: rgb(254, 110, 38); font-size: 22px;">${totalNegative.toFixed(2)}</span>
      </span>
      <span>Difference:&nbsp;
        <span style="color: ${difference >= 0 ? '#13a07f' : '#ff695d'}; font-size: 22px;">
          ${formattedDifference}
        </span>
      </span>
    </div>
  </div>
`;

  container.innerHTML = html;

  // ✅ Trigger update for dependent components
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

  await fetch(`${backend}/api/balances`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data.initialBankBalances)
  });
}

    alert('✅ Backup restored!');
    fetchEntries();
  };

  reader.readAsText(file);
}
renderBankBalanceForm(); // 🧮 Re-render updated balances




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
// ✅ Initialization
window.addEventListener('DOMContentLoaded', async () => {
  await fetchEntries();
  await loadInitialBankBalances();
  await loadCreditLimits();

  populateNewEntryDropdowns();
  populateFilters();
  renderEntries();
  renderBankBalanceForm();

  // ✅ Add this line for status filter
document.getElementById('statusFilter')?.addEventListener('change', () => {
  renderEntries();             // update the visible entries
  renderBankBalanceForm();     // update the bank balance based on filtered entries
});
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
   const res = await fetch(`https://bookkeeping-i8e0.onrender.com/api/limits`, { headers: { Authorization: `Bearer ${token}` } });
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


function clearSearch(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`No element found with id "${id}"`);
    return;
  }

  el.value = '';

  // ✅ Trigger the 'input' event to re-run any logic tied to input listeners
  el.dispatchEvent(new Event('input'));

  renderEntries();
}

function resetFilters() {
  // Temporarily suppress toast messages
  window.suppressToast = true;

  // Clear search inputs
  document.getElementById('dateSearch').value = '';
  document.getElementById('descSearch').value = '';
  document.getElementById('amountSearch').value = '';
  document.getElementById('categorySearch').value = '';
  document.getElementById('bankSearch').value = '';
  document.getElementById('personSearch').value = '';

  // Re-enable and reset dropdown filters
  ['categoryFilter', 'typeFilter', 'currencyFilter', 'statusFilter', 'bankFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = false;
      el.selectedIndex = 0;
    }
  });

  // Re-enable and re-check all person checkboxes
  document.querySelectorAll('.personOption').forEach(cb => {
    cb.disabled = false;
    cb.checked = true;
  });
  const selectAllPersons = document.getElementById('selectAllPersons');
  if (selectAllPersons) {
    selectAllPersons.disabled = false;
    selectAllPersons.checked = true;
  }

  // Re-check all month checkboxes
  document.querySelectorAll('.monthOption').forEach(cb => cb.checked = true);
  const selectAllMonths = document.getElementById('selectAllMonths');
  if (selectAllMonths) selectAllMonths.checked = true;

  // Render and show correct toast
  renderEntries();
  showToast("All filters re-enabled");

  // Re-enable toast logic
  setTimeout(() => window.suppressToast = false, 100);
}


document.addEventListener('DOMContentLoaded', () => {
  // ✅ personSearch logic
  document.getElementById('personSearch')?.addEventListener('input', () => {
    const value = document.getElementById('personSearch').value.trim();
    const checkboxes = document.querySelectorAll('.personOption');
    const selectAllBox = document.getElementById('selectAllPersons');
    const disabled = value.length > 0;

    checkboxes.forEach(cb => cb.disabled = disabled);
    if (selectAllBox) selectAllBox.disabled = disabled;

    if (!disabled) showToast("Person filters re-enabled");
    renderEntries();
  });

  document.getElementById('bankSearch')?.addEventListener('input', () => {
    const value = document.getElementById('bankSearch').value.trim();
    const bankDropdown = document.getElementById('bankFilter');

    if (bankDropdown) {
      bankDropdown.disabled = value.length > 0;
      if (!value) {
        bankDropdown.selectedIndex = 0;
        showToast("Bank filter re-enabled");
      }
    }

    renderEntries();
  });

  

  


// delete entries
  let entryToDelete = null;

window.showDeleteModal = function(id) {
  entryToDelete = id;
  document.getElementById('confirmModal').classList.remove('hidden');
};

  document.getElementById('cancelDelete').addEventListener('click', () => {
    entryToDelete = null;
    document.getElementById('confirmModal').classList.add('hidden');
  });

  document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (entryToDelete) {
      await deleteEntry(entryToDelete); // your existing function
      entryToDelete = null;
      document.getElementById('confirmModal').classList.add('hidden');
    }
  });
  }); // ✅ Close the second DOMContentLoaded


function cancelEdit() {
  const form = document.getElementById('entryForm');
  if (form) form.dataset.editId = '';

  // Clear form fields
  document.getElementById('newDate')._flatpickr.setDate(new Date());
  document.getElementById('newDescription').value = '';
  document.getElementById('newCategory').value = '';
  document.getElementById('newAmount').value = '';
  document.getElementById('newCurrency').value = 'CHF';
  document.getElementById('newType').value = 'Expense';
  document.getElementById('newPerson').value = '';
  document.getElementById('newBank').value = '';
  document.getElementById('newStatus').value = 'Paid';
document.getElementById('cancelEditBtn')?.classList.add('hidden');
updateEntryButtonLabel(); // revert Add/Save button
  showToast('✋ Edit cancelled');
  renderEntries();
}


function updateEntryButtonLabel() {
  const form = document.getElementById('entryForm');
  const btn = document.getElementById('entrySubmitBtn');
  btn.textContent = form?.dataset.editId ? 'Save Changes' : 'Add Entry';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const form = document.getElementById('entryForm');
    if (form?.dataset.editId) {
      cancelEdit();
    }
  }
});


document.addEventListener("DOMContentLoaded", () => {
  fetchEntries(); // or whatever starts your rendering logic
});