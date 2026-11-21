/* Adaptive 1-second loader & directional flow transitions for Sepolia Decorators. */
(() => {
  const FAST_THRESHOLD_MS = 1000;   // 1 second threshold
  const MIN_LOADER_MS = 450;        // Minimum display time once loader appears (prevents flicker)
  const EXIT_FLOW_WAIT_MS = 420;    // Wait for exit wave before navigating
  const SAFETY_TIMEOUT_MS = 12000;  // Failsafe so loader can never get stuck

  const NAV_KEY = 'sd_nav_mode';
  const DIR_KEY = 'sd_nav_dir';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let isNavigating = false;

  // Build branded Sepolia loader overlay (same structure as existing site)
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

  const orbit = document.createElement('div');
  orbit.className = 'loader-orbit';

  screen.append(emblem, brand, orbit);
  document.body.append(screen);

  // Keep body visible with script.js's existing .page-loaded convention
  document.body.classList.add('page-loaded');

  function isSlowNetwork() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    return Boolean(
      conn.saveData ||
      conn.effectiveType === 'slow-2g' ||
      conn.effectiveType === '2g'
    );
  }

  function showLoader() {
    if (!root.classList.contains('sd-show-loader')) {
      window.__SD_LOADER_SHOWN_AT__ = performance.now();
      root.classList.remove('sd-flow-prep');
      root.classList.add('sd-show-loader');
    }
    screen.classList.add('is-active');
  }

  function hideLoader() {
    if (window.__SD_LOADER_TIMER__) {
      clearTimeout(window.__SD_LOADER_TIMER__);
      window.__SD_LOADER_TIMER__ = null;
    }

    if (!root.classList.contains('sd-show-loader') && !screen.classList.contains('is-active')) {
      return;
    }

    const elapsed = performance.now() - (window.__SD_LOADER_SHOWN_AT__ || 0);
    const remaining = Math.max(0, MIN_LOADER_MS - elapsed);

    window.setTimeout(() => {
      root.classList.remove('sd-show-loader');
      screen.classList.remove('is-active');
    }, remaining);
  }

  /**
   * Picks non-nested visible items on screen so every visible piece
   * (navbar, hero text/buttons, section blocks, cards, footer) flows smoothly.
   */
  function getFlowItems() {
    const candidates = [];
    const pushVisible = el => {
      if (!el || el === screen || el.classList.contains('lightbox')) return;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'LINK') return;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      // Focus on items in or near the viewport so the wave feels immediate
      if (rect.bottom < -120 || rect.top > window.innerHeight + 240) return;
      candidates.push(el);
    };

    const nav = document.querySelector('nav.navbar');
    if (nav) pushVisible(nav);

    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
      Array.from(heroContent.children).forEach(pushVisible);
      const indicator = document.querySelector('.scroll-indicator');
      if (indicator) pushVisible(indicator);
    }

    const pageHeader = document.querySelector('header.page-header');
    if (pageHeader) {
      const container = pageHeader.querySelector('.container') || pageHeader;
      Array.from(container.children).forEach(pushVisible);
    }

    document.querySelectorAll('body > section, body > main > *, body > footer').forEach(block => {
      const rect = block.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > window.innerHeight + 240) return;
      const inner = block.querySelector(':scope > .container');
      if (inner && inner.children.length > 0) {
        Array.from(inner.children).forEach(pushVisible);
      } else {
        pushVisible(block);
      }
    });

    // Remove any element that is a descendant of another selected item
    const unique = candidates.filter((el, idx, arr) =>
      arr.indexOf(el) === idx && !arr.some(other => other !== el && other.contains(el))
    );

    unique.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    return unique;
  }

  /**
   * Determines whether the clicked link moves forward (left exit) or backward (right exit)
   * based on its position in the navbar relative to the current page.
   */
  function getDirection(destinationUrl) {
    const navLinks = Array.from(document.querySelectorAll('.navbar .nav-links a[href]'));
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
    const targetPath = destinationUrl.pathname.replace(/\/index\.html$/, '/');

    const currentIdx = navLinks.findIndex(a => {
      try {
        return new URL(a.href, window.location.href).pathname.replace(/\/index\.html$/, '/') === currentPath;
      } catch (_) { return false; }
    });

    const targetIdx = navLinks.findIndex(a => {
      try {
        return new URL(a.href, window.location.href).pathname.replace(/\/index\.html$/, '/') === targetPath;
      } catch (_) { return false; }
    });

    if (currentIdx !== -1 && targetIdx !== -1 && targetIdx < currentIdx) {
      return 'back';
    }
    return 'forward';
  }

  function clearFlowClasses() {
    document.querySelectorAll('.sd-flow-item').forEach(el => {
      el.classList.remove(
        'sd-flow-item',
        'sd-flow-exit-left',
        'sd-flow-exit-right',
        'sd-flow-pre-from-right',
        'sd-flow-pre-from-left',
        'sd-flow-enter'
      );
      el.style.removeProperty('--sd-delay');
    });
  }

  function runEnterFlow() {
    const mode = sessionStorage.getItem(NAV_KEY);
    const dir = sessionStorage.getItem(DIR_KEY) || 'forward';
    sessionStorage.removeItem(NAV_KEY);
    sessionStorage.removeItem(DIR_KEY);

    if (reducedMotion || mode !== 'flow' || root.classList.contains('sd-show-loader')) {
      root.classList.remove('sd-flow-prep');
      return;
    }

    const items = getFlowItems();
    const preClass = dir === 'back' ? 'sd-flow-pre-from-left' : 'sd-flow-pre-from-right';

    items.forEach((el, i) => {
      el.classList.add('sd-flow-item', preClass);
      el.style.setProperty('--sd-delay', `${Math.min(i * 35, 240)}ms`);
    });

    // Force layout before animating into place
    void document.body.offsetHeight;
    root.classList.remove('sd-flow-prep');

    requestAnimationFrame(() => {
      items.forEach(el => {
        el.classList.remove(preClass);
        el.classList.add('sd-flow-enter');
      });

      window.setTimeout(clearFlowClasses, 760);
    });
  }

  function runExitFlowAndNavigate(targetHref, dir) {
    if (reducedMotion) {
      window.location.assign(targetHref);
      return;
    }

    const items = getFlowItems();
    const exitClass = dir === 'back' ? 'sd-flow-exit-right' : 'sd-flow-exit-left';

    items.forEach((el, i) => {
      el.classList.add('sd-flow-item');
      el.style.setProperty('--sd-delay', `${Math.min(i * 32, 200)}ms`);
    });

    void document.body.offsetHeight;

    requestAnimationFrame(() => {
      items.forEach(el => el.classList.add(exitClass));
    });

    window.setTimeout(() => {
      window.location.assign(targetHref);
    }, EXIT_FLOW_WAIT_MS);
  }

  // Fallback check in case the inline <head> snippet wasn't added yet
  const initialMode = sessionStorage.getItem(NAV_KEY);
  if (initialMode === 'slow' || (!initialMode && isSlowNetwork())) {
    showLoader();
  } else if (!window.__SD_LOADER_TIMER__ && document.readyState !== 'complete') {
    window.__SD_LOADER_TIMER__ = window.setTimeout(() => {
      if (document.readyState !== 'complete') showLoader();
    }, FAST_THRESHOLD_MS);
  }

  // Run incoming flow as soon as DOM is ready
  runEnterFlow();

  // Hide loader once full page + images finish loading
  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }

  // Intercept same-site links in capture phase so script.js's old 500ms handler doesn't interfere
  document.addEventListener('click', event => {
    if (isNavigating || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

    const rawHref = link.getAttribute('href') || '';
    if (
      !rawHref ||
      rawHref.startsWith('#') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:') ||
      rawHref.startsWith('javascript:')
    ) {
      return;
    }

    let destination;
    try {
      destination = new URL(link.href, window.location.href);
    } catch (_) {
      return;
    }

    if (destination.origin !== window.location.origin) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) {
      return;
    }

    // Stop script.js's older click transition from running in parallel
    event.preventDefault();
    event.stopImmediatePropagation();
    isNavigating = true;

    const dir = getDirection(destination);

    // Slow network detected immediately: skip flow, show logo loader
    if (isSlowNetwork()) {
      sessionStorage.setItem(NAV_KEY, 'slow');
      showLoader();
      window.location.assign(destination.href);
      return;
    }

    // Race a pre-fetch of the target page against the 1-second threshold
    const controller = new AbortController();
    let settled = false;

    const slowTimer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      controller.abort();
      sessionStorage.setItem(NAV_KEY, 'slow');
      showLoader();
      window.location.assign(destination.href);
    }, FAST_THRESHOLD_MS);

    fetch(destination.href, {
      credentials: 'same-origin',
      signal: controller.signal
    })
      .then(res => {
        if (settled) return;
        settled = true;
        clearTimeout(slowTimer);

        if (res.ok) {
          sessionStorage.setItem(NAV_KEY, 'flow');
          sessionStorage.setItem(DIR_KEY, dir);
          runExitFlowAndNavigate(destination.href, dir);
        } else {
          sessionStorage.setItem(NAV_KEY, 'slow');
          showLoader();
          window.location.assign(destination.href);
        }
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(slowTimer);
        sessionStorage.setItem(NAV_KEY, 'slow');
        showLoader();
        window.location.assign(destination.href);
      });
  }, true);

  // Clean up if user navigates back/forward from browser cache (bfcache)
  window.addEventListener('pageshow', event => {
    isNavigating = false;
    document.body.classList.add('page-loaded');
    if (event.persisted) {
      root.classList.remove('sd-show-loader', 'sd-flow-prep');
      screen.classList.remove('is-active');
      clearFlowClasses();
    }
  });

  // Failsafe timeout
  window.setTimeout(hideLoader, SAFETY_TIMEOUT_MS);
})();
