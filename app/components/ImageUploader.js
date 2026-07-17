'use client';

import { useState, useRef } from 'react';

export default function ImageUploader({ onImageLoad, onClearImage, hasImage, onSvgPathsLoad }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
       alert("Please upload a valid image file.");
       return;
    }
    
    // NATIVE SVG PATH EXTRACTION ENGINE
    if (file.type === 'image/svg+xml') {
       const textReader = new FileReader();
       textReader.onload = (e) => {
           const svgText = e.target.result;
           const parser = new DOMParser();
           const doc = parser.parseFromString(svgText, "image/svg+xml");
           const paths = [];

           doc.querySelectorAll('path').forEach(p => {
               if (p.getAttribute('d')) paths.push({ id: `svg-path-${Date.now()}-${Math.random()}`, d: p.getAttribute('d') });
           });

           doc.querySelectorAll('polygon').forEach(p => {
               const pts = p.getAttribute('points');
               if (pts) {
                  const points = pts.trim().split(/[\s,]+/);
                  let d = '';
                  for (let i = 0; i < points.length; i += 2) {
                     if (points[i] && points[i+1]) {
                        d += (i === 0 ? 'M' : 'L') + `${points[i]},${points[i + 1]} `;
                     }
                  }
                  d += 'Z';
                  paths.push({ id: `svg-poly-${Date.now()}-${Math.random()}`, d });
               }
           });
           
           doc.querySelectorAll('rect').forEach(r => {
               const x = parseFloat(r.getAttribute('x') || 0);
               const y = parseFloat(r.getAttribute('y') || 0);
               const w = parseFloat(r.getAttribute('width') || 0);
               const h = parseFloat(r.getAttribute('height') || 0);
               const d = `M ${x},${y} L ${x+w},${y} L ${x+w},${y+h} L ${x},${y+h} Z`;
               paths.push({ id: `svg-rect-${Date.now()}-${Math.random()}`, d });
           });

           doc.querySelectorAll('circle, ellipse').forEach(c => {
               const cx = parseFloat(c.getAttribute('cx') || 0);
               const cy = parseFloat(c.getAttribute('cy') || 0);
               const rx = parseFloat(c.getAttribute('r') || c.getAttribute('rx') || 0);
               const ry = parseFloat(c.getAttribute('r') || c.getAttribute('ry') || 0);
               
               // Exact cubic-bezier mathematical approximation for a flawless vector ellipse
               const kappa = 0.5522848;
               const ox = rx * kappa; 
               const oy = ry * kappa; 
               const xe = cx + rx;    
               const ye = cy + ry;    
               const xs = cx - rx;    
               const ys = cy - ry;    
               const d = `M ${xs},${cy} C ${xs},${cy - oy} ${cx - ox},${ys} ${cx},${ys} C ${cx + ox},${ys} ${xe},${cy - oy} ${xe},${cy} C ${xe},${cy + oy} ${cx + ox},${ye} ${cx},${ye} C ${cx - ox},${ye} ${xs},${cy + oy} ${xs},${cy} Z`;
               paths.push({ id: `svg-circ-${Date.now()}-${Math.random()}`, d });
           });

           // Trigger Native Engine Array
           if (paths.length > 0 && typeof onSvgPathsLoad === 'function') {
               onSvgPathsLoad(paths, file.name);
               return; // Skip raster fallback entirely.
           }

           // Fallback if no paths were successfully extracted (e.g. text or nested groups only without proper structures)
           const img = new Image();
           img.onload = () => onImageLoad(img, file.name);
           img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
       };
       textReader.readAsText(file);
       return;
    }

    // STANDARD RASTER IMAGE PIPELINE (for PNG, JPG, etc)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
         onImageLoad(img, file.name);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
    e.target.value = null; // reset
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {!hasImage ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative overflow-hidden w-full h-[120px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            isDragging 
            ? 'border-[#1877F2] bg-[#1877F2]/10 shadow-[0_0_15px_rgba(24,119,242,0.2)]' 
            : 'border-white/10 bg-black/20 hover:border-[#1877F2]/50 hover:bg-black/40'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleChange} 
            accept="image/*" 
            className="hidden" 
          />
          <div className={`text-2xl mb-2 transition-transform duration-300 ${isDragging ? 'scale-125' : ''}`}>🖼️</div>
          <p className="text-[11px] font-bold text-gray-200 mt-1">Choose Image</p>
          <p className="text-[9px] text-gray-500 mt-0.5">or drag and drop</p>
        </div>
      ) : (
        <div className="flex gap-2">
            <button 
                onClick={onClearImage}
                className="flex-[2] py-2.5 rounded-lg bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] text-[10px] font-bold uppercase tracking-widest hover:bg-[#1877F2]/20 active:scale-95 transition-all shadow-none"
            >
                Clear All
            </button>
            <button 
                className="flex-[3] py-2.5 rounded-lg bg-white/[0.05] border border-white/10 text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                onClick={() => {
                   // This could reset settings to default
                }}
            >
                Reset Settings
            </button>
        </div>
      )}
    </div>
  );
}
