// ✅ Token & form check
const token = localStorage.getItem('token');
let entryForm;
let mobileEntries = [];
if (!token) window.location.href = '/bookkeeping/client/login.html';

// ✅ Toast helper
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// ✅ Choices state
window.ChoicesInstances = {};

// ✅ Run after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  entryForm = document.getElementById('entry-form');
  const mobileEntryList = document.getElementById('mobileEntryList');

  // 🔘 Initialize Choices for dropdowns
  const filters = [
    { id: 'monthFilter', placeholder: 'Select Months' },
    { id: 'categoryFilterMobile', placeholder: 'Select Categories' },
    { id: 'typeFilterMobile', placeholder: 'Select Types' },
    { id: 'currencyFilterMobile', placeholder: 'Select Currencies' },
    { id: 'bankFilterMobile', placeholder: 'Select Banks' },
    { id: 'statusFilterMobile', placeholder: 'Select Status' },
    { id: 'personFilterMobile', placeholder: 'Select Persons' }
  ];

  filters.forEach(({ id, placeholder }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.ChoicesInstances[id]) window.ChoicesInstances[id].destroy();
    const instance = new Choices(el, {
      removeItemButton: true,
      shouldSort: false,
      placeholder: true,
      placeholderValue: placeholder,
      searchPlaceholderValue: 'Search...'
    });
    window.ChoicesInstances[id] = instance;
    el.addEventListener('change', applyMobileFilters);
  });

  // 🧩 UI toggles
  document.getElementById('toggleAdvancedFilters')?.addEventListener('click', () => {
    document.getElementById('advancedFilters')?.classList.toggle('hidden');
  });
  document.getElementById('toggleEntryForm')?.addEventListener('click', () => {
    document.getElementById('entry-form')?.classList.toggle('hidden');
  });
  document.getElementById('toggleFilters')?.addEventListener('click', () => {
    document.getElementById('filters')?.classList.toggle('hidden');
  });
  document.getElementById('toggleTheme')?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
  });
  window.toggleMobileSummary = () => document.getElementById('mobileSummaryCard')?.classList.toggle('hidden');
  window.toggleMobileAverage = () => document.getElementById('mobileAverageCard')?.classList.toggle('hidden');
  window.toggleMobileBank = () => document.getElementById('mobileBankCard')?.classList.toggle('hidden');

  fetchMobileEntries(); // ⬅️ Start the app
});

// ✅ Load data from API
async function fetchMobileEntries() {
  try {
    const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const entries = await res.json();
    window.mobileEntries = entries;

    populateFilterOptions(entries);
    renderMobileEntries(entries);
    updateSummary(entries);
    updateAverages(entries);
    updateBankChanges(entries);
  } catch (err) {
    console.error("❌ Failed to load mobile entries", err);
    showToast("❌ Error loading data");
  }
}

// ✅ Helper to get selected values from Choices.js
function getSelectedValues(id) {
  const values = window.ChoicesInstances[id]?.getValue(true) || [];
  return values.includes('All') ? null : values;
}

// ✅ Populate Choices.js with options
function populateSelect(id, values) {
  const select = document.getElementById(id);
  if (!select) return;
  if (window.ChoicesInstances[id]) window.ChoicesInstances[id].destroy();
  select.innerHTML = '';
  select.add(new Option('All', 'All'));
  [...values].sort().forEach(val => select.add(new Option(val, val)));
  const instance = new Choices(select, {
    removeItemButton: true,
    shouldSort: false,
    placeholder: true,
    placeholderValue: 'Select...',
    searchPlaceholderValue: 'Search...'
  });
  window.ChoicesInstances[id] = instance;
  select.removeEventListener('change', applyMobileFilters);
  select.addEventListener('change', applyMobileFilters);
}

// ✅ Populate filters from entries
function populateFilterOptions(entries) {
  const getUnique = (key) => new Set(entries.map(e => e[key]).filter(Boolean));
  const months = new Set(entries.map(e => e.date?.slice(0, 7)).filter(Boolean));
  populateSelect('monthFilter', months);
  populateSelect('categoryFilterMobile', getUnique('category'));
  populateSelect('currencyFilterMobile', getUnique('currency'));
  populateSelect('bankFilterMobile', getUnique('bank'));
  populateSelect('personFilterMobile', getUnique('person'));
  populateSelect('typeFilterMobile', getUnique('type'));
  populateSelect('statusFilterMobile', getUnique('status'));
}

