// api/fampay-confirm.js
// Customer says "I've paid" + gives 12-digit UTR. Marks order for manual verification.
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const { txnid, utr } = req.body || {};
    if (!/^AVIORFAM\d{10,20}$/.test(String(txnid || ''))) return json(res, 400, { error: 'Invalid order id' });
    if (!/^\d{12}$/.test(String(utr || ''))) return json(res, 400, { error: 'UTR must be exactly 12 digits' });

    // Reject a UTR that was already used on another order
    const { data: dup } = await supabase.from('orders').select('txnid').eq('utr', utr).neq('txnid', txnid).limit(1);
    if (dup && dup.length) return json(res, 409, { error: 'This UTR is already used for another order' });

    const { data: order, error } = await supabase.from('orders')
      .update({ utr, payment_status: 'verification_pending' })
      .eq('txnid', txnid).eq('payment_status', 'pending')
      .select('amount, full_name, phone').single();
    if (error || !order) return json(res, 404, { error: 'Order not found or already submitted' });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const ids = [...new Set([process.env.TELEGRAM_CHAT_ID, process.env.TELEGRAM_OWNER_ID, process.env.TELEGRAM_LOGS_GROUP_ID].filter(Boolean))];
    if (token) {
      const text = `💸 *Payment claimed — VERIFY IN FAMPAY*\n\n*Order ID:* \`${txnid}\`\n*Expected:* ₹${Number(order.amount).toFixed(2)}\n*UTR:* \`${utr}\`\n*Customer:* ${String(order.full_name).replace(/([_*`\[])/g, '\\$1')} (${order.phone})\n\nFamPay me exact amount + ye UTR milne par hi ship kar.`;
      await Promise.all(ids.map(chat_id => fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' })
      }).catch(() => {})));
    }
    return json(res, 200, { ok: true, txnid });
  } catch (e) {
    console.error('fampay-confirm error:', e);
    return json(res, 500, { error: 'Server error' });
  }
};
