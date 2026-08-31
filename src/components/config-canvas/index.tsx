"use client";

// docs/specs/agreement-document/design.md

import {
  useAgent,
  useAgentContext,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Box, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Configuration,
  DraftSummary,
  type Clause,
  RegisterEntry,
  canvasEditMessage,
  compareDraftMessage,
  completionLabel,
  discardDraftMessage,
  forkDraftMessage,
  formatMonthly,
  layerOf,
  liveValue,
  productModel,
  redoMessage,
  clausesLeftToUs,
  registerEntries,
  reviseRequirementMessage,
  switchDraftMessage,
  termMonthsInEffect,
  undoMessage,
  variablesByName,
} from "@/lib/configurator";
import { PLACEHOLDER_NAME } from "@/lib/workspaces";
import { DeleteElevator } from "@/components/workspace/delete-elevator";
import { RenameElevator } from "@/components/workspace/rename-elevator";
import { cn } from "@/lib/utils";
import { sayBusy } from "@/lib/say-why";
import type { DocumentView } from "./document-parts";
import { DraftSwitcher } from "./draft-switcher";
import { Recitals } from "./recitals";
import { Schedules } from "./schedules";
import { OperativeTerms } from "./terms";

const EMPTY: Configuration = {
  choices: {},
  statuses: {},
  candidate: null,
};

/** `ssr: false` does two jobs: a WebGL surface cannot render on the server,
 * and the three.js chunk stays out of the page a workspace opens on. */
const CarViewer = dynamic(() => import("./render"), { ssr: false });

const REVEAL_FADE_MS = 6000;

