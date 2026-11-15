// Creates a small reference-only import; original photos remain static in /images.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd();
const html=fs.readFileSync(path.join(root,'portfolio.html'),'utf8');
const placements=[...html.matchAll(/<div class="portfolio-item" data-category="([^"]+)">\s*<img src="([^"]+)" alt="([^"]*)"/g)];
if(!placements.length)throw new Error('No portfolio placements found in portfolio.html');
const sqlQuote=value=>`'${String(value).replaceAll("'","''")}'`;
const idFor=value=>crypto.createHash('sha256').update(value).digest('hex').slice(0,32);
// Resolve each path segment using the exact spelling stored on disk. Windows
// usually ignores filename case, while Cloudflare's Linux host does not.
function exactDiskPath(url){
  let current=root;
  const exact=[];
  for(const part of url.replaceAll('\\','/').split('/')){
    if(!part||part==='.')continue;
    const names=fs.readdirSync(current);
    const match=names.find(name=>name.toLowerCase()===part.toLowerCase());
    if(!match)throw new Error(`Missing image file (including exact case): ${url}`);
    exact.push(match);
    current=path.join(current,match);
  }
  return exact.join('/');
}
function readDimensions(file){
  const b=fs.readFileSync(path.join(root,file));
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return [b.readUInt32BE(16),b.readUInt32BE(20)];
  if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
    const kind=b.toString('ascii',12,16),o=20;
    if(kind==='VP8X')return [1+b[o+4]+(b[o+5]<<8)+(b[o+6]<<16),1+b[o+7]+(b[o+8]<<8)+(b[o+9]<<16)];
    if(kind==='VP8L'&&b[o]===0x2f)return [1+b[o+1]+((b[o+2]&0x3f)<<8),1+(b[o+2]>>6)+(b[o+3]<<2)+((b[o+4]&15)<<10)];
    if(kind==='VP8 ')for(let i=o;i+9<b.length&&i<o+64;i++)if(b[i]===0x9d&&b[i+1]===1&&b[i+2]===0x2a)return [b.readUInt16LE(i+3)&0x3fff,b.readUInt16LE(i+5)&0x3fff];
  }
  if(b[0]===255&&b[1]===216){let i=2;while(i+4<b.length){if(b[i++]!==255)continue;while(b[i]===255)i++;const marker=b[i++],len=b.readUInt16BE(i);if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return [b.readUInt16BE(i+5),b.readUInt16BE(i+3)];if(marker===217||marker===218)break;i+=len;}}
  throw new Error(`Could not extract dimensions from ${file}`);
}
// Preserve IDs and generated titles from the earlier import, which used these
// names from the HTML before their case was corrected to match the disk files.
const legacyPathFor=new Map([
  ['images/front-gate/img_20251016_181847.webp','images/front-gate/IMG_20251016_181847.webp'],
  ['images/front-gate/img_20251026_154722.webp','images/front-gate/IMG_20251026_154722.webp'],
  ['images/front-gate/img_20260129_180521.webp','images/front-gate/IMG_20260129_180521.webp'],
  ['images/front-gate/img_20260207_193133.webp','images/front-gate/IMG_20260207_193133.webp'],
  ['images/front-gate/screenshot_20260911-182823.webp','images/front-gate/Screenshot_20260911-182823.webp'],
  ['images/ceiling/img_20251013_204113.webp','images/ceiling/IMG_20251013_204113.webp'],
  ['images/ceiling/img_20251016_174557.webp','images/ceiling/IMG_20251016_174557.webp'],
  ['images/ceiling/screenshot_20221016-122602_whatsapp.webp','images/ceiling/Screenshot_20221016-122602_WhatsApp.webp'],
  ['images/ceiling/screenshot_20260911-182918.webp','images/ceiling/Screenshot_20260911-182918.webp'],
  ['images/indoor/img_20251014_105437.webp','images/indoor/IMG_20251014_105437.webp'],
  ['images/indoor/img_20251014_105444.webp','images/indoor/IMG_20251014_105444.webp'],
  ['images/indoor/img_20260330_082003.webp','images/indoor/IMG_20260330_082003.webp'],
  ['images/indoor/screenshot_20260911-151719.webp','images/indoor/Screenshot_20260911-151719.webp'],
  ['images/front-gate/img_20251025_143020.webp','images/front-gate/IMG_20251025_143020.webp'],
  ['images/ceiling/img_20251001_150047.webp','images/ceiling/IMG_20251001_150047.webp'],
  ['images/ceiling/img_20251014_120057.webp','images/ceiling/IMG_20251014_120057.webp'],
  ['images/indoor/img_20251001_150047.webp','images/indoor/IMG_20251001_150047.webp'],
  ['images/indoor/img_20260207_193152.webp','images/indoor/IMG_20260207_193152.webp'],
]);
const categories=[...new Set(placements.map(p=>p[1]))];
let sql='-- Static media references only. No original image bytes are copied into D1.\n';
categories.forEach((name,index)=>sql+=`INSERT OR IGNORE INTO categories(id,name,sort_order) VALUES(${sqlQuote(idFor('category:'+name))},${sqlQuote(name)},${index});\n`);
const seen=new Set(),seenPlacements=new Set();let order=0;
for(let index=0;index<placements.length;index++){
  const [,category,src,alt]=placements[index];
  const sourceUrl=src.replaceAll('\\','/');
  if(!/^images\/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g)$/i.test(sourceUrl)||sourceUrl.split('/').includes('..'))throw new Error(`Unsafe image reference: ${src}`);
  const url=exactDiskPath(sourceUrl);
  seen.add(url);
  const placementKey=`${category}\n${url}`;
  if(seenPlacements.has(placementKey))continue;
  seenPlacements.add(placementKey);
  const basename=path.basename(url,path.extname(url)).replaceAll('_',' ');
  const id=idFor(`static:${category}:${url}`);
  const mime=path.extname(url).toLowerCase()==='.png'?'image/png':path.extname(url).toLowerCase()==='.webp'?'image/webp':'image/jpeg';
  const [width,height]=readDimensions(url);
  const categoryId=idFor('category:'+category),external='/'+url;
  // Update an existing placement by its category and path; insert only when absent.
  sql+=`UPDATE media SET external_url=${sqlQuote(external)},mime_type='${mime}',width=${width},height=${height},sort_order=${order} WHERE source='static' AND category_id=${sqlQuote(categoryId)} AND external_url=${sqlQuote(external)};\n`;
  sql+=`INSERT INTO media(id,type,title,alt_text,category_id,source,external_url,mime_type,size_bytes,width,height,sort_order,is_visible) SELECT ${sqlQuote(id)},'image',${sqlQuote(basename)},${sqlQuote(alt)},${sqlQuote(categoryId)},'static',${sqlQuote(external)},'${mime}',0,${width},${height},${order},1 WHERE NOT EXISTS(SELECT 1 FROM media WHERE source='static' AND category_id=${sqlQuote(categoryId)} AND external_url=${sqlQuote(external)});\n`;
  order++;
}
const out=path.join(root,'seed-media.sql');fs.writeFileSync(out,sql,'utf8');
console.log(`Created ${out}: ${seenPlacements.size} deduplicated placements, ${seen.size} distinct image files, ${Buffer.byteLength(sql)} bytes. Dimensions included; no image files copied.`);
