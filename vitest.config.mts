import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The offline frontend checks (docs/specs/offline-checks).
 *
 * Node environment, no DOM: what is checked here is the logic beneath the UI —
 * the message grammar, the projection helpers the document renders from, and
 * the geometry the render computes — never a rendered component. UI behavior
 * is verified by running the app (constitution #9).
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
