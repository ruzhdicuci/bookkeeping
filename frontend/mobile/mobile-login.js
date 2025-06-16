const toast = document.getElementById('toast');

// 🔄 Load users
async function loadUsers() {
  const res = await fetch('https://bookkeeping-i8e0.onrender.com/api/users');
  const users = await res.json();
  const select = document.getElementById('loginUserSelect');
  users.forEach(email => {
    const opt = document.createElement('option');
    opt.value = email;
    opt.textContent = email;
    select.appendChild(opt);
  });
}

// ✅ Toast
function showToast(msg) {
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => toast.style.opacity = '0', 2000);
}

document.getElementById('mobileLoginForm').addEventListener('submit', async e => {
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
    window.location.href = 'mobile.html';
  } else {
    showToast(data.message || 'Login failed');
  }
});

loadUsers();