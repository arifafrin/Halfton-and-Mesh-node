'use client';

import { useState, useCallback, useEffect } from 'react';
import StyleSelector from './components/StyleSelector';
import ColorControls from './components/ColorControls';
import DetailControls from './components/DetailControls';
import MapPreview from './components/MapPreview';
import ExportControls from './components/ExportControls';
import ImageUploader from './components/ImageUploader';
import { mapStyles } from './utils/colorUtils';

export default function Home() {
  const [selectedStyle, setSelectedStyle] = useState('pencilbasic');
  const [colors, setColors] = useState(Array(18).fill('#ff006e'));
  const [colorMode, setColorMode] = useState('solid');
  const [clearDrawingsTrigger, setClearDrawingsTrigger] = useState(0);
  
  // Detail Controls State
  const [bgMode, setBgMode] = useState('transparent'); // style-default, transparent, custom
  const [customBgColor, setCustomBgColor] = useState('#ffffff');
  const [layout, setLayout] = useState('landscape'); // square, portrait, landscape
  const [borderWidth, setBorderWidth] = useState(0.5);
  const [debugMode, setDebugMode] = useState(false);
  const [stockMode, setStockMode] = useState(true);
  const [dotSize, setDotSize] = useState(3);
  const [halftoneShape, setHalftoneShape] = useState('circle');
  const [shapeOutlineColor, setShapeOutlineColor] = useState('transparent');
  
  // Location Pin State
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinSize, setPinSize] = useState(36);
  const [pinColor, setPinColor] = useState('#1877F2');

  // Atom Settings State (for Network style)
  const [showAtom, setShowAtom] = useState(false);
  const [atomPositions, setAtomPositions] = useState([]); 
  const [activeAtomId, setActiveAtomId] = useState(null);
  const [electronCount, setElectronCount] = useState(12);
  const [atomSize, setAtomSize] = useState(32); // percentage 10-100
  const [atomColor, setAtomColor] = useState('#ff8c00'); // Independent atom color

  // App State
  const [svgRef, setSvgRef] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [appMode, setAppMode] = useState('draw'); // 'draw' or 'halftone'

  // Image Halftone State
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedSvgPaths, setUploadedSvgPaths] = useState(null);
  const [imageFileName, setImageFileName] = useState('');
  const [halftoneConfig, setHalftoneConfig] = useState({
      gridType: 'square',
      spacing: 13,
      rotation: -292,
      dotStyle: 'circle',
      outlineMode: false,
      minSize: 0,
      maxSize: 1.37,
      globalSize: 0.5,
      dotColor: '#ffffff',
      useMonoBlend: false,
      monoBlendColor: '#ff4500'
  });

  const handleImageLoad = (img, fileName) => {
     setUploadedImage(img);
     setUploadedSvgPaths(null);
     setImageFileName(fileName);
  };

  const handleSvgPathsLoad = (paths, fileName) => {
     setUploadedSvgPaths(paths); 
     setUploadedImage(null);
     setImageFileName(fileName);
     setAppMode('draw');
  };

  const handleClearImage = () => {
      setUploadedImage(null);
      setUploadedSvgPaths(null);
      setImageFileName('');
      if (appMode === 'halftone') setAppMode('draw');
  };

  useEffect(() => {
    const savedStyle = localStorage.getItem('vds_selectedStyle');
    setSelectedStyle(savedStyle || 'pencilbasic');
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded && selectedStyle) {
      localStorage.setItem('vds_selectedStyle', selectedStyle);
    }
  }, [selectedStyle, isLoaded]);

  const handleMagicMap = () => {
    const allStyles = Object.keys(mapStyles);
    const randomStyle = allStyles[Math.floor(Math.random() * allStyles.length)];
    setSelectedStyle(randomStyle);
    setLayout(['landscape', 'square'][Math.floor(Math.random() * 2)]);
  };

  const handleSvgRef = useCallback((ref) => setSvgRef(ref), []);

  return (
    <main className="h-screen bg-[#050508] text-white flex overflow-hidden font-sans">
      
      {/* Dynamic Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* ===== PANEL 1: DRAW TOOLS ===== */}
      <aside className="w-[260px] flex flex-col h-full border-r border-white/5 bg-[#0a0a0f] shrink-0 relative z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1877F2] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity="0.9"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                </svg>
              </div>
              <div>
                <h1 className="text-[12px] font-bold tracking-wide text-white">Stock Drawing Studio</h1>
                <p className="text-[8px] text-blue-300 font-medium uppercase tracking-widest mt-0.5">Generative Vector Art</p>
              </div>
            </div>
            <button onClick={handleMagicMap} className="px-2 py-1 rounded-md bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] hover:text-blue-300 text-[9px] font-bold uppercase transition-all flex items-center gap-1 active:scale-95" title="Randomize Colors & Layout">✨</button>
          </div>
        </div>

        {/* Scrollable Draw Controls */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
          {/* App Mode Switcher */}
          <div className="flex gap-1.5 mb-5">
            <button 
              onClick={() => setAppMode('draw')}
              className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300 ${appMode === 'draw' ? 'bg-[#1877F2]/20 border border-[#1877F2]/50 text-blue-300' : 'bg-black/20 border border-white/5 text-gray-500 hover:text-gray-300'}`}
            >
              ✎ Draw
            </button>
            <button 
              onClick={() => setAppMode('halftone')}
              className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300 ${appMode === 'halftone' ? 'bg-[#1877F2]/20 border border-[#1877F2]/50 text-[#1877F2]' : 'bg-black/20 border border-white/5 text-gray-500 hover:text-gray-300'}`}
            >
              🖼️ Upload
            </button>
          </div>

          {/* Drawing Mode UI */}
          {appMode === 'draw' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Draw Tools</label>
              <span className="text-[8px] font-bold bg-[#1877F2]/20 text-[#1877F2] border border-[#1877F2]/30 px-1.5 py-0.5 rounded uppercase">BETA</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {/* Pencil Tool Toggle */}
              <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300 bg-[#1877F2]/10 border-[#1877F2]/50 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✏️</span>
                  <span className="text-[11px] font-bold tracking-wide text-blue-300">Pencil Tool Active</span>
                </div>
                <div className="w-9 h-5 rounded-full p-1 transition-all duration-300 bg-[#1877F2]">
                  <div className="w-3 h-3 rounded-full bg-white transition-all duration-300 translate-x-4" />
                </div>
              </button>

              {/* Draw Style Dropdown */}
              <StyleSelector
                selectedStyle={selectedStyle}
                onSelect={setSelectedStyle}
                label="Drawing Style"
                stylesList={Object.values(mapStyles)}
              />
              <button
                onClick={() => setClearDrawingsTrigger(prev => prev + 1)}
                className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wide hover:bg-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🗑️</span> Clear Canvas
              </button>
              
              {/* Image Uploader */}
              <div className="pt-4 border-t border-white/5">
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#1877F2] flex items-center gap-2 mb-2">
                  <span>🖼️</span> Generate from Image
                </label>
                <ImageUploader 
                  onImageLoad={handleImageLoad} 
                  onSvgPathsLoad={handleSvgPathsLoad}
                  onClearImage={handleClearImage} 
                  hasImage={!!uploadedImage} 
                />
                {uploadedImage ? (
                  <p className="text-[9px] text-[#1877F2]/70 mt-2 text-center bg-[#1877F2]/10 py-1.5 rounded border border-[#1877F2]/10">Style mapped directly to image!</p>
                ) : (
                  <p className="text-[9px] text-[#1877F2] mt-3 text-center bg-[#1877F2]/10 py-2 rounded-md border border-[#1877F2]/20 animate-pulse font-medium">✨ Or draw your shape manually!</p>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Halftone Image UI */}
          {appMode === 'halftone' && (
          <div className="animate-fade-in space-y-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <span>🖼️</span> Upload Silhouette
            </label>
            <ImageUploader 
              onImageLoad={handleImageLoad} 
              onSvgPathsLoad={handleSvgPathsLoad}
              onClearImage={handleClearImage} 
              hasImage={!!uploadedImage} 
            />
            
            {uploadedImage && (
              <div className="space-y-3">
                <div className="border border-white/10 bg-black/20 rounded-xl p-3 shadow-inner">
                  <h3 className="text-[9px] uppercase text-gray-400 font-bold mb-3 flex items-center gap-2 border-b border-white/5 pb-2">▦ Grid Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] text-gray-300 mb-1">Grid Type</p>
                      <select value={halftoneConfig.gridType} onChange={(e) => setHalftoneConfig({ ...halftoneConfig, gridType: e.target.value })} className="w-full bg-black border border-white/10 rounded-md text-[10px] p-1.5 text-gray-200 outline-none focus:border-[#c1ff00]/50">
                        <option value="square">Square</option>
                        <option value="hexagonal">Hexagonal</option>
                        <option value="radial">Radial</option>
                        <option value="network">Gradient Mesh</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[9px] text-gray-300">Spacing</p>
                        <span className="text-[9px] font-mono text-gray-400">{halftoneConfig.spacing}</span>
                      </div>
                      <input type="range" min="2" max="50" step="1" value={halftoneConfig.spacing} onChange={(e) => setHalftoneConfig({...halftoneConfig, spacing: parseFloat(e.target.value)})} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#1877F2]" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[9px] text-gray-300">Rotation</p>
                        <span className="text-[9px] font-mono text-gray-400">{halftoneConfig.rotation}°</span>
                      </div>
                      <input type="range" min="-360" max="360" step="1" value={halftoneConfig.rotation} onChange={(e) => setHalftoneConfig({...halftoneConfig, rotation: parseFloat(e.target.value)})} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#1877F2]" />
                    </div>
                  </div>
                </div>

                {halftoneConfig.gridType !== 'network' && (
                <div className="border border-white/10 bg-black/20 rounded-xl p-3 shadow-inner">
                  <h3 className="text-[9px] uppercase text-gray-400 font-bold mb-3 flex items-center gap-2 border-b border-white/5 pb-2">☷ Dots & Patterns</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] text-gray-300 mb-1">Style</p>
                      <select value={halftoneConfig.dotStyle || 'circle'} onChange={(e) => setHalftoneConfig({ ...halftoneConfig, dotStyle: e.target.value })} className="w-full bg-black border border-white/10 rounded-md text-[10px] p-1.5 text-gray-200 outline-none focus:border-[#c1ff00]/50">
                        <option value="circle">Circle</option>
                        <option value="square">Square</option>
                        <option value="cross">Cross</option>
                        <option value="line">Line</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-gray-300">Outline Mode</p>
                      <button onClick={() => setHalftoneConfig({...halftoneConfig, outlineMode: !halftoneConfig.outlineMode})} className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-300 ${halftoneConfig.outlineMode ? 'bg-[#1877F2]' : 'bg-white/10'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-300 ${halftoneConfig.outlineMode ? 'translate-x-3' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[9px] text-gray-300">Min Size</p>
                        <span className="text-[9px] font-mono text-gray-400">{halftoneConfig.minSize}</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.01" value={halftoneConfig.minSize} onChange={(e) => setHalftoneConfig({...halftoneConfig, minSize: parseFloat(e.target.value)})} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#1877F2]" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[9px] text-gray-300">Max Size</p>
                        <span className="text-[9px] font-mono text-gray-400">{halftoneConfig.maxSize}</span>
                      </div>
                      <input type="range" min="0" max="3" step="0.01" value={halftoneConfig.maxSize} onChange={(e) => setHalftoneConfig({...halftoneConfig, maxSize: parseFloat(e.target.value)})} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#1877F2]" />
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Halftone Drawing Details - above Export */}
        {(selectedStyle === 'pencilnetwork' || selectedStyle === 'pencilradial' || selectedStyle === 'pencilmesh') && appMode === 'draw' && (
        <div className="px-4 pt-3 pb-0 shrink-0 border-t border-white/5">
          <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 rounded-xl p-3 shadow-xl">
            <h3 className="text-[11px] uppercase text-gray-400 font-bold mb-3 flex items-center gap-2">
              <span className="text-sm">📐</span> Drawing Details
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[11px] font-semibold text-gray-300 tracking-wide">Halftone Dot Size</p>
                  <span className="text-[10px] font-mono text-[#1877F2] bg-[#1877F2]/10 px-1.5 py-0.5 rounded">{dotSize.toFixed(1)}px</span>
                </div>
                <input 
                  type="range" min="1" max="12" step="0.5" 
                  value={dotSize}
                  onChange={(e) => setDotSize(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer border border-white/5 accent-[#1877F2]"
                />
                <div className="flex justify-between text-[9px] text-gray-500 mt-1 font-medium uppercase">
                  <span>Fine</span><span>Large</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-[11px] font-semibold text-gray-300 tracking-wide mb-1.5">Halftone Shape</p>
                <select 
                  value={halftoneShape || 'circle'}
                  onChange={(e) => setHalftoneShape(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-[11px] p-2 text-gray-200 outline-none focus:border-[#1877F2]/50 cursor-pointer"
                >
                  <option value="circle">● Circle</option>
                  <option value="diamond">◆ Diamond</option>
                  <option value="heart">♥ Heart</option>
                  <option value="square">■ Square</option>
                  <option value="cross">┼ Cross</option>
                  <option value="line">▬ Line</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Sticky Export at bottom of Panel 1 */}
        <div className="p-4 bg-[#0a0a0f] border-t border-white/5 shrink-0 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <ExportControls 
            svgRef={svgRef} 
            geoData={null}
            countryName={appMode === 'draw' ? 'Custom Drawing' : imageFileName || 'Halftone Image'}
            selectedStyle={selectedStyle}
            hasLabels={false}
            bgMode={bgMode}
            customBgColor={customBgColor}
          />
        </div>
      </aside>

      {/* ===== PANEL 2: AESTHETICS + SETTINGS + EXPORT ===== */}
      <aside className="w-[260px] flex flex-col h-full border-r border-white/5 bg-[#080810] shrink-0 relative z-20">
        {/* Panel 2 Header */}
        <div className="px-4 py-4 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2 mt-1">
            <span>⚙️</span> Inspector
          </h2>
        </div>

        {/* Scrollable Aesthetics + Settings */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
          {/* Aesthetics */}
          <div>
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#1877F2] mb-3 flex items-center gap-2"><span>🎨</span> Aesthetics</h3>
            <ColorControls
              colors={colors}
              onColorsChange={setColors}
              colorMode={colorMode}
              onColorModeChange={setColorMode}
              bgMode={bgMode} setBgMode={setBgMode}
              customBgColor={customBgColor} setCustomBgColor={setCustomBgColor}
              shapeOutlineColor={shapeOutlineColor} setShapeOutlineColor={setShapeOutlineColor}
              pinColor={pinColor} setPinColor={setPinColor}
              pinEnabled={pinEnabled}
              disabled={appMode === 'halftone'}
            />
          </div>
          
          {/* Settings & Layout */}
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#1877F2] mb-3 flex items-center gap-2"><span>📐</span> Settings & Layout</h3>
            <DetailControls
              selectedStyle={appMode === 'halftone' ? 'none' : selectedStyle}
              layout={layout} setLayout={setLayout}
              showLabels={false} setShowLabels={() => {}}
              showTitle={false} setShowTitle={() => {}}
              borderWidth={borderWidth} setBorderWidth={setBorderWidth}
              debugMode={debugMode} setDebugMode={setDebugMode}
              stockMode={stockMode} setStockMode={setStockMode}
              includeIslands={false} setIncludeIslands={() => {}}
              dotSize={dotSize} setDotSize={setDotSize}
              showAtom={showAtom} setShowAtom={setShowAtom}
              activeAtomId={activeAtomId} setActiveAtomId={setActiveAtomId}
              atomPositions={atomPositions} setAtomPositions={setAtomPositions}
              electronCount={electronCount} setElectronCount={setElectronCount}
              atomSize={atomSize} setAtomSize={setAtomSize}
              atomColor={atomColor} setAtomColor={setAtomColor}
              pinEnabled={pinEnabled} setPinEnabled={setPinEnabled}
              pinSize={pinSize} setPinSize={setPinSize}
              halftoneShape={halftoneShape} setHalftoneShape={setHalftoneShape}
            />
          </div>
        </div>
      </aside>

       {/* CENTER PANEL: LIVE PREVIEW */}
      {/* CENTER PANEL: LIVE PREVIEW */}
      <section className="relative z-[5] flex-1 flex flex-col h-screen bg-[#050508]">
        
        {/* Top Info Bar */}
        <div className="h-12 flex items-center justify-between px-6 border-b border-white/5 bg-[#0a0a0f]/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full bg-[#1877F2] shadow-[0_0_10px_rgba(24,119,242,0.5)]`} />
            <span className="text-xs text-gray-400 font-medium tracking-wide">
              Canvas Ready
            </span>
          </div>
          <div className="flex gap-4">
             <span className="text-[10px] text-gray-500 font-mono uppercase bg-white/5 px-2 py-1 rounded">Style: {mapStyles[selectedStyle]?.name || selectedStyle}</span>
             <span className="text-[10px] text-gray-500 font-mono uppercase bg-white/5 px-2 py-1 rounded">Layout: {layout}</span>
          </div>
        </div>

        {/* Interactive Canvas */}
        <div className="flex-1 p-8 flex items-center justify-center overflow-auto custom-scrollbar relative">
          
          {/* Subtle Grid Background for workspace feel */}
          <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

           <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl transition-all duration-500 border border-white/5" style={{
              boxShadow: bgMode === 'transparent' ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
           }}>
              <MapPreview
                geoData={null}
                style={selectedStyle}
                colors={colors}
                selectedRegion={null}
                onRegionSelect={() => {}}
                onSvgRef={handleSvgRef}
                bgMode={bgMode}
                customBgColor={customBgColor}
                shapeOutlineColor={shapeOutlineColor}
                stockMode={stockMode}
                layout={layout}
                showLabels={false}
                showTitle={false}
                borderWidth={borderWidth}
                debugMode={debugMode}
                countryName={'Custom Drawing'}
                includeIslands={false}
                dotSize={dotSize}
                showAtom={showAtom}
                activeAtomId={activeAtomId} setActiveAtomId={setActiveAtomId}
                atomPositions={atomPositions} setAtomPositions={setAtomPositions}
                electronCount={electronCount}
                atomSize={atomSize}
                atomColor={atomColor}
                pinEnabled={pinEnabled}
                pinSize={pinSize}
                pinColor={pinColor}
                countryIso2={null}
                clearDrawingsTrigger={clearDrawingsTrigger}
                appMode={appMode}
                uploadedImage={uploadedImage}
                uploadedSvgPaths={uploadedSvgPaths}
                halftoneConfig={halftoneConfig}
                halftoneShape={halftoneShape}
              />
           </div>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-4 right-6 text-[10px] text-gray-500 font-mono tracking-widest uppercase z-20 opacity-50 hover:opacity-100 transition-opacity">
          Developed by Arif Hossain
        </div>
      </section>


    </main>
  );
}
