import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import countriesList from '../../data/countries';

/**
 * API route to fetch GeoJSON data for a given country code.
 * 
 * Loading priority:
 *   1. Local admin-1 file (high-detail states/provinces) — public/geojson/{CODE}.geojson
 *   2. Global Natural Earth 110m dataset (country outline) — public/geojson/ne_110m_countries.geojson
 *   3. CDN fallback for admin-1 data — Natural Earth 10m on GitHub
 */

let globalDatasetCache = null;
let admin1CDNCache = null;

function loadGlobalDataset() {
  if (globalDatasetCache) return globalDatasetCache;
  
  try {
    const filePath = path.join(process.cwd(), 'public', 'geojson', 'ne_110m_countries.geojson');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      globalDatasetCache = JSON.parse(raw);
      console.log(`[GeoJSON API] Loaded global 110m dataset (${globalDatasetCache.features.length} countries)`);
      return globalDatasetCache;
    }
  } catch (err) {
    console.error('[GeoJSON API] Failed to load global dataset:', err.message);
  }
  return null;
}

function filterCountryFromGlobal(dataset, code) {
  if (!dataset) return null;
  
  const features = dataset.features.filter(f => {
    const p = f.properties;
    return p.ISO_A3 === code || p.ADM0_A3 === code || p.ISO_A2 === code;
  });

  if (features.length === 0) return null;
  return { type: 'FeatureCollection', features };
}

async function fetchAdmin1FromCDN(code) {
  try {
    if (!admin1CDNCache) {
      console.log(`[GeoJSON API] Fetching admin-1 dataset from CDN...`);
      const res = await fetch(
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson',
        { next: { revalidate: 86400 } }
      );
      if (!res.ok) throw new Error(`CDN ${res.status}`);
      admin1CDNCache = await res.json();
    }

    const features = admin1CDNCache.features.filter(f => {
      const p = f.properties;
      return p.adm0_a3 === code || p.iso_a2 === code || p.gu_a3 === code;
    });

    if (features.length === 0) return null;

    // Cache locally for speed next time
    try {
      const localPath = path.join(process.cwd(), 'public', 'geojson', `${code}.geojson`);
      const geoJson = { type: 'FeatureCollection', features };
      fs.writeFileSync(localPath, JSON.stringify(geoJson));
      console.log(`[GeoJSON API] Cached admin-1 for ${code} locally`);
    } catch (e) { /* ignore write errors */ }

    return { type: 'FeatureCollection', features };
  } catch (err) {
    console.error(`[GeoJSON API] CDN admin-1 fetch failed:`, err.message);
    return null;
  }
}

function validateGeoJSON(data) {
  return data && data.type === 'FeatureCollection' && Array.isArray(data.features) && data.features.length > 0;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const detail = searchParams.get('detail'); // 'admin1' to force subdivision level

  if (!code) {
    return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
  }

  try {
    // 0. World Map fast-path
    if (code === 'WLD') {
       const globalData = loadGlobalDataset();
       if (globalData && validateGeoJSON(globalData)) {
         console.log(`[GeoJSON API] ✓ WLD requested, returning full world map (${globalData.features.length} countries)`);
         return NextResponse.json(globalData);
       }
    }

    // 0.5 Continent fast-path
    const continentMap = {
      'AFR': 'Africa',
      'ASI': 'Asia',
      'EUR': 'Europe',
      'NOA': 'North America',
      'SAM': 'South America',
      'OCE': 'Oceania'
    };

    if (continentMap[code]) {
       const globalData = loadGlobalDataset();
       if (globalData && validateGeoJSON(globalData)) {
           const targetContinent = continentMap[code];
           // Find all ISO codes that belong to this continent from our trusted list
           const validCodes = countriesList.filter(c => c.continent === targetContinent).map(c => c.code);
           
           const features = globalData.features.filter(f => {
              const p = f.properties;
              return validCodes.includes(p.ISO_A3) || validCodes.includes(p.ADM0_A3);
           });
           
           if (features.length > 0) {
              console.log(`[GeoJSON API] ✓ Continent ${targetContinent} requested, returning ${features.length} countries`);
              return NextResponse.json({ type: 'FeatureCollection', features });
           }
       }
    }

    // Handle pseudo-countries (UK constituents)
    const ukConstituents = {
      'ENG': 'England',
      'SCT': 'Scotland',
      'WLS': 'Wales',
      'NIR': 'Northern Ireland'
    };

    let targetCode = code;
    let filterGeonunit = null;
    
    if (ukConstituents[code]) {
      targetCode = 'GBR';
      filterGeonunit = ukConstituents[code];
    }

    const pseudoFilter = (data) => {
      if (!filterGeonunit) return data;
      const filteredFeatures = data.features.filter(f => f.properties.geonunit === filterGeonunit);
      if (filteredFeatures.length === 0) return null;
      return { type: 'FeatureCollection', features: filteredFeatures };
    };

    // 1. Try local admin-1 file (high detail: states/provinces)
    const localAdmin1 = path.join(process.cwd(), 'public', 'geojson', `${targetCode}.geojson`);
    if (fs.existsSync(localAdmin1)) {
      const parsedData = JSON.parse(fs.readFileSync(localAdmin1, 'utf8'));
      const data = pseudoFilter(parsedData);
      if (validateGeoJSON(data)) {
        console.log(`[GeoJSON API] ✓ ${code} from local admin-1 (${data.features.length} regions)`);
        return NextResponse.json(data);
      }
    }

    // 2. Try CDN for admin-1 data (subdivisions)
    const cdnAdmin1Raw = await fetchAdmin1FromCDN(targetCode);
    const cdnAdmin1 = pseudoFilter(cdnAdmin1Raw);
    if (cdnAdmin1 && validateGeoJSON(cdnAdmin1)) {
      console.log(`[GeoJSON API] ✓ ${code} from CDN admin-1 (${cdnAdmin1.features.length} regions)`);
      return NextResponse.json(cdnAdmin1);
    }

    // 3. Fall back to global 110m outline (country border only, 1 feature)
    // Note: Global dataset doesn't have internal subdivisions, so pseudo-filters won't work well here
    if (!filterGeonunit) {
      const globalData = loadGlobalDataset();
      const countryOutline = filterCountryFromGlobal(globalData, targetCode);
      if (countryOutline && validateGeoJSON(countryOutline)) {
        console.log(`[GeoJSON API] ✓ ${code} from 110m global outline (${countryOutline.features.length} features)`);
        return NextResponse.json(countryOutline);
      }
    }

    // 4. Nothing found
    return NextResponse.json({ 
      error: `Map data unavailable for "${code}". This country may not exist in our datasets.` 
    }, { status: 404 });

  } catch (error) {
    console.error(`[GeoJSON API] Error for ${code}:`, error);
    return NextResponse.json({ error: 'Failed to load map data. Please try again.' }, { status: 500 });
  }
}
