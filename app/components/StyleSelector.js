'use client';

import { useState, useRef, useEffect } from 'react';
import { mapStyles } from '../utils/colorUtils';

export default function StyleSelector({ selectedStyle, onSelect, label = "Map Style", stylesList }) {
  const styles = stylesList || Object.values(mapStyles).filter(s => !s.isPencil);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const activeStyle = mapStyles[selectedStyle];
  const isValidStyleForThisDropdown = activeStyle && styles.some(s => s.id === activeStyle.id);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {label}
      </label>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-all duration-300 text-left group"
      >
        <span className="flex items-center gap-3">
          <span className="text-xl">{isValidStyleForThisDropdown ? activeStyle.icon : '🎨'}</span>
          <span className="text-sm font-medium text-gray-200">
            {isValidStyleForThisDropdown ? activeStyle.name : (label === 'Map Style' ? 'Map Style' : 'Choose Map Style')}
          </span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full left-0 mt-2 p-3 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-emerald-500/10 max-h-[550px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Select Map Style
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
              {styles.length} Styles
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
        {styles.map(style => {
          const isSelected = selectedStyle === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onSelect(style.id)}
              className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border transition-all duration-300 text-left group relative overflow-hidden ${
                isSelected
                  ? 'bg-purple-500/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/8'
              }`}
            >
              <div className="flex items-center gap-2.5 w-full">
                <span className="text-lg shrink-0">{style.icon}</span>
                <span className={`text-xs font-semibold leading-tight ${isSelected ? 'text-purple-300' : 'text-gray-200'}`}>
                  {style.name}
                </span>
              </div>
              
              {/* Preset preview pill based on style background */}
              <div 
                className="w-full h-9 mt-1.5 rounded-lg border border-white/10 shadow-sm overflow-hidden flex"
                style={{ background: style.background !== 'transparent' ? style.background : '#eee' }}
              >
                {style.regionColors.slice(0, 3).map((col, i) => (
                  <div key={i} className="h-full flex-1 border-r border-white/5 last:border-0" style={{ backgroundColor: col }} />
                ))}
              </div>
              </button>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}
