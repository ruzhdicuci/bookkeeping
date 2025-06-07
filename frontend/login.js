// ✅ LOGIN
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

// ✅ REGISTER
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value.trim().toLowerCase();
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

// ✅ Populate dropdown
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

window.addEventListener('DOMContentLoaded', () => {
  populateLoginUserDropdown();
});