const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const geo = JSON.parse(data);
      console.log(`Loaded ${geo.features.length} features globally.`);
      
      const filterCountry = (isoA2, isoA3, adminName, outFile) => {
        const features = geo.features.filter(f => {
          const p = f.properties;
          return p.iso_a2 === isoA2 || p.adm0_a3 === isoA3 || p.admin === adminName;
        });
        
        fs.writeFileSync(outFile, JSON.stringify({
          type: 'FeatureCollection',
          features: features
        }));
        console.log(`Saved ${features.length} features to ${outFile}`);
      };
      
      filterCountry('BD', 'BGD', 'Bangladesh', 'public/geojson/BGD.geojson');
      filterCountry('US', 'USA', 'United States of America', 'public/geojson/USA.geojson');
      filterCountry('JP', 'JPN', 'Japan', 'public/geojson/JPN.geojson');
      
    } catch(e) {
      console.error(e);
    }
  });
}).on('error', console.error);
