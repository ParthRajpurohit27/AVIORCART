#!/usr/bin/env python3
"""
AVIORCART — Bulk Product Adder
================================
Reads new-products.csv and:
  1. Appends each row as a new product entry to assets/products.js
  2. Generates a full products/<handle>.html page for each one
     (gallery, price, variants, tabs, "Similar Products" — matching
     the exact structure of your existing product pages)

Usage:
    python3 add-products.py                  (reads new-products.csv)
    python3 add-products.py my-file.csv      (reads a different CSV)

Run this from the repo root (where assets/products.js lives).
See MANUAL-ADD-PRODUCTS.md for the full step-by-step guide and the
exact meaning of every CSV column.
"""
import csv
import json
import re
import sys
import random
import html as htmllib

PRODUCTS_JS = "assets/products.js"
PRODUCTS_DIR = "products"
DEFAULT_CSV = "new-products.csv"

WA_NUMBER = "919425619133"  # keep in sync with the rest of the site

VALID_NAV_CATEGORIES = {"Clothing", "Watches", "Beauty", "Footwear", "Jewelry", "Electronics", "Home"}


# ───────────────────────── helpers ─────────────────────────

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "product"


def esc(s):
    return htmllib.escape(str(s), quote=True)


def load_products_js():
    content = open(PRODUCTS_JS, encoding="utf-8").read()
    start_marker = "const PRODUCTS = "
    start_idx = content.index(start_marker) + len(start_marker)
    end_anchor = "\n];\n\nfunction getProductByHandle"
    end_idx = content.index(end_anchor, start_idx) + 3  # include the "\n];"
    array_str = content[start_idx:end_idx]              # ends with ";"
    products = json.loads(array_str[:-1])                # strip ";" -> valid JSON array
    return content, start_idx, end_idx, products


def save_products_js(content, start_idx, end_idx, products):
    new_array_str = json.dumps(products, indent=2, ensure_ascii=False) + ";"
    new_content = content[:start_idx] + new_array_str + content[end_idx:]
    open(PRODUCTS_JS, "w", encoding="utf-8").write(new_content)


def unique_handle(base_handle, taken):
    handle = base_handle
    n = 2
    while handle in taken:
        handle = f"{base_handle}-{n}"
        n += 1
    return handle


def parse_list(value, sep="|"):
    if not value:
        return []
    return [v.strip() for v in value.split(sep) if v.strip()]


# ───────────────────────── row -> product dict ─────────────────────────

def build_product(row, new_id, existing_handles, category_emoji_map):
    title = row["title"].strip()
    if not title:
        raise ValueError("title is required")

    base_handle = slugify(row.get("handle", "").strip() or title)
    handle = unique_handle(base_handle, existing_handles)

    price = float(row["price"])
    compare_at = row.get("compare_at_price", "").strip()
    compare_at_price = float(compare_at) if compare_at else 0

    category_name = row.get("category_name", "").strip() or "All"
    category_emoji = row.get("category_emoji", "").strip() or category_emoji_map.get(category_name, "🛍️")

    images = parse_list(row.get("images", ""))
    if not images:
        raise ValueError(f"'{title}': at least one image URL is required")

    tags = [t.strip() for t in row.get("tags", "").split(",") if t.strip()]

    option_name = row.get("option_name", "").strip()
    option_values = parse_list(row.get("option_values", ""), sep=",")
    variant_prices = parse_list(row.get("variant_prices", ""), sep="|")

    variants = []
    if option_name and option_values:
        for i, val in enumerate(option_values):
            v_price = float(variant_prices[i]) if i < len(variant_prices) and variant_prices[i] else price
            variants.append({
                "id": new_id * 1000 + i + 1,
                "sku": "",
                "price": v_price,
                "compare_at_price": compare_at_price,
                "option1": val.strip(),
                "option2": "",
                "available": True
            })
        option1_name = option_name
    else:
        variants.append({
            "id": new_id * 1000 + 1,
            "sku": "",
            "price": price,
            "compare_at_price": compare_at_price,
            "option1": "Default Title",
            "option2": "",
            "available": True
        })
        option1_name = "Title"

    product = {
        "handle": handle,
        "title": title,
        "description": row.get("description", "").strip(),
        "vendor": "AVIORCART",
        "type": row.get("type", "").strip(),
        "tags": tags,
        "status": "active",
        "price": price,
        "compare_at_price": compare_at_price,
        "option1_name": option1_name,
        "option2_name": "",
        "variants": variants,
        "images": images,
        "id": new_id,
        "category_emoji": category_emoji,
        "category_name": category_name
    }
    return product


# ───────────────────────── HTML page generation ─────────────────────────

