""/* ==========================================================================
   SEPOLIA DECORATORS & CATERERS - Core JavaScript
   ========================================================================== */

   const BUSINESS_CONFIG = {
    name: "Sepolia Decorators & Caterers",
    phone: "+91 7051129659", 
    whatsapp: "917051129659", 
    email: "contact@sepoliadecorators.in",
    location: "Jammu, Jammu and Kashmir, 181122 ",
    instagram: "https://instagram.com/sapolia_decorators",
    youtube: "https://youtube.com/@SepoliaDecorators" // Replace with your YouTube channel link
};

document.addEventListener('DOMContentLoaded', () => {

    // 1. Populate Config Data (Phone, Email, etc.)
    // 1. Populate Config Data (Phone, Email, Socials)
    document.querySelectorAll('[data-config]').forEach(el => {
        const key = el.getAttribute('data-config');
        if (BUSINESS_CONFIG[key]) {
            if (el.tagName === 'A') {
                if (key === 'phone') el.href = 'tel:' + BUSINESS_CONFIG[key].replace(/\s+/g, '');
                else if (key === 'email') el.href = 'mailto:' + BUSINESS_CONFIG[key];
                else if (key === 'whatsapp') el.href = 'https://wa.me/' + BUSINESS_CONFIG[key];
                else if (key === 'instagram') el.href = BUSINESS_CONFIG[key];
                else if (key === 'youtube') el.href = BUSINESS_CONFIG[key];
                
                if (el.textContent.trim() === '') el.textContent = BUSINESS_CONFIG[key];
            } else {
                el.textContent = BUSINESS_CONFIG[key];
            }
        }
    });

    // 2. Navbar Scroll Effect (Changes text color dynamically)
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // 3. Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // 4. Subtle Premium Fade-Up Animations
    const fadeElements = document.querySelectorAll('.fade-up');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    fadeElements.forEach(el => observer.observe(el));

    // ==========================================
// PORTFOLIO FILTERING (FORCE OVERRIDE)
// ==========================================
const filterBtns = document.querySelectorAll('.filter-btn');

if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Change active button color
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');
            const portfolioItems = document.querySelectorAll('.portfolio-item');

            portfolioItems.forEach(item => {
                const itemCategory = item.getAttribute('data-category');
                
                if (filterValue === 'all' || itemCategory === filterValue) {
                    // Force show
                    item.style.setProperty('display', 'block', 'important');
                } else {
                    // Force hide
                    item.style.setProperty('display', 'none', 'important');
                }
            });
        });
    });
}
// ==========================================
// LIGHTBOX (FIXED: NO EMPTY SPACE CLICKS)
// ==========================================
const portfolioGrid = document.querySelector('.portfolio-grid');

