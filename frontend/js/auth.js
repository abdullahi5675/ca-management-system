/* ============================================================
   AUTHENTICATION LOGIC
   auth.js — Relative page redirections
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in, redirect accordingly
  const token = Utils.getToken();
  const user = Utils.getUser();
  const currentPath = window.location.pathname;

  if (token && user) {
    if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
      window.location.href = 'dashboard.html';
      return;
    }
  }

  // Init Password Toggles (eye icons)
  Utils.initPasswordToggles();

  // ── STUDENT REGISTRATION ──────────────────────────────────
  const studentRegForm = document.getElementById('student-register-form');
  if (studentRegForm) {
    studentRegForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!Utils.validateForm(studentRegForm)) return;

      const name = document.getElementById('name').value;
      const reg_number = document.getElementById('reg_number').value;
      const level = document.getElementById('level').value;
      const department = document.getElementById('department').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        Utils.showToast('Validation Error', 'Passwords do not match', 'error');
        return;
      }

      const submitBtn = studentRegForm.querySelector('button[type="submit"]');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        await API.post('/auth/student/register', {
          name, reg_number, level, department, password, confirmPassword
        });
        
        Utils.showToast('Registration Successful', 'You can now log in.', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } catch (err) {
        Utils.showToast('Registration Failed', err.message, 'error');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }

  // ── STUDENT LOGIN ─────────────────────────────────────────
  const studentLoginForm = document.getElementById('student-login-form');
  if (studentLoginForm) {
    studentLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!Utils.validateForm(studentLoginForm)) return;

      const reg_number = document.getElementById('reg_number').value;
      const password = document.getElementById('password').value;

      const submitBtn = studentLoginForm.querySelector('button[type="submit"]');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const res = await API.post('/auth/student/login', { reg_number, password });
        
        Utils.setToken(res.token);
        Utils.setUser(res.user);

        Utils.showToast('Login Successful', `Welcome back, ${res.user.name}!`, 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      } catch (err) {
        Utils.showToast('Login Failed', err.message, 'error');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }

  // ── LECTURER REGISTRATION ─────────────────────────────────
  const lecturerRegForm = document.getElementById('lecturer-register-form');
  if (lecturerRegForm) {
    lecturerRegForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!Utils.validateForm(lecturerRegForm)) return;

      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const inviteCode = document.getElementById('inviteCode').value;

      if (password !== confirmPassword) {
        Utils.showToast('Validation Error', 'Passwords do not match', 'error');
        return;
      }

      const submitBtn = lecturerRegForm.querySelector('button[type="submit"]');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        await API.post('/auth/lecturer/register', {
          name, email, password, confirmPassword, inviteCode
        });

        Utils.showToast('Registration Successful', 'Invitation accepted. Please log in.', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } catch (err) {
        Utils.showToast('Registration Failed', err.message, 'error');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }

  // ── LECTURER LOGIN ────────────────────────────────────────
  const lecturerLoginForm = document.getElementById('lecturer-login-form');
  if (lecturerLoginForm) {
    lecturerLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!Utils.validateForm(lecturerLoginForm)) return;

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const submitBtn = lecturerLoginForm.querySelector('button[type="submit"]');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const res = await API.post('/auth/lecturer/login', { email, password });

        Utils.setToken(res.token);
        Utils.setUser(res.user);

        Utils.showToast('Login Successful', `Welcome back, ${res.user.name}!`, 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      } catch (err) {
        Utils.showToast('Login Failed', err.message, 'error');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }

  // ── STUDENT FORGOT PASSWORD ─────────────────────────────
  const studentResetForm = document.getElementById('student-reset-form');
  if (studentResetForm) {
    studentResetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Utils.validateForm(studentResetForm)) return;

      const reg_number = document.getElementById('reg_number').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (newPassword !== confirmPassword) {
        Utils.showToast('Validation Error', 'Passwords do not match', 'error');
        return;
      }

      const submitBtn = studentResetForm.querySelector('button[type="submit"]');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const res = await API.post('/auth/student/reset-password', { reg_number, newPassword, confirmPassword });
        Utils.showToast('Password Reset', res.message || 'Password reset successfully.', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1800);
      } catch (err) {
        Utils.showToast('Reset Failed', err.message, 'error');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }

  // ── LECTURER FORGOT PASSWORD ────────────────────────────
  const lecturerResetForm = document.getElementById('lecturer-reset-form');
  if (lecturerResetForm) {
    lecturerResetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Utils.validateForm(lecturerResetForm)) return;

      const email = document.getElementById('email').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (newPassword !== confirmPassword) {
        Utils.showToast('Validation Error', 'Passwords do not match', 'error');
        return;
      }

      const submitBtn = lecturerResetForm.querySelector('button[type="submit"]');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const res = await API.post('/auth/lecturer/reset-password', { email, newPassword, confirmPassword });
        Utils.showToast('Password Reset', res.message || 'Password reset successfully.', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1800);
      } catch (err) {
        Utils.showToast('Reset Failed', err.message, 'error');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }
});