PLACEHOLDER_SVG = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E"
                    "%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' "
                    "dominant-baseline='middle' text-anchor='middle' font-size='80'%3E🛍️%3C/text%3E%3C/svg%3E")


def money_str(amount):
    return "₹" + str(int(round(amount)))


def gallery_html(product):
    imgs = product["images"]
    main_img = imgs[0]
    thumbs = "".join(
        f'<div class="gallery__thumb{" active" if i == 0 else ""}" data-src="{esc(u)}">'
        f'<img src="{esc(u)}" alt="{esc(product["title"])}" loading="lazy" onerror="this.style.display=\'none\'"></div>'
        for i, u in enumerate(imgs)
    )
    return main_img, thumbs


def variant_block_html(product):
    if len(product["variants"]) <= 1:
        return ""
    opt_name = product["option1_name"]
    first_val = product["variants"][0]["option1"]
    btns = "".join(
        f'<button class="variant-btn{" active" if i == 0 else ""}" data-value="{esc(v["option1"])}" '
        f'onclick="selectVariantOpt(this)">{esc(v["option1"])}</button>'
        for i, v in enumerate(product["variants"])
    )
    return (
        f'<div class="variant-wrap" data-option="{esc(opt_name)}" style="margin-bottom:16px;">'
        f'<div class="variant-label">{esc(opt_name)}: <span class="variant-selected" id="selected-opt1">{esc(first_val)}</span></div>'
        f'<div class="variant-options" id="variant-opts">{btns}</div>'
        f'</div>'
    )


def similar_products_html(product, all_products):
    pool = [p for p in all_products if p["handle"] != product["handle"] and p["category_name"] == product["category_name"]]
    if len(pool) < 4:
        pool += [p for p in all_products if p["handle"] != product["handle"] and p not in pool]
    picks = random.sample(pool, min(4, len(pool))) if pool else []
    if not picks:
        return ""

    cards = []
    for p in picks:
        img = p["images"][0] if p["images"] else ""
        discount = ""
        if p.get("compare_at_price") and p["compare_at_price"] > p["price"]:
            pct = round((1 - p["price"] / p["compare_at_price"]) * 100)
            discount = f'<span class="product-card__badge badge-sale">{pct}% OFF</span>'
        old_price = (f'<span class="price-old">{money_str(p["compare_at_price"])}</span>'
                     if p.get("compare_at_price") and p["compare_at_price"] > p["price"] else "")
        cards.append(f'''<div class="product-card" data-animate>
  <div class="product-card__img">
    <a href="{esc(p["handle"])}.html">
      <img src="{esc(img)}" alt="{esc(p["title"])}" loading="lazy" onerror="this.parentElement.innerHTML='<div style=\\'font-size:36px;display:flex;align-items:center;justify-content:center;height:100%;\\'>🛍️</div>'">
    </a>
    {discount}
    <div class="product-card__quick">
      <a href="{esc(p["handle"])}.html" class="btn btn-gold btn-sm btn-full">View Product</a>
    </div>
  </div>
  <div class="product-card__info">
    <div class="product-card__brand">AVIORCART</div>
    <a href="{esc(p["handle"])}.html" class="product-card__name">{esc(p["title"])}</a>
    <div class="product-card__price">
      <span class="price-current">{money_str(p["price"])}</span>
      {old_price}
    </div>
  </div>
</div>''')

    return f'''
<div style="margin-top:40px;">
  <div class="section-head"><h2 class="section-title">Similar Products</h2></div>
  <div class="product-grid">{"".join(cards)}</div>
</div>'''


def generate_product_html(product, all_products):
    title = product["title"]
    desc = product["description"] or title
    price = product["price"]
    compare_at = product.get("compare_at_price") or 0
    main_img, thumbs = gallery_html(product)
    variant_block = variant_block_html(product)
    similar = similar_products_html(product, all_products)
    cat_name = product["category_name"]

    price_block = f'<span class="product-price-main" id="product-price">{money_str(price)}</span>'
    if compare_at and compare_at > price:
        price_block += (f'<span class="price-old" style="margin-left:10px;">{money_str(compare_at)}</span>'
                         f'<span class="price-off" style="margin-left:8px;color:var(--green);font-weight:600;">'
                         f'{round((1 - price / compare_at) * 100)}% off</span>')

    variants_json = json.dumps(product["variants"], ensure_ascii=False)
    product_json = json.dumps(product, ensure_ascii=False)
    first_variant_id = product["variants"][0]["id"]

    tags_str = ", ".join(product["tags"]) if product["tags"] else "—"
    sku_str = product["variants"][0].get("sku") or "—"

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)} — AVIORCART</title>
  <meta name="description" content="{esc(desc[:150])}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="manifest" href="/assets/manifest.json">
  <link rel="apple-touch-icon" sizes="152x152" href="/assets/icon-152x152.png">
  <script>
    if('serviceWorker' in navigator){{
      window.addEventListener('load',function(){{
        navigator.serviceWorker.register('/assets/sw.js',{{scope:'/'}})
          .then(()=>{{}}).catch(()=>{{}});
      }});
    }}
  </script>
  <link rel="stylesheet" href="../assets/theme.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⭐</text></svg>">
