// Small dependency-free dashboard. All authority checks remain in the Pages API.
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let media=[],categories=[],role='editor',touchCard=null,touchTimer=null,touchDrag=false,cropState=null;
let listMode=false;
let editingVideo=null,videoSourceUrl=null,ffmpegInstance=null,ffmpegLoading=null;
const say=t=>{const el=$('#notice');if(el)el.textContent=t;};
const showStartupError=message=>{const panel=$('#startupError'),text=$('#startupErrorText');if(panel){if(text)text.textContent=message;panel.hidden=false;}};
const hideStartupError=()=>{const panel=$('#startupError');if(panel)panel.hidden=true;};
function setDashboardTab(name){$$('[data-dashboard-tab]').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.dashboardTab===name)));$$('[data-dashboard-panel]').forEach(panel=>panel.hidden=panel.dataset.dashboardPanel!==name);}
$$('[data-dashboard-tab]').forEach(tab=>tab.addEventListener('click',()=>setDashboardTab(tab.dataset.dashboardTab)));
$$('[data-open-dashboard-tab]').forEach(button=>button.addEventListener('click',()=>setDashboardTab(button.dataset.openDashboardTab)));
function isVideoGalleryCategory(category){return /video\s+gall(?:e|a)ry/i.test(String(category?.name||''));}
// If a later top-level dashboard statement fails, preserve an actionable message.
window.addEventListener('error',event=>showStartupError(`Dashboard script error: ${event.message||'A script could not run.'} Check that /js/admin.js and /css/admin.css load successfully.`));
window.addEventListener('unhandledrejection',event=>showStartupError(`Dashboard startup failed: ${event.reason?.message||String(event.reason||'Unknown error')}`));
async function api(url,options={}){const r=await fetch(url,options);let data={};try{data=await r.json();}catch{}if(!r.ok){const error=Error(data.error||`Request failed (${r.status})`);error.status=r.status;throw error;}return data;}
const post=(url,data,method='POST')=>api(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function xhrUpload(url,blob,headers,onProgress=()=>{}){return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open('POST',url);for(const [k,v]of Object.entries(headers))x.setRequestHeader(k,v);x.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};x.onload=()=>{let d={};try{d=JSON.parse(x.responseText);}catch{}x.status>=200&&x.status<300?resolve(d):reject(Error(d.error||`Upload failed (${x.status})`));};x.onerror=()=>reject(Error('Network error during upload'));x.send(blob);});}
async function load(){
  const login=$('#login'),app=$('#app'),message=$('#message');
  login.hidden=false;app.hidden=true;message.textContent='Checking your sign-in…';
  let session;
  try{session=await api('/api/admin/session');}
  catch(error){
    if(error.status===401){message.textContent='Please sign in to open the dashboard.';hideStartupError();return;}
    message.textContent='The sign-in service could not be checked.';
    showStartupError(`Could not check your sign-in (${error.message}). Confirm the Pages Functions and D1 binding are deployed, then reload. You can still try signing in below.`);
    return;
  }
  role=session.user.role;login.hidden=true;app.hidden=false;message.textContent='';
  setDashboardTab(document.querySelector('[data-dashboard-tab][aria-selected="true"]')?.dataset.dashboardTab||'overview');
  const teamPanel=$('#teamPanel');if(teamPanel)teamPanel.hidden=role!=='admin';
  const adminCat=$('#adminCategories');if(adminCat)adminCat.hidden=role!=='admin';
  try{
    const summary=await api('/api/admin/summary');
    const countEl=$('#count');if(countEl)countEl.textContent=summary.count;
    const storageEl=$('#storage');if(storageEl)storageEl.textContent=`${(summary.bytes/1048576).toFixed(1)} MB / 500 MB`;
    const storageBar=$('#storageBar');if(storageBar)storageBar.value=Math.min(100,summary.bytes/summary.limit*100);
    const recentEl=$('#recent');if(recentEl){recentEl.replaceChildren();for(const entry of summary.recent||[]){const li=document.createElement('li');li.textContent=`${entry.title||'Untitled'} · ${entry.type} · ${entry.created_at}`;recentEl.append(li);}}
    [media,categories]=await Promise.all([api('/api/admin/media'),api('/api/categories')]);
    fillCategories();
    // Keep the old spelling usable while normalizing the dashboard category name.
    const videoGallery=categories.find(c=>c.name?.trim().toLowerCase()==='video gallery')||categories.find(isVideoGalleryCategory);
    if(videoGallery&&videoGallery.name!=='Video Gallery'){
      try{await post(`/api/admin/categories/${videoGallery.id}`,{name:'Video Gallery'},'PATCH');categories=await api('/api/categories');}
      catch(e){say(`Could not rename the video category: ${e.message}`);}
    }else if(!videoGallery){
      try{await post('/api/admin/categories',{name:'Video Gallery'});categories=await api('/api/categories');}
      catch(e){say(`Could not create the Video Gallery category: ${e.message}`);}
    }
    fillCategories();
    renderOverviewPhotos(media);
    render();
    if(role==='admin')await loadTeam();
    hideStartupError();
  }catch(error){showStartupError(`You are signed in, but dashboard data could not load (${error.message}). Check the DB binding and database schema, then reload.`);say(error.message);}
}
function fillCategories(){
  const ids=['uploadCategory','categoryFilter','bulkCategory'];
  ids.forEach(id=>{
    const el=$(`#${id}`);
    if(!el)return;
    const options=id==='categoryFilter'?[{value:'all',label:'All categories'},...categories.map(c=>({value:c.id,label:c.name}))]:categories.map(c=>({value:c.id,label:c.name}));
    setSelectOptions(el,options);
  });
  $$('.categorySelect').forEach(s=>setSelectOptions(s,categories.map(c=>({value:c.id,label:c.name}))));
  const gallery=categories.find(c=>c.name?.trim().toLowerCase()==='video gallery')||categories.find(isVideoGalleryCategory);
  ['videoCategory','linkCategory'].forEach(id=>{const el=$(`#${id}`);if(el)setSelectOptions(el,[{value:gallery?.id||'',label:gallery?'Video Gallery':'Video Gallery category unavailable'}]);});
}
function setSelectOptions(select,items){if(!select)return;select.replaceChildren(...items.map(item=>{const option=document.createElement('option');option.value=item.value||'';option.textContent=item.label||'';option.selected=!!item.selected;return option;}));}
function videoGalleryId(){return categories.find(c=>c.name?.trim().toLowerCase()==='video gallery')?.id||categories.find(isVideoGalleryCategory)?.id||null;}
function selectedIds(){return [...$$('.select-item:checked')].map(x=>x.value);}
function filtered(){const q=$('#search').value.toLowerCase(),type=$('#typeFilter').value,cat=$('#categoryFilter').value,vis=$('#visibilityFilter').value;return media.filter(m=>(!q||`${m.title} ${m.caption} ${m.alt_text}`.toLowerCase().includes(q))&&(type==='all'||m.type===type)&&(cat==='all'||m.category_id===cat)&&(vis==='all'||(vis==='visible')===!!m.is_visible));}
function render(){const box=$('#library');if(!box)return;box.replaceChildren();box.classList.toggle('list-view',listMode);const items=filtered();for(const item of items)box.append(makeCard(item));const empty=$('#emptyLibrary');if(empty)empty.hidden=items.length>0;}
function renderOverviewPhotos(items){
  const grid=$('#overviewPhotos'),empty=$('#overviewPhotosEmpty');if(!grid)return;
  const photos=items.filter(item=>item.type==='image').slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,6);
  grid.replaceChildren();if(empty)empty.hidden=photos.length>0;
  photos.forEach(item=>{
    const card=document.createElement('article');card.className='overview-photo-card';
    const image=document.createElement('img');image.loading='lazy';image.decoding='async';image.alt=item.alt_text||item.title||'Portfolio photo';image.src=item.source==='static'?item.external_url:`/api/file/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.updated_at||'1')}`;
    const caption=document.createElement('div');caption.className='overview-photo-caption';
    const title=document.createElement('strong');title.textContent=item.title||'Untitled photo';
    const visibility=document.createElement('small');visibility.textContent=item.is_visible?'Visible on portfolio':'Hidden from portfolio';
    caption.append(title,visibility);card.append(image,caption);grid.append(card);
  });
}
function makeCard(item){
  const card=document.createElement('article');card.className='media-card';card.draggable=true;card.dataset.id=item.id;
  const check=document.createElement('input');check.type='checkbox';check.className='select-item';check.value=item.id;check.setAttribute('aria-label','Select '+(item.title||'media item'));
  const dragHandle=button('↕ Reorder',()=>{});dragHandle.className='drag-handle';dragHandle.setAttribute('aria-label','Hold and drag to reorder');
  const preview=document.createElement(item.type==='video'?'video':'img');preview.className='media-preview';
  if(item.type==='video'){
    if(item.source==='youtube'||item.source==='vimeo'){
      const link=document.createElement('a');link.href=item.external_url;link.target='_blank';link.rel='noopener';link.textContent=`Open ${item.source} video`;
      card.append(check,link);
    }else{preview.controls=true;preview.playsInline=true;preview.preload='metadata';preview.src=`/api/file/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.updated_at||'1')}`;preview.poster=item.poster_url||'';card.append(preview,check);}
  }else{preview.src=item.source==='static'?item.external_url:`/api/file/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.updated_at||'1')}`;preview.alt=item.alt_text||'';card.append(preview,check);}
  card.append(dragHandle);
  const title=input(item.title,'Title');title.className='media-title';
  const caption=input(item.caption,'Caption','textarea'),alt=input(item.alt_text,'Alt text');
  const details=document.createElement('details');details.className='media-details';const summary=document.createElement('summary');summary.textContent='Edit details';details.append(summary,title,caption,alt);
  let category=null;
  if(item.type==='image'){
    category=document.createElement('select');category.setAttribute('aria-label','Photo category');
    setSelectOptions(category,categories.filter(c=>!isVideoGalleryCategory(c)).map(c=>({value:c.id,label:c.name,selected:item.category_id===c.id})));details.append(category);
  }
  const vis=toggle('Visible on portfolio',item.is_visible),featured=toggle(item.type==='video'?'Feature video on homepage':'Feature photo on homepage',item.is_featured);
  const flags=document.createElement('div');flags.className='media-flags';flags.append(vis.label,featured.label);
  if(item.type==='image'){
    const pinned=toggle('Pin to top of category and All',item.is_pinned);flags.append(pinned.label);
    pinned.checked.onchange=async()=>{try{await post(`/api/admin/media/${item.id}`,{is_pinned:pinned.checked},'PATCH');say(pinned.checked?'Photo pinned to the top.':'Photo unpinned.');await load();}catch(e){pinned.checked=!pinned.checked;say(e.message);}};
  }
  featured.checked.onchange=async()=>{try{await post(`/api/admin/media/${item.id}`,{is_featured:featured.checked},'PATCH');say(featured.checked?'Featured on the home page.':'Removed from home page features.');await load();}catch(e){featured.checked=!featured.checked;say(e.message);}};
  const save=button('Save details',async()=>{const change={title:title.value,caption:caption.value,alt_text:alt.value,is_visible:vis.checked};if(category)change.category_id=category.value;await post(`/api/admin/media/${item.id}`,change,'PATCH');say('Saved changes.');await load();});
  const actions=document.createElement('div');actions.className='media-actions';actions.append(save);
  if(item.type==='image')actions.append(button('Edit photo',()=>openCrop(item)));
  else if(item.source==='upload')actions.append(button('Edit video',()=>openVideoEditor(item)));
  const replace=document.createElement('label');replace.className='file-button btn btn-quiet';replace.textContent='Replace file';const file=document.createElement('input');file.type='file';file.accept=item.type==='video'?'video/*,.avi,.mov,.mkv,.m4v,.mpg,.mpeg,.3gp,.flv,.ts,.mts,.m2ts,.wmv,.asf,.ogv':'image/*';file.hidden=true;replace.append(file);file.onchange=async()=>{if(file.files[0]){if(item.type==='video')openVideoEditor(item,file.files[0]);else await replaceMedia(item,file.files[0]);}};actions.append(replace);
  const remove=button(item.source==='static'?'Remove from gallery':'Delete',async()=>{if(confirm(item.source==='static'?'Remove this reference from the gallery? The repository image file will stay untouched.':'Delete this uploaded item permanently?')){await api(`/api/admin/media/${item.id}`,{method:'DELETE'});await load();}});remove.className='btn btn-danger';actions.append(remove);
  const badges=document.createElement('div');badges.className='item-badges';const categoryName=categories.find(c=>c.id===item.category_id)?.name||'Uncategorized';const catBadge=document.createElement('span');catBadge.className='item-badge';catBadge.textContent=categoryName;badges.append(catBadge);
  if(item.is_pinned){const badge=document.createElement('span');badge.className='item-badge';badge.textContent='Pinned';badges.append(badge);}
  if(item.is_featured){const badge=document.createElement('span');badge.className='item-badge';badge.textContent=item.type==='video'?'Home video':'Home feature';badges.append(badge);}
  card.append(badges,flags,details,actions);
  if(item.source==='static'){const note=document.createElement('small');note.textContent='Original photo file stays in the website folder.';card.append(note);}
  bindDrag(card);return card;
}
function input(value,placeholder,tag='input'){const el=document.createElement(tag);el.value=value||'';el.placeholder=placeholder;return el;}
function toggle(labelText,checked){const label=document.createElement('label'),el=document.createElement('input');el.type='checkbox';el.checked=!!checked;label.append(el,document.createTextNode(labelText));return {label,checked:el};}
function button(text,fn){const b=document.createElement('button');b.type='button';b.className='btn btn-dark';b.textContent=text;b.onclick=()=>Promise.resolve(fn()).catch(e=>say(e.message));return b;}
function bindDrag(card){card.addEventListener('dragstart',e=>{card.classList.add('dragging');e.dataTransfer.setData('text/plain',card.dataset.id);});card.addEventListener('dragend',()=>{card.classList.remove('dragging');saveOrder();});card.addEventListener('dragover',e=>{e.preventDefault();const moving=$('#library .dragging');if(moving&&moving!==card){const r=card.getBoundingClientRect();$('#library').insertBefore(moving,e.clientY<r.top+r.height/2?card:card.nextSibling);}});const handle=card.querySelector('.drag-handle');handle?.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;e.preventDefault();handle.setPointerCapture(e.pointerId);touchCard=card;touchTimer=setTimeout(()=>{touchDrag=true;card.classList.add('dragging');},180);});handle?.addEventListener('pointermove',e=>{if(!touchDrag||!touchCard)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.media-card');if(target&&target!==touchCard){const r=target.getBoundingClientRect();$('#library').insertBefore(touchCard,e.clientY<r.top+r.height/2?target:target.nextSibling);}});handle?.addEventListener('pointerup',()=>{clearTimeout(touchTimer);if(touchDrag){touchCard?.classList.remove('dragging');saveOrder();}touchCard=null;touchDrag=false;});}
async function saveOrder(){const shown=[...$('#library').querySelectorAll('.media-card')].map(x=>x.dataset.id);if(!shown.length)return;const all=media.slice().sort((a,b)=>a.sort_order-b.sort_order).map(x=>x.id),positions=all.map((x,i)=>shown.includes(x)?i:-1).filter(i=>i>=0);positions.forEach((position,i)=>all[position]=shown[i]);try{await post('/api/admin/reorder',{ids:all});media.forEach(x=>x.sort_order=all.indexOf(x.id));say('Gallery order saved.');}catch(e){say(e.message);}}
function fileData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});}
function metaHeader(value){const bytes=new TextEncoder().encode(JSON.stringify(value));let raw='';for(const b of bytes)raw+=String.fromCharCode(b);return btoa(raw);}
function convertImage(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const scale=Math.min(1,1920/img.width),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{URL.revokeObjectURL(url);blob?resolve({blob,width:canvas.width,height:canvas.height}):reject(Error('WebP conversion failed'));},'image/webp',.8);};img.onerror=()=>reject(Error('Could not read image'));img.src=url;});}
function bytes(n){return n<1048576?`${Math.round(n/1024)} KB`:`${(n/1048576).toFixed(1)} MB`;}
async function uploadImage(file,hidden=false,onProgress=()=>{}){const result=await convertImage(file),meta={type:'image',title:file.name.replace(/\.[^.]+$/,''),category_id:hidden?null:$('#uploadCategory').value,mime_type:'image/webp',width:result.width,height:result.height,hidden};const res=await xhrUpload('/api/admin/media',result.blob,{'Content-Type':'application/octet-stream','X-Media-Meta':metaHeader(meta)},onProgress);return {id:res.id,size:result.blob.size};}

