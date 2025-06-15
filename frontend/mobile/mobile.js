// ✅ Always define token first
const token = localStorage.getItem('token');

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
  let mobileEntries = [];

  function renderMobileEntries(entries) {
    mobileEntries = entries;
    mobileEntryList.innerHTML = '';
    mobileEntries.forEach((entry, index) => {
      const li = document.createElement('li');
      li.className = 'mobile-entry';
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 10px; background: #fff; border-radius: 10px; margin-bottom: 8px; font-family: system-ui, sans-serif;">
          <div style="text-align: left;">
            <div style="font-size: 1.2rem; font-weight: bold;">${new Date(entry.date).getDate().toString().padStart(2, '0')}</div>
            <div style="color: grey; font-size: 0.9rem;">${new Date(entry.date).toLocaleString('default', { month: 'short' })}</div>
            <div style="color: grey; font-size: 0.85rem;">${new Date(entry.date).getFullYear()}</div>
          </div>
          <div style="flex: 1; padding-left: 10px;">
            <div style="font-weight: bold; font-size: 1rem;">${entry.description}</div>
            <div style="font-size: 0.85rem; color: #444;">${entry.category} • <span style="color: blue;">${entry.person}</span> • <span style="color: orange;">${entry.bank}</span></div>
            <div style="font-size: 0.8rem; color: grey;">Status: ${entry.status}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: grey;">CHF</div>
            <div style="font-size: 1rem; color: red; font-weight: bold;">${parseFloat(entry.amount).toFixed(2)}</div>
            <div style="margin-top: 8px; display: flex; gap: 4px;">
              <button onclick="editMobileEntry(${index})" style="background-color: #f1f1f1; border: none; padding: 3px 6px;">✏️</button>
              <button onclick="deleteMobileEntry(${index})" style="background-color: #f1f1f1; border: none; padding: 3px 6px;">🗑️</button>
              <button onclick="duplicateMobileEntry(${index})" style="background-color: #f1f1f1; border: none; padding: 3px 6px;">📄</button>
            </div>
          </div>
        </div>
      `;
      mobileEntryList.appendChild(li);
    });
    updateSummary();
  }

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

  window.duplicateMobileEntry = function(index) {
    const copy = { ...mobileEntries[index] };
    delete copy._id;
    copy.description += ' (Copy)';
    mobileEntries.push(copy);
    renderMobileEntries(mobileEntries);
    showToast("✅ Entry duplicated");
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

  fetchMobileEntries();
});