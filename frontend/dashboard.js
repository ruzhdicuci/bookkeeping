const DEBUG_MODE = false; // set to true during dev
const debug = (...args) => DEBUG_MODE && debug(...args);

import {
  db,
  saveEntryLocally,
  getCachedEntries,
  getUnsynced,
  markAsSynced,
  getCachedBankBalances,
  saveAllCustomCards,
  getCachedCustomCards,
  syncCustomCardsToMongo,
  loadCustomCardsFromMongo,
  getUnsyncedCustomCards    // ✅ Add this here too
} from './dexieDb.js';

let entries = [];
let persons = [];
let creditCards = [
  { name: "UBS Master", limit: 3000 },
  { name: "Corner Master", limit: 9900 }
];
let editModeActive = false;

const apiBase = 'https://bookkeeping-i8e0.onrender.com';
const token = localStorage.getItem('token');
const backend =
  location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://bookkeeping-i8e0.onrender.com';

if (!token) {
  console.warn('🔒 No token found. Redirecting to login...');
  alert('🔒 Please log in to access your bookkeeping data.');
  window.location.href = '/bookkeeping/client/login.html'; // Adjust if your login page is elsewhere
}

document.addEventListener('DOMContentLoaded', async () => {
  // Try loading cached entries first (safe)
  const cached = await getCachedEntries();
  if (cached.length) {
    debug("📦 Showing cached entries before server fetch");
    renderEntries(cached); // This shows something while loading real data
  }

  // Then fetch the real entries from server as usual
  await fetchEntries();
  await loadInitialBankBalances();

  // Sync any pending entries (only if online)
  if (navigator.onLine) syncToCloud();

  // Your flatpickr and other logic continues...
  const dateInput = document.getElementById('newDate');
  if (dateInput) {
    const fp = flatpickr(dateInput, {
      dateFormat: "Y-m-d",
      defaultDate: new Date()
    });
    if (!dateInput.value) {
      fp.setDate(new Date());
    }
  }


  // 3. Person search input logic
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

  // 4. Bank search input logic
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

  // ✅ Any other DOM-ready setup (scroll buttons, dropdowns, etc.) can go here
});
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

    const balances = await res.json();
    initialBankBalances = balances;

    // ✅ Save to Dexie instead of localStorage
    await saveBankBalances(balances);

    // ✅ Optional: also keep localStorage if you still use it elsewhere
    localStorage.setItem('initialBankBalances', JSON.stringify(balances));
  } catch (err) {
    console.warn('⚠️ Could not load balances from backend. Trying IndexedDB...');
    
    // ✅ Try Dexie fallback first
    const cached = await getCachedBankBalances();
    if (cached.length > 0) {
      initialBankBalances = cached;
    } else {
      // Optional final fallback
      const local = localStorage.getItem('initialBankBalances');
      if (local) initialBankBalances = JSON.parse(local);
    }
  }

  // ✅ Render bank balances from whatever was loaded
  renderBankBalanceForm(initialBankBalances);
}

 function populatePersonFilterForDashboard(persons) {
    const container = document.getElementById('personOptions');
    if (!container) {
      console.warn("⚠️ #personOptions container not found");
      return;
    }

    container.innerHTML = `
      <label><input type="checkbox" value="All" onchange="toggleAllPersons(this)" checked> <strong>All</strong></label>
      <hr style="margin: 6px 0;">
      ${persons.map(p => `
        <label>
          <input type="checkbox" class="personFilter" value="${p}" checked onchange="renderEntries()" />
          ${p}
        </label>
      `).join('')}
    `;
  }

  function toggleAllPersons(masterCheckbox) {
    const checkboxes = document.querySelectorAll('#personOptions .personFilter');
    checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
    renderEntries(); // Re-render dashboard entries
  }


function populatePersonDropdownForCharts(persons) {
  const select = document.getElementById('filterPerson');
  if (!select) {
    console.warn("⚠️ #filterPerson not found.");
    return;
  }

  const excluded = ['Transfer', 'Balance'];
  const filteredPersons = persons.filter(p => !excluded.includes(p));

  select.innerHTML = `<option value="All">All</option>` +
    filteredPersons.map(p => `<option value="${p}">${p}</option>`).join('');

  if (!select.dataset.listenerAttached) {
    select.addEventListener('change', drawCharts);
    select.dataset.listenerAttached = "true";
  }
}

