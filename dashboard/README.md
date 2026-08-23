# AVIORCART Admin Dashboard

Realtime orders dashboard. All logic is TypeScript (`src/*.ts`), compiled to plain JS (`assets/dist/*.js`) — HTML links only compiled JS, no inline `<script type="ts">` anywhere.

## Setup (do these 3 things)

1. **Run `supabase-setup.sql`** in Supabase → SQL Editor (enables RLS read policy + Realtime on `orders`).
2. **Create admin/owner login(s):** Supabase → Authentication → Users → Add User (email + password) for each person who should log in.
3. **Fill credentials in `src/config.ts`:**
   ```ts
   const SUPABASE_URL = "https://xxxx.supabase.co";      // Project Settings → API
   const SUPABASE_ANON_KEY = "eyJ...";                    // Project Settings → API → anon public key
   ```
   Then recompile:
   ```bash
   cd dashboard
   npm install --no-save typescript
   npx tsc -p tsconfig.json
   ```
   This regenerates `assets/dist/*.js`. Commit the `dist` folder too — GitHub Pages / Vercel serve plain JS, they don't run `tsc`.

## What's included

- Login gate (Supabase Auth) for admin/owner.
- Realtime order feed — new/updated/deleted orders reflect instantly, with sound + toast on new order.
- Filters: All / Successful / Failed / Pending, with live counts.
- Stats: total orders, revenue, success/failed/pending counts.
- Refresh button (spin animation) for manual reload.
- Download report as **PDF** or **PNG** per filter — includes AVIORCART stamp, founder name (Parth Rajpurohit), and payment partners (Delhivery, PayU).
- Same dark/gold theme + animated star canvas background as `about.html` / `contact.html`.

## Note on "Failed" orders

`api/payu-callback.js` currently only inserts orders into Supabase when `status === 'success'`. Failed/pending attempts aren't saved, so those tabs will stay empty until you also insert a row (e.g. `payment_status: 'failed'`) on failure in that file.