if (portfolioGrid) {
    portfolioGrid.addEventListener('click', (e) => {
        // Only trigger if an actual portfolio item (or its child) was clicked!
        const clickedItem = e.target.closest('.portfolio-item');
        
        if (!clickedItem) return; // If they clicked empty space, do nothing.

        const img = clickedItem.querySelector('img');
        if (img) {
            // Add your code here that opens the lightbox using img.src
            // Example:
            // document.getElementById('lightboxImg').src = img.src;
            // document.getElementById('lightbox').style.display = 'flex';
        }
    });
}

    // 6. LIGHTBOX GALLERY (Fullscreen Image Zoom/Viewer)
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        const lightboxImg = lightbox.querySelector('.lightbox-img');
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        let currentIndex = 0;
        let currentItems = [];

        // Open Lightbox when clicking any portfolio item
        document.addEventListener('click', (e) => {
            const portfolioItem = e.target.closest('.portfolio-item');
            if (portfolioItem) {
                // Get currently visible items (respecting active category filters)
                currentItems = Array.from(document.querySelectorAll('.portfolio-item')).filter(i => i.style.display !== 'none');
                currentIndex = currentItems.indexOf(portfolioItem);
                
                const img = portfolioItem.querySelector('img');
                if (img) {
                    lightboxImg.src = img.src;
                    lightbox.classList.add('active');
                }
            }
        });

        const updateLightbox = () => {
            if (currentItems.length > 0 && currentItems[currentIndex]) {
                const img = currentItems[currentIndex].querySelector('img');
                if (img) lightboxImg.src = img.src;
            }
        };

        const closeLightbox = () => { lightbox.classList.remove('active'); };
        
        const nextImage = () => {
            if (currentItems.length === 0) return;
            currentIndex = (currentIndex + 1) % currentItems.length;
            updateLightbox();
        };

        const prevImage = () => {
            if (currentItems.length === 0) return;
            currentIndex = (currentIndex - 1 + currentItems.length) % currentItems.length;
            updateLightbox();
        };

        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
        if (nextBtn) nextBtn.addEventListener('click', nextImage);
        if (prevBtn) prevBtn.addEventListener('click', prevImage);
        
        // Close if clicking outside the image background
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });

        // Keyboard Navigation (Esc to close, Left/Right arrows to flip images)
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
        });
    }

    // 7. WHATSAPP FORM SUBMISSION INTEGRATION
    const whatsappSubmitBtn = document.getElementById('whatsappSubmitBtn');
    if (whatsappSubmitBtn) {
        whatsappSubmitBtn.addEventListener('click', () => {
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
            const eventType = document.getElementById('eventType').value.trim();
            const eventDate = document.getElementById('eventDate').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !phone) {
                alert('Please fill out at least your Name and Phone Number before sending via WhatsApp.');
                return;
            }

            let text = `*New Event Inquiry from Website*\n\n`;
            text += `👤 *Name:* ${name}\n`;
            text += `📞 *Phone:* ${phone}\n`;
            if (email) text += `✉️ *Email:* ${email}\n`;
            if (eventType) text += `🎉 *Event Type:* ${eventType}\n`;
            if (eventDate) text += `📅 *Date:* ${eventDate}\n`;
            text += `💬 *Message:* ${message}\n`;

            const encodedText = encodeURIComponent(text);
            const targetNumber = BUSINESS_CONFIG.whatsapp; 
            const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodedText}`;
            window.open(whatsappUrl, '_blank');
        });
    }
    // ==========================================
// ASYNC FORMSPREE SUBMISSION (NO REDIRECT)
// ==========================================
const ajaxContactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const emailSubmitBtn = document.getElementById('emailSubmitBtn');

if (ajaxContactForm) {
    ajaxContactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Loading state
        emailSubmitBtn.disabled = true;
        emailSubmitBtn.textContent = 'Sending...';
        formStatus.style.display = 'block';
        formStatus.style.color = 'var(--clr-accent)';
        formStatus.textContent = 'Sending your inquiry...';

        const formData = new FormData(ajaxContactForm);

        try {
            const response = await fetch(ajaxContactForm.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                formStatus.style.color = '#2e7d32';
                formStatus.innerHTML = '✨ <strong>Thank you!</strong> Your inquiry has been sent. We will get in touch shortly.';
                ajaxContactForm.reset();
            } else {
                const data = await response.json();
                formStatus.style.color = '#c62828';
                formStatus.textContent = data.errors ? data.errors.map(err => err.message).join(', ') : 'Unable to submit inquiry. Please try WhatsApp instead.';
            }
        } catch (error) {
            formStatus.style.color = '#c62828';
            formStatus.textContent = 'Network error. Please try sending via WhatsApp or calling directly.';
        } finally {
            emailSubmitBtn.disabled = false;
            emailSubmitBtn.textContent = 'Send Inquiry (Email)';
        }
    });
}
});
// ==========================================
// AUTO-FILTER PORTFOLIO FROM URL PARAMETERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Check if we are on the portfolio page and if there is a category in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryToOpen = urlParams.get('category');

    if (categoryToOpen) {
        // 2. Find the button that matches the category from the link
        const targetButton = document.querySelector(`.filter-btn[data-filter="${categoryToOpen}"]`);
        
        if (targetButton) {
            // 3. Programmatically "click" the button to trigger your existing filter logic!
            setTimeout(() => {
                targetButton.click();
            }, 100); // Tiny 100ms delay ensures the grid has loaded before filtering
        }
    }
});
// ==========================================
// SCROLL ANIMATIONS (INTERSECTION OBSERVER)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Set up the observer rules
    const observerOptions = {
        root: null,
        rootMargin: '800px', // Tells the browser to trigger 800px BEFORE you reach the image
        threshold: 0 
    };

    // 2. Create the observer
    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add the visible class to trigger the CSS animation
                entry.target.classList.add('is-visible');
                // Stop observing once animated so it doesn't repeat infinitely
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 3. Find all elements that need animating and observe them
    const animatedElements = document.querySelectorAll('.fade-up, .portfolio-item, .service-card');
    
    animatedElements.forEach(el => {
        scrollObserver.observe(el);
    });
});
// ==========================================
// PREMIUM MOBILE MENU TOGGLE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        // Remove any old click listeners by cloning the button
        const newHamburger = hamburger.cloneNode(true);
        hamburger.parentNode.replaceChild(newHamburger, hamburger);
        
        // Add the new click logic
        newHamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            newHamburger.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });

        // Close menu if user clicks the dark overlay outside the menu
        document.addEventListener('click', (e) => {
            if (document.body.classList.contains('menu-open') && !navLinks.contains(e.target) && !newHamburger.contains(e.target)) {
                navLinks.classList.remove('active');
                newHamburger.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    }
});
// ==========================================
// FLOATING WHATSAPP BUTTON (EXCEPT CONTACT PAGE)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if the current URL does NOT contain 'contact.html'
    if (!window.location.href.includes('contact.html')) {
        const waButton = document.createElement('a');
        waButton.href = 'https://wa.me/917051129659'; // Your exact WhatsApp number
        waButton.target = '_blank';
        waButton.className = 'whatsapp-float';
        
        // Crisp, lightweight WhatsApp SVG Icon
        waButton.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
        `;
        
        document.body.appendChild(waButton);
    }
});
/* ============================================================
   SEPOLIA DECORATORS — UNIVERSAL BACK / HOME NAVIGATION
   Version: 1.0

   IMPORTANT:
   - Does NOT delete existing navigation code.
   - Uses completely unique IDs/classes.
   - Designed to coexist with previous back-button code.
   ============================================================ */

   (function () {
    "use strict";

    /* Prevent this module from being initialized twice */
    if (window.__SepoliaUniversalNavigationLoaded) return;
    window.__SepoliaUniversalNavigationLoaded = true;


    /* ------------------------------------------------------------
       CONFIGURATION
       ------------------------------------------------------------ */

    const CONFIG = {
        desktopMinWidth: 1025,
        tabletMinWidth: 768,

        /*
         * Add your actual hero ID here if you have one.
         * The script will try these selectors in order.
         */
        heroSelectors: [
            "#hero",
            "#home-hero",
            ".hero",
            ".hero-section",
            ".home-hero",
            ".main-hero",
            "[data-hero]"
        ]
    };


    /* ------------------------------------------------------------
       DEVICE DETECTION
       ------------------------------------------------------------ */

    function isDesktop() {
        return window.matchMedia(
            `(min-width: ${CONFIG.desktopMinWidth}px)`
        ).matches;
    }

    function isTablet() {
        return window.matchMedia(
            `(min-width: ${CONFIG.tabletMinWidth}px) and (max-width: ${CONFIG.desktopMinWidth - 1}px)`
        ).matches;
    }

    function isMobile() {
        return window.matchMedia(
            `(max-width: ${CONFIG.tabletMinWidth - 1}px)`
        ).matches;
    }


    /* ------------------------------------------------------------
       HOMEPAGE DETECTION
       ------------------------------------------------------------ */

    function isHomePage() {
        const path = window.location.pathname.toLowerCase();

        return (
            path === "/" ||
            path === "/index.html" ||
            path.endsWith("/index.html")
        );
    }


    /* ------------------------------------------------------------
       FIND HERO SECTION
       ------------------------------------------------------------ */

    function getHeroSection() {
        for (const selector of CONFIG.heroSelectors) {
            const element = document.querySelector(selector);

            if (element) {
                return element;
            }
        }

        /*
         * Fallback:
         * Look for a large section near the beginning of the page.
         */
        const sections = document.querySelectorAll(
            "main > section, body > section, section"
        );

        for (const section of sections) {
            const rect = section.getBoundingClientRect();

            if (
                rect.height > window.innerHeight * 0.5 &&
                rect.top < window.innerHeight
            ) {
                return section;
            }
        }

        return null;
    }


    /* ------------------------------------------------------------
       CREATE DESKTOP ARROW
       ------------------------------------------------------------ */

    function createDesktopArrow() {

        if (document.getElementById("sepolia-universal-back-arrow")) {
            return document.getElementById(
                "sepolia-universal-back-arrow"
            );
        }

        const button = document.createElement("button");

        button.id = "sepolia-universal-back-arrow";
        button.className = "sepolia-universal-back-arrow";

        button.type = "button";
        button.setAttribute("aria-label", "Go back");
        button.setAttribute("title", "Go back");

        /*
         * Simple arrow.
         * No text.
         */
        button.innerHTML = `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
            >
                <path
                    d="M15 5L8 12L15 19"
                />
            </svg>
        `;

        document.querySelector('.navbar .logo')?.before(button);

        return button;
    }


    /* ------------------------------------------------------------
       CREATE MOBILE HOME BUTTON
       ------------------------------------------------------------ */

    function createMobileHomeButton() {

        if (document.getElementById("sepolia-mobile-home-button")) {
            return document.getElementById(
                "sepolia-mobile-home-button"
            );
        }

        const button = document.createElement("button");

        button.id = "sepolia-mobile-home-button";
        button.className = "sepolia-mobile-home-button";

        button.type = "button";
        button.setAttribute("aria-label", "Return to top");
        button.setAttribute("title", "Return to home");

        button.innerHTML = `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
            >
                <path
                    d="M3 11.5L12 4L21 11.5"
                />
                <path
                    d="M5.5 10V20H18.5V10"
                />
            </svg>
        `;

        document.body.appendChild(button);

        return button;
    }


    /* ------------------------------------------------------------
       SCROLL TO HERO
       ------------------------------------------------------------ */

    function scrollToHero() {

        const hero = getHeroSection();

        if (!hero) {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

            return;
        }

        hero.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    /* ------------------------------------------------------------
       HISTORY / BACK FUNCTION
       ------------------------------------------------------------ */

    function goBackSafely() {

        /*
         * history.back() is the closest equivalent to
         * the browser's actual Back button.
         */

        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        /*
         * If the page was opened directly and there is no
         * useful browser history, safely return home.
         */

        if (!isHomePage()) {
            window.location.href = "index.html";
        }
    }


    /* ------------------------------------------------------------
       DESKTOP ARROW CLICK
       ------------------------------------------------------------ */

    function handleDesktopArrowClick() {

        if (isHomePage()) {

            /*
             * On homepage the arrow means:
             * "return to hero".
             */

            scrollToHero();

        } else {

            /*
             * On every other page it means:
             * "return to actual previous location".
             */

            goBackSafely();
        }
    }


    /* ------------------------------------------------------------
       MOBILE HOME BUTTON CLICK
       ------------------------------------------------------------ */

    function handleMobileHomeClick() {
        scrollToHero();
    }


    /* ------------------------------------------------------------
       HOMEPAGE ARROW VISIBILITY
       ------------------------------------------------------------ */

    function updateHomepageNavigation() {

        const arrow = document.getElementById(
            "sepolia-universal-back-arrow"
        );

        const mobileButton = document.getElementById(
            "sepolia-mobile-home-button"
        );

        if (!arrow || !mobileButton) return;


        /*
         * Never show desktop arrow on mobile/tablet.
         */

        if (!isDesktop()) {
            arrow.classList.remove("sepolia-nav-visible");
        }


        /*
         * Desktop homepage behavior.
         */

        if (isHomePage() && isDesktop()) {

            const hero = getHeroSection();

            if (!hero) {
                arrow.classList.remove(
                    "sepolia-nav-visible"
                );

                return;
            }

            const heroBottom =
                hero.getBoundingClientRect().bottom;

            /*
             * Show arrow only after the hero has been
             * completely passed.
             */

            if (heroBottom <= 0) {

                arrow.classList.add(
                    "sepolia-nav-visible"
                );

            } else {

                arrow.classList.remove(
                    "sepolia-nav-visible"
                );
            }
        }


        /*
         * Desktop inner pages:
         * arrow stays visible.
         */

        else if (!isHomePage() && isDesktop()) {

            arrow.classList.add(
                "sepolia-nav-visible"
            );
        }


        /*
         * Mobile homepage.
         */

        if (isHomePage() && isMobile()) {

            const hero = getHeroSection();

            if (!hero) {
                mobileButton.classList.remove(
                    "sepolia-nav-visible"
                );

                return;
            }

            const heroBottom =
                hero.getBoundingClientRect().bottom;

            if (heroBottom <= 0) {

                mobileButton.classList.add(
                    "sepolia-nav-visible"
                );

            } else {

                mobileButton.classList.remove(
                    "sepolia-nav-visible"
                );
            }

        } else {

            mobileButton.classList.remove(
                "sepolia-nav-visible"
            );
        }
    }


    /* ------------------------------------------------------------
       INITIALIZE
       ------------------------------------------------------------ */

    function initializeNavigation() {

        const desktopArrow = createDesktopArrow();
        const mobileHome = createMobileHomeButton();


        /*
         * Avoid duplicate event listeners.
         */

        if (!desktopArrow.dataset.sepoliaNavigationBound) {

            desktopArrow.addEventListener(
                "click",
                handleDesktopArrowClick
            );

            desktopArrow.dataset.sepoliaNavigationBound = "true";
        }


        if (!mobileHome.dataset.sepoliaNavigationBound) {

            mobileHome.addEventListener(
                "click",
                handleMobileHomeClick
            );

            mobileHome.dataset.sepoliaNavigationBound = "true";
        }


        updateHomepageNavigation();
    }


    /* ------------------------------------------------------------
       SCROLL HANDLING
       ------------------------------------------------------------ */

    let scrollTicking = false;

    window.addEventListener(
        "scroll",
        function () {

            if (!scrollTicking) {

                window.requestAnimationFrame(function () {

                    updateHomepageNavigation();

                    scrollTicking = false;
                });

                scrollTicking = true;
            }
        },
        {
            passive: true
        }
    );


    /* ------------------------------------------------------------
       RESIZE HANDLING
       ------------------------------------------------------------ */

    window.addEventListener(
        "resize",
        updateHomepageNavigation,
        {
            passive: true
        }
    );


    /* ------------------------------------------------------------
       START
       ------------------------------------------------------------ */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initializeNavigation,
            {
                once: true
            }
        );

    } else {

        initializeNavigation();
    }

})();
// ==========================================
// DYNAMIC JPG IMAGE DOWNLOADER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('lightbox-download-btn');
    const lightboxImg = document.getElementById('lightboxImg');

    if (downloadBtn && lightboxImg) {
        downloadBtn.addEventListener('click', () => {
            const imgSrc = lightboxImg.src;
            if (!imgSrc) return;
            
            // Visual feedback animation on the button
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = 'Downloading...';
            
            // Convert to JPG using an HTML5 Canvas
            const img = new Image();
            img.crossOrigin = 'anonymous'; 
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Add a white background behind the image in case of transparency
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                // Export as high-quality JPG
                const dataURL = canvas.toDataURL('image/jpeg', 0.95);
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = 'Sepolia-Decoration.jpg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Restore button text after 1 second
                setTimeout(() => { downloadBtn.innerHTML = originalText; }, 1000);
            };
            img.src = imgSrc;
        });
    }
});

