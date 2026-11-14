// Exercises the same ZIP writer used by the dashboard without needing a browser.
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../js/admin.js',import.meta.url),'utf8');
const start=source.indexOf('function zipStore(files){');
const end=source.indexOf('\n',start);
if(start<0||end<0)throw new Error('ZIP writer was not found in js/admin.js');
const zipStore=new Function(`${source.slice(start,end)}; return zipStore;`)();
const enc=new TextEncoder(),files=[{name:'backup.json',bytes:enc.encode('{"ok":true}')},{name:'uploads/test.webp',bytes:new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80])}];
const output=new Uint8Array(await zipStore(files).arrayBuffer()),view=new DataView(output.buffer);
let offset=0,count=0;
while(offset+30<=output.length&&view.getUint32(offset,true)===0x04034b50){const size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true),startData=offset+30+nameLength+extraLength,name= new TextDecoder().decode(output.slice(offset+30,offset+30+nameLength));if(name!==files[count].name)throw new Error(`Unexpected ZIP entry ${name}`);const actual=output.slice(startData,startData+size);if(Buffer.compare(Buffer.from(actual),Buffer.from(files[count].bytes)))throw new Error(`File payload differs for ${name}`);offset=startData+size;count++;}
if(count!==files.length||view.getUint32(offset,true)!==0x02014b50)throw new Error('ZIP local entries or central directory are malformed');
console.log(`PASS: ZIP writer produced ${count} entries, preserved both file paths and contents, and wrote the central directory.`);
