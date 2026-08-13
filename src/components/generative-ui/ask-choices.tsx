"use client";

/**
 * In-chat controls for the agent's ask_choices tool (docs/specs/configuration-canvas).
 *
 * The payload is computed server-side from solver state — valid options only
 * are selectable; invalid values render greyed in place. Option prices are
 * monthly deltas at the term in effect (docs/specs/service-agreement). Controls go
 * inert once the conversation moves past them or after submission.
 */

import { useState } from "react";
import { BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { choiceMessage, formatMonthly } from "@/lib/configurator";
import { useCardDispatch } from "./card-dispatch";

interface PayloadOption {
  value: string;
  label: string;
  price: number;
  status: "valid" | "invalid" | "chosen" | "forced";
  cheapest: boolean;
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

interface AskChoicesProps {
  toolCallId: string;
  status: string;
  result?: string;
}

export function AskChoices({ toolCallId, status, result }: AskChoicesProps) {
  const { inert: cardInert, dispatch: send } = useCardDispatch(toolCallId);
  const [selections, setSelections] = useState<Record<string, string>>({});

  if (status !== "complete" || !result) {
    return (
      <div className="my-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-3" /> preparing options…
      </div>
    );
  }

  let payload: Payload;
  try {
    payload = JSON.parse(result);
    if (!Array.isArray(payload.variables)) throw new Error("bad payload");
  } catch {
    return null; // ERROR results are relayed by the agent in text
  }

  const inert = cardInert;
  const multi = payload.variables.length > 1;

  const dispatch = (picks: { variable: string; value: string }[]) =>
    send(choiceMessage(picks));

  const select = (variable: string, value: string) => {
    if (inert) return;
    if (multi) setSelections((s) => ({ ...s, [variable]: value }));
    else dispatch([{ variable, value }]);
  };

  return (
    <Card
      className={`my-2 gap-0 py-0 shadow-none ${inert ? "opacity-60" : ""}`}
    >
      <CardContent className="space-y-3 p-3">
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
      </CardContent>
    </Card>
  );
}

function Control({
  variable,
  selected,
  inert,
  onSelect,
}: {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
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
  return { active, disabled: o.status === "invalid" };
}

function CheapestMark() {
  return (
    <BadgePercent
      className="inline size-3 text-emerald-600"
      aria-label="cheapest valid option"
    />
  );
}

/**
 * Disabled shadcn controls set `pointer-events: none`, which suppresses the
 * native `title` — and every explanation of why an option is unavailable lives
 * on one (docs/specs/ui-component-library, decision 4). Restoring pointer
 * events keeps the reason reachable; a disabled control still cannot be
 * clicked.
 */
const KEEP_TITLE = "disabled:pointer-events-auto";

function ChipRow({
  variable,
  selected,
  inert,
  onSelect,
}: {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {variable.options.map((o) => {
        const { active, disabled } = optionState(o, selected);
        return (
          <Button
            key={o.value}
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={disabled || inert}
            onClick={() => onSelect(variable.name, o.value)}
            title={disabled ? "ruled out by your other choices" : undefined}
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

function ScaleControl({
  variable,
  selected,
  inert,
  onSelect,
}: {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
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
          const { disabled } = optionState(o, selected);
          return (
            <ToggleGroupItem
              key={o.value}
              value={o.value}
              disabled={disabled || inert}
              title={
                disabled
                  ? "outside the valid range for your other choices"
                  : o.price > 0
                    ? `+${formatMonthly(o.price)}`
                    : undefined
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

function OptionList({
  variable,
  selected,
  inert,
  onSelect,
}: {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
  return (
    <div className="divide-y border">
      {variable.options.map((o) => {
        const { active, disabled } = optionState(o, selected);
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
              className="w-full text-left disabled:cursor-not-allowed"
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
                  <span>unavailable</span>
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