// ==========================================
// SMOOTH PAGE TRANSITIONS
// ==========================================
// ==========================================
// SMOOTH PAGE TRANSITIONS & BLANK SCREEN FIX
// ==========================================
// 'pageshow' handles normal loading AND bfcache (Browser Back Button)
window.addEventListener('pageshow', (event) => {
    document.body.classList.add('page-loaded');
});

document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function(e) {
        const target = this.href;
        if (this.hostname === window.location.hostname &&
            target.indexOf('#') === -1 &&
            this.target !== '_blank' &&
            !this.hasAttribute('download')) {
            e.preventDefault();
            document.body.classList.remove('page-loaded');
            setTimeout(() => { window.location.href = target; }, 500);
        }
    });
});

// ==========================================
// AUTO-CLICK DEFAULT FILTER ON LOAD
// ==========================================
window.addEventListener('load', () => {
    // This finds whichever button has the "active" class and clicks it automatically
    // so the grid hides the other categories immediately.
    const activeFilter = document.querySelector('.filter-btn.active');
    if (activeFilter) {
        activeFilter.click();
    }
});
// ==========================================
// CENTRALIZED LIKE SYSTEM
// ==========================================
const LikeManager = {
    likes: JSON.parse(localStorage.getItem('sepolia_likes')) || [],
    
    init() {
        this.injectHearts();
        this.updateBadges();
        this.syncLightboxObserver();
        this.attachLightboxWhatsAppListener();
        
        if(document.getElementById('liked-designs-grid')) {
            this.renderLikedPage();
        }
    },
    
    toggleLike(imgSrc, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation(); 
        }
        
        const index = this.likes.indexOf(imgSrc);
        if (index > -1) {
            this.likes.splice(index, 1);
        } else {
            this.likes.push(imgSrc);
        }
        
        localStorage.setItem('sepolia_likes', JSON.stringify(this.likes));
        this.updateAllHeartUIs();
        this.updateBadges();
        
        if(document.getElementById('liked-designs-grid')) {
            this.renderLikedPage();
        }
    },
    
    injectHearts() {
        const items = document.querySelectorAll('.portfolio-item');
        items.forEach(item => {
            if (item.querySelector('.like-btn')) return; 
            const img = item.querySelector('img');
            if (!img) return;
            
            const btn = document.createElement('button');
            btn.className = 'like-btn';
            btn.setAttribute('aria-label', 'Like this design');
            btn.dataset.src = img.getAttribute('src');
            
            item.appendChild(btn);
        });
        this.updateAllHeartUIs();
    },
    
    updateAllHeartUIs() {
        const buttons = document.querySelectorAll('.like-btn, .lightbox-like-btn');
        buttons.forEach(btn => {
            const src = btn.dataset.src;
            if(!src) return;
            
            if (this.likes.includes(src)) {
                btn.classList.add('liked');
                btn.setAttribute('aria-label', 'Unlike this design');
            } else {
                btn.classList.remove('liked');
                btn.setAttribute('aria-label', 'Like this design');
            }
        });
    },
    
    updateBadges() {
        const badges = document.querySelectorAll('.like-badge');
        badges.forEach(badge => {
            badge.textContent = this.likes.length;
            badge.style.display = this.likes.length > 0 ? 'inline-block' : 'none';
        });
    },
    
    syncLightboxObserver() {
        const lightboxImg = document.getElementById('lightboxImg');
        const lbHeart = document.getElementById('lightbox-like-btn');
        
        if (lightboxImg && lbHeart) {
            const observer = new MutationObserver(() => {
                const currentSrc = lightboxImg.getAttribute('src');
                lbHeart.dataset.src = currentSrc;
                this.updateAllHeartUIs();
            });
            observer.observe(lightboxImg, { attributes: true, attributeFilter: ['src'] });
            
            lbHeart.addEventListener('click', (e) => this.toggleLike(lbHeart.dataset.src, e));
        }
    },

    attachLightboxWhatsAppListener() {
        const lbWaBtn = document.getElementById('lightbox-whatsapp-btn');
        if (lbWaBtn) {
            // Clone the button to wipe out any old, broken click listeners
            const newBtn = lbWaBtn.cloneNode(true);
            lbWaBtn.parentNode.replaceChild(newBtn, lbWaBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const lightboxImg = document.getElementById('lightboxImg');
                if(!lightboxImg || !lightboxImg.src) return;
                
                // THE FIX: lightboxImg.src automatically retrieves the perfectly formatted 
                // absolute URL from the browser, completely stopping the "double URL" bug!
                const fullImageUrl = lightboxImg.src;
                
                const text = `Hello Sepolia Decorators, I liked this design and would like to inquire about it. Please share more details and pricing.\n\nDesign reference:\n${fullImageUrl}`;
                
                // Safely grab the WhatsApp number
                const targetNumber = (typeof BUSINESS_CONFIG !== 'undefined' && BUSINESS_CONFIG.whatsapp) 
                    ? BUSINESS_CONFIG.whatsapp 
                    : "917051129659"; 
                    
                window.open(`https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`, '_blank');
            });
        }
    },
    
    renderLikedPage() {
        const grid = document.getElementById('liked-designs-grid');
        const emptyState = document.getElementById('liked-empty-state');
        if(!grid || !emptyState) return;
        
        grid.innerHTML = '';
        
        if (this.likes.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid'; 
        emptyState.style.display = 'none';
        
        this.likes.forEach(src => {
            const div = document.createElement('div');
            div.className = 'portfolio-item fade-up is-visible'; 
            div.style.display = 'block'; 
            
            div.innerHTML = `<img src="${src}" alt="Liked Decoration" loading="lazy" decoding="async">`;
            
            const btn = document.createElement('button');
            btn.className = 'like-btn liked'; 
            btn.setAttribute('aria-label', 'Unlike this design');
            btn.dataset.src = src;
            
            div.appendChild(btn);
            grid.appendChild(div);
        });
    }
};

// CRITICAL INTERCEPTOR: Prevents the lightbox from opening when clicking the heart button
document.addEventListener('click', (e) => {
    const heartBtn = e.target.closest('.like-btn');
    if (heartBtn) {
        e.stopPropagation();
        LikeManager.toggleLike(heartBtn.dataset.src, e);
    }
}, true); 

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    LikeManager.init();
});