const FFMPEG_VERSION='0.12.15',FFMPEG_CORE_VERSION='0.12.10',VIDEO_MAX=50*1024*1024,VIDEO_SOURCE_MAX=512*1024*1024;
let ffmpegBlobUrls=[];
function loadFFmpegScript(){
  if(globalThis.FFmpegWASM?.FFmpeg)return Promise.resolve();
  return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=`https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/umd/ffmpeg.js`;script.onload=()=>globalThis.FFmpegWASM?.FFmpeg?resolve():reject(Error('The video converter did not load correctly.'));script.onerror=()=>reject(Error('Could not load the video converter. Check the internet connection and try again.'));document.head.append(script);});
}
async function remoteBlobUrl(url,mime){const response=await fetch(url,{mode:'cors',cache:'force-cache'});if(!response.ok)throw Error(`Could not download video converter file (${response.status}).`);const blobUrl=URL.createObjectURL(new Blob([await response.arrayBuffer()],{type:mime}));ffmpegBlobUrls.push(blobUrl);return blobUrl;}
async function getFFmpeg(){
  if(ffmpegInstance?.loaded)return ffmpegInstance;
  if(ffmpegLoading)return ffmpegLoading;
  ffmpegLoading=(async()=>{
    $('#videoProgress').textContent='Loading the browser video converter. The first load is about 31 MB; your video stays on this device.';
    await loadFFmpegScript();
    const cdn=`https://cdn.jsdelivr.net/npm/@ffmpeg`;
    const ffmpeg=new globalThis.FFmpegWASM.FFmpeg();
    const [classWorkerURL,coreURL,wasmURL]=await Promise.all([
      remoteBlobUrl(`${cdn}/ffmpeg@${FFMPEG_VERSION}/dist/umd/814.ffmpeg.js`,'text/javascript'),
      remoteBlobUrl(`${cdn}/core@${FFMPEG_CORE_VERSION}/dist/umd/ffmpeg-core.js`,'text/javascript'),
      remoteBlobUrl(`${cdn}/core@${FFMPEG_CORE_VERSION}/dist/umd/ffmpeg-core.wasm`,'application/wasm')
    ]);
    await ffmpeg.load({classWorkerURL,coreURL,wasmURL});
    ffmpegInstance=ffmpeg;
    return ffmpeg;
  })();
  try{return await ffmpegLoading;}finally{ffmpegLoading=null;}
}
function sourceExtension(file){const ext=file.name.split('.').pop().toLowerCase();if(/^[a-z0-9]{1,10}$/.test(ext)&&ext!==file.name.toLowerCase())return ext;return file.type==='video/mp4'?'mp4':file.type==='video/webm'?'webm':'bin';}
function videoFilterGraph(){const crop=(Number($('#videoCrop').value)||0)/100,brightness=Number($('#videoBrightness').value)||0,contrast=(Number($('#videoContrast').value)||100)/100,saturation=(Number($('#videoSaturation').value)||100)/100;return `scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,crop=trunc(iw*(1-2*${crop})/2)*2:trunc(ih*(1-2*${crop})/2)*2:trunc(iw*${crop}/2)*2:trunc(ih*${crop}/2)*2,eq=brightness=${brightness.toFixed(2)}:contrast=${contrast.toFixed(2)}:saturation=${saturation.toFixed(2)}`;}
async function makeVideoPoster(ffmpeg){try{const code=await ffmpeg.exec(['-ss','1','-i','output.webm','-frames:v','1','-vf','scale=w=640:h=640:force_original_aspect_ratio=decrease','-c:v','libwebp','-quality','78','poster.webp']);if(code!==0)return null;const data=await ffmpeg.readFile('poster.webp');return new File([data],'video-poster.webp',{type:'image/webp'});}catch{return null;}}
function readVideoSize(blob){return new Promise(resolve=>{const video=document.createElement('video'),url=URL.createObjectURL(blob),done=()=>{const size={width:video.videoWidth||null,height:video.videoHeight||null};URL.revokeObjectURL(url);resolve(size);};video.onloadedmetadata=done;video.onerror=done;video.src=url;window.setTimeout(done,2500);});}
async function compressAndSaveVideo(sourceFile){
  if(sourceFile.size>VIDEO_SOURCE_MAX)throw Error(`Choose a source video smaller than ${bytes(VIDEO_SOURCE_MAX)} so this browser can process it.`);
  const button=$('#uploadVideo'),status=$('#videoProgress');button.disabled=true;
  try{
    const ffmpeg=await getFFmpeg(),inputName=`input.${sourceExtension(sourceFile)}`,baseCRF=Number($('#videoQuality').value)||34,filter=videoFilterGraph();
    status.textContent=`Preparing ${sourceFile.name} (${bytes(sourceFile.size)}).`;
    await ffmpeg.writeFile(inputName,new Uint8Array(await sourceFile.arrayBuffer()));
    let output=null,quality=baseCRF;
    for(let attempt=0;attempt<3;attempt++,quality+=4){
      try{await ffmpeg.deleteFile('output.webm');}catch{}
      status.textContent=`Compressing video · pass ${attempt+1} of 3…`;
      const onProgress=({progress})=>{if(Number.isFinite(progress)&&progress>=0&&progress<=1)status.textContent=`Compressing video · ${Math.round(progress*100)}%`};
      ffmpeg.on('progress',onProgress);
      let resultCode;
      try{resultCode=await ffmpeg.exec(['-i',inputName,'-map','0:v:0','-map','0:a?','-vf',filter,'-c:v','libvpx-vp9','-crf',String(quality),'-b:v','0','-deadline','good','-cpu-used','4','-pix_fmt','yuv420p','-c:a','libopus','-b:a','96k','-f','webm','output.webm']);}
      finally{ffmpeg.off('progress',onProgress);}
      if(resultCode!==0)throw Error('This file could not be converted. It may use a protected or unsupported video codec.');
      output=new Blob([await ffmpeg.readFile('output.webm')],{type:'video/webm'});
      if(output.size<=VIDEO_MAX)break;
      if(attempt===2)throw Error(`The compressed video is still larger than ${bytes(VIDEO_MAX)}. Choose “Smaller file” or crop it more and try again.`);
    }
    const size=await readVideoSize(output),posterFile=await makeVideoPoster(ffmpeg);let poster=null;
    if(posterFile){try{poster=await uploadImage(posterFile,true);}catch{}}
    const meta={type:'video',mime_type:'video/webm',title:$('#videoTitle').value.trim()||sourceFile.name.replace(/\.[^.]+$/,''),category_id:videoGalleryId(),width:size.width,height:size.height,thumbnail_id:poster?.id||null,poster_url:poster?`/api/file/${poster.id}`:''};
    if(editingVideo){
      status.textContent='Saving the edited video…';
      const response=await fetch(`/api/admin/media/${encodeURIComponent(editingVideo.id)}/replace`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Media-Meta':metaHeader(meta)},body:output});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not replace this video.');
      await post(`/api/admin/media/${editingVideo.id}`,{title:meta.title,poster_url:meta.poster_url,thumbnail_id:meta.thumbnail_id},'PATCH');
      status.textContent=`Video updated · ${bytes(sourceFile.size)} → ${bytes(output.size)} as WebM.`;
    }else{
      status.textContent='Adding video to Video Gallery…';
      await xhrUpload('/api/admin/media',output,{'Content-Type':'application/octet-stream','X-Media-Meta':metaHeader(meta)},n=>status.textContent=`Uploading compressed video… ${n}%`);
      status.textContent=`Video added to Video Gallery · ${bytes(sourceFile.size)} → ${bytes(output.size)} as WebM.`;
    }
    editingVideo=null;$('#clearVideoEdit').hidden=true;await load();
  }finally{button.disabled=false;}
}

