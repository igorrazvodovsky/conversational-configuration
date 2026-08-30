"use client";

/**
 * The render: a second mode of the canvas, showing the car the schedules
 * describe (docs/specs/visual-configuration).
 *
 * A projection and nothing else. It takes the configuration as a prop from
 * `ConfigCanvas`, which already holds it, so it adds no subscription to agent
 * state, keeps no record of its own, and follows a draft switch, an undo and a
 * redo for free. It carries no provenance and no price: who chose a value and
 * what it costs are the document's answers.
 *
 * It is mounted only while the mode is entered, so a workspace that is never
 * switched into it pays for no WebGL context (design decision 9).
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Configuration,
  liveValue,
  optionLabel,
  variablesByName,
} from "@/lib/configurator";
import {
  CarGeometry,
  GEOMETRY_VARIABLES,
  ShaftGeometry,
  carGeometry,
  shaftGeometry,
} from "./geometry";
import { CarScene } from "./scene";
import { DEFAULT_VIEWPOINT, VIEWPOINTS, Viewpoint } from "./viewpoints";

/**
 * The camera is placed by the viewpoint and then left alone: a finish that
 * changes while the operator is looking must not throw away the angle they
 * orbited to. Only a viewpoint change re-frames.
 */
function CameraRig({
  viewpoint,
  car,
  shaft,
}: {
  viewpoint: Viewpoint;
  car: CarGeometry;
  shaft: ShaftGeometry | null;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as {
    target: { set: (x: number, y: number, z: number) => void };
    update: () => void;
  } | null;
  const invalidate = useThree((s) => s.invalidate);
  const scene = useRef({ car, shaft });
  scene.current = { car, shaft };

  useEffect(() => {
    const { car: c, shaft: s } = scene.current;
    const [px, py, pz] = viewpoint.camera(c, s);
    const [tx, ty, tz] = viewpoint.target(c);
    camera.position.set(px, py, pz);
    camera.lookAt(tx, ty, tz);
    controls?.target.set(tx, ty, tz);
    controls?.update();
    invalidate();
  }, [viewpoint, camera, controls, invalidate]);

  return null;
}

/** What the agreement has not said yet, named rather than guessed: a car
 * drawn from defaults would be a picture of an agreement nobody made. */
function MissingValues({ config }: { config: Configuration }) {
  const missing = GEOMETRY_VARIABLES.filter((v) => !liveValue(config, v)).map(
    (v) => (variablesByName.get(v)?.label ?? v).toLowerCase(),
  );
  return (
    <Empty className="h-full">
      <EmptyDescription>
        Nothing to draw yet — the car is not described. Settle{" "}
        {missing.join(", ").replace(/, ([^,]*)$/, " and $1")} in the chat or in
        the schedules, and the car appears here.
      </EmptyDescription>
    </Empty>
  );
}

export default function CarViewer({
  config,
  onExit,
}: {
  config: Configuration;
  /** the one click back to the document */
  onExit: () => void;
}) {
  const [viewpoint, setViewpoint] = useState<Viewpoint>(DEFAULT_VIEWPOINT);
  // The environment map and the floor textures take a moment on first entry,
  // and a black panel says nothing. The scene itself reports when it has
  // something to show.
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const car = carGeometry(config);
  const shaft = shaftGeometry(config);
  const hidden = new Set(viewpoint.hidden);
  const doorType = liveValue(config, "door_type");

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background">
      {/* The render's own chrome, outside the canvas element: DOM inside the
          canvas subtree is what drei's `Html` would do, and a Radix primitive
          there would mint ids in a tree that forbids them. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={onExit}
          className="font-normal text-muted-foreground"
        >
          <FileText />
          Back to the agreement
        </Button>
        {car && (
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={viewpoint.id}
            onValueChange={(id) => {
              const next = VIEWPOINTS.find((v) => v.id === id);
              if (next) setViewpoint(next);
            }}
          >
            {VIEWPOINTS.map((v) => (
              <ToggleGroupItem
                key={v.id}
                value={v.id}
                title={v.hint}
                disabled={v.id === "shaft" && !shaft}
              >
                {v.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        {car ? (
          /*
            What the picture is, and where its equivalent is. The render is a
            projection of values the agreement already states, so the agreement
            mode is its text alternative rather than a described geometry — a
            fact the markup never declared (constitution #16, and
            docs/specs/visual-configuration decision 10).

            The role goes on a wrapper around the canvas alone rather than on
            the panel: `role="img"` makes its whole subtree presentational, and
            the panel also holds the status line below, which is not part of
            the picture. The WebGL canvas has no accessible content of its own,
            so a name on it is a name on nothing.
          */
          <div
            role="img"
            className="absolute inset-0"
            aria-label={`The configured car, ${viewpoint.label.toLowerCase()}. Every value it draws is stated in words in the agreement, which the "Back to the agreement" button opens.`}
          >
            <Canvas
              // Demand, not continuous: frames are drawn when the configuration
              // changes and while the operator orbits, and never otherwise.
              frameloop="demand"
              dpr={[1, 2]}
              // The buffer has to stay readable or the still-image export the
              // requirements leave out of scope becomes impossible to add later.
              gl={{ preserveDrawingBuffer: true, antialias: true }}
              camera={{ fov: 45, near: 0.05, far: 120 }}
            >
              <Suspense fallback={null}>
                <CarScene
                  config={config}
                  car={car}
                  shaft={shaft}
                  hidden={hidden}
                  onReady={onReady}
                />
              </Suspense>
              <OrbitControls
                makeDefault
                enablePan={false}
                minDistance={0.4}
                maxDistance={24}
                maxPolarAngle={Math.PI * 0.52}
              />
              <CameraRig viewpoint={viewpoint} car={car} shaft={shaft} />
            </Canvas>
          </div>
        ) : (
          <MissingValues config={config} />
        )}
        {/* A sibling of the image rather than a child of it, so it is not
            swallowed by the image's own name. */}
        {car && !ready && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            drawing the car…
          </p>
        )}
      </div>

      {/* What the picture is of, in the document's own words — the render
          states no price, no provenance and no rule. */}
      {car && (
        <p className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">
          {viewpoint.hint}
          {doorType ? ` · ${optionLabel("door_type", doorType)}` : ""}
        </p>
      )}
    </div>
  );
}
