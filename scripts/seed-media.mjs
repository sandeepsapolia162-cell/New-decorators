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
const categories=[...new Set(placements.map(p=>p[1]))];
let sql='-- Static media references only. No original image bytes are copied into D1.\n';
categories.forEach((name,index)=>sql+=`INSERT OR IGNORE INTO categories(id,name,sort_order) VALUES(${sqlQuote(idFor('category:'+name))},${sqlQuote(name)},${index});\n`);
const seen=new Set();
for(let index=0;index<placements.length;index++){
  const [,category,src,alt]=placements[index];
  const url=src.replaceAll('\\','/');
  if(!/^images\/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g)$/i.test(url)||url.split('/').includes('..'))throw new Error(`Unsafe image reference: ${src}`);
  if(!fs.existsSync(path.join(root,url)))throw new Error(`Missing image file: ${url}`);
  seen.add(url);
  const basename=path.basename(url,path.extname(url)).replaceAll('_',' ');
  const id=idFor(`placement:${index}:${url}`);
  sql+=`INSERT OR IGNORE INTO media(id,type,title,alt_text,category_id,source,external_url,mime_type,size_bytes,sort_order,is_visible) VALUES(${sqlQuote(id)},'image',${sqlQuote(basename)},${sqlQuote(alt)},${sqlQuote(idFor('category:'+category))},'static',${sqlQuote('/'+url)},'${path.extname(url).toLowerCase()==='.png'?'image/png':path.extname(url).toLowerCase()==='.webp'?'image/webp':'image/jpeg'}',0,${index},1);\n`;
}
const out=path.join(root,'seed-media.sql');fs.writeFileSync(out,sql,'utf8');
console.log(`Created ${out}: ${placements.length} ordered placements, ${seen.size} unique static image files, ${Buffer.byteLength(sql)} bytes. No image files were copied.`);