// --- Event bindings (all with null-safety) ---
const loginForm=$('#loginForm');
if(loginForm)loginForm.onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await post('/api/login',{email:f.get('email'),password:f.get('password')});$('#message').textContent='Signed in.';await load();}catch(x){$('#message').textContent=x.message;}};

// Both logout buttons
const logoutBtn=$('#logout');if(logoutBtn)logoutBtn.onclick=async()=>{await api('/api/logout',{method:'POST'});location.reload();};
const logoutApp=$('#logoutApp');if(logoutApp)logoutApp.onclick=async()=>{await api('/api/logout',{method:'POST'});location.reload();};

const imageFiles=$('#imageFiles');
if(imageFiles){
  imageFiles.onchange=async e=>{for(const file of e.target.files){const row=document.createElement('div'),p=document.createElement('p'),bar=document.createElement('progress');bar.max=100;bar.value=0;p.textContent=`Preparing ${file.name} (${bytes(file.size)})`;row.append(p,bar);$('#imageProgress').append(row);try{const u=await uploadImage(file,false,n=>bar.value=n);p.textContent=`Uploaded ${file.name}: ${bytes(file.size)} → ${bytes(u.size)}`;bar.value=100;}catch(x){p.textContent=`${file.name}: ${x.message}`;bar.remove();}}e.target.value='';await load();};
  const dropZone=imageFiles.parentElement;
  if(dropZone){dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('drag-over');});dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('drag-over'));dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('drag-over');const transfer=new DataTransfer();[...e.dataTransfer.files].forEach(f=>transfer.items.add(f));imageFiles.files=transfer.files;imageFiles.dispatchEvent(new Event('change',{bubbles:true}));});}
}

