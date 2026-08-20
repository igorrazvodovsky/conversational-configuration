import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

/**
 * Two projects, because the repo has two tiers of frontend check and they
 * disagree about whether a DOM should exist (constitution #9).
 *
 * `offline` is the older tier (docs/specs/offline-checks): the logic beneath
 * the UI — the message grammar, the projection helpers the document renders
 * from, the geometry the render computes. Its node environment is a decision,
 * not a default. Nothing here may acquire a DOM by accident, which is why the
 * two tiers are separate projects rather than one config with an override.
 *
 * `interface` is the newer tier (docs/specs/interface-checks): the stateful
 * middle, rendered against a mocked AG-UI stream. It needs jsdom, and it is
 * the only project that gets one.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "offline",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/interface/**"],
        },
      },
      {
        resolve: { alias },
        // These checks assert on state and on text, never on style, so the
        // stylesheet the packages import is parsed with an empty PostCSS
        // config rather than through the app's Tailwind pipeline.
        css: { postcss: { plugins: [] } },
        test: {
          name: "interface",
          environment: "jsdom",
          include: ["tests/interface/**/*.test.tsx"],
          // Attaching runs several awaited round trips before it settles, so
          // these checks need more than the 5s default. They still finish in
          // seconds; the ceiling is here to keep a genuine hang legible.
          testTimeout: 30_000,
          // The CopilotKit packages import their own stylesheet. Node can't
          // load a .css file, so Vite has to transform these rather than
          // externalise them.
          server: { deps: { inline: [/@copilotkit/, /@ag-ui/] } },
        },
      },
    ],
  },
});
