"use client";

/**
 * In-chat controls for the agent's ask_choices tool (docs/specs/agreement-document).
 *
 * The payload is computed server-side from solver state. An invalid value
 * renders struck through in place, with the rules that ruled it out listed
 * underneath where every input device reaches them (constitution #16), and it
 * stays clickable: asking for it dispatches the same sentence any other option
 * does and comes back with the repair paths that would admit it
 * (constitution #17, docs/specs/one-gesture-one-action). Option prices are
 * monthly deltas at the term in effect (docs/specs/service-agreement). Controls go
 * inert once the conversation moves past them or after submission, and the
 * spent card shows what it was answered with: the pick leaves no message of
 * its own in the transcript, so this card is the record of it.
 */

import { useState } from "react";
import { BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Rule,
  choiceMessage,
  formatMonthly,
  refusalText,
} from "@/lib/configurator";
import {
  REFUSAL_AFFORDANCE,
  Refusal,
  RefusalList,
  refusalId,
} from "@/components/refusals";
import { sayWhy } from "@/lib/say-why";
import { useCardDispatch } from "./card-dispatch";
import { CardPending, CardProps, CardShell, parsePayload } from "./card-shell";

interface PayloadOption {
  value: string;
  label: string;
  price: number;
  status: "valid" | "invalid" | "chosen" | "forced";
  cheapest: boolean;
  /** the named rules that rule this option out, when it is out
   * (constitution #6); absent on cards rendered from older tool results */
  rules?: Rule[];
}

interface PayloadVariable {
  name: string;
  label: string;
  group: string;
  control: "chips" | "scale" | "list";
  options: PayloadOption[];
}

interface Payload {
  variables: PayloadVariable[];
  prompt?: string;
}

export function AskChoices({ toolCallId, status, result }: CardProps) {
  const { inert, reason, answer, dispatch: send } = useCardDispatch(toolCallId);
  const [selections, setSelections] = useState<Record<string, string>>({});

  if (status !== "complete" || !result) {
    return <CardPending>preparing options…</CardPending>;
  }

  // No `kind` on this payload — its shape is the test.
  const payload = parsePayload<Payload>(result, (p) =>
    Array.isArray(p.variables),
  );
  if (!payload) return null; // ERROR results are relayed by the agent in text

  const multi = payload.variables.length > 1;

  // What this card was answered with, whether the answer is still in component
  // state or only in the transcript. The gesture leaves no row of its own
  // (docs/specs/agreement-document), so the card is the record of the pick,
  // and a reopened conversation restores it from the message rather than from
  // state that did not survive. Restricted to the terms this card asked
  // about: a pick on a term it never raised is some other card's.
  const asked = new Set(payload.variables.map((variable) => variable.name));
  const picked: Record<string, string> = {};
  for (const { variable, value } of answer ?? []) {
    if (asked.has(variable)) picked[variable] = value;
  }
  // The two agree whenever the card is live — the message that supplies an
  // answer is the same message that makes the card inert — so the merge
  // matters only for the batch that was just applied.
  //
  // What this shows when the pick did not land is the pick: a ruled-out option
  // is clickable (constitution #17), so a customer can ask for one and get
  // repair paths back, and the card is the record of what they asked for
  // rather than of what the agreement says. The agreement is on the sheet.
  Object.assign(picked, selections);
  const pickedCount = Object.keys(picked).length;

  const dispatch = (picks: { variable: string; value: string }[]) =>
    send(choiceMessage(picks));

  const select = (variable: string, value: string) => {
    if (inert) return;
    if (multi) setSelections((s) => ({ ...s, [variable]: value }));
    else dispatch([{ variable, value }]);
  };

  return (
    <CardShell inert={inert} reason={reason} className="space-y-3">
      {payload.prompt && <p className="text-sm">{payload.prompt}</p>}
      {payload.variables.map((variable) => (
        <div key={variable.name}>
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            {variable.label}
          </div>
          <Control
            variable={variable}
            selected={picked[variable.name]}
            inert={inert}
            onSelect={select}
            scope={toolCallId}
          />
        </div>
      ))}
      {multi && (
        <Button
          size="sm"
          // Live with nothing picked, and it says which terms are still
          // waiting when it is pressed that way (constitution #17). A button
          // that greys itself makes the reader compare a form against its own
          // controls to find out what is missing, which is the work the button
          // is in a position to do for them.
          disabled={inert}
          onClick={() => {
            // Nothing picked is the only case this answers instead of
            // dispatching. A card may ask about several terms and take a pick
            // on one of them: the batch is what was picked, as it always was,
            // and a partial batch is a valid gesture rather than an omission.
            if (pickedCount === 0) {
              sayWhy(
                `${toolCallId}-unpicked`,
                `Pick a value for ${payload.variables
                  .map((v) => v.label)
                  .join(" or ")} first, then apply.`,
              );
              return;
            }
            // From what the card displays, not from component state: the
            // two agree on a live card, and dispatching from the other one
            // would make that agreement a thing to remember.
            dispatch(
              Object.entries(picked).map(([variable, value]) => ({
                variable,
                value,
              })),
            );
          }}
        >
          Apply {pickedCount || ""} choice
          {pickedCount === 1 ? "" : "s"}
        </Button>
      )}
    </CardShell>
  );
}