const linkForm=$('#linkForm');
if(linkForm)linkForm.onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const result=await post('/api/admin/media/link',{url:f.get('url'),title:f.get('title'),category_id:videoGalleryId()});say(`Added ${result.provider} video to Video Gallery.`);e.target.reset();await load();}catch(x){say(x.message);}};

const uploadVideoBtn=$('#uploadVideo');
let programmaticVideoChange=false;
const videoFile=$('#videoFile'),videoPreview=$('#videoPreview'),videoPreviewFrame=$('#videoPreviewFrame');
if(videoFile)videoFile.onchange=()=>{const file=videoFile.files[0];if(!programmaticVideoChange)editingVideo=null;programmaticVideoChange=false;updateVideoPreview(file);if(file&&!editingVideo)$('#videoTitle').value=file.name.replace(/\.[^.]+$/,'');};
function updateVideoPreview(file){if(!videoPreview||!videoPreviewFrame)return;if(videoSourceUrl){URL.revokeObjectURL(videoSourceUrl);videoSourceUrl=null;}if(!file){videoPreviewFrame.hidden=true;return;}videoSourceUrl=URL.createObjectURL(file);videoPreview.src=videoSourceUrl;videoPreviewFrame.hidden=false;$('#videoPreviewNote').textContent='Preview is optional. Some formats may not preview in this browser but can still be converted.';videoPreview.onerror=()=>{$('#videoPreviewNote').textContent='This browser cannot preview the source format. The file can still be converted.';};applyVideoPreviewEdits();}
function applyVideoPreviewEdits(){const crop=Number($('#videoCrop')?.value||0)/100,brightness=100+Number($('#videoBrightness')?.value||0)*100,contrast=Number($('#videoContrast')?.value||100),saturation=Number($('#videoSaturation')?.value||100);if(videoPreviewFrame){videoPreviewFrame.style.setProperty('--video-crop-scale',String(1/(1-2*crop)));videoPreviewFrame.style.setProperty('--video-brightness',`${brightness}%`);videoPreviewFrame.style.setProperty('--video-contrast',`${contrast}%`);videoPreviewFrame.style.setProperty('--video-saturation',`${saturation}%`);}}
const videoControls=[['videoCrop','videoCropValue',value=>`${value}%`],['videoBrightness','videoBrightnessValue',value=>Number(value)>0?`+${value}`:String(value)],['videoContrast','videoContrastValue',value=>`${value}%`],['videoSaturation','videoSaturationValue',value=>`${value}%`]];
videoControls.forEach(([id,output,format])=>{const control=$(`#${id}`);if(control)control.addEventListener('input',()=>{$(`#${output}`).textContent=format(control.value);applyVideoPreviewEdits();});});
const resetVideoEdits=$('#resetVideoEdits');if(resetVideoEdits)resetVideoEdits.onclick=()=>{for(const [id,output,format]of videoControls){const control=$(`#${id}`);if(control){control.value=id==='videoBrightness'?'0':id==='videoContrast'||id==='videoSaturation'?'100':'0';$(`#${output}`).textContent=format(control.value);}}applyVideoPreviewEdits();};
const clearVideoEdit=$('#clearVideoEdit');if(clearVideoEdit)clearVideoEdit.onclick=()=>{editingVideo=null;videoFile.value='';$('#videoTitle').value='';clearVideoEdit.hidden=true;updateVideoPreview(null);$('#videoProgress').textContent='Ready for a new video.';setDashboardTab('upload');};
if(uploadVideoBtn)uploadVideoBtn.onclick=async()=>{const file=videoFile?.files[0];if(!file){$('#videoProgress').textContent='Choose a video file first.';return;}try{await compressAndSaveVideo(file);}catch(error){$('#videoProgress').textContent=error.message||'Video conversion failed.';}};

