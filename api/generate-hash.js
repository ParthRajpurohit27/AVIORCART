// api/generate-hash.js
// Computes the PayU v1 request hash server-side. PAYU_KEY / PAYU_SALT never
// leave this function - the client only ever receives the final hash.

const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const { txnid, amount, productinfo, firstname, email, phone } = body;
    const udf1 = body.udf1 || '';
    const udf2 = body.udf2 || '';
    const udf3 = body.udf3 || '';
    const udf4 = body.udf4 || '';
    const udf5 = body.udf5 || '';

    if (!txnid || !amount || !productinfo || !firstname || !email) {
      res.status(400).json({ error: 'Missing required fields (txnid, amount, productinfo, firstname, email)' });
      return;
    }

    // Basic sanity checks
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(String(txnid))) {
      res.status(400).json({ error: 'Invalid txnid' });
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      res.status(400).json({ error: 'Invalid email' });
      return;
    }

    const key = process.env.PAYU_KEY;
    const salt = process.env.PAYU_SALT;
    const mode = (process.env.PAYU_MODE || 'test').toLowerCase();

    if (!key || !salt) {
      console.error('PAYU_KEY / PAYU_SALT not configured');
      res.status(500).json({ error: 'Payment gateway is not configured' });
      return;
    }

    const amountStr = amt.toFixed(2);

    // PayU v1 request hash sequence:
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|SALT
    // udf6-udf10 are unused here and stay empty.
    const hashSeq = [
      key, txnid, amountStr, productinfo, firstname, email,
      udf1, udf2, udf3, udf4, udf5,
      '', '', '', '', '',
      salt
    ].join('|');

    const hash = crypto.createHash('sha512').update(hashSeq).digest('hex');

    const payuUrl = mode === 'live'
      ? 'https://secure.payu.in/_payment'
      : 'https://test.payu.in/_payment';

    res.status(200).json({
      key,
      txnid,
      amount: amountStr,
      productinfo,
      firstname,
      email,
      phone: phone || '',
      udf1, udf2, udf3, udf4, udf5,
      hash,
      payuUrl
    });
  } catch (err) {
    console.error('generate-hash error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
