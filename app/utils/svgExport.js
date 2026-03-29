/**
 * Professional SVG export utility for stock marketplaces.
 * Generates clean, editable, layered SVG files with support for Premium Edition features (gradients, labels).
 * Added ZIP packaging system for Adobe Stock bulk exports.
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import opentype from 'opentype.js';
import { mapStyles } from './colorUtils';

let cachedFont = null;
async function loadFont() {
  if (cachedFont) return cachedFont;
  try {
    cachedFont = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve(null), 3000);
        opentype.load('/fonts/Roboto-Regular.ttf', (err, font) => {
            clearTimeout(timeout);
            if (err) resolve(null);
            else resolve(font);
        });
    });
  } catch (err) { console.error("Font load skipped"); }
  return cachedFont;
}

const sanitizeId = (str) => {
  if (!str) return 'region';
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

/**
 * Builds an Adobe-standard XMP metadata block to embed inside an SVG's defs.
 * Illustrator reads this via File > File Info and carries it into EPS 10 on save.
 */
function buildXMPMetadataBlock(metadata) {
  if (!metadata) return '';
  const { title = '', keywords = '', description = '' } = metadata;
  const now = new Date().toISOString();

  // Sanitize for XML embedding
  const esc = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Build keyword <rdf:Bag> list for Adobe Stock / IPTC compatibility
  const kwArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
  const kwBag = kwArray.map(k => `            <rdf:li>${esc(k)}</rdf:li>`).join('\n');

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
      xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${esc(title)}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${esc(description)}</rdf:li>
        </rdf:Alt>
      </dc:description>
      <dc:subject>
        <rdf:Bag>
${kwBag}
        </rdf:Bag>
      </dc:subject>
      <dc:rights>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Royalty Free</rdf:li>
        </rdf:Alt>
      </dc:rights>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>Vector Map Generator Premium Edition</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <xmp:CreateDate>${now}</xmp:CreateDate>
      <xmp:ModifyDate>${now}</xmp:ModifyDate>
      <xmp:CreatorTool>Vector Map Generator Premium Edition</xmp:CreatorTool>
      <xmpRights:Marked>True</xmpRights:Marked>
      <Iptc4xmpCore:CiEmailWork></Iptc4xmpCore:CiEmailWork>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export async function buildStockReadySVG(svgElement, countryName, options = { stripLabels: false }) {
  if (!svgElement) return null;

  const clone = svgElement.cloneNode(true);
  
  const { bgMode, customBgColor, style: styleId } = options;
  const styleConfig = mapStyles[styleId] || mapStyles.pencilbasic;
  
  let finalBgColor = null;
  if (bgMode === 'custom') {
      finalBgColor = customBgColor;
  } else if (bgMode !== 'transparent' && styleConfig.background && styleConfig.background !== 'transparent') {
      finalBgColor = styleConfig.background;
  }
  
  // 1. Remove unwanted interactive effects
  // Find all paths and remove hover/click specific classes and dynamic filters
  const paths = Array.from(clone.querySelectorAll('path, ellipse, circle, rect, g'));
  paths.forEach(p => {
    p.removeAttribute('class');
    // Remove inline style transforms/filters used for UI feedback
    p.style.transform = '';
    p.style.filter = '';
    p.style.opacity = ''; // reset opacity if changed by hover
    if (p.getAttribute('style') === '') p.removeAttribute('style');
    
    // User requested NO RASTER elements. Remove all filter attributes (like glowing blurs).
    if (p.hasAttribute('filter')) p.removeAttribute('filter');
  });

  // 1.5 Handle Text Conversion or Stripping
  const mapLabelsGroupNode = clone.querySelector('#map-labels');
  const mapTitleGroupNode = clone.querySelector('#map-title');

  if (options.stripLabels) {
      if (mapLabelsGroupNode) mapLabelsGroupNode.innerHTML = '';
  } else {
      // Load font for converting text to paths
      const font = await loadFont();
      if (font) {
          const texts = Array.from(clone.querySelectorAll('text'));
          texts.forEach(t => {
              const textContent = t.textContent;
              if (!textContent) return;
              
              const x = parseFloat(t.getAttribute('x') || t.getAttribute('dx')) || 0;
              const y = parseFloat(t.getAttribute('y') || t.getAttribute('dy')) || 0;
              // MapPreview scales font sizes differently. Retrieve true computed scale or static size
              const fontSize = parseFloat(t.getAttribute('font-size')) || 10;
              const fill = t.getAttribute('fill') || '#000000';
              const textAnchor = t.getAttribute('text-anchor') || 'middle';
              
              let startX = x;
              const advanceWidth = font.getAdvanceWidth(textContent, fontSize);
              if (textAnchor === 'middle') {
                  startX = x - (advanceWidth / 2);
              } else if (textAnchor === 'end') {
                  startX = x - advanceWidth;
              }

              const fontPath = font.getPath(textContent, startX, y, fontSize);
              const pathData = fontPath.toPathData(2);
              
              const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              newPath.setAttribute('d', pathData);
              newPath.setAttribute('fill', fill);
              newPath.setAttribute('class', 'converted-text');
              
              if (t.id) newPath.setAttribute('id', sanitizeId(t.id + '-path'));
              if (t.parentNode) t.parentNode.replaceChild(newPath, t);
          });
      }
  }

  // 2. Preserve Defs if they contain structural elements (like Gradients)
  // User requested NO RASTER elements. So we must explicitly remove all <filter> effects since they rasterize in vector tools.
  const defs = clone.querySelector('defs');
  if (defs) {
    const filters = Array.from(defs.querySelectorAll('filter'));
    filters.forEach(f => f.remove());
    
    // FIX: Remove all <clipPath> definitions from defs.
    // These contain the pencil-drawn outline shape which Illustrator renders as a visible outline,
    // inflating the bounding box and adding unwanted geometry.
    const clipPaths = Array.from(defs.querySelectorAll('clipPath'));
    clipPaths.forEach(cp => cp.remove());
    
    if (defs.children.length === 0) defs.remove();
  }
  
  // FIX: Also remove clipPath definitions that may exist outside of defs
  const allClipPaths = Array.from(clone.querySelectorAll('clipPath'));
  allClipPaths.forEach(cp => cp.remove());
  
  // FIX: Strip clip-path attributes from all elements so the references don't cause issues
  const elementsWithClipPath = Array.from(clone.querySelectorAll('[clip-path]'));
  elementsWithClipPath.forEach(el => el.removeAttribute('clip-path'));
  
  // Also check for clipPath attribute (camelCase, used in React SVG)
  const elementsWithClipPathCamel = Array.from(clone.querySelectorAll('[clipPath]'));
  elementsWithClipPathCamel.forEach(el => el.removeAttribute('clipPath'));
  
  // FIX: Remove degenerate near-origin paths that inflate the bounding box.
  // These are tiny invisible paths created near (0,0) during pre-computation.
  const allPathsForCleanup = Array.from(clone.querySelectorAll('path'));
  allPathsForCleanup.forEach(p => {
      const d = p.getAttribute('d');
      if (!d) { p.remove(); return; }
      
      // Extract all numeric values from the path data
      const nums = d.match(/-?\d+\.?\d*/g);
      if (!nums || nums.length < 2) { p.remove(); return; }
      
      // Check if all coordinates are clustered near origin (degenerate path)
      const allNearOrigin = nums.every(n => Math.abs(parseFloat(n)) < 1);
      if (allNearOrigin) {
          p.remove();
      }
  });
  
  // CRITICAL FIX: Replace ALL fill="transparent" with fill="none" globally.
  // Adobe Illustrator does NOT understand SVG 'transparent' keyword — it renders it as solid black fill.
  // This is the root cause of the black shape appearing when ungrouping Gradient Mesh in Illustrator.
  const allElementsGlobal = Array.from(clone.querySelectorAll('[fill="transparent"]'));
  allElementsGlobal.forEach(el => el.setAttribute('fill', 'none'));
  
  // 3. Clean root styles and React specific attributes
  // Strip all unresolved filter URLs to completely prevent Adobe Illustrator [STEX] parsing exceptions
  const elementsWithFilters = Array.from(clone.querySelectorAll('[filter]'));
  elementsWithFilters.forEach(el => el.removeAttribute('filter'));
  
  clone.removeAttribute('class');
  const attributesToRemove = ['data-reactroot', 'data-reactid', 'data-react-checksum'];
  attributesToRemove.forEach(attr => clone.removeAttribute(attr));
  
  // COMPLETELY NUKE ALL INLINE STYLES GLOBALLY ACROSS ALL NODES!
  // Adobe Illustrator's vector parser immediately throws an [STEX] fatal crash if it detects browser-computed CSS on ANY nested element.
  const allDOMNodes = Array.from(clone.querySelectorAll('*'));
  allDOMNodes.forEach(node => {
      node.removeAttribute('style');
      node.removeAttribute('class');
  });
  clone.removeAttribute('style');
  clone.removeAttribute('class');

  // 4. Clean root node namespace collisions
  // We strictly defer namespace formatting directly to the regex string builder explicitly to prevent 
  // duplicate `xmlns` properties which natively crash Adobe Illustrator with `[STEX]` Unknown Error.
  // DO NOT remove them here, as doing so forces XMLSerializer to re-inject them on every single child element!
  
  // CRITICAL: Adobe Illustrator crashes immediately if width/height are set to percentages like '100%'
  // We must calculate the strict dimensional pixel bounds from the internal viewBox
  const vbData = (clone.getAttribute('viewBox') || '0 0 800 600').trim().split(/[\s,]+/);
  clone.setAttribute('width', vbData[2] || '800');
  clone.setAttribute('height', vbData[3] || '600');
  
  // 5. Structure Layers cleanly (Stock Requirement)
  const countryGroupId = sanitizeId(countryName || 'country-map');
  const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  mainGroup.setAttribute('id', countryGroupId);

  // 5.1 Enforce Physical Solid Background Vector mathematically bound to guaranteed HEX states
  if (finalBgColor) {
     const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
     const vb = (clone.getAttribute('viewBox') || '0 0 800 600').trim().split(/[\s,]+/);
     bgRect.setAttribute('x', vb[0] || '0');
     bgRect.setAttribute('y', vb[1] || '0');
     bgRect.setAttribute('width', vb[2] || '800');
     bgRect.setAttribute('height', vb[3] || '600');
     bgRect.setAttribute('fill', finalBgColor);
     bgRect.setAttribute('id', 'Canvas-Background');
     mainGroup.appendChild(bgRect);
  }

  // Extract regions group (Preserving structural transforms!)
  const mapRegionsGroup = clone.querySelector('#map-regions');
  if (mapRegionsGroup) {
      const regionGroupOut = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      regionGroupOut.setAttribute('id', 'map-group');
      
      // Collect ALL halftone dot elements into a single flat group
      const allDotElements = Array.from(mapRegionsGroup.querySelectorAll('circle, rect, polygon, path'));
      
      // Check if this is a halftone-style export (dots only, no outline paths)
      // IMPORTANT: Gradient Mesh (pencilmesh) has many circle/line elements but is NOT halftone.
      // We detect halftone by checking the style ID to avoid misidentifying Gradient Mesh.
      const isGradientMesh = styleConfig && (styleConfig.id === 'pencilmesh' || styleConfig.isNeuralMesh);
      const isHalftoneExport = !isGradientMesh && allDotElements.length > 10; // Halftones have many small elements
      
      if (isHalftoneExport) {
          // Flatten everything — put dots directly into mainGroup (no extra nesting)
          allDotElements.forEach(el => {
              const fill = el.getAttribute('fill');
              if (fill === 'none' || fill === 'transparent') return;
              mainGroup.appendChild(el);
          });
          // Skip adding regionGroupOut entirely for halftone
      } else {
          // Non-halftone: preserve original group structure
          // This also includes Gradient Mesh which needs the stroke outline exported
          const subGroups = Array.from(mapRegionsGroup.children);
          subGroups.forEach((subG, groupIndex) => {
              if (subG.tagName.toLowerCase() === 'path') {
                  const fill = subG.getAttribute('fill');
                  const stroke = subG.getAttribute('stroke');
                  const sWidth = parseFloat(subG.getAttribute('stroke-width')) || 0;
                  
                  // Skip invisible boundary paths BUT KEEP them if they have a valid stroke outline!
                  if ((fill === 'none' || fill === 'transparent') && (!stroke || stroke === 'none' || stroke === 'transparent' || sWidth === 0)) return;
                  
                  const titleEl = subG.querySelector('title');
                  const regionName = titleEl ? titleEl.textContent : `custom-shape-${groupIndex}`;
                  if (titleEl) titleEl.remove();
                  
                  Array.from(subG.attributes).forEach(attr => {
                     if(attr.name.startsWith('data-')) subG.removeAttribute(attr.name);
                  });
                  if (!subG.getAttribute('id')) subG.setAttribute('id', sanitizeId(regionName));
                  
                  const pLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                  pLayer.setAttribute('id', `layer-${sanitizeId(regionName)}`);
                  pLayer.appendChild(subG);
                  regionGroupOut.appendChild(pLayer);
                  
              } else if (subG.tagName.toLowerCase() === 'g') {
                  const newG = subG.cloneNode(false);
                  if (!newG.getAttribute('id')) newG.setAttribute('id', `region-cluster-${groupIndex}`);
                  
                  const directChildren = Array.from(subG.children);
                  directChildren.forEach((child, index) => {
                      const tag = child.tagName.toLowerCase();
                      
                      if (tag === 'path') {
                          const fill = child.getAttribute('fill');
                          const stroke = child.getAttribute('stroke');
                          const sWidth = parseFloat(child.getAttribute('stroke-width')) || 0;
                          
                          // Skip invisible boundary paths BUT KEEP them if they have a valid stroke outline!
                          if ((fill === 'none' || fill === 'transparent') && (!stroke || stroke === 'none' || stroke === 'transparent' || sWidth === 0)) return;
                          
                          const titleEl = child.querySelector('title');
                          const regionName = titleEl ? titleEl.textContent : `region-${index + 1}`;
                          if (titleEl) titleEl.remove();
                          
                          Array.from(child.attributes).forEach(attr => {
                             if(attr.name.startsWith('data-')) child.removeAttribute(attr.name);
                          });
                          
                          if (!child.getAttribute('id')) child.setAttribute('id', sanitizeId(regionName));
                          
                          const pLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                          pLayer.setAttribute('id', `layer-${sanitizeId(regionName)}`);
                          pLayer.appendChild(child);
                          newG.appendChild(pLayer);
                          
                      } else if (tag === 'g') {
                          if (!child.getAttribute('id')) child.setAttribute('id', `shape-group-${groupIndex}-${index}`);
                          newG.appendChild(child);
                      }
                  });
                  regionGroupOut.appendChild(newG);
              }
          });
          mainGroup.appendChild(regionGroupOut);
      }
  }

  // Extract labels and overlay elements
  const mapLabelsGroup = clone.querySelector('#map-labels');
  const mapTitleGroup = clone.querySelector('#map-title');
  const overlayGroupOut = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  overlayGroupOut.setAttribute('id', 'overlays');
  let hasOverlays = false;

  if (mapLabelsGroup && mapLabelsGroup.children.length > 0) {
      const labelGroupIn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      labelGroupIn.setAttribute('id', 'labels');
      
      // Because text was converted to paths
      const labelEls = Array.from(mapLabelsGroup.querySelectorAll('text, path'));
      labelEls.forEach((el, i) => {
          if (!el.getAttribute('id')) el.setAttribute('id', `label-${i}`);
          labelGroupIn.appendChild(el);
      });
      overlayGroupOut.appendChild(labelGroupIn);
      hasOverlays = true;
  }
  
  if (mapTitleGroup && mapTitleGroup.children.length > 0) {
      const titleGroupIn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      titleGroupIn.setAttribute('id', 'title');
      const titleEls = Array.from(mapTitleGroup.querySelectorAll('text, path'));
      titleEls.forEach((el, i) => {
          if (!el.getAttribute('id')) el.setAttribute('id', `title-element-${i}`);
          titleGroupIn.appendChild(el);
      });
      overlayGroupOut.appendChild(titleGroupIn);
      hasOverlays = true;
  }
  
  const mapPinsGroup = clone.querySelector('#map-region-pins');
  if (mapPinsGroup) {
      const cleanPinsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      cleanPinsGroup.setAttribute('id', 'Location-Pins'); // Best UX for Illustrator Layer names
      
      // Migrate all individual pins into this fresh group without destroying nesting
      const elements = Array.from(mapPinsGroup.children);
      elements.forEach(el => cleanPinsGroup.appendChild(el));
      
      overlayGroupOut.appendChild(cleanPinsGroup);
      hasOverlays = true;
  }
  
  const mapNetworkGroup = clone.querySelector('#network-overlay');
  if (mapNetworkGroup) {
      // Create a clean group for the atom
      const atomGroupIn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      atomGroupIn.setAttribute('id', 'Atom-Network');
      Array.from(mapNetworkGroup.children).forEach(el => atomGroupIn.appendChild(el));
      mainGroup.appendChild(atomGroupIn);
  }

  const mapNeuralMeshGroup = clone.querySelector('#neural-mesh-overlay');
  if (mapNeuralMeshGroup) {
      // Create a clean distinct master grouping layer for the Neural Mesh / Gradient Mesh
      const meshGroupIn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      meshGroupIn.setAttribute('id', 'Gradient-Mesh');
      
      // CRITICAL: Strip ALL clip-path attributes from mesh nodes and lines.
      // Gradient Mesh nodes must NEVER be clipped — they are free-floating point elements.
      const meshChildren = Array.from(mapNeuralMeshGroup.querySelectorAll('*'));
      meshChildren.forEach(el => {
          el.removeAttribute('clip-path');
          el.removeAttribute('clipPath');
          el.removeAttribute('clip');
      });
      mapNeuralMeshGroup.removeAttribute('clip-path');
      mapNeuralMeshGroup.removeAttribute('clipPath');
      mapNeuralMeshGroup.removeAttribute('clip');
      
      Array.from(mapNeuralMeshGroup.children).forEach(el => meshGroupIn.appendChild(el));
      mainGroup.appendChild(meshGroupIn);
  }

  // FIX: Extract the #halftone-overlay group (Radial Halftone, standard Halftone dots)
  // Previously this group was never included in the exported SVG, causing blank exports.
  const mapHalftoneGroup = clone.querySelector('#halftone-overlay');
  if (mapHalftoneGroup) {
      const halftoneGroupIn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      halftoneGroupIn.setAttribute('id', 'Halftone-Overlay');
      Array.from(mapHalftoneGroup.children).forEach(el => halftoneGroupIn.appendChild(el));
      mainGroup.appendChild(halftoneGroupIn);
  }
  
  if(hasOverlays) {
      mainGroup.appendChild(overlayGroupOut);
  }

  // Clear original body and rebuild with structured groups
  const existingDefs = clone.querySelector('defs');
  
  while (clone.firstChild) {
    clone.removeChild(clone.firstChild);
  }
  
  if (existingDefs) clone.appendChild(existingDefs); // Must come before use
  clone.appendChild(mainGroup);
  
  // 5.5 Convert all external images to base64 for offline Illustrator viewing
  const images = Array.from(clone.querySelectorAll('image'));
  for (let img of images) {
    const src = img.getAttribute('href') || img.getAttribute('xlink:href');
    if (src && src.startsWith('http')) {
      try {
        // Use AbortController to enforce a hard 3-second timeout per image
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(src, { signal: controller.signal, mode: 'cors' });
        clearTimeout(fetchTimeout);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        const base64data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(blob);
        });
        
        img.removeAttribute('href');
        img.setAttribute('xlink:href', base64data);
      } catch (err) {
        console.warn("Skipping image (CORS/timeout):", src);
        img.remove();
      }
    }
  }

  // --- MICROSTOCK MACRO-FLATTENING ENGINE ---
  
  // 1. Expand all <use> symbol instances into raw DOM elements (Fixes Illustrator Symbol Locking)
  const useTags = Array.from(clone.querySelectorAll('use'));
  useTags.forEach(useEl => {
      const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
      if (href && href.startsWith('#')) {
          const targetId = href.substring(1);
          const targetEl = clone.querySelector(`#${targetId}`);
          if (targetEl) {
              const newEl = targetEl.cloneNode(true);
              newEl.removeAttribute('id'); // Strip ID to prevent DOM conflicts on 50+ copies
              
              // Apply <use> explicit x/y translations if they exist
              const x = parseFloat(useEl.getAttribute('x')) || 0;
              const y = parseFloat(useEl.getAttribute('y')) || 0;
              
              let transform = useEl.getAttribute('transform') || '';
              if (x !== 0 || y !== 0) {
                 transform = `translate(${x}, ${y}) ` + transform;
              }
              
              if (transform.trim() !== '') {
                  const existingTransform = newEl.getAttribute('transform') || '';
                  newEl.setAttribute('transform', (transform + ' ' + existingTransform).trim());
              }
              
              // Carry over vital presentation attributes
              ['fill', 'fill-rule', 'stroke', 'stroke-width', 'opacity'].forEach(attr => {
                 if (useEl.hasAttribute(attr)) {
                     newEl.setAttribute(attr, useEl.getAttribute(attr));
                 }
              });
              
              if (useEl.parentNode) {
                  useEl.parentNode.replaceChild(newEl, useEl);
              }
          }
      }
  });

  // 2. Eradicate invisible/empty stock-rejected proxy geometries
  const allShapes = Array.from(clone.querySelectorAll('path, rect, circle, ellipse, polygon, polyline'));
  allShapes.forEach(shape => {
      const fill = shape.getAttribute('fill');
      const stroke = shape.getAttribute('stroke');
      const opacity = shape.getAttribute('opacity');
      const styleDisplay = shape.style.display || shape.getAttribute('display');

      if (styleDisplay === 'none' || String(opacity) === '0') {
          shape.remove();
          return;
      }
      
      // FIX: Only remove shapes with fill='none' (not 'transparent') and no visible stroke.
      // 'transparent' fill is used by clipPath boundary shapes (Radial Halftone outline paths)
      // and stroke-only elements — deleting them causes blank SVG exports.
      // Also skip shapes nested inside <clipPath> — they define clipping regions, not visual shapes.
      if (fill === 'none' && (!stroke || stroke === 'none' || stroke === 'transparent')) {
          if (!shape.closest('clipPath')) {
              shape.remove();
          }
      }
      
      // FIX: Remove transparent-fill outline paths that are NOT inside clipPath.
      // These are the pencil-drawn outlines visible in Radial Halftone mode.
      if (fill === 'transparent' && (!stroke || stroke === 'none' || stroke === 'transparent')) {
          if (!shape.closest('clipPath')) {
              shape.remove();
          }
      }
  });

  // 6. Serialize & Format
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);
  
  // CRITICAL FIX FOR ADOBE ILLUSTRATOR [STEX] ERROR:
  // XMLSerializer injects `xmlns="http://www.w3.org/2000/svg"` into every child node if it feels like it.
  // Illustrator instantly crashes when child nodes have `xmlns` declarations.
  // We globally strip ALL namespace declarations EXCEPT on the root <svg> tag.
  svgString = svgString.replace(/\s+xmlns(:[a-zA-Z0-9-]+)?="[^"]*"/ig, '');

  // Strip other problematic native DOM attributes BUT NEVER strip x and y globally!
  svgString = svgString.replace(/\s+(xml:space|version)="[^"]*"/ig, '');

  // Inject pristine strict Adobe Illustrator standard header to the root <svg> tag
  svgString = svgString.replace(/<svg\s*/i, '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" xml:space="preserve" x="0px" y="0px" ');
  
  // === INJECT XMP METADATA ===
  // Build the Adobe-standard XMP block from the metadata option.
  // We must inject this IMMEDIATELY after the opening <svg> tag for Illustrator to parse it properly.
  if (options.metadata) {
    const xmpBlock = buildXMPMetadataBlock(options.metadata);
    const xmpWithNs = xmpBlock
      .replace('xmlns:x="adobe:ns:meta/"', 'xmlns:x="adobe:ns:meta/"')
      .replace('xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"', 'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"');
    
    // Inject immediately after the <svg ...> tag inside a <metadata> container
    svgString = svgString.replace(/(<svg[^>]*>)/i, `$1\n<metadata id="xmp-metadata">\n${xmpWithNs}\n</metadata>`);
  }

  svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
    '<!-- Generator: Vector Map Generator Premium Edition -->\n' +
    svgString;
    
  return svgString;
}