const searchEl=$('#search');if(searchEl)searchEl.oninput=render;
['typeFilter','categoryFilter','visibilityFilter'].forEach(id=>{const el=$('#'+id);if(el)el.onchange=render;});
const gridView=$('#gridView');if(gridView)gridView.onclick=()=>{listMode=false;gridView.setAttribute('aria-pressed','true');$('#listView').setAttribute('aria-pressed','false');render();};
const listView=$('#listView');if(listView)listView.onclick=()=>{listMode=true;listView.setAttribute('aria-pressed','true');$('#gridView').setAttribute('aria-pressed','false');render();};
const selectAll=$('#selectAll');if(selectAll)selectAll.onchange=()=>{$$('.select-item').forEach(x=>x.checked=selectAll.checked);};

$$('[data-bulk]').forEach(b=>b.onclick=async()=>{let ids=selectedIds();if(b.dataset.bulk==='pin'||b.dataset.bulk==='unpin')ids=ids.filter(id=>media.find(item=>item.id===id)?.type==='image');if(!ids.length)return say(b.dataset.bulk==='pin'||b.dataset.bulk==='unpin'?'Select at least one photo.':'Select at least one item.');if(b.dataset.bulk==='delete'&&!confirm(`Delete ${ids.length} selected gallery item(s)?`))return;const bulkCat=$('#bulkCategory');try{await post('/api/admin/bulk',{ids,action:b.dataset.bulk,category_id:bulkCat?bulkCat.value:null});await load();say('Bulk action complete.');}catch(x){say(x.message);}});

