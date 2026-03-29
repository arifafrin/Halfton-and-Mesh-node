'use client';

import { useRef, useEffect, useMemo, useState, memo } from 'react';
import { mapStyles, generateMonochromaticPalette } from '../utils/colorUtils';

export default memo(function MapPreview({ 
  style, 
  colors: originalColors, 
  onSvgRef,
  bgMode = 'transparent',
  customBgColor = '#ffffff',
  layout = 'landscape',
  borderWidth = null,
  dotSize = 3,
  showAtom = true,
  activeAtomId = 'atom-0', setActiveAtomId,
  atomPositions = [{ id: 'default', x: 50, y: 50 }],
  setAtomPositions,
  atomSize = 32,
  electronCount = 12,
  atomColor = '#ff8c00',
  clearDrawingsTrigger = 0,
  appMode = 'map',
  uploadedImage = null,
  uploadedSvgPaths = null,
  halftoneConfig = null,
  halftoneShape = 'circle'
}) {
  const svgRef = useRef(null);
  const [halftoneNodes, setHalftoneNodes] = useState([]);

  const dimensions = useMemo(() => {
    switch(layout) {
      case 'square': return { width: 1200, height: 1200 };
      case 'portrait': return { width: 900, height: 1200 };
      case 'landscape': 
      default: return { width: 1200, height: 900 };
    }
  }, [layout]);

  // PAN & ZOOM STATE
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // PENCIL DRAWING STATE
  const [drawnPaths, setDrawnPaths] = useState([]);
  
  // NATIVE SVG IMPORT BRIDGE 
  // Whenever the user uploads an SVG from Illustrator, instantly hydrate the native canvas vectors
  useEffect(() => {
      if (uploadedSvgPaths && uploadedSvgPaths.length > 0) {
          // Add `isDrawn: true` flag to ensure they're treated exactly like Freehand pencil strokes
          const formattedPaths = uploadedSvgPaths.map(p => ({
              ...p,
              isDrawn: true,
              strokeWidth: 2, 
              color: '#ffffff'
          }));
          setDrawnPaths(formattedPaths);
      }
  }, [uploadedSvgPaths]);
  const [currentPath, setCurrentPath] = useState(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);

  // Refs to avoid stale closures in pointer handlers
  const isDrawingShapeRef = useRef(false);
  const currentPathRef = useRef(null);
  
  const activeAtomIdRef = useRef(activeAtomId);
  const atomSizeRef = useRef(atomSize);
  const setAtomPositionsRef = useRef(setAtomPositions);
  
  useEffect(() => { activeAtomIdRef.current = activeAtomId; }, [activeAtomId]);
  useEffect(() => { atomSizeRef.current = atomSize; }, [atomSize]);
  useEffect(() => { setAtomPositionsRef.current = setAtomPositions; }, [setAtomPositions]);

  // DRAG ATOM STATE
  const [draggingAtomId, setDraggingAtomId] = useState(null);
  const [atomDragOffset, setAtomDragOffset] = useState({ x: 0, y: 0 });
  
  useEffect(() => { isDrawingShapeRef.current = isDrawingShape; }, [isDrawingShape]);
  useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);

  // Clear pencil drawings via trigger from parent
  useEffect(() => {
    if (clearDrawingsTrigger > 0) {
      setDrawnPaths([]);
      setCurrentPath(null);
    }
  }, [clearDrawingsTrigger]);

  // Reset transform when dimensions change
  useEffect(() => {
    setTransform({ x: 0, y: 0, k: 1 });
  }, [dimensions]);

  // Native wheel event hook to prevent scrolling while zooming
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const handleWheel = (e) => {
      e.preventDefault();

      // ATOM SCALING OVERRIDE (Alt + Scroll)
      if (e.altKey && activeAtomIdRef.current && setAtomPositionsRef.current) {
         const scaleDelta = e.deltaY > 0 ? -4 : 4;
         setAtomPositionsRef.current(prev => prev.map(a => {
            if (a.id === activeAtomIdRef.current) {
                const currentSize = a.size ?? atomSizeRef.current;
                const newSize = Math.max(5, Math.min(250, currentSize + scaleDelta));
                return { ...a, size: newSize };
            }
            return a;
         }));
         return; 
      }

      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform(prev => {
        const svgRect = svgEl.getBoundingClientRect();
        const pointerX = e.clientX - svgRect.left;
        const pointerY = e.clientY - svgRect.top;
        
        const viewBoxW = dimensions.width;
        const viewBoxH = dimensions.height;
        const logicalX = (pointerX / svgRect.width) * viewBoxW;
        const logicalY = (pointerY / svgRect.height) * viewBoxH;

        const newK = Math.max(0.1, Math.min(prev.k * scaleFactor, 30));
        const ratio = newK / prev.k;
        
        const newX = logicalX - (logicalX - prev.x) * ratio;
        const newY = logicalY - (logicalY - prev.y) * ratio;

        return { x: newX, y: newY, k: newK };
      });
    };
    svgEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => svgEl.removeEventListener('wheel', handleWheel);
  }, [dimensions]);

  const handlePointerDown = (e) => {
    // Check if middle mouse button (button 1) is pressed for panning
    if (e.button === 1 || e.altKey) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.target.setPointerCapture(e.pointerId);
        return;
    }

    if (mapStyles[style]?.isPencil) {
       setIsDrawingShape(true);
       isDrawingShapeRef.current = true;
       const svgRect = svgRef.current.getBoundingClientRect();
       const logicalX = ((e.clientX - svgRect.left) / svgRect.width) * dimensions.width;
       const logicalY = ((e.clientY - svgRect.top) / svgRect.height) * dimensions.height;
       const canvasX = (logicalX - transform.x) / transform.k;
       const canvasY = (logicalY - transform.y) / transform.k;
       const initPath = [{ x: canvasX, y: canvasY }];
       currentPathRef.current = initPath;
       setCurrentPath(initPath);
       
       const livePathEl = document.getElementById('live-draw-path');
       if (livePathEl) {
          livePathEl.setAttribute('d', `M ${canvasX},${canvasY}`);
       }
       e.target.setPointerCapture(e.pointerId);
       return;
    }
  };

  const handleAtomPointerDown = (e, atomId, cx, cy) => {
    e.stopPropagation();
    e.preventDefault();
    if (svgRef.current) {
        svgRef.current.setPointerCapture(e.pointerId);
    }
    
    const bounds = svgRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - bounds.left) * (dimensions.width / bounds.width);
    const mouseY = (e.clientY - bounds.top) * (dimensions.height / bounds.height);
    
    if (e.altKey) {
      const newId = `atom-${Date.now()}`;
      if (setAtomPositions) {
        setAtomPositions(prev => {
          const sourceAtom = prev.find(a => a.id === atomId);
          if (!sourceAtom) return prev;
          return [...prev, { id: newId, x: sourceAtom.x, y: sourceAtom.y, size: sourceAtom.size, electrons: sourceAtom.electrons }];
        });
      }
      if (setActiveAtomId) setActiveAtomId(newId);
      setDraggingAtomId(newId);
    } else {
      if (setActiveAtomId) setActiveAtomId(atomId);
      setDraggingAtomId(atomId);
    }
    
    setAtomDragOffset({ x: mouseX - cx, y: mouseY - cy });
  };

  const handlePointerMove = (e) => {
    if (draggingAtomId && setAtomPositions) {
       const bounds = svgRef.current.getBoundingClientRect();
       const mouseX = (e.clientX - bounds.left) * (dimensions.width / bounds.width);
       const mouseY = (e.clientY - bounds.top) * (dimensions.height / bounds.height);
       
       const newCx = mouseX - atomDragOffset.x;
       const newCy = mouseY - atomDragOffset.y;
       
       const percentX = Math.max(0, Math.min(100, (newCx / dimensions.width) * 100));
       const percentY = Math.max(0, Math.min(100, (newCy / dimensions.height) * 100));
       
       setAtomPositions(prev => prev.map(a => a.id === draggingAtomId ? { ...a, x: percentX, y: percentY } : a));
       return;
    }

    if (mapStyles[style]?.isPencil && isDrawingShapeRef.current) {
       const svgRect = svgRef.current.getBoundingClientRect();
       const logicalX = ((e.clientX - svgRect.left) / svgRect.width) * dimensions.width;
       const logicalY = ((e.clientY - svgRect.top) / svgRect.height) * dimensions.height;
       const canvasX = (logicalX - transform.x) / transform.k;
       const canvasY = (logicalY - transform.y) / transform.k;
       
       const pts = currentPathRef.current || [];
       if (pts.length === 0) {
          currentPathRef.current = [{x: canvasX, y: canvasY}];
       } else {
          const last = pts[pts.length - 1];
          const dx = canvasX - last.x;
          const dy = canvasY - last.y;
          if (dx*dx + dy*dy > 9) { // ~3px distance limit
             pts.push({x: canvasX, y: canvasY});
             
             // High-performance direct DOM mutation for 60fps live drawing
             const livePathEl = document.getElementById('live-draw-path');
             if (livePathEl) {
                const dString = 'M ' + pts.map(pt => `${parseFloat(pt.x.toFixed(2))},${parseFloat(pt.y.toFixed(2))}`).join(' L ');
                livePathEl.setAttribute('d', dString);
             }
          }
       }
       return;
    }
    
    if (!isDragging) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const logicalDx = ((e.clientX - dragStart.x) / svgRect.width) * dimensions.width;
    const logicalDy = ((e.clientY - dragStart.y) / svgRect.height) * dimensions.height;
    
    setTransform(prev => ({ ...prev, x: prev.x + logicalDx, y: prev.y + logicalDy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e) => {
    if (draggingAtomId) {
      if (svgRef.current) {
          svgRef.current.releasePointerCapture(e.pointerId);
      }
      setDraggingAtomId(null);
      return;
    }

    if (mapStyles[style]?.isPencil && isDrawingShapeRef.current) {
       setIsDrawingShape(false);
       isDrawingShapeRef.current = false;
       const finalPath = currentPathRef.current ? [...currentPathRef.current] : null;
       
       const livePathEl = document.getElementById('live-draw-path');
       if (livePathEl) livePathEl.setAttribute('d', '');

       if (finalPath && finalPath.length > 2) {
          let isClosed = false;
          const start = finalPath[0];
          const end = finalPath[finalPath.length - 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          
          const screenDistSq = (dx * transform.k) ** 2 + (dy * transform.k) ** 2;
          
          if (screenDistSq < 2500) {
             isClosed = true;
          }
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          finalPath.forEach(pt => {
            if (pt.x < minX) minX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
          });
          
          const centerX = ((minX + maxX) / 2 / dimensions.width) * 100;
          const centerY = ((minY + maxY) / 2 / dimensions.height) * 100;
          const shapeW = maxX - minX;
          const shapeH = maxY - minY;
          
          const bounds = { minX, minY, maxX, maxY, centerX, centerY, shapeW, shapeH };

          setDrawnPaths(prev => [...prev, { points: finalPath, isClosed, bounds }]);
          
          // AUTO-ATOM SPAWNING: Place an atom at the center of the drawn shape
          if (showAtom && setAtomPositions) {
             const shapeSizePercent = (Math.min(shapeW, shapeH) / Math.min(dimensions.width, dimensions.height)) * 100;
             const autoAtomSize = Math.max(4, Math.min(60, shapeSizePercent * 0.25));
             
             const newAtomId = `atom-${Date.now()}`;
             setAtomPositions(prev => [...prev, { id: newAtomId, x: centerX, y: centerY, size: autoAtomSize }]);
             if (setActiveAtomId) setActiveAtomId(newAtomId);
          }
       }
       setCurrentPath(null);
       currentPathRef.current = null;
       try { e.target.releasePointerCapture(e.pointerId); } catch(_) {}
       return;
    }
    setIsDragging(false);
    try { e.target.releasePointerCapture(e.pointerId); } catch(_) {}
  };

  useEffect(() => {
    if (svgRef.current && onSvgRef) {
      onSvgRef(svgRef.current);
    }
  }, [onSvgRef, dimensions, style, colors, bgMode, borderWidth, dotSize, halftoneNodes]);

  // HALFTONE MATHEMATICS ENGINE
  useEffect(() => {
    if ((appMode !== 'halftone' && (appMode !== 'draw' || !uploadedImage)) || !uploadedImage || !halftoneConfig) {
      setHalftoneNodes([]);
      return;
    }

    // Determine grid type mapping
    let gridType = halftoneConfig.gridType;
    if ((appMode === 'draw' && !!uploadedImage)) {
        const currentStyleId = mapStyles[style]?.id;
        if (currentStyleId === 'pencilmesh') gridType = 'network';
        else if (currentStyleId === 'pencilnetwork') gridType = 'square';
        else if (currentStyleId === 'pencilradial') gridType = 'radial';
        else gridType = 'square';
    }
    
    // In vectorize mode, spacing is mapped from atomSize (Point Density)
    const spacing = (appMode === 'draw' && !!uploadedImage) ? (atomSize > 0 ? atomSize : 15) : halftoneConfig.spacing;
    const { rotation, dotStyle, outlineMode, minSize, maxSize, globalSize, dotColor } = halftoneConfig;
    
    // Scale image down for performance while maintaining aspect ratio
    const MAX_DIM = 800;
    let imgW = uploadedImage.width;
    let imgH = uploadedImage.height;
    
    if (imgW > MAX_DIM || imgH > MAX_DIM) {
       const ratio = Math.min(MAX_DIM / imgW, MAX_DIM / imgH);
       imgW = Math.floor(imgW * ratio);
       imgH = Math.floor(imgH * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = imgW;
    canvas.height = imgH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(uploadedImage, 0, 0, imgW, imgH);
    
    let imgData;
    try {
      imgData = ctx.getImageData(0, 0, imgW, imgH).data;
    } catch (e) {
      console.error("CORS Image data extraction failed: ", e);
      return;
    }

    const nodes = [];
    const rad = (rotation * Math.PI) / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);

    // Calculate bounding box for rotated grid to ensure we cover the canvas
    const diag = Math.sqrt(dimensions.width**2 + dimensions.height**2);
    const halfDiag = diag / 2;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    const startX = -halfDiag;
    const endX = halfDiag;
    const startY = -halfDiag;
    const endY = halfDiag;

    // Centering the image on the logical canvas
    const imgAspect = imgW / imgH;
    const canvasAspect = dimensions.width / dimensions.height;
    let drawW, drawH;
    
    if (imgAspect > canvasAspect) {
        drawW = dimensions.width * 0.8;
        drawH = drawW / imgAspect;
    } else {
        drawH = dimensions.height * 0.8;
        drawW = drawH * imgAspect;
    }
    
    const imgOffsetX = (dimensions.width - drawW) / 2;
    const imgOffsetY = (dimensions.height - drawH) / 2;

    const getBrightness = (x, y) => {
        // Map canvas coordinate to image coordinate
        const mapX = Math.floor(((x - imgOffsetX) / drawW) * imgW);
        const mapY = Math.floor(((y - imgOffsetY) / drawH) * imgH);
        
        if (mapX < 0 || mapX >= imgW || mapY < 0 || mapY >= imgH) return 1; // white outside (radius 0)
        
        const idx = (mapY * imgW + mapX) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const a = imgData[idx + 3];
        
        if (a < 50) return 1; // treat transparent as white
        
        // Luminance formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance; 
    };
    if (gridType === 'network') {
       // Organic Network Mesh Engine (Jittered Grid)
       const spacing = atomSize; // use Point Density slider
       const jitter = spacing * 0.45;
       for (let x = startX; x <= endX; x += spacing) {
           for (let y = startY; y <= endY; y += spacing) {
               const nx = x + (Math.random() - 0.5) * jitter;
               const ny = y + (Math.random() - 0.5) * jitter;
               
               const px = cx + (nx * cosR - ny * sinR);
               const py = cy + (nx * sinR + ny * cosR);

               if (px < -50 || px > dimensions.width + 50 || py < -50 || py > dimensions.height + 50) continue;

               const brightness = getBrightness(px, py);
               if (brightness < 0.95) { // Keep if colored/dark
                   nodes.push({ x: px, y: py, r: dotSize, regionIdx: 0, brightness }); // dotSize is used in rendering
               }
           }
       }
    } else if (gridType === 'radial') {
       // Radial Grid Engine
       const maxRadius = halfDiag;
       for (let r = spacing; r < maxRadius; r += spacing) {
           const circumference = 2 * Math.PI * r;
           const numDots = Math.max(1, Math.floor(circumference / spacing));
           const angleStep = (2 * Math.PI) / numDots;
           
           for (let i = 0; i < numDots; i++) {
               const angle = i * angleStep + rad + (r * 0.01); // slight swirl
               const px = cx + Math.cos(angle) * r;
               const py = cy + Math.sin(angle) * r;
               
               const brightness = getBrightness(px, py);
               if (brightness > 0.95) continue; 
               
               const invertedBrightness = 1 - brightness;
               const dotRadius = minSize + (maxSize - minSize) * invertedBrightness * globalSize * (spacing * 0.5) * (dotSize / 3.0);
               
               const rLevel = dotRadius; // avoid naming collision
               
               if (rLevel > 0.5) {
                   nodes.push({ x: px, y: py, r: rLevel, brightness });
               }
           }
       }
    } else {
       // Standard Cartesian/Hex Engine
       for (let x = startX; x <= endX; x += spacing) {
           for (let y = startY; y <= endY; y += (gridType === 'hexagonal' ? spacing * 0.866 : spacing)) {
               let ox = x;
               let oy = y;
               
               if (gridType === 'hexagonal') {
                   const row = Math.round(y / (spacing * 0.866));
                   if (row % 2 !== 0) ox += spacing * 0.5;
               }

               // Apply Rotation translation mapping
               const px = cx + (ox * cosR - oy * sinR);
               const py = cy + (ox * sinR + oy * cosR);

               // Optimization: Skip off-screen
               if (px < -50 || px > dimensions.width + 50 || py < -50 || py > dimensions.height + 50) continue;

               const brightness = getBrightness(px, py);
               
               // In halftone, darker source = larger dots
               const invertedBrightness = 1 - brightness;
               if (invertedBrightness < 0.05) continue; // cull tiny dots

               const dotRadius = minSize + (maxSize - minSize) * invertedBrightness * globalSize * (spacing * 0.5) * (dotSize / 3.0);
               
               const rLevel = dotRadius;
               if (rLevel > 0.5) {
                   nodes.push({ x: px, y: py, r: rLevel, brightness });
               }
           }
       }
    }

    setHalftoneNodes(nodes);

  }, [appMode, uploadedImage, halftoneConfig, dimensions, style, atomSize, dotSize, borderWidth, electronCount]);

  const monoPalette = useMemo(() => {
    if (halftoneConfig?.useMonoBlend && halftoneConfig?.monoBlendColor) {
      return generateMonochromaticPalette(halftoneConfig.monoBlendColor, 10);
    }
    return [];
  }, [halftoneConfig?.useMonoBlend, halftoneConfig?.monoBlendColor]);

  const colors = monoPalette.length > 0 ? monoPalette : originalColors;
  const styleConfig = mapStyles[style] || mapStyles.pencilbasic;
  const backgroundColor = bgMode === 'transparent' 
    ? 'transparent' 
    : (bgMode === 'custom' ? customBgColor : styleConfig.background);

  const allPaths = useMemo(() => {
     let _paths = [];
     
     if (styleConfig.isPencil) {
         // isNeuralMesh (Gradient Mesh) fills with color; mesh lines render on top.
         const customFill = (styleConfig.isOutlineOnly && !styleConfig.isDotted) || styleConfig.isNeuralMesh
                             ? 'transparent' 
                             : (colors[0] || '#ffffff');
                            
         drawnPaths.forEach((pathObj, i) => {
             const d = pathObj.d || ('M ' + pathObj.points.map(pt => `${parseFloat(pt.x.toFixed(2))},${parseFloat(pt.y.toFixed(2))}`).join(' L ') + (pathObj.isClosed ? ' Z' : ''));
             
             let bounds = pathObj.bounds;
             if (!bounds && d) {
                 // Fast mathematical extraction of Bounding Box from raw Illustrator Path Data
                 const coords = d.match(/-?[\d.]+/g);
                 if (coords && coords.length >= 2) {
                     let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                     for(let j=0; j<coords.length; j+=2) {
                         const vx = parseFloat(coords[j]);
                         const vy = parseFloat(coords[j+1]);
                         if (!isNaN(vx) && !isNaN(vy)) {
                             minX = Math.min(minX, vx);
                             maxX = Math.max(maxX, vx);
                             minY = Math.min(minY, vy);
                             maxY = Math.max(maxY, vy);
                         }
                     }
                     if (minX !== Infinity) bounds = { minX, maxX, minY, maxY };
                 }
             }
             
             _paths.push({
                 id: pathObj.id || `drawn-${i}`, index: i, name: 'Imported Render Layer',
                 d, centroid: null, fillColor: customFill,
                 bounds: bounds || {minX: 0, maxX: 100, minY: 0, maxY: 100}
             });
         });
     }
     return _paths;
  }, [drawnPaths, styleConfig.isPencil, colors, styleConfig]);

  const autoStrokeWidth = useMemo(() => {
    const regionCount = allPaths.length;
    if (regionCount > 150) return 0.2;
    if (regionCount > 100) return 0.3;
    if (regionCount > 50) return 0.4;
    return null;
  }, [allPaths.length]);

  const userStroke = borderWidth !== null ? borderWidth : styleConfig.strokeWidth;
  const finalStrokeWidth = styleConfig.strokeWidth === 0 
    ? 0 
    : (autoStrokeWidth !== null ? Math.min(userStroke, autoStrokeWidth) : userStroke);

  const renderShape = (key, shape, cx, cy, r, fill, stroke = 'none', strokeWidth = 0) => {
    switch (shape) {
      case 'square':
        return <rect key={key} x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      case 'diamond':
        return <polygon key={key} points={`${cx},${cy - r*1.2} ${cx + r*1.2},${cy} ${cx},${cy + r*1.2} ${cx - r*1.2},${cy}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      case 'heart':
        const hr = r * 1.2;
        const heartPath = `M ${cx},${cy + hr*0.5} C ${cx - hr},${cy - hr*0.5} ${cx - hr*0.5},${cy - hr*1.2} ${cx},${cy - hr*0.3} C ${cx + hr*0.5},${cy - hr*1.2} ${cx + hr},${cy - hr*0.5} ${cx},${cy + hr*0.5} Z`;
        return <path key={key} d={heartPath} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      case 'cross':
        return (
           <g key={key} transform={`translate(${cx}, ${cy})`} stroke={fill} strokeWidth={Math.max(1, r * 0.4)} strokeLinecap="round">
               <line x1={-r} y1={0} x2={r} y2={0} />
               <line x1={0} y1={-r} x2={0} y2={r} />
           </g>
        );
      case 'line':
        return <line key={key} x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} stroke={fill} strokeWidth={Math.max(1, r * 0.5)} strokeLinecap="round"/>;
      case 'circle':
      default:
        return <circle key={key} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    }
  };

  const defs = (
    <defs>
      {styleConfig.isNetwork && (
        <filter id="atomGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      )}
      {styleConfig.isDotted && !styleConfig.isRadialDotted && allPaths.map((p) => {
        const spacing = dotSize * 3;
        return (
          <pattern key={`dot-${p.id}`} id={`dot-${p.id}`} x="0" y="0" width={spacing} height={spacing} patternUnits="userSpaceOnUse">
            {renderShape(`pdot-${p.id}`, halftoneShape, spacing/2, spacing/2, dotSize * 0.45, p.fillColor)}
          </pattern>
        );
      })}
      
      {/* clipPath removed — using point-in-polygon testing instead */}
    </defs>
  );

  // Parse SVG path 'd' string to extract polygon vertices for point-in-polygon testing
  const parsePathToPolygon = (d) => {
    if (!d) return [];
    const vertices = [];
    const parts = d.match(/[ML]\s*-?[\d.]+[\s,]-?[\d.]+/gi);
    if (!parts) return [];
    parts.forEach(part => {
      const nums = part.match(/-?[\d.]+/g);
      if (nums && nums.length >= 2) {
        vertices.push({ x: parseFloat(nums[0]), y: parseFloat(nums[1]) });
      }
    });
    return vertices;
  };

  // Ray-casting point-in-polygon test
  const pointInPolygon = (px, py, polygon) => {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const renderPath = (path, globalIdx) => {
    if (!path.d) return null;
    
    let displayFill = path.fillColor;
    if (styleConfig.isDotted && !styleConfig.isRadialDotted) displayFill = `url(#dot-${path.id})`;
    if (styleConfig.isRadialDotted) displayFill = 'transparent'; 
    
    // Fix: Match the drawing outline to the primary node color if it is a Gradient Mesh
    const displayStroke = (styleConfig.id === 'pencilmesh' && colors[0] && colors[0] !== 'transparent') 
       ? colors[0] 
       : styleConfig.stroke;

    let radialDots = null;
    if (styleConfig.isRadialDotted && path.bounds) {
       const b = path.bounds;
       const cx = (b.minX + b.maxX) / 2;
       const cy = (b.minY + b.maxY) / 2;
       const maxDist = Math.hypot(b.maxX - cx, b.maxY - cy);
       const spacing = Math.max(2, dotSize * 2.8);
       const dots = [];
       
       // Parse the drawn path into polygon vertices for precise shape testing
       const polygon = parsePathToPolygon(path.d);
       
       for (let x = b.minX; x <= b.maxX; x += spacing) {
         for (let y = b.minY; y <= b.maxY; y += spacing) {
            // Use point-in-polygon test instead of clipPath
            if (polygon.length >= 3 && !pointInPolygon(x, y, polygon)) continue;
            
            const dist = Math.hypot(x - cx, y - cy);
            const ratio = Math.max(0, 1 - (dist / maxDist));
            const r = (dotSize * 0.8) * ratio;
            if (r > 0.4) {
               let dotColor = path.fillColor;
               if (colors && colors.length > 0) {
                   const index = Math.min(colors.length - 1, Math.max(0, Math.floor((1 - ratio) * colors.length)));
                   dotColor = colors[index];
               }
               dots.push(renderShape(`rdot-${x}-${y}`, halftoneShape, x, y, r, dotColor));
            }
         }
       }
       radialDots = <g>{dots}</g>;
    }

    return (
      <g key={`group-${path.index}`}>
        {!styleConfig.isRadialDotted && (
          <path
            key={`path-${path.index}`}
            id={path.id}
            d={path.d}
            fill={displayFill}
            stroke={displayStroke}
            strokeWidth={finalStrokeWidth}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ opacity: 1 }}
          />
        )}
        {radialDots}
      </g>
    );
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-transparent">
        <svg
          id="map-canvas"
          ref={(el) => {
            svgRef.current = el;
            if (onSvgRef) onSvgRef(el);
          }}
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          xmlns="http://www.w3.org/2000/svg"
          className={`max-w-full max-h-full transition-all duration-300 origin-center ${mapStyles[style]?.isPencil ? 'cursor-crosshair' : (isDragging ? 'cursor-grabbing' : 'cursor-grab')}`}
          style={{ 
            background: backgroundColor, 
            touchAction: 'none'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {defs}
          
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          <rect x={-transform.x / transform.k} y={-transform.y / transform.k} width={dimensions.width / transform.k} height={dimensions.height / transform.k} fill="transparent" />

          <g id="map-regions">
            {appMode === 'draw' && styleConfig.isPencil && allPaths.filter(p => !!p.d).map((path, idx) => {
               return renderPath(path, idx);
            })}

            {appMode === 'draw' && styleConfig.isPencil && (
               <path
                 id="live-draw-path"
                 d=""
                 fill="transparent"
                 stroke={(colors[0] && colors[0] !== 'transparent') ? colors[0] : (styleConfig.stroke || '#ffffff')}
                 strokeWidth={3}
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 pointerEvents="none"
               />
            )}
            
            {/* HALFTONE ENGINE RENDER LAYER */}
            {((appMode === 'halftone') || ((appMode === 'draw' && !!uploadedImage))) && halftoneNodes.length > 0 && !!uploadedImage && (
                <g id="halftone-overlay">
                  {(((appMode === 'draw' && !!uploadedImage) && styleConfig?.id === 'pencilmesh') || (appMode === 'halftone' && halftoneConfig.gridType === 'network')) ? (() => {
                      const finalNodes = halftoneNodes;
                      // Base distance between points is `atomSize`. To connect adjacent nodes, reach must be > atomSize.
                      const cullDist = atomSize;
                      const connectDist = cullDist * (1.2 + (electronCount / 10));
                      const lines = [];
                      const defaultRc = colors[0] || '#1877F2';
                      
                      const getNodeColor = (b) => {
                          if (colors.length > 2 && colors[0] !== colors[1]) {
                              const index = Math.min(colors.length - 1, Math.max(0, Math.floor((b || 0) * colors.length)));
                              return colors[index];
                          }
                          return defaultRc;
                      };
                      
                      for (let i = 0; i < finalNodes.length; i++) {
                         for (let j = i + 1; j < finalNodes.length; j++) {
                             const n1 = finalNodes[i];
                             const n2 = finalNodes[j];
                             const dx = n1.x - n2.x;
                             const dy = n1.y - n2.y;
                             const dist = Math.sqrt(dx*dx + dy*dy);
                             
                             if (dist < connectDist) {
                                 let isPlanar = true;
                                 const midX = n1.x - (dx / 2.0);
                                 const midY = n1.y - (dy / 2.0);
                                 const radSq = (dist * dist) / 4.0;
                                 
                                 for (let k = 0; k < finalNodes.length; k++) {
                                     if (k === i || k === j) continue;
                                     const n3 = finalNodes[k];
                                     if (Math.abs(n3.x - midX) > dist || Math.abs(n3.y - midY) > dist) continue;
                                     if (((n3.x - midX)**2 + (n3.y - midY)**2) <= radSq) {
                                         isPlanar = false; break;
                                     }
                                 }
                                 
                                 if (isPlanar) {
                                     const opacity = Math.max(0.15, 1 - (dist / connectDist));
                                     const baseBorder = borderWidth > 0 ? borderWidth : 0.8;
                                     const avgB = ((n1.brightness || 0) + (n2.brightness || 0)) / 2;
                                     lines.push(
                                        <line key={`hnl-${i}-${j}`} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} 
                                           stroke={getNodeColor(avgB)} strokeWidth={baseBorder} opacity={opacity} />
                                     );
                                 }
                             }
                         }
                      }
                      
                      return (
                         <g className="transition-all duration-500">
                            <g id="halftone-network-lines">{lines}</g>
                            <g id="halftone-network-nodes">
                               {finalNodes.map((n, i) => (
                                  renderShape(`hnd-${i}`, halftoneShape, n.x, n.y, dotSize > 0 ? dotSize : 2.5, getNodeColor(n.brightness), "#ffffff", borderWidth > 0 ? borderWidth * 0.5 : 0.5)
                               ))}
                            </g>
                         </g>
                      );
                  })() : (
                    <g filter={halftoneConfig.outlineMode ? "url(#outline-glow)" : ""}>
                    {halftoneNodes.map((n, i) => {
                       const { dotStyle, outlineMode, dotColor, useMonoBlend } = halftoneConfig;
                       
                       let baseDotColor = colors[0] || '#1877F2';
                       if (colors.length > 2 && colors[0] !== colors[1]) {
                           const index = Math.min(colors.length - 1, Math.max(0, Math.floor((n.brightness || 0) * colors.length)));
                           baseDotColor = colors[index];
                       }
                       
                       const fill = outlineMode ? 'transparent' : baseDotColor;
                       const stroke = outlineMode ? baseDotColor : 'none';
                       const sWidth = outlineMode ? 1.5 : 0;
                       
                       if (dotStyle === 'square') {
                          return <rect key={`hf-${i}`} x={n.x - n.r} y={n.y - n.r} width={n.r*2} height={n.r*2} fill={fill} stroke={stroke} strokeWidth={sWidth} />;
                       }
                       if (dotStyle === 'cross') {
                          return (
                             <g key={`hf-${i}`} transform={`translate(${n.x}, ${n.y})`} stroke={baseDotColor} strokeWidth={n.r * 0.4} strokeLinecap="round">
                                 <line x1={-n.r} y1={0} x2={n.r} y2={0} />
                                 <line x1={0} y1={-n.r} x2={0} y2={n.r} />
                             </g>
                          );
                       }
                       if (dotStyle === 'line') {
                          return <line key={`hf-${i}`} x1={n.x - n.r} y1={n.y - n.r} x2={n.x + n.r} y2={n.y + n.r} stroke={baseDotColor} strokeWidth={Math.max(1, n.r * 0.5)} strokeLinecap="round"/>;
                       }
                       
                       return <circle key={`hf-${i}`} cx={n.x} cy={n.y} r={n.r} fill={fill} stroke={stroke} strokeWidth={sWidth} />;
                    })}
                    </g>
                  )}
                </g>
            )}
          </g>



          {(appMode === 'draw' && !uploadedImage) && styleConfig.isNeuralMesh && (
            <g id="neural-mesh-overlay">
              {(() => {
                 let nodes = [];
                 if ((appMode === 'draw' && !!uploadedImage)) {
                     nodes = halftoneNodes.map(n => ({x: n.x, y: n.y, regionIdx: 0}));
                 } else {
                     allPaths.forEach(p => {
                     if (!p.bounds) return;
                     const b = p.bounds;
                     
                     // Extract outline points from path
                     const matches = p.d.match(/[ML]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g);
                     const outlinePoints = [];
                     if (matches) {
                         matches.forEach(m => {
                             const coords = m.match(/-?[\d.]+/g);
                             if (coords && coords.length >= 2) {
                                 outlinePoints.push({ x: parseFloat(coords[0]), y: parseFloat(coords[1]) });
                             }
                         });
                     }
                     
                     // Add outline points as nodes
                     const outlineStep = Math.max(1, Math.floor(outlinePoints.length / 80));
                     for (let i = 0; i < outlinePoints.length; i += outlineStep) {
                         nodes.push({ x: outlinePoints[i].x, y: outlinePoints[i].y, regionIdx: p.index });
                     }
                     
                     // FILL THE INTERIOR with grid points using point-in-polygon ray casting
                     const gridSpacing = Math.max(2, atomSize * 0.4);
                     if (outlinePoints.length > 2 && gridSpacing > 0) {
                         const isInsideShape = (testX, testY) => {
                             let inside = false;
                             for (let i = 0, j = outlinePoints.length - 1; i < outlinePoints.length; j = i++) {
                                 const xi = outlinePoints[i].x, yi = outlinePoints[i].y;
                                 const xj = outlinePoints[j].x, yj = outlinePoints[j].y;
                                 const intersect = ((yi > testY) !== (yj > testY))
                                     && (testX < (xj - xi) * (testY - yi) / (yj - yi) + xi);
                                 if (intersect) inside = !inside;
                             }
                             return inside;
                         };
                         
                         const jitter = gridSpacing * 0.45;
                         for (let gx = b.minX; gx <= b.maxX; gx += gridSpacing) {
                             for (let gy = b.minY; gy <= b.maxY; gy += gridSpacing) {
                                 const nx = gx + (Math.random() - 0.5) * jitter;
                                 const ny = gy + (Math.random() - 0.5) * jitter;
                                 if (isInsideShape(nx, ny)) {
                                     nodes.push({ x: nx, y: ny, regionIdx: p.index });
                                 }
                             }
                         }
                     }
                 });
                 } // end else
                 
                 const cullDist = (appMode === 'draw' && !!uploadedImage) ? atomSize : (atomSize * 0.5);
                 const connectDist = cullDist * (1.2 + (electronCount / ((appMode === 'draw' && !!uploadedImage) ? 10 : 8)));
                 const finalNodes = [];
                 for (let pt of nodes) {
                     let tooClose = false;
                     for (let f of finalNodes) {
                         const dx = pt.x - f.x;
                         const dy = pt.y - f.y;
                         if (Math.sqrt(dx*dx + dy*dy) < cullDist) { 
                             tooClose = true; 
                             break; 
                         }
                     }
                     if (!tooClose) finalNodes.push(pt);
                 }

                 const lines = [];
                 
                 for (let i = 0; i < finalNodes.length; i++) {
                     for (let j = i + 1; j < finalNodes.length; j++) {
                         const n1 = finalNodes[i];
                         const n2 = finalNodes[j];
                         const dx = n1.x - n2.x;
                         const dy = n1.y - n2.y;
                         const dist = Math.sqrt(dx*dx + dy*dy);
                         
                         if (dist < connectDist) {
                             const distSq = dist * dist;
                             const midX = n1.x - (dx / 2.0);
                             const midY = n1.y - (dy / 2.0);
                             const radSq = distSq / 4.0;
                             
                             let isPlanar = true;
                             for (let k = 0; k < finalNodes.length; k++) {
                                 if (k === i || k === j) continue;
                                 const n3 = finalNodes[k];
                                 if (Math.abs(n3.x - midX) > dist || Math.abs(n3.y - midY) > dist) continue;
                                 if (((n3.x - midX)**2 + (n3.y - midY)**2) <= radSq) {
                                     isPlanar = false;
                                     break;
                                 }
                             }
                             
                             if (isPlanar) {
                                 const opacity = Math.max(0.15, 1 - (dist / connectDist));
                                 const baseBorder = borderWidth > 0 ? borderWidth : 0.8;
                                 const regionColor = colors[(n1.regionIdx || 0) % (colors.length || 1)] || '#888';
                                 lines.push(
                                    <line 
                                       key={`mesh-ln-${i}-${j}`} 
                                       x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} 
                                       stroke={regionColor} 
                                       strokeWidth={baseBorder}
                                       opacity={opacity}
                                    />
                                 );
                             }
                         }
                     }
                 }

                 return (
                    <g className="pointer-events-none transition-all duration-500">
                      <g id="mesh-lines">{lines}</g>
                      <g id="mesh-nodes">
                        {finalNodes.map((n, i) => {
                           const regionColor = colors[(n.regionIdx || 0) % (colors.length || 1)] || '#888';
                           const baseRadius = dotSize > 0 ? dotSize : 2.5;
                           return (
                               renderShape(`mesh-nd-${i}`, halftoneShape, n.x, n.y, baseRadius, regionColor, "#ffffff", borderWidth > 0 ? borderWidth * 0.5 : 0.5)
                           );
                        })}
                      </g>
                    </g>
                 );
              })()}
            </g>
          )}

          </g>
        </svg>
    </div>
  );
});
