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
