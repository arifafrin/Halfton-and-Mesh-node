/**
 * GeoJSON to SVG utilities using d3-geo for accurate projection and path generation.
 * Includes special USA inset handling for Alaska (bottom-left) and Hawaii (bottom-center).
 */

import { geoMercator, geoPath, geoCentroid, geoArea, geoNaturalEarth1 } from 'd3-geo';
import { simplify as turfSimplify } from '@turf/turf';
import { topology } from 'topojson-server';
import { mesh as topoMesh } from 'topojson-client';

function mergePolygons(features) {
  if (!features || features.length === 0) return features;
  try {
    const geojson = { type: 'FeatureCollection', features };
    // Convert GeoJSON to Topology (automatically identifying shared arcs)
    // 1e4 Quantization snaps microscopic coordinate gaps together so states perfectly share borders
    const topo = topology({ collection: geojson }, 1e4);
    // Mesh extracts exactly the exterior boundaries (arcs only belonging to one shape)
    const exteriorMesh = topoMesh(topo, topo.objects.collection, (a, b) => a === b);
    
    return [{
      type: 'Feature',
      properties: { name: 'Exterior Boundary' },
      geometry: exteriorMesh
    }];
  } catch(e) {
    console.warn('TopoJSON merge failed', e);
    return features;
  }
}

// Names used to detect Alaska and Hawaii features
const ALASKA_NAMES = ['Alaska'];
const HAWAII_NAMES = ['Hawaii'];

function isAlaska(feature) {
  const name = feature.properties?.name || feature.properties?.NAME || '';
  return ALASKA_NAMES.includes(name);
}

function isHawaii(feature) {
  const name = feature.properties?.name || feature.properties?.NAME || '';
  return HAWAII_NAMES.includes(name);
}

/**
 * Calculate the geographic area of a feature using d3's spherical area.
 * Returns area in steradians (can compare relative sizes).
 */
export function featureArea(feature) {
  try {
    return geoArea(feature);
  } catch (e) {
    return 0;
  }
}

/**
 * For MultiPolygon features, remove extremely small sub-polygons
 * that cause scattered dots. Keeps sub-polygons above the area threshold.
 */
