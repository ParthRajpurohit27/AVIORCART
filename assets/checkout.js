
const BUYNOW_KEY = 'aviorcart_buynow_item';
const ORDERS_KEY = 'aviorcart_orders';

// { [txnid]: { items, address, amount, ts } }

/* ── Buy Now (single item, isolated from the real cart) ── */

// Called from product pages. Builds one line item the same way
// cartAddItem() would, but stores it separately so the customer's actul cart is not disturbed
function setBuyNowItem(product, variantId, qty) {
  const item = buildCartItem(product, variantId, qty);
  if (!item) return null;
  sessionStorage.setItem(BUYNOW_KEY, JSON.stringify(item));
  return item;
}

function getBuyNowItem() {
  try { return JSON.parse(sessionStorage.getItem(BUYNOW_KEY)) || null; }
  catch (e) { return null; }
}

function clearBuyNowItem() {
  sessionStorage.removeItem(BUYNOW_KEY);
}

/* ── Order record (for order-success.html UX summary) ── */

function saveOrderRecord(txnid, record) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(ORDERS_KEY)) || {}; } catch (e) { all = {}; }
  all[txnid] = Object.assign({ ts: Date.now() }, record);
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(all)); } catch (e) { /* storage full, ignore */ }
}

function getOrderRecord(txnid) {
  try {
    const all = JSON.parse(localStorage.getItem(ORDERS_KEY)) || {};
    return all[txnid] || null;
  } catch (e) { return null; }
}


const UDF_CHUNK_SIZE = 200; 
const UDF_FIELD_COUNT = 5;
const UDF_MAX_TOTAL = UDF_CHUNK_SIZE * UDF_FIELD_COUNT;

// address: {fullName, phone, email, address, city, pincode, state}
// items: array of cart items [{title, quantity, price}, ...]
function encodeOrderToUdf(address, items) {
  const compact = {
    n: address.fullName,
    p: address.phone,
    e: address.email,
    a: address.address,
    c: address.city,
    pc: address.pincode,
    st: address.state,
    i: items.map(it => [it.title, it.quantity, it.price])
  };

  let json = JSON.stringify(compact);

  // If it doesn't fit, progressively shorten item titles until it does.
  let maxTitle = 40;
  while (json.length > UDF_MAX_TOTAL && maxTitle > 5) {
    maxTitle -= 5;
    compact.i = items.map(it => [
      it.title.length > maxTitle ? it.title.slice(0, maxTitle - 1) + '…' : it.title,
      it.quantity,
      it.price
    ]);
    json = JSON.stringify(compact);
  }


  if (json.length > UDF_MAX_TOTAL) {
    compact.i = [['(see order summary)', items.reduce((s, it) => s + it.quantity, 0), items.reduce((s, it) => s + it.price * it.quantity, 0)]];
    json = JSON.stringify(compact);
  }

  const udf = { udf1: '', udf2: '', udf3: '', udf4: '', udf5: '' };
  for (let i = 0; i < UDF_FIELD_COUNT; i++) {
    udf['udf' + (i + 1)] = json.slice(i * UDF_CHUNK_SIZE, (i + 1) * UDF_CHUNK_SIZE);
  }
  return udf;
}

function decodeOrderFromUdf(udf1, udf2, udf3, udf4, udf5) {
  try {
    const json = [udf1, udf2, udf3, udf4, udf5].map(v => v || '').join('');
    const compact = JSON.parse(json);
    return {
      fullName: compact.n, phone: compact.p, email: compact.e,
      address: compact.a, city: compact.c, pincode: compact.pc, state: compact.st,
      items: (compact.i || []).map(it => ({ title: it[0], quantity: it[1], price: it[2] }))
    };
  } catch (e) { return null; }
}

/* ── Validation ── */

function validateAddress(a) {
  const errors = {};
  if (!a.fullName || a.fullName.trim().length < 2) errors.fullName = 'Enter your full name';
  if (!/^[6-9]\d{9}$/.test(a.phone || '')) errors.phone = 'Enter a valid 10-digit mobile number';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email || '')) errors.email = 'Enter a valid email address';
  if (!a.address || a.address.trim().length < 5) errors.address = 'Enter your full address';
  if (!a.city || a.city.trim().length < 2) errors.city = 'Enter your city';
  if (!/^\d{6}$/.test(a.pincode || '')) errors.pincode = 'Enter a valid 6-digit pincode';
  if (!a.state || a.state.trim().length < 2) errors.state = 'Enter your state';
  return errors;
}

/* ── Misc ── */

function genTxnId() {
  return 'AVIOR' + Date.now() + Math.floor(Math.random() * 1000);
}