/** What every control renders from: one variable's payload, the pending
 * selection when the card is collecting several, and the two things that
 * decide whether a click does anything. */
interface ControlProps {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
  /** what makes this control's refusal ids unique on the page: the tool call
   * that drew it, since a transcript may hold several cards over one variable */
  scope: string;
}

function Control(props: ControlProps) {
  switch (props.variable.control) {
    case "scale":
      return <ScaleControl {...props} />;
    case "list":
      return <OptionList {...props} />;
    default:
      return <ChipRow {...props} />;
  }
}

function optionState(o: PayloadOption, selected?: string) {
  const active = selected
    ? selected === o.value
    : o.status === "chosen" || o.status === "forced";
  // `refused`, not `disabled`: the rules separate this option from the
  // agreement as it stands, and the control for it is still operable
  // (constitution #17). An unavailable option says which rules made it
  // unavailable; older tool results carry no rules, and fall back to the
  // wording they shipped with.
  const refused = o.status === "invalid";
  return {
    active,
    refused,
    why: refused ? refusalText(o.rules ?? []) : undefined,
  };
}

/** The ruled-out options of one variable, in the shape the shared list wants.
 * The list is what a keyboard or touch user reads; `title` is a convenience
 * for the mouse on top of it (constitution #16). */
function refusalsOf(variable: PayloadVariable, selected?: string): Refusal[] {
  return variable.options
    .filter((o) => optionState(o, selected).refused)
    .map((o) => ({ value: o.value, label: o.label, rules: o.rules ?? [] }));
}

/**
 * Unavailability is a muted foreground and a strike, never an opacity: the
 * card above may carry a state of its own, and two opacities over one string
 * multiply (constitution #16).
 *
 * No `cursor-not-allowed`, and no `KEEP_TITLE`. Both were written for a
 * control that refuses the click. This one takes it — the cursor is a pointer
 * because there is a pointer's worth of action behind it, and the `title`
 * raises on hover and on focus without a workaround now that the element is
 * neither disabled nor out of the tab order.
 */
const UNAVAILABLE = "text-muted-foreground line-through";

function CheapestMark() {
  return (
    <BadgePercent
      role="img"
      className="inline size-3 text-emerald-600"
      aria-label="cheapest valid option"
    />
  );
}

function ChipRow({ variable, selected, inert, onSelect, scope }: ControlProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {variable.options.map((o) => {
          const { active, refused, why } = optionState(o, selected);
          return (
            <Button
              key={o.value}
              size="sm"
              variant={active ? "default" : "outline"}
              // Only the spent card disables anything here: a repair or a pick
              // computed against an agreement that has moved would apply the
              // wrong change, which is the one thing a sentence cannot guard
              // (constitution #17, docs/specs/ui-component-library decision 8).
              disabled={inert}
              onClick={() => onSelect(variable.name, o.value)}
              title={why}
              aria-describedby={
                refused ? refusalId(scope, variable.name, o.value) : undefined
              }
              className={`font-normal ${
                refused ? UNAVAILABLE : active ? "" : "hover:border-primary"
              }`}
            >
              {o.label} {o.cheapest && <CheapestMark />}
              {o.price > 0 && (
                <span className="text-xs text-muted-foreground">
                  +{formatMonthly(o.price)}
                </span>
              )}
            </Button>
          );
        })}
      </div>
      <RefusalList
        scope={scope}
        variable={variable.name}
        refusals={refusalsOf(variable, selected)}
      />
    </div>
  );
}

