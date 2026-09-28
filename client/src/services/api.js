// Base API client helper for REST endpoints

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Retrieve active JWT token from either localStorage or sessionStorage
 */
export const getToken = () => {
  return localStorage.getItem('ems_token') || sessionStorage.getItem('ems_token');
};

/**
 * Store JWT token based on rememberMe preference
 */
export const setToken = (token, rememberMe = true) => {
  if (rememberMe) {
    localStorage.setItem('ems_token', token);
    sessionStorage.removeItem('ems_token');
  } else {
    sessionStorage.setItem('ems_token', token);
    localStorage.removeItem('ems_token');
  }
};

/**
 * Clear JWT token from all client storages
 */
export const clearToken = () => {
  localStorage.removeItem('ems_token');
  sessionStorage.removeItem('ems_token');
};

/**
 * Centralized HTTP request utility
 */
export const request = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // If the body is FormData, let fetch auto-generate the content-type with the boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || `API request failed with status ${response.status}`);
      error.status = response.status;
      error.code = data.code;

      // Broadcast session expiration for unauthenticated responses (excluding initial login attempt)
      if (response.status === 401 && !endpoint.includes('/auth/login') && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { message: data.message } }));
      }

      throw error;
    }

    return data;
  } catch (error) {
    // Avoid console dumping sensitive details
    if (process.env.NODE_ENV !== 'production' && !endpoint.includes('/health')) {
      console.warn(`[API] ${endpoint} -> ${error.status || 'Error'}:`, error.message);
    }
    throw error;
  }
};

/**
 * REST helper methods attached to request function
 */
request.get = async (endpoint, options = {}) => {
  let url = endpoint;
  if (options.params) {
    const query = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  if (options.responseType === 'blob') {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!res.ok) {
      throw new Error('File download failed');
    }
    const blob = await res.blob();
    return { data: blob };
  }

  const data = await request(url, { method: 'GET', ...options });
  return { data };
};

request.post = async (endpoint, body, options = {}) => {
  const isFormData = body instanceof FormData;
  const data = await request(endpoint, {
    method: 'POST',
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    ...options,
  });
  return { data };
};

request.put = async (endpoint, body, options = {}) => {
  const isFormData = body instanceof FormData;
  const data = await request(endpoint, {
    method: 'PUT',
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    ...options,
  });
  return { data };
};

request.delete = async (endpoint, options = {}) => {
  const data = await request(endpoint, { method: 'DELETE', ...options });
  return { data };
};

export default request;
