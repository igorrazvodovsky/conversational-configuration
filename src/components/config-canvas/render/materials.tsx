"use client";

/**
 * The finishes as materials (docs/specs/visual-configuration design decision
 * 5). Painted steel, laminate, brushed stainless, PVC and the door finishes
 * are colour, roughness and metalness under the environment map — which is
 * what makes brushed steel read as brushed steel. Two surfaces get a real
 * texture because their identity is the pattern rather than the shade: the
 * studded rubber floor and the granite composite one.
 *
 * A finish this file does not know renders as painted steel rather than as
 * nothing: the model may gain an option before the render does, and a missing
 * car would be a worse answer than a plain one.
 */

import { useEffect } from "react";
import { useTexture } from "@react-three/drei";
import { DoubleSide, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

interface Standard {
  color: string;
  roughness: number;
  metalness: number;
}

const WALL: Record<string, Standard> = {
  painted_steel: { color: "#d6d8da", roughness: 0.62, metalness: 0.12 },
  laminate: { color: "#c0a888", roughness: 0.74, metalness: 0.0 },
  brushed_ss: { color: "#b6babf", roughness: 0.3, metalness: 1.0 },
  // the panoramic option is glass on the back wall only; the rest of the car
  // keeps the painted finish it would have had
  glass_panoramic: { color: "#d6d8da", roughness: 0.62, metalness: 0.12 },
};

const DOOR: Record<string, Standard> = {
  painted: { color: "#cfd2d5", roughness: 0.6, metalness: 0.15 },
  brushed_ss: { color: "#b6babf", roughness: 0.28, metalness: 1.0 },
  glass: { color: "#c9d3d6", roughness: 0.2, metalness: 0.4 },
};

const COP_PLATE: Record<string, Standard> = {
  standard: { color: "#b9bdc2", roughness: 0.35, metalness: 0.9 },
  vandal: { color: "#8d9298", roughness: 0.5, metalness: 0.95 },
  touch_premium: { color: "#2b2e33", roughness: 0.18, metalness: 0.6 },
};

const PLAIN_FLOOR: Record<string, Standard> = {
  pvc: { color: "#6d737a", roughness: 0.5, metalness: 0.05 },
};

/** The two textures, and how much of the world one tile covers. */
const TEXTURES = {
  rubber: { src: "/render/floor-rubber.webp", tile: 0.32, roughness: 0.92 },
  granite: { src: "/render/floor-granite.webp", tile: 1.0, roughness: 0.34 },
} as const;

useTexture.preload(TEXTURES.rubber.src);
useTexture.preload(TEXTURES.granite.src);

function configure(map: Texture, repeatX: number, repeatY: number) {
  map.wrapS = RepeatWrapping;
  map.wrapT = RepeatWrapping;
  map.colorSpace = SRGBColorSpace;
  map.repeat.set(repeatX, repeatY);
  map.needsUpdate = true;
}

function TexturedFloor({
  spec,
  width,
  depth,
}: {
  spec: (typeof TEXTURES)[keyof typeof TEXTURES];
  width: number;
  depth: number;
}) {
  const map = useTexture(spec.src) as Texture;
  // The loader caches one texture per URL and this scene has one floor, so
  // setting the tiling on it directly is safe.
  configure(map, width / spec.tile, depth / spec.tile);
  useEffect(() => {
    configure(map, width / spec.tile, depth / spec.tile);
  }, [map, width, depth, spec.tile]);
  return <meshStandardMaterial map={map} roughness={spec.roughness} metalness={0.05} />;
}

export function FloorMaterial({
  finish,
  width,
  depth,
}: {
  finish: string | null;
  width: number;
  depth: number;
}) {
  if (finish === "rubber")
    return <TexturedFloor spec={TEXTURES.rubber} width={width} depth={depth} />;
  if (finish === "granite")
    return <TexturedFloor spec={TEXTURES.granite} width={width} depth={depth} />;
  return <meshStandardMaterial {...(PLAIN_FLOOR[finish ?? ""] ?? PLAIN_FLOOR.pvc)} />;
}

export function WallMaterial({ finish }: { finish: string | null }) {
  return <meshStandardMaterial {...(WALL[finish ?? ""] ?? WALL.painted_steel)} />;
}

export function DoorMaterial({ finish }: { finish: string | null }) {
  if (finish === "glass") return <GlassMaterial tint="#c6d2d6" />;
  return <meshStandardMaterial {...(DOOR[finish ?? ""] ?? DOOR.painted)} />;
}

export function CopMaterial({ cop }: { cop: string | null }) {
  return <meshStandardMaterial {...(COP_PLATE[cop ?? ""] ?? COP_PLATE.standard)} />;
}

/**
 * The transmissive glass the panoramic wall and the framed glass doors are
 * made of. Transmission rather than plain transparency because the point of
 * the option is that the lobby stays in view through it.
 */
export function GlassMaterial({ tint = "#cdd8dc" }: { tint?: string }) {
  return (
    <meshPhysicalMaterial
      color={tint}
      transmission={0.92}
      thickness={0.04}
      roughness={0.06}
      metalness={0}
      ior={1.45}
      transparent
      side={DoubleSide}
    />
  );
}

/** The car's structural shell — frame edges, door sills, the parts no finish
 * variable speaks to. */
export const STRUCTURE: Standard = {
  color: "#7d8288",
  roughness: 0.55,
  metalness: 0.7,
};

export const HANDRAIL: Standard = {
  color: "#b6babf",
  roughness: 0.26,
  metalness: 1.0,
};
