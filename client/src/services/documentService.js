import request, { getToken } from './api.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const documentService = {
  /**
   * Get all employee documents with filters & summary stats (Admin & Manager)
   * @param {Object} params - { search, employee, department, documentType, page, limit }
   */
  getDocuments: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.employee && params.employee !== 'All' && params.employee !== 'all') {
      query.append('employee', params.employee);
    }
    if (params.department && params.department !== 'All' && params.department !== 'all') {
      query.append('department', params.department);
    }
    if (params.documentType && params.documentType !== 'All' && params.documentType !== 'all') {
      query.append('documentType', params.documentType);
    }
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    return await request(qs ? `/documents?${qs}` : '/documents');
  },

  /**
   * Get authenticated employee's documents
   * @param {Object} params - { search, documentType }
   */
  getMyDocuments: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.documentType && params.documentType !== 'All' && params.documentType !== 'all') {
      query.append('documentType', params.documentType);
    }

    const qs = query.toString();
    return await request(qs ? `/documents/my?${qs}` : '/documents/my');
  },

  /**
   * Get single document metadata by ID
   * @param {string} id
   */
  getDocumentById: async (id) => {
    return await request(`/documents/${id}`);
  },

  /**
   * Upload new document for an employee (Admin or Employee)
   * @param {FormData|Object} data - FormData instance or plain object
   */
  uploadDocument: async (data) => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    return await request('/documents', {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
  },

  /**
   * Update document metadata or replace file
   * @param {string} id
   * @param {FormData|Object} data - FormData instance or plain object
   */
  updateDocument: async (id, data) => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    return await request(`/documents/${id}`, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data),
    });
  },

  /**
   * Delete document by ID (Admin)
   * @param {string} id
   */
  deleteDocument: async (id) => {
    return await request(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Download document file with authorization headers
   * @param {string} id - Document ID
   * @param {string} fileName - Destination filename
   */
  downloadDocumentFile: async (id, fileName) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/documents/${id}/download`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Failed to download file (Status ${response.status})`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Fetch file Blob URL for authenticated in-browser preview
   * @param {string} id - Document ID
   * @returns {Promise<string>} Blob Object URL (remember to revoke when done)
   */
  fetchDocumentBlobUrl: async (id) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/documents/${id}/view`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Failed to stream file (Status ${response.status})`);
    }

    const blob = await response.blob();
    return window.URL.createObjectURL(blob);
  },
};

export default documentService;
