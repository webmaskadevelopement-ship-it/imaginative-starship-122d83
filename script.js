/**
 * The New Me - Mobile Responsiveness Scripts
 * Handles: hamburger menu, mobile drawer, scroll lock, sticky header shadow
 */

(function () {
  'use strict';

  // --- DOM references ---
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerClose = document.getElementById('drawerClose');
  const header = document.querySelector('.header');

  // --- Mobile Drawer Initialization ---
  if (hamburgerBtn && mobileDrawer && drawerBackdrop && drawerClose) {
    let scrollPosition = 0;

    // Drawer open/close
    function openDrawer() {
      scrollPosition = window.pageYOffset;
      mobileDrawer.classList.add('open');
      drawerBackdrop.classList.add('open');
      hamburgerBtn.classList.add('active');
      hamburgerBtn.setAttribute('aria-expanded', 'true');
      
      // Lock body scroll
      document.body.classList.add('drawer-open');
      document.body.style.top = `-${scrollPosition}px`;
    }

    function closeDrawer() {
      mobileDrawer.classList.remove('open');
      drawerBackdrop.classList.remove('open');
      hamburgerBtn.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      
      // Restore body scroll
      document.body.classList.remove('drawer-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollPosition);
    }

    // Event listeners
    hamburgerBtn.addEventListener('click', function () {
      if (mobileDrawer.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    drawerClose.addEventListener('click', closeDrawer);
    drawerBackdrop.addEventListener('click', closeDrawer);

    // Close drawer on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // Close drawer when a nav link is clicked
    const drawerLinks = mobileDrawer.querySelectorAll('.drawer-link');
    drawerLinks.forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    // Close drawer on window resize to desktop
    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (window.innerWidth > 768 && mobileDrawer.classList.contains('open')) {
          closeDrawer();
        }
      }, 150);
    });
  }

  // --- Sticky header shadow on scroll ---
  if (header) {
    let ticking = false;
    function updateHeaderShadow() {
      if (window.pageYOffset > 10) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateHeaderShadow);
        ticking = true;
      }
    }, { passive: true });

    // Initial check on load
    updateHeaderShadow();
  }

  // --- Video Modal Logic ---
  const modal = document.getElementById('video-modal');
  const modalClose = document.getElementById('modal-close');
  const videoContainer = document.getElementById('modal-video-container');
  const openButtons = document.querySelectorAll('.js-open-video');

  function openModal(url, type) {
    if (!modal) return;
    videoContainer.innerHTML = ''; // clear previous
    
    // Auto-configure YouTube embeds to enable autoplay
    let finalUrl = url;
    if (url.includes('youtube.com')) {
      finalUrl += (url.includes('?') ? '&' : '?') + 'autoplay=1';
    }
    
    const iframe = document.createElement('iframe');
    iframe.src = finalUrl;
    iframe.allowFullscreen = true;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    videoContainer.appendChild(iframe);
    
    // Set the modal class based on type (vertical or horizontal)
    const modalContent = modal.querySelector('.modal-content');
    modalContent.className = 'modal-content'; // reset
    if (type) modalContent.classList.add(`type-${type}`);
    else modalContent.classList.add('type-horizontal'); // default fallback
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // lock scroll
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // restore scroll
    
    // wipe iframe slightly after fade to prevent visual pop
    setTimeout(() => {
      videoContainer.innerHTML = '';
    }, 300);
  }

  if (modal && modalClose) {
    openButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = btn.getAttribute('data-url');
        const type = btn.getAttribute('data-type');
        if (url) openModal(url, type);
      });
    });

    modalClose.addEventListener('click', closeModal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  // --- Search Overlay Logic ---
  const searchOverlay = document.getElementById('searchOverlay');
  const searchClose = document.getElementById('searchClose');
  const searchInputDesktop = document.getElementById('searchInputDesktop');
  const openSearchBtns = document.querySelectorAll('.js-open-search');

  if (searchOverlay) {
    function openSearch() {
      searchOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (searchInputDesktop) searchInputDesktop.focus();
      }, 100);
    }

    function closeSearch() {
      searchOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    }

    openSearchBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openSearch();
      });
    });

    if (searchClose) searchClose.addEventListener('click', closeSearch);

    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) closeSearch();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !searchOverlay.classList.contains('hidden')) {
        closeSearch();
      }
    });
  }

  // ==========================================
  // MASTER ANIMATION ENGINE
  // ==========================================

  // 1. Scroll Progress Bar
  let progressBar = document.getElementById('scrollProgressBar');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'scrollProgressBar';
    progressBar.className = 'scroll-progress-bar';
    document.body.appendChild(progressBar);
  }

  function updateScrollProgress() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    if (progressBar) progressBar.style.width = scrolled + '%';
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  // 2. IntersectionObserver for Scroll Reveal
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.08
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, observerOptions);

  function initScrollAnimations() {
    // Select elements to auto-reveal across all pages
    const targetSelectors = [
      '.section-title',
      '.section-eyebrow',
      '.section-subtitle',
      '.quote-text',
      '.quote-dark-text',
      '.blog-card',
      '.feature-col',
      '.value-card',
      '.value-card-premium',
      '.mv-card-mission',
      '.mv-card-vision',
      '.about-inner',
      '.brand-story-inner',
      '.faq-card',
      '.contact-card',
      '.newsletter-inner',
      '.book-promo-inner',
      '.author-card-frame',
      '.featured-in',
      '.hero-glass-card',
      '.hero-book-showcase',
      '.video-thumb'
    ];

    targetSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, index) => {
        if (
          !el.classList.contains('reveal') &&
          !el.classList.contains('reveal-up') &&
          !el.classList.contains('reveal-scale') &&
          !el.classList.contains('reveal-left') &&
          !el.classList.contains('reveal-right')
        ) {
          el.classList.add('reveal');
        }

        // Apply staggered delay if inside a grid
        const parent = el.parentElement;
        if (
          parent &&
          (parent.classList.contains('values-grid') ||
            parent.classList.contains('blog-grid') ||
            parent.classList.contains('mv-grid') ||
            parent.classList.contains('feature-grid') ||
            parent.classList.contains('faq-grid') ||
            parent.classList.contains('story-grid-desktop'))
        ) {
          const delayIndex = (index % 4) + 1;
          if (!el.classList.contains('reveal-d1') && !el.classList.contains('reveal-d2') && !el.classList.contains('reveal-d3') && !el.classList.contains('reveal-d4')) {
            el.classList.add(`reveal-d${delayIndex}`);
          }
        }
      });
    });

    // Observe all reveal targets
    const allReveals = document.querySelectorAll('.reveal, .reveal-up, .reveal-scale, .reveal-left, .reveal-right');
    allReveals.forEach((el) => {
      revealObserver.observe(el);
    });
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations);
  } else {
    initScrollAnimations();
  }

})();