</head>
<body>
<div id="header-placeholder"></div>
<main id="main-content">
<div class="product-page">
  <div class="container">
    <nav class="breadcrumb">
      <a href="../index.html">Home</a><span class="breadcrumb__sep">›</span>
      <a href="../collections.html?cat={esc(cat_name)}"> {esc(cat_name)}</a><span class="breadcrumb__sep">›</span>
      <span>{esc(title)}</span>
    </nav>

    <div class="product-layout">
      <div>
        <div class="gallery__main">
          <img id="gallery-main" src="{esc(main_img)}" alt="{esc(title)}" loading="eager" onerror="this.src='{PLACEHOLDER_SVG}'">
        </div>
        <div class="gallery__thumbs">{thumbs}</div>
      </div>

      <div class="product-info">
        <div class="product-info__brand">AVIORCART</div>
        <h1 class="product-info__title">{esc(title)}</h1>
        <div class="product-info__rating">
          <span class="rating-box">⭐ New</span>
          <span class="rating-count">Be the first to review</span>
        </div>
        <div class="product-info__divider"></div>
        <div class="product-info__price">
          {price_block}
        </div>
        <div class="product-info__divider"></div>

        {variant_block}

        <div class="qty-wrap">
          <div class="variant-label" style="margin-bottom:8px;">Quantity</div>
          <div class="qty-selector">
            <button class="qty-btn" onclick="adjustQty(-1)">−</button>
            <input class="qty-input" id="qty-input" type="number" value="1" min="1" max="99">
            <button class="qty-btn" onclick="adjustQty(1)">+</button>
          </div>
        </div>

        <div class="product-actions">
          <button id="atc-btn" class="btn btn-gold btn-lg btn-atc" onclick="handleAddToCart(this)">
            🛒 Add to Cart
          </button>
          <button id="buy-btn" class="btn btn-black btn-lg btn-buy" onclick="handleBuyNow()">
            ⚡ Buy Now
          </button>
        </div>

        <div style="margin-bottom:16px;">
          <a href="https://wa.me/{WA_NUMBER}?text=Hi! I want to order: {esc(title)} Price: {money_str(price)}" target="_blank" class="btn btn-full" style="background:#25D366;color:#fff;gap:8px;border-radius:8px;padding:12px;">
            💬 Order via WhatsApp
          </a>
        </div>

        <div class="product-offers">
          <div class="product-offers__title">🏷️ Available Offers</div>
          <div class="offer-item">🏦 <span><b>Bank Offer:</b> 5% cashback on payments</span></div>
          <div class="offer-item">🚚 <span><b>FREE Delivery</b> on Every Order 🎉</span></div>
          <div class="offer-item">🔄 <span><b>Easy Return</b> within 10 days</span></div>
        </div>

        <div class="product-meta-grid">
          <div class="meta-item"><span class="meta-item__icon">🚚</span> FREE Delivery</div>
          <div class="meta-item"><span class="meta-item__icon">🔄</span> 10-day returns</div>
          <div class="meta-item"><span class="meta-item__icon">🔒</span> Secure payment</div>
          <div class="meta-item"><span class="meta-item__icon">✅</span> 100% genuine</div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab-nav">
        <button class="tab-btn active" onclick="switchTab('tab-desc',this)">Description</button>
        <button class="tab-btn" onclick="switchTab('tab-details',this)">Product Details</button>
        <button class="tab-btn" onclick="switchTab('tab-ship',this)">Shipping & Returns</button>
      </div>
      <div class="tab-content active" id="tab-desc">{esc(desc)}</div>
      <div class="tab-content" id="tab-details">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 0;color:#6b7280;width:40%;">Brand</td><td style="font-weight:500;">AVIORCART</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 0;color:#6b7280;">Type</td><td style="font-weight:500;">{esc(product["type"] or "—")}</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 0;color:#6b7280;">SKU</td><td style="font-weight:500;">{esc(sku_str)}</td></tr>
          <tr><td style="padding:10px 0;color:#6b7280;">Tags</td><td style="font-weight:500;">{esc(tags_str)}</td></tr>
        </table>
      </div>
      <div class="tab-content" id="tab-ship">
        <p><b>FREE Delivery</b> on Every Order 🎉. Standard: 3–7 days. Express: 1–2 days.</p>
        <p style="margin-top:12px;"><b>Returns:</b> 10-day easy returns on unused items in original packaging.</p>
      </div>
    </div>
    {similar}
  </div>
