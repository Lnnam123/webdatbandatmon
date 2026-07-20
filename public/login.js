document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('adminToken');
  if (token) {
    try {
      const res = await fetch('/api/auth/check', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        redirectByRole(data.role);
      }
    } catch (err) {
      console.log(err);
    }
  }
});

function redirectByRole(role) {
  if (role === 'admin') window.location.href = '/quan-ly.html';
  else if (role === 'cashier') window.location.href = '/thu-ngan.html';
  else if (role === 'chef') window.location.href = '/dau-bep.html';
  else window.location.href = '/quan-ly.html';
}

// Switch between Login and Register forms
function switchForm(formType) {
  document.getElementById('login-form-container').classList.remove('active');
  document.getElementById('register-form-container').classList.remove('active');
  
  if (formType === 'login') {
    document.getElementById('login-form-container').classList.add('active');
  } else {
    document.getElementById('register-form-container').classList.add('active');
  }

  // Clear messages
  document.getElementById('login-error').innerText = '';
  document.getElementById('register-error').innerText = '';
  document.getElementById('register-success').innerText = '';
}

// Handle Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorEl = document.getElementById('login-error');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    if (res.ok && data.success) {
      // Lưu JWT Token
      sessionStorage.setItem('adminToken', data.token);
      // Chuyển hướng sang trang theo vai trò
      redirectByRole(data.role);
    } else {
      errorEl.innerText = data.error || 'Đăng nhập thất bại!';
    }
  } catch (err) {
    errorEl.innerText = 'Lỗi kết nối máy chủ.';
  }
});

// Handle Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullname = document.getElementById('register-fullname').value.trim();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const errorEl = document.getElementById('register-error');
  const successEl = document.getElementById('register-success');
  
  errorEl.innerText = '';
  successEl.innerText = '';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, fullname })
    });
    const data = await res.json();
    
    if (res.ok && data.success) {
      successEl.innerText = 'Đăng ký thành công! Vui lòng đăng nhập.';
      document.getElementById('register-form').reset();
      setTimeout(() => switchForm('login'), 1500);
    } else {
      errorEl.innerText = data.error || 'Đăng ký thất bại!';
    }
  } catch (err) {
    errorEl.innerText = 'Lỗi kết nối máy chủ.';
  }
});