function ScaleControl({
  variable,
  selected,
  inert,
  onSelect,
  scope,
}: ControlProps) {
  const active = variable.options.find(
    (o) => optionState(o, selected).active,
  )?.value;

  return (
    <div>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        // Joined, not gapped: this control is a range, and separated cells
        // read as independent options. Lyra's default spacing is 2.
        spacing={0}
        value={active ?? ""}
        onValueChange={(value) => value && onSelect(variable.name, value)}
        className="w-full"
      >
        {variable.options.map((o) => {
          const { refused, why } = optionState(o, selected);
          return (
            <ToggleGroupItem
              key={o.value}
              value={o.value}
              disabled={inert}
              title={
                why ?? (o.price > 0 ? `+${formatMonthly(o.price)}` : undefined)
              }
              aria-describedby={
                refused ? refusalId(scope, variable.name, o.value) : undefined
              }
              // h-auto + whitespace-normal: toggle items are nowrap and fixed
              // height by default, which makes long scale labels ("630 kg /
              // 8 persons") overlap their neighbours instead of wrapping.
              //
              // A segment outside the valid range is told apart by the same
              // vocabulary the chips use — muted, struck, dashed edge — and
              // not by a background tint: no tint reaches 3:1 against the card
              // (constitution #16).
              className={`h-auto min-w-0 flex-1 px-1 py-1.5 text-xs leading-tight whitespace-normal data-[state=on]:bg-primary data-[state=on]:text-primary-foreground ${
                refused ? `border-dashed ${UNAVAILABLE}` : ""
              }`}
            >
              {o.label} {o.cheapest && <CheapestMark />}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      {/* Replaces the 10px "greyed segments are outside the currently valid
          range" legend, which described a distinction the CSS did not draw and
          named no rule. */}
      <RefusalList
        scope={scope}
        variable={variable.name}
        refusals={refusalsOf(variable, selected)}
      />
    </div>
  );
}

function OptionList({
  variable,
  selected,
  inert,
  onSelect,
  scope,
}: ControlProps) {
  const refused = refusalsOf(variable, selected).length > 0;
  return (
    <div>
      <div className="divide-y border">
        {variable.options.map((o) => {
          const { active, refused, why } = optionState(o, selected);
          return (
            <Item
              key={o.value}
              asChild
              size="sm"
              className={`px-3 py-2 ${
                active
                  ? "bg-secondary font-medium"
                  : refused
                    ? "text-muted-foreground hover:bg-secondary"
                    : "hover:bg-secondary"
              }`}
            >
              <button
                type="button"
                disabled={inert}
                onClick={() => onSelect(variable.name, o.value)}
                title={why}
                aria-describedby={
                  refused ? refusalId(scope, variable.name, o.value) : undefined
                }
                className="w-full text-left"
              >
                <ItemContent>
                  <ItemTitle
                    className={`font-[inherit] ${refused ? "line-through" : ""}`}
                  >
                    {o.label} {o.cheapest && <CheapestMark />}
                  </ItemTitle>
                </ItemContent>
                <ItemActions className="text-xs text-muted-foreground">
                  {refused ? (
                    /* This list is the one control that always showed its
                     reasons, and it keeps doing so in place. The id is here so
                     `aria-describedby` points at the visible sentence rather
                     than at a second copy of it. */
                    <span
                      id={refusalId(scope, variable.name, o.value)}
                      className="max-w-[18rem] text-right"
                    >
                      {why}
                    </span>
                  ) : (
                    <span className="tabular-nums">
                      {o.price > 0 ? `+${formatMonthly(o.price)}` : "included"}
                    </span>
                  )}
                </ItemActions>
              </button>
            </Item>
          );
        })}
      </div>
      {/* This control shows each reason on its own row, so it needs the line the
        shared list carries underneath rather than the list itself — the rules
        are already in place, and repeating them would put two copies of one
        sentence on the page (constitution #17). */}
      {refused && (
        <p className="mt-1.5 text-xs italic text-muted-foreground">
          {REFUSAL_AFFORDANCE}
        </p>
      )}
    </div>
  );
}
