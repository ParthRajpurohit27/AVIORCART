// api/fampay-order.js
// Creates a PENDING order (no payment verified yet) and pings Telegram.
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}
const md = s => String(s == null ? '' : s).replace(/([_*`\[])/g, '\\$1');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const { fullName, phone, email, address, city, state, pincode, items, amount } = req.body || {};
    const amt = Number(amount);
    if (!fullName || !phone || !email || !address || !city || !state || !pincode ||
        !Array.isArray(items) || !items.length || !Number.isFinite(amt) || amt <= 0) {
      return json(res, 400, { error: 'Missing or invalid order details' });
    }
    const txnid = 'AVIORFAM' + Date.now() + Math.floor(Math.random() * 1000);

    const { error } = await supabase.from('orders').insert({
      full_name: fullName, phone, email, address, city, state, pincode,
      items, amount: amt, txnid, payment_status: 'pending'
    });
    if (error) {
      console.error('fampay-order insert failed:', error);
      return json(res, 500, { error: 'Could not save order' });
    }

    await tg(`🕒 *New FamPay order (unpaid yet)*\n\n*Order ID:* \`${md(txnid)}\`\n*Amount:* ₹${md(amt.toFixed(2))}\n\n` +
      items.map(i => `• ${md(i.title)} × ${i.quantity} — ₹${i.price}`).join('\n') +
      `\n\n*Ship to:*\n${md(fullName)}\n${md(address)}\n${md(city)}, ${md(state)} - ${md(pincode)}\n📞 ${md(phone)}`);

    return json(res, 200, { txnid, amount: amt.toFixed(2) });
  } catch (e) {
    console.error('fampay-order error:', e);
    return json(res, 500, { error: 'Server error' });
  }
};

async function tg(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ids = [...new Set([process.env.TELEGRAM_CHAT_ID, process.env.TELEGRAM_OWNER_ID, process.env.TELEGRAM_LOGS_GROUP_ID].filter(Boolean))];
  if (!token || !ids.length) return;
  await Promise.all(ids.map(chat_id =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' })
    }).catch(err => console.error('telegram error', err))
  ));
}
