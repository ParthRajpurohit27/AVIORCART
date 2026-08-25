/* aviorcart - reels  (v2 - full screen)
   assets/reels.js */

(function () {
  'use strict';

  /* config */
  const CFG = {
    pauseIconDuration: 900,  // ms
  };

  /* helpers */
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  /* state
     ismuted starts false - we want sound.
     audiounlocked tracks whether the browser
     has allowed audio via a user gesture. */
  let isMuted        = false;   // ← unmuted by default
  let audioUnlocked  = false;   // flips true after first user interaction
  let pauseTimer     = null;
  let currentIndex   = 0;

  /* dom refs */
  const feed          = $('#reels-feed');
  const cards         = $$('.reel-card');
  const dots          = $$('.reels-dot');
  const muteBtn       = $('#reels-mute-btn');
  const unmuteOverlay = $('#reels-unmute-overlay');
  const unmuteTap     = $('#reels-unmute-tap');

  if (!feed || cards.length === 0) return;

  /* mute icon - reflects current state */
  const ICON_UNMUTED = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>`;

  const ICON_MUTED = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>`;

  function updateMuteIcon() {
    if (muteBtn) muteBtn.innerHTML = isMuted ? ICON_MUTED : ICON_UNMUTED;
  }

  /* "tap to unmute" overlay
     shown when browser blocks audio autoplay.
     hidden after user taps it (or mute btn). */
  function showUnmuteOverlay() {
    if (unmuteOverlay) unmuteOverlay.classList.add('visible');
  }

  function hideUnmuteOverlay() {
    if (unmuteOverlay) unmuteOverlay.classList.remove('visible');
  }

  if (unmuteTap) {
    unmuteTap.addEventListener('click', function () {
      isMuted       = false;
      audioUnlocked = true;
      hideUnmuteOverlay();
      updateMuteIcon();

      // Apply to all videos, play current one with sound
      $$('.reel-video').forEach(function (v) { v.muted = false; });
      const cur = cards[currentIndex];
      if (cur) {
        const vid = $('.reel-video', cur);
        if (vid) vid.play().catch(function () {});
      }
    });
  }

  /* mute toggle button */
  if (muteBtn) {
    muteBtn.addEventListener('click', function () {
      isMuted       = !isMuted;
      audioUnlocked = true;
      $$('.reel-video').forEach(function (v) { v.muted = isMuted; });
      updateMuteIcon();
      hideUnmuteOverlay();
    });
  }

  updateMuteIcon(); // set initial icon (sound icon, since unmuted)

  /* dots */
  function setActiveDot(idx) {
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === idx);
    });
  }

  /* progress bar */
  function bindProgress(card) {
    const video = $('.reel-video', card);
    const bar   = $('.reel-progress', card);
    if (!video || !bar) return;

    video.addEventListener('timeupdate', function () {
      if (!video.duration) return;
      bar.style.width = (video.currentTime / video.duration * 100) + '%';
    });
    video.addEventListener('ended', function () {
      bar.style.width = '100%';
    });
  }

  /* tap to pause / play */
  function bindTapToPause(card) {
    const video = $('.reel-video', card);
    const icon  = $('.reel-pause-icon', card);
    if (!video) return;

    card.addEventListener('click', function (e) {
      if (e.target.closest('button, a')) return;

      // First tap on mobile can unlock audio
      if (!audioUnlocked) {
        audioUnlocked = true;
        hideUnmuteOverlay();
        video.muted = false;
        isMuted     = false;
        updateMuteIcon();
        $$('.reel-video').forEach(function (v) { v.muted = false; });
      }

      clearTimeout(pauseTimer);

      if (video.paused) {
        video.play().catch(function () {});
        if (icon) icon.classList.remove('show');
      } else {
        video.pause();
        if (icon) {
          icon.classList.add('show');
          pauseTimer = setTimeout(function () {
            icon.classList.remove('show');
          }, CFG.pauseIconDuration);
        }
      }
    });
  }

  /* play a card
     strategy:
       1. try play with sound (ismuted = false).
       2. if browser rejects (autoplay policy) →
          fall back to muted play and show
          "tap to unmute" overlay. */
  function playCard(card) {
    const video = $('.reel-video', card);
    if (!video) return;

    video.muted       = isMuted;
    video.currentTime = 0;

    const bar = $('.reel-progress', card);
    if (bar) bar.style.width = '0%';

    video.play()
      .then(function () {
        // Played with sound successfully
        if (!isMuted) hideUnmuteOverlay();
      })
      .catch(function () {
        // Browser blocked audio autoplay - fall back to muted
        video.muted = true;
        video.play()
          .then(function () {
            // Muted play succeeded; prompt user to unmute
            if (!isMuted) showUnmuteOverlay();
          })
          .catch(function () {
            // Even muted autoplay failed (very rare)
          });
      });
  }

  function pauseCard(card) {
    const video = $('.reel-video', card);
    if (video && !video.paused) video.pause();
  }

  /* show more / show less */
  function initShowMore() {
    $$('.reel-desc-text').forEach(function (el) {
      const btn = el.nextElementSibling;
      if (!btn || !btn.classList.contains('reel-showmore')) return;

      el.style.webkitLineClamp = 'unset';
      el.style.display         = 'block';
      const full = el.scrollHeight;
      el.style.webkitLineClamp = '';
      el.style.display         = '';
      const clamped = el.clientHeight;

      if (full > clamped + 4) {
        btn.classList.add('visible');
        btn.addEventListener('click', function (e) {
          e.stopPropagation(); // don't trigger tap-to-pause
          const expanded = el.classList.toggle('expanded');
          btn.textContent = expanded ? 'Show Less' : 'Show More';
        });
      }
    });
  }

  /* intersection observer */
  function initObserver() {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const card = entry.target;
        const idx  = cards.indexOf(card);

        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          currentIndex = idx;
          setActiveDot(idx);
          playCard(card);
        } else {
          pauseCard(card);
        }
      });
    }, {
      root:      feed,
      threshold: 0.6,
    });

    cards.forEach(function (card) { observer.observe(card); });
  }

  /* keyboard */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = cards[currentIndex + 1];
      if (next) next.scrollIntoView({ behavior: 'smooth' });
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = cards[currentIndex - 1];
      if (prev) prev.scrollIntoView({ behavior: 'smooth' });
    }
    if (e.key === ' ') {
      e.preventDefault();
      const video = $('.reel-video', cards[currentIndex]);
      if (video) video.paused ? video.play() : video.pause();
    }
    if (e.key === 'm' || e.key === 'M') {
      if (muteBtn) muteBtn.click();
    }
  });

  /* init */
  cards.forEach(function (card) {
    bindTapToPause(card);
    bindProgress(card);
  });

  initShowMore();
  initObserver();

  // Play first card after brief delay
  setTimeout(function () {
    if (cards[0]) playCard(cards[0]);
  }, 300);

  // Remove scroll hint on first scroll
  feed.addEventListener('scroll', function () {
    const hint = $('#reels-scroll-hint');
    if (hint) hint.remove();
  }, { once: true });

})();