</div>
</main>
<div id="footer-placeholder"></div>

<script>
const __product = {product_json};
const __variants = {variants_json};
let __selectedVariantId = {first_variant_id};
</script>
<script src="../assets/products.js"></script>
<script src="../assets/cart.js"></script>
<script src="../assets/checkout.js"></script>
<script src="../assets/layout.js"></script>
<script>
document.querySelectorAll('.gallery__thumb').forEach(t => {{
  t.addEventListener('click', () => {{
    document.querySelectorAll('.gallery__thumb').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const main = document.getElementById('gallery-main');
    if (main) {{ main.style.opacity='0'; setTimeout(() => {{ main.src = t.dataset.src; main.style.opacity='1'; }}, 150); main.style.transition='opacity 0.15s'; }}
  }});
}});

function switchTab(id, btn) {{
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}}

function adjustQty(d) {{
  const inp = document.getElementById('qty-input');
  if (inp) inp.value = Math.max(1, (parseInt(inp.value)||1) + d);
}}

function selectVariantOpt(btn) {{
  btn.closest('.variant-options')?.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const label = btn.closest('.variant-wrap')?.querySelector('.variant-selected');
  if (label) label.textContent = btn.dataset.value;
  const val = btn.dataset.value;
  const match = __variants.find(v => v.option1 === val);
  if (match) {{
    __selectedVariantId = match.id;
    const priceEl = document.getElementById('product-price');
    if (priceEl) priceEl.textContent = '₹' + Math.round(match.price).toLocaleString('en-IN');
  }}
}}

function handleAddToCart(btn) {{
  const qty = parseInt(document.getElementById('qty-input')?.value||1);
  addToCart(__product, __selectedVariantId, qty, btn);
}}

function handleBuyNow() {{
  const qty = parseInt(document.getElementById('qty-input')?.value||1);
  setBuyNowItem(__product, __selectedVariantId, qty);
  window.location.href = '../checkout.html?mode=buynow';
}}
</script>
</body>
</html>
'''


# ───────────────────────── main ─────────────────────────

def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV

    try:
        rows = list(csv.DictReader(open(csv_path, encoding="utf-8-sig")))
    except FileNotFoundError:
        print(f"❌ Couldn't find '{csv_path}'. Copy new-products-template.csv, fill it in, and try again.")
        sys.exit(1)

    if not rows:
        print(f"❌ '{csv_path}' has no product rows.")
        sys.exit(1)

    content, start_idx, end_idx, products = load_products_js()
    existing_handles = {p["handle"] for p in products}
    category_emoji_map = {}
    for p in products:
        category_emoji_map.setdefault(p["category_name"], p["category_emoji"])
    next_id = max((p["id"] for p in products), default=0) + 1

    added = []
    errors = []

    for i, row in enumerate(rows, start=1):
        try:
            product = build_product(row, next_id, existing_handles, category_emoji_map)
            existing_handles.add(product["handle"])
            products.append(product)
            added.append(product)
            next_id += 1
        except Exception as e:
            errors.append(f"Row {i} ({row.get('title','?')}): {e}")

    if not added:
        print("❌ No products were added. Errors:")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    # Write products.js once, with everything appended
    save_products_js(content, start_idx, end_idx, products)

    # Generate one HTML page per new product (uses the FULL updated
    # products list so "Similar Products" can reference other new items too)
    for product in added:
        html_out = generate_product_html(product, products)
        out_path = f"{PRODUCTS_DIR}/{product['handle']}.html"
        open(out_path, "w", encoding="utf-8").write(html_out)

    print(f"✅ Added {len(added)} product(s):")
    for p in added:
        cat_warn = "" if p["category_name"] in VALID_NAV_CATEGORIES or p["category_name"] == "All" else \
            f"  ⚠ category '{p['category_name']}' won't show under the top nav filters"
        print(f"  - {p['title']}  →  products/{p['handle']}.html{cat_warn}")

    if errors:
        print(f"\n⚠ {len(errors)} row(s) were skipped:")
        for e in errors:
            print("  -", e)

    print("\nNext steps:")
    print("  1. Open a couple of the new product pages locally to eyeball them.")
    print("  2. git add -A && git commit -m \"Add new products\" && git push")
    print("  3. Vercel redeploys automatically — check the live site in ~1-2 min.")


if __name__ == "__main__":
    main()