function cleanMultiPolygon(feature, minAreaFraction = 0.001) {
  if (!feature.geometry || feature.geometry.type !== 'MultiPolygon') return feature;
  
  const polygons = feature.geometry.coordinates;
  if (polygons.length <= 1) return feature;

  // Utilize a fast Cartesian Bounding Box Area approach.
  // This physically calculates the pixel visual footprint, perfectly bypassing 
  // d3-geo's Spherical Math bugs on Antimeridian shapes (like the Aleutian Islands).
  const polygonAreas = polygons.map((coords, i) => {
    const ring = coords[0];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let j = 0; j < ring.length; j++) {
      const x = ring[j][0];
      const y = ring[j][1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    // Extremely safe generic Cartesian area footprint
    const area = (maxX - minX) * (maxY - minY);
    return { index: i, area, coords };
  });

  // Find the largest sub-polygon's footprint
  const maxArea = Math.max(...polygonAreas.map(p => p.area));
  if (maxArea === 0) return feature;

  // Keep polygons that are visually significant (at least minAreaFraction of the mainland)
  const filtered = polygonAreas.filter(p => p.area >= maxArea * minAreaFraction);

  if (filtered.length === 0) return feature; // Safety fallback

  return {
    ...feature,
    geometry: {
      type: filtered.length === 1 ? 'Polygon' : 'MultiPolygon',
      coordinates: filtered.length === 1 ? filtered[0].coords : filtered.map(p => p.coords),
    }
  };
}

/**
 * For non-USA countries: single projection fitted to canvas.
 */
function createSimpleProjection(geoData, width, height, padding = 40) {
  const center = geoCentroid(geoData);
  
  // Use fitExtent to explicitly define the bounding box including padding
  // We rotate the map so the dateline doesn't intersect scaling calculations
  const projection = geoMercator()
    .rotate([-center[0], 0])
    .fitExtent([
      [padding, padding], 
      [width - padding, height - padding]
    ], geoData);

  return projection;
}

/**
 * For USA: creates three separate projections for mainland, Alaska inset, and Hawaii inset.
 */
function createUSAProjections(features, width, height, padding = 40) {
  const mainlandFeatures = features.filter(f => !isAlaska(f) && !isHawaii(f));
  const alaskaFeatures = features.filter(f => isAlaska(f));
  const hawaiiFeatures = features.filter(f => isHawaii(f));

  const mainlandCollection = { type: 'FeatureCollection', features: mainlandFeatures };

  // Usable height inside padding
  const usableHeight = height - (padding * 2);
  
  // 1. Shift composition up to create a title-safe bottom margin
  // Mainland gets upper 75% of usable space
  const mainlandHeight = usableHeight * 0.75; 
  
  const mainlandProjection = geoMercator()
    .fitExtent([
      [padding, padding], 
      [width - padding, padding + mainlandHeight]
    ], mainlandCollection);

  // 2. Alaska inset: bottom-left of mainland
  let alaskaProjection = null;
  if (alaskaFeatures.length > 0) {
    const alaskaCollection = { type: 'FeatureCollection', features: alaskaFeatures };
    alaskaProjection = geoMercator()
      .fitExtent(
        [
          [padding, padding + mainlandHeight + 10], 
          [padding + ((width - padding * 2) * 0.35), height - padding - 20]
        ],
        alaskaCollection
      );
  }

  // 3. Hawaii inset: below mainland (center-left)
  let hawaiiProjection = null;
  if (hawaiiFeatures.length > 0) {
    const hawaiiCollection = { type: 'FeatureCollection', features: hawaiiFeatures };
    hawaiiProjection = geoMercator()
      .fitExtent(
        [
          [padding + ((width - padding * 2) * 0.38), padding + mainlandHeight + (usableHeight * 0.1)], 
          [padding + ((width - padding * 2) * 0.55), height - padding - 10]
        ],
        hawaiiCollection
      );
  }

  return {
    mainland: mainlandProjection,
    alaska: alaskaProjection,
    hawaii: hawaiiProjection,
    mainlandFeatures,
    alaskaFeatures,
    hawaiiFeatures,
  };
}

/**
 * Detects if a FeatureCollection is USA data.
 */
function isUSAData(features) {
  const names = features.map(f => (f.properties?.name || f.properties?.NAME || '').toLowerCase());
  return names.includes('alaska') && names.includes('hawaii') && features.length >= 40;
}

/**
 * Detects if a FeatureCollection is the full World Map.
 */
function isWorldData(features) {
  return features.length > 100 && !isUSAData(features);
}

/**
 * Main entry: processes GeoJSON into renderable path data.
 */
export function processGeoData(geoData, width, height, padding = 40, colors = [], styleConfig = {}, includeIslands = true) {
  if (!geoData || !geoData.features || geoData.features.length === 0) {
    return { groups: [], debugBounds: null };
  }

  const isUSA = isUSAData(geoData.features);
  const rawFeatures = geoData.features;

  if (isWorldData(rawFeatures)) {
    return processWorldMap(rawFeatures, width, height, padding, colors, styleConfig, includeIslands);
  } else if (isUSA) {
    return processUSA(rawFeatures, width, height, padding, colors, styleConfig, includeIslands);
  } else {
    return processStandard(rawFeatures, width, height, padding, colors, styleConfig, includeIslands);
  }
}

function processWorldMap(features, width, height, padding, colors, styleConfig, includeIslands) {
  if (styleConfig.isExteriorOnly) {
    features = mergePolygons(features);
  }
  features = simplifyFeatures(features, false, styleConfig.isExteriorOnly, includeIslands);
  if (features.length === 0) return { groups: [], debugBounds: null };

  const featureCollection = { type: 'FeatureCollection', features };
  
  // geoNaturalEarth1 provides a much better looking global projection than Mercator
  const projection = geoNaturalEarth1()
    .fitExtent([
      [padding, padding], 
      [width - padding, height - padding]
    ], featureCollection);
    
  const pathGen = geoPath().projection(projection);
  const bounds = pathGen.bounds(featureCollection);

  const debugBounds = {
    minX: bounds[0][0], minY: bounds[0][1],
    maxX: bounds[1][0], maxY: bounds[1][1],
    centerX: (bounds[0][0] + bounds[1][0]) / 2,
    centerY: (bounds[0][1] + bounds[1][1]) / 2,
  };

  const paths = features.map((feature, index) => ({
    d: pathGen(feature),
    name: getFeatureName(feature, index),
    id: getFeatureId(feature, index),
    index,
    fillColor: getColor(index, colors, styleConfig),
    centroid: getProjectedCentroid(feature, projection),
  }));

  return {
    groups: [{ id: 'world', label: 'World Map', paths }],
    debugBounds,
  };
}

function processStandard(features, width, height, padding, colors, styleConfig, includeIslands) {
  if (styleConfig.isExteriorOnly) {
    features = mergePolygons(features);
  }
  features = simplifyFeatures(features, false, styleConfig.isExteriorOnly, includeIslands);
  if (features.length === 0) return { groups: [], debugBounds: null };

  const featureCollection = { type: 'FeatureCollection', features };
  const projection = createSimpleProjection(featureCollection, width, height, padding);
  const pathGen = geoPath().projection(projection);

  const bounds = pathGen.bounds(featureCollection);
  const mathCenterX = (bounds[0][0] + bounds[1][0]) / 2;
  const mathCenterY = (bounds[0][1] + bounds[1][1]) / 2;
  
  // 1. Adaptive Visual Centering (Horizontal Bias Correction)
  // Calculate true geographic centroid of the collection
  const geoCenter = geoCentroid(featureCollection); 
  const visualCenterPoint = projection(geoCenter); // The visual "weight" center
  
  // If the visual center is significantly different from the mathematical center, 
  // it means the country has an irregular shape (e.g. Bangladesh east extension).
  // We apply a soft 50% correction shift to balance it visually.
  let visualOffsetX = 0;
  let visualOffsetY = 0;
  
  if (visualCenterPoint && !isNaN(visualCenterPoint[0])) {
    const diffX = mathCenterX - visualCenterPoint[0];
    const diffY = mathCenterY - visualCenterPoint[1];
    visualOffsetX = diffX * 0.5; // Soften the correction so it's not jarring
    visualOffsetY = diffY * 0.5;
  }

  const debugBounds = {
    minX: bounds[0][0] + visualOffsetX, minY: bounds[0][1] + visualOffsetY,
    maxX: bounds[1][0] + visualOffsetX, maxY: bounds[1][1] + visualOffsetY,
    centerX: mathCenterX + visualOffsetX,
    centerY: mathCenterY + visualOffsetY,
  };

  const paths = features.map((feature, index) => {
    // Generate original path string
    let d = pathGen(feature);
    
    // Calculate un-offset centroid for labels
    const rawCentroid = getProjectedCentroid(feature, projection);
    
    // Apply the visual offset directly to the label coordinate
    const correctedCentroid = rawCentroid ? {
      x: rawCentroid.x + visualOffsetX,
      y: rawCentroid.y + visualOffsetY
    } : null;

    return {
      d,
      name: getFeatureName(feature, index),
      id: getFeatureId(feature, index),
      index,
      fillColor: getColor(index, colors, styleConfig),
      centroid: correctedCentroid,
    };
  });

  return {
    groups: [{ 
      id: 'country', 
      label: 'Country', 
      paths,
      // Pass the group offset so MapPreview can translate the <g> tag
      transform: `translate(${visualOffsetX}, ${visualOffsetY})`
    }],
    debugBounds,
  };
}

function processUSA(features, width, height, padding, colors, styleConfig, includeIslands) {
  const projections = createUSAProjections(features, width, height, padding);

  const makePathsForGroup = (groupFeatures, projection, globalIndexStart) => {
    if (styleConfig.isExteriorOnly && groupFeatures.length > 0) {
      groupFeatures = mergePolygons(groupFeatures);
    }
    
    groupFeatures = simplifyFeatures(groupFeatures, true, styleConfig.isExteriorOnly, includeIslands);
    
    const pathGen = geoPath().projection(projection);
    return groupFeatures.map((feature, localIndex) => {
      const globalIndex = globalIndexStart + localIndex;
      return {
        d: pathGen(feature),
        name: getFeatureName(feature, globalIndex),
        id: getFeatureId(feature, globalIndex),
        index: globalIndex,
        fillColor: getColor(globalIndex, colors, styleConfig),
        centroid: getProjectedCentroid(feature, projection),
      };
    });
  };

  const groups = [];
  let idx = 0;

  const mainlandPaths = makePathsForGroup(projections.mainlandFeatures, projections.mainland, idx);
  groups.push({ id: 'mainland', label: 'Mainland', paths: mainlandPaths });
  idx += projections.mainlandFeatures.length;

  if (projections.alaska && projections.alaskaFeatures.length > 0) {
    const alaskaPaths = makePathsForGroup(projections.alaskaFeatures, projections.alaska, idx);
    groups.push({ id: 'alaska', label: 'Alaska', paths: alaskaPaths });
    idx += projections.alaskaFeatures.length;
  }

  if (projections.hawaii && projections.hawaiiFeatures.length > 0) {
    const hawaiiPaths = makePathsForGroup(projections.hawaiiFeatures, projections.hawaii, idx);
    groups.push({ id: 'hawaii', label: 'Hawaii', paths: hawaiiPaths });
    idx += projections.hawaiiFeatures.length;
  }

  const mainPathGen = geoPath().projection(projections.mainland);
  const mainBounds = mainPathGen.bounds({ type: 'FeatureCollection', features: projections.mainlandFeatures });
  const debugBounds = {
    minX: mainBounds[0][0], minY: mainBounds[0][1],
    maxX: mainBounds[1][0], maxY: mainBounds[1][1],
    centerX: (mainBounds[0][0] + mainBounds[1][0]) / 2,
    centerY: (mainBounds[0][1] + mainBounds[1][1]) / 2,
  };

  return { groups, debugBounds };
}

// --- Utility helpers ---

function getFeatureName(feature, index) {
  return feature.properties?.name || 
         feature.properties?.NAME || 
         feature.properties?.admin ||
         feature.properties?.NAME_1 || 
         `Region ${index + 1}`;
}

function getFeatureId(feature, index) {
  return feature.properties?.postal || 
         feature.properties?.iso_a2 || 
         feature.properties?.adm1_code || 
         `region-${index}`;
}

function getColor(index, colors, styleConfig) {
  if (styleConfig.isOutlineOnly || styleConfig.isExteriorOnly) return 'transparent';
  if (styleConfig.id === 'silhouette') return '#000000';
  
  if (!colors || colors.length === 0) {
     return (styleConfig.regionColors || [])[index % (styleConfig.regionColors || []).length] || '#cccccc';
  }
  return colors[index % colors.length];
}

function getProjectedCentroid(feature, projection) {
  if (!feature || !feature.geometry) return null;
  try {
    const center = geoCentroid(feature);
    if (!isFinite(center[0]) || !isFinite(center[1])) return null;
    const projected = projection(center);
    if (!projected || !isFinite(projected[0]) || !isFinite(projected[1])) return null;
    return { x: projected[0], y: projected[1] };
  } catch (e) {
    return null;
  }
}

/**
 * Filter and clean features:
 * 1. Only keep geometric types (and Lines if allowed)
 * 2. Clean MultiPolygons by removing tiny scattered sub-polygons
 */
export function simplifyFeatures(features, isUSA = false, allowLines = false, includeIslands = true) {
  // Step 1: Always filter to valid geometry types only
  let cleanedFeatures = features.filter(f => {
    if (!f.geometry) return false;
    if (allowLines && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')) return true;
    return f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon';
  });

  // STOCK QUALITY MODE: When includeIslands=true, return ORIGINAL Natural Earth geometry
  // No area filtering, no Turf simplification — 100% geographic fidelity for buyers
  if (includeIslands) {
    return cleanedFeatures;
  }

  // ABSTRACT MODE: When includeIslands=false, clean up small islands and simplify coastlines
  const threshold = isUSA ? 0.03 : 0.015;
  
  cleanedFeatures = cleanedFeatures.map(f => {
    if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
      return cleanMultiPolygon(f, threshold);
    }
    return f;
  });
    
  // Smooth jagged coastlines with Douglas-Peucker (only in abstract mode)
  const simplifyTolerance = isUSA ? 0.025 : 0.01;
  
  try {
     const simplifiedFeatures = cleanedFeatures.map(f => {
         // Turf.js breaks features that cross the 180-degree antimeridian
         if (isAlaska(f) || isHawaii(f)) return f;
         
         const featCol = { type: 'FeatureCollection', features: [f] };
         return turfSimplify(featCol, { tolerance: simplifyTolerance, highQuality: true }).features[0];
     });
     return simplifiedFeatures;
  } catch(e) {
     console.warn("Turf simplification failed, falling back to raw paths", e);
     return cleanedFeatures;
  }
}
