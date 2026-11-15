/* Dynamic enhancements are additive: the original HTML remains visible on API errors. */
document.addEventListener('DOMContentLoaded', async () => {
  const isPortfolio=/\/portfolio(?:\.html)?\/?$/.test(location.pathname);
  const isDecoration=/\/decoration(?:\.html)?\/?$/.test(location.pathname);
  if(!isPortfolio&&!isDecoration)return;
  const grid=document.querySelector('.portfolio-grid');
  const staticMarkup=grid?.innerHTML;
  if(isPortfolio&&grid)grid.classList.add('dynamic-loading');
  try {
  if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('soft-revealed');observer.unobserve(entry.target);}}),{rootMargin:'0px 0px -40px 0px',threshold:.05});document.querySelectorAll('.decor-section, .portfolio-filters').forEach(el=>{el.classList.add('soft-reveal');observer.observe(el);});}
    const response=await fetch('/api/media',{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Media API unavailable');
    const media=await response.json();
    if(isDecoration){
      const groups=['front-gate','walkway','ceiling','indoor'];
      document.querySelectorAll('.decor-section').forEach((section,index)=>{
        const image=section.querySelector('.decor-img img');if(!image)return;
        const originalPath=new URL(image.src,location.href).pathname;
        const candidate=media.find(item=>item.type==='image'&&item.category===groups[index]&&item.source==='static'&&item.external_url===originalPath)||media.find(item=>item.type==='image'&&item.category===groups[index]);
        if(candidate){image.src=candidate.source==='static'?candidate.external_url:`/api/file/${encodeURIComponent(candidate.id)}`;image.dataset.mediaId=candidate.id;}
      });
      return;
    }
    // Keep the original HTML gallery unless the API actually returns items.
    if(!grid||!Array.isArray(media)||media.length===0)return;
    const categoryResponse=await fetch('/api/categories');if(!categoryResponse.ok)throw new Error('Categories unavailable');const categories=await categoryResponse.json();
    const filterBox=document.querySelector('.portfolio-filters');if(filterBox){filterBox.replaceChildren();const all=document.createElement('button');all.className='filter-btn active';all.dataset.filter='all';all.textContent='ALL';filterBox.append(all);for(const category of categories){const button=document.createElement('button');button.className='filter-btn';button.dataset.filter=category.name;button.textContent=({ 'front-gate':'Entrance',walkway:'WALKWAY',ceiling:'Draping',indoor:'INDOOR'})[category.name]||category.name;filterBox.append(button);}}
    grid.replaceChildren();
    for(const item of media){
      // The site's original reveal observer ran before these cards existed.
      // Mark API-created cards visible immediately so the legacy opacity:0 rule
      // cannot leave the dynamic gallery transparent.
      const card=document.createElement('div');card.className='portfolio-item is-visible';card.dataset.category=item.category||'';card.dataset.mediaId=item.id;
      const version=encodeURIComponent(item.updated_at||'1'),image=document.createElement('img');image.src=item.source==='static'?item.external_url:item.type==='image'?`/api/file/${encodeURIComponent(item.id)}?v=${version}`:item.poster_url||'';image.alt=item.alt_text||item.title||'';image.loading='lazy';image.decoding='async';image.className='media-fade';card.append(image);
      if(item.type==='video'){card.classList.add('video-item');const play=document.createElement('span');play.className='media-play';play.setAttribute('aria-hidden','true');play.textContent='▶';card.append(play);}
      const overlay=document.createElement('div');overlay.className='portfolio-overlay';const label=document.createElement('span');label.className='portfolio-category';label.textContent=({'front-gate':'Front Gate',walkway:'Walkway',ceiling:'Ceiling',indoor:'Indoor'})[item.category]||item.category||'';overlay.append(label);card.append(overlay);grid.append(card);
    }
    const applyFilter=filter=>grid.querySelectorAll('.portfolio-item').forEach(card=>card.hidden=filter!=='all'&&card.dataset.category!==filter);
    filterBox?.addEventListener('click',event=>{const button=event.target.closest('.filter-btn');if(!button)return;filterBox.querySelectorAll('.filter-btn').forEach(x=>x.classList.toggle('active',x===button));applyFilter(button.dataset.filter);});
    const requested=new URLSearchParams(location.search).get('category');const initial=requested?filterBox?.querySelector(`.filter-btn[data-filter="${CSS.escape(requested)}"]`):null;(initial||filterBox?.querySelector('.filter-btn[data-filter="all"]'))?.click();
    grid.querySelectorAll('img').forEach(img=>{if(img.complete)img.classList.add('loaded');else img.addEventListener('load',()=>img.classList.add('loaded'),{once:true});});
    const viewer=document.createElement('dialog');viewer.className='dynamic-viewer';viewer.setAttribute('aria-label','Media preview');viewer.innerHTML='<button class="viewer-close" aria-label="Close preview">×</button><div class="viewer-content"></div><p class="viewer-caption"></p>';document.body.append(viewer);
    const close=()=>{viewer.close();viewer.querySelector('.viewer-content').replaceChildren();};viewer.querySelector('.viewer-close').onclick=close;viewer.addEventListener('click',e=>{if(e.target===viewer)close();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&viewer.open)close();});
    grid.addEventListener('click',event=>{const card=event.target.closest('.portfolio-item');if(!card)return;event.stopPropagation();const item=media.find(x=>x.id===card.dataset.mediaId);if(!item)return;const content=viewer.querySelector('.viewer-content');content.replaceChildren();if(item.type==='video'){if(item.source==='youtube'||item.source==='vimeo'){const frame=document.createElement('iframe');frame.src=item.source==='youtube'?item.external_url.replace('https://www.youtube.com/watch?v=','https://www.youtube-nocookie.com/embed/'):item.external_url.replace('https://vimeo.com/','https://player.vimeo.com/video/');frame.title=item.title||'Portfolio video';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;content.append(frame);}else{const video=document.createElement('video');video.src=`/api/file/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.updated_at||'1')}`;video.poster=item.poster_url||'';video.controls=true;video.playsInline=true;content.append(video);video.play().catch(()=>{});}}else{const big=document.createElement('img');big.src=item.source==='static'?item.external_url:`/api/file/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.updated_at||'1')}`;big.alt=item.alt_text||item.title||'';content.append(big);}viewer.querySelector('.viewer-caption').textContent=item.caption||'';viewer.showModal();});
  }catch(error){
    console.info('Using original static gallery fallback.',error);
    // Any failure (including categories or rendering) restores the original cards.
    if(isPortfolio&&grid&&staticMarkup!==undefined){grid.innerHTML=staticMarkup;grid.classList.remove('soft-reveal','soft-revealed');grid.querySelectorAll('.portfolio-item').forEach(card=>card.classList.add('is-visible'));}
  }
  finally{grid?.classList.remove('dynamic-loading');}
});
