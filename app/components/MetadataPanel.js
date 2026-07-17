'use client';

import { useState, useEffect } from 'react';
import { generateMetadataSet } from '../utils/seoUtils';

export default function MetadataPanel({ 
  countryName, 
  styleId, 
  hasLabels, 
  onMetadataChange 
}) {
  const [metadata, setMetadata] = useState({ title: '', keywords: '', description: '' });
  const [copied, setCopied] = useState(false);

  // Auto-generate metadata whenever core map specs change
  useEffect(() => {
    if (!countryName) return;
    const generated = generateMetadataSet(countryName, styleId, hasLabels);
    setMetadata(generated);
    if (onMetadataChange) onMetadataChange(generated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryName, styleId, hasLabels]);

  const handleCopy = () => {
    const textToCopy = `Title: ${metadata.title}\n\nKeywords: ${metadata.keywords}\n\nDescription: ${metadata.description}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualEdit = (field, value) => {
    const updated = { ...metadata, [field]: value };
    setMetadata(updated);
    if (onMetadataChange) onMetadataChange(updated);
  };

  if (!countryName) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-white/5 relative">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          SEO Meta Data
        </label>
        
        <button 
          onClick={handleCopy}
          className="text-[10px] uppercase font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
        >
          {copied ? 'Copied ✓' : 'Copy All'}
        </button>
      </div>

      {/* Meta Title */}
      <div className="space-y-1">
        <span className="text-[9px] uppercase font-mono text-gray-500 tracking-wider">Stock Title</span>
        <textarea
          value={metadata.title}
          onChange={(e) => handleManualEdit('title', e.target.value)}
          rows={1}
          className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500/50 resize-none font-medium custom-scrollbar"
        />
      </div>

      {/* Meta Description */}
      <div className="space-y-1">
        <span className="text-[9px] uppercase font-mono text-gray-500 tracking-wider">Description</span>
        <textarea
          value={metadata.description}
          onChange={(e) => handleManualEdit('description', e.target.value)}
          rows={3}
          className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500/50 resize-y min-h-[60px] custom-scrollbar"
        />
      </div>

      {/* Meta Keywords */}
      <div className="space-y-1">
        <div className="flex justify-between items-end">
          <span className="text-[9px] uppercase font-mono text-gray-500 tracking-wider">Keywords (up to 50)</span>
          <span className="text-[9px] text-emerald-400/70 font-mono">
            {metadata.keywords ? metadata.keywords.split(',').length : 0} tags
          </span>
        </div>
        <textarea
          value={metadata.keywords}
          onChange={(e) => handleManualEdit('keywords', e.target.value)}
          rows={3}
          className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-[11px] leading-relaxed text-blue-200/80 focus:outline-none focus:border-purple-500/50 font-mono resize-y min-h-[60px] custom-scrollbar"
        />
      </div>
      
      <div className="text-[10px] text-gray-600 italic mt-2 text-center bg-white/5 py-1.5 rounded-md border border-white/5">
        Optimized perfectly for Adobe Stock & Shutterstock
      </div>
    </div>
  );
}