async function fetchEntries() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${apiBase}/api/entries`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch entries');

    const data = await res.json();
    window.entries = Array.isArray(data) ? data.sort((a, b) => b.date.localeCompare(a.date)) : [];

    debug("📦 Entries:", window.entries);
    window.persons = [...new Set(window.entries.map(e => e.person).filter(Boolean))];
    debug("🧑‍🤝‍🧑 Found persons:", window.persons);

    renderEntries();
    populateNewEntryDropdowns();
    populateFilters();
    renderBankBalanceForm();

    // ✅ Save entries locally
    await db.entries.clear();
    await db.entries.bulkPut(window.entries);
  } catch (err) {
    console.warn('⚠️ fetchEntries failed, loading from Dexie instead:', err);

    try {
      const cached = await db.entries.toArray();
      window.entries = cached || [];

      debug("📦 Loaded entries from IndexedDB:", window.entries);
      window.persons = [...new Set(window.entries.map(e => e.person).filter(Boolean))];

      renderEntries();
      populateNewEntryDropdowns();
      populateFilters();
      renderBankBalanceForm();
    } catch (dexieErr) {
      console.error('❌ Dexie fallback also failed:', dexieErr);
      window.entries = [];
    }
  }
}

function populateNewEntryDropdowns() {
  const entries = window.entries || [];

  const persons = [...new Set(entries.map(e => e.person?.trim()).filter(Boolean))];
  const banks = [...new Set(entries.map(e => e.bank?.trim()).filter(Boolean))];
  const categories = [...new Set(entries.map(e => e.category?.trim()).filter(Boolean))];

  const personList = document.getElementById('personList');
  const bankList = document.getElementById('bankList');
  const categoryList = document.getElementById('newCategoryList');

  if (personList) personList.innerHTML = persons.map(p => `<option value="${p}">`).join('');
  if (bankList) bankList.innerHTML = banks.map(b => `<option value="${b}">`).join('');
  if (categoryList) categoryList.innerHTML = categories.map(c => `<option value="${c}">`).join('');

  debug("👤 Loaded persons:", persons);
  debug("🏦 Loaded banks:", banks);
  debug("🏷️ Loaded categories:", categories);
}


// Populate New Entry bank dropdown based on Account Balances table
function populateBankDropdownFromBalances() {
  const bankTable = document.querySelector('#bankBalanceTableContainer table');
  if (!bankTable) return;

  const bankCells = bankTable.querySelectorAll('thead th');
  const banks = [...bankCells].slice(1).map(th => th.textContent.trim()); // ✅ use trim()

  debug("🏦 Bank headers found:", banks);

  const bankSelect = document.getElementById('newBank');
  if (!bankSelect) return;

  bankSelect.innerHTML = '<option value="">Select bank</option>';
  banks.forEach(bankName => {
    const option = document.createElement('option');
    option.value = bankName;
    option.textContent = bankName;
    bankSelect.appendChild(option);
  });
}

function populateFilters() {
  if (!window.entries || !Array.isArray(window.entries)) return;

  const entries = window.entries;

  // ✅ Cleaned, trimmed, sorted
  const banks = [...new Set(entries.map(e => e.bank?.trim()))].filter(Boolean).sort();
  const persons = [...new Set(entries.map(e => e.person?.trim()))].filter(Boolean).sort();
  const categories = [...new Set(entries.map(e => e.category?.trim()))].filter(Boolean).sort();
  const months = [...new Set(entries.map(e => e.date?.slice(0, 7)))].filter(Boolean).sort();

  const excludedByDefault = ['Balance', 'Transfer'];

  // ✅ Person checkbox group
  const personOptions = document.getElementById('personOptions');
  if (personOptions) {
    personOptions.innerHTML = `
      <div class="personOptionGroup">
        <label><input type="checkbox" id="selectAllPersons" /> <strong>All</strong></label>
        ${persons.map(p => `
          <label>
            <input type="checkbox" class="personOption" name="personFilter" value="${p}" ${excludedByDefault.includes(p) ? '' : 'checked'} />
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

      document.querySelectorAll('.personOption').forEach(cb => {
        cb.addEventListener('change', () => {
          const all = document.querySelectorAll('.personOption');
          const checked = document.querySelectorAll('.personOption:checked');
          selectAllBox.checked = all.length === checked.length;
          renderEntries();
        });
      });

      const initiallyChecked = document.querySelectorAll('.personOption:checked').length;
      selectAllBox.checked = initiallyChecked === (persons.length - excludedByDefault.length);
    }
  }

  // ✅ Save persons for chart dropdown
  window.persons = persons;
  populatePersonDropdownForCharts(window.persons);

  const filterPerson = document.getElementById('filterPerson');
  if (filterPerson && !filterPerson.dataset.listenerAttached) {
    filterPerson.addEventListener('change', drawCharts);
    filterPerson.dataset.listenerAttached = "true";
  }

  // ✅ Month checkboxes
  const monthContainer = document.getElementById('monthOptions');
  if (monthContainer) {
    monthContainer.innerHTML = `
      <label><input type="checkbox" id="selectAllMonths" checked /> <strong>All</strong></label>
      <hr style="margin: 4px 0;">
      ${months.map(m => `
        <label>
          <input type="checkbox" class="monthOption" value="${m}" checked />
          ${m}
        </label>
      `).join('')}
    `;

    const selectAllMonths = document.getElementById('selectAllMonths');
    selectAllMonths.addEventListener('change', function () {
      const allChecked = this.checked;
      document.querySelectorAll('.monthOption').forEach(cb => cb.checked = allChecked);
      renderEntries();
      renderBankBalanceForm();
    });

    document.querySelectorAll('.monthOption').forEach(cb => {
      cb.addEventListener('change', () => {
        const all = document.querySelectorAll('.monthOption');
        const checked = document.querySelectorAll('.monthOption:checked');
        selectAllMonths.checked = all.length === checked.length;
        renderEntries();
        renderBankBalanceForm();
      });
    });
  }

  // ✅ Bank dropdown
  const bankFilterEl = document.getElementById('bankFilter');
  if (bankFilterEl) {
    const prevBank = bankFilterEl.value;
    bankFilterEl.innerHTML = `<option value="">bank</option>` + banks.map(b => `<option value="${b}">${b}</option>`).join('');
    bankFilterEl.value = banks.includes(prevBank) ? prevBank : "";
  }

  // ✅ Category dropdown
  const categoryFilterEl = document.getElementById('categoryFilter');
  if (categoryFilterEl) {
    categoryFilterEl.innerHTML = `<option value="All">category</option>` + categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}


let currentPage = 1;
const ENTRIES_PER_PAGE = 30;

function getDateLabel(dateStr) {
  const entryDate = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  entryDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(entryDate, today)) return "Today";
  if (isSameDay(entryDate, yesterday)) return "Yesterday";

  const diffDays = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 14) return "Last Week";
  if (diffDays <= 21) return "2 Weeks Ago";
  if (diffDays <= 28) return "3 Weeks Ago";

  return entryDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function getLabelRank(label) {
  const ranks = {
    "Today": 1,
    "Yesterday": 2,
    "This Week": 3,
    "Last Week": 4,
    "This Month": 5,
  };
  return ranks[label] || 9999;
}

function renderEntries() {
  const entries = window.entries || [];
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

  let filtered = entries.filter(e => {
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

  const selectedTime = document.getElementById('timeSort')?.value;
  if (selectedTime) {
    const now = new Date();
    filtered = filtered.filter(e => {
      const entryDate = new Date(e.date);
      const daysDiff = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
      switch (selectedTime) {
        case 'Today': return daysDiff === 0;
        case 'Yesterday': return daysDiff === 1;
        case 'This Week': return daysDiff <= 6;
        case 'Last Week': return daysDiff >= 7 && daysDiff <= 13;
        case '2 Weeks Ago': return daysDiff >= 14 && daysDiff <= 20;
        case '3 Weeks Ago': return daysDiff >= 21 && daysDiff <= 27;
        default: return true;
      }
    });
  }

  const container = document.getElementById('entryTableBody');
  if (!container) return;
  container.innerHTML = '';

  const groupedEntries = {};
  filtered.forEach(e => {
    const label = getDateLabel(e.date);
    if (!groupedEntries[label]) groupedEntries[label] = [];
    groupedEntries[label].push(e);
  });

  const sortedLabels = Object.keys(groupedEntries).sort((a, b) => getLabelRank(a) - getLabelRank(b));
  let entriesRendered = 0;

  for (const label of sortedLabels) {
    if (entriesRendered >= currentPage * ENTRIES_PER_PAGE) break;

    const labelEl = document.createElement('div');
    labelEl.className = 'entry-date-label';
    if (["Today", "Yesterday", "This Week", "Last Week", "This Month"].includes(label)) {
      labelEl.classList.add('special-label');
    }
    labelEl.textContent = label;
    container.appendChild(labelEl);

    const group = groupedEntries[label].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const e of group) {
      if (entriesRendered >= currentPage * ENTRIES_PER_PAGE) break;

      const card = document.createElement('div');
      card.className = 'entry-card';
      card.dataset.id = e._id;

      const isEditing = document.getElementById('entryForm')?.dataset.editId === e._id;
      if (isEditing) card.classList.add('editing-row');
      if (e._id === window.highlightedEntryId) {
        card.classList.add('highlighted');
        card.id = 'highlighted-entry';
      }

      const amountClass = e.type === 'Income' ? 'income' : 'expense';

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
          <div class="meta">${e.category || ''} • ${e.person} • ${e.bank}</div>
          <div class="status">
            <span class="status-pill ${e.status === 'Paid' ? 'paid' : 'open'}">${e.status}</span>
          </div>
        </div>
        <div class="entry-amount">
          <div class="amount-line">
            <span class="currency small">CHF</span>
            <span class="amount ${amountClass}">${parseFloat(e.amount).toFixed(2)}</span>
          </div>
          <div class="buttons">
            ${isEditing
              ? `<button onclick="cancelEdit()" class="action-btn">❌ Cancel</button>`
              : `<button onclick="editEntry('${e._id}')" class="action-btn">✏️</button>`
            }
            <button onclick="duplicateEntry('${e._id}')" class="action-btn">📄</button>
            <button onclick="showDeleteModal('${e._id}')" class="action-btn">🗑️</button>
          </div>
        </div>`;
      container.appendChild(card);
      entriesRendered++;
    }
  }

  if (filtered.length > currentPage * ENTRIES_PER_PAGE) {
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.textContent = 'Load more';
    loadMoreBtn.className = 'load-more-btn';
    loadMoreBtn.onclick = () => {
      currentPage++;
      renderEntries();
    };
    container.appendChild(loadMoreBtn);
  }

  // Highlight scroll
  setTimeout(() => {
    const el = document.getElementById('highlighted-entry');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        el.classList.remove('highlighted');
        el.removeAttribute('id');
        delete window.highlightedEntryId;
      }, 2000);
    }
  }, 100);


  // ✅ Totals + Averages (moved inside the function)
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
      <div class="average-card">
        <div class="label">Avg Income</div>
        <a class="income-color">${avgIncome.toFixed(2)}</a>
      </div>
      <div class="average-card">
        <div class="label">Avg Expenses</div>
        <a class="expense-color">${avgExpense.toFixed(2)}</a>
      </div>
      <div class="average-card">
        <div class="label">Avg Balance</div>
        <a class="balance-color">${(avgIncome - avgExpense).toFixed(2)}</a>
      </div>
    </div>
  `;
  document.getElementById('totalIncome').textContent = incomeTotal.toFixed(2);
  document.getElementById('totalExpense').textContent = expenseTotal.toFixed(2);
  document.getElementById('totalBalance').textContent = (incomeTotal - expenseTotal).toFixed(2);
}




async function editEntry(id) {
  // Ensure entries are loaded
  if (!window.entries || window.entries.length === 0) {
    await fetchEntries();
  }

  const form = document.getElementById('entryForm');
  if (form) {
    form.dataset.editId = id;
  }

  const entry = window.entries.find(e => e._id === id);
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
  updateEntryButtonLabel();

  renderEntries();

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
  debug("Sending status update", id, newStatus);

  const res = await fetch(`${apiBase}/api/entries/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status: newStatus })
  });

  const data = await res.json();
  debug("Server response", data);

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

