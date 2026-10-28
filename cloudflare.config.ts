import { bindings, defineConfig, triggers } from "cf/config";
import * as entrypoint from "./src/worker.js" with { type: "cf-worker" };

export default defineConfig({
  accountId: "1bda853cb67674a5c4e8d5a6c2152b5c",
  worker: {
    "name": "sellerkhangbaby-live-kpi",
    entrypoint,
    "compatibilityDate": "2026-10-28",
    "previewUrls": false,
    assets: {
      runWorkerFirst: ["/api/*", "/oauth/*"]
    },
    env: {
      ASSETS: bindings.assets(),
      TIKTOK_OAUTH_KV: bindings.kv({ id: "3a78cf302fa64cc4b8b8a3f62c2cb96e" }),
      FIREBASE_WEB_API_KEY: bindings.text("AIzaSyABazO0rjLnA8xtK_8p5MGpttNf5xHRYgU"),
      TIKTOK_TOKEN_ENCRYPTION_KEY: bindings.secret(),
      TIKTOK_SELLER_APP_KEY: bindings.secret(),
      TIKTOK_SELLER_APP_SECRET: bindings.secret(),
      TIKTOK_CREATOR_APP_KEY: bindings.secret(),
      TIKTOK_CREATOR_APP_SECRET: bindings.secret(),
      TIKTOK_SHOPKHANGBABY_REFRESH_TOKEN: bindings.secret(),
      TIKTOK_MEKHANGSUA_REFRESH_TOKEN: bindings.secret()
    },
    triggers: [triggers.scheduled({ schedule: "0 */6 * * *" })],
    "observability": {
      "enabled": true,
      redactQueryString: true,
      logs: { enabled: true, headSamplingRate: 1 },
      traces: { enabled: true, headSamplingRate: 0.01 }
    }
  }
});
