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
const seen=new Set();
for(let index=0;index<placements.length;index++){
  const [,category,src,alt]=placements[index];
  const sourceUrl=src.replaceAll('\\','/');
  if(!/^images\/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g)$/i.test(sourceUrl)||sourceUrl.split('/').includes('..'))throw new Error(`Unsafe image reference: ${src}`);
  const url=exactDiskPath(sourceUrl);
  seen.add(url);
  const legacyIdentityPath=legacyPathFor.get(url)||url;
  const basename=path.basename(legacyIdentityPath,path.extname(legacyIdentityPath)).replaceAll('_',' ');
  const id=idFor(`placement:${index}:${legacyIdentityPath}`);
  const mime=path.extname(url).toLowerCase()==='.png'?'image/png':path.extname(url).toLowerCase()==='.webp'?'image/webp':'image/jpeg';
  // Refresh paths for rows imported by the earlier seed without changing their IDs.
  sql+=`UPDATE media SET external_url=${sqlQuote('/'+url)},mime_type='${mime}' WHERE id=${sqlQuote(id)} AND source='static';\n`;
  sql+=`INSERT OR IGNORE INTO media(id,type,title,alt_text,category_id,source,external_url,mime_type,size_bytes,sort_order,is_visible) VALUES(${sqlQuote(id)},'image',${sqlQuote(basename)},${sqlQuote(alt)},${sqlQuote(idFor('category:'+category))},'static',${sqlQuote('/'+url)},'${mime}',0,${index},1);\n`;
}
const out=path.join(root,'seed-media.sql');fs.writeFileSync(out,sql,'utf8');
console.log(`Created ${out}: ${placements.length} ordered placements, ${seen.size} unique static image files, ${Buffer.byteLength(sql)} bytes. No image files were copied.`);
