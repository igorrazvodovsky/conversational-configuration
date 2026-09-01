"use client";

// docs/specs/agreement-document/design.md

import { useState } from "react";
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
  /** Absent on cards rendered from older tool results. */
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

  // A gesture leaves no row of its own, so the card is the record of the pick
  // and a reopened conversation restores it from the message.
  const asked = new Set(payload.variables.map((variable) => variable.name));
  const picked: Record<string, string> = {};
  for (const { variable, value } of answer ?? []) {
    if (asked.has(variable)) picked[variable] = value;
  }
  // The two agree whenever the card is live, so the merge matters only for the
  // batch just applied.
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
          disabled={inert}
          onClick={() => {
            // A card may ask about several terms and take a pick on one:
            // a partial batch is a valid gesture, not an omission.
            if (pickedCount === 0) {
              sayWhy(
                `${toolCallId}-unpicked`,
                `Pick a value for ${payload.variables
                  .map((v) => v.label)
                  .join(" or ")} first, then apply.`,
              );
              return;
            }
            // From what the card displays, not from component state.
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

interface ControlProps {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
  /** The tool call that drew this control: a transcript may hold several cards
   * over one variable. */
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
  // `refused`, not `disabled`. Older tool results carry no rules and fall back
  // to the wording they shipped with.
  const refused = o.status === "invalid";
  return {
    active,
    refused,
    why: refused ? refusalText(o.rules ?? []) : undefined,
  };
}

function refusalsOf(variable: PayloadVariable, selected?: string): Refusal[] {
  return variable.options
    .filter((o) => optionState(o, selected).refused)
    .map((o) => ({ value: o.value, label: o.label, rules: o.rules ?? [] }));
}

/** Never an opacity: it composes multiplicatively down the tree
 * (constitution #16). */
const UNAVAILABLE = "text-muted-foreground line-through";

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
              // A pick computed against an agreement that has moved would
              // apply the wrong change, which a sentence cannot guard.
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
              {o.label}
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
                // Joined, not gapped: this is a range, and separated cells read
                // as independent options.
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
              // height by default, so long scale labels overlap rather than
              // wrap. No background tint reaches 3:1 against the card.
              className={`h-auto min-w-0 flex-1 px-1 py-1.5 text-xs leading-tight whitespace-normal data-[state=on]:bg-primary data-[state=on]:text-primary-foreground ${
                refused ? `border-dashed ${UNAVAILABLE}` : ""
              }`}
            >
              {o.label}
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
                    {o.label}
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
      {/* Each reason is already on its own row here, so this takes the shared
        list's last line without the list. */}
      {refused && (
        <p className="mt-1.5 text-xs italic text-muted-foreground">
          {REFUSAL_AFFORDANCE}
        </p>
      )}
    </div>
  );
}