async function duplicateEntry(id) {
  debug("Looking for ID to duplicate:", id);
  await fetchEntries(); // ✅ ensure entries are available

  debug("✅ All current entry IDs:", window.entries.map(e => e._id));
  const entry = window.entries.find(e => e._id === id);
  if (!entry) return alert("Entry not found");

  const copy = { ...entry };
  delete copy._id;
  copy.description += ' (Copy)';

  const res = await fetch(`${apiBase}/api/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(copy)
  });

  if (res.ok) {
    const newEntry = await res.json();
    window.highlightedEntryId = newEntry._id;
    await fetchEntries(); // ✅ reload entries
    showToast("✅ Entry duplicated");
  } else {
    alert("❌ Failed to duplicate entry");
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




function toggleTheme() {
  const body = document.body;
  const icon = document.getElementById('themeIcon');

  const isDark = body.classList.toggle('dark');

  if (icon) {
    icon.classList.remove('fa-moon', 'fa-sun');
    icon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html'; // ✅ use correct login page
}



//import csv
function importEntriesFromCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    const csvText = e.target.result;
    const lines = csvText.trim().split('\n');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const expectedHeaders = ['date', 'description', 'amount', 'currency', 'type', 'person', 'bank', 'category'];

    // ✅ Validate headers
    if (headers.join() !== expectedHeaders.join()) {
      alert("❌ CSV headers do not match expected format.");
      return;
    }

    const newEntries = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim()); // strip quotes + trim

      return {
        date: values[0],
        description: values[1],
        amount: parseFloat(values[2]) || 0,
        currency: values[3] || '',
        type: values[4] || '',
        person: values[5] || '',
        bank: values[6] || '',
        category: values[7] || ''
      };
    });

    // ✅ Send entries to backend
    for (const entry of newEntries) {
      await fetch(`${apiBase}/api/entries`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    }

    alert(`✅ Imported ${newEntries.length} entries.`);
    fetchEntries(); // 🔄 reload entries after import
  };

  reader.readAsText(file);
}


//export csv
function exportVisibleCardEntriesAsCSV() {
  const headers = ['date', 'description', 'amount', 'currency', 'type', 'person', 'bank', 'category'];

  const entries = window.entries || [];
  const visibleCards = document.querySelectorAll('.entry-card');

  const rows = Array.from(visibleCards).map(card => {
    const id = card.dataset.id;
    const entry = entries.find(e => e._id === id);

    return [
      entry?.date || '',
      entry?.description || '',
      entry?.amount || '',
      entry?.currency || '',
      entry?.type || '',
      entry?.person || '',
      entry?.bank || '',
      entry?.category || ''
    ];
  });

  if (!rows.length) {
    alert("No visible entries to export.");
    return;
  }

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

  const now = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  const filename = `visible_entries_${now}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
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
  debug("📊 renderBankBalanceForm called");
const entries = window.entries || [];
  const container = document.getElementById('bankBalanceTableContainer');
  const banks = [...new Set(entries.map(e => e.bank).filter(Boolean))];
  const selectedMonths = Array.from(document.querySelectorAll('#monthOptions input[type="checkbox"]:checked')).map(cb => cb.value);

  debug("📦 Entries count:", entries.length);
  debug("🏦 Banks found:", banks);
  debug("📆 Selected months:", selectedMonths);

  if (!banks.length) {
    console.warn("⚠️ No banks found in entries.");
    container.innerHTML = `<p>No bank data available yet.</p>`;
    return;
  }


  const statusFilter = document.getElementById('statusFilter')?.value || 'All';
  const changes = {};
  banks.forEach(bank => changes[bank] = 0);

  entries.forEach(e => {
    const bank = e.bank;
    const type = (e.type || '').trim().toLowerCase();
    const amount = Math.abs(parseFloat(e.amount)) || 0;
    const status = e.status || 'Open';
    const include = (
      statusFilter === 'All' ||
      (statusFilter === 'Paid' && status === 'Paid') ||
      (statusFilter === 'Open' && status === 'Open')
    );
    const month = e.date?.slice(0, 7);
    const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(month);
    if (include && monthMatch && bank in changes) {
      changes[bank] += type === 'income' ? amount : -amount;
    }
  });

  // Clear container
  container.innerHTML = '';

  // Card grid
  const cardGrid = document.createElement('div');
  cardGrid.className = 'balance-card-grid';

  let totalPlus = 0, totalMinus = 0;

  banks.forEach(bank => {
    const delta = changes[bank] ?? 0;
    if (delta > 0) totalPlus += delta;
    else totalMinus += delta;

    const card = document.createElement('div');
    card.className = 'balance-card';
    card.innerHTML = `
      <small>${bank}</small>
      <div class="change-amount" style="color:${delta < 0 ? '#ff695d' : '#13a07f'}">${delta.toFixed(2)}</div>
    `;
    cardGrid.appendChild(card);
  });

  // Totals card (inline style version)
  const summaryCard = document.createElement("div");
  summaryCard.className = "balance-summary-card";
summaryCard.innerHTML = `
  <div class="summary-totals-card">
    <span class="summary-card" style="background:#f0f8ff;">
      <div class="label">Total Plus</div>
      <div class="value" id="v-totalPlus" style="color:#00bfff">+${totalPlus.toFixed(2)}</div>
    </span>
    <span class="summary-card" style="background:#ffecec">
      <div class="label">Total Minus</div>
      <div class="value" id="v-totalMinus" style="color:orangered">${totalMinus.toFixed(2)}</div>
    </span>
    <span class="summary-card" style="background:#e5f7f0">
      <div class="label">Difference</div>
      <div class="value" style="color:${(totalPlus + totalMinus) >= 0 ? '#13a07f' : '#ff695d'}">
        ${(totalPlus + totalMinus).toFixed(2)}
      </div>
    </span>
  </div>
`;


 

  container.appendChild(cardGrid);
  container.appendChild(summaryCard);

  window.dispatchEvent(new Event('bankBalanceUpdated'));
}

function renderBankBalanceCards() {
  const table = document.querySelector("#bankBalanceTableContainer table");
  if (!table) return;

  const headerCells = table.querySelectorAll("thead th");
  const initialCells = table.querySelectorAll("tbody tr:nth-child(1) td");
  const changeCells = table.querySelectorAll("tbody tr:nth-child(2) td");

  // Remove existing cards
  const cardContainer = document.getElementById("bankBalanceCards");
  if (!cardContainer) return;

  cardContainer.innerHTML = "";

  for (let i = 1; i < headerCells.length; i++) {
    const name = headerCells[i].textContent.trim();
    const initial = initialCells[i]?.querySelector("input")?.value || "0.00";
    const change = parseFloat(changeCells[i]?.textContent || "0");
    const changeColor = change < 0 ? "#ff695d" : "#13a07f";

    const card = document.createElement("div");
    card.className = "bank-card";
    card.innerHTML = `
      <div class="bank-name">${name}</div>
      <div class="bank-initial">Initial: ${parseFloat(initial).toFixed(2)}</div>
      <div class="bank-change" style="color: ${changeColor};">
        Change: ${change.toFixed(2)}
      </div>
    `;

    cardContainer.appendChild(card);
  }
}




// Backup all entries and initial balances to a JSON file
function backupData() {
  const backup = {
    entries,
    initialBankBalances
  };

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:T]/g, '-').split('.')[0];
  const filename = `bookkeeping_backup_${timestamp}.json`;

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

