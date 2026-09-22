# Habentech Electronics — Telegram Mini App

A complete Telegram Mini App electronics marketplace: a customer storefront and an
admin dashboard, both running inside Telegram, backed by a single Next.js
application deployed on Vercel with Supabase as the database.

## 1. Project Overview

- **Customer Mini App** — browse, search and filter products, view rich product
  detail pages with an image gallery, request a product, place an order, and
  save favorites (stored locally).
- **Admin Mini App** — a dark, rounded, card-based dashboard (only the
  configured admin can open it) to add/edit/delete products, upload images,
  manage stock and featured products, and handle incoming orders and requests.
- **Telegram channel auto-posting** — every new product is automatically
  posted to your public Telegram channel with a "🛍 View Product" button that
  opens the Mini App.
- **Sell Device** — customers can submit a used device (category, brand,
  model, condition, category-specific specs, photos, expected price) for the
  store to review; the admin can mark it under review, make a price offer, or
  accept/reject it, and the customer accepts or rejects any offer from
  `/my-sell-requests`.
- **Inventory Management** — products can optionally be tracked with a real
  stock quantity, minimum stock level, cost/selling price, supplier, and
  location. Every add/remove/adjustment is recorded as an
  `inventory_transactions` row; completing an order automatically deducts
  stock (and reverses it if the order is un-completed), stock hitting zero
  flips the product to "Out of Stock", and crossing the minimum threshold
  sends the admin a one-time Telegram low-stock alert.
- One Next.js project. One deployment. No separate backend, no polling bot —
  everything runs through Next.js Route Handlers and a Telegram **webhook**.

## 2. Tech Stack

| Layer      | Tech |
|------------|------|
| Frontend   | Next.js (App Router), React, TypeScript, organized global CSS |
| Backend    | Next.js Route Handlers (serverless), Telegram Bot API |
| Database   | Supabase (PostgreSQL) |
| Icons      | lucide-react |
| Hosting    | Vercel |

## 3. Installation

```bash
npm install
cp .env.example .env.local   # fill in the values (see section 4)
npm run dev
```

The app runs at `http://localhost:3000`. Telegram Mini Apps require an
HTTPS URL to actually open inside Telegram — see section 10 for local
tunneling options.

## 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) after creating your bot. **Server-only.** |
| `TELEGRAM_CHANNEL_ID` | Your public channel's `@username` (e.g. `@my_electronics_store`). |
| `ADMIN_TELEGRAM_ID` | Your numeric Telegram user ID, from [@userinfobot](https://t.me/userinfobot). |
| `TELEGRAM_WEBHOOK_SECRET` | Any random string, e.g. `openssl rand -hex 32`. |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Optional — your bot's `@username` without the `@`. Enables direct Mini-App deep links. |
| `NEXT_PUBLIC_TELEGRAM_APP_NAME` | Optional — the Mini App "short name" you set in BotFather's `/newapp`. |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL, e.g. `https://your-project.vercel.app` (no trailing slash). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API. **Server-only, never expose this.** |

None of the sensitive keys are prefixed with `NEXT_PUBLIC_`, so they never
reach the browser bundle.

## 5. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
   This creates all tables (`products`, `product_images`,
   `product_specifications`, `orders`, `product_requests`,
   `store_settings`), indexes, `updated_at` triggers, and Row Level
   Security policies (public reads only — all writes go through the
   server using the service role key, which bypasses RLS).
3. Then run [`supabase/schema_sell_and_inventory.sql`](supabase/schema_sell_and_inventory.sql)
   (after the file above). This adds the Sell Device tables
   (`sell_requests`, `sell_request_specifications`,
   `sell_request_images`, `sell_offers`), the Inventory Management
   tables (`inventory`, `inventory_transactions`), and extends
   `products.availability` to allow the automatic `"Out of Stock"`
   state.
4. Copy your Project URL, anon key, and service role key into `.env.local`.

## 6. Telegram Bot Creation

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → follow the
   prompts. Save the token into `TELEGRAM_BOT_TOKEN`.
2. Register the Mini App:
   - `/newapp`, select your bot, and set the Web App URL to your deployed
     `NEXT_PUBLIC_APP_URL`.
   - Note the **short name** you choose — put it in
     `NEXT_PUBLIC_TELEGRAM_APP_NAME`.
3. (Optional but recommended) `/setmenubutton` to add a persistent "Open
   Store" button in the chat with your bot, pointing at your app URL.

## 7. Telegram Channel Setup

1. Create a public Telegram channel (or use an existing one) and note its
   `@username` → `TELEGRAM_CHANNEL_ID`.

## 8. How to Make the Bot an Admin

1. Open your channel → **Administrators** → **Add Admin**.
2. Search for your bot and add it.
3. Make sure **"Post Messages"** permission is enabled (that's the only
   permission the bot needs).

## 9. How to Configure the Webhook

Telegram delivers updates via a webhook — no polling. Once deployed, tell
Telegram where to send updates:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<your-domain>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message", "callback_query"]
  }'
