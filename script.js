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
const mockVideo = document.getElementById('mockVideo');
const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
if (mockVideo && prefersReducedMotionQuery.matches) {
  mockVideo.pause();
}
if (mockWindow && mockPlayToggle) {
  mockPlayToggle.addEventListener('click', () => {
    const isPaused = mockWindow.classList.toggle('paused');
    mockPlayToggle.classList.toggle('is-paused', isPaused);
    mockPlayToggle.setAttribute('aria-label', isPaused ? 'Play demo' : 'Pause demo');
    if (mockVideo) {
      if (isPaused) mockVideo.pause();
      else mockVideo.play().catch(() => {});
    }
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

// How it works — interactive tabbed video showcase
const hiwSteps = document.querySelectorAll('.hiw-step');
const hiwVideo = document.getElementById('hiwVideo');
const hiwVideoSource = document.getElementById('hiwVideoSource');
const hiwVideoWrap = hiwVideo ? hiwVideo.closest('.hiw-video-wrap') : null;
const hiwFrameLabel = document.getElementById('hiwFrameLabel');
const hiwPlayBtn = document.getElementById('hiwPlayBtn');
const hiwPlayOverlay = document.getElementById('hiwPlayOverlay');
const hiwProgressFill = document.getElementById('hiwProgressFill');
const hiwTime = document.getElementById('hiwTime');
const hiwFullscreenBtn = document.getElementById('hiwFullscreenBtn');

if (hiwSteps.length && hiwVideo) {
  const AUTO_ROTATE_MS = 6000;
  const SWITCH_ANIM_MS = 350;
  let activeIndex = 0;
  let autoRotateTimer = null;
  let isPaused = prefersReducedMotionQuery.matches;

  const hiwFormatTime = seconds => {
    if (!Number.isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  function setPausedState(paused) {
    isPaused = paused;
    if (paused) hiwVideo.pause();
    else hiwVideo.play().catch(() => {});
    [hiwPlayBtn, hiwPlayOverlay].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('is-paused', paused);
      btn.setAttribute('aria-label', paused ? 'Play video' : 'Pause video');
    });
  }

  function restartAutoRotate() {
    if (autoRotateTimer) clearInterval(autoRotateTimer);
    if (prefersReducedMotionQuery.matches) return;
    autoRotateTimer = setInterval(() => {
      setActiveStep((activeIndex + 1) % hiwSteps.length);
    }, AUTO_ROTATE_MS);
  }

  function setActiveStep(index, opts = {}) {
    const changed = index !== activeIndex;
    activeIndex = index;
    const step = hiwSteps[index];

    hiwSteps.forEach((s, i) => {
      s.classList.toggle('active', i === index);
      s.setAttribute('aria-selected', String(i === index));
    });

    if (hiwFrameLabel) hiwFrameLabel.textContent = step.dataset.label || '';

    const nextSrc = step.dataset.video;
    const swapSource = nextSrc && hiwVideoSource.getAttribute('src') !== nextSrc;

    if (changed && hiwVideoWrap) {
      hiwVideoWrap.classList.add('is-switching');
      setTimeout(() => hiwVideoWrap.classList.remove('is-switching'), SWITCH_ANIM_MS);
    }

    if (swapSource) {
      hiwVideoSource.setAttribute('src', nextSrc);
      hiwVideo.load();
    }
    if (!isPaused) hiwVideo.play().catch(() => {});

    if (opts.userInitiated) restartAutoRotate();
  }

  hiwSteps.forEach((step, i) => {
    step.addEventListener('click', () => setActiveStep(i, { userInitiated: true }));
  });

  if (hiwPlayBtn) hiwPlayBtn.addEventListener('click', () => setPausedState(!isPaused));
  if (hiwPlayOverlay) hiwPlayOverlay.addEventListener('click', () => setPausedState(!isPaused));

  if (hiwFullscreenBtn) {
    hiwFullscreenBtn.addEventListener('click', () => {
      const target = hiwVideoWrap || hiwVideo;
      if (target.requestFullscreen) target.requestFullscreen();
      else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
    });
  }

  hiwVideo.addEventListener('timeupdate', () => {
    if (!hiwVideo.duration || !hiwProgressFill || !hiwTime) return;
    hiwProgressFill.style.width = `${(hiwVideo.currentTime / hiwVideo.duration) * 100}%`;
    hiwTime.textContent = `${hiwFormatTime(hiwVideo.currentTime)} / ${hiwFormatTime(hiwVideo.duration)}`;
  });
  hiwVideo.addEventListener('loadedmetadata', () => {
    if (hiwTime) hiwTime.textContent = `0:00 / ${hiwFormatTime(hiwVideo.duration)}`;
  });

  if (isPaused) setPausedState(true);
  restartAutoRotate();
}

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
