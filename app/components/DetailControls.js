export default function DetailControls({ 
  layout, setLayout, 
  borderWidth, setBorderWidth,
  dotSize, setDotSize,
  atomSize, setAtomSize,
  electronCount, setElectronCount,
  pinEnabled, setPinEnabled,
  pinSize, setPinSize,
  selectedStyle,
  halftoneShape, setHalftoneShape
}) {

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Details & Layout
        </label>
      </div>

      {/* Workspace & Layout Card */}
      <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 border-t-white/20 rounded-xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <h3 className="text-[11px] uppercase text-gray-400 font-bold mb-3 flex items-center gap-2">
          <span className="text-sm">🖼️</span> Canvas Layout
        </h3>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            {['square', 'portrait', 'landscape'].map((mode) => (
              <button
                key={mode}
                onClick={() => setLayout(mode)}
                className={`flex-1 py-2 rounded-lg border text-[10px] font-bold uppercase transition-all duration-300 ${
                  layout === mode 
                  ? 'bg-[#1877F2]/10 border-[#1877F2]/40 text-blue-400 shadow-[0_0_10px_rgba(24,119,242,0.1)]' 
                  : 'bg-black/20 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/20'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Feature Settings (Removed Drawing Details from here) */}



      {/* Neural Mesh Master Control Center */}
      {selectedStyle === 'pencilmesh' && (
         <div className="mt-2 bg-[#0f0b1a] border border-[#1877F2]/20 rounded-xl p-5 shadow-xl backdrop-blur-xl animate-fade-in">
            <h3 className="text-[12px] uppercase text-[#1877F2] font-black tracking-widest mb-5 flex items-center gap-2.5">
              <span className="text-sm">🕸️</span> Network Mesh Settings
            </h3>
            
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
            <div>
              <div className="flex items-center gap-2 mb-3.5 border-b border-pink-500/20 pb-1.5">
                 <span className="text-[10px] text-pink-300">➖</span>
                 <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Connections</p>
              </div>
              <div className="space-y-5 px-1">
                {/* Reach Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[11px] text-gray-200 font-semibold tracking-wide">Line Reach</p>
                    <span className="text-[10px] font-mono text-pink-300 bg-pink-500/10 px-1.5 py-0.5 rounded">{electronCount}</span>
                  </div>
                  <input type="range" min="0" max="40" step="1" value={electronCount} onChange={(e) => setElectronCount(parseInt(e.target.value))} className="w-full h-1.5 bg-pink-950 rounded-lg appearance-none cursor-pointer border-none accent-pink-400" />
                  <p className="text-[9px] text-gray-500 mt-1.5 leading-tight">How far the connecting lines can reach between dots.</p>
                </div>
                {/* Thickness Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[11px] text-gray-200 font-semibold tracking-wide">Line Thickness</p>
                    <span className="text-[10px] font-mono text-pink-300 bg-pink-500/10 px-1.5 py-0.5 rounded">{borderWidth.toFixed(1)}</span>
                  </div>
                  <input type="range" min="0" max="8" step="0.1" value={borderWidth} onChange={(e) => setBorderWidth(parseFloat(e.target.value))} className="w-full h-1.5 bg-pink-950 rounded-lg appearance-none cursor-pointer border-none accent-pink-400" />
                  <p className="text-[9px] text-gray-500 mt-1.5 leading-tight">Adjust how thick the connecting lines appear.</p>
                </div>
              </div>
            </div>
         </div>
      )}

    </div>
  );
}
