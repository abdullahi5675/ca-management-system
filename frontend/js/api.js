/* ============================================================
   API FETCH CLIENT WRAPPER
   api.js
   ============================================================ */

const API_BASE = '/api';

const API = {
  request: async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;
    
    // Setup headers
    const token = Utils.getToken();
    const headers = { ...options.headers };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    options.headers = headers;

    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401 && !window.location.pathname.includes('/login.html') && !window.location.pathname.includes('/register.html')) {
          Utils.showToast('Session Expired', 'Please login again.', 'error');
          setTimeout(() => {
            Utils.logout();
          }, 1500);
        }
        
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${url}:`, error);
      throw error;
    }
  },

  get: (endpoint) => {
    return API.request(endpoint, { method: 'GET' });
  },

  post: (endpoint, data) => {
    return API.request(endpoint, {
      method: 'POST',
      body: data
    });
  },

  put: (endpoint, data) => {
    return API.request(endpoint, {
      method: 'PUT',
      body: data
    });
  },

  delete: (endpoint) => {
    return API.request(endpoint, {
      method: 'DELETE'
    });
  },

  // File upload helper
  upload: (endpoint, file) => {
    const formData = new FormData();
    formData.append('file', file);

    return API.request(endpoint, {
      method: 'POST',
      body: formData
    });
  }
};
