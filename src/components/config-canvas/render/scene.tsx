"use client";

// docs/specs/visual-configuration/design.md
//
// The origin is the centre of the car floor and the entrance is on the +z face.
// Every mesh sits inside a `<Part>`, which stamps the part id and the variables
// it depicts onto the group — the seam a hit test would read.

import { useEffect, type ReactNode } from "react";
import { ContactShadows, Environment, MeshReflectorMaterial } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { DoubleSide } from "three";

import { Configuration, liveValue } from "@/lib/configurator";
import {
  CarGeometry,
  LEAF,
  ShaftGeometry,
  WALL,
  doorLeaves,
} from "./geometry";
import {
  CopMaterial,
  DoorMaterial,
  FloorMaterial,
  GlassMaterial,
  HANDRAIL,
  STRUCTURE,
  WallMaterial,
} from "./materials";
import { partsById } from "./parts";

function Part({
  id,
  hidden,
  children,
}: {
  id: string;
  hidden: ReadonlySet<string>;
  children: ReactNode;
}) {
  if (hidden.has(id)) return null;
  const spec = partsById.get(id);
  return (
    <group name={id} userData={{ partId: id, variables: spec?.variables ?? [] }}>
      {children}
    </group>
  );
}

/** `frameloop="demand"` draws no frames on its own, and without this the first
 * one is drawn while the loaders are still suspended and the panel stays black.
 * A burst rather than a single frame: the mirror's reflection and the contact
 * shadows need more than one pass to settle. */
function Redraw() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let frames = 0;
    let handle = 0;
    const tick = () => {
      invalidate();
      if (++frames < 5) handle = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(handle);
  });
  return null;
}

/** An enclosure to look through, not a solid. */
function ShaftMaterial() {
  return (
    <meshStandardMaterial
      color="#8e959c"
      roughness={0.92}
      metalness={0}
      transparent
      opacity={0.22}
      side={DoubleSide}
    />
  );
}

function Box({
  size,
  position,
  children,
}: {
  size: [number, number, number];
  position: [number, number, number];
  children: ReactNode;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      {children}
    </mesh>
  );
}