async function restoreBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(evt) {
    const data = JSON.parse(evt.target.result);

    if (Array.isArray(data.entries)) {
      for (const entry of data.entries) {
        if (entry._id) delete entry._id;

        await fetch(`${apiBase}/api/entries`, {
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

      await fetch(`${apiBase}/api/balances`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data.initialBankBalances)
      });
    }

    alert('✅ Backup restored!');

    // ✅ wait before re-rendering
    await fetchEntries();
    renderBankBalanceForm();
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
    renderBankBalanceForm();
  renderEntries();
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
window.closeModal = closeModal;


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
  debug(`🔠 Font size set to ${size}px`);
}


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




// ✅ Initialization
window.addEventListener('DOMContentLoaded', async () => {
  await fetchEntries();
  await loadInitialBankBalances();
  await loadCreditLimits();

  populateNewEntryDropdowns();
  populateFilters();
  renderEntries();

  renderCreditLimitTable(); // ✅ Show limits table

    // 🛠️ Toggle edit/delete mode
  document.getElementById("toggleEditModeBtn").addEventListener("click", () => {
    window.editModeActive = !window.editModeActive; // define globally so you can check inside render
    renderEditableCreditCards(); // re-render with mode logic
  });


// ✅ Load custom cards from Dexie (fallbacks to empty array)
try {
  await loadCustomCardsFromMongo(); // ⬅️ loads into window.customCreditCards and saves to Dexie
} catch (err) {
  console.warn("⚠️ Failed to load from MongoDB, using Dexie cache");
  window.customCreditCards = await getCachedCustomCards();
}

renderEditableCreditCards(); // ✅ Render into UI

  // ✅ Status filter listener
  document.getElementById('statusFilter')?.addEventListener('change', () => {
    renderEntries();
    renderBankBalanceForm();
  });

  // ✅ Input event listeners for credit limit fields
  ['creditLimit-ubs', 'creditLimit-corner', 'creditLimit-pfm', 'creditLimit-cembra'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', renderCreditLimitTable);
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
  // 🔐 Handle static inputs
  Object.values(limitInputs).forEach(input => {
    if (input) input.disabled = locked;
  });

  // 🔐 Handle custom card inputs (by class name)
  document.querySelectorAll('.custom-card-limit').forEach(input => {
    input.disabled = locked;
  });

  // 🔄 Toggle button visibility
  if (lockBtn) lockBtn.style.display = locked ? 'none' : 'inline-block';
  if (unlockBtn) unlockBtn.style.display = locked ? 'inline-block' : 'none';
}

// ✅ Define globally (not nested inside another function)
function closeCardModal() {
  const modal = document.getElementById("cardEditModal");
  modal.style.display = "none";
  document.removeEventListener("keydown", handleEscape);
  modal.removeEventListener("click", handleOutsideClick);
}
  function handleEscape(e) {
    if (e.key === "Escape") closeCardModal();
  }

function handleOutsideClick(e) {
  const modal = document.getElementById("cardEditModal"); // ✅ define it here
  if (e.target === modal) {
    closeCardModal();
  }
}
function showCardEditModal(cardIndex, currentName) {
  const modal = document.getElementById("cardEditModal");
  const input = document.getElementById("editCardNameInput");
  const confirmBtn = document.getElementById("confirmEditBtn");
  const cancelCardEditBtn = document.getElementById("cancelCardEditBtn");
  const deleteBtn = document.getElementById("deleteCardBtn");

  input.value = currentName;
  modal.style.display = "flex";
  input.focus();

  // Remove old handlers
  confirmBtn.onclick = null;
  cancelCardEditBtn.onclick = null;
  deleteBtn.onclick = null;
  document.removeEventListener("keydown", handleEscape);
  modal.removeEventListener("click", handleOutsideClick);

  confirmBtn.onclick = () => {
    const newName = input.value.trim();
    if (newName) {
      window.customCreditCards[cardIndex].name = newName;
      saveCustomCreditCards();
      renderEditableCreditCards();
      renderCreditLimitTable();
    }
    closeCardModal();
  };

  cancelCardEditBtn.onclick = () => {
     closeCardModal();
  };

  deleteBtn.onclick = () => {
    closeCardModal();
    showDeleteCardModal(cardIndex, currentName);
  };

  document.addEventListener("keydown", handleEscape);
  modal.addEventListener("click", handleOutsideClick);
}

function addCreditCard() {
  const modal = document.getElementById("cardAddModal");
  const nameInput = document.getElementById("addCardNameInput");
  const limitInput = document.getElementById("addCardLimitInput");
  const confirmBtn = document.getElementById("confirmAddCardBtn");
  const cancelBtn = document.getElementById("cancelAddCardBtn");

  nameInput.value = "";
  limitInput.value = "";
  modal.style.display = "flex";
  nameInput.focus();

  // Clean up old listeners
  confirmBtn.onclick = null;
  cancelBtn.onclick = null;
  document.removeEventListener("keydown", handleEscape);
  modal.removeEventListener("click", handleOutsideClick);

  confirmBtn.onclick = () => {
    const name = nameInput.value.trim();
    const limit = parseFloat(limitInput.value);

    if (!name) {
      showCustomAlert("⚠️ Please enter a card name.");
      return;
    }

    if (isNaN(limit)) {
      showCustomAlert("⚠️ Please enter a valid number for limit.");
      return;
    }

    window.customCreditCards.push({
      name,
      limit,
      synced: false,
      lastUpdated: Date.now()
    });

    saveCustomCreditCards();
    renderEditableCreditCards();
    renderCreditLimitTable();
    closeAddModal();
  };

  cancelBtn.onclick = closeAddModal;

  function handleEscape(e) {
    if (e.key === "Escape") closeAddModal();
  }

  function handleOutsideClick(e) {
    if (e.target === modal) closeAddModal();
  }

  function closeAddModal() {
    modal.style.display = "none";
    document.removeEventListener("keydown", handleEscape);
    modal.removeEventListener("click", handleOutsideClick);
  }

  document.addEventListener("keydown", handleEscape);
  modal.addEventListener("click", handleOutsideClick);
}

function showDeleteCardModal(cardIndex, cardName) {
  const modal = document.getElementById("cardDeleteModal");
  const confirmBtn = document.getElementById("confirmDeleteCardBtn");
  const cancelBtn = document.getElementById("cancelDeleteCardBtn");
  const message = document.getElementById("deleteCardMessage");

  message.textContent = `Delete card "${cardName}"?`;
  modal.style.display = "flex";

  confirmBtn.onclick = () => {
    window.customCreditCards.splice(cardIndex, 1);
    saveCustomCreditCards();
    renderEditableCreditCards();
    renderCreditLimitTable();
    closeDeleteModal();
  };

  cancelBtn.onclick = closeDeleteModal;

  function handleEscape(e) {
    if (e.key === "Escape") closeDeleteModal();
  }

  function handleOutsideClick(e) {
    if (e.target === modal) closeDeleteModal();
  }

  function closeDeleteModal() {
    modal.style.display = "none";
    document.removeEventListener("keydown", handleEscape);
    modal.removeEventListener("click", handleOutsideClick);
  }

  document.addEventListener("keydown", handleEscape);
  modal.addEventListener("click", handleOutsideClick);
}


function renderCreditLimitTable() {
  if (!Array.isArray(window.customCreditCards)) {
    window.customCreditCards = [];
  }
  const limits = {
    "UBS Master": parseFloat(document.getElementById("creditLimit-ubs")?.value || 0),
    "Corner": parseFloat(document.getElementById("creditLimit-corner")?.value || 0),
    "Postfinance Master": parseFloat(document.getElementById("creditLimit-pfm")?.value || 0),
    "Cembra": parseFloat(document.getElementById("creditLimit-cembra")?.value || 0)
  };

  (window.customCreditCards || []).forEach(card => {
    limits[card.name] = parseFloat(card.limit || 0);
  });

  const totalLimit = Object.values(limits).reduce((a, b) => a + b, 0);

  const totalPlusEl = document.getElementById('v-totalPlus');
  const totalMinusEl = document.getElementById('v-totalMinus');

  const totalPlus = totalPlusEl ? parseFloat(totalPlusEl.textContent.replace('+', '')) || 0 : 0;
  const totalMinus = totalMinusEl ? Math.abs(parseFloat(totalMinusEl.textContent)) || 0 : 0;

  const left = totalLimit - totalMinus;
  const limitPlusTotal = left + totalPlus;

  document.getElementById('v-totalLimit').textContent = totalLimit.toFixed(2);
  document.getElementById('v-totalUsed').textContent = totalMinus.toFixed(2);
  document.getElementById('v-diffUsed').textContent = left.toFixed(2);
  document.getElementById('v-limitPlusTotal').textContent = limitPlusTotal.toFixed(2);
  if (totalPlusEl) totalPlusEl.textContent = '+' + totalPlus.toFixed(2);

  debug("📊 TOTAL LIMIT:", totalLimit.toFixed(2));
  debug("🔻 TOTAL MINUS (Used):", totalMinus.toFixed(2));
  debug("🟢 TOTAL PLUS:", totalPlus.toFixed(2));
  debug("🧮 LEFT (Limit - Used):", left.toFixed(2));
  debug("➕ LEFT + TOTAL PLUS:", limitPlusTotal.toFixed(2));

  updateCreditSummaryCard({
    totalLimit,
    totalUsed: totalMinus,
    diffUsed: left,
    limitPlusTotal,
    totalPlus
  });
}

function updateCreditSummaryCard({
  totalLimit = 0,
  totalUsed = 0,
  diffUsed = 0,
  limitPlusTotal = 0,
  totalPlus = 0
}) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('v-totalLimit', totalLimit.toFixed(2));
  setText('v-totalUsed', totalUsed.toFixed(2));
  setText('v-diffUsed', diffUsed.toFixed(2));
  setText('v-limitPlusTotal', limitPlusTotal.toFixed(2));
  setText('v-totalPlus', '+' + totalPlus.toFixed(2));
}

function renderEditableCreditCards() {
  const grid = document.getElementById("creditGrid");
  grid.querySelectorAll(".custom-credit-card").forEach(el => el.remove());
  const firstSummaryCard = Array.from(grid.children).find(child =>
    child.querySelector("#v-totalLimit")
  );

  (window.customCreditCards || []).forEach((card, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "card custom-credit-card editable-card";
    wrapper.style.position = "relative";

    if (window.editModeActive) {
      wrapper.classList.add('edit-mode-highlight');
      wrapper.onclick = () => {
        showCardEditModal(index, card.name);
      };
    } else {
      wrapper.classList.remove('edit-mode-highlight');
      wrapper.onclick = null;
    }

    const nameWrapper = document.createElement("div");
    nameWrapper.style.display = "flex";
    nameWrapper.style.justifyContent = "space-between";
    nameWrapper.style.alignItems = "center";
    nameWrapper.style.marginBottom = "4px";

    const nameLabel = document.createElement("div");
    nameLabel.textContent = card.name;
    nameLabel.className = "credit-name";
    nameLabel.style.fontSize = "0.6rem";
    nameLabel.style.color = "#555";
    nameLabel.style.flex = "1";

    nameWrapper.appendChild(nameLabel);

    const limitInput = document.createElement("input");
    limitInput.type = "number";
    limitInput.value = card.limit;
    limitInput.disabled = window.initialLocked;
    limitInput.className = "custom-card-limit";

    limitInput.addEventListener("input", () => {
      window.customCreditCards[index].limit = parseFloat(limitInput.value || 0);
      saveCustomCreditCards();
      renderCreditLimitTable();
    });

    wrapper.appendChild(nameWrapper);
    wrapper.appendChild(limitInput);

    if (firstSummaryCard) {
      grid.insertBefore(wrapper, firstSummaryCard);
    } else {
      grid.appendChild(wrapper);
    }
  });
}
// ✅ Save cards
function saveCustomCreditCards() {
  saveAllCustomCards(window.customCreditCards); // ✅ Save to Dexie
  syncCustomCardsToMongo();                     // ✅ Sync to backend
}


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
      showToast("✅ Kredit limits saved", true); // ✅ Replaced alert
      renderCreditLimitTable();
    })
    .catch(err => {
      console.error("❌ Failed to save limits:", err);
      showToast("❌ Could not save limits", false); // ✅ Replaced alert
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


window.addEventListener("online", async () => {
  debug("🔌 Back online. Attempting to sync custom cards...");

  const unsynced = await getUnsyncedCustomCards();
  if (unsynced.length > 0) {
    try {
      const res = await fetch('/api/custom-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ cards: unsynced }),
      });

      if (res.ok) {
        debug(`✅ Synced ${unsynced.length} custom cards`);
        for (const card of unsynced) {
          await db.customCards.update(card.id, { synced: true });
        }
        showToast(`✅ Synced ${unsynced.length} cards`);
      } else {
        console.warn("⚠️ Sync failed with response:", await res.text());
        showToast("❌ Failed to sync cards", false);
      }
    } catch (err) {
      console.error("❌ Failed to sync on reconnect:", err);
      showToast("❌ Sync error: " + err.message, false);
    }
  } else {
    debug("📭 No unsynced cards to sync.");
  }
});


function resetFilters() {
  // Temporarily suppress toast messages
  window.suppressToast = true;

// Clear search inputs
const inputsToClear = ['dateSearch', 'descSearch', 'amountSearch', 'categorySearch', 'bankSearch', 'personSearch'];
inputsToClear.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.value = '';
});

  // Re-enable and reset dropdown filters
