// ✅ Always define token first
const token = localStorage.getItem('token');

let mobileEntries = []; // Global state

// ✅ Toast function
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

// ✅ Now fetch entries
async function fetchMobileEntries() {
  try {
    const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const entries = await res.json();
    mobileEntries = entries;
    renderMobileEntries();
  } catch (err) {
    console.error("❌ Failed to load mobile entries", err);
    showToast("❌ Error loading data");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const entryForm = document.getElementById('entry-form');
  const mobileEntryList = document.getElementById('mobileEntryList');

  function renderMobileEntries() {
    mobileEntryList.innerHTML = '';
    mobileEntries.forEach((entry, index) => {
      const li = document.createElement('li');
      li.className = 'mobile-entry';
      li.innerHTML = `
        <div class="entry-date">${entry.date}</div>
        <div class="entry-description">${entry.description} <span class="entry-amount">(${entry.amount} ${entry.currency})</span> - ${entry.type}</div>
        <div class="entry-meta">
          <span class="entry-person">${entry.person}</span>
          <span class="entry-bank">${entry.bank}</span>
          <span class="entry-category">${entry.category}</span>
        </div>
        <div class="entry-status">${entry.status}</div>
        <div class="entry-actions">
          <button onclick="editMobileEntry(${index})">✏️</button>
          <button onclick="deleteMobileEntry(${index})">🗑️</button>
        </div>
      `;
      mobileEntryList.appendChild(li);
    });
    updateSummary();
  }

  function updateSummary() {
    let income = 0;
    let expenses = 0;
    mobileEntries.forEach(e => {
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
    document.getElementById('newDate').value = entry.date;
    document.getElementById('newDescription').value = entry.description;
    document.getElementById('newAmount').value = entry.amount;
    document.getElementById('newCurrency').value = entry.currency;
    document.getElementById('newType').value = entry.type;
    document.getElementById('newPerson').value = entry.person;
    document.getElementById('newBank').value = entry.bank;
    document.getElementById('newCategory').value = entry.category;
    document.getElementById('newStatus').value = entry.status;
    entryForm.dataset.editIndex = index;
    showToast("Editing entry...");
  }

  window.deleteMobileEntry = function(index) {
    mobileEntries.splice(index, 1);
    renderMobileEntries();
    showToast("Entry deleted");
  }

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
    renderMobileEntries();
  });

  document.getElementById('descFilter').addEventListener('input', () => {
    const value = document.getElementById('descFilter').value.toLowerCase();
    document.querySelectorAll('#mobileEntryList .mobile-entry').forEach(li => {
      li.style.display = li.textContent.toLowerCase().includes(value) ? '' : 'none';
    });
  });

  document.getElementById('typeFilter').addEventListener('input', () => {
    const value = document.getElementById('typeFilter').value.toLowerCase();
    document.querySelectorAll('#mobileEntryList .mobile-entry').forEach(li => {
      li.style.display = li.textContent.toLowerCase().includes(value) ? '' : 'none';
    });
  });

  document.getElementById('dateFilter').addEventListener('input', () => {
    const value = document.getElementById('dateFilter').value;
    document.querySelectorAll('#mobileEntryList .mobile-entry').forEach(li => {
      li.style.display = li.textContent.includes(value) ? '' : 'none';
    });
  });

  // ✅ Fetch data on load
  fetchMobileEntries();
});