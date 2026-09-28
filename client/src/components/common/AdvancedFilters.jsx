import { Filter, X, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import '../../styles/filters.css';

export const AdvancedFilters = ({ children, onClear, activeCount }) => {
  return (
    <div className="advanced-filters-wrapper">
      <div className="filters-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-600)' }}>
          <Filter size={18} />
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
            Filters {activeCount > 0 && <span className="filter-count-badge">{activeCount}</span>}
          </span>
        </div>
        {activeCount > 0 && (
          <button onClick={onClear} className="clear-filters-btn">
            Clear all
          </button>
        )}
      </div>
      <div className="filters-grid">
        {children}
      </div>
    </div>
  );
};

export const FilterSelect = ({ label, value, options, onChange, placeholder = "All" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || { label: placeholder, value: '' };

  return (
    <div className="filter-select-container" ref={containerRef}>
      <label className="filter-label">{label}</label>
      <button 
        type="button"
        className={`filter-select-trigger ${value ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="filter-select-value">{selectedOption.label}</span>
        <ChevronDown size={14} className={`filter-select-icon ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="filter-dropdown animate-fade-in">
          <div 
            className={`filter-option ${value === '' ? 'selected' : ''}`}
            onClick={() => { onChange(''); setIsOpen(false); }}
          >
            <span>{placeholder}</span>
            {value === '' && <Check size={14} className="filter-check" />}
          </div>
          {options.map((opt) => (
            <div 
              key={opt.value}
              className={`filter-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check size={14} className="filter-check" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
