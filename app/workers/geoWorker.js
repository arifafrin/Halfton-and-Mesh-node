import { processGeoData } from '../utils/geoUtils';

self.onmessage = (event) => {
  const { geoData, width, height, padding, colors, styleConfig, includeIslands, msgId } = event.data;
  try {
    const start = performance.now();
    const result = processGeoData(
      geoData, 
      width, 
      height, 
      padding, 
      colors, 
      styleConfig, 
      includeIslands
    );
    const end = performance.now();
    console.log(`[GeoWorker] Processing finished in ${(end - start).toFixed(2)}ms`);
    
    self.postMessage({ msgId, result });
  } catch (error) {
    self.postMessage({ msgId, error: error.message });
  }
};
