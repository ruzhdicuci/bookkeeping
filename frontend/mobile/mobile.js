if (!token) {
  alert("🔒 Please log in first.");
  window.location.href = '/'; // redirect to desktop login
}
const token = localStorage.getItem('token'); // or however you store the JWT
document.addEventListener('DOMContentLoaded', () => {
  const entryForm = document.getElementById('entry-form');
  const mobileEntryList = document.getElementById('mobileEntryList');
  const toast = document.getElementById('toast');

  let mobileEntries = []; // Local state for mobile entries

  function showToast(message) {
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 2000);
  }

  function renderMobileEntries() {
    mobileEntryList.innerHTML = '';
    mobileEntries.forEach((entry, index) => {
      const li = document.createElement('li');
      li.className = 'mobile-entry';
      li.innerHTML = `
        <div><strong>${entry.date}</strong> - ${entry.description}</div>
        <div>${entry.amount} ${entry.currency} | ${entry.type}</div>
        <div>${entry.person} | ${entry.bank} | ${entry.category}</div>
        <div>Status: ${entry.status}</div>
        <button onclick="editMobileEntry(${index})">✏️</button>
        <button onclick="deleteMobileEntry(${index})">🗑️</button>
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

  function editMobileEntry(index) {
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

  function deleteMobileEntry(index) {
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
});




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
    showToast("❌ Failed to load data");
  }
}

function renderMobileEntries(entries) {
  const list = document.getElementById('mobileEntryList');
  list.innerHTML = '';

  let income = 0, expenses = 0;

  entries.forEach(e => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${e.date}</strong> - ${e.description} 
      (${e.amount} ${e.currency}) - ${e.type}
      <br><small>${e.person} - ${e.bank} - ${e.category}</small>
    `;
    list.appendChild(li);

    if (e.type.toLowerCase() === 'income') income += parseFloat(e.amount);
    else expenses += parseFloat(e.amount);
  });

  const balance = income - expenses;

  document.getElementById('mobileIncome').textContent = income.toFixed(2);
  document.getElementById('mobileExpenses').textContent = expenses.toFixed(2);
  document.getElementById('mobileBalance').textContent = balance.toFixed(2);
}

document.addEventListener('DOMContentLoaded', fetchMobileEntries);


function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}