/**
 * AVIORCART — Infinite Scroll with Star Skeleton Loader
 * Pages: Collection + Search only. Homepage untouched.
 */

(function () {
  'use strict';

  /* ── Config ─────────────────────────────── */
  var SCROLL_THRESHOLD   = 400;
  var DEBOUNCE_MS        = 150;
  var CARD_STAGGER_MS    = 45;
  var SKELETON_COUNT     = 4;

  /* ── State ──────────────────────────────── */
  var nextPageUrl = null;
  var isLoading   = false;
  var scrollTimer = null;
  var loaderEl    = null;

  /* ── Boot ───────────────────────────────── */
  function init() {
    var grid       = document.getElementById('product-grid');
    var pagination = document.getElementById('pagination');
    if (!grid || !pagination) return;

    nextPageUrl = getNextUrl(pagination);
    if (!nextPageUrl) return;

    pagination.style.display = 'none';
    injectStyles();

    loaderEl = buildLoader();
    grid.parentNode.insertBefore(loaderEl, grid.nextSibling);

    window.addEventListener('scroll', debouncedScroll, { passive: true });
    checkScroll();
  }

  /* ── Scroll ─────────────────────────────── */
  function debouncedScroll() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(checkScroll, DEBOUNCE_MS);
  }

  function checkScroll() {
    if (isLoading || !nextPageUrl) return;
    var fromBottom = document.documentElement.scrollHeight
                     - window.scrollY - window.innerHeight;
    if (fromBottom < SCROLL_THRESHOLD) loadNextPage();
  }

  /* ── Fetch ──────────────────────────────── */
  function loadNextPage() {
    if (isLoading || !nextPageUrl) return;
    isLoading = true;
    showLoader();

    fetch(nextPageUrl)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        var doc         = new DOMParser().parseFromString(html, 'text/html');
        var newGrid     = doc.getElementById('product-grid');
        var newPaginate = doc.getElementById('pagination');

        hideLoader(function () {
          if (newGrid) {
            var currentGrid = document.getElementById('product-grid');
            var cards       = Array.prototype.slice.call(newGrid.children);
            cards.forEach(function (card, i) {
              card.style.opacity   = '0';
              card.style.transform = 'translateY(24px)';
              card.style.transition =
                'opacity .4s ease ' + (i * CARD_STAGGER_MS) + 'ms,' +
                'transform .4s ease ' + (i * CARD_STAGGER_MS) + 'ms';
              currentGrid.appendChild(card);
              requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                  card.style.opacity   = '1';
                  card.style.transform = 'translateY(0)';
                });
              });
            });
          }

          nextPageUrl = newPaginate ? getNextUrl(newPaginate) : null;
          isLoading = false;

          if (!nextPageUrl) {
            window.removeEventListener('scroll', debouncedScroll);
            showEndMessage();
          }
        });
      })
      .catch(function (err) {
        console.warn('[IS] fetch error:', err);
        nextPageUrl = null;
        isLoading = false;
        hideLoader(null);
        window.removeEventListener('scroll', debouncedScroll);
      });
  }

  /* ── Loader show / hide ─────────────────── */
  function showLoader() {
    if (!loaderEl) return;
    loaderEl.style.opacity    = '0';
    loaderEl.style.display    = 'block';
    loaderEl.style.transition = 'opacity .25s ease';

    /* restart star animations */
    loaderEl.querySelectorAll('.is-star').forEach(function (s) {
      s.style.animation = 'none';
      void s.offsetWidth;
      s.style.animation = '';
    });

    requestAnimationFrame(function () {
      loaderEl.style.opacity = '1';
    });
  }

  function hideLoader(cb) {
    if (!loaderEl) { if (cb) cb(); return; }
    loaderEl.style.transition = 'opacity .3s ease';
    loaderEl.style.opacity    = '0';
    setTimeout(function () {
      loaderEl.style.display  = 'none';
      loaderEl.style.opacity  = '1';
      if (cb) cb();
    }, 320);
  }

  /* ── Build loader ───────────────────────── */
  function buildLoader() {
    var wrap = document.createElement('div');
    wrap.id  = 'is-loader';
    wrap.style.cssText = 'display:none;width:100%;margin-top:4px;';

    /* Stars strip */
    var starsWrap = document.createElement('div');
    starsWrap.className = 'is-stars-wrap';

    var STARS = [
      { left:'6%',  delay:'0s',   dur:'1.4s', size:'20px', op:'.95' },
      { left:'17%', delay:'.28s', dur:'1.7s', size:'13px', op:'.60' },
      { left:'29%', delay:'.08s', dur:'1.2s', size:'24px', op:'1'   },
      { left:'43%', delay:'.45s', dur:'1.6s', size:'15px', op:'.70' },
      { left:'56%', delay:'.06s', dur:'1.3s', size:'22px', op:'.95' },
      { left:'67%', delay:'.38s', dur:'1.8s', size:'12px', op:'.55' },
      { left:'78%', delay:'.18s', dur:'1.5s', size:'18px', op:'.80' },
      { left:'88%', delay:'.55s', dur:'1.4s', size:'14px', op:'.65' },
      { left:'36%', delay:'.65s', dur:'1.9s', size:'11px', op:'.50' },
      { left:'61%', delay:'.22s', dur:'1.1s', size:'26px', op:'1'   },
      { left:'49%', delay:'.12s', dur:'1.6s', size:'10px', op:'.45' },
      { left:'23%', delay:'.52s', dur:'1.3s', size:'16px', op:'.75' }
    ];

    STARS.forEach(function (d) {
      var s = document.createElement('span');
      s.className   = 'is-star';
      s.textContent = '★';
      s.style.cssText =
        'position:absolute;left:' + d.left + ';bottom:4px;' +
        'font-size:' + d.size + ';color:#fbbf24;' +
        'animation:isRise ' + d.dur + ' ease-in ' + d.delay + ' infinite;' +
        'text-shadow:0 0 10px rgba(251,191,36,.9),0 0 22px rgba(251,191,36,.5);' +
        'pointer-events:none;will-change:transform,opacity;';
      starsWrap.appendChild(s);
    });

    wrap.appendChild(starsWrap);

    /* Loading text */
    var txt = document.createElement('div');
    txt.className = 'is-loading-txt';
    txt.innerHTML =
      '<span class="is-dot-label">Loading more products</span>' +
      '<span class="is-dots">' +
        '<span class="is-dot"></span>' +
        '<span class="is-dot"></span>' +
        '<span class="is-dot"></span>' +
      '</span>';
    wrap.appendChild(txt);

    /* Skeleton grid */
    var skelGrid = document.createElement('div');
    skelGrid.className = 'is-skel-grid';
    for (var i = 0; i < SKELETON_COUNT; i++) {
      skelGrid.appendChild(buildSkeletonCard(i));
    }
    wrap.appendChild(skelGrid);

    return wrap;
  }

  function buildSkeletonCard(idx) {
    var delay = (idx * 0.12) + 's';
    var card  = document.createElement('div');
    card.className = 'is-skel-card';
    card.innerHTML =
      '<div class="is-skel is-skel-img" style="animation-delay:' + delay + '"></div>' +
      '<div class="is-skel is-skel-badge" style="animation-delay:' + delay + '"></div>' +
      '<div class="is-skel-info">' +
        '<div class="is-skel is-skel-brand"  style="animation-delay:' + delay + '"></div>' +
        '<div class="is-skel is-skel-title"  style="animation-delay:' + delay + '"></div>' +
        '<div class="is-skel is-skel-title2" style="animation-delay:' + delay + '"></div>' +
        '<div class="is-skel is-skel-stars"  style="animation-delay:' + delay + '"></div>' +
        '<div class="is-skel is-skel-price"  style="animation-delay:' + delay + '"></div>' +
      '</div>';
    return card;
  }

  /* ── End message ────────────────────────── */
  function showEndMessage() {
    var msg = document.createElement('div');
    msg.id  = 'is-end-msg';
    msg.innerHTML =
      '<div class="is-end-stars">' +
        '<span style="animation-delay:0s">⭐</span>' +
        '<span style="animation-delay:.18s">✨</span>' +
        '<span style="animation-delay:.36s">⭐</span>' +
      '</div>' +
      '<div class="is-end-line1">Sab products load ho gaye!</div>' +
      '<div class="is-end-line2">Yahi hai poora collection</div>';

    var anchor = loaderEl || document.getElementById('product-grid');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(msg, anchor.nextSibling);
      /* fade in */
      msg.style.opacity = '0';
      requestAnimationFrame(function () {
        msg.style.transition = 'opacity .5s ease';
        msg.style.opacity    = '1';
      });
    }
  }

  /* ── getNextUrl ─────────────────────────── */
  function getNextUrl(el) {
    if (!el) return null;
    var r = el.querySelector('a[rel="next"]');
    if (r && r.href) return r.href;
    var c = el.querySelector('a.next');
    if (c && c.href) return c.href;
    var links = el.querySelectorAll('a');
    if (links.length) {
      var last = links[links.length - 1];
      var t    = (last.textContent || '').trim();
      if (t === '›' || t === '»' || t === '>' || t === 'Next') return last.href || null;
    }
    return null;
  }

  /* ── Styles ─────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('is-styles')) return;
    var s = document.createElement('style');
    s.id  = 'is-styles';
    s.textContent =

      /* keyframes */
      '@keyframes isRise{' +
        '0%  {transform:translateY(0)    scale(1)   rotate(0deg);  opacity:1;}' +
        '55% {transform:translateY(-50px) scale(1.25) rotate(12deg); opacity:.75;}' +
        '100%{transform:translateY(-105px) scale(.65) rotate(28deg); opacity:0;}' +
      '}' +

      '@keyframes isShimmer{' +
        '0%  {background-position:-500px 0;}' +
        '100%{background-position: 500px 0;}' +
      '}' +

      '@keyframes isDot{' +
        '0%,80%,100%{transform:translateY(0);  opacity:.35;}' +
        '40%         {transform:translateY(-7px);opacity:1;}' +
      '}' +

      '@keyframes isEndBounce{' +
        '0%,100%{transform:translateY(0)   scale(1);}' +
        '50%    {transform:translateY(-9px) scale(1.25);}' +
      '}' +

      /* stars wrap */
      '.is-stars-wrap{' +
        'position:relative;height:115px;width:100%;overflow:hidden;' +
      '}' +

      /* loading text */
      '.is-loading-txt{' +
        'display:flex;align-items:center;justify-content:center;gap:7px;' +
        'font-size:13px;font-weight:700;letter-spacing:.5px;' +
        'color:#fbbf24;font-family:inherit;' +
        'margin-bottom:18px;' +
      '}' +
      '.is-dots{display:flex;gap:4px;align-items:center;}' +
      '.is-dot{' +
        'width:5px;height:5px;border-radius:50%;background:#fbbf24;' +
        'animation:isDot 1.2s ease-in-out infinite;' +
      '}' +
      '.is-dot:nth-child(2){animation-delay:.2s;}' +
      '.is-dot:nth-child(3){animation-delay:.4s;}' +

      /* skeleton grid */
      '.is-skel-grid{' +
        'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding-bottom:24px;' +
      '}' +
      '@media(min-width:640px){.is-skel-grid{grid-template-columns:repeat(4,1fr);}}' +

      /* skeleton card */
      '.is-skel-card{' +
        'border-radius:10px;overflow:hidden;' +
        'background:#0e0e18;' +
        'border:1px solid rgba(255,255,255,.07);' +
        'position:relative;' +
      '}' +

      /* shimmer base — matches theme dark bg */
      '.is-skel{' +
        'background:linear-gradient(90deg,#181824 0%,#262638 42%,#181824 80%);' +
        'background-size:900px 100%;' +
        'animation:isShimmer 1.7s ease-in-out infinite;' +
        'border-radius:4px;' +
      '}' +

      '.is-skel-img{width:100%;padding-top:108%;border-radius:8px 8px 0 0;}' +
      '.is-skel-badge{' +
        'position:absolute;top:9px;left:9px;' +
        'width:44px;height:17px;border-radius:4px;' +
      '}' +
      '.is-skel-info{padding:10px 10px 13px;}' +
      '.is-skel-brand{height:10px;width:50%;margin-bottom:7px;}' +
      '.is-skel-title{height:12px;width:92%;margin-bottom:5px;}' +
      '.is-skel-title2{height:12px;width:62%;margin-bottom:9px;}' +
      '.is-skel-stars{height:10px;width:42%;margin-bottom:9px;}' +
      '.is-skel-price{height:15px;width:48%;}' +

      /* end message */
      '#is-end-msg{text-align:center;padding:30px 0 44px;}' +
      '.is-end-stars{display:flex;justify-content:center;gap:12px;font-size:22px;margin-bottom:10px;}' +
      '.is-end-stars span{display:inline-block;animation:isEndBounce 1.5s ease-in-out infinite;}' +
      '.is-end-stars span:nth-child(2){animation-delay:.2s;font-size:28px;}' +
      '.is-end-stars span:nth-child(3){animation-delay:.4s;}' +
      '.is-end-line1{font-size:15px;font-weight:700;color:#fbbf24;letter-spacing:.3px;margin-bottom:5px;font-family:inherit;}' +
      '.is-end-line2{font-size:12px;color:#6b7280;}';

    document.head.appendChild(s);
  }

  /* ── Start ───────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
