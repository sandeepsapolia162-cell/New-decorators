/* Smooth, branded transitions for same-site page navigation. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screen = document.createElement('div');
  screen.className = 'page-transition-screen sepolia-loader';
  screen.setAttribute('aria-hidden', 'true');
  const emblem = document.createElement('img');
  emblem.className = 'loader-emblem';
  emblem.src = '/images/favicon.png';
  emblem.alt = '';
  const brand = document.createElement('div');
  brand.className = 'loader-brand';
  brand.innerHTML = 'SEPOLIA<span>DECORATORS &amp; CATERERS</span>';
  const line = document.createElement('div');
  line.className = 'loader-orbit';
  screen.append(emblem, brand, line);
  document.body.append(screen);

  let navigationStarted = false;
  const hideScreen = () => {
    screen.classList.remove('is-leaving', 'is-entering', 'is-loading');
  };
  // Fast first visits never flash a loader. If the document is still waiting
  // after a second, keep the branded screen up until all blocking resources load.
  const initialLoader = window.setTimeout(() => {
    if (document.readyState !== 'complete' && !navigationStarted) {
      screen.classList.add('is-loading');
    }
  }, 1000);
  window.addEventListener('load', () => {
    window.clearTimeout(initialLoader);
    hideScreen();
  }, { once: true });

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

    let destination;
    try { destination = new URL(link.href, window.location.href); } catch (_) { return; }
    if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return;

    event.preventDefault();
    navigationStarted = true;
    screen.classList.remove('is-loading', 'is-entering');
    screen.classList.add('is-leaving');
    const slowTimer = window.setTimeout(() => screen.classList.add('is-loading'), 1000);
    window.setTimeout(() => window.location.assign(destination.href), reducedMotion ? 0 : 380);
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted) hideScreen();
  });
})();