// Re-enable and reset dropdown filters, including timeSort
['categoryFilter', 'typeFilter', 'currencyFilter', 'statusFilter', 'bankFilter', 'timeSort'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.disabled = false;
    el.selectedIndex = 0;
  }
});

  // Re-enable and re-check all person checkboxes
const excludedByDefault = ['Balance', 'Transfer'];
document.querySelectorAll('.personOption').forEach(cb => {
  cb.disabled = false;
  cb.checked = !excludedByDefault.includes(cb.value); // uncheck Balance/Transfer
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById("cardEditModal");
    if (modal.style.display === 'flex') {
      modal.style.display = 'none';
    }
  }
});


function showToast(message, success = true) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.style.background = success ? 'black' : '#c0392b'; //  green for success, red for error
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}


function addSwipeListeners(targetElement, onSwipeLeft, onSwipeRight) {
  let touchStartX = 0;
  let touchEndX = 0;

  targetElement.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  });

  targetElement.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
  });

  function handleSwipeGesture() {
    const deltaX = touchEndX - touchStartX;
    if (deltaX > 50) {
      onSwipeRight();
    } else if (deltaX < -50) {
      onSwipeLeft();
    }
  }
}


function clearField(id) {
  const el = document.getElementById(id);
  if (el) {
    el.value = '';
    el.dispatchEvent(new Event('input'));
  }
  renderEntries(); // update the view
}


