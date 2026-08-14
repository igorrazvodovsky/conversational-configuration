"use client";

/**
 * Recitals — the change in the world (docs/specs/agreement-document; canvas
 * anatomy §3). The site, the situation, and what will happen: installed thus,
 * operating so, for the term — in the building's language, so the record
 * answers in the vocabulary elicitation speaks.
 *
 * Every sentence here is a deterministic template over agent state and model
 * data. The agent never composes this prose: model-written text in the record
 * drifts from the state it describes, and constitution #6's grounding
 * discipline applies to the document as much as to explanations. The agent's
 * free narration has a surface already — the chat.
 *
 * The prose restates three agreement-group values (term, service, use) that
 * the operative terms own. That is deliberate: a recital reads as the change in
 * the world only if it says how long and on what service, and both instances
 * edit the same state. Marks are not duplicated — a variable's provenance and
 * deviation marks render only in its home layer, which for those three is the
 * terms.
 */

import {
  Clause,
  DeviationMark,
  DocumentView,
  ProvenanceBadge,
  ValueToken,
  unmetFor,
} from "./document-parts";

/**
 * How each value reads inside these sentences. The catalogue's labels are
 * column headings — "Office", "Modernization (existing shaft)" — and dropping
 * them into prose is exactly the re-imposition of catalogue terms this layer
 * exists to undo. Total over the model's values; a value that grows a new
 * option falls back to its label rather than breaking the sentence.
 */
const BUILDING: Record<string, string> = {
  office: "an office building",
  residential: "a residential building",
  hotel: "a hotel",
  hospital: "a hospital",
  retail: "a retail building",
};

const REGIME: Record<string, string> = {
  europe: "European lift code, EN 81-20",
  north_america: "North American lift code, ASME A17.1",
};

const WORKS: Record<string, string> = {
  new_build: "into the shaft of the new building",
  modernization:
    "into the building’s existing shaft, replacing the equipment there",
};

const ACCESS: Record<string, string> = {
  none: "no accessibility package",
  en81_70: "the EN 81-70 accessibility package",
  ada: "the ADA accessibility package",
};

const MONITORING: Record<string, string> = {
  connected: "with the unit remotely monitored",
  none: "with no remote monitoring",
};

const TRAFFIC: Record<string, string> = {
  low: "a few trips an hour",
  medium: "steady traffic through the day",
  heavy: "near-continuous traffic",
};

function LayerHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

/** The margin marks for the variables a paragraph commits. */
function Marks({ doc, variables }: { doc: DocumentView; variables: string[] }) {
  return (
    <>
      {variables.map((variable) => {
        const unmet = unmetFor(doc, variable);
        return (
          <div key={variable} className="w-full space-y-1">
            <ProvenanceBadge variable={variable} doc={doc} />
            {unmet && <DeviationMark entries={unmet} doc={doc} />}
          </div>
        );
      })}
    </>
  );
}

export function Recitals({
  doc,
  siteName,
}: {
  doc: DocumentView;
  /** The workspace's name — all the site the store carries; there is no
   * address field, and this spec does not add one. */
  siteName: string | null;
}) {
  return (
    <section className="mb-8">
      <LayerHeading>Recitals</LayerHeading>
      <div className="divide-y">
        <Clause margin={<Marks doc={doc} variables={["building_type", "region"]} />}>
          <p className="text-sm leading-7">
            This agreement covers one elevator at{" "}
            <span className="font-medium">
              {siteName ?? "a site not yet named"}
            </span>
            ,{" "}
            <ValueToken
              variable="building_type"
              doc={doc}
              phrasing={BUILDING}
              placeholder="a building of a kind not yet stated"
            />{" "}
            built to the{" "}
            <ValueToken
              variable="region"
              doc={doc}
              phrasing={REGIME}
              placeholder="code regime not yet stated"
            />
            .
          </p>
        </Clause>

        <Clause
          margin={<Marks doc={doc} variables={["installation", "accessibility"]} />}
        >
          <p className="text-sm leading-7">
            The unit will be installed{" "}
            <ValueToken
              variable="installation"
              doc={doc}
              phrasing={WORKS}
              placeholder="in a shaft not yet described"
            />
            , and will carry{" "}
            <ValueToken
              variable="accessibility"
              doc={doc}
              phrasing={ACCESS}
              placeholder="an accessibility package not yet decided"
            />
            .
          </p>
        </Clause>

        <Clause>
          <p className="text-sm leading-7">
            In service it is expected to see{" "}
            <ValueToken
              variable="usage_profile"
              doc={doc}
              phrasing={TRAFFIC}
              placeholder="traffic not yet described"
            />
            . It will be maintained under{" "}
            <ValueToken
              variable="service_level"
              doc={doc}
              placeholder="a service level not yet agreed"
            />{" "}
            for{" "}
            <ValueToken
              variable="contract_term"
              doc={doc}
              placeholder="a term not yet agreed"
            />{" "}
            from handover,{" "}
            <ValueToken
              variable="connectivity_package"
              doc={doc}
              phrasing={MONITORING}
              placeholder="with monitoring not yet decided"
            />
            . The terms below state what is committed; the schedules state the
            machine that delivers it.
          </p>
        </Clause>
      </div>
    </section>
  );
}