// ✅ Apply filters to entries
function applyMobileFilters() {
  const selectedMonths = getSelectedValues('monthFilter');
  const selectedCategories = getSelectedValues('categoryFilterMobile');
  const selectedCurrencies = getSelectedValues('currencyFilterMobile');
  const selectedBanks = getSelectedValues('bankFilterMobile');
  const selectedPersons = getSelectedValues('personFilterMobile');
  const selectedTypes = getSelectedValues('typeFilterMobile');
  const selectedStatuses = getSelectedValues('statusFilterMobile');

  const filtered = mobileEntries.filter(e => {
    const match =
      (!selectedMonths || selectedMonths.includes(e.date?.slice(0, 7))) &&
      (!selectedCategories || selectedCategories.includes(e.category)) &&
      (!selectedCurrencies || selectedCurrencies.includes(e.currency)) &&
      (!selectedBanks || selectedBanks.includes(e.bank)) &&
      (!selectedPersons || selectedPersons.includes(e.person)) &&
      (!selectedTypes || selectedTypes.includes(e.type)) &&
      (!selectedStatuses || selectedStatuses.includes(e.status));
    return match;
  });

  renderMobileEntries(filtered);
  updateSummary(filtered);
  updateAverages(filtered);
  updateBankChanges(filtered);
}

// ✅ Render entries
function renderMobileEntries(entries) {
  const mobileEntryList = document.getElementById('mobileEntryList');
  mobileEntryList.innerHTML = '';
  entries.forEach((entry, index) => {
    const li = document.createElement('li');
    const amountClass = entry.type.toLowerCase() === 'income' ? 'income' : 'expense';
    li.className = 'mobile-entry';
    li.innerHTML = `
      <div class="entry-card">
        <div class="entry-date">
          <div class="day">${new Date(entry.date).getDate().toString().padStart(2, '0')}</div>
          <div class="month">${new Date(entry.date).toLocaleString('default', { month: 'short' })}</div>
          <div class="year">${new Date(entry.date).getFullYear()}</div>
        </div>
        <div class="entry-main">
          <div class="description">${entry.description}</div>
          <div class="meta">
            <span class="category">${entry.category}</span> •
            <span class="person">${entry.person}</span> •
            <span class="bank">${entry.bank}</span>
          </div>
          <div class="status ${entry.status === 'Open' ? 'open' : ''}">Status: ${entry.status}</div>
        </div>
        <div class="entry-amount">
          <div class="amount-line">
            <span class="currency">CHF</span>
            <span class="amount ${amountClass}">${parseFloat(entry.amount).toFixed(2)}</span>
          </div>
          <div class="buttons">
            <button onclick="editMobileEntry(${index})">✏️</button>
            <button onclick="deleteMobileEntry(${index})">🗑️</button>
            <button onclick="duplicateMobileEntry(${index})">📄</button>
          </div>
        </div>
      </div>`;
    mobileEntryList.appendChild(li);
  });
}

// ✅ Totals
function updateSummary(data) {
  let income = 0, expenses = 0;
  data.forEach(e => {
    const amt = parseFloat(e.amount);
    if (e.type.toLowerCase() === 'income') income += amt;
    if (e.type.toLowerCase() === 'expense') expenses += amt;
  });
  document.getElementById('summaryIncome').textContent = income.toFixed(2);
  document.getElementById('summaryExpenses').textContent = expenses.toFixed(2);
  document.getElementById('summaryBalance').textContent = (income - expenses).toFixed(2);
}

// ✅ Averages
function updateAverages(entries) {
  const months = [...new Set(entries.map(e => e.date?.slice(0, 7)).filter(Boolean))];
  const income = entries.filter(e => e.type === 'Income').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const expense = entries.filter(e => e.type === 'Expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const avgIncome = income / months.length || 0;
  const avgExpense = expense / months.length || 0;
  const avgBalance = avgIncome - avgExpense;
  document.getElementById('avgIncome').textContent = avgIncome.toFixed(2);
  document.getElementById('avgExpenses').textContent = avgExpense.toFixed(2);
  document.getElementById('avgBalance').textContent = avgBalance.toFixed(2);
}

// ✅ Bank change table
function updateBankChanges(entries) {
  const changes = {};
  entries.forEach(e => {
    const bank = e.bank;
    const amt = parseFloat(e.amount) || 0;
    if (!changes[bank]) changes[bank] = 0;
    changes[bank] += e.type === 'Income' ? amt : -amt;
  });

  const list = document.getElementById('bankChangesList');
  list.innerHTML = '';
  for (const [bank, change] of Object.entries(changes)) {
    const row = document.createElement('div');
    row.className = 'bank-row';
    row.innerHTML = `
      <span class="bank-name">${bank}</span>
      <span class="bank-change ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}">${change.toFixed(2)}</span>
    `;
    list.appendChild(row);
  }
}