// Toggle dropdown visibility
function toggleDropdown(id) {
  const dropdown = document.getElementById(id);
  dropdown.classList.toggle('show');
}







// Add entries
document.getElementById('entryForm').addEventListener('submit', async (e) => {
  e.preventDefault();


  const inputDate = document.getElementById('newDate')._flatpickr?.selectedDates[0];
  function formatDateToLocalISO(date) {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().split('T')[0];
  }
  const isoDate = inputDate ? formatDateToLocalISO(inputDate) : '';

  debug('📥 Submitting entry...');
  const entry = {
    date: isoDate,
    description: document.getElementById('newDescription').value,
    category: document.getElementById('newCategory').value,
    amount: parseFloat(document.getElementById('newAmount').value),
    currency: document.getElementById('newCurrency').value,
    type: document.getElementById('newType').value,
    person: document.getElementById('newPerson').value,
    bank: document.getElementById('newBank').value,
    status: document.getElementById('newStatus')?.value || 'Paid' // ✅ Add this line
  };
// ✅ Log the entry before sending
debug("🧾 Entry being submitted:", entry);
try {
  const form = document.getElementById('entryForm');
  const editId = form.dataset.editId;

  const method = editId ? 'PUT' : 'POST';
  const url = editId
    ? `https://bookkeeping-i8e0.onrender.com/api/entries/${editId}`
    : 'https://bookkeeping-i8e0.onrender.com/api/entries';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entry)
  });

  if (!res.ok) {
    const err = await res.json();
    alert('❌ Error saving entry: ' + (err.message || res.statusText));
    return;
  }

  document.getElementById('entryForm').reset();
  await fetchEntries();
  if (editId) delete form.dataset.editId;
  document.getElementById('cancelEditBtn')?.classList.add('hidden');
  updateEntryButtonLabel();
  populateNewEntryDropdowns();
  populateFilters();
  renderEntries();
  renderBankBalanceForm();

  debug('✅ Entry synced to server.');
} catch (error) {
  console.warn('📴 Offline detected – saving entry locally.');
  await saveEntryLocally(entry); // ✅ save to IndexedDB

  // ✅ read entries from IndexedDB and re-render
  const cachedEntries = await getCachedEntries(); 
  window.entries = cachedEntries; // optionally update global cache
  renderEntries(cachedEntries);

  document.getElementById('entryForm').reset();
  alert('📥 Entry saved locally and will sync when back online.');
}
  });

  

  // group of download chart buttons
  document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('chartDropdownToggle');
    const dropdown = document.querySelector('.dropdown3');

    if (toggleBtn && dropdown) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent body click from closing it immediately
        dropdown.classList.toggle('show');
      });

      // Optional: close on outside click
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('show');
        }
      });
    }
  });
  


  async function fetchBankBalances() {
  const res = await fetch(`${backend}/api/balances`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error('Failed to fetch balances');
  return await res.json();
}



// sync to cloud
window.addEventListener('beforeunload', (e) => {
  if (!navigator.onLine) {
    e.preventDefault();
    e.returnValue = ''; // 🛑 Triggers the browser's native "Leave site?" dialog
  }
});


async function saveBankBalances(balances) {
  try {
    await db.balances.clear(); // Optional: clear all before saving
    for (const [bank, value] of Object.entries(balances)) {
      await db.balances.put({ bank, value });
    }
    debug("💾 Bank balances saved to IndexedDB via Dexie");
  } catch (error) {
    console.error("❌ Error saving bank balances to Dexie:", error);
  }
}


// sync to cloud

window.addEventListener('load', async () => {
  // 1. Load cached entries (works offline)
  const cachedEntries = await getCachedEntries();
  renderEntries(cachedEntries);

  // 2. Load balances from backend or Dexie fallback
  await loadInitialBankBalances(); // This sets initialBankBalances
  renderBankBalanceForm(initialBankBalances);

  // 3. If online, sync and refresh data
  if (navigator.onLine) {
    await syncToCloud();
    await fetchEntries(); // fetch + render fresh entries

    const freshBalances = await fetchBankBalances();
    await saveBankBalances(freshBalances);
    renderBankBalanceForm(freshBalances);
  }
});

async function syncToCloud() {
  try {
    const unsynced = await getUnsynced("entries");
    let syncedCount = 0;

    for (const entry of unsynced) {
      const { _id, ...entryToSend } = entry;
      debug("🔁 Sending to backend:", entryToSend);

      const res = await fetch(`${backend}/api/entries`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entryToSend)
      });

      if (res.ok) {
        await markAsSynced('entries', _id);
        debug(`✅ Synced entry: ${entry.description}`);
        syncedCount++;
      } else {
        console.warn(`⚠️ Failed to sync entry: ${entry.description}`);
      }
    }

    if (syncedCount > 0) {
  showCenteredMessage(`✅ Synced ${syncedCount} entr${syncedCount === 1 ? 'y' : 'ies'}`);
      await fetchEntries(); // re-fetch from cloud
      renderEntries();
      renderBankBalanceForm();
    }
  } catch (err) {
    console.error("❌ Sync error:", err);
    showSyncStatus('❌ Sync failed – check console');
  }
}
// sync to cloud
window.addEventListener('offline', () => {
  showCenteredMessage('📴 Offline mode – changes will sync later', 5000);
});

