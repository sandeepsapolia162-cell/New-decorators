// Read image dimensions and hash using Node built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd();
const html=fs.readFileSync(path.join(root,'portfolio.html'),'utf8');
const paths=[...new Set([...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m=>m[1].replace(/^\.\//,'')).filter(p=>/^images\/(?:front-gate|indoor|ceiling|walkway)\//i.test(p)))];
function dimensions(b,file){
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {w:b.readUInt32BE(16),h:b.readUInt32BE(20),format:'png'};
  if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
    const kind=b.toString('ascii',12,16),o=20;
    if(kind==='VP8X')return {w:1+b[o+4]+(b[o+5]<<8)+(b[o+6]<<16),h:1+b[o+7]+(b[o+8]<<8)+(b[o+9]<<16),format:'webp'};
    if(kind==='VP8L'&&b[o]===0x2f)return {w:1+b[o+1]+((b[o+2]&0x3f)<<8),h:1+(b[o+2]>>6)+(b[o+3]<<2)+((b[o+4]&0x0f)<<10),format:'webp'};
    if(kind==='VP8 '){for(let i=o;i+9<b.length&&i<o+64;i++)if(b[i]===0x9d&&b[i+1]===1&&b[i+2]===0x2a)return {w:b.readUInt16LE(i+3)&0x3fff,h:b.readUInt16LE(i+5)&0x3fff,format:'webp'};}
  }
  if(b[0]===0xff&&b[1]===0xd8){let i=2;while(i+4<b.length){if(b[i++]!==0xff)continue;while(b[i]===0xff)i++;const marker=b[i++];if(marker===0xd9||marker===0xda)break;const len=b.readUInt16BE(i);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {h:b.readUInt16BE(i+3),w:b.readUInt16BE(i+5),format:'jpeg'};i+=len;}}
  throw new Error(`Could not read image dimensions: ${file}`);
}
const rows=[];
for(const url of paths){const b=fs.readFileSync(path.join(root,url));const {w,h,format}=dimensions(b,url);rows.push({url:'/'+url,w,h,ratio:w/h,orientation:w/h<.95?'portrait':w/h>1.05?'landscape':'square',size:b.length,hash:crypto.createHash('sha256').update(b).digest('hex'),format});}
rows.sort((a,b)=>a.url.localeCompare(b.url));
const q=s=>'"'+String(s).replaceAll('"','""')+'"';
fs.mkdirSync(path.join(root,'audit'),{recursive:true});
fs.writeFileSync(path.join(root,'audit/image-dimensions.csv'),['path,width,height,aspect_ratio,orientation,file_size_bytes',...rows.map(r=>[q(r.url),r.w,r.h,r.ratio.toFixed(4),r.orientation,r.size].join(','))].join('\n')+'\n');
const byHash=new Map();for(const r of rows){const a=byHash.get(r.hash)||[];a.push(r.url);byHash.set(r.hash,a);}
const summary={files:rows.length,portrait:rows.filter(r=>r.orientation==='portrait').length,landscape:rows.filter(r=>r.orientation==='landscape').length,square:rows.filter(r=>r.orientation==='square').length,extreme:rows.filter(r=>r.ratio>2||r.ratio<.5).map(r=>({path:r.url,ratio:+r.ratio.toFixed(3)})),tiny:rows.filter(r=>Math.min(r.w,r.h)<800).map(r=>({path:r.url,width:r.w,height:r.h})),duplicates:[...byHash.values()].filter(a=>a.length>1),rows};
fs.writeFileSync(path.join(root,'audit/image-info.json'),JSON.stringify(summary,null,2));
const dims=new Map(rows.map(r=>[r.url,{w:r.w,h:r.h}]));
const sqlQuote=value=>`'${String(value).replaceAll("'","''")}'`;
const placements=[...html.matchAll(/<div class="portfolio-item" data-category="([^"]+)">\s*<img src="([^"]+)"/g)];
const updates=placements.map(([,category,src])=>{const url='/'+src.replace(/^\.\//,'');const d=dims.get(url);if(!d)throw new Error(`No measured image for ${url}`);return `UPDATE media SET width=${d.w},height=${d.h} WHERE source='static' AND category_id=(SELECT id FROM categories WHERE name=${sqlQuote(category)}) AND external_url=${sqlQuote(url)};`});
fs.writeFileSync(path.join(root,'migrations/0003_dimensions.sql'),'-- Populate dimensions for every current static Portfolio placement. Safe to re-run.\n'+updates.join('\n')+'\n');
console.log(JSON.stringify({...summary,rows:undefined},null,2));
