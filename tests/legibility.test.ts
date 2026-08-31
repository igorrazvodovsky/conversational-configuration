// constitution #16. Colour, layout and focus are in the tier constitution #9
// says no check reaches; these two rules are mechanical.
//
// Both read source the way `couplings.test.ts` does: a Tailwind class is not a
// computed style until a browser has both stylesheets, and neither vitest
// project has one.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

/** The starter code the configurator does not use, enumerated in CLAUDE.md. */
const DEAD = [
  // Installed, not written.
  "components/ui",
  "components/example-canvas",
  "components/generative-ui/charts",
  "components/generative-ui/meeting-time-picker.tsx",
  "hooks/use-generative-ui-examples.tsx",
  "hooks/use-example-suggestions.tsx",
  "app/declarative-generative-ui",
  "components/headless-chat.tsx",
];

function liveFiles(dir: string = SRC): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const rel = relative(SRC, path);
    if (DEAD.some((dead) => rel === dead || rel.startsWith(dead + "/"))) return [];
    if (statSync(path).isDirectory()) return liveFiles(path);
    return /\.(tsx?|css)$/.test(entry) ? [path] : [];
  });
}

/** file:line, so a failure names the call site rather than a count. */
function hits(pattern: RegExp): string[] {
  return liveFiles().flatMap((path) =>
    readFileSync(path, "utf8")
      .split("\n")
      .flatMap((line, i) => {
        const found = line.match(pattern);
        return found
          ? [`${relative(SRC, path)}:${i + 1}  ${found[0]}  — ${line.trim()}`]
          : [];
      }),
  );
}

describe("the text size floor", () => {
  it("sets no size below 12px anywhere in live source", () => {
    // Arbitrary-value sizes only: the named steps start at `text-xs`, which is
    // the floor itself.
    const arbitrary = /text-\[(\d+(?:\.\d+)?)px\]/;
    const tooSmall = liveFiles().flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .flatMap((line, i) => {
          const found = line.match(arbitrary);
          return found && Number(found[1]) < 12
            ? [`${relative(SRC, path)}:${i + 1}  ${found[0]}`]
            : [];
        }),
    );
    expect(tooSmall).toEqual([]);
  });
});

describe("opacity does not carry a state", () => {
  it("puts no unconditional opacity on an element that also sets a text token", () => {
    // One class string that both fades and colours, so the fade multiplies
    // whatever an ancestor set. `(?<![\w:-])` is what makes it unconditional: it
    // rejects a `disabled:` or `data-[…]:` prefix, and `text-foreground/60`
    // alpha with it.
    const OPACITY = "(?<![\\w:-])opacity-\\d{1,3}\\b";
    const TEXT =
      "\\btext-(foreground|muted-foreground|primary|secondary|card-foreground|xs|sm|base|lg)\\b";
    const both = new RegExp(
      `${OPACITY}[^"\`']*${TEXT}|${TEXT}[^"\`']*${OPACITY}`,
    );
    expect(hits(both)).toEqual([]);
  });

  it("leaves no opacity on the card shell, which composed with every state inside it", () => {
    const shell = readFileSync(join(SRC, "components/generative-ui/card-shell.tsx"), "utf8");
    const code = shell.split("\n").filter((line) => !line.trimStart().startsWith("*"));
    expect(code.join("\n")).not.toMatch(/opacity-\d/);
  });
});
