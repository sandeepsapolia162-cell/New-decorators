// Update only Portfolio's static cards: remove repeated same-category paths,
// set intrinsic image dimensions, and eagerly load its first 8 cards.
import fs from 'node:fs';
const file='portfolio.html',html=fs.readFileSync(file,'utf8'),data=JSON.parse(fs.readFileSync('audit/image-info.json','utf8'));
const measured=new Map(data.rows.map(r=>[r.url.slice(1).toLowerCase(),r]));
const seen=new Set();let removed=0,index=0;
const card=/<div class="portfolio-item" data-category="([^"]+)">\s*<img src="([^"]+)" alt="([^"]*)" loading="[^"]*" decoding="async" width="[^"]+" height="[^"]+">\s*<div class="portfolio-overlay"><span class="portfolio-category">([^<]*)<\/span><\/div>\s*<\/div>/g;
const updated=html.replace(card,(whole,category,src,alt,label)=>{const normalized=src.replace(/^\.\//,'').toLowerCase(),key=category+'|'+normalized;if(seen.has(key)){removed++;return '';}seen.add(key);const path=src.replace(/^\.\//,'');const info=measured.get(path.toLowerCase());if(!info)throw Error(`Dimensions missing for ${path}`);const loading=index++<8?'eager':'lazy';return `<div class="portfolio-item" data-category="${category}">\n                <img src="${src}" alt="${alt}" loading="${loading}" decoding="async" width="${info.w}" height="${info.h}">\n                <div class="portfolio-overlay"><span class="portfolio-category">${label}</span></div>\n            </div>`;});
if(removed!==44)throw Error(`Expected to remove 44 repeated placements; found ${removed}. File not written.`);
fs.writeFileSync(file,updated);console.log(`Updated portfolio.html: removed ${removed} repeated cards; kept ${index}; added measured dimensions; first 8 eager.`);
