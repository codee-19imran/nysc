export const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const TOKEN_KEY = 'nysc_token';
const USER_KEY = 'nysc_user';

// Security: CSRF token (if needed)
const getCSRFToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : null;
};

/**
 * Core request handler with security enhancements.
 */
export async function request(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { ...options.headers };

  // Security: Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Security: Attach JWT token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Security: Add CSRF token if available
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  // Security: Add custom headers for tracking
  headers['X-Requested-With'] = 'XMLHttpRequest';

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for httpOnly tokens
    });

    // Security: Handle 401 (token expired/invalid)
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }

    // Handle errors (including 429)
    if (!response.ok) {
      let errorData = { detail: 'An unexpected error occurred' };
      try {
        errorData = await response.json();
      } catch (e) {
        // Ignore if response isn't JSON
      }

      const message =
        typeof errorData.detail === 'string'
          ? errorData.detail
          : errorData.detail?.[0]?.msg || 'Request failed';
          
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }

    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    // Security: Log errors for monitoring
    console.error('API Error:', { endpoint, error: error.message });
    throw error;
  }
}

// --- AUTHENTICATION ---
export const auth = {
  signup: (data) => request('/auth/signup', { 
    method: 'POST', 
    body: JSON.stringify({
      name: data.fullName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      state: data.state,
      city: data.city,
      category: data.category,
      participation_type: data.subCategory,
      institution: data.institution,
      education_level: data.educationLevel,
      student_class: data.studentClass,
      field_of_study: data.fieldOfStudy,
      graduation_year: data.graduationYear ? parseInt(data.graduationYear) : null,
      organization: data.organization,
      designation: data.designation,
      experience: data.experience ? parseInt(data.experience) : null,
    }) 
  }),
  
  login: (data) => request('/auth/login', { 
    method: 'POST', 
    body: JSON.stringify({ 
      email: data.email, 
      password: data.password 
    }) 
  }),

  saveAuth: (token, user) => {
    // Security: Validate token format before saving
    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
      console.error('Invalid token format');
      return;
    }
    
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Security: Clear any cached data
    sessionStorage.removeItem('nysc_permissions');
    sessionStorage.clear();
  },

  isAuthenticated: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    
    // Security: Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        // Token expired
        auth.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  getUser: () => {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Fetch current user's permissions from the backend.
   * Returns array of permission names like ["page:overview", "venue:view", ...]
   */
  getUserPermissions: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      console.warn('⚠️ No token found, cannot fetch permissions');
      return [];
    }

    try {
      const permissions = await request('/auth/me/permissions');

      // Cache permissions in sessionStorage for faster subsequent access
      // (sessionStorage clears when tab closes, so it's safe)
      sessionStorage.setItem('nysc_permissions', JSON.stringify(permissions));

      return permissions;
    } catch (err) {
      console.error('❌ Failed to fetch permissions:', err);

      // If unauthorized or deactivated, force logout
      if (err.message?.includes('401') || err.message?.includes('deactivated')) {
        auth.logout();
        window.location.href = '/login';
      }

      return [];
    }
  },

  /**
   * Get cached permissions from sessionStorage (instant, no API call).
   * Use for synchronous checks. Returns null if not yet cached.
   */
  getCachedPermissions: () => {
    const cached = sessionStorage.getItem('nysc_permissions');
    return cached ? JSON.parse(cached) : null;
  },

  /**
   * Clear the permission cache (called on logout).
   */
  clearPermissionCache: () => {
    sessionStorage.removeItem('nysc_permissions');
  },
};

// --- REGISTRATION ---
export const registrations = {
  create: (data) => request('/registrations', { 
    method: 'POST', 
    body: JSON.stringify({
      category: data.category,
      participation_type: data.subCategory,
      accompanying_count: 0
    }) 
  }),
  getMyRegistration: () => request('/registrations/me', { method: 'GET' }),
};

// --- PAYMENTS ---
export const payments = {
  createOrder: (registrationId) => 
    request(`/payments/create-order/${registrationId}`, { method: 'POST' }),
  verify: (data) => request('/payments/verify', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
};

// --- PAPERS ---
export const papers = {
  submitPaper: (data) => request('/papers', { 
    method: 'POST', 
    body: (() => {
      const fd = new FormData();
      fd.append('title', data.paperTitle);
      fd.append('domain', data.track || 'Mining & Earth Observation');
      fd.append('abstract', data.abstract || '');
      return fd;
    })() 
  }),
  getMyPaper: () => request('/papers/me', { method: 'GET' }),
  getMyPapers: () => request('/admin/my-papers', { method: 'GET' }),
  updateDetails: (paperId, data) => request(`/papers/${paperId}`, { 
    method: 'PATCH', 
    body: JSON.stringify({
      title: data.title,
      abstract: data.abstract,
      domain: data.domain,
      co_author_emails: data.co_author_emails || []
    }) 
  }),
  uploadFile: (paperId, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', `${API_BASE}/papers/${paperId}`);
      
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || 'Upload failed'));
          } catch { reject(new Error('Upload failed')); }
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  },
};

// --- UTILITIES ---
export const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};