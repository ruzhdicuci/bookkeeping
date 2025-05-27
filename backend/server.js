// ✅ Backend API root
const backend = 'https://bookkeeping-i8e0.onrender.com';
const token = localStorage.getItem('token');
if (!token) location.href = 'index.html';

// ✅ DOM Elements
const entryTableBody = document.getElementById('entryTableBody');
const monthSelect = document.getElementById('monthSelect');
const bankFilter = document.getElementById('bankFilter');
const personOptions = document.getElementById('personOptions');
const currencyFilter = document.getElementById('currencyFilter');
const typeFilter = document.getElementById('typeFilter');
const descSearch = document.getElementById('descSearch');
const amountSearch = document.getElementById('amountSearch');

let entries = [];
let initialBankBalances = {};

// ✅ Load balances from localStorage
const storedBalances = localStorage.getItem('initialBankBalances');
if (storedBalances) {
  initialBankBalances = JSON.parse(storedBalances);
}

// ✅ Filters update
monthSelect.onchange =
  bankFilter.onchange =
  typeFilter.onchange =
  currencyFilter.onchange =
  descSearch.oninput =
  amountSearch.oninput = renderEntries;

document.addEventListener('change', (e) => {
  if (e.target.matches('#personOptions input[type="checkbox"]')) {
    renderEntries();
  }
});

// ✅ Initial load
fetchEntries();

async function fetchEntries() {
  try {
    const res = await fetch(`${backend}/api/entries`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    entries = await res.json();

    await loadInitialBankBalances();
    populateFilters();
    renderBankBalanceForm();
    renderEntries();
  } catch (err) {
    console.error("❌ Failed to load entries:", err);
  }
}

async function loadInitialBankBalances() {
  const res = await fetch(`${backend}/api/balances`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  initialBankBalances = await res.json();
  localStorage.setItem('initialBankBalances', JSON.stringify(initialBankBalances));
}

function populateFilters() {
  const months = [...new Set(entries.map(e => e.date.slice(0, 7)))].sort();
  monthSelect.innerHTML = `<option value="">All</option>` + months.map(m => `<option value="${m}">${m}</option>`).join('');

  const banks = [...new Set(entries.map(e => e.bank))].filter(Boolean);
  bankFilter.innerHTML = `<option value="">All</option>` + banks.map(b => `<option value="${b}">${b}</option>`).join('');

  const persons = [...new Set(entries.map(e => e.person))].filter(Boolean);
  personOptions.innerHTML = `
    <label><input type="checkbox" id="selectAllPersons" /> <strong>All</strong></label>
    ${persons.map(p => `
      <label>
        <input type="checkbox" class="personOption" value="${p}" checked /> ${p}
      </label>
    `).join('')}
  `;

  document.getElementById('selectAllPersons').onchange = function () {
    document.querySelectorAll('.personOption').forEach(cb => cb.checked = this.checked);
    renderEntries();
  };

  document.querySelectorAll('.personOption').forEach(cb => {
    cb.onchange = () => {
      const all = document.querySelectorAll('.personOption');
      const checked = document.querySelectorAll('.personOption:checked');
      document.getElementById('selectAllPersons').checked = all.length === checked.length;
      renderEntries();
    };
  });
}

function renderEntries() {
  const selectedPersons = Array.from(document.querySelectorAll('.personOption:checked')).map(cb => cb.value);

  const filtered = entries.filter(e =>
    (!monthSelect.value || e.date.startsWith(monthSelect.value)) &&
    (selectedPersons.length === 0 || selectedPersons.includes(e.person)) &&
    (!bankFilter.value || e.bank === bankFilter.value) &&
    (!typeFilter.value || e.type === typeFilter.value) &&
    (!currencyFilter.value || e.currency === currencyFilter.value) &&
    (!descSearch.value || e.description.toLowerCase().includes(descSearch.value.toLowerCase())) &&
    (!amountSearch.value || String(e.amount ?? '').includes(amountSearch.value))
  );

  let incomeTotal = 0;
  let expenseTotal = 0;
  entryTableBody.innerHTML = '';

  filtered.forEach(e => {
    const type = (e.type || '').toLowerCase();
    const amount = Number(e.amount) || 0;
    if (type === 'income') incomeTotal += amount;
    else expenseTotal += amount;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${e.date}</td>
      <td>${e.description}</td>
      <td>${e.amount}</td>
      <td>${e.currency || ''}</td>
      <td>${e.type}</td>
      <td>${e.person}</td>
      <td>${e.bank}</td>
      <td><button onclick="deleteEntry('${e._id}')">🗑️</button></td>
    `;
    entryTableBody.appendChild(row);
  });

  document.getElementById('totalIncome').textContent = incomeTotal.toFixed(2);
  document.getElementById('totalExpense').textContent = expenseTotal.toFixed(2);
  document.getElementById('totalBalance').textContent = (incomeTotal - expenseTotal).toFixed(2);
}

async function deleteEntry(id) {
  await fetch(`${backend}/api/entries/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  fetchEntries();
}