const categoryForm=$('#categoryForm');
if(categoryForm)categoryForm.onsubmit=async e=>{e.preventDefault();try{await post('/api/admin/categories',{name:new FormData(e.target).get('name')});e.target.reset();await load();say('Category added.');}catch(x){say(x.message);}};

async function renderCategories(){const box=$('#categoryList');if(!box)return;box.replaceChildren();for(const [index,cat] of categories.entries()){const row=document.createElement('div');row.className='toolbar';const name=input(cat.name,'Category name');const rename=button('Rename',async()=>{await post(`/api/admin/categories/${cat.id}`,{name:name.value},'PATCH');await load();});const move=async to=>{if(to<0||to>=categories.length)return;const order=categories.map(x=>x.id);[order[index],order[to]]=[order[to],order[index]];await post('/api/admin/categories/reorder',{ids:order});await load();};const up=button('Move up',()=>move(index-1));const down=button('Move down',()=>move(index+1));const del=button('Delete category',async()=>{if(!confirm(`Delete category "${cat.name}"? Items in it must be moved first.`))return;await api(`/api/admin/categories/${cat.id}`,{method:'DELETE'});await load();});row.append(name,rename,up,down);if(role==='admin')row.append(del);box.append(row);}}

async function loadTeam(){try{const users=await api('/api/admin/users'),box=$('#teamList');if(!box)return;box.replaceChildren();for(const user of users){const row=document.createElement('div');row.className='toolbar';const label=document.createElement('span');label.textContent=user.email;const reset=document.createElement('input');reset.type='password';reset.placeholder='New password (12+ characters)';const save=button('Reset password',async()=>{await post(`/api/admin/users/${user.id}`,{password:reset.value},'PATCH');say('Editor password reset; their old sessions ended.');});const remove=button('Remove editor',async()=>{if(confirm(`Remove ${user.email}?`))await api(`/api/admin/users/${user.id}`,{method:'DELETE'});await loadTeam();});row.append(label,reset,save,remove);box.append(row);}}catch(e){say(e.message);}}

