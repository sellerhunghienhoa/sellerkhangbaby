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
      FIREBASE_API_KEY: bindings.text("AIzaSyABazO0rjLnA8xtK_8p5MGpttNf5xHRYgU"),
      FIREBASE_APP_ID: bindings.text("1:752377017264:web:54e4ffa3a535a9cb0e9c75"),
      FIREBASE_AUTH_DOMAIN: bindings.text("sellerkhangbaby.firebaseapp.com"),
      FIREBASE_MESSAGING_SENDER_ID: bindings.text("752377017264"),
      FIREBASE_PROJECT_ID: bindings.text("sellerkhangbaby"),
      FIREBASE_STORAGE_BUCKET: bindings.text("sellerkhangbaby.firebasestorage.app"),
      FIREBASE_WEB_API_KEY: bindings.text("AIzaSyABazO0rjLnA8xtK_8p5MGpttNf5xHRYgU"),
      TIKTOK_APP_KEY: bindings.text("6llc75tdtivr7"),
      TIKTOK_SERVICE_ID: bindings.text("7698666392577017620"),
      TIKTOK_SELLER_AUTH_URL: bindings.text("https://services.tiktokshop.com/open/authorize")
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
