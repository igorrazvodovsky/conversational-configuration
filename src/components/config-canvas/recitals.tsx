"use client";

// docs/specs/agreement-document/design.md
//
// Every sentence is a deterministic template over agent state and model data.
// The agent never composes this prose: model-written text in the record drifts
// from the state it describes (constitution #6).
//
// Term, service and use are restated here and stated in the terms. Both edit
// the same state, and the marks render only in a variable's home layer.

import {
  Clause,
  DeviationMark,
  LeftToUsMark,
  DocumentView,
  LAYER_HEADING,
  ProvenanceBadge,
  ValueToken,
  unmetFor,
} from "./document-parts";

/** The catalogue's labels are column headings, and dropping them into prose
 * re-imposes the vocabulary this layer exists to undo. Falls back to the
 * label. */
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

function Marks({ doc, variables }: { doc: DocumentView; variables: string[] }) {
  return (
    <>
      {variables.map((variable) => {
        const unmet = unmetFor(doc, variable);
        const leftToUs = doc.leftToUsFor(variable);
        return (
          <div
            key={variable}
            className="flex w-full flex-col items-start gap-1 @2xl:items-end"
          >
            <ProvenanceBadge variable={variable} doc={doc} />
            {unmet && <DeviationMark entries={unmet} doc={doc} />}
            {leftToUs && <LeftToUsMark clauses={leftToUs} />}
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
  /** The workspace's name — all the site the store carries. */
  siteName: string | null;
}) {
  return (
    <section className="mb-8">
      <h2 className={LAYER_HEADING}>Recitals</h2>
      <div className="divide-y">
        <Clause
          margin={<Marks doc={doc} variables={["building_type", "region"]} />}
        >
          <p className="text-sm leading-7">
            This agreement covers one elevator at{" "}
            <span className="font-medium">
              {siteName ?? "a site not yet named"}
            </span>
            ,{" "}
            <ValueToken
              scope="recital"
              variable="building_type"
              doc={doc}
              phrasing={BUILDING}
              placeholder="a building of a kind not yet stated"
            />{" "}
            built to the{" "}
            <ValueToken
              scope="recital"
              variable="region"
              doc={doc}
              phrasing={REGIME}
              placeholder="code regime not yet stated"
            />
            .
          </p>
        </Clause>

        <Clause
          margin={
            <Marks doc={doc} variables={["installation", "accessibility"]} />
          }
        >
          <p className="text-sm leading-7">
            The unit will be installed{" "}
            <ValueToken
              scope="recital"
              variable="installation"
              doc={doc}
              phrasing={WORKS}
              placeholder="in a shaft not yet described"
            />
            , and will carry{" "}
            <ValueToken
              scope="recital"
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
              scope="recital"
              variable="usage_profile"
              doc={doc}
              phrasing={TRAFFIC}
              placeholder="traffic not yet described"
            />
            . It will be maintained under{" "}
            <ValueToken
              scope="recital"
              variable="service_level"
              doc={doc}
              placeholder="a service level not yet agreed"
            />{" "}
            for{" "}
            <ValueToken
              scope="recital"
              variable="contract_term"
              doc={doc}
              placeholder="a term not yet agreed"
            />{" "}
            from handover,{" "}
            <ValueToken
              scope="recital"
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
