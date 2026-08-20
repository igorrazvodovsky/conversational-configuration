"use client";

/**
 * In-chat controls for the agent's ask_choices tool (docs/specs/agreement-document).
 *
 * The payload is computed server-side from solver state — valid options only
 * are selectable; invalid values render greyed in place. Option prices are
 * monthly deltas at the term in effect (docs/specs/service-agreement). Controls go
 * inert once the conversation moves past them or after submission.
 */

import { useState } from "react";
import { BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Rule, choiceMessage, formatMonthly, refusalText } from "@/lib/configurator";
import { KEEP_TITLE } from "@/lib/utils";
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
  const { inert, reason, dispatch: send } = useCardDispatch(toolCallId);
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
            selected={selections[variable.name]}
            inert={inert}
            onSelect={select}
          />
        </div>
      ))}
      {multi && (
        <Button
          size="sm"
          disabled={inert || Object.keys(selections).length === 0}
          onClick={() =>
            dispatch(
              Object.entries(selections).map(([variable, value]) => ({
                variable,
                value,
              })),
            )
          }
        >
          Apply {Object.keys(selections).length || ""} choice
          {Object.keys(selections).length === 1 ? "" : "s"}
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
}

function Control({ variable, selected, inert, onSelect }: ControlProps) {
  switch (variable.control) {
    case "scale":
      return (
        <ScaleControl {...{ variable, selected, inert, onSelect }} />
      );
    case "list":
      return <OptionList {...{ variable, selected, inert, onSelect }} />;
    default:
      return <ChipRow {...{ variable, selected, inert, onSelect }} />;
  }
}

function optionState(o: PayloadOption, selected?: string) {
  const active = selected ? selected === o.value : o.status === "chosen" || o.status === "forced";
  const disabled = o.status === "invalid";
  // An unavailable option says which rules made it unavailable. Older tool
  // results carry no rules, and fall back to the wording they shipped with.
  return {
    active,
    disabled,
    why: disabled ? refusalText(o.rules ?? []) : undefined,
  };
}

function CheapestMark() {
  return (
    <BadgePercent
      className="inline size-3 text-emerald-600"
      aria-label="cheapest valid option"
    />
  );
}

function ChipRow({ variable, selected, inert, onSelect }: ControlProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {variable.options.map((o) => {
        const { active, disabled, why } = optionState(o, selected);
        return (
          <Button
            key={o.value}
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={disabled || inert}
            onClick={() => onSelect(variable.name, o.value)}
            title={why}
            className={`font-normal ${
              disabled
                ? `cursor-not-allowed line-through opacity-40 ${KEEP_TITLE}`
                : active
                  ? ""
                  : "hover:border-primary"
            }`}
          >
            {o.label} {o.cheapest && <CheapestMark />}
            {o.price > 0 && (
              <span className="text-xs opacity-70">
                +{formatMonthly(o.price)}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

function ScaleControl({ variable, selected, inert, onSelect }: ControlProps) {
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
          const { disabled, why } = optionState(o, selected);
          return (
            <ToggleGroupItem
              key={o.value}
              value={o.value}
              disabled={disabled || inert}
              title={
                why ?? (o.price > 0 ? `+${formatMonthly(o.price)}` : undefined)
              }
              // h-auto + whitespace-normal: toggle items are nowrap and fixed
              // height by default, which makes long scale labels ("630 kg /
              // 8 persons") overlap their neighbours instead of wrapping.
              className={`h-auto min-w-0 flex-1 px-1 py-1.5 text-xs leading-tight whitespace-normal data-[state=on]:bg-primary data-[state=on]:text-primary-foreground ${
                disabled ? `bg-secondary opacity-40 ${KEEP_TITLE}` : ""
              }`}
            >
              {o.label} {o.cheapest && <CheapestMark />}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        greyed segments are outside the currently valid range
      </div>
    </div>
  );
}

function OptionList({ variable, selected, inert, onSelect }: ControlProps) {
  return (
    <div className="divide-y border">
      {variable.options.map((o) => {
        const { active, disabled, why } = optionState(o, selected);
        return (
          <Item
            key={o.value}
            asChild
            size="sm"
            className={`px-3 py-2 ${
              active
                ? "bg-secondary font-medium"
                : disabled
                  ? "opacity-40"
                  : "hover:bg-secondary"
            }`}
          >
            <button
              type="button"
              disabled={disabled || inert}
              onClick={() => onSelect(variable.name, o.value)}
              title={why}
              className={`w-full text-left disabled:cursor-not-allowed ${disabled ? KEEP_TITLE : ""}`}
            >
              <ItemContent>
                <ItemTitle
                  className={`font-[inherit] ${disabled ? "line-through" : ""}`}
                >
                  {o.label} {o.cheapest && <CheapestMark />}
                </ItemTitle>
              </ItemContent>
              <ItemActions className="text-xs text-muted-foreground">
                {disabled ? (
                  <span className="max-w-[18rem] text-right">{why}</span>
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
  );
}
