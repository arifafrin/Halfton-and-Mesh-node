'use client';

import { useState, useRef, useEffect } from 'react';

const CONTINENTS = [
  { code: 'WLD', name: 'World Map',     flag: '🌍', desc: 'All Countries',     color: 'from-blue-600 to-indigo-700' },
  { code: 'AFR', name: 'Africa',        flag: '🌍', desc: '54 Countries',      color: 'from-amber-600 to-orange-700' },
  { code: 'ASI', name: 'Asia',          flag: '🌏', desc: '48 Countries',      color: 'from-emerald-600 to-teal-700' },
  { code: 'EUR', name: 'Europe',        flag: '🌍', desc: '44 Countries',      color: 'from-violet-600 to-purple-700' },
  { code: 'NOA', name: 'North America', flag: '🌎', desc: '23 Countries',      color: 'from-sky-600 to-blue-700' },
  { code: 'SAM', name: 'South America', flag: '🌎', desc: '12 Countries',      color: 'from-green-600 to-emerald-700' },
  { code: 'OCE', name: 'Oceania',       flag: '🌏', desc: '14 Countries',      color: 'from-cyan-600 to-sky-700' },
  { code: 'AUS', name: 'Australia',     flag: '🇦🇺', desc: '1 Country',         color: 'from-amber-600 to-yellow-700' },
];

export default function CountrySelector({ countries, selectedCountry, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('continent'); // 'continent' | 'country'
  const dropdownRef = useRef(null);

  const selectedCountryObj = countries.find(c => c.code === selectedCountry);
  const selectedContinentObj = CONTINENTS.find(c => c.code === selectedCountry);
  const displayItem = selectedCountryObj
    ? { name: selectedCountryObj.name, flag: selectedCountryObj.flag, code: selectedCountry }
    : selectedContinentObj
    ? { name: selectedContinentObj.name, flag: selectedContinentObj.flag, code: selectedCountry }
    : null;

  const continentCodes = new Set(CONTINENTS.map(c => c.code));
  
  // Sort alphabetically so new countries aren't stuck at the bottom
  const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredCountries = sortedCountries.filter(c =>
    (!continentCodes.has(c.code) || c.code === 'AUS') && c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        Country / Region
      </label>

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border transition-all duration-300 text-left ${
          displayItem
            ? 'bg-purple-500/10 border-purple-500/40 hover:border-purple-400/60'
            : 'bg-white/5 border-white/10 hover:border-purple-500/50'
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{displayItem ? displayItem.flag : '📍'}</span>
          <span className={`text-sm font-semibold truncate ${displayItem ? 'text-purple-200' : 'text-gray-400'}`}>
            {displayItem ? displayItem.name : 'Choose Country or Region'}
          </span>
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          {displayItem && (
            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
              {displayItem.code}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-[100] w-[calc(100%+32px)] -left-4 mt-2 rounded-2xl bg-gray-900/95 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ring-1 ring-purple-500/20"
          style={{ maxHeight: '480px' }}
        >
          {/* Tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            <button
              onClick={() => setActiveTab('continent')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'continent'
                  ? 'text-purple-300 border-b-2 border-purple-500 bg-purple-500/5'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>🌍</span> Continents
            </button>
            <button
              onClick={() => { setActiveTab('country'); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'country'
                  ? 'text-purple-300 border-b-2 border-purple-500 bg-purple-500/5'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>🗺️</span> Countries
            </button>
          </div>

          {/* Continent Tab */}
          {activeTab === 'continent' && (
            <div className="overflow-y-auto custom-scrollbar p-3 grid grid-cols-2 gap-2">
              {CONTINENTS.map(c => (
                <button
                  key={c.code}
                  onClick={() => { onSelect(c.code); setIsOpen(false); }}
                  className={`relative flex flex-col items-start gap-1 px-4 py-3 rounded-xl transition-all duration-200 text-left overflow-hidden border ${
                    selectedCountry === c.code
                      ? 'border-purple-500/60 bg-purple-500/20'
                      : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15'
                  }`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <span className="text-sm font-bold text-gray-100 leading-tight">{c.name}</span>
                  <span className="text-[10px] text-gray-500">{c.desc}</span>
                  {selectedCountry === c.code && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-400 shadow-lg shadow-purple-500/50" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Country Tab */}
          {activeTab === 'country' && (
            <>
              <div className="px-3 pt-3 pb-2 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Search 170+ countries..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pb-2">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map(country => (
                    <button
                      key={country.code}
                      onClick={() => {
                        onSelect(country.code);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-purple-500/10 transition-colors duration-200 ${
                        selectedCountry === country.code
                          ? 'bg-purple-500/20 text-purple-300 border-l-2 border-purple-500 bg-gradient-to-r from-purple-500/10 to-transparent'
                          : 'text-gray-300 border-l-2 border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xl">{country.flag}</span>
                        <span className="text-sm font-medium">{country.name}</span>
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{country.code}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 flex flex-col items-center gap-2 text-center text-sm text-gray-500">
                    <span className="text-2xl">🔍</span>
                    <p>No countries found.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