export function downloadSVGFile(svgString, filename) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Fixed 300 DPI equivalent PNG export
export function generatePNGBlob(svgElement) {
return new Promise((resolve, reject) => {
  if (!svgElement) return reject(new Error("No SVG Element"));

  const scale = 4; // ~300 DPI target based on screen resolution

  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const clone = svgElement.cloneNode(true);
  
  // We must inline any computed styles required for canvas rendering that were stripped or are external
  // For canvas drawing we need actual background if it's not transparent
  if (clone.style.background === 'transparent' || clone.style.background === '') {
     clone.style.background = 'transparent';
  }
  
  // CRITICAL: Remove ALL external <image> elements before Canvas serialization.
  // Cross-origin images (e.g. flagcdn.com) taint the HTML Canvas, which causes
  // canvas.toBlob() to silently NEVER fire its callback — this is the root cause
  // of the infinite "PACKAGING..." hang.
  const externalImages = Array.from(clone.querySelectorAll('image'));
  externalImages.forEach(img => {
    const src = img.getAttribute('href') || img.getAttribute('xlink:href') || '';
    if (src.startsWith('http')) {
      img.remove();
    }
  });
  
  const svgData = new XMLSerializer().serializeToString(clone);
  const img = new Image();

  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const timeoutId = setTimeout(() => {
     reject(new Error("PNG Generation timed out loading SVG data onto Canvas."));
  }, 5000);

  img.onload = () => {
    try {
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        clearTimeout(timeoutId);
        resolve(blob);
      }, 'image/png', 1.0);
    } catch(e) {
      clearTimeout(timeoutId);
      reject(e);
    }
  };

  img.onerror = (err) => {
      clearTimeout(timeoutId);
      reject(err);
  };
  img.src = url;
});
}

