/**
 * Premium Advanced Color & Style Utility for Drawing Studio
 */

// Generative AI-like Palettes (Theme presets)
export const aiColorThemes = {
  vibrant: ['#FF006E', '#8338EC', '#3A86FF', '#00FF88', '#FFBE0B', '#FB5607', '#06D6A0', '#118AB2'],
  pastel: ['#FFB5A7', '#FCD5CE', '#F8EDEB', '#F9DCC4', '#FEC89A', '#E2ECE9', '#B5E2FA', '#C1D3FE'],
  monochrome: ['#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC'],
  neon: ['#00ffcc', '#ff00ff', '#00ffff', '#ffff00', '#ff0055', '#9900ff', '#0033cc', '#ff99cc']
};

/**
 * Advanced Styles Dictionary
 */
export const mapStyles = {
  pencilbasic: {
    id: 'pencilbasic', name: 'Flat Outline', icon: '📝',
    background: '#0a0a0f',
    stroke: '#ffffff', strokeWidth: 2,
    fontColor: '#ffffff', fontFamily: 'Courier New, monospace',
    isPencil: true,
    regionColors: ['transparent'],
  },
  pencilmesh: {
    id: 'pencilmesh', name: 'Gradient Mesh', icon: '✏️',
    background: '#ffffff',
    stroke: '#e5e7eb', strokeWidth: 1.5,
    fontColor: '#111111', fontFamily: 'Courier New, monospace',
    isNeuralMesh: true,
    isOutlineOnly: true,
    isPencil: true,
    regionColors: aiColorThemes.vibrant,
  },
  pencilnetwork: {
    id: 'pencilnetwork', name: 'Halftone Matrix', icon: '✍️',
    background: '#040b16',
    stroke: 'none', strokeWidth: 0,
    fontColor: '#ffffff', fontFamily: 'Courier New, monospace',
    isDotted: true,
    isNetwork: true,
    isPencil: true,
    regionColors: ['#ff4500', '#ff6a00', '#ff8c00', '#ffa500', '#ff7f50', '#ffb380'],
  },
  pencilradial: {
    id: 'pencilradial', name: 'Radial Halftone', icon: '🎯',
    background: '#040b16',
    stroke: 'none', strokeWidth: 0,
    fontColor: '#ffffff', fontFamily: 'Courier New, monospace',
    isRadialDotted: true,
    isNetwork: true,
    isPencil: true,
    regionColors: ['#00e5ff', '#0077ff', '#6600ff'],
  },
};

// Generates a 6-step color palette blending from a base hex towards a bright glow
export function generateMonochromaticPalette(baseHex, count = 6) {
  if (!baseHex || !baseHex.startsWith('#')) return Array(count).fill('#ffffff');
  const hex = baseHex.replace('#', '');
  if (hex.length !== 6) return Array(count).fill(baseHex);
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  let rRatio = r / 255, gRatio = g / 255, bRatio = b / 255;
  let max = Math.max(rRatio, gRatio, bRatio), min = Math.min(rRatio, gRatio, bRatio);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rRatio: h = (gRatio - bRatio) / d + (gRatio < bRatio ? 6 : 0); break;
      case gRatio: h = (bRatio - rRatio) / d + 2; break;
      case bRatio: h = (rRatio - gRatio) / d + 4; break;
    }
    h *= 60;
  }
  s *= 100; l *= 100;

  const colors = [];
  for (let i = 0; i < count; i++) {
    const factor = i / (count - 1 || 1);
    
    // Instead of turning black or white, we employ a Premium Generative Art trick:
    // Analagous Hue Shifting! We shift Hue by 45 degrees and keep Lightness high.
    let newL = Math.max(5, l - (factor * 12)); 
    let newS = Math.min(100, s + (factor * 15));
    let newH = (h + (factor * 45)) % 360;
    
    colors.push(hslToHex(newH, newS, newL));
  }
  return colors;
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateRandomPalette(count = 9) {
  const baseHue = Math.random() * 360;
  const colors = [];
  for (let i = 0; i < count; i++) {
    const h = (baseHue + (i * (360 / count))) % 360;
    const s = 60 + Math.random() * 40; 
    const l = 40 + Math.random() * 30; 
    colors.push(hslToHex(h, s, l));
  }
  return colors;
}

export function getBeautifulRandomMapCombo() {
  const styleKeys = Object.keys(mapStyles);
  const randomStyle = styleKeys[Math.floor(Math.random() * styleKeys.length)];
  const randomPaletteType = ['theme-vibrant', 'theme-pastel', 'random'][Math.floor(Math.random() * 3)];
  return { style: randomStyle, colorMode: randomPaletteType };
}
