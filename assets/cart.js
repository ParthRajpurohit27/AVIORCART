/* ═══════════════════════════════════════════════════
   AVIORCART — Local Storage Cart Engine
   Full cart: add, remove, update qty, persist
   ═══════════════════════════════════════════════════ */

const CART_KEY = 'aviorcart_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch(e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function cartAddItem(product, variantId, qty = 1) {
  const cart = getCart();
  const variant = product.variants.find(v => v.id === variantId) || product.variants[0];
  if (!variant) return;
  const key = `${product.id}_${variant.id}`;
  const existing = cart.find(i => i.key === key);
  if (existing) {
    existing.quantity += qty;
  } else {
    const varLabel = (!variant.option1 || variant.option1 === 'Default Title') ? '' : variant.option1 + (variant.option2 ? ' / ' + variant.option2 : '');
    cart.push({
      key,
      product_id: product.id,
      variant_id: variant.id,
      title: product.title,
      variant_title: varLabel,
      price: variant.price,
      image: product.images[0] || '',
      handle: product.handle,
      quantity: qty
    });
  }
  saveCart(cart);
  return cart;
}

function cartRemoveItem(key) {
  const cart = getCart().filter(i => i.key !== key);
  saveCart(cart);
  return cart;
}

function cartUpdateQty(key, qty) {
  if (qty <= 0) return cartRemoveItem(key);
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if (item) item.quantity = parseInt(qty);
  saveCart(cart);
  return cart;
}

function cartTotal() {
  return getCart().reduce((s, i) => s + i.price * i.quantity, 0);
}

function cartCount() {
  return getCart().reduce((s, i) => s + i.quantity, 0);
}

function cartClear() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
}

/* ══ UI FUNCTIONS ══ */

function updateCartCount() {
  const count = cartCount();
  document.querySelectorAll('#cart-count').forEach(el => {
    el.textContent = count;
    el.classList.toggle('show', count > 0);
  });
}

function openCart() {
  const d = document.getElementById('cart-drawer');
  if (!d) return;
  d.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartDrawer();
}

function closeCart() {
  const d = document.getElementById('cart-drawer');
  if (!d) return;
  d.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartDrawer() {
  const cart = getCart();
  const body = document.getElementById('cart-body');
  const foot = document.getElementById('cart-foot');
  const countEl = document.getElementById('cart-drawer-count');
  const totalCount = cartCount();
  if (countEl) countEl.textContent = totalCount > 0 ? `(${totalCount})` : '';
  if (!body || !foot) return;

  if (cart.length === 0) {
    body.innerHTML = `<div class="drawer-empty">
      <div class="drawer-empty__icon">🛒</div>
      <div class="drawer-empty__title">Cart is empty!</div>
      <div class="drawer-empty__sub">Add items to get started</div>
      <button class="btn btn-gold btn-sm" onclick="closeCart()">Continue Shopping</button>
    </div>`;
    foot.innerHTML = '';
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="drawer-item">
      <a href="/products/${item.handle}.html" class="drawer-item__img" onclick="closeCart()">
        <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'><rect fill=\'%23f3f4f6\' width=\'60\' height=\'60\'/><text x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-size=\'24\'>🛍️</text></svg>'">
      </a>
      <div style="flex:1;min-width:0;">
        <div class="drawer-item__name">${item.title}</div>
        ${item.variant_title ? `<div class="drawer-item__variant">${item.variant_title}</div>` : ''}
        <div class="drawer-item__row">
          <div class="drawer-qty">
            <button onclick="drawerQtyChange('${item.key}', ${item.quantity - 1})">−</button>
            <input type="number" value="${item.quantity}" min="0" onchange="drawerQtyChange('${item.key}', this.value)">
            <button onclick="drawerQtyChange('${item.key}', ${item.quantity + 1})">+</button>
          </div>
          <div class="drawer-item__price">${money(item.price * item.quantity)}</div>
        </div>
        <button class="drawer-remove" onclick="drawerRemove('${item.key}')">✕ Remove</button>
      </div>
    </div>`).join('');

  const total = cartTotal();
  foot.innerHTML = `
    <div class="drawer-subtotal">
      <span>Subtotal (${totalCount} items)</span>
      <span class="drawer-subtotal__amount">${money(total)}</span>
    </div>
    <a href="/cart.html" class="btn btn-gold btn-full btn-lg" style="margin-bottom:8px;" onclick="closeCart()">
      Proceed to Checkout →
    </a>
    <a href="/cart.html" class="btn btn-black btn-full" onclick="closeCart()">View Full Cart</a>
    <div class="drawer-note">🔒 Secure SSL encrypted checkout</div>`;
}

function drawerQtyChange(key, qty) {
  cartUpdateQty(key, parseInt(qty));
  renderCartDrawer();
}

function drawerRemove(key) {
  cartRemoveItem(key);
  renderCartDrawer();
}

/* ══ ADD TO CART (called from product cards & product pages) ══ */
function addToCart(product, variantId, qty, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }
  try {
    cartAddItem(product, variantId, qty || 1);
    showToast('✨ Added to cart!');
    setTimeout(() => openCart(), 300);
  } catch(e) {
    showToast('❌ Error adding to cart');
  } finally {
    if (btn) {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '🛒 Add to Cart';
      }, 600);
    }
  }
}

/* ══ TOAST ══ */
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══ WISHLIST (localStorage) ══ */
const WISH_KEY = 'aviorcart_wishlist';
function getWishlist() { try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch(e){ return []; } }
function toggleWishlist(btn, productId) {
  let wish = getWishlist();
  const idx = wish.indexOf(productId);
  if (idx >= 0) {
    wish.splice(idx, 1);
    btn.classList.remove('active');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    showToast('Removed from wishlist');
  } else {
    wish.push(productId);
    btn.classList.add('active');
    btn.innerHTML = '❤️';
    showToast('❤️ Added to wishlist!');
  }
  localStorage.setItem(WISH_KEY, JSON.stringify(wish));
}

/* ══ MOBILE MENU ══ */
function toggleMobileMenu() {
  const m = document.getElementById('mobile-menu');
  if (!m) return;
  m.classList.toggle('open');
  document.body.style.overflow = m.classList.contains('open') ? 'hidden' : '';
}

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  // Header scroll shadow
  const h = document.getElementById('site-header');
  if (h) {
    window.addEventListener('scroll', () => {
      h.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)';
    }, { passive: true });
  }
  // Animate on scroll
  const els = document.querySelectorAll('[data-animate]');
  if (els.length) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.05 });
    els.forEach((el, i) => {
      el.style.cssText = `opacity:0;transform:translateY(20px);transition:opacity 0.5s ${i * 60}ms ease,transform 0.5s ${i * 60}ms ease`;
      obs.observe(el);
    });
  }
});
