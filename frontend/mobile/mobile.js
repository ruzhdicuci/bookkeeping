// mobile.js

const token = localStorage.getItem('token');
let entryForm; // declared globally
  let mobileEntries = [];
if (!token) {
  window.location.href = '/bookkeeping/client/login.html';
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

 window.ChoicesInstances = {};
document.addEventListener('DOMContentLoaded', () => {
  entryForm = document.getElementById('entry-form');
  const mobileEntryList = document.getElementById('mobileEntryList');

 

// Filter configuration
const filterDropdowns = [
  { id: 'monthFilter', placeholder: 'Select Months' },
  { id: 'categoryFilterMobile', placeholder: 'Select Categories' },
  { id: 'typeFilterMobile', placeholder: 'Select Types' },
  { id: 'currencyFilterMobile', placeholder: 'Select Currencies' },
  { id: 'bankFilterMobile', placeholder: 'Select Banks' },
  { id: 'statusFilterMobile', placeholder: 'Select Status' },
  { id: 'personFilterMobile', placeholder: 'Select Persons' }
];


// Initialize Choices
filterDropdowns.forEach(({ id, placeholder }) => {
  const el = document.getElementById(id);
  if (el) {
    // Avoid double init
    if (window.ChoicesInstances[id]) {
      window.ChoicesInstances[id].destroy();
    }

    const instance = new Choices(el, {
      removeItemButton: true,
      shouldSort: false,
      placeholder: true,
      placeholderValue: placeholder,
      searchPlaceholderValue: 'Search...'
    });

    window.ChoicesInstances[id] = instance;

    // Hook to your filter logic
    el.addEventListener('change', applyMobileFilters);
  }
});

  // ✅ These toggle buttons must also be inside DOMContentLoaded:
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

  // ✅ Also define these window toggle helpers here
  window.toggleMobileSummary = function () {
    document.getElementById('mobileSummaryCard').classList.toggle('hidden');
  };
  window.toggleMobileAverage = function () {
    document.getElementById('mobileAverageCard').classList.toggle('hidden');
  };
  window.toggleMobileBank = function () {
    document.getElementById('mobileBankCard').classList.toggle('hidden');
  };

  // ✅ Finally, fetch entries
  fetchMobileEntries(); // This MUST stay inside DOMContentLoaded
});




  // ✅ Now fetchMobileEntries AFTER renderMobileEntries
async function fetchMobileEntries() {
  try {
    const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const entries = await res.json();
    window.mobileEntries = entries;

    populateFilterOptions(entries);        // ✅ first: fill the dropdowns
    renderMobileEntries(entries);          // ✅ then: render filtered view
    updateSummary(entries);
    updateAverages(entries);
    updateBankChanges(entries);

  } catch (err) {
    console.error("❌ Failed to load mobile entries", err);
    showToast("❌ Error loading data");
  }
}





// ✅ Populate a single <select> with values + Choices.js
function populateSelect(id, values) {
  const select = document.getElementById(id);
  if (!select) return;

  // Destroy any previous instance
  if (window.ChoicesInstances[id]) {
    window.ChoicesInstances[id].destroy();
  }

  // Clear and add "All" option
  select.innerHTML = '';
  const allOption = new Option('All', 'All', true, true); // true, true selects it
  select.add(allOption);

  [...values].sort().forEach(val => {
    const opt = new Option(val, val);
    select.add(opt);
  });

  const instance = new Choices(select, {
    removeItemButton: true,
    shouldSort: false,
    placeholder: true,
    placeholderValue: 'Select...',
    searchPlaceholderValue: 'Search...'
  });

  window.ChoicesInstances[id] = instance;

  // ✅ Manually select "All"
  instance.setChoiceByValue('All');

  // Always hook listener freshly
  select.removeEventListener('change', applyMobileFilters);
  select.addEventListener('change', applyMobileFilters);
}


function populateFilterOptions(entries) {
  const categories = new Set();
  const currencies = new Set();
  const banks = new Set();
  const persons = new Set();
  const types = new Set();
  const statuses = new Set();
  const months = new Set();

  entries.forEach(e => {
    if (e.category) categories.add(e.category);
    if (e.currency) currencies.add(e.currency);
    if (e.bank) banks.add(e.bank);
    if (e.person) persons.add(e.person);
    if (e.type) types.add(e.type);
    if (e.status) statuses.add(e.status);
    if (e.date) months.add(e.date.slice(0, 7));
  });

  populateSelect('monthFilter', months);
  populateSelect('categoryFilterMobile', categories);
  populateSelect('currencyFilterMobile', currencies);
  populateSelect('bankFilterMobile', banks);
  populateSelect('personFilterMobile', persons);
  populateSelect('typeFilterMobile', types);
  populateSelect('statusFilterMobile', statuses);
}

// ✅ Define renderMobileEntries first
function renderMobileEntries(entries) {
    console.log('📦 Rendering entries:', entries.length);
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
            <span class="amount ${amountClass}">
              ${parseFloat(entry.amount).toFixed(2)}
            </span>
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

  updateSummary(entries);
  updateAverages(entries);
  updateBankChanges(entries);
}

// ✅ Helper to get selected values from Choices.js
function getSelectedValues(id) {
  const values = window.ChoicesInstances[id]?.getValue(true) || [];
  return values.includes('All') ? null : values;
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


function updateAverages(entries) {
  const months = [...new Set(entries.map(e => e.date?.slice(0, 7)))].filter(Boolean);
  const income = entries.filter(e => e.type === 'Income').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const expense = entries.filter(e => e.type === 'Expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const avgIncome = income / months.length || 0;
  const avgExpense = expense / months.length || 0;
  const avgBalance = avgIncome - avgExpense;

  document.getElementById('avgIncome').textContent = avgIncome.toFixed(2);
  document.getElementById('avgExpenses').textContent = avgExpense.toFixed(2);
  document.getElementById('avgBalance').textContent = avgBalance.toFixed(2);
}

function updateBankChanges(entries) {
  const bankChanges = {};
  entries.forEach(e => {
    const amount = parseFloat(e.amount) || 0;
    const bank = e.bank;
    if (!bankChanges[bank]) bankChanges[bank] = 0;
    bankChanges[bank] += (e.type === 'Income' ? amount : -amount);
  });

  const list = document.getElementById('bankChangesList');
  list.innerHTML = '';

  for (const [bank, change] of Object.entries(bankChanges)) {
    const row = document.createElement('div');
    row.className = 'bank-row';
    row.innerHTML = `
      <span class="bank-name">${bank}</span>
      <span class="bank-change ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}">
        ${change.toFixed(2)}
      </span>
    `;
    list.appendChild(row);
  }
}


function updateSummary(data = mobileEntries) {
  let income = 0;
  let expenses = 0;
  data.forEach(e => {
    const amt = parseFloat(e.amount);
    if (e.type.toLowerCase() === 'income') income += amt;
    else if (e.type.toLowerCase() === 'expense') expenses += amt;
  });

  document.getElementById('summaryIncome').textContent = income.toFixed(2);
  document.getElementById('summaryExpenses').textContent = expenses.toFixed(2);
  document.getElementById('summaryBalance').textContent = (income - expenses).toFixed(2);
}


  function getFormData() {
    return {
      date: document.getElementById('newDate').value,
      description: document.getElementById('newDescription').value,
      amount: document.getElementById('newAmount').value,
      currency: document.getElementById('newCurrency').value,
      type: document.getElementById('newType').value,
      person: document.getElementById('newPerson').value,
      bank: document.getElementById('newBank').value,
      category: document.getElementById('newCategory').value,
      status: document.getElementById('newStatus').value
    };
  }

  function clearForm() {
    entryForm.reset();
  }

  window.editMobileEntry = function(index) {
    const entry = mobileEntries[index];
    Object.entries(entry).forEach(([key, val]) => {
      const el = document.getElementById(`new${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (el) el.value = val;
    });
    entryForm.dataset.editIndex = index;
    showToast("Editing entry...");
  }

 window.deleteMobileEntry = function(index) {
  const confirmed = confirm("Are you sure you want to delete this entry?");
  if (!confirmed) return;

  mobileEntries.splice(index, 1);
  renderMobileEntries(mobileEntries);
  showToast("Entry deleted");
};

  window.duplicateMobileEntry = function(index) {
    const copy = { ...mobileEntries[index] };
    delete copy._id;
    copy.description += ' (Copy)';
    mobileEntries.push(copy);
    renderMobileEntries(mobileEntries);
    showToast("✅ Entry duplicated");
  }

 if (entryForm) {
  entryForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = getFormData();
    const index = entryForm.dataset.editIndex;
    if (index !== undefined) {
      mobileEntries[parseInt(index)] = data;
      delete entryForm.dataset.editIndex;
      showToast("Entry updated");
    } else {
      mobileEntries.push(data);
      showToast("Entry added");
    }
    clearForm();
    renderMobileEntries(mobileEntries);
  });
}

  ['descFilter', 'typeFilter', 'dateFilter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      const value = document.getElementById(id).value.toLowerCase();
      document.querySelectorAll('#mobileEntryList .mobile-entry').forEach(li => {
        li.style.display = li.textContent.toLowerCase().includes(value) ? '' : 'none';
      });
    });
  });







// 🔁 You already calculate these in dashboard.js; just reuse values from entries
function populateMobileCards(entries) {
  const months = [...new Set(entries.map(e => e.date?.slice(0, 7)))].filter(Boolean);
  let income = 0, expense = 0;
  const bankChanges = {};

  entries.forEach(e => {
    const amount = parseFloat(e.amount) || 0;
    if (e.type === 'Income') income += amount;
    if (e.type === 'Expense') expense += amount;

    const bank = e.bank;
    if (!bankChanges[bank]) bankChanges[bank] = 0;
    bankChanges[bank] += (e.type === 'Income' ? amount : -amount);
  });

  const avgIncome = income / months.length;
  const avgExpense = expense / months.length;
  const avgBalance = avgIncome - avgExpense;

  // Summary
  document.getElementById('summaryIncome').textContent = income.toFixed(2);
  document.getElementById('summaryExpenses').textContent = expense.toFixed(2);
  document.getElementById('summaryBalance').textContent = (income - expense).toFixed(2);

  // Averages
  document.getElementById('avgIncome').textContent = avgIncome.toFixed(2);
  document.getElementById('avgExpenses').textContent = avgExpense.toFixed(2);
  document.getElementById('avgBalance').textContent = avgBalance.toFixed(2);

  // Bank changes
const list = document.getElementById('bankChangesList');
list.innerHTML = '';

for (const [bank, change] of Object.entries(bankChanges)) {
  const row = document.createElement('div');
  row.className = 'bank-row';
  row.innerHTML = `
    <span class="bank-name">${bank}</span>
    <span class="bank-change ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}">
      ${change.toFixed(2)}
    </span>
  `;
  list.appendChild(row);
}


} // ✅ <--- THIS was missing