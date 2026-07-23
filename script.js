// Simple interactivity: mobile nav toggle, page-style section routing, demo contact handler
const navToggle = document.getElementById('nav-toggle');
const navList = document.getElementById('nav-list');
if (navToggle && navList) {
  navToggle.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

const PAGES = ['home', 'architecture', 'features', 'workflow', 'roles', 'contact'];

function showPage(id) {
  if (!PAGES.includes(id)) id = 'home';

  document.querySelectorAll('main > section').forEach(section => {
    const isMatch = section.id === id || (section.classList.contains('cta-banner') && id === 'contact');
    section.hidden = !isMatch;
  });

  document.querySelectorAll('.nav-list a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
  });

  window.scrollTo(0, 0);
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href').slice(1);
    if (!PAGES.includes(id)) return;
    e.preventDefault();
    history.pushState(null, '', '#' + id);
    showPage(id);

    if (navList && navList.classList.contains('open')) {
      navList.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));
showPage(location.hash.slice(1) || 'home');

// Header shadow once the page has scrolled
const siteHeader = document.getElementById('site-header');
if (siteHeader) {
  const updateHeaderShadow = () => siteHeader.classList.toggle('scrolled', window.scrollY > 4);
  window.addEventListener('scroll', updateHeaderShadow, { passive: true });
  updateHeaderShadow();
}

// Scroll-reveal for hero mockup, cards, timeline, etc.
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => revealObserver.observe(el));
}

// Play/pause toggle for the hero demo mockup
const mockWindow = document.getElementById('mockWindow');
const mockPlayToggle = document.getElementById('mockPlayToggle');
if (mockWindow && mockPlayToggle) {
  mockPlayToggle.addEventListener('click', () => {
    const isPaused = mockWindow.classList.toggle('paused');
    mockPlayToggle.classList.toggle('is-paused', isPaused);
    mockPlayToggle.setAttribute('aria-label', isPaused ? 'Play demo' : 'Pause demo');
  });
}

// Keep the hero mockup's displayed time in step with the CSS scrubber-fill loop
// (reviewScrubberFill in styles.css: 4% -> 42% width over 0-92% of an 8s cycle, then resets)
const mockTime = document.getElementById('mockTime');
if (mockWindow && mockTime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const CYCLE_MS = 8000;
  const TOTAL_SECONDS = 4 * 60 + 18;
  let pauseStart = null;
  let totalPausedMs = 0;

  const formatTime = seconds => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const widthAtPhase = phase => {
    if (phase <= 0.92) return 4 + (42 - 4) * (phase / 0.92);
    return 42 - (42 - 4) * ((phase - 0.92) / 0.08);
  };

  function tick(now) {
    const isPaused = mockWindow.classList.contains('paused');
    if (isPaused) {
      if (pauseStart === null) pauseStart = now;
    } else if (pauseStart !== null) {
      totalPausedMs += now - pauseStart;
      pauseStart = null;
    }
    const effectiveElapsed = now - totalPausedMs - (isPaused ? now - pauseStart : 0);
    const phase = (effectiveElapsed % CYCLE_MS) / CYCLE_MS;
    const widthPct = widthAtPhase(phase);
    const currentSeconds = (widthPct / 100) * TOTAL_SECONDS;
    mockTime.textContent = `${formatTime(currentSeconds)} / ${formatTime(TOTAL_SECONDS)}`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Count-up for the hero stat number, timed to land after the hero load-in animation
const countEls = document.querySelectorAll('[data-count-to]');
countEls.forEach(el => {
  const target = parseInt(el.dataset.countTo, 10);
  if (!Number.isFinite(target)) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    el.textContent = target;
    return;
  }
  const duration = 600;
  setTimeout(() => {
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(progress * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, 1150);
});

const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');
if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const data = new FormData(this);
    const payload = Object.fromEntries(data.entries());
    console.log('Contact form submission (demo):', payload);

    const submitBtn = this.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    setTimeout(() => {
      if (formStatus) {
        formStatus.textContent = 'Thanks — your message has been received. We\'ll reply within one business day.';
        formStatus.className = 'form-status success';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send message';
      this.reset();
    }, 600);
  });
}
