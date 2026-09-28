import { useSearchParams } from 'react-router-dom';

export const useUrlFilters = (defaultFilters = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL
  const filters = Object.keys(defaultFilters).reduce((acc, key) => {
    const value = searchParams.get(key);
    if (value !== null) {
      acc[key] = value;
    } else {
      acc[key] = defaultFilters[key];
    }
    return acc;
  }, {});

  const setFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === '' || value === null || value === undefined || value === defaultFilters[key]) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    
    // Always reset page to 1 when a filter changes (if pagination is used)
    if (newParams.has('page') && key !== 'page') {
      newParams.set('page', '1');
    }
    
    setSearchParams(newParams);
  };

  const setFilters = (newFilters) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined || value === defaultFilters[key]) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    if (newParams.has('page')) newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const getActiveFilterCount = () => {
    let count = 0;
    Object.keys(defaultFilters).forEach((key) => {
      const val = searchParams.get(key);
      if (val !== null && val !== '' && val !== String(defaultFilters[key]) && key !== 'page') {
        count++;
      }
    });
    return count;
  };

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    activeCount: getActiveFilterCount()
  };
};
