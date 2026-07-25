# AVIORCART — Checkout Go-Live Setup

Everything in this repo is already wired for **live** PayU payments — going
live is purely a Vercel dashboard step, nothing to edit in code.

## 1. Set environment variables in Vercel
Project → **Settings → Environment Variables** → add each of these
(apply to Production, and Preview if you want to test on preview URLs too):

| Name | Value |
|---|---|
| `PAYU_KEY` | your PayU merchant key |
| `PAYU_SALT` | your PayU salt |
| `PAYU_MODE` | `live` |
| `TELEGRAM_BOT_TOKEN` | your bot's token from @BotFather |
| `TELEGRAM_OWNER_ID` | your personal Telegram chat ID |
| `TELEGRAM_LOGS_GROUP_ID` | your logs group's chat ID |

See `.env.example` for the exact names (values intentionally left blank —
never commit real secrets to git).

## 2. Redeploy
Environment variable changes only take effect on a **new deployment** —
push a commit, or hit Redeploy in the Vercel dashboard, after saving the
variables above.

## 3. Place one real test order yourself
Since `PAYU_MODE=live`, this is a real transaction — use a small amount
(₹1–2) that you're fine refunding from the PayU dashboard afterward.
Confirm all three of these happen:
- PayU redirects you back to `/order-success.html` with a summary shown
- You receive the Telegram message with the order + address
- The PayU dashboard shows the transaction as captured

If any of those three don't happen, check the Vercel function logs for
`api/generate-hash` and `api/payu-callback` first — they log the specific
failure reason (missing env var, hash mismatch, Telegram API error, etc).

## 4. Security note
Rotate the PayU Salt (Developer → API Key Salt details → **Regenerate
Salt**) and regenerate the Telegram bot token via @BotFather if either was
ever shared somewhere outside Vercel's environment variables — then update
the values in Vercel and redeploy.
