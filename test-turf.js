const turf = require('@turf/turf');
const fs = require('fs');

const usaRaw = JSON.parse(fs.readFileSync('./public/data/geojson/usa.geojson', 'utf8'));
const features = usaRaw.features.slice(0, 10);
const fc = turf.featureCollection(features);
const dissolved = turf.dissolve(fc);
console.log('Dissolved features length:', dissolved.features.length);
console.log('Types:', dissolved.features.map(f => f.geometry.type));
