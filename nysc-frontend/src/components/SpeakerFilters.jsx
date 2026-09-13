export default function SpeakerFilters({ filters, setFilters, filterOptions }) {
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const filterButtons = [
    { type: 'topic', label: 'Topic', options: filterOptions.topics },
    { type: 'date', label: 'Date', options: filterOptions.dates },
    { type: 'format', label: 'Format', options: filterOptions.formats }
  ];

  return (
    <div className="flex flex-wrap gap-6">
      {filterButtons.map(({ type, label, options }) => (
        <div key={type} className="relative pt-5">
          {/* Small label above dropdown */}
          <span className="absolute top-0 left-0 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-soft">
            {label}
          </span>
          
          <select
            value={filters[type]}
            onChange={(e) => handleFilterChange(type, e.target.value)}
            className="appearance-none bg-white border border-ink/15 rounded-lg px-4 py-2.5 pr-10 text-sm font-body text-navy cursor-pointer hover:border-ochre/30 focus:outline-none focus:border-ochre/50 transition-colors min-w-[160px]"
          >
            {options.map(option => (
              <option key={option} value={option}>
                {option === 'All' ? `All ${label}s` : option}
              </option>
            ))}
          </select>
          
          {/* Chevron icon */}
          <div className="absolute right-3 bottom-3 pointer-events-none">
            <svg className="w-4 h-4 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      ))}

      {/* Clear Filters Button */}
      {(filters.topic !== 'All' || filters.date !== 'All' || filters.format !== 'All') && (
        <div className="flex items-end pt-5">
          <button
            onClick={() => setFilters({ topic: 'All', date: 'All', format: 'All' })}
            className="px-4 py-2.5 text-sm font-body font-medium text-ochre hover:text-ochre/80 transition-colors border border-ochre/20 rounded-lg hover:border-ochre/40"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}