window.addEventListener('online', async () => {
  showCenteredMessage('📶 Back online – syncing...', 2000);
  debug('📶 Back online – trying to sync entries...');
  try {
    const unsynced = await getUnsynced("entries");
    debug(`🔁 Found ${unsynced.length} entries to sync...`);

    for (const entry of unsynced) {
      const { _id, ...entryToSend } = entry;
      const res = await fetch(`${backend}/api/entries`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entryToSend)
      });

      if (res.ok) {
        await markAsSynced("entries", _id);
        debug(`✅ Synced entry: ${entry.description}`);
      } else {
        console.warn(`⚠️ Failed to sync entry: ${entry.description}`);
      }
    }

    await fetchEntries();
    renderEntries();
    renderBankBalanceForm();

    showCenteredMessage(`✅ Synced ${unsynced.length} entr${unsynced.length === 1 ? 'y' : 'ies'}`);
  } catch (e) {
    console.error('❌ Sync error:', e);
    showCenteredMessage('❌ Sync failed – check console');
  }
});

function showCenteredMessage(msg, duration = 3000) {
  let el = document.getElementById('syncStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'syncStatus';
    document.body.appendChild(el);
  }

  Object.assign(el.style, {
    textAlign: 'center',
    background: '#fef4d2',
    color: '#222',
    padding: '10px 16px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    display: 'block',
    position: 'fixed',
    top: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderRadius: '0 0 6px 6px',
    maxWidth: '80%'
  });

  el.textContent = msg;

  if (duration > 0) {
    setTimeout(() => {
      el.style.display = 'none';
    }, duration);
  }
}

