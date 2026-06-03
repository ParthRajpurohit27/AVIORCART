/* AVIORCART — Shared Layout (Header + Footer + Overlays) */

(function() {
  const NAV_LINKS = [
    { title: '🛍️ All Products', url: 'collections.html' },
    { title: '👗 Fashion',       url: 'collections.html?cat=Clothing' },
    { title: '⌚ Watches',       url: 'collections.html?cat=Watches' },
    { title: '💄 Beauty',        url: 'collections.html?cat=Beauty' },
    { title: '👟 Footwear',      url: 'collections.html?cat=Footwear' },
    { title: '💍 Jewelry',       url: 'collections.html?cat=Jewelry' },
    { title: '🔋 Electronics',   url: 'collections.html?cat=Electronics' },
    { title: '🏠 Home',          url: 'collections.html?cat=Home' },
  ];

  // Detect depth: product pages are one level deep
  var isProduct = window.location.pathname.indexOf('/products/') !== -1;
  var ROOT = isProduct ? '../' : './';

  function href(url) { return ROOT + url; }

  function injectHeader() {
    var navLinks = NAV_LINKS.map(function(l){
      return '<a href="' + href(l.url) + '" class="category-nav__link">' + l.title + '</a>';
    }).join('');

    var mobileLinks = NAV_LINKS.slice(1).map(function(l){
      return '<a href="' + href(l.url) + '" class="mobile-menu__link">' + l.title + '</a>';
    }).join('');

    var html = '' +
'<div class="topbar">' +
'  <div class="container topbar__inner">' +
'    <span>✨ Free Delivery on all orders (Offer ends soon) &nbsp;|&nbsp; 10 Days Easy Returns &nbsp;|&nbsp; 100% Secure Payments</span>' +
'    <div class="topbar__right"><a href="#">Help</a><a href="#">About</a></div>' +
'  </div>' +
'</div>' +
'<header class="site-header" id="site-header">' +
'  <div class="container header__inner">' +
'    <a href="' + href('index.html') + '" class="header__logo">' +
'      <svg width="18" height="18" viewBox="0 0 24 24" style="flex-shrink:0"><polygon points="12,2 14,9 21,9 15.5,13.5 17.5,21 12,17 6.5,21 8.5,13.5 3,9 10,9" fill="#fbbf24"/></svg>' +
'      <div class="header__logo-text"><span class="logo-avi">AVI</span><span class="logo-or">OR</span><span class="logo-cart">CART</span></div>' +
'    </a>' +
'    <div class="header__search" style="position:relative;">' +
'      <input class="header__search-input" id="header-search-input" type="text" placeholder="Search for products, brands and more..." autocomplete="off">' +
'      <button class="header__search-btn" type="button" onclick="doSearch()">' +
'        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
'      </button>' +
'      <div class="search-dropdown" id="search-dropdown"></div>' +
'    </div>' +
'    <div class="header__actions">' +
'      <a href="#" class="header__action-item">' +
'        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
'        <span>Account</span>' +
'      </a>' +
'      <a href="' + href('wishlist.html') + '" class="header__action-item">' +
'        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
'        <span>Wishlist</span>' +
'      </a>' +
'      <button class="header__action-item header__cart-btn" onclick="openCart()">' +
'        <div style="position:relative;display:inline-flex;">' +
'          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
'          <span class="cart-badge" id="cart-count">0</span>' +
'        </div>' +
'        <span>Cart</span>' +
'      </button>' +
'      <button class="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="Menu">' +
'        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
'      </button>' +
'    </div>' +
'  </div>' +
'  <nav class="category-nav" id="category-nav">' +
'    <div class="container"><div class="category-nav__inner">' + navLinks + '</div></div>' +
'  </nav>' +
'</header>' +
'<div class="mobile-menu" id="mobile-menu">' +
'  <div class="mobile-menu__overlay" onclick="toggleMobileMenu()"></div>' +
'  <div class="mobile-menu__panel">' +
'    <div class="mobile-menu__header"><span class="mobile-menu__title">Menu</span><button onclick="toggleMobileMenu()">✕</button></div>' +
'    <a href="' + href('index.html') + '" class="mobile-menu__link">🏠 Home</a>' +
'    <a href="' + href('collections.html') + '" class="mobile-menu__link">🛍️ All Products</a>' +
     mobileLinks +
'    <div class="mobile-menu__divider"></div>' +
'    <a href="' + href('wishlist.html') + '" class="mobile-menu__link">❤️ Wishlist</a>' +
'    <a href="' + href('cart.html') + '" class="mobile-menu__link">🛒 Cart</a>' +
'  </div>' +
'</div>';

    var placeholder = document.getElementById('header-placeholder');
    if (placeholder) {
      var div = document.createElement('div');
      div.innerHTML = html;
      placeholder.parentNode.replaceChild(div, placeholder);
    }
  }

  function injectFooter() {
    var yr = new Date().getFullYear();
    var html = '' +
'<footer class="site-footer">' +
'  <div class="footer__top"><div class="container"><div class="footer__grid">' +
'    <div class="footer__brand">' +
'      <a href="' + href('index.html') + '" class="header__logo" style="margin-bottom:12px;">' +
'        <svg width="16" height="16" viewBox="0 0 24 24"><polygon points="12,2 14,9 21,9 15.5,13.5 17.5,21 12,17 6.5,21 8.5,13.5 3,9 10,9" fill="#fbbf24"/></svg>' +
'        <div class="header__logo-text" style="font-size:18px;"><span class="logo-avi">AVI</span><span class="logo-or" style="color:#fff;">OR</span><span class="logo-cart">CART</span></div>' +
'      </a>' +
'      <p class="footer__desc">Your one-stop destination for premium fashion, electronics, beauty and more.</p>' +
'      <div class="footer__social"><a href="#">📸</a><a href="#">👍</a><a href="#">🐦</a><a href="#">▶️</a></div>' +
'    </div>' +
'    <div class="footer__col"><h4>Quick Links</h4>' +
'      <a href="' + href('index.html') + '">Home</a>' +
'      <a href="' + href('collections.html') + '">All Products</a>' +
'      <a href="#">About Us</a><a href="#">Contact</a>' +
'    </div>' +
'    <div class="footer__col"><h4>Customer Service</h4>' +
'      <a href="#">FAQs</a><a href="#">Shipping Policy</a><a href="#">Return Policy</a><a href="#">Track Order</a><a href="#">Privacy Policy</a>' +
'    </div>' +
'    <div class="footer__col"><h4>Contact Us</h4>' +
'      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.8;">👤 Parth Rajpurohit<br>📍 Rajasthan 327001<br>📧 parthrajpurohit08@gmail.com<br>📞 +91 9425619133<br>🕐 Mon-Sat 11AM - 7PM</p>' +
'    </div>' +
'  </div></div></div>' +
'  <div class="footer__bottom"><div class="container footer__bottom-inner">' +
'    <span>© ' + yr + ' AVIORCART. All rights reserved.</span>' +
'    <span>Made with ❤️ by Parth Rajpurohit</span>' +
'  </div></div>' +
'</footer>' +
'<div class="cart-drawer" id="cart-drawer">' +
'  <div class="cart-drawer__overlay" onclick="closeCart()"></div>' +
'  <div class="cart-drawer__panel">' +
'    <div class="cart-drawer__head"><h3>My Cart <span id="cart-drawer-count" style="color:var(--gold);font-size:14px;"></span></h3><button onclick="closeCart()">✕</button></div>' +
'    <div class="cart-drawer__body" id="cart-body"></div>' +
'    <div class="cart-drawer__foot" id="cart-foot"></div>' +
'  </div>' +
'</div>' +
'<div class="toast" id="toast"></div>' +
'<a href="https://wa.me/919425619133?text=Hi%2C%20I%20want%20to%20order%20from%20AVIORCART" target="_blank" class="whatsapp-float" title="Chat on WhatsApp" style="position:fixed;bottom:24px;right:24px;z-index:9999;width:56px;height:56px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(37,211,102,.5);text-decoration:none;font-size:28px;transition:transform .2s;">💬</a>';

    var placeholder = document.getElementById('footer-placeholder');
    if (placeholder) {
      var div = document.createElement('div');
      div.innerHTML = html;
      placeholder.parentNode.replaceChild(div, placeholder);
    }
  }

  function initLiveSearch() {
    var input = document.getElementById('header-search-input');
    var dropdown = document.getElementById('search-dropdown');
    if (!input || !dropdown || typeof PRODUCTS === 'undefined') return;

    input.addEventListener('input', function() {
      var q = input.value.trim();
      if (q.length < 2) { dropdown.classList.remove('open'); return; }
      var results = searchProducts(q).slice(0, 8);
      if (!results.length) {
        dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:#6b7280;font-size:13px;">No products found</div>';
        dropdown.classList.add('open');
        return;
      }
      dropdown.innerHTML = results.map(function(p) {
        return '<a href="' + href('products/' + p.handle + '.html') + '" class="search-dropdown-item">' +
          '<img src="' + (p.images[0]||'') + '" alt="' + p.title + '" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" onerror="this.style.display=\'none\'">' +
          '<div class="search-dropdown-item__info">' +
            '<div class="search-dropdown-item__name">' + p.title + '</div>' +
            '<div class="search-dropdown-item__price">' + money(p.price) + '</div>' +
          '</div></a>';
      }).join('');
      dropdown.classList.add('open');
    });

    document.addEventListener('click', function(e) {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('open');
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doSearch();
    });
  }

  window.doSearch = function() {
    var q = document.getElementById('header-search-input');
    if (q && q.value.trim()) window.location.href = href('search.html') + '?q=' + encodeURIComponent(q.value.trim());
  };

  document.addEventListener('DOMContentLoaded', function() {
    injectHeader();
    injectFooter();
    setTimeout(function() {
      if (typeof updateCartCount === 'function') updateCartCount();
      initLiveSearch();
      // Scroll-based header shadow
      var h = document.getElementById('site-header');
      if (h) {
        window.addEventListener('scroll', function() {
          h.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)';
        }, { passive: true });
      }
    }, 10);
  });
})();
