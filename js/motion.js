/* Smooth, branded transitions for same-site page navigation. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screen = document.createElement('div');
  screen.className = 'page-transition-screen';
  screen.setAttribute('aria-hidden', 'true');

  const sourceBrand = document.querySelector('.navbar .logo');
  if (sourceBrand) {
    const brand = sourceBrand.cloneNode(true);
    brand.classList.add('page-transition-brand');
    brand.setAttribute('tabindex', '-1');
    brand.querySelectorAll('a').forEach(link => {
      link.removeAttribute('href');
      link.setAttribute('tabindex', '-1');
    });
    screen.append(brand);
  }
  document.body.append(screen);

  const revealPage = () => {
    screen.classList.remove('is-leaving');
    screen.classList.add('is-entering');
    window.setTimeout(() => screen.classList.remove('is-entering'), reducedMotion ? 0 : 700);
  };

  if (reducedMotion) {
    screen.remove();
  } else {
    revealPage();
  }

  document.addEventListener('click', event => {
    if (reducedMotion || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

    let destination;
    try { destination = new URL(link.href, window.location.href); } catch (_) { return; }
    if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return;

    event.preventDefault();
    screen.classList.remove('is-entering');
    screen.classList.add('is-leaving');
    window.setTimeout(() => window.location.assign(destination.href), 350);
  });

  window.addEventListener('pageshow', event => {
    if (!event.persisted || reducedMotion) return;
    revealPage();
  });
})();