// Generates a complete ZIP package including SVG, PNG, and metadata.txt
export async function downloadZIPPackage(svgElement, metadata, baseFilename, svgOptions = {}) {
  if (!svgElement) return;

  const zip = new JSZip();
  const countryName = baseFilename.split('-')[0];
  // Always embed XMP metadata into the exported SVG files
  const opts = { ...svgOptions, metadata };

  // 1. Generate clean SVG strings
  if (metadata.hasLabels === false || metadata.hasLabels === undefined) {
      const svgString = await buildStockReadySVG(svgElement, countryName, { ...opts, stripLabels: false });
      zip.file(`${baseFilename}.svg`, svgString);
  } else {
      const svgWithLabels = await buildStockReadySVG(svgElement, countryName, { ...opts, stripLabels: false });
      zip.file(`${baseFilename}-with-labels.svg`, svgWithLabels);
      
      const svgWithoutLabels = await buildStockReadySVG(svgElement, countryName, { ...opts, stripLabels: true });
      zip.file(`${baseFilename}-no-labels.svg`, svgWithoutLabels);
  }

  // 2. Generate Metadata TXT
  const txtContent = `=== STOCK MARKETPLACE METADATA ===

Title:
${metadata.title}

Keywords (up to 50):
${metadata.keywords}

Description:
${metadata.description}

=== GENERATED BY VECTOR MAP GENERATOR ===`;
  
  zip.file(`${baseFilename}-metadata.txt`, txtContent);

  // 3. Generate PNG Blob
  try {
    const pngBlob = await generatePNGBlob(svgElement);
    zip.file(`${baseFilename}-preview.png`, pngBlob);
  } catch (err) {
    console.error("Failed to generate PNG preview for ZIP:", err);
  }

  // 4. Download ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${baseFilename}-stock-package.zip`);
}