const userForm=$('#userForm');
if(userForm)userForm.onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await post('/api/admin/users',{email:f.get('email'),password:f.get('password')});e.target.reset();await loadTeam();say('Editor account added.');}catch(x){say(x.message);}};

const passwordForm=$('#passwordForm');
if(passwordForm)passwordForm.onsubmit=async e=>{e.preventDefault();try{await post('/api/admin/password',{password:new FormData(e.target).get('password')});location.reload();}catch(x){say(x.message);}};

const backupBtn=$('#backup');
if(backupBtn)backupBtn.onclick=async()=>{try{say('Building ZIP backup. Large libraries may take a few minutes.');const data=await api('/api/admin/export'),filesMap={};for(const item of data.media.filter(m=>m.source==='upload'))filesMap[item.id]=`uploads/${item.id}${item.mime_type==='video/mp4'?'.mp4':item.mime_type==='video/webm'?'.webm':item.mime_type==='image/png'?'.png':item.mime_type==='image/jpeg'?'.jpg':'.webp'}`;data.uploaded_files=filesMap;const files=[{name:'backup.json',bytes:new TextEncoder().encode(JSON.stringify(data,null,2))}];for(const item of data.media.filter(m=>m.source==='upload')){const r=await fetch(`/api/file/${encodeURIComponent(item.id)}`);if(!r.ok)throw Error(`Could not read ${item.title}`);files.push({name:filesMap[item.id],bytes:new Uint8Array(await r.arrayBuffer())});}const blob=zipStore(files);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sepolia-media-backup.zip';a.click();say('ZIP backup downloaded.');}catch(x){say(`Backup failed: ${x.message}`);}};

function zipStore(files){const enc=new TextEncoder(),parts=[],central=[];let offset=0;const crc32=data=>{let c=0xffffffff;for(const byte of data){c^=byte;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};for(const f of files){const name=enc.encode(f.name),data=f.bytes,crc=crc32(data),head=new Uint8Array(30+name.length),v=new DataView(head.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(8,0,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);head.set(name,30);parts.push(head,data);const dir=new Uint8Array(46+name.length),d=new DataView(dir.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(10,0,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);dir.set(name,46);central.push(dir);offset+=head.length+data.length;}const centralSize=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});}

const restoreZip=$('#restoreZip');
if(restoreZip)restoreZip.onchange=async()=>{const file=restoreZip.files[0];if(!file)return;if(!confirm('Restore items from this dashboard ZIP? Existing matching IDs will be skipped.'))return;try{say('Reading backup…');const raw=new Uint8Array(await file.arrayBuffer()),view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength),decoder=new TextDecoder(),entries=new Map();let p=0;while(p+30<raw.length&&view.getUint32(p,true)===0x04034b50){const method=view.getUint16(p+8,true),size=view.getUint32(p+18,true),nameLength=view.getUint16(p+26,true),extra=view.getUint16(p+28,true),name=decoder.decode(raw.slice(p+30,p+30+nameLength)),start=p+30+nameLength+extra;if(method!==0)throw Error('Choose an uncompressed ZIP made by this dashboard.');entries.set(name,raw.slice(start,start+size));p=start+size;}const backup=entries.get('backup.json');if(!backup)throw Error('ZIP does not contain backup.json.');const data=JSON.parse(decoder.decode(backup)),map={};for(const c of data.categories||[]){const result=await post('/api/admin/restore/category',c);map[c.id]=result.id;}let count=0;for(const original of data.media||[]){const item={...original,category_id:map[original.category_id]||null};if(original.source==='upload'){const fileBytes=entries.get(data.uploaded_files?.[original.id]);if(!fileBytes)throw Error(`Backup is missing the file for ${original.title||original.id}`);const r=await fetch('/api/admin/restore/item',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Media-Meta':metaHeader(item)},body:fileBytes});const result=await r.json();if(!r.ok)throw Error(result.error||'Restore failed');}else await post('/api/admin/restore/item',item);count++;}say(`Restore finished; processed ${count} items.`);await load();}catch(e){say(`Restore failed: ${e.message}`);}finally{restoreZip.value='';}};

// Photo editor: crop and rotate at original resolution, then save the adjustments as WebP.
const canvas=$('#cropCanvas'),ctx=canvas?canvas.getContext('2d'):null;let sourceImage=null,selection=null,dragStart=null,rotation=0,cropItem=null,previewScale=1;
function photoFilter(){return `brightness(${$('#photoBrightness').value}%) contrast(${$('#photoContrast').value}%) saturate(${$('#photoSaturation').value}%)`;}
function drawCrop(){if(!sourceImage||!ctx)return;const swap=rotation%180!==0,fullWidth=swap?sourceImage.height:sourceImage.width,fullHeight=swap?sourceImage.width:sourceImage.height;previewScale=Math.min(1,1100/fullWidth,620/fullHeight);canvas.width=Math.max(1,Math.round(fullWidth*previewScale));canvas.height=Math.max(1,Math.round(fullHeight*previewScale));ctx.save();ctx.filter=photoFilter();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(sourceImage,-sourceImage.width*previewScale/2,-sourceImage.height*previewScale/2,sourceImage.width*previewScale,sourceImage.height*previewScale);ctx.restore();if(selection){ctx.save();ctx.filter='none';ctx.strokeStyle='#a67d48';ctx.lineWidth=Math.max(2,2/previewScale);ctx.strokeRect(selection.x,selection.y,selection.w,selection.h);ctx.restore();}}
function updatePhotoControls(){for(const [id,output]of [['photoBrightness','photoBrightnessValue'],['photoContrast','photoContrastValue'],['photoSaturation','photoSaturationValue']])$(`#${output}`).textContent=`${$(`#${id}`).value}%`;drawCrop();}
for(const id of ['photoBrightness','photoContrast','photoSaturation'])$(`#${id}`)?.addEventListener('input',updatePhotoControls);
async function openCrop(item){cropItem=item;rotation=0;selection=null;const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{sourceImage=image;updatePhotoControls();$('#cropDialog').showModal();};image.onerror=()=>say('Could not open this photo for editing.');image.src=item.source==='static'?item.external_url:`/api/file/${encodeURIComponent(item.id)}`;}
if(canvas){
  canvas.onpointerdown=e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;dragStart={x,y};selection={x,y,w:0,h:0};canvas.setPointerCapture(e.pointerId);drawCrop();};
  canvas.onpointermove=e=>{if(!dragStart)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;selection={x:Math.min(x,dragStart.x),y:Math.min(y,dragStart.y),w:Math.abs(x-dragStart.x),h:Math.abs(y-dragStart.y)};drawCrop();};
  canvas.onpointerup=()=>{dragStart=null;};
}
const rotateBtn=$('#rotateImage');if(rotateBtn)rotateBtn.onclick=()=>{rotation=(rotation+90)%360;selection=null;drawCrop();};
const resetCropBtn=$('#resetCrop');if(resetCropBtn)resetCropBtn.onclick=()=>{selection=null;rotation=0;$('#photoBrightness').value='100';$('#photoContrast').value='100';$('#photoSaturation').value='100';updatePhotoControls();};
const saveCropBtn=$('#saveCrop');
if(saveCropBtn)saveCropBtn.onclick=async()=>{try{const swap=rotation%180!==0,w=swap?sourceImage.height:sourceImage.width,h=swap?sourceImage.width:sourceImage.height;let sx=0,sy=0,sw=canvas.width,sh=canvas.height;if(selection&&selection.w>8&&selection.h>8){sx=selection.x;sy=selection.y;sw=selection.w;sh=selection.h;}const rotated=document.createElement('canvas');rotated.width=w;rotated.height=h;const rc=rotated.getContext('2d');rc.filter=photoFilter();rc.translate(w/2,h/2);rc.rotate(rotation*Math.PI/180);rc.drawImage(sourceImage,-sourceImage.width/2,-sourceImage.height/2);const out=document.createElement('canvas');out.width=Math.max(1,Math.round(sw/previewScale));out.height=Math.max(1,Math.round(sh/previewScale));const c=out.getContext('2d');c.drawImage(rotated,sx/previewScale,sy/previewScale,sw/previewScale,sh/previewScale,0,0,out.width,out.height);const blob=await new Promise(resolve=>out.toBlob(resolve,'image/webp',.88));if(!blob)throw Error('Could not create the edited photo.');const file=new File([blob],'edited.webp',{type:'image/webp'});await replaceMedia(cropItem,file);$('#cropDialog').close();}catch(e){say(e.message);}};

async function openVideoEditor(item,file){
  try{
    if(item&&!file){const response=await fetch(`/api/file/${encodeURIComponent(item.id)}`);if(!response.ok)throw Error('Could not read this video. Choose a replacement file instead.');const blob=await response.blob(),ext=item.mime_type==='video/webm'?'webm':'mp4';file=new File([blob],`${(item.title||'portfolio-video').replace(/[^a-z0-9-_]+/gi,'-')}.${ext}`,{type:item.mime_type||blob.type||'video/webm'});}
    if(!file)throw Error('Choose a video file to edit.');editingVideo=item||null;$('#videoTitle').value=item?.title||file.name.replace(/\.[^.]+$/,'');$('#clearVideoEdit').hidden=!item;const transfer=new DataTransfer();transfer.items.add(file);programmaticVideoChange=true;videoFile.files=transfer.files;videoFile.dispatchEvent(new Event('change',{bubbles:true}));setDashboardTab('upload');$('#videoUploadHeading').scrollIntoView({behavior:'smooth',block:'start'});$('#videoProgress').textContent=item?'Ready to crop, adjust and save this video.':'Ready to compress and add this video.';
  }catch(error){say(error.message);}
}

async function replaceMedia(item,file){try{if(item.type==='video'){await openVideoEditor(item,file);return;}const result=await convertImage(file);await post(`/api/admin/media/${item.id}/replace`,{data:await fileData(result.blob),mime_type:'image/webp',width:result.width,height:result.height});say('Photo replaced and optimized.');await load();}catch(e){say(e.message);}}

// Category controls are rendered after the initial API load.
const originalLoad=load;load=async()=>{await originalLoad();if(!$('#app').hidden)await renderCategories();};
(async()=>{try{await load();}catch(error){showStartupError(`Dashboard could not start: ${error?.message||String(error)}. Reload the page or check the browser console.`);}})();
