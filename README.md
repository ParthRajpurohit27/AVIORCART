# AVIORCART — Static Site

A pixel-perfect static conversion of the AVIORCART Shopify theme, ready for Vercel deployment.

## Deploy to Vercel

1. Push this folder to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. **No build command needed** — this is pure HTML/CSS/JS
5. Set output directory to `.` (root)
6. Click Deploy

## Features

- ✅ 97 products from Shopify CSV — all product pages generated
- ✅ Pixel-perfect AVIORCART theme (Orbitron + Inter fonts, gold palette)
- ✅ Full Add to Cart & Buy Now buttons (localStorage cart)
- ✅ WhatsApp order integration (+91 9425619133)
- ✅ Live search with dropdown
- ✅ Filter by category, price, type
- ✅ Sort: featured, price, name, sale
- ✅ Pagination (24 products/page)
- ✅ Wishlist (localStorage)
- ✅ PWA-ready (manifest + service worker)
- ✅ Mobile responsive — identical to Shopify theme
- ✅ Cart drawer with qty controls
- ✅ Scroll-based product animations

## File Structure

```
/
├── index.html          — Homepage
├── collections.html    — All products + filters
├── cart.html           — Cart page
├── search.html         — Search results
├── wishlist.html       — Wishlist
├── 404.html            — Error page
├── vercel.json         — Vercel config
├── assets/
│   ├── theme.css       — Complete AVIORCART theme CSS
│   ├── products.js     — All 97 products as JS array
│   ├── cart.js         — localStorage cart engine
│   ├── layout.js       — Shared header/footer injector
│   ├── sw.js           — PWA service worker
│   └── manifest.json   — PWA manifest
└── products/
    └── [handle].html   — 97 individual product pages
```
