/**
 * The workspace record as the frontend reads it (docs/specs/agreement-workspace,
 * docs/specs/parallel-drafts; checked per docs/specs/offline-checks).
 *
 * These are the readers the page seeds itself from before agent state arrives.
 * Each has a fallback for a record written before the feature that added its
 * field, and none of them may be the read path that throws — a workspace that
 * cannot be opened is a workspace that is lost.
 */
import { describe, expect, it } from "vitest";

import {
  REVERSAL_REACH,
  currentDraft,
  draftSummaries,
  historyDepths,
  latestThread,
  type DraftRecord,
  type LogEntry,
  type WorkspaceRecord,
} from "@/lib/workspaces";
import { agreement, candidate } from "./agreement";

function draft(overrides: Partial<DraftRecord> = {}): DraftRecord {
  return {
    id: "draft-1",
    name: "Original",
    forkedFrom: null,
    configuration: agreement(),
    ...overrides,
  };
}

/** One log entry, at a standing and with or without facts — the two things the
 * frontend reads of one (docs/specs/action-log). */
function entry(
  standing: LogEntry["standing"] = "applied",
  withFacts = true,
): LogEntry {
  return {
    id: "entry-1",
    action: "set_choices",
    source: "user",
    conversation: null,
    at: "2026-08-01T00:00:00Z",
    standing,
    asserted: withFacts ? [["chose", "building_type", "hotel"]] : [],
    retracted: [],
  };
}

function record(overrides: Partial<WorkspaceRecord> = {}): WorkspaceRecord {
  const drafts = overrides.drafts ?? [draft()];
  return {
    id: "ws-1",
    name: null,
    drafts,
    currentDraftId: drafts[0].id,
    threads: [],
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("the conversation a workspace opens on", () => {
  it("is the one that last moved the agreement, not the one started last", () => {
    const threads = [
      { id: "a", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-05T00:00:00Z" },
      { id: "b", createdAt: "2026-08-03T00:00:00Z" },
    ];
    expect(latestThread(threads)?.id).toBe("a");
  });

  it("falls back to when a conversation was started, for one never stamped", () => {
    const threads = [
      { id: "a", createdAt: "2026-08-01T00:00:00Z" },
      { id: "b", createdAt: "2026-08-03T00:00:00Z" },
    ];
    expect(latestThread(threads)?.id).toBe("b");
  });

  it("breaks a tie towards the later entry, which the store appended last", () => {
    const threads = [
      { id: "a", createdAt: "2026-08-01T00:00:00Z" },
      { id: "b", createdAt: "2026-08-01T00:00:00Z" },
    ];
    expect(latestThread(threads)?.id).toBe("b");
  });

  it("is undefined on a workspace nobody has opened", () => {
    expect(latestThread([])).toBeUndefined();
  });
});

describe("the draft being worked on", () => {
  it("is the one the pointer names", () => {
    const drafts = [draft(), draft({ id: "draft-2", name: "Premium" })];
    expect(currentDraft(record({ drafts, currentDraftId: "draft-2" })).name).toBe(
      "Premium",
    );
  });

  it("falls back to the first draft rather than throwing on a dangling pointer", () => {
    const drafts = [draft(), draft({ id: "draft-2", name: "Premium" })];
    expect(
      currentDraft(record({ drafts, currentDraftId: "draft-gone" })).name,
    ).toBe("Original");
  });
});

describe("what the canvas chrome reads off the record", () => {
  it("counts the reversals the current draft's log offers each way", () => {
    const drafts = [
      draft({ log: [entry(), entry(), entry(), entry("reversed")] }),
      draft({ id: "draft-2", log: [] }),
    ];
    expect(historyDepths(record({ drafts }))).toEqual({ undo: 3, redo: 1 });
    expect(
      historyDepths(record({ drafts, currentDraftId: "draft-2" })),
    ).toEqual({ undo: 0, redo: 0 });
  });

  it("offers no reversal of an action that asserted nothing", () => {
    // A declined change, or a batch that re-recorded what the agreement
    // already held: an occurrence worth keeping and no step back to anywhere
    // (docs/specs/action-log).
    const drafts = [draft({ log: [entry(), entry("applied", false)] })];
    expect(historyDepths(record({ drafts }))).toEqual({ undo: 1, redo: 0 });
  });

  it("counts no reversal of an entry a later action abandoned", () => {
    const drafts = [draft({ log: [entry("abandoned"), entry()] })];
    expect(historyDepths(record({ drafts }))).toEqual({ undo: 1, redo: 0 });
  });

  it("stops offering undo once the cursor has walked its whole reach", () => {
    const walked = Array.from({ length: REVERSAL_REACH }, () =>
      entry("reversed"),
    );
    const drafts = [draft({ log: [entry(), entry(), ...walked] })];
    expect(historyDepths(record({ drafts }))).toEqual({
      undo: 0,
      redo: REVERSAL_REACH,
    });
  });

  it("offers no reversal for a draft written before the log existed", () => {
    expect(historyDepths(record())).toEqual({ undo: 0, redo: 0 });
  });

  it("offers no reversal before the record has arrived", () => {
    expect(historyDepths(null)).toEqual({ undo: 0, redo: 0 });
  });

  it("names every draft with the price of its candidate", () => {
    const drafts = [
      draft({
        configuration: agreement({ candidate: candidate({}, 1450) }),
      }),
      draft({ id: "draft-2", name: "Premium" }),
    ];
    expect(draftSummaries(record({ drafts }))).toEqual([
      { id: "draft-1", name: "Original", price: 1450 },
      { id: "draft-2", name: "Premium", price: null },
    ]);
  });
});
