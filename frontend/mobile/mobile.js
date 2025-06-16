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




document.addEventListener('DOMContentLoaded', () => {
  entryForm = document.getElementById('entry-form'); // ✅ no `const` here
  const mobileEntryList = document.getElementById('mobileEntryList');

 // ✅ Wrap these inside DOMContentLoaded
const advBtn = document.getElementById('toggleAdvancedFilters');
if (advBtn) {
  advBtn.addEventListener('click', () => {
    document.getElementById('advancedFilters')?.classList.toggle('hidden');
  });
}

const entryBtn = document.getElementById('toggleEntryForm');
if (entryBtn) {
  entryBtn.addEventListener('click', () => {
    document.getElementById('entry-form')?.classList.toggle('hidden');
  });
}

const filterBtn = document.getElementById('toggleFilters');
if (filterBtn) {
  filterBtn.addEventListener('click', () => {
    document.getElementById('filters')?.classList.toggle('hidden');
  });
}

const themeBtn = document.getElementById('toggleTheme');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
  });
}

  // ✅ Define toggle functions here or outside
  window.toggleMobileSummary = function () {
    document.getElementById('mobileSummaryCard').classList.toggle('hidden');
  };

  window.toggleMobileAverage = function () {
    document.getElementById('mobileAverageCard').classList.toggle('hidden');
  };

  window.toggleMobileBank = function () {
    document.getElementById('mobileBankCard').classList.toggle('hidden');
  };

  




  // ✅ Now fetchMobileEntries AFTER renderMobileEntries
 async function fetchMobileEntries() {
  try {
    const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const entries = await res.json();

    window.mobileEntries = entries;
    renderMobileEntries(entries);     // ✅ make sure it's 'entries' not 'filtered'
    populateMobileCards(entries);
  } catch (err) {
    console.error("❌ Failed to load mobile entries", err);
    showToast("❌ Error loading data");
  }
}



function populateSelect(id, values) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = `<option value="All">All</option>`;
  Array.from(values).sort().forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });
}

[
  'monthFilter',
  'categoryFilterMobile',
  'currencyFilterMobile',
  'bankFilterMobile',
  'personFilterMobile',
  'typeFilterMobile',
  'statusFilterMobile'
].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', applyMobileFilters);
  }
});
// ✅ Define renderMobileEntries first
  function renderMobileEntries(entries) {
     window.renderMobileEntries = renderMobileEntries;
    mobileEntries = entries;
    populateFilterOptions(entries); // Make sure this function is also defined somewhere
    mobileEntryList.innerHTML = '';
    mobileEntries.forEach((entry, index) => {
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
renderMobileEntries(filtered);
updateSummary(filtered); // ✅ Use filtered consistently
   
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
    if (e.date?.length >= 7) months.add(e.date.slice(0, 7)); // YYYY-MM
  });

  populateSelect('monthFilter', months);
  populateSelect('categoryFilterMobile', categories);
  populateSelect('currencyFilterMobile', currencies);
  populateSelect('bankFilterMobile', banks);
  populateSelect('personFilterMobile', persons);
  populateSelect('typeFilterMobile', types);
  populateSelect('statusFilterMobile', statuses);
}

  // ✅ Call the fetch once DOM is ready
  fetchMobileEntries();
});

function applyMobileFilters() {
  const month = document.getElementById('monthFilter')?.value;
  const category = document.getElementById('categoryFilterMobile')?.value;
  const currency = document.getElementById('currencyFilterMobile')?.value;
  const bank = document.getElementById('bankFilterMobile')?.value;
  const person = document.getElementById('personFilterMobile')?.value;
  const type = document.getElementById('typeFilterMobile')?.value;
  const status = document.getElementById('statusFilterMobile')?.value;

  const filtered = mobileEntries.filter(e => {
    return (
      (month === 'All' || e.date?.startsWith(month)) &&
      (category === 'All' || e.category === category) &&
      (currency === 'All' || e.currency === currency) &&
      (bank === 'All' || e.bank === bank) &&
      (person === 'All' || e.person === person) &&
      (type === 'All' || e.type === type) &&
      (status === 'All' || e.status === status)
    );
  });

  renderMobileEntries(filtered);       // ✅ Show filtered list
updateSummary(filtered);           // ✅ Show filtered totals
}

function updateSummary(data = mobileEntries) {
  let income = 0;
  let expenses = 0;
  data.forEach(e => {
    const amt = parseFloat(e.amount);
    if (e.type.toLowerCase() === 'income') income += amt;
    else if (e.type.toLowerCase() === 'expense') expenses += amt;
  });
  document.getElementById('mobileIncome').textContent = income.toFixed(2);
  document.getElementById('mobileExpenses').textContent = expenses.toFixed(2);
  document.getElementById('mobileBalance').textContent = (income - expenses).toFixed(2);
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
    row.innerHTML = `<span>${bank}:</span> <span style="color:${change >= 0 ? 'green' : 'red'}">${change.toFixed(2)}</span>`;
    list.appendChild(row);
  }
} // ✅ <--- THIS was missing