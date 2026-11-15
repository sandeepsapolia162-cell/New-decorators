/* Dynamic enhancements preserve the original HTML if the public API is unavailable. */
const CATEGORY_LABELS = {
  'front-gate': 'Entrance',
  walkway: 'WALKWAY',
  ceiling: 'Draping',
  indoor: 'INDOOR'
};

// Accept either database slugs or the visible category names used by the site.
function categoryKey(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  const aliases = {
    entrance: 'front-gate',
    'frontgate': 'front-gate',
    'front-gate': 'front-gate',
    walkway: 'walkway',
    draping: 'ceiling',
    ceiling: 'ceiling',
    indoor: 'indoor'
  };
  return aliases[key] || key;
}

document.addEventListener('DOMContentLoaded', async () => {
  const isPortfolio = /\/portfolio(?:\.html)?\/?$/.test(location.pathname);
  const isDecoration = /\/decoration(?:\.html)?\/?$/.test(location.pathname);
  if (!isPortfolio && !isDecoration) return;

  const grid = document.querySelector('.portfolio-grid');
  const filterBox = document.querySelector('.portfolio-filters');
  const originalGrid = grid?.innerHTML;
  const originalFilters = filterBox?.innerHTML;
  const originalCards = grid ? [...grid.querySelectorAll(':scope > .portfolio-item')] : [];
  if (isPortfolio && grid) grid.classList.add('dynamic-loading');

  // The static gallery also gets usable counted filters before the API responds.
  if(isPortfolio&&grid&&filterBox){
    const addCount=(button,count)=>{const badge=document.createElement('span');badge.className='filter-count';badge.textContent=String(count);button.append(badge);};
    if(!filterBox.querySelector('[data-filter="all"]')){const all=document.createElement('button');all.className='filter-btn';all.dataset.filter='all';all.textContent='All';filterBox.prepend(all);}
    filterBox.querySelectorAll('.filter-btn').forEach(button=>{const key=categoryKey(button.dataset.filter);if(button.querySelector('.filter-count'))return;button.textContent=button.dataset.filter==='all'?'All':(CATEGORY_LABELS[key]||button.textContent.trim());addCount(button,button.dataset.filter==='all'?originalCards.length:originalCards.filter(card=>categoryKey(card.dataset.category)===key).length);});
    filterBox.addEventListener('click',event=>{const button=event.target.closest('.filter-btn');if(!button)return;filterBox.querySelectorAll('.filter-btn').forEach(item=>item.classList.toggle('active',item===button));grid.querySelectorAll('.portfolio-item').forEach(card=>card.hidden=button.dataset.filter!=='all'&&categoryKey(card.dataset.category)!==button.dataset.filter);});
  }

  try {
    // Reveal only sections and filters. The gallery itself is visible without an observer.
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('soft-revealed');
          observer.unobserve(entry.target);
        }
      }), { rootMargin: '0px 0px -40px 0px', threshold: .05 });
      document.querySelectorAll('.decor-section, .portfolio-filters').forEach(element => {
        element.classList.add('soft-reveal');
        observer.observe(element);
      });
    }

    const response = await fetch('/api/media', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Media API returned ${response.status}`);
    const media = await response.json();

    if (isDecoration) {
      if (!Array.isArray(media) || media.length === 0) return;
      const groups = ['front-gate', 'walkway', 'ceiling', 'indoor'];
      document.querySelectorAll('.decor-section').forEach((section, index) => {
        const image = section.querySelector('.decor-img img');
        if (!image) return;
        const originalPath = new URL(image.src, location.href).pathname;
        const candidate = media.find(item => item.type === 'image' && categoryKey(item.category) === groups[index] && item.source === 'static' && item.external_url === originalPath)
          || media.find(item => item.type === 'image' && categoryKey(item.category) === groups[index]);
        if (candidate) {
          image.src = candidate.source === 'static' ? candidate.external_url : `/api/file/${encodeURIComponent(candidate.id)}`;
          image.dataset.mediaId = candidate.id;
        }
      });
      return;
    }

    // Empty, malformed, or unavailable API data leaves every original card in place.
    if (!grid || !Array.isArray(media) || media.length === 0) return;
    const categoryResponse = await fetch('/api/categories', { headers: { Accept: 'application/json' } });
    if (!categoryResponse.ok) throw new Error(`Category API returned ${categoryResponse.status}`);
    const categories = await categoryResponse.json();
    if (!Array.isArray(categories)) throw new Error('Category API did not return a list');

    const originalFilterLabels = new Map((filterBox ? [...filterBox.querySelectorAll('.filter-btn')] : [])
      .map(button => [categoryKey(button.dataset.filter), button.textContent.trim()]));

    // Build all dynamic cards off-screen first; any construction error leaves the old grid intact.
    const dynamicByCategory = new Map();
    const renderedItems = [];
    for (const item of media) {
      if (!item || !['image', 'video'].includes(item.type) || !item.id || !item.category) continue;
      const key = categoryKey(item.category);
      const card = document.createElement('div');
      card.className = 'portfolio-item is-visible';
      card.dataset.category = key;
      card.dataset.mediaId = item.id;

      const version = encodeURIComponent(item.updated_at || '1');
      const image = document.createElement('img');
      image.src = item.source === 'static'
        ? item.external_url
        : item.type === 'image'
          ? `/api/file/${encodeURIComponent(item.id)}?v=${version}`
          : item.poster_url || '';
      image.alt = item.alt_text || item.title || '';
      image.loading = renderedItems.length < 8 ? 'eager' : 'lazy';
      image.decoding = 'async';
      if (Number(item.width) > 0 && Number(item.height) > 0) {
        image.width = Number(item.width);
        image.height = Number(item.height);
      }
      image.className = 'media-fade';
      card.append(image);

      if (item.type === 'video') {
        card.classList.add('video-item');
        const play = document.createElement('span');
        play.className = 'media-play';
        play.setAttribute('aria-hidden', 'true');
        play.textContent = '▶';
        card.append(play);
      }

      const overlay = document.createElement('div');
      overlay.className = 'portfolio-overlay';
      const label = document.createElement('span');
      label.className = 'portfolio-category';
      label.textContent = ({ 'front-gate': 'Front Gate', walkway: 'Walkway', ceiling: 'Ceiling', indoor: 'Indoor' })[key] || item.category;
      overlay.append(label);
      card.append(overlay);

      const order = Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : renderedItems.length;
      renderedItems.push({ item, key, order, card });
      if (!dynamicByCategory.has(key)) dynamicByCategory.set(key, []);
      dynamicByCategory.get(key).push({ node: card, order });
    }

    // If nothing could be rendered, retain the complete static HTML gallery.
    if (renderedItems.length === 0) return;

    // For any category with no visible/renderable API items, keep its original cards.
    const staticCategories = new Set(originalCards.map(card => categoryKey(card.dataset.category)));
    const orderEntries = [...renderedItems.map(entry => ({ node: entry.card, order: entry.order, key: entry.key }))];
    originalCards.forEach((card, index) => {
      const key = categoryKey(card.dataset.category);
      if (!dynamicByCategory.has(key)) {
        orderEntries.push({ node: card.cloneNode(true), order: index, key, staticFallback: true });
      }
    });
    orderEntries.sort((a, b) => a.order - b.order || Number(Boolean(a.staticFallback)) - Number(Boolean(b.staticFallback)));

    // Keep the familiar filter labels while matching by stable database category slugs.
    if (filterBox) {
      const filters = document.createDocumentFragment();
      const all = document.createElement('button');
      all.className = 'filter-btn active';
      all.dataset.filter = 'all';
      all.textContent = 'All';
      const allCount=document.createElement('span');allCount.className='filter-count';allCount.textContent=String(orderEntries.length);all.append(allCount);
      filters.append(all);
      const categoryByKey = new Map(categories.map(category => [categoryKey(category.name || category.slug), category]));
      const keys = [...new Set([
        ...categories.map(category => categoryKey(category.name || category.slug)),
        ...staticCategories,
        ...renderedItems.map(entry => entry.key)
      ])];
      for (const key of keys) {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.dataset.filter = key;
        button.append(document.createTextNode(CATEGORY_LABELS[key] || originalFilterLabels.get(key) || categoryByKey.get(key)?.name || key));
        const count=document.createElement('span');count.className='filter-count';count.textContent=String(orderEntries.filter(entry=>entry.key===key).length);button.append(count);
        filters.append(button);
      }
      filterBox.replaceChildren(filters);
    }

    // Commit only after at least one item has been constructed successfully.
    const fragment = document.createDocumentFragment();
    for (const entry of orderEntries) fragment.append(entry.node);
    grid.replaceChildren(fragment);
    // script.js initializes hearts before this deferred API render replaces the
    // static cards. Re-run its idempotent injector after dynamic cards are in place.
    if (typeof LikeManager !== 'undefined' && typeof LikeManager.injectHearts === 'function') LikeManager.injectHearts();

    const applyFilter = filter => grid.querySelectorAll('.portfolio-item').forEach(card => {
      card.hidden = filter !== 'all' && categoryKey(card.dataset.category) !== filter;
    });
    filterBox?.addEventListener('click', event => {
      const button = event.target.closest('.filter-btn');
      if (!button) return;
      filterBox.querySelectorAll('.filter-btn').forEach(candidate => candidate.classList.toggle('active', candidate === button));
      applyFilter(button.dataset.filter);
    });
    const requestedKey = categoryKey(new URLSearchParams(location.search).get('category'));
    const initial = requestedKey && requestedKey !== ''
      ? [...(filterBox?.querySelectorAll('.filter-btn') || [])].find(button => button.dataset.filter === requestedKey)
      : null;
    (initial || filterBox?.querySelector('.filter-btn[data-filter="all"]'))?.click();

    const revealImages=()=>grid.querySelectorAll('img').forEach(image=>image.classList.add('loaded'));
    grid.querySelectorAll('img').forEach(image => {
      if (image.complete) image.classList.add('loaded');
      else image.addEventListener('load', () => image.classList.add('loaded'), { once: true });
      image.addEventListener('error',()=>image.classList.add('loaded'),{once:true});
    });
    window.setTimeout(revealImages,2000);

    const viewer = document.createElement('dialog');
    viewer.className = 'dynamic-viewer';
    viewer.setAttribute('aria-label', 'Media preview');
    viewer.innerHTML = '<button class="viewer-close" aria-label="Close preview">×</button><button class="viewer-nav viewer-prev" aria-label="Previous item">‹</button><div class="viewer-content"></div><button class="viewer-nav viewer-next" aria-label="Next item">›</button><p class="viewer-caption"></p><p class="viewer-counter" aria-live="polite"></p>';
    document.body.append(viewer);
    let viewerIndex=-1,touchX=null;
    const close = () => { viewer.close(); viewer.querySelector('.viewer-content').replaceChildren(); };
    viewer.querySelector('.viewer-close').onclick = close;
    const openEntry=entry=>{viewerIndex=renderedItems.indexOf(entry);const item=entry.item,content=viewer.querySelector('.viewer-content');content.replaceChildren();if(item.type==='video'){if(item.source==='youtube'||item.source==='vimeo'){const frame=document.createElement('iframe');frame.src=item.source==='youtube'?item.external_url.replace('https://www.youtube.com/watch?v=','https://www.youtube-nocookie.com/embed/'):item.external_url.replace('https://vimeo.com/','https://player.vimeo.com/video/');frame.title=item.title||'Portfolio video';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;content.append(frame);}else{const video=document.createElement('video');video.src=`/api/file/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.updated_at||'1')}`;video.poster=item.poster_url||'';video.controls=true;video.playsInline=true;content.append(video);}}else{const image=document.createElement('img');image.src=item.source==='static'?item.external_url:`/api/file/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.updated_at||'1')}`;image.alt=item.alt_text||item.title||'';content.append(image);}viewer.querySelector('.viewer-caption').textContent=item.caption||'';viewer.querySelector('.viewer-counter').textContent=`${viewerIndex+1} / ${renderedItems.length}`;for(const n of [-1,1]){const next=renderedItems[(viewerIndex+n+renderedItems.length)%renderedItems.length];if(next.item.type==='image'){const pre=new Image();pre.src=next.item.source==='static'?next.item.external_url:`/api/file/${encodeURIComponent(next.item.id)}`;}}if(!viewer.open)viewer.showModal();};
    const moveViewer=step=>{if(!renderedItems.length)return;openEntry(renderedItems[(viewerIndex+step+renderedItems.length)%renderedItems.length]);};
    viewer.querySelector('.viewer-prev').onclick=()=>moveViewer(-1);viewer.querySelector('.viewer-next').onclick=()=>moveViewer(1);
    viewer.addEventListener('touchstart',event=>{touchX=event.changedTouches[0].clientX;},{passive:true});viewer.addEventListener('touchend',event=>{if(touchX===null)return;const dx=event.changedTouches[0].clientX-touchX;if(Math.abs(dx)>45)moveViewer(dx<0?1:-1);touchX=null;},{passive:true});
    viewer.addEventListener('click', event => { if (event.target === viewer) close(); });
    document.addEventListener('keydown', event => { if (!viewer.open)return;if(event.key==='Escape')close();if(event.key==='ArrowLeft')moveViewer(-1);if(event.key==='ArrowRight')moveViewer(1); });
    grid.addEventListener('click', event => {
      const card = event.target.closest('.portfolio-item');
      if (!card) return;
      const entry = renderedItems.find(candidate => candidate.item.id === card.dataset.mediaId);
      if (!entry) return; // Static fallback cards keep their original lightbox behavior.
      // Let the site's established lightbox open so its like and WhatsApp
      // controls remain available for API-rendered images too.
    });
  } catch (error) {
    console.info('Using original static gallery fallback.', error);
    if (isPortfolio && grid && originalGrid !== undefined) {
      grid.innerHTML = originalGrid;
      grid.classList.remove('soft-reveal', 'soft-revealed');
      grid.querySelectorAll('.portfolio-item').forEach(card => card.classList.add('is-visible'));
      if (filterBox && originalFilters !== undefined) filterBox.innerHTML = originalFilters;
    }
  } finally {
    grid?.classList.remove('dynamic-loading');
  }
});
