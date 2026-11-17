// Reveal page content as it enters view and include media added after page load.
(() => {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window) || !document.body) return;

  const selector = [
    '.fade-up',
    '.page-header > *',
    '.services-preview > *',
    '.portfolio-grid > .portfolio-item',
    '.decor-section',
    '.contact-container > *',
    '.footer-grid > div',
    '.video-gallery-grid > *',
    '.featured-video-grid > *',
    '.menu-card'
  ].join(',');

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-inview');
      currentObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.08 });

  const groupIndexes = new WeakMap();
  const observeTarget = element => {
    if (!(element instanceof HTMLElement) || element.classList.contains('motion-reveal')) return;
    const group = element.parentElement;
    const index = group ? (groupIndexes.get(group) || 0) : 0;
    if (group) groupIndexes.set(group, index + 1);
    element.style.setProperty('--motion-delay', `${Math.min(index, 5) * 65}ms`);
    element.classList.add('motion-reveal');
    observer.observe(element);
  };

  const scan = node => {
    if (node instanceof HTMLElement && node.matches(selector)) observeTarget(node);
    node.querySelectorAll?.(selector).forEach(observeTarget);
  };

  document.body.classList.add('motion-ready');
  scan(document);

  const dynamicRoots = document.querySelectorAll('.portfolio-grid, .video-gallery-grid, .featured-video-grid');
  if (dynamicRoots.length && 'MutationObserver' in window) {
    const additions = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(scan));
    });
    dynamicRoots.forEach(root => additions.observe(root, { childList: true }));
  }
})();
