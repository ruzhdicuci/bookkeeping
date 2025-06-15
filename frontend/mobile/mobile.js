// ✅ Always define token first
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/client/login.html'; // 👈 your actual login path
}

// ✅ Toast function
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  const entryForm = document.getElementById('entry-form');
  const mobileEntryList = document.getElementById('mobileEntryList');
  const toast = document.getElementById('toast');

  let mobileEntries = []; // Local state for mobile entries

  // ✅ Fetch entries from API
  async function fetchMobileEntries() {
    try {
      const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/entries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const entries = await res.json();
      renderMobileEntries(entries);
    } catch (err) {
      console.error("❌ Failed to load mobile entries", err);
      showToast("❌ Error loading data");
    }
  }

 function renderMobileEntries(entries) {
  mobileEntries = entries;
  mobileEntryList.innerHTML = '';
  mobileEntries.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'mobile-entry';
    li.style.padding = '8px';
    li.style.border = '1px solid #ccc';
    li.style.borderRadius = '8px';
    li.style.marginBottom = '10px';
    li.style.backgroundColor = '#f9f9f9';

    li.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 0.8rem; color: grey;">${entry.date}</div>
        <div>
          <button onclick="editMobileEntry(${index})" style="font-size: 0.75rem; margin-right: 4px;">✏️</button>
          <button onclick="deleteMobileEntry(${index})" style="font-size: 0.75rem;">🗑️</button>
        </div>
      </div>

      <div style="font-weight: bold; font-size: 1rem; color: black; margin: 4px 0;">${entry.description}</div>

      <div style="font-size: 0.85rem; color: #333; margin-bottom: 2px;">
        ${entry.amount} ${entry.currency} – ${entry.type}
      </div>

      <div style="font-size: 0.85rem; margin-bottom: 2px;">
        <span style="color: blue;">${entry.person}</span> – 
        <span style="color: orange;">${entry.bank}</span> – 
        <span style="color: green;">${entry.category}</span>
      </div>

      <div style="font-size: 0.8rem; color: grey;">Status: ${entry.status}</div>
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
    renderMobileEntries(mobileEntries);
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
    renderMobileEntries(mobileEntries);
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

  // ✅ Finally fetch entries after everything is defined
  fetchMobileEntries();
});