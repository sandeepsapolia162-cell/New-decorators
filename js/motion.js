/* Public-page motion only. GSAP, ScrollTrigger and Lenis are self-hosted in js/vendor. */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { gsap, ScrollTrigger, Lenis } = window;
  if (reduced || !gsap || !ScrollTrigger || !Lenis) return;

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out', duration: 1 });

  // Sync Lenis with GSAP's ticker so image motion follows the same scroll position.
  const lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // A short brand intro runs only on the first page opened in this browser session.
  const isHome = location.pathname === '/' || /\/index\.html$/i.test(location.pathname);
  let introSeen = false;
  try { introSeen = sessionStorage.getItem('sepolia-cinematic-intro') === '1'; } catch (_) {}
  if (isHome && !introSeen) {
    const logo = document.querySelector('.navbar .logo');
    const loader = document.createElement('div');
    loader.className = 'motion-intro-loader';
    loader.setAttribute('aria-hidden', 'true');
    const brand = document.createElement('div');
    brand.className = 'motion-intro-brand';
    const name = document.createElement('div');
    name.textContent = logo?.childNodes[0]?.textContent?.trim() || 'SEPOLIA';
    const tagline = document.createElement('span');
    tagline.textContent = logo?.querySelector('span')?.textContent?.trim() || '';
    brand.append(name, tagline);
    loader.append(brand);
    document.body.append(loader);
    document.body.classList.add('motion-intro-active');
    try { sessionStorage.setItem('sepolia-cinematic-intro', '1'); } catch (_) {}

    gsap.fromTo(brand, { autoAlpha: 0, y: 18, scale: .96 }, { autoAlpha: 1, y: 0, scale: 1, duration: .55, ease: 'power2.out' });
    gsap.to(loader, { autoAlpha: 0, delay: .88, duration: .42, ease: 'power2.inOut', onComplete: () => {
      loader.remove();
      document.body.classList.remove('motion-intro-active');
      revealHero();
    }});
    window.setTimeout(() => { if (loader.isConnected) { loader.remove(); document.body.classList.remove('motion-intro-active'); revealHero(); } }, 1600);
  } else {
    revealHero();
  }

  // The hero collage settles first; the existing headline and calls to action follow.
  function revealHero() {
    const panels = gsap.utils.toArray('.hero-collage-panel');
    if (panels.length) gsap.fromTo(panels,
      { autoAlpha: 0, y: 44, scale: 1.12, rotateX: 5, transformPerspective: 900 },
      { autoAlpha: 1, y: 0, scale: 1, rotateX: 0, duration: 1.25, stagger: .12, ease: 'power3.out' });
    const content = gsap.utils.toArray('.hero-content > *');
    if (content.length) gsap.fromTo(content,
      { autoAlpha: 0, y: 24, scale: .985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: .78, stagger: .11, delay: panels.length ? .42 : .08, ease: 'power3.out', clearProps: 'transform' });
  }

  // Existing sections and cards enter on scroll without moving their layout boxes.
  gsap.utils.toArray('.contact-container > *, .footer-grid > div').forEach((item, index) => {
    gsap.fromTo(item, { autoAlpha: 0, y: 24 }, {
      autoAlpha: 1, y: 0, duration: .9, delay: (index % 4) * .06, ease: 'power3.out', clearProps: 'transform',
      scrollTrigger: { trigger: item, start: 'top 86%', once: true }
    });
  });

  // Gallery photographs brighten and ease out of a slow, cinematic zoom as they arrive.
  gsap.utils.toArray('.portfolio-item img, .decor-img img, .video-gallery-card img').forEach(image => {
    gsap.fromTo(image, { scale: 1.09, filter: 'brightness(.62) saturate(.88)' }, {
      scale: 1, filter: 'brightness(1) saturate(1)', ease: 'none',
      scrollTrigger: { trigger: image, start: 'top bottom', end: 'center 58%', scrub: .8 }
    });
  });

  // Full-bleed and feature sections carry a restrained parallax shift while in view.
  gsap.utils.toArray('.page-header').forEach(media => {
    gsap.fromTo(media, { yPercent: -2 }, {
      yPercent: 2, ease: 'none', scrollTrigger: { trigger: media, start: 'top top', end: 'bottom top', scrub: .7 }
    });
  });

  // Existing menu links become a full-screen, staggered overlay on mobile.
  const menuButton = document.querySelector('.hamburger');
  const menu = document.querySelector('.nav-links');
  if (menuButton && menu) menuButton.addEventListener('click', () => {
    requestAnimationFrame(() => {
      if (!menu.classList.contains('active')) return;
      gsap.fromTo(menu.querySelectorAll('li'), { autoAlpha: 0, y: 18 }, {
        autoAlpha: 1, y: 0, duration: .42, stagger: .055, ease: 'power2.out', clearProps: 'all'
      });
    });
  });

  // Newly inserted portfolio/video items receive the same photograph treatment.
  const grids = document.querySelectorAll('.portfolio-grid, .video-gallery-grid, .featured-video-grid');
  if (grids.length && 'MutationObserver' in window) {
    const animateAdded = nodes => nodes.forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      const images = [...(node.matches('img') ? [node] : []), ...node.querySelectorAll('img')];
      images.forEach(image => gsap.fromTo(image, { scale: 1.08, filter: 'brightness(.62)' }, {
        scale: 1, filter: 'brightness(1)', duration: 1.1, ease: 'power3.out', clearProps: 'filter'
      }));
    });
    const observer = new MutationObserver(records => records.forEach(record => animateAdded([...record.addedNodes])));
    grids.forEach(grid => observer.observe(grid, { childList: true }));
  }

  ScrollTrigger.refresh();
})();
