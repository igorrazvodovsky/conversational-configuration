"use client";

import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// A2UI catalog: definitions + renderers in ./declarative-generative-ui/
import { demonstrationCatalog } from "./declarative-generative-ui/renderers";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Set the theme class BEFORE first paint to avoid a white→dark flash.
          ThemeProvider applies the theme in a useEffect (post-hydration), so
          without this the page paints unthemed (light) first, then flips. This
          blocking inline script matches ThemeProvider's "system" default so
          there's no flash and no class mismatch when the provider re-applies.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.add(d?'dark':'light');}catch(e){}})();",
          }}
        />
      </head>
      {/*
        suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
        attributes like data-gr-ext-installed onto <body> before React hydrates,
        which would otherwise surface as a hydration mismatch on first load.
        This only relaxes the check for <body>'s own attributes (one level deep);
        everything rendered inside <body> is still fully hydration-checked.
      */}
      <body className={`antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider delayDuration={300}>
            <CopilotKit
              /*
                Configuration rather than a literal so the app can be pointed
                at a mocked AG-UI stream (docs/specs/interface-checks). The
                default is the app's own route, so a normal run is unchanged.
              */
              runtimeUrl={
                process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL ??
                "/api/copilotkit"
              }
              /*
                The inspector defaults to on for localhost, which is every run
                of this prototype. It brings CopilotKit's announcement bubble
                with it, and that bubble has no switch of its own: the
                web-inspector element keeps its visibility private and renders
                into a shadow root, so neither a prop nor CSS can reach it.
                Turning the whole inspector off is the only supported control.
              */
              enableInspector={false}
              inspectorDefaultAnchor={{ horizontal: "right", vertical: "top" }}
              a2ui={{ catalog: demonstrationCatalog }}
              openGenerativeUI={{}}
              useSingleEndpoint={false}
            >
              {children}
            </CopilotKit>
            {/*
              Where a refused click gets its answer (`src/lib/say-why.ts`).
              At the root because three surfaces send sentences here, and
              inside `ThemeProvider` because the toast reads the theme from it.

              Safe in the hydrated tree, which
              docs/specs/chat-surface/design.md is otherwise strict about:
              `useId` appears nowhere in sonner's bundle.
            */}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
