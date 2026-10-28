import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    "name": "sellerkhangbaby-live-kpi",
    "compatibilityDate": "2026-10-28",
    "previewUrls": false,
    "observability": {
      "enabled": true
    }
  }
});
