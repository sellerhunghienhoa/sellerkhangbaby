# SellerKhangBaby TikTok Shop API — preparation only

This is an isolated proposed Cloudflare Worker for **seller** OAuth. It has **not** been deployed, authorized by TikTok, or linked to the existing production dashboard. It preserves the existing website and Firestore.

## TikTok prerequisites

Use TikTok Shop Partner Center (not the ordinary TikTok Login Kit). Register/approve a seller integration; obtain App Key, App Secret and Service ID. Grant `seller.authorization.info` / Get Authorized Shops and later read-only orders/finance permissions as needed. Register the exact callback URL:
`https://YOUR-WORKER-SUBDOMAIN.workers.dev/oauth/callback`.

The main seller account must grant authorization separately for `shopkhangbaby` and `mekhangsua`. Compare the returned shop IDs with Seller Center before any synchronization. A shop label is not proof of the authorized shop identity.

## Deploy (from this directory, locally with valid Cloudflare access)

```sh
cd tiktok-worker
npx wrangler login
npx wrangler d1 create sellerkhangbaby-tiktok
```

Replace `REPLACE_WITH_REAL_D1_DATABASE_ID` in wrangler.jsonc with the ID returned by Cloudflare; then:

```sh
npx wrangler d1 execute sellerkhangbaby-tiktok --remote --file=./schema.sql
npx wrangler secret put TIKTOK_APP_KEY
npx wrangler secret put TIKTOK_APP_SECRET
npx wrangler secret put TIKTOK_SERVICE_ID
npx wrangler secret put ADMIN_API_KEY
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler deploy
```

Generate `TOKEN_ENCRYPTION_KEY` as base64 of 32 random bytes using a trusted local terminal:
`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
Generate a separate long, random `ADMIN_API_KEY`. Paste secrets only into Wrangler secret prompts, never into the public repository, the web dashboard JS or chat. Back up the encryption key securely.

## Authorize

Use a trusted administrator terminal only:

```sh
curl -X POST "https://YOUR-WORKER-SUBDOMAIN.workers.dev/admin/oauth/start" -H "Authorization: Bearer YOUR_PRIVATE_ADMIN_KEY" -H "Content-Type: application/json" --data '{"label":"shopkhangbaby"}'
```

Open the resulting `authorization_url` and approve with the main seller account. Repeat for `mekhangsua`. Then check:

```sh
curl -X POST "https://YOUR-WORKER-SUBDOMAIN.workers.dev/admin/shops/shopkhangbaby/verify" -H "Authorization: Bearer YOUR_PRIVATE_ADMIN_KEY"
```

The OAuth state is single-use and valid for 10 minutes. Tokens are encrypted at rest in dedicated D1 storage and not returned through browser endpoints. Admin endpoints use a separate bearer key.

**Important review before production:** TikTok Shop app/region-specific authorization URL, token endpoint and scope configuration must be verified against the current Partner Center configuration; verify token-expiration units with real responses, and shop authorization identity mapping. TikTok's optional IP allowlist may require fixed outbound IP, which Workers does not ordinarily guarantee. Add rate limiting/admin identity controls, token rotation policy, error monitoring and order sync only after successful scope testing. Do not use this Worker to calculate LIVE GMV from raw orders without business reconciliation.

The Cloudflare connector in this chat was refused permission for resource inspection/deployment; **nothing was deployed**.

## Creator Authorization and Affiliate GMV

Creator accounts use a **separate** OAuth flow and token lifecycle from Seller accounts.
The authorization address for creator accounts is:
`https://shop.tiktok.com/alliance/creator/auth?app_key=...`
The registered Creator callback must match the deployed URL ending in
`/oauth/creator/callback`. Confirm the creator-app registration and permission review in TikTok Shop Partner Center.

Start from a trusted terminal using admin bearer auth:
```sh
curl -X POST "https://YOUR-WORKER-SUBDOMAIN.workers.dev/admin/creators/oauth/start" -H "Authorization: Bearer YOUR_PRIVATE_ADMIN_KEY" -H "Content-Type: application/json" --data '{"alias":"creator-1"}'
```
Open the returned authorization URL with the Creator's own account, and obtain consent. Repeat for each Creator.

Inspect authorized accounts:
```sh
curl "https://YOUR-WORKER-SUBDOMAIN.workers.dev/admin/creators" -H "Authorization: Bearer YOUR_PRIVATE_ADMIN_KEY"
```

Run a token status / refresh check:
```sh
curl -X POST "https://YOUR-WORKER-SUBDOMAIN.workers.dev/admin/creators/CREATOR_OPEN_ID/verify" -H "Authorization: Bearer YOUR_PRIVATE_ADMIN_KEY"
curl -X POST "https://YOUR-WORKER-SUBDOMAIN.workers.dev/admin/creators/CREATOR_OPEN_ID/refresh" -H "Authorization: Bearer YOUR_PRIVATE_ADMIN_KEY"
```

Every 30 minutes the Cron Trigger attempts to renew Seller and Creator tokens when they are close to expiry, in a bounded Creator batch. This is best-effort; monitor errors and reauthorize when needed. Existing encrypted tokens must remain private. Creator aliases are unverified administrative labels, not Creator IDs.

If Partner Center issues a distinct Creator App Key and Secret, configure optional secrets `TIKTOK_CREATOR_APP_KEY` and `TIKTOK_CREATOR_APP_SECRET`. Otherwise the worker reuses seller app credentials (only where app approval permits creator scopes). Set the optional variable `CREATOR_REQUIRED_SCOPES` using the exact approved scope identifiers for your app; do **not** assume names or approval.

Seller Affiliate Orders and Creator Affiliate Orders represent different datasets. A separate reconciliation module must consume the *approved* Order/Finance/Commission API endpoints and link transactions by verified seller ID, creator identity, order ID, status and event time. This PR intentionally DOES NOT calculate commissions or display Creator GMV yet. Reconciliation must not assume a profile or user ID equals the token `open_id`.

**Review required before deployment:** Cross-check TikTok App-specific token expiration formats, Creator App support, OAuth redirect rules and granted scope responses in live Partner Center. Current code is a scaffold, not a proven production integration.
