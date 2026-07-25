// api/payu-callback.js
// Set as BOTH surl and furl in the PayU form. PayU POSTs back here whether
// the payment succeeded or failed. We verify the reverse hash server-side
// (never trust status/amount from the request without this), then notify
// the seller on Telegram for verified successes, then redirect the
// customer's browser to a result page.

const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      redirect(res, '/order-failure.html?status=failed');
      return;
    }

    const body = req.body || {};
    const {
      status,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      hash: receivedHash
    } = body;

    const udf1 = body.udf1 || '';
    const udf2 = body.udf2 || '';
    const udf3 = body.udf3 || '';
    const udf4 = body.udf4 || '';
    const udf5 = body.udf5 || '';

    const key = process.env.PAYU_KEY;
    const salt = process.env.PAYU_SALT;

    if (!txnid) {
      redirect(res, '/order-failure.html?status=failed');
      return;
    }

    if (!salt || !key) {
      console.error('PAYU_KEY / PAYU_SALT not configured');
      redirect(res, `/order-failure.html?txnid=${enc(txnid)}&status=failed`);
      return;
    }

    // PayU v1 reverse hash sequence:
    // SALT|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    // udf6-udf10 are unused here and stay empty.
    const reverseSeq = [
      salt, status || '',
      '', '', '', '', '',
      udf5, udf4, udf3, udf2, udf1,
      email || '', firstname || '', productinfo || '', amount || '', txnid,
      key
    ].join('|');

    const computedHash = crypto.createHash('sha512').update(reverseSeq).digest('hex');
    const verified = !!receivedHash && computedHash === String(receivedHash).toLowerCase();

    if (!verified) {
      console.error('PayU hash verification failed for txnid', txnid);
      redirect(res, `/order-failure.html?txnid=${enc(txnid)}&status=failed`);
      return;
    }

    if (status !== 'success') {
      redirect(res, `/order-failure.html?txnid=${enc(txnid)}&status=${enc(status || 'failed')}`);
      return;
    }

    // Verified success — decode the order from udf and notify Telegram.
    // This is the seller's source of truth (not the browser localStorage
    // copy), so it fires here regardless of whether the customer's
    // browser makes it back to order-success.html.
    const order = decodeOrder(udf1, udf2, udf3, udf4, udf5);

    try {
      await notifyTelegram({ txnid, amount, productinfo, order });
    } catch (err) {
      // Don't fail the checkout if Telegram is down — just log it.
      console.error('Telegram notify failed:', err);
    }

    redirect(res, `/order-success.html?txnid=${enc(txnid)}&status=success`);
  } catch (err) {
    console.error('payu-callback error:', err);
    redirect(res, '/order-failure.html?status=failed');
  }
};

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function enc(v) {
  return encodeURIComponent(String(v));
}

function decodeOrder(udf1, udf2, udf3, udf4, udf5) {
  try {
    const json = [udf1, udf2, udf3, udf4, udf5].map(v => v || '').join('');
    const compact = JSON.parse(json);
    return {
      fullName: compact.n, phone: compact.p, email: compact.e,
      address: compact.a, city: compact.c, pincode: compact.pc, state: compact.st,
      items: (compact.i || []).map(it => ({ title: it[0], quantity: it[1], price: it[2] }))
    };
  } catch (e) {
    return null;
  }
}

function mdEscape(str) {
  // Legacy Telegram Markdown only needs a handful of characters escaped.
  return String(str == null ? '' : str).replace(/([_*`\[])/g, '\\$1');
}

async function notifyTelegram({ txnid, amount, productinfo, order }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // Support TELEGRAM_CHAT_ID (single recipient) as well as separate
  // owner / logs-group IDs, and send to whichever are configured.
  const chatIds = [
    process.env.TELEGRAM_CHAT_ID,
    process.env.TELEGRAM_OWNER_ID,
    process.env.TELEGRAM_LOGS_GROUP_ID
  ].filter(Boolean);

  const uniqueChatIds = [...new Set(chatIds)];
  if (!token || !uniqueChatIds.length) {
    console.warn('Telegram not configured (missing bot token or chat IDs) — skipping notification');
    return;
  }

  const itemsText = order && order.items && order.items.length
    ? order.items.map(it => `• ${mdEscape(it.title)} × ${it.quantity} — ₹${it.price}`).join('\n')
    : mdEscape(productinfo || 'N/A');

  const addressText = order
    ? `${mdEscape(order.fullName)}\n${mdEscape(order.address)}\n${mdEscape(order.city)}, ${mdEscape(order.state)} - ${mdEscape(order.pincode)}\n📞 ${mdEscape(order.phone)}\n✉️ ${mdEscape(order.email)}`
    : 'N/A';

  const text =
    `🛒 *New Order — AVIORCART*\n\n` +
    `*Order ID:* \`${mdEscape(txnid)}\`\n` +
    `*Amount:* ₹${mdEscape(amount)}\n\n` +
    `*Items:*\n${itemsText}\n\n` +
    `*Delivery Address:*\n${addressText}`;

  await Promise.all(uniqueChatIds.map(chatId =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    }).then(async r => {
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        console.error('Telegram API error for chat', chatId, r.status, t);
      }
    })
  ));
}