function showCustomAlert(message) {
  const modal = document.getElementById("customAlertModal");
  const messageEl = document.getElementById("customAlertMessage");
  const okBtn = document.getElementById("customAlertOkBtn");

  messageEl.textContent = message;
  modal.style.display = "flex";

  function closeModal() {
    modal.style.display = "none";
    okBtn.removeEventListener("click", closeModal);
  }

  okBtn.addEventListener("click", closeModal);
}


document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById("sidebarToggleBtn");
  const sidebar = document.getElementById("customizeSidebar");
  const closeBtn = document.getElementById("sidebarClosePillar");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }

  if (sidebar && closeBtn) {
    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("show");
    });
  }

  // Reusable function for toggle setup with localStorage
  function setupToggle(toggleId, sectionId) {
    const toggle = document.getElementById(toggleId);
    const section = document.getElementById(sectionId);
    if (toggle && section) {
      // Load stored value
      const saved = localStorage.getItem(toggleId);
      if (saved !== null) {
        toggle.checked = saved === 'true';
        section.style.display = toggle.checked ? 'block' : 'none';
      }

      toggle.addEventListener('change', (e) => {
        const show = e.target.checked;
        section.style.display = show ? 'block' : 'none';
        localStorage.setItem(toggleId, show);
      });
    }
  }

  // ✅ Setup for each toggle
setupToggle('toggleBankBalances', 'bankBalancesSection', true);
  setupToggle('toggleAddEntry', 'addEntrySection');
setupToggle('toggleCreditLimits', 'creditLimitsSection', true);
setupToggle('toggleTotals', 'totalsSection');
setupToggle('toggleAverage', 'averageSection');
setupToggle('toggleMultiselect', 'multiselectSection');
setupToggle('toggleFilters', 'filtersSection');
setupToggle('toggleSearches', 'searchesSection');

});


window.sidebarToggleBtn = sidebarToggleBtn;
window.customizeSidebar = customizeSidebar;
window.showCustomAlert = showCustomAlert;
window.getSelectedPersons = getSelectedPersons;
window.togglePersonDropdown = togglePersonDropdown;
window.calculateCurrentBankBalance = calculateCurrentBankBalance;

window.toggleDropdown = toggleDropdown;
window.clearField = clearField;
window.addSwipeListeners = addSwipeListeners;
window.resetFilters = resetFilters;
window.clearSearch = clearSearch;
window.applyValueColor = applyValueColor;
window.openUserManager = openUserManager;
window.loadBankBalancesFromBackend = loadBankBalancesFromBackend;
window.saveBankBalancesToBackend = saveBankBalancesToBackend;
window.loginWithSelectedUser = loginWithSelectedUser;
window.populateLoginUserDropdown = populateLoginUserDropdown;
window.restoreBackup = restoreBackup;
window.backupData = backupData;
window.renderBankBalanceCards = renderBankBalanceCards;
window.fetchBalancesFromBackend = fetchBalancesFromBackend;
window.deleteAllEntries = deleteAllEntries;
window.exportVisibleCardEntriesAsCSV = exportVisibleCardEntriesAsCSV;
window.importEntriesFromCSV = importEntriesFromCSV;
window.logout = logout;
window.toggleTheme = toggleTheme;
window.saveEdit = saveEdit;
window.updateStatus = updateStatus;
window.editEntry = editEntry;
window.populateBankDropdownFromBalances = populateBankDropdownFromBalances;
window.toggleAllPersons = toggleAllPersons;
window.populatePersonFilterForDashboard = populatePersonFilterForDashboard;
window.showChangePassword = showChangePassword;
window.showCenteredMessage = showCenteredMessage;
window.cancelEdit = cancelEdit;
window.duplicateEntry = duplicateEntry;
window.deleteEntry = deleteEntry;
window.populateFilters = populateFilters;
window.populatePersonDropdownForCharts = populatePersonDropdownForCharts;
window.openFullscreen = openFullscreen;
window.closeFullscreen = closeFullscreen;
window.setFontSize = setFontSize;
window.editModeActive = editModeActive;
window.persons = persons;
window.creditCards = creditCards;
window.addCreditCard = addCreditCard;
window.renderEntries = renderEntries;
window.showUserManagerModal = showUserManagerModal;
window.deleteUser = deleteUser;

