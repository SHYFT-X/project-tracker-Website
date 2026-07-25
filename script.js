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

// How it works — interactive tabbed product walkthrough
const hiwSteps = document.querySelectorAll('.hiw-step');
const hiwFrame = document.getElementById('hiwPanel');
const hiwFrameLabel = document.getElementById('hiwFrameLabel');
const hiwStepCaption = document.getElementById('hiwStepCaption');
const hiwStorySegs = document.querySelectorAll('.hiw-story-seg');
const hiwVideo = document.getElementById('hiwVideo');
const hiwVideoSource = document.getElementById('hiwVideoSource');
const hiwPlayBtn = document.getElementById('hiwPlayBtn');
const hiwPlayOverlay = document.getElementById('hiwPlayOverlay');
const hiwExpandBtn = document.getElementById('hiwExpandBtn');
const hiwModal = document.getElementById('hiwModal');
const hiwModalStage = document.getElementById('hiwModalStage');
const hiwModalLabel = document.getElementById('hiwModalLabel');
const hiwModalClose = document.getElementById('hiwModalClose');
const hiwModalBackdrop = document.getElementById('hiwModalBackdrop');

if (hiwSteps.length && hiwVideo) {
  const AUTO_ROTATE_MS = 6000;
  let activeIndex = 0;
  let autoRotateTimer = null;
  let isPaused = prefersReducedMotionQuery.matches;
  let lastFocused = null;

  // Every step points at a real clip path (videos/stepN-*.mp4). Browsers don't
  // reliably fire `error` when a lone <source> 404s, so resolve availability
  // with a HEAD request up front and fall back to the shared placeholder clip
  // when the real file hasn't been dropped into the repo yet. Once real files
  // are added, the HEAD check starts succeeding and no code change is needed.
  const hiwVideoSrcCache = new Map();
  async function resolveVideoSrc(primary, fallback) {
    if (hiwVideoSrcCache.has(primary)) return hiwVideoSrcCache.get(primary);
    let resolved = primary;
    try {
      const res = await fetch(primary, { method: 'HEAD' });
      if (!res.ok) resolved = fallback || primary;
    } catch {
      resolved = fallback || primary;
    }
    hiwVideoSrcCache.set(primary, resolved);
    return resolved;
  }

  async function loadStepVideo(step) {
    const primary = step.dataset.video;
    const fallback = step.dataset.videoFallback || '';
    const requestedFor = step;
    const src = await resolveVideoSrc(primary, fallback);
    // Bail if the user already moved to a different step while the check was in flight.
    if (hiwSteps[activeIndex] !== requestedFor) return;
    hiwVideoSource.setAttribute('src', src);
    hiwVideo.load();
    if (!isPaused) hiwVideo.play().catch(() => {});
  }

  function setPausedState(paused) {
    isPaused = paused;
    if (hiwFrame) hiwFrame.classList.toggle('paused', paused);
    if (paused) hiwVideo.pause();
    else hiwVideo.play().catch(() => {});
    [hiwPlayBtn, hiwPlayOverlay].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('is-paused', paused);
      btn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    });
    if (paused) {
      if (autoRotateTimer) clearInterval(autoRotateTimer);
    } else {
      restartAutoRotate();
    }
  }

  function restartAutoRotate() {
    if (autoRotateTimer) clearInterval(autoRotateTimer);
    if (prefersReducedMotionQuery.matches || isPaused) return;
    autoRotateTimer = setInterval(() => {
      setActiveStep((activeIndex + 1) % hiwSteps.length, { userInitiated: false });
    }, AUTO_ROTATE_MS);
  }

  function updateStoryBar(index) {
    hiwStorySegs.forEach((seg, i) => {
      seg.classList.remove('active', 'done');
      if (i < index) seg.classList.add('done');
    });
    const activeSeg = hiwStorySegs[index];
    if (!activeSeg) return;
    // Force a reflow so the fill animation restarts from 0% every time.
    activeSeg.classList.remove('active');
    void activeSeg.offsetWidth;
    activeSeg.classList.add('active');
  }

  function setActiveStep(index, opts = {}) {
    activeIndex = index;
    const step = hiwSteps[index];

    hiwSteps.forEach((s, i) => {
      s.classList.toggle('active', i === index);
      s.setAttribute('aria-selected', String(i === index));
    });

    if (hiwFrameLabel) hiwFrameLabel.textContent = step.dataset.label || '';
    if (hiwStepCaption) hiwStepCaption.textContent = `Step ${index + 1} of ${hiwSteps.length}`;
    updateStoryBar(index);
    loadStepVideo(step);

    if (hiwModal && !hiwModal.hidden) syncModalContent();
    if (opts.userInitiated) restartAutoRotate();
  }

  hiwSteps.forEach((step, i) => {
    step.addEventListener('click', () => setActiveStep(i, { userInitiated: true }));
  });
  hiwStorySegs.forEach((seg, i) => {
    seg.addEventListener('click', () => setActiveStep(i, { userInitiated: true }));
  });

  if (hiwPlayBtn) hiwPlayBtn.addEventListener('click', () => setPausedState(!isPaused));
  if (hiwPlayOverlay) hiwPlayOverlay.addEventListener('click', () => setPausedState(!isPaused));

  function syncModalContent() {
    if (!hiwModalStage) return;
    hiwModalStage.innerHTML = '';
    const step = hiwSteps[activeIndex];
    const modalVideo = document.createElement('video');
    modalVideo.className = 'hiw-video';
    modalVideo.muted = true;
    modalVideo.loop = true;
    modalVideo.playsInline = true;
    modalVideo.setAttribute('aria-hidden', 'true');
    const source = document.createElement('source');
    source.src = hiwVideoSource.getAttribute('src');
    source.type = 'video/mp4';
    modalVideo.appendChild(source);
    hiwModalStage.appendChild(modalVideo);
    if (!isPaused) modalVideo.play().catch(() => {});
    if (hiwModalLabel) hiwModalLabel.textContent = step.dataset.label || '';
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function openModal() {
    if (!hiwModal) return;
    lastFocused = document.activeElement;
    syncModalContent();
    hiwModal.hidden = false;
    document.body.classList.add('hiw-modal-open');
    if (autoRotateTimer) clearInterval(autoRotateTimer);
    if (hiwModalClose) hiwModalClose.focus();
    document.addEventListener('keydown', onModalKeydown);
  }

  function closeModal() {
    if (!hiwModal || hiwModal.hidden) return;
    hiwModal.hidden = true;
    document.body.classList.remove('hiw-modal-open');
    if (hiwModalStage) hiwModalStage.innerHTML = '';
    document.removeEventListener('keydown', onModalKeydown);
    if (!isPaused) restartAutoRotate();
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  if (hiwExpandBtn) hiwExpandBtn.addEventListener('click', openModal);
  if (hiwModalClose) hiwModalClose.addEventListener('click', closeModal);
  if (hiwModalBackdrop) hiwModalBackdrop.addEventListener('click', closeModal);

  setActiveStep(0);
  if (isPaused) setPausedState(true);
  else restartAutoRotate();
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
