"use client";

// docs/specs/visual-configuration/design.md

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
import { sayWhy } from "@/lib/say-why";
import { CarScene } from "./scene";
import { DEFAULT_VIEWPOINT, VIEWPOINTS, Viewpoint } from "./viewpoints";

/** Placed by the viewpoint and then left alone: a value that changes while the
 * operator is looking must not throw away the angle they orbited to. */
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

/** Named rather than guessed: a car drawn from defaults would be a picture of
 * an agreement nobody made. */
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
  onExit: () => void;
}) {
  const [viewpoint, setViewpoint] = useState<Viewpoint>(DEFAULT_VIEWPOINT);
  // The environment map and the floor textures take a moment on first entry,
  // and a black panel says nothing.
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
              if (!next) return;
              // Answered, and not also acted on: moving to the view would pair
              // the sentence with an empty picture.
              if (next.id === "shaft" && !shaft) {
                sayWhy(
                  "no-shaft",
                  "The agreement does not state a shaft yet. Set the shaft width and depth and this view draws it.",
                );
                return;
              }
              setViewpoint(next);
            }}
          >
            {VIEWPOINTS.map((v) => (
              <ToggleGroupItem
                key={v.id}
                value={v.id}
                title={v.hint}
                // Live even with nothing to look at; the group's
                // `onValueChange` above answers it.
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
            `role="img"` makes its whole subtree presentational, so it goes on a
            wrapper around the canvas alone rather than on the panel, which also
            holds the status line. The WebGL canvas has no accessible content
            of its own (docs/specs/visual-configuration/design.md decision 10).
          */
          <div
            role="img"
            className="absolute inset-0"
            aria-label={`The configured car, ${viewpoint.label.toLowerCase()}. Every value it draws is stated in words in the agreement, which the "Back to the agreement" button opens.`}
          >
            <Canvas
              // Demand, not continuous: frames are drawn on a configuration
              // change and while the operator orbits.
              frameloop="demand"
              dpr={[1, 2]}
              // The buffer has to stay readable, or a still-image export
              // becomes impossible to add later.
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