export function CarScene({
  config,
  car,
  shaft,
  hidden,
  onReady,
}: {
  config: Configuration;
  car: CarGeometry;
  shaft: ShaftGeometry | null;
  hidden: ReadonlySet<string>;
  /** This component does not mount until the suspended loaders resolve, which
   * is what makes it the honest signal to drop the loading line. */
  onReady: () => void;
}) {
  const { width: W, depth: D, height: H, doorWidth: OW, doorHeight: DH } = car;
  const wallFinish = liveValue(config, "wall_finish");
  const floorFinish = liveValue(config, "floor");
  const doorFinish = liveValue(config, "door_finish");
  const cop = liveValue(config, "cop");
  const mirror = liveValue(config, "mirror");
  const handrail = liveValue(config, "handrail");
  const panoramic = wallFinish === "glass_panoramic";
  useEffect(onReady, [onReady]);

  const returnWidth = Math.max((W - OW) / 2, 0.02);
  const frontZ = D / 2 + WALL / 2;

  return (
    <group>
      {/* One self-hosted environment map does the work geometry cannot: it is
          what makes brushed steel read as brushed steel (design decision 6).
          Loaded by path — never a drei preset, which fetches from a CDN. */}
      <Environment files="/render/studio-1k.hdr" background={false} environmentIntensity={0.85} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 6, 5]} intensity={1.1} />
      {/* the car's own light source, so the cabin is lit from its ceiling */}
      <pointLight position={[0, H - 0.15, 0]} intensity={2.2} distance={Math.max(W, D) * 3} decay={2} />

      <Part id="car-shell" hidden={hidden}>
        <Box
          size={[W + 2 * WALL, 0.07, D + 2 * WALL]}
          position={[0, -0.075, 0]}
        >
          <meshStandardMaterial {...STRUCTURE} />
        </Box>
      </Part>

      <Part id="floor" hidden={hidden}>
        <mesh position={[0, -0.02, 0]}>
          <boxGeometry args={[W, 0.04, D]} />
          <FloorMaterial finish={floorFinish} width={W} depth={D} />
        </mesh>
      </Part>

      <Part id="ceiling" hidden={hidden}>
        <Box size={[W, 0.06, D]} position={[0, H + 0.03, 0]}>
          <meshStandardMaterial color="#e6e8ea" roughness={0.5} metalness={0.1} />
        </Box>
        {/* the downlights that make the cabin its own light source */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * W * 0.22, H - 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[Math.min(W, D) * 0.11, 24]} />
            <meshStandardMaterial color="#ffffff" emissive="#fff6e2" emissiveIntensity={2.2} />
          </mesh>
        ))}
      </Part>

      <Part id="wall-rear" hidden={hidden}>
        <Box size={[W + 2 * WALL, H, WALL]} position={[0, H / 2, -D / 2 - WALL / 2]}>
          {panoramic ? <GlassMaterial /> : <WallMaterial finish={wallFinish} />}
        </Box>
      </Part>

      <Part id="wall-left" hidden={hidden}>
        <Box size={[WALL, H, D]} position={[-W / 2 - WALL / 2, H / 2, 0]}>
          <WallMaterial finish={wallFinish} />
        </Box>
      </Part>

      <Part id="wall-right" hidden={hidden}>
        <Box size={[WALL, H, D]} position={[W / 2 + WALL / 2, H / 2, 0]}>
          <WallMaterial finish={wallFinish} />
        </Box>
      </Part>

      {/* The car front: two returns and a header, which is what states the
          opening the door width names. */}
      <Part id="wall-front" hidden={hidden}>
        {[-1, 1].map((s) => (
          <Box
            key={s}
            size={[returnWidth, H, WALL]}
            position={[s * (OW / 2 + returnWidth / 2), H / 2, frontZ]}
          >
            <WallMaterial finish={wallFinish} />
          </Box>
        ))}
        <Box size={[OW, H - DH, WALL]} position={[0, DH + (H - DH) / 2, frontZ]}>
          <WallMaterial finish={wallFinish} />
        </Box>
        {/* the sill, so the opening has a bottom edge to read */}
        <Box size={[OW, 0.03, WALL * 1.6]} position={[0, 0.015, frontZ]}>
          <meshStandardMaterial {...STRUCTURE} />
        </Box>
      </Part>

      {/* Parked open, which is what makes the three types tell apart at a
          glance and lets the cabin read from outside (design decision 4). */}
      <Part id="door-leaves" hidden={hidden}>
        {doorLeaves(car).map((leaf, i) => (
          <Box
            key={i}
            size={[leaf.width, DH, LEAF]}
            position={[leaf.x, DH / 2, frontZ + WALL / 2 + leaf.offset + LEAF / 2]}
          >
            <DoorMaterial finish={doorFinish} />
          </Box>
        ))}
      </Part>

      {mirror && mirror !== "none" && (
        <Part id="mirror" hidden={hidden}>
          <mesh
            position={[
              0,
              mirror === "full" ? H * 0.52 : H * 0.72,
              -D / 2 + 0.012,
            ]}
          >
            <planeGeometry
              args={[W * 0.72, mirror === "full" ? H * 0.84 : H * 0.42]}
            />
            <MeshReflectorMaterial
              resolution={512}
              mixBlur={1}
              mixStrength={1.6}
              blur={[300, 100]}
              roughness={0.22}
              metalness={0.5}
              color="#c4cad0"
              mirror={0.75}
            />
          </mesh>
        </Part>
      )}

      {handrail && handrail !== "none" && (
        <Part id="handrail" hidden={hidden}>
          <mesh position={[0, 0.9, -D / 2 + 0.07]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, W * 0.86, 12]} />
            <meshStandardMaterial {...HANDRAIL} />
          </mesh>
          {handrail === "three_sides" &&
            [-1, 1].map((s) => (
              <mesh
                key={s}
                position={[s * (W / 2 - 0.07), 0.9, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.02, 0.02, D * 0.82, 12]} />
                <meshStandardMaterial {...HANDRAIL} />
              </mesh>
            ))}
        </Part>
      )}

      {/* Beside the entrance, on the right-hand wall, where it is reached from
          inside the car. */}
      <Part id="cop" hidden={hidden}>
        <Box
          size={[0.02, 0.92, 0.17]}
          position={[W / 2 - 0.012, 1.16, D / 2 - 0.28]}
        >
          <CopMaterial cop={cop} />
        </Box>
        <Box
          size={[0.012, cop === "touch_premium" ? 0.42 : 0.6, 0.11]}
          position={[W / 2 - 0.026, cop === "touch_premium" ? 1.28 : 1.16, D / 2 - 0.28]}
        >
          {cop === "touch_premium" ? (
            <meshStandardMaterial
              color="#101318"
              emissive="#1d4ed8"
              emissiveIntensity={0.5}
              roughness={0.1}
              metalness={0.2}
            />
          ) : (
            <meshStandardMaterial
              color={cop === "vandal" ? "#5c6167" : "#e8eaec"}
              roughness={0.4}
              metalness={0.3}
            />
          )}
        </Box>
      </Part>

      {/* The shaft, in the one viewpoint that draws it: plan clearance and the
          pit, and nothing above — travel and stops are ranges in the model, so
          no floor stack and no shaft ceiling may be drawn. Four walls, open at
          both ends, is all the agreement supports. */}
      {shaft && (
        <>
          <Part id="shaft" hidden={hidden}>
            {(() => {
              const top = H + 0.9;
              const height = top + shaft.pit;
              const midY = (top - shaft.pit) / 2;
              const t = 0.06;
              return (
                <>
                  {([-1, 1] as const).map((s) => (
                    <Box
                      key={`x${s}`}
                      size={[t, height, shaft.depth]}
                      position={[s * (shaft.width / 2 + t / 2), midY, 0]}
                    >
                      <ShaftMaterial />
                    </Box>
                  ))}
                  {([-1, 1] as const).map((s) => (
                    <Box
                      key={`z${s}`}
                      size={[shaft.width + 2 * t, height, t]}
                      position={[0, midY, s * (shaft.depth / 2 + t / 2)]}
                    >
                      <ShaftMaterial />
                    </Box>
                  ))}
                </>
              );
            })()}
          </Part>
          <Part id="pit" hidden={hidden}>
            <Box
              size={[shaft.width, 0.08, shaft.depth]}
              position={[0, -shaft.pit - 0.04, 0]}
            >
              <meshStandardMaterial color="#6f767d" roughness={0.95} metalness={0} />
            </Box>
          </Part>
        </>
      )}

      <Redraw />

      <ContactShadows
        position={[0, -0.05, 0]}
        scale={Math.max(W, D) * 4}
        blur={2.4}
        opacity={0.5}
        far={2}
      />
    </group>
  );
}
