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
  // Auth
  register: (userData) => request('/auth/register', {
    method: 'POST',
    body: {
      email: userData.email,
      username: userData.username,
      password: userData.password,
      displayName: userData.displayName,
    }
  }),
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: {
      email: credentials.email,
      password: credentials.password,
    }
  }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request('/auth/me'),
  getProfile: () => request('/auth/profile'),
  updateProfile: (profileData) => request('/auth/profile', { method: 'PATCH', body: profileData }),

  // Religions & Scriptures
  getReligions: () => request('/religions'),
  getReligion: (id) => request(`/religions/${id}`),
  getScriptures: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/scriptures${query ? `?${query}` : ''}`);
  },
  getScripture: (id) => request(`/scriptures/${id}`),
  getScriptureEditions: (scriptureId) => {
    // Editions are included in getScripture response, so we fetch scripture data
    return request(`/scriptures/${scriptureId}`).then(data => ({
      editions: data.scripture.editions
    }));
  },
  getEdition: (id) => request(`/scripture-editions/${id}`),
  getEditionContent: (editionId, page = 1, limit = 100) => request(`/scripture-editions/${editionId}/content?page=${page}&limit=${limit}`),
  getReaderContent: (editionId) => request(`/passages/edition/${editionId}`),
  getSectionPassages: (sectionId, page = 1) => request(`/passages/section/${sectionId}?page=${page}`),
  getPassage: (passageId) => request(`/passages/${passageId}`),

  // Progress & Plans
  getProgress: () => request('/reading-progress'),
  getProgressForEdition: (editionId) => request(`/reading-progress/${editionId}`),
  updateProgress: (progressData) => request('/reading-progress', { method: 'POST', body: progressData }),

  getReadingPlans: () => request('/reading-plans'),
  getReadingPlan: (id) => request(`/reading-plans/${id}`),
  createReadingPlan: (planData) => request('/reading-plans', { method: 'POST', body: planData }),
  updateReadingPlan: (id, updateData) => request(`/reading-plans/${id}`, { method: 'PATCH', body: updateData }),
  deleteReadingPlan: (id) => request(`/reading-plans/${id}`, { method: 'DELETE' }),
  completePlanItem: (itemId, completed) => request(`/reading-plans/items/${itemId}/complete`, { method: 'PATCH', body: { completed } }),

  // Bookmarks, Notes & Highlights
  getBookmarks: () => request('/bookmarks'),
  addBookmark: (passageId, label) => request('/bookmarks', { method: 'POST', body: { passageId, label } }),
  removeBookmark: (id) => request(`/bookmarks/${id}`, { method: 'DELETE' }),

  getNotes: () => request('/notes'),
  addNote: (passageId, content) => request('/notes', { method: 'POST', body: { passageId, content } }),
  updateNote: (id, content) => request(`/notes/${id}`, { method: 'PATCH', body: { content } }),
  removeNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),

  getHighlights: (editionId) => request(`/highlights/edition/${editionId}`),
  addHighlight: (highlightData) => request('/highlights', { method: 'POST', body: highlightData }),
  removeHighlight: (id) => request(`/highlights/${id}`, { method: 'DELETE' }),

  // Search
  search: (q, editionId) => {
    const params = new URLSearchParams({ q });
    if (editionId) params.append('editionId', editionId);
    return request(`/search?${params.toString()}`);
  },
  searchScriptures: (q) => request(`/search/scriptures?q=${encodeURIComponent(q)}`),

  // AI Assistant
  explainPassage: (aiData) => request('/ai/explain', { method: 'POST', body: aiData }),
  summarizeSection: (summaryData) => request('/ai/summarize', { method: 'POST', body: summaryData }),
  chatAI: (chatData) => request('/ai/chat', { method: 'POST', body: chatData }),
  getAIConversations: () => request('/ai/conversations'),
  getAIConversation: (id) => request(`/ai/conversations/${id}`),
  deleteAIConversation: (id) => request(`/ai/conversations/${id}`, { method: 'DELETE' }),
};
