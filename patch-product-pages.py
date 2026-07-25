#!/usr/bin/env python3
"""
Patches every products/<handle>.html page:
  1. Adds <script src="../assets/checkout.js"></script> right after the
     existing cart.js include (checkout.js needs buildCartItem from cart.js).
  2. Replaces handleBuyNow() so "Buy Now" goes to checkout.html for just
     that single item/qty, instead of opening WhatsApp. The item is stored
     via setBuyNowItem() (assets/checkout.js) WITHOUT touching the user's
     real cart.

The separate always-visible "💬 Order via WhatsApp" link on each product
page is NOT touched by this script.

Usage:  python3 patch-product-pages.py
Run from the repo root (where the products/ folder lives).
"""
import re
import glob
import sys

CART_JS_TAG = '<script src="../assets/cart.js"></script>'
CHECKOUT_JS_TAG = '<script src="../assets/checkout.js"></script>'

OLD_BLOCK_RE = re.compile(
    r"// Buy now.*?\nfunction handleBuyNow\(\) \{.*?\n\}\n(?=</script>\n</body>\n</html>)",
    re.S
)

NEW_BLOCK = """// Buy now — skips the cart, goes straight to a single-item checkout
function handleBuyNow() {
  const qty = parseInt(document.getElementById('qty-input')?.value||1);
  setBuyNowItem(__product, __selectedVariantId, qty);
  window.location.href = '../checkout.html?mode=buynow';
}
"""

def patch_file(path):
    original = open(path, encoding='utf-8').read()
    content = original

    if CHECKOUT_JS_TAG not in content:
        if CART_JS_TAG not in content:
            return False, "cart.js tag not found"
        content = content.replace(CART_JS_TAG, CART_JS_TAG + "\n" + CHECKOUT_JS_TAG, 1)

    if not OLD_BLOCK_RE.search(content):
        return False, "handleBuyNow block not found (already patched or different shape)"

    content = OLD_BLOCK_RE.sub(NEW_BLOCK, content, count=1)

    if content == original:
        return False, "no changes made"

    open(path, 'w', encoding='utf-8').write(content)
    return True, "patched"

def main():
    files = sorted(glob.glob("products/*.html"))
    if not files:
        print("No files found under products/ — run this from the repo root.")
        sys.exit(1)

    ok, skipped = 0, []
    for f in files:
        changed, msg = patch_file(f)
        if changed:
            ok += 1
        else:
            skipped.append((f, msg))

    print(f"Patched {ok}/{len(files)} product pages.")
    if skipped:
        print("Skipped/unchanged:")
        for f, msg in skipped:
            print(f"  - {f}: {msg}")

if __name__ == "__main__":
    main()
