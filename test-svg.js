const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <div id="root">
    <svg id="test-map" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg" style="background: rgb(255, 255, 255);">
      <defs>
        <clipPath id="global-flag-clip"><circle cx="0" cy="0" r="4.8"></circle></clipPath>
      </defs>
      <g id="map-regions">
         <g id="region-group-0"><path id="test-path" d="M0 0 L10 10" fill="#ff0000" stroke="#000000"></path></g>
      </g>
      <g id="map-region-pins">
         <g id="location-pin-0" transform="translate(10, 10)">
            <g transform="scale(1.5)">
               <path d="M0,16 C-8,8 -8,0 -8,0 A8,8 0 0,1 0,-8 A8,8 0 0,1 8,0 C8,0 8,8 0,16 Z" fill="#ef4444"></path>
               <g clipPath="url(#global-flag-clip)">
                 <!-- Inject FlagCDN sample -->
                 <g transform="translate(-10, -10) scale(1.5)">
                   <path fill="#b31942" d="M0 0h7410v3900H0"/>
                   <g fill="#FFF">
                     <g id="d"><path id="a" d="m247 90 70.534 217.082"/><use xlink:href="#a" y="420"/></g>
                     <use xlink:href="#d" x="988"/>
                   </g>
                 </g>
               </g>
            </g>
         </g>
      </g>
    </svg>
  </div>
</body></html>`);

global.document = dom.window.document;
global.window = dom.window;
global.XMLSerializer = dom.window.XMLSerializer;
global.Element = dom.window.Element;
global.fetch = async () => ({ blob: async () => new Blob() });

async function run() {
  const { buildStockReadySVG } = require('./app/utils/svgExport.js');
  
  const svgEl = document.getElementById('test-map');
  try {
    const output = await buildStockReadySVG(svgEl, 'USA', { stripLabels: false, bgMode: 'style-default', style: 'colorful' });
    fs.writeFileSync('./debug-output.svg', output);
    console.log("SUCCESS. Check debug-output.svg");
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();
