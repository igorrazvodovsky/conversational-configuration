/**
 * The lint tier: what `npm run typecheck` cannot see.
 *
 * `tsconfig.json` leaves `noUnusedLocals` off and `next.config.ts` sets
 * `ignoreBuildErrors`, so nothing in the repo used to object to an import that
 * had lost its call site, and several had accumulated. That is the defect this
 * tier exists to catch.
 *
 * Two things keep it from becoming noise nobody reads. It does not lint the
 * dead starter code (CLAUDE.md, *Dead starter code*): those files are kept as
 * CopilotKit reference and are not to be extended, so a finding in one names
 * work nobody should do. And it switches off the two `react-hooks` rules that
 * fire on patterns this codebase's specs rule *for* — see below. A tier whose
 * failures are all expected teaches everyone to ignore it.
 */

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      // Python, checked by `uv run pytest` in `agent/`.
      "agent/**",
      "next-env.d.ts",
      // Dead starter code (CLAUDE.md). `declarative-generative-ui/` is dead
      // from the agent's side and still mounted as the A2UI catalog, so it is
      // excluded rather than deleted.
      "src/app/declarative-generative-ui/**",
      "src/components/example-canvas/**",
      "src/components/generative-ui/charts/**",
      "src/components/generative-ui/meeting-time-picker.tsx",
      "src/hooks/use-example-suggestions.tsx",
      "src/hooks/use-generative-ui-examples.tsx",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // The rule this tier exists for. The ignore patterns keep a deliberately
      // unused binding expressible — a callback parameter kept for its
      // position, a destructured value kept for its place in the shape.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Off, both of them, because this codebase uses the patterns they forbid
      // on purpose and with the reasons written down.
      //
      // `refs`: assigning a ref during render is how a component reads the
      // *current* value after an await — `use-workspace-attachment.ts` does it
      // so entry acts on the configuration of the render it resumes in, and
      // `config-canvas/index.tsx` does it so the reveal's baseline compares
      // across a run boundary rather than a render. Both are commented at the
      // line.
      //
      // `set-state-in-effect`: an effect that sets state on mount and never
      // again is exactly the hydration flag `use-hydrated.ts` documents, which
      // docs/specs/chat-surface/design.md requires of every menu on the
      // workspace page. The rule cannot tell that one from a cascading render.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
