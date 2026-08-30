"use client";

/**
 * Operative terms — the commitments (docs/specs/agreement-document; canvas
 * anatomy, *The anatomy*). The `agreement` group and the headline performance
 * outcomes as numbered clauses, above the consideration: monthly price and
 * modelled lifetime footprint.
 *
 * This is the negotiation surface. Provenance and the deviation register's
 * marks sit in the margin, beside the clause they qualify, which is where the
 * genre puts them.
 */

import {
  Candidate,
  Configuration,
  completionLabel,
  footprintBlock,
  formatCO2,
  formatMonthly,
  layerVariables,
  optionLabel,
  variablesByName,
} from "@/lib/configurator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clause,
  DeviationMark,
  LeftToUsMark,
  DocumentView,
  Gloss,
  LAYER_HEADING,
  ProvenanceBadge,
  ValueToken,
  displayOf,
  unmetFor,
} from "./document-parts";

const TERM_VARIABLES = layerVariables("terms");

function TermClause({
  variable,
  doc,
  index,
}: {
  variable: string;
  doc: DocumentView;
  index: number;
}) {
  const unmet = unmetFor(doc, variable);
  const leftToUs = doc.leftToUsFor(variable);
  const label = variablesByName.get(variable)?.label ?? variable;

  return (
    <Clause
      margin={
        <>
          <ProvenanceBadge variable={variable} doc={doc} />
          {unmet && <DeviationMark entries={unmet} doc={doc} />}
          {leftToUs && <LeftToUsMark clauses={leftToUs} />}
        </>
      }
    >
      <p className="text-sm leading-7">
        <span className="mr-2 text-xs tabular-nums text-muted-foreground">
          {index}.
        </span>
        <span className="font-medium">{label}.</span>{" "}
        <ValueToken variable={variable} doc={doc} />
      </p>
      <Gloss variable={variable} doc={doc} className="ml-6 block" />
    </Clause>
  );
}

/**
 * The consideration: what the operator pays, and what the agreement costs the
 * atmosphere. Its provenance is the completion the solver returned — the
 * objective it was optimised for — which is why the figure is labelled with it
 * rather than with a chooser.
 */
function Consideration({ doc }: { doc: DocumentView }) {
  const candidate = doc.config.candidate;
  if (!candidate) {
    return (
      <Clause>
        <p className="text-sm text-muted-foreground">
          No priced proposal yet — ask for one in chat, and the consideration
          appears here.
        </p>
      </Clause>
    );
  }

  return (
    <Clause
      margin={
        <span className="text-[10px] text-muted-foreground">
          {completionLabel(candidate)}
        </span>
      }
    >
      <p className="text-sm leading-7">
        <span className="mr-2 text-xs tabular-nums text-muted-foreground">
          §
        </span>
        <span className="font-medium">Consideration.</span>{" "}
        <span className="text-lg font-semibold tabular-nums">
          {formatMonthly(candidate.price)}
        </span>{" "}
        for the term, all clauses and schedules included.
      </p>
      <FootprintSentence config={doc.config} candidate={candidate} />
    </Clause>
  );
}

/**
 * Cumulative lifetime footprint with the assessment assumptions behind it on
 * demand (docs/specs/environmental-footprint decision 6): whole-configuration
 * total only — no per-option carbon badges anywhere — and every number
 * labelled as modelled. All values read from agent state and the model JSON;
 * nothing is derived here.
 */
function FootprintSentence({
  config,
  candidate,
}: {
  config: Configuration;
  candidate: Candidate;
}) {
  const footprint = candidate.footprint;
  if (!footprint) return null; // candidate persisted before the footprint feature

  const usageProfile =
    config.choices["usage_profile"]?.value ??
    candidate.assignment["usage_profile"];

  return (
    <p className="ml-6 text-xs text-muted-foreground">
      Modelled lifetime footprint{" "}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="underline decoration-dotted underline-offset-2 hover:text-foreground"
            title="modelled estimate — click for the assumptions behind it"
          >
            ≈ {formatCO2(footprint.total)} over{" "}
            {footprintBlock.service_life_years} years
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-3 text-left text-xs">
          <dl className="space-y-1">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">embodied</dt>
              <dd className="tabular-nums">{formatCO2(footprint.embodied)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">use-phase</dt>
              <dd className="tabular-nums">{formatCO2(footprint.use_phase)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">service life</dt>
              <dd>
                {footprintBlock.service_life_years} years,{" "}
                {footprintBlock.operating_days} days/year
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">usage profile</dt>
              <dd>
                {usageProfile ? optionLabel("usage_profile", usageProfile) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">grid factor</dt>
              <dd>
                {footprintBlock.grid_factor} kg CO₂e/kWh (
                {footprintBlock.grid_factor_decarbonising} if the grid
                decarbonises)
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-muted-foreground">
            {footprintBlock.module_scope}
          </p>
        </PopoverContent>
      </Popover>
      .
    </p>
  );
}

export function OperativeTerms({ doc }: { doc: DocumentView }) {
  return (
    <section className="mb-8">
      <h2 className={LAYER_HEADING}>Operative terms</h2>
      <div className="divide-y border-y">
        {TERM_VARIABLES.map((variable, i) => (
          <TermClause
            key={variable.name}
            variable={variable.name}
            doc={doc}
            index={i + 1}
          />
        ))}
        <Consideration doc={doc} />
      </div>
    </section>
  );
}
