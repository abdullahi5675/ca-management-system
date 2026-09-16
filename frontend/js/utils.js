/* ============================================================
   SHARED UTILITIES
   utils.js — Sidebar toggle, Toast, Auth helpers
   ============================================================ */

const Utils = {

  /* ── TOAST NOTIFICATION ─────────────────────────────────── */
  showToast: (title, message, type = 'info', duration = 4500) => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: 'bi-check-circle-fill',
      error:   'bi-exclamation-triangle-fill',
      warning: 'bi-exclamation-circle-fill',
      info:    'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    toast.innerHTML = `
      <i class="bi ${icons[type] || icons.info} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    // Helper to dismiss with animation
    const dismiss = () => {
      if (toast.parentNode) {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
      }
    };

    // Auto-dismiss
    const timer = setTimeout(dismiss, duration);

    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(timer);
      dismiss();
    });
  },

  /* ── PASSWORD EYE TOGGLE ────────────────────────────────── */
  initPasswordToggles: () => {
    document.querySelectorAll('.password-wrapper').forEach(wrapper => {
      const input  = wrapper.querySelector('input');
      const toggle = wrapper.querySelector('.eye-toggle');
      if (!input || !toggle) return;

      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = toggle.querySelector('i');
        if (icon) icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
      });
    });
  },

  /* ── SIDEBAR INIT ───────────────────────────────────────── */
  initSidebar: () => {
    const sidebar  = document.querySelector('.sidebar');
    const overlay  = document.querySelector('.sidebar-overlay');
    const hamburger = document.querySelector('.hamburger-btn');
    const closeBtn  = document.querySelector('.sidebar-close-btn');

    if (!sidebar) return;

    const openSidebar = () => {
      sidebar.classList.add('open');
      if (overlay) {
        overlay.classList.add('visible');
      }
      document.body.style.overflow = 'hidden';
    };

    const closeSidebar = () => {
      sidebar.classList.remove('open');
      if (overlay) {
        overlay.classList.remove('visible');
      }
      document.body.style.overflow = '';
    };

    if (hamburger) hamburger.addEventListener('click', openSidebar);
    if (closeBtn)  closeBtn.addEventListener('click', closeSidebar);
    if (overlay)   overlay.addEventListener('click', closeSidebar);

    // Set active nav link
    const currentPath = window.location.pathname.split('/').pop();
    sidebar.querySelectorAll('.nav-item').forEach(link => {
      const linkFile = link.getAttribute('href')?.split('/').pop();
      if (linkFile === currentPath) {
        link.classList.add('active');
      }
    });

    // Populate sidebar user info from localStorage
    const user = Utils.getUser();
    if (user) {
      const nameEl   = document.getElementById('sidebar-user-name');
      const metaEl   = document.getElementById('sidebar-user-meta');
      const avatarEl = document.getElementById('sidebar-user-avatar');
      const mobileUserEl = document.getElementById('mobile-topbar-user');

      if (nameEl)   nameEl.textContent   = user.name || user.email || 'User';
      if (metaEl)   metaEl.textContent   = user.reg_number || user.email || '';
      if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
      if (mobileUserEl) mobileUserEl.textContent = user.name || 'User';
    }
  },

  /* ── TOKEN / SESSION ────────────────────────────────────── */
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  getUser:  () => {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  },
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),

  logout: (role = 'student') => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Relative redirect — works both from Node server and Live Server
    const base = window.location.pathname.includes('/lecturer/') ? '../lecturer/login.html' : '../student/login.html';
    window.location.href = base;
  },

  /* ── AUTH GUARD ─────────────────────────────────────────── */
  requireAuth: (expectedRole) => {
    const token = Utils.getToken();
    const user  = Utils.getUser();
    if (!token || !user) {
      const loginPage = expectedRole === 'lecturer' ? '../lecturer/login.html' : '../student/login.html';
      window.location.href = loginPage;
      return false;
    }
    if (expectedRole && user.role !== expectedRole) {
      Utils.showToast('Access Denied', 'You are not authorised to view this page.', 'error');
      setTimeout(() => window.location.href = '../student/login.html', 1500);
      return false;
    }
    return true;
  },

  /* ── DATE FORMATTER ─────────────────────────────────────── */
  formatDate: (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  /* ── FORM VALIDATION ────────────────────────────────────── */
  validateForm: (formElement) => {
    let isValid = true;
    formElement.querySelectorAll('[required]').forEach(input => {
      const parent = input.closest('.form-group');
      if (parent) {
        parent.querySelector('.form-error')?.remove();
      }
      input.classList.remove('error');

      if (!input.value.trim()) {
        isValid = false;
        input.classList.add('error');
        if (parent) {
          const err = document.createElement('div');
          err.className = 'form-error mt-1';
          err.innerHTML = `<i class="bi bi-x-circle"></i> This field is required`;
          parent.appendChild(err);
        }
      }
    });
    return isValid;
  },

  /* ── SESSION OPTIONS (helper for dropdowns) ─────────────── */
  SESSION_OPTIONS: [
    '2020/2021', '2021/2022', '2022/2023',
    '2023/2024', '2024/2025', '2025/2026'
  ],
  CURRENT_SESSION: '2025/2026',

  populateSessionSelect: (selectEl, selectedValue) => {
    if (!selectEl) return;
    const val = selectedValue || Utils.CURRENT_SESSION;
    selectEl.innerHTML = Utils.SESSION_OPTIONS.map(s =>
      `<option value="${s}" ${s === val ? 'selected' : ''}>${s}</option>`
    ).join('');
  }
};
