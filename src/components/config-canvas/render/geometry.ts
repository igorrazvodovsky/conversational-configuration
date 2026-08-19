/**
 * The scene's dimensions, computed from the configuration
 * (docs/specs/visual-configuration). Every number the render needs is already
 * a literal millimetre value in the product model, so nothing here is authored
 * and nothing is a mesh: the codes are parsed and divided into scene metres.
 *
 * Codes are parsed, never labels — a label is display text and may be
 * rewritten; `c1600x1400` is the model's own datum.
 */

import { Configuration, liveValue } from "@/lib/configurator";

/** Model millimetres to scene metres. */
const M = 1000;

export type DoorType = "telescopic_2" | "center_2" | "center_4";

export interface CarGeometry {
  /** interior clear dimensions, metres */
  width: number;
  depth: number;
  height: number;
  /** the door opening, metres */
  doorWidth: number;
  doorHeight: number;
  doorType: DoorType;
}

/** The shaft around the car, when the agreement states one. */
export interface ShaftGeometry {
  width: number;
  depth: number;
  pit: number;
}

/** Panel and slab thickness. Walls are boxes rather than planes so the
 * cutaway viewpoint has an edge to read. */
export const WALL = 0.05;
export const LEAF = 0.035;

function pair(code: string | null, re: RegExp): [number, number] | null {
  const m = code ? re.exec(code) : null;
  return m ? [Number(m[1]) / M, Number(m[2]) / M] : null;
}

function single(code: string | null, re: RegExp): number | null {
  const m = code ? re.exec(code) : null;
  return m ? Number(m[1]) / M : null;
}

/**
 * Door height is derived from cabin height rather than asked for: 2000 mm
 * under the two lower cabins, 2100 under the tallest. One less term the
 * customer has to decide, and no second variable to keep consistent.
 */
function doorHeightFor(carHeight: number): number {
  return carHeight >= 2.4 ? 2.1 : 2.0;
}

/** The variables without which no honest car can be drawn. */
export const GEOMETRY_VARIABLES = [
  "car_size",
  "car_height",
  "door_width",
  "door_type",
] as const;

/**
 * The car, or null when the agreement has not yet said enough to draw one.
 * Never a guess: a missing value is an empty state, not a default cabin.
 */
export function carGeometry(config: Configuration): CarGeometry | null {
  const size = pair(liveValue(config, "car_size"), /^c(\d+)x(\d+)$/);
  const height = single(liveValue(config, "car_height"), /^ch(\d+)$/);
  const doorWidth = single(liveValue(config, "door_width"), /^d(\d+)$/);
  const doorType = liveValue(config, "door_type") as DoorType | null;
  if (!size || !height || !doorWidth || !doorType) return null;
  return {
    width: size[0],
    depth: size[1],
    height,
    doorWidth,
    doorHeight: doorHeightFor(height),
    doorType,
  };
}

/** The shaft, when both its size and the pit are stated. */
export function shaftGeometry(config: Configuration): ShaftGeometry | null {
  const size = pair(liveValue(config, "shaft"), /^t\d+_(\d+)x(\d+)$/);
  const pit = single(liveValue(config, "pit_depth"), /^p(\d+)$/);
  if (!size || !pit) return null;
  return { width: size[0], depth: size[1], pit };
}

/** One door panel, parked where it stands when the doors are open. */
export interface Leaf {
  /** centre of the panel on the car's width axis, metres */
  x: number;
  width: number;
  /** how far the panel stands in front of the car front, metres */
  offset: number;
}

/**
 * The three door types as panel layouts (design decision 4). Leaf count and
 * travel direction come from `door_type`, the widths from `door_width`; the
 * panels are drawn parked open, which is what makes the three distinguishable
 * from the outside viewpoint and lets the interior read through the opening.
 *
 * A telescopic pair nests: the fast panel is wider and stands in front of the
 * slow one, both to one side. Centre-opening parts at the middle, one panel
 * each way. The four-panel variant is a nesting pair each way.
 */
export function doorLeaves(car: CarGeometry): Leaf[] {
  const half = car.doorWidth / 2;
  const nest = (side: 1 | -1, closed: number): Leaf[] => {
    const fast = closed * 0.55;
    const slow = closed * 0.45;
    return [
      { x: side * (half + fast / 2), width: fast, offset: 0.06 },
      { x: side * (half + slow / 2), width: slow, offset: 0.015 },
    ];
  };
  switch (car.doorType) {
    case "telescopic_2":
      return nest(-1, car.doorWidth);
    case "center_2":
      return [
        { x: -(half + half / 2), width: half, offset: 0.015 },
        { x: half + half / 2, width: half, offset: 0.015 },
      ];
    case "center_4":
      return [...nest(-1, half), ...nest(1, half)];
  }
}
