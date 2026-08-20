/**
 * The hydration checks (docs/specs/hydration-checks).
 *
 * The one automated check that renders this app's components, and it renders
 * them the way the app does: it starts the dev server, opens each page in a
 * real browser, and fails on any hydration mismatch React reports. Nothing is
 * asserted about what the pages look like or what they do — the rules this
 * exists for (docs/specs/chat-surface design 4) are about the *identity* of the
 * tree React hydrates, and their symptom is a console line no one is required
 * to open.
 *
 * Three things here are measured rather than assumed, and the design note
 * records the measurements:
 *
 * - It runs against `next dev`, not a production build. Production React
 *   reports a text mismatch as a minified error and says nothing at all about
 *   a mismatched attribute — and an attribute is the shape an id divergence
 *   takes.
 * - The first load of each route is discarded. It compiles the route, and it
 *   is the load the dev server is documented to be inconsistent on.
 * - No agent and no workspace store are needed. Hydration compares the server's
 *   HTML with the *first* client render, and both are drawn before any fetch
 *   resolves, so the tree under test is the same one a populated workspace
 *   hydrates. Everything the store later fills in is client-only by
 *   construction and cannot mismatch.
 */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.HYDRATION_PORT ?? 3123);
const BASE = `http://localhost:${PORT}`;

/**
 * Both pages of the configurator. The workspace id need not exist: the fetch
 * that would find it out resolves after hydration, so the tree under test is
 * the whole workspace surface — the split, the chat pane and its header, and
 * the canvas with its schedules.
 */
const ROUTES = ["/", "/workspaces/hydration-check"];

/**
 * What counts as a hydration report. React says it in prose in development —
 * "A tree hydrated but some attributes…", "Hydration failed because…" — and in
 * numbers when it is minified, so both forms are matched. Everything else the
 * console carries is ignored: with no agent running, every page logs a failed
 * request to the workspace store, and this check has no opinion about that.
 */
const HYDRATION = [/hydrat/i, /did ?n[o']t match/i, /Minified React error #(418|419|422|423|425)/];

const isHydration = (text) => HYDRATION.some((pattern) => pattern.test(text));

async function waitForServer(process_) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (process_.exitCode !== null) throw new Error("the dev server exited");
    try {
      const response = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error(`the dev server did not answer on ${BASE}`);
}

/** One load in a fresh context, returning the hydration reports it drew. */
async function load(browser, route) {
  const page = await browser.newPage();
  const reports = [];
  page.on("console", (message) => {
    if (message.type() === "error" && isHydration(message.text()))
      reports.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (isHydration(error.message)) reports.push(error.message);
  });
  await page.goto(BASE + route, { waitUntil: "load" });
  // Hydration is reported during the hydration pass, which the load event does
  // not wait for. Nothing here polls for it, so this is a settle.
  await page.waitForTimeout(3000);
  await page.close();
  return reports;
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "playwright is not installed — run `npm install`, then `npx playwright install chromium`.",
  );
  process.exit(1);
}

/*
  `npx` is a wrapper around a shell around the server, so killing the child
  leaves the server holding the port and this process's stdout — which is how
  the first version of this check appeared to take ten minutes when it took
  under two. Its own process group is what can be killed whole.
*/
const posix = process.platform !== "win32";
const server = spawn("npx", ["next", "dev", "--turbopack", "-p", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: posix,
});
const stopServer = () => {
  try {
    if (posix && server.pid) process.kill(-server.pid, "SIGTERM");
    else server.kill();
  } catch {
    /* already gone */
  }
};
process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});
let serverLog = "";
server.stdout.on("data", (chunk) => (serverLog += chunk));
server.stderr.on("data", (chunk) => (serverLog += chunk));

let failures = [];
let browser;
try {
  await waitForServer(server);
  browser = await chromium.launch();

  for (const route of ROUTES) {
    // Discarded: it compiles the route, and it is the load the dev server is
    // documented to be inconsistent on (CLAUDE.md, the chat-surface rules).
    await load(browser, route);
    const reports = await load(browser, route);
    if (reports.length) failures.push({ route, reports });
    console.log(`${reports.length ? "FAIL" : "ok  "}  ${route}`);
  }
} catch (error) {
  console.error(`\nThe check could not run: ${error.message}`);
  console.error(serverLog.slice(-2000));
  failures = [{ route: "(the check itself)", reports: [error.message] }];
} finally {
  await browser?.close();
  stopServer();
}

if (failures.length) {
  console.error("\nHydration mismatches, one page load apart from every user:");
  for (const { route, reports } of failures)
    for (const report of reports) console.error(`\n  ${route}\n  ${report}`);
  console.error(
    "\nThe rules these break are in docs/specs/chat-surface/design.md (decision 4)" +
      " and docs/specs/agreement-document/design.md.",
  );
  process.exit(1);
}

console.log(`\n${ROUTES.length} pages hydrate clean.`);