```

Verify it registered correctly:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

The webhook route (`/api/telegram/webhook`) rejects any request whose
`X-Telegram-Bot-Api-Secret-Token` header doesn't match
`TELEGRAM_WEBHOOK_SECRET`, so only genuine Telegram requests are processed.

## 10. Local Development

Telegram Mini Apps must be served over HTTPS to open inside the Telegram
client. For local testing, tunnel your dev server (e.g. with `ngrok http
3000` or the Cloudflare/VS Code tunnel of your choice), then temporarily
point your bot's Mini App URL and webhook at the tunnel URL.

You can also open `http://localhost:3000` directly in a regular browser to
iterate on layout and behavior — the app falls back gracefully outside
Telegram (no Telegram user, so admin routes correctly report
"Unauthorized" and customer actions that require Telegram identity are
disabled).

```bash
npm run dev     # start the app
npm run lint    # check code quality
npm run build   # production build
```

## 11. Vercel Deployment

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import it into [Vercel](https://vercel.com/new).
3. Add all the environment variables from section 4 in the Vercel project
   settings (Production, and Preview if you want preview deploys to work).
4. Deploy. Set `NEXT_PUBLIC_APP_URL` to the resulting `*.vercel.app` domain
   (or your custom domain), redeploy, then complete sections 6 and 9 using
   that URL.

The app is fully serverless-compatible: no local filesystem writes, no
background workers, no polling — every route is a Next.js Route Handler,
and product images live on Telegram's own CDN (see below).

## 12. Troubleshooting

- **"Unauthorized" in the Admin Dashboard** — `ADMIN_TELEGRAM_ID` must
  exactly match the numeric Telegram user ID of whoever opens the Mini
  App. The dashboard only trusts server-verified `initData`, never the
  client.
- **Products aren't posting to the channel** — confirm the bot is an
  admin of the channel with "Post Messages" permission, and that
  `TELEGRAM_CHANNEL_ID` is correct. If a product's channel post is stuck
  as "Not published," open it in the admin Products list and use
  **📢 Publish to Channel** to retry — the product itself is always
  saved even if the channel post fails.
- **Images don't upload** — image uploads require `TELEGRAM_BOT_TOKEN`
  and `ADMIN_TELEGRAM_ID` to be set; the admin must have started a chat
  with the bot at least once (Telegram requires an existing chat to
  deliver a file and mint a `file_id`).
- **Webhook not receiving updates** — re-run the `setWebhook` call in
  section 9 and check `getWebhookInfo` for a `last_error_message`. A
  mismatched `secret_token` will make the webhook silently reject
  requests with a 401.
- **Local dev shows Unauthorized everywhere** — that's expected outside
  Telegram, since there's no `initData` to verify. Use a tunnel (section
  10) and open the app through Telegram to test authenticated flows.

## Architecture Notes

- **No separate image storage.** Product photos are uploaded through the
  admin form, forwarded to Telegram via the bot (`lib/telegramImages.ts`)
  to obtain a permanent `file_id`, and served back to the browser through
  an internal proxy (`/api/telegram/image`) that never exposes the bot
  token. The same `file_id`s are reused when posting to the channel, so
  images are never re-uploaded.
- **Security.** Every admin-mutating route
  (`lib/telegramAuth.ts`) verifies Telegram's `initData` HMAC signature
  server-side and checks the resulting user ID against
  `ADMIN_TELEGRAM_ID` — the frontend's notion of "is admin" is never
  trusted.
- **Channel publishing** (`lib/channelPublisher.ts`) uses `sendPhoto` for
  a single image, `sendMediaGroup` for multiple, and a plain
  `sendMessage` when there are none, and keeps the resulting message IDs
  in Supabase so edits update the existing post instead of duplicating
  it.
