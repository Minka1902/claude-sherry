# Sherry

Marketplace for coding work: buyers pay sellers to run coding prompts in the seller's own agent (Claude Code, Cursor, …). Sellers push the result to a per-order branch in the buyer's GitHub repo.

## How it works

- **Sign-in** is GitHub-only (`read:user user:email repo`). Tokens are stored AES-256-GCM encrypted.
- **Buy**: the buyer picks a seller, a repo they admin and a base branch. Credits are held in escrow.
  - **Prompt**: holds `max output tokens × seller rate per 10k`. The seller is paid for actual tokens, capped at the max, and the rest is refunded.
  - **Session**: flat price for N minutes + a token cap, ending at whichever comes first. The clock starts on accept. If nothing is delivered, the buyer gets a full refund.
- **Accept**: creates `sherry/order-<id>` from the base branch and invites the seller as a push collaborator.
- **Mark done**: the seller pushes, then marks the prompt done. The platform compares `lastSha...head` on GitHub and tokenizes **only added lines** (js-tiktoken `o200k_base`). It rejects force-pushes and opens a PR on the first delivery.
- **Close** (completed, expired, cancelled): money moves once, and collaborator access is revoked.
- **Reviews**: after a delivered order, the buyer rates **behavior** and **response time** (1–5★) and can add a comment. The seller page also shows the measured average response time.
- **Credits**: `$1 = 2 credits`, stored as integer centi-credits. Top-up is through Stripe Checkout, and sellers withdraw earned credits through Stripe Connect.

## Setup

```bash
cp .env.example .env            # fill in secrets
npm install
npx prisma migrate dev
npm run db:seed                 # optional demo sellers
npm run dev
```

- **GitHub OAuth app** callback: `http://localhost:3000/api/auth/callback/github`
- **Stripe webhook**: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- **Expiry cron**: `GET /api/cron/expire` with `Authorization: Bearer $CRON_SECRET`. Expiry is also settled lazily whenever an order is viewed.

## Scripts

| Command | What |
| --- | --- |
| `npm test` | Vitest: credits math, diff tokenizer, GitHub compare fallback, escrow/order flows against Postgres (`TEST_DATABASE_URL`, default `sherry_test`) |
| `npm run typecheck` / `npm run lint` / `npm run build` | Static checks and production build |
