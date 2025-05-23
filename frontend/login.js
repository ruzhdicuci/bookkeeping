// LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginUserSelect').value; // 👈 this was 'loginEmail'
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
    window.location.href = 'dashboard.html';
  } else {
    alert(data.message || 'Login failed');
  }
});


// REGISTER
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    alert('✅ Registered successfully. You can now log in.');
  } else {
    alert(data.message || 'Registration failed');
  }
});

async function registerUser() {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    alert('✅ Registered successfully!');
    populateLoginUserDropdown(); // refresh login dropdown
  } else {
    alert(data.message || 'Registration failed');
  }
}


// Fetch and populate login dropdown with registered users
async function populateLoginUserDropdown() {
  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/users');
  const users = await res.json();

  const loginSelect = document.getElementById('loginUserSelect');
  loginSelect.innerHTML = users.map(email => `<option value="${email}">${email}</option>`).join('');

  const lastUser = localStorage.getItem('lastLoginUser');
  if (lastUser && users.includes(lastUser)) {
    loginSelect.value = lastUser;
  }
}

// Toggle password visibility
function togglePasswordVisibility() {
  const input = document.getElementById('loginPassword');
  input.type = input.type === 'password' ? 'text' : 'password';
}

// Login with selected user
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

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
    window.location.href = 'dashboard.html';
  } else {
    alert(data.message || 'Login failed');
  }
});

// Register new user
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    alert('✅ Registered successfully. You can now log in.');
    populateLoginUserDropdown();
  } else {
    alert(data.message || 'Registration failed');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  populateLoginUserDropdown();
});


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
    location.href = 'dashboard.html';
  } else {
    alert(data.message);
  }
}

async function registerUser() {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    alert("✅ Registered!");
    populateLoginUserDropdown(); // refresh login dropdown
  } else {
    alert(data.message || 'Registration failed');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  console.log("📦 DOM ready");
  populateLoginUserDropdown();
});