export function ConfigCanvas({
  workspaceId,
  workspaceName,
  onRenamed,
  workspaceLoaded,
}: {
  workspaceId: string;
  /** Resolved by use-workspace-attachment (agent state wins); null = unnamed. */
  workspaceName: string | null;
  onRenamed: (name: string) => void;
  /** False until the record arrives, so the placeholder is not shown too early. */
  workspaceLoaded: boolean;
}) {
  const router = useRouter();
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const config: Configuration = agent.state?.configuration ?? EMPTY;
  const isRunning = agent.isRunning;
  // Mirrors of the store, seeded on attach and refreshed by every committing
  // tool, exactly as the undo depths are.
  const draftState = agent.state as
    | { drafts?: DraftSummary[]; current_draft_id?: string }
    | undefined;
  // Possibly an action behind when another conversation moved the agreement,
  // which costs the control's presence and never the reversal itself.
  const history = (agent.state as { history?: { undo: number; redo: number } })
    ?.history ?? { undo: 0, redo: 0 };
  const hasAnything =
    Object.keys(config.choices).length > 0 || config.candidate !== null;

  // Optimistic overlay, discarded wholesale when the run ends. It can only
  // hold options that were valid at click time, because invalid ones are
  // unclickable.
  const [pending, setPending] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!isRunning) setPending({});
  }, [isRunning]);

  // Only a click changes this — in particular not the reveal below, which may
  // mark the document but never switch away from it.
  const [canvasMode, setCanvasMode] = useState<"document" | "render">(
    "document",
  );

  // The reveal at run end consults the ref rather than the state: the run
  // unmounts and remounts every editor, so the state may be a render behind
  // (docs/specs/shared-attention/design.md).
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

  // The baseline advances on every idle render, which keeps seeds and
  // hydration out of the diff.
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

  // To the topmost marked element not already in view. All in view means
  // nothing moves, and an open editor pins the page entirely.
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

  // Through the CopilotKit core, never `agent.runAgent()`, which sends an empty
  // `context` — see the note in `generative-ui/card-dispatch.ts`.
  const dispatch = (content: string) => {
    // The one guard on the sheet: tools write through to the workspace store as
    // they run, so a second turn started mid-run would act on an agreement the
    // first is still changing.
    if (isRunning) {
      sayBusy();
      return false;
    }
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    copilotkit.runAgent({ agent }).catch((error: unknown) => {
      console.error("canvas edit: runAgent failed", error);
    });
    return true;
  };

  const register = registerEntries(config);
  const byVariable = new Map<string, RegisterEntry[]>();
  for (const entry of register) {
    byVariable.set(entry.variable, [
      ...(byVariable.get(entry.variable) ?? []),
      entry,
    ]);
  }
  const openDeviations = register.filter((e) => e.status === "deviation");
  const leftToUs = new Map<string, Clause[]>();
  for (const clause of clausesLeftToUs(config)) {
    leftToUs.set(clause.variable!, [
      ...(leftToUs.get(clause.variable!) ?? []),
      clause,
    ]);
  }

  // The register is the test: a term the document asks something of
  // reconciles, and one it speaks to without asking anything edits like any
  // other (docs/specs/document-clauses/design.md).
  const dispatchChoice = (variable: string, value: string) => {
    // Records what was *sent*, so a run in flight does not mark a click that
    // never landed.
    const sent = dispatch(
      byVariable.has(variable)
        ? reviseRequirementMessage(variable, value)
        : canvasEditMessage([{ variable, value }]),
    );
    if (sent) setPending((p) => ({ ...p, [variable]: value }));
  };

  const doc: DocumentView = {
    config,
    termMonths: termMonthsInEffect(config),
    pending,
    requirementsFor: (variable) => byVariable.get(variable),
    leftToUsFor: (variable) => leftToUs.get(variable),
    onSelect: dispatchChoice,
    onDispatch: dispatch,
    revealed,
    onEditorOpen,
    onEditorClose,
    onEnterRender: () => setCanvasMode("render"),
  };

  return (
    <>
    {/* Two surfaces over one tree, and the document is never unmounted: a node
        with no layout box has no scroll offset to keep, so returning from the
        render would land at the top of the agreement. Hidden the way the chat
        pane is hidden (workspace-split.tsx) — laid out, transparent and inert.
        The render comes *after* it in the tree and mounts only on demand, so
        nothing is ever inserted above the schedules' collapsibles
        (docs/specs/chat-surface). */}
    <ScrollArea
      className={cn(
        "h-full bg-background",
        canvasMode === "render" && "pointer-events-none opacity-0",
      )}
      inert={canvasMode === "render"}
    >
      {/* The margin column is a container query away, not a viewport one: the
          canvas is a resizable panel and its width has nothing to do with the
          window's. */}
      <div ref={bodyRef} className="@container mx-auto max-w-3xl px-8 py-8">
        <header className="mb-8">
          {/* The workspace's identity and the ways out of it — back to the
              list, or ending the elevator altogether: the canvas is the
              surface present in every chat mode, so it carries them
              (docs/specs/chat-surface, decision 8). A Link, a span and a
              button mint no ids, which is what makes all three safe in the
              hydrated tree. */}
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
            {/* The elevator's name, edited in the place it is written
                (docs/specs/agreement-workspace). Not offered before the record
                is here: there is nothing to rename yet, which is an absence
                rather than a refusal. */}
            {workspaceLoaded ? (
              <RenameElevator
                workspaceId={workspaceId}
                name={workspaceName}
                onRenamed={onRenamed}
                className="min-w-0"
              >
                {workspaceName ? (
                  <span className="truncate" title={workspaceName}>
                    {workspaceName}
                  </span>
                ) : (
                  <span className="truncate italic">{PLACEHOLDER_NAME}</span>
                )}
              </RenameElevator>
            ) : (
              <span className="truncate italic">…</span>
            )}
            {/* Deleting the elevator from inside it: the record goes on the
                click, and with nothing left to render the page leaves for the
                list (docs/specs/agreement-workspace). */}
            <DeleteElevator
              workspaceId={workspaceId}
              name={workspaceName}
              onDeleted={() => router.push("/")}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-semibold">Service agreement</h1>
            <div className="flex shrink-0 items-center gap-1">
              {/* Which draft this is, and the way to the others
                  (docs/specs/parallel-drafts). A menu, so it mounts a tick
                  after hydration — see the component. */}
              <DraftSwitcher
                drafts={draftState?.drafts ?? []}
                currentDraftId={draftState?.current_draft_id}
                onSwitch={(name) => dispatch(switchDraftMessage(name))}
                onFork={() => dispatch(forkDraftMessage)}
                onCompare={(name) => dispatch(compareDraftMessage(name))}
                onDiscard={(name) => dispatch(discardDraftMessage(name))}
              />
              {/* The way into the render (docs/specs/visual-configuration).
                  A plain button, not `Tabs` or a `ToggleGroup`: this sits in
                  the hydrated tree, where a Radix primitive would shift every
                  `useId` on the page. The way back is the render's own, which
                  is what keeps this one node. */}
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setCanvasMode("render")}
                title="See the car the schedules describe"
                className="font-normal text-muted-foreground"
              >
                <Box />
                View
              </Button>
            {/* Undo lives on the record's own chrome (docs/specs/undo): the
                record belongs to the agreement, not to the transcript. Each
                control is absent rather than disabled at its end of the log,
                and each dispatches a visible message — after a
                restore the sheet shows only the restored state, so the chat
                is where what was reversed can be said. A `title` rather than
                a tooltip: nothing here may mint a React id. */}
            {(history.undo > 0 || history.redo > 0) && (
              <>
                {history.undo > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => dispatch(undoMessage)}
                    title="Reverse the last change to this agreement"
                    className="font-normal text-muted-foreground"
                  >
                    <Undo2 />
                    Undo
                  </Button>
                )}
                {history.redo > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => dispatch(redoMessage)}
                    title="Put back the change that was undone"
                    className="font-normal text-muted-foreground"
                  >
                    <Redo2 />
                    Redo
                  </Button>
                )}
              </>
            )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{productModel.name}</p>
          {/* The monthly figure is stated as a term, in the consideration
              clause — but it is also the number the operator consults most, and
              burying it under the recitals would both cost them the glance and
              manufacture the scroll-past this surface exists to measure
              (canvas anatomy, *Failure signals*). So it is repeated here,
              compactly. */}
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
    {canvasMode === "render" && (
      <CarViewer
        config={config}
        onExit={() => setCanvasMode("document")}
      />
    )}
    </>
  );
}
