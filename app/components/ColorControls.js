'use client';

import { useState } from 'react';
import { aiColorThemes, generateRandomPalette, generateMonochromaticPalette } from '../utils/colorUtils';

export default function ColorControls({ 
  colors, onColorsChange, colorMode, onColorModeChange, bgMode, setBgMode, 
  customBgColor, setCustomBgColor, shapeOutlineColor, setShapeOutlineColor, 
  pinColor, setPinColor, pinEnabled, disabled,
  selectedStyle, atomSize, setAtomSize, dotSize, setDotSize,
  electronCount, setElectronCount, borderWidth, setBorderWidth
}) {

  const [globalSolidColor, setGlobalSolidColor] = useState(colors[0] || '#1877F2');
  const [monoBlendColor, setMonoBlendColor] = useState('#ff4500');
  const [useMonoBlend, setUseMonoBlend] = useState(false);
  const [isMeshSettingsOpen, setIsMeshSettingsOpen] = useState(false);

  const handleToggleMonoBlend = (enable) => {
    setUseMonoBlend(enable);
    if (enable) {
       onColorModeChange('blend');
       setMonoBlendColor(globalSolidColor);
       onColorsChange(generateMonochromaticPalette(globalSolidColor, 10));
    } else {
       onColorModeChange('solid');
       setGlobalSolidColor(monoBlendColor);
       onColorsChange(Array(18).fill(monoBlendColor));
    }
  };

  const handleSolidColorChange = (e) => {
    const val = e.target.value;
    setGlobalSolidColor(val);
    onColorModeChange('solid');
    onColorsChange(Array(18).fill(val));
    setUseMonoBlend(false);
  };
  
  const handleMonoBlendChange = (e) => {
    const val = e.target.value.toLowerCase();
    setMonoBlendColor(val);
    onColorModeChange('blend');
    onColorsChange(generateMonochromaticPalette(val, 10));
    setUseMonoBlend(true);
  };

  const handleAiTheme = (themeName) => {
    onColorModeChange(`theme-${themeName}`);
    onColorsChange([...aiColorThemes[themeName]]);
    setUseMonoBlend(false);
  };

  const handleRandomColors = () => {
    onColorModeChange('random');
    onColorsChange(generateRandomPalette(18)); // Ensure it generates 18
    setUseMonoBlend(false);
  };

  const handleColorChange = (index, newColor) => {
    const updated = [...colors];
    updated[index] = newColor.toLowerCase();
    onColorsChange(updated);
    onColorModeChange('custom');
    setUseMonoBlend(false);
  };

  return (
    <div className="space-y-4">
      {/* Global Vector Fill Strategy */}
      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 border-t-white/20 rounded-xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <h3 className="text-[11px] uppercase text-gray-400 font-bold mb-4 flex items-center gap-2">
          <span className="text-sm">🎨</span> Vector Fill Style
        </h3>

        {/* Monochromatic Toggle */}
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3 cursor-pointer" onClick={() => handleToggleMonoBlend(!useMonoBlend)}>
           <div>
              <span className="text-[11px] font-bold text-gray-300 block tracking-wide">Monochromatic Blend</span>
              <span className="text-[9px] text-gray-500 block mt-0.5">{useMonoBlend ? "ON: Auto-generating shades" : "OFF: Single Solid Fill active"}</span>
           </div>
           <div className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 flex-shrink-0 relative ${useMonoBlend ? 'bg-[#1877F2]' : 'bg-white/10 hover:bg-white/20'}`}>
              <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${useMonoBlend ? 'left-[calc(100%-18px)]' : 'left-[2px]'}`} />
           </div>
        </div>

        {/* Option: Monochromatic Base Color */}
        {useMonoBlend ? (
           <div className="flex items-center justify-between p-3 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 shadow-[0_0_15px_rgba(24,119,242,0.05)] transition-all group animate-fade-in">
              <div>
                 <span className="text-[11px] font-bold text-[#1877F2] block tracking-wide">Blend Seed Color</span>
                 <span className="text-[9px] text-[#1877F2]/60 block mt-0.5">Pick base → gradient generated</span>
              </div>
              <div className="relative w-9 h-9 rounded-full overflow-hidden border-[3px] border-[#1877F2] shadow-md group-hover:scale-105 transition-transform duration-300">
                <input
                  type="color"
                  value={monoBlendColor}
                  onChange={handleMonoBlendChange}
                  className="absolute -inset-4 w-20 h-20 cursor-pointer"
                  title="Pick a Base Seed Color"
                />
              </div>
           </div>
        ) : (
        /* Option: Solid Fill Color */
           <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)] transition-all group animate-fade-in">
              <div>
                 <span className="text-[11px] font-bold text-blue-300 block tracking-wide">Global Solid Fill</span>
                 <span className="text-[9px] text-blue-300/60 block mt-0.5">Pick one color for all vectors</span>
              </div>
              <div className="relative w-9 h-9 rounded-full overflow-hidden border-[3px] border-blue-400 shadow-md group-hover:scale-105 transition-transform duration-300">
                <input
                  type="color"
                  value={globalSolidColor}
                  onChange={handleSolidColorChange}
                  className="absolute -inset-4 w-20 h-20 cursor-pointer"
                  title="Pick Solid Fill Color"
                />
              </div>
           </div>
        )}
        
        {/* Network Mesh Control Center (Replaced Shape Outline) */}
        {['pencilmesh', 'pencilnetwork'].includes(selectedStyle) && (
           <div className="mt-3 bg-[#0f0b1a] border border-[#1877F2]/20 rounded-xl p-4 shadow-xl backdrop-blur-xl animate-fade-in transition-all">
              <button 
                onClick={() => setIsMeshSettingsOpen(!isMeshSettingsOpen)}
                className="w-full flex items-center justify-between text-[11px] uppercase text-[#1877F2] font-black tracking-widest outline-none py-1"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🕸️</span> Network Mesh Settings
                </div>
                <svg className={`w-4 h-4 transition-transform duration-300 ${isMeshSettingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isMeshSettingsOpen && (
                <div className="pt-4 border-t border-[#1877F2]/20 mt-3 animate-fade-in">
                  {/* Node System */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3.5 border-b border-[#1877F2]/20 pb-1.5">
                       <span className="text-[10px] text-[#1877F2]">⬤</span>
                       <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Nodes</p>
                    </div>
                    <div className="space-y-5 px-1">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <p className="text-[11px] text-gray-200 font-semibold tracking-wide">Point Density</p>
                          <span className="text-[10px] font-mono text-[#1877F2] bg-[#1877F2]/10 px-1.5 py-0.5 rounded">{atomSize}</span>
                        </div>
                        <input type="range" min="10" max="150" step="1" value={atomSize} onChange={(e) => setAtomSize(parseInt(e.target.value))} className="w-full h-1.5 bg-blue-950 rounded-lg appearance-none cursor-pointer border-none accent-[#1877F2]" />
                        <p className="text-[9px] text-gray-500 mt-1.5 leading-tight">Controls how closely dots are packed together.</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <p className="text-[11px] text-gray-200 font-semibold tracking-wide">Dot Size</p>
                          <span className="text-[10px] font-mono text-[#1877F2] bg-[#1877F2]/10 px-1.5 py-0.5 rounded">{dotSize.toFixed(1)}x</span>
                        </div>
                        <input type="range" min="1" max="12" step="0.5" value={dotSize} onChange={(e) => setDotSize(parseFloat(e.target.value))} className="w-full h-1.5 bg-blue-950 rounded-lg appearance-none cursor-pointer border-none accent-[#1877F2]" />
                        <div className="flex justify-between text-[8.5px] text-blue-500/40 mt-1.5 font-bold uppercase tracking-widest"><span>Micro</span><span>Massive</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Line System */}
                  {selectedStyle === 'pencilmesh' && (
                    <div>
                      <div className="flex items-center gap-2 mb-3.5 border-b border-[#1877F2]/20 pb-1.5">
                         <span className="text-[10px] text-[#1877F2]">➖</span>
                         <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Connections</p>
                      </div>
                      <div className="space-y-5 px-1">
                        {/* Reach Slider */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <p className="text-[11px] text-gray-200 font-semibold tracking-wide">Line Reach</p>
                            <span className="text-[10px] font-mono text-[#1877F2] bg-[#1877F2]/10 px-1.5 py-0.5 rounded">{electronCount}</span>
                          </div>
                          <input type="range" min="0" max="40" step="1" value={electronCount} onChange={(e) => setElectronCount(parseInt(e.target.value))} className="w-full h-1.5 bg-blue-950 rounded-lg appearance-none cursor-pointer border-none accent-[#1877F2]" />
                          <p className="text-[9px] text-gray-500 mt-1.5 leading-tight">How far the connecting lines can reach.</p>
                        </div>
                        {/* Thickness Slider */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <p className="text-[11px] text-gray-200 font-semibold tracking-wide">Line Thickness</p>
                            <span className="text-[10px] font-mono text-[#1877F2] bg-[#1877F2]/10 px-1.5 py-0.5 rounded">{borderWidth.toFixed(1)}</span>
                          </div>
                          <input type="range" min="0" max="8" step="0.1" value={borderWidth} onChange={(e) => setBorderWidth(parseFloat(e.target.value))} className="w-full h-1.5 bg-blue-950 rounded-lg appearance-none cursor-pointer border-none accent-[#1877F2]" />
                          <p className="text-[9px] text-gray-500 mt-1.5 leading-tight">Adjust how thick connecting lines appear.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
           </div>
        )}
      </div>

      {/* Advanced Customization header */}
      <div className="pt-2 mt-4 space-y-4">
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2 opacity-80">
              <span className="text-sm">🧪</span> Advanced Palettes
           </span>
        </div>
        
        <div className="mb-4">
          <button
            onClick={handleRandomColors}
            className={`w-full px-3 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-sm ${
              colorMode === 'random'
                ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)] scale-[1.02]'
                : 'bg-black/20 border-white/5 text-gray-400 hover:border-orange-500/30 hover:text-orange-300 hover:bg-orange-500/5'
            }`}
          >
            🎲 Randomize Colors
          </button>
        </div>
      </div>

      {/* AI Theme Presets Card */}
      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 border-t-white/20 rounded-xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <h3 className="text-[11px] uppercase text-gray-400 font-bold mb-3 flex items-center gap-2">
          <span className="text-sm">🧠</span> Ready-Made Themes
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(aiColorThemes).map(theme => (
            <button
              key={theme}
              onClick={() => handleAiTheme(theme)}
              className={`px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all capitalize border duration-300 ${
                colorMode === `theme-${theme}`
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      {/* Active Color Swatches Removed as per request */}

      {/* Location Pin Color Card (Conditionally Rendered) */}
      {pinEnabled && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 shadow-sm backdrop-blur-md animate-fade-in">
          <h3 className="text-[11px] uppercase text-gray-400 font-bold mb-3 flex items-center gap-2">
            <span className="text-sm">📍</span> Location Pin Color
          </h3>
          
          <div className="flex gap-2.5 justify-center mt-3 border-t border-white/5 pt-3">
            {[
              { name: 'Stock Red', hex: '#ef4444' },
              { name: 'Corporate Blue', hex: '#3b82f6' },
              { name: 'Nature Green', hex: '#10b981' },
              { name: 'Vibrant Yellow', hex: '#f59e0b' },
              { name: 'Royal Purple', hex: '#8b5cf6' },
              { name: 'Minimal White', hex: '#ffffff' },
              { name: 'Pitch Black', hex: '#111827' },
            ].map((color) => (
              <button
                key={color.name}
                title={color.name}
                onClick={() => setPinColor(color.hex)}
                className={`w-7 h-7 rounded-full border-[3px] shadow-sm transition-all duration-300 ${
                  pinColor === color.hex ? 'scale-125 z-10' : 'border-transparent hover:scale-110 opacity-70 hover:opacity-100'
                }`}
                style={{ 
                    backgroundColor: color.hex, 
                    borderColor: pinColor === color.hex ? 'rgba(255,255,255,0.8)' : (color.hex === '#111827' ? '#4b5563' : 'transparent'),
                    boxShadow: pinColor === color.hex ? `0 0 15px ${color.hex}60` : 'none'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Canvas Background Card */}
      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 border-t-white/20 rounded-xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <h3 className="text-[11px] uppercase text-gray-400 font-bold mb-3 flex items-center gap-2">
          <span className="text-sm">🖼️</span> Canvas Background
        </h3>
        
        <div className="flex flex-col gap-2">
           <div className="flex gap-2">
             <button onClick={() => setBgMode('style-default')} className={`flex-[2] py-2 rounded-lg border text-[9px] font-bold uppercase transition-all duration-300 ${bgMode === 'style-default' ? 'bg-[#1877F2]/10 border-[#1877F2]/50 text-blue-400' : 'bg-black/20 border-white/5 text-gray-500 hover:text-gray-300'}`}>Preset Theme</button>
             <button onClick={() => setBgMode('transparent')} className={`flex-[2] py-2 rounded-lg border text-[9px] font-bold uppercase transition-all duration-300 ${bgMode === 'transparent' ? 'bg-[#1877F2]/10 border-[#1877F2]/50 text-blue-400' : 'bg-black/20 border-white/5 text-gray-500 hover:text-gray-300'}`}>Clear Base</button>
           </div>
           
           <label className={`w-full py-2.5 px-3 rounded-lg border flex items-center justify-between font-bold uppercase cursor-pointer transition-all duration-300 ${bgMode === 'custom' ? 'bg-[#1877F2]/10 border-[#1877F2]/40 text-blue-400' : 'bg-black/20 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/20'}`}>
             <span className="text-[10px]">Solid Custom Fill</span>
             <input 
                type="color" 
                value={customBgColor} 
                onChange={(e) => { 
                   setCustomBgColor(e.target.value); 
                   setBgMode('custom'); 
                }} 
                onClick={() => setBgMode('custom')}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
             />
           </label>
        </div>
        <p className="text-[9px] text-gray-600 leading-tight block pt-2">Your chosen background will be exactly what appears in the exported file.</p>
      </div>

    </div>
  );
}
