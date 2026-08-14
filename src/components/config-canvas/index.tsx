"use client";

/**
 * The agreement document (docs/specs/agreement-document; canvas anatomy model),
 * in three layers: recitals — what will happen at the building, in the
 * building's language; operative terms — the commitments and the consideration;
 * schedules — the derived hardware as the sheet it has always been, annexed and
 * collapsed. The frames strip is from docs/specs/nonlinear-interaction.
 *
 * The document is a projection of `agent.state.configuration`, never a store
 * (constitution #3), and every edit round-trips through the agent as a
 * structured message handled by set_choices, so the solver stays the single
 * source of validity. That message is hidden from the chat — the document is
 * the record of the edit, the conversation only carries consequences.
 *
 * On a document-seeded agreement it also carries the deviation register
 * (docs/specs/rfq-reconciliation): document provenance with its clause, and
 * requested-versus-offered as a margin mark on the term a requirement could not
 * reach. Those moves dispatch *visible* messages — waiving a requirement of the
 * customer's own document is negotiation, not bookkeeping.
 */

import {
  useAgent,
  useAgentContext,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Configuration,
  RegisterEntry,
  canvasEditMessage,
  completionLabel,
  formatMonthly,
  layerOf,
  liveValue,
  productModel,
  registerEntries,
  reviseRequirementMessage,
  termMonthsInEffect,
  variablesByName,
} from "@/lib/configurator";
import { PLACEHOLDER_NAME } from "@/lib/workspaces";
import type { DocumentView } from "./document-parts";
import { Recitals } from "./recitals";
import { Schedules } from "./schedules";
import { OperativeTerms } from "./terms";

const EMPTY: Configuration = {
  choices: {},
  statuses: {},
  candidate: null,
  frames: [],
};

/** How long a reveal mark stays before the shell drops it and the highlight
 * transitions out (docs/specs/shared-attention). Long enough to be found on
 * arrival after the smooth scroll, short enough to read as attention rather
 * than status. */
const REVEAL_FADE_MS = 6000;

