const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'An unexpected error occurred');
    error.status = response.status;
    error.details = data.details;
    throw error;
  }

  return data;
}

export const api = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request('/auth/me'),
  getReligions: () => request('/religions'),
  getScriptures: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/scriptures${query ? `?${query}` : ''}`);
  },
  getEdition: (id) => request(`/scripture-editions/${id}`),
  getReaderContent: (editionId) => request(`/passages/edition/${editionId}`),
};
