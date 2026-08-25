const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Orders at or below this amount skip PayU and are marked successful directly.
// Keep this low - it exists only for the ₹1 test/demo product.
const FREE_ORDER_MAX_AMOUNT = 1;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = req.body || {};
    const { fullName, phone, email, address, city, state, pincode, items, amount } = body;

    const amt = Number(amount) || 0;

    if (amt > FREE_ORDER_MAX_AMOUNT) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'This endpoint only accepts free/₹1 test orders. Use regular checkout.' }));
      return;
    }

    if (!fullName || !phone || !email || !address || !city || !state || !pincode || !Array.isArray(items) || !items.length) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing required order details' }));
      return;
    }

    const txnid = 'AVIORFREE' + Date.now() + Math.floor(Math.random() * 1000);

    const { error } = await supabase.from('orders').insert({
      full_name: fullName,
      phone: phone,
      email: email,
      address: address,
      city: city,
      state: state,
      pincode: pincode,
      items: items,
      amount: amt,
      txnid: txnid,
      payment_status: 'success'
    });

    if (error) {
      console.error('Supabase free-order insert failed:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Could not save order' }));
      return;
    }

    try {
      await notifyTelegram({ txnid, amount: amt, items, fullName, phone, email, address, city, state, pincode });
    } catch (err) {
      console.error('Telegram notify failed:', err);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ txnid: txnid }));
  } catch (err) {
    console.error('free-order error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server error' }));
  }
};

function mdEscape(str) {
  return String(str == null ? '' : str).replace(/([_*`\[])/g, '\\$1');
}

async function notifyTelegram({ txnid, amount, items, fullName, phone, email, address, city, state, pincode }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = [
    process.env.TELEGRAM_CHAT_ID,
    process.env.TELEGRAM_OWNER_ID,
    process.env.TELEGRAM_LOGS_GROUP_ID
  ].filter(Boolean);
  const uniqueChatIds = [...new Set(chatIds)];
  if (!token || !uniqueChatIds.length) return;

  const itemsText = items && items.length
    ? items.map(it => `• ${mdEscape(it.title)} × ${it.quantity} — ₹${it.price}`).join('\n')
    : 'N/A';

  const addressText = `${mdEscape(fullName)}\n${mdEscape(address)}\n${mdEscape(city)}, ${mdEscape(state)} - ${mdEscape(pincode)}\n📞 ${mdEscape(phone)}\n✉️ ${mdEscape(email)}`;

  const text =
    `🆓 *Free Test Order — AVIORCART*\n\n` +
    `*Order ID:* \`${mdEscape(txnid)}\`\n` +
    `*Amount:* ₹${mdEscape(amount)}\n\n` +
    `*Items:*\n${itemsText}\n\n` +
    `*Delivery Address:*\n${addressText}`;

  await Promise.all(uniqueChatIds.map(chatId =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    }).then(async r => {
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        console.error('Telegram API error for chat', chatId, r.status, t);
      }
    })
  ));
}