export function ConfigCanvas({
  workspaceName,
  workspaceLoaded,
}: {
  /** Resolved by use-workspace-attachment (agent state wins); null = unnamed. */
  workspaceName: string | null;
  /** False until the record arrives, so the placeholder is not shown too early. */
  workspaceLoaded: boolean;
}) {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const config: Configuration = agent.state?.configuration ?? EMPTY;
  const isRunning = agent.isRunning;
  const frames = config.frames ?? [];
  const hasAnything =
    Object.keys(config.choices).length > 0 || config.candidate !== null;

  // Optimistic overlay: the clicked value shows immediately — on its row, or in
  // the middle of a recital's sentence — and is discarded wholesale when the run
  // ends, after which validated agent state renders the truth: identical on a
  // clean apply, corrected on a rejection. Ephemeral display state, not a store
  // (constitution #3); it can only hold options that were valid at click time
  // because invalid ones are unclickable.
  const [pending, setPending] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!isRunning) setPending({});
  }, [isRunning]);

  // ——— Shared attention (docs/specs/shared-attention) ———
  //
  // The read channel: which value the operator has an editor open on, lifted
  // here from OptionEditor's mount and published as app context. The context
  // list is captured when a run starts, so the editor the operator had open
  // while typing is what the agent sees — the run itself disables and unmounts
  // every editor a moment later, which is why the ref below (not the state) is
  // what the reveal consults at run end: by then the editor has remounted and
  // re-reported, and the state may still be a render behind.
  const [openEditor, setOpenEditor] = useState<string | null>(null);
  const openEditorRef = useRef<string | null>(null);
  const onEditorOpen = useCallback((variable: string) => {
    openEditorRef.current = variable;
    setOpenEditor(variable);
  }, []);
  const onEditorClose = useCallback((variable: string) => {
    if (openEditorRef.current === variable) openEditorRef.current = null;
    setOpenEditor((current) => (current === variable ? null : current));
  }, []);
  const openModel = openEditor ? variablesByName.get(openEditor) : undefined;
  useAgentContext({
    description:
      "Open editor: the value of the agreement document the operator currently has an editor open on. Transient attention, never an instruction to change anything.",
    value: openModel
      ? {
          variable: openModel.name,
          label: openModel.label,
          layer: layerOf(openModel.group),
        }
      : "no editor open",
  });

  // The reveal: the values a run changed, derived by diffing the resolved
  // document across the run boundary — never nominated by the agent, so a
  // turn that changed nothing cannot move the view, by construction. The
  // baseline advances on every idle render, which keeps seeds and hydration
  // out of the diff: only a transition out of isRunning compares.
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const revealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const wasRunning = useRef(false);
  const baseline = useRef<Configuration>(config);
  const configRef = useRef(config);
  configRef.current = config;
  useEffect(() => {
    if (isRunning) {
      wasRunning.current = true;
      return;
    }
    const after = configRef.current;
    if (wasRunning.current) {
      wasRunning.current = false;
      const changed = productModel.variables
        .map((v) => v.name)
        .filter((v) => liveValue(baseline.current, v) !== liveValue(after, v));
      if (changed.length > 0) {
        clearTimeout(revealTimer.current);
        setRevealed(new Set(changed));
        revealTimer.current = setTimeout(
          () => setRevealed(new Set()),
          REVEAL_FADE_MS,
        );
      }
    }
    baseline.current = after;
  });
  useEffect(() => () => clearTimeout(revealTimer.current), []);

  // The scroll, once per reveal: to the topmost marked element not already in
  // view, in document order — the rest stay marked in place, never toured.
  // All in view means nothing moves; an open editor pins the page entirely.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (revealed.size === 0 || openEditorRef.current) return;
    const body = bodyRef.current;
    const viewport = body?.closest("[data-slot='scroll-area-viewport']");
    if (!body || !viewport) return;
    const marks = [
      ...body.querySelectorAll<HTMLElement>("[data-reveal]"),
    ].filter((el) =>
      (el.dataset.reveal ?? "").split(" ").some((v) => revealed.has(v)),
    );
    const frame = viewport.getBoundingClientRect();
    const target = marks.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top < frame.top || rect.bottom > frame.bottom;
    });
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [revealed]);

  // Through the CopilotKit core, exactly as the composer and the in-chat cards
  // do, and never `agent.runAgent()` — see the note in
  // `generative-ui/card-dispatch.ts`. It matters most here: a canvas edit is
  // the turn where what the operator has open is most worth the agent knowing,
  // and the bare call sends an empty `context`.
  const dispatch = (content: string) => {
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    copilotkit.runAgent({ agent }).catch((error: unknown) => {
      console.error("canvas edit: runAgent failed", error);
    });
  };

  // The register, derived here from the frozen document block and the values
  // already in state (docs/specs/rfq-reconciliation).
  const register = registerEntries(config);
  const byVariable = new Map<string, RegisterEntry[]>();
  for (const entry of register) {
    byVariable.set(entry.variable, [
      ...(byVariable.get(entry.variable) ?? []),
      entry,
    ]);
  }
  const openDeviations = register.filter((e) => e.status === "deviation");

  // Picking an option on a term the document speaks to is a reconciliation, not
  // bookkeeping: it dispatches a visible message rather than the hidden canvas
  // edit, because moving away from the customer's own requirement is
  // negotiation and belongs in the record. Every editable island in every layer
  // routes through here, so where on the page the click happened cannot change
  // what the click means.
  const dispatchChoice = (variable: string, value: string) => {
    setPending((p) => ({ ...p, [variable]: value }));
    dispatch(
      byVariable.has(variable)
        ? reviseRequirementMessage(variable, value)
        : canvasEditMessage([{ variable, value }]),
    );
  };

  const doc: DocumentView = {
    config,
    termMonths: termMonthsInEffect(config),
    disabled: isRunning,
    pending,
    requirementsFor: (variable) => byVariable.get(variable),
    onSelect: dispatchChoice,
    onDispatch: dispatch,
    revealed,
    onEditorOpen,
    onEditorClose,
  };

  return (
    <ScrollArea className="h-full bg-background">
      {/* The margin column is a container query away, not a viewport one: the
          canvas is a resizable panel and its width has nothing to do with the
          window's. */}
      <div ref={bodyRef} className="@container mx-auto max-w-3xl px-8 py-8">
        <header className="mb-8">
          {/* The workspace's identity and the way out of it: the canvas is the
              surface present in every chat mode, so it carries them
              (docs/specs/chat-surface, decision 8). A Link and a span mint no
              ids, which is what makes this safe in the hydrated tree. */}
          <div className="mb-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Button
              asChild
              variant="link"
              size="xs"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground hover:no-underline"
            >
              <Link href="/">
                <ArrowLeft />
                All elevators
              </Link>
            </Button>
            <span aria-hidden>/</span>
            {workspaceName ? (
              <span className="truncate" title={workspaceName}>
                {workspaceName}
              </span>
            ) : (
              <span className="truncate italic">
                {workspaceLoaded ? PLACEHOLDER_NAME : "…"}
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold">Service agreement</h1>
          <p className="text-sm text-muted-foreground">{productModel.name}</p>
          {/* The monthly figure is stated as a term, in the consideration
              clause — but it is also the number the operator consults most, and
              burying it under the recitals would both cost them the glance and
              manufacture the scroll-past this surface exists to measure
              (canvas anatomy §5). So it is repeated here, compactly. */}
          {config.candidate && (
            <p className="mt-1 text-sm">
              <span className="font-semibold tabular-nums">
                {formatMonthly(config.candidate.price)}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {completionLabel(config.candidate)}
              </span>
            </p>
          )}
          {register.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {openDeviations.length > 0
                ? `${openDeviations.length} of ${register.length} requirements from your document not met`
                : `all ${register.length} requirements from your document answered`}
              {/* answered-but-not-met stays counted: waiving and revising
                  settle a requirement, they do not retire it */}
              {(["waived", "revised"] as const).map((status) => {
                const count = register.filter((e) => e.status === status).length;
                return count ? ` · ${count} ${status}` : "";
              })}
            </p>
          )}
        </header>

        {frames.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5">
            <Bookmark className="h-3 w-3 text-muted-foreground" />
            {frames.map((frame) => (
              <Tooltip key={frame.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={isRunning}
                    onClick={() =>
                      dispatch(
                        `Compare frame "${frame.name}" with the current configuration`,
                      )
                    }
                    className="font-normal hover:border-primary"
                  >
                    {frame.name}
                    <span className="tabular-nums text-muted-foreground">
                      {formatMonthly(frame.price)}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  click to compare with the current configuration
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Empty, the document still renders — the same three layers with their
            values blank. The shape of the agreement is itself the skeleton, and
            it tells the operator what the conversation is for. */}
        {!hasAnything && (
          <Empty className="mb-6 border p-4 md:p-4">
            <EmptyDescription>
              Nothing decided yet. Describe your project in the chat — building,
              location, floors, traffic — and this agreement fills in.
            </EmptyDescription>
          </Empty>
        )}

        <Recitals doc={doc} siteName={workspaceName} />
        <OperativeTerms doc={doc} />
        <Schedules doc={doc} />

        {isRunning && (
          <p className="text-xs text-muted-foreground animate-pulse">
            agent is working — editing re-enables when it finishes
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
