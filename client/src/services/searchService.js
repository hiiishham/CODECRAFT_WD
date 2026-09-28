import api from './api.js';

const searchService = {
  globalSearch: async (query, module = null) => {
    try {
      const params = { q: query };
      if (module) params.module = module;

      const { data } = await api.get('/search', { params });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to perform search';
    }
  },

  getRecentSearches: () => {
    try {
      const searches = localStorage.getItem('staffpulse_recent_searches');
      return searches ? JSON.parse(searches) : [];
    } catch {
      return [];
    }
  },

  saveRecentSearch: (query) => {
    try {
      let searches = searchService.getRecentSearches();
      // Remove if already exists to bump it to top
      searches = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
      // Add to top
      searches.unshift(query);
      // Keep only top 10
      if (searches.length > 10) searches.pop();
      localStorage.setItem('staffpulse_recent_searches', JSON.stringify(searches));
      return searches;
    } catch {
      return [];
    }
  },

  clearRecentSearches: () => {
    localStorage.removeItem('staffpulse_recent_searches');
  }
};

export default searchService;
