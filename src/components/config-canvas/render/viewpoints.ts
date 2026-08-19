/**
 * Viewpoints: data over one scene graph (docs/specs/visual-configuration
 * design decision 7). A viewpoint is a camera, a target and the parts it
 * hides; adding a fourth is a row in this list, not a change to the scene.
 *
 * Camera and target are functions of the car, because a 1100 mm cabin and a
 * 2100 mm one cannot be framed from the same distance.
 */

import { CarGeometry, ShaftGeometry } from "./geometry";

export interface Viewpoint {
  id: string;
  label: string;
  /** what the framing is for, shown under the control */
  hint: string;
  camera: (car: CarGeometry, shaft: ShaftGeometry | null) => [number, number, number];
  target: (car: CarGeometry) => [number, number, number];
  /** part ids this viewpoint leaves out */
  hidden: string[];
}

/** The shaft is drawn in one viewpoint only, so every other one hides it. */
const NO_SHAFT = ["shaft", "pit"];

export const VIEWPOINTS: Viewpoint[] = [
  {
    id: "outside",
    label: "Outside",
    hint: "the car as an object, near side open and the doors standing open",
    camera: (car) => [
      -(car.width * 0.9 + 1.9),
      car.height * 0.72,
      car.depth * 0.8 + 2.4,
    ],
    target: (car) => [0, car.height * 0.42, 0],
    // The near side wall and the ceiling are cut away so the cabin reads from
    // outside; the car front stays, or the opening its width states would be
    // invisible.
    hidden: [...NO_SHAFT, "wall-left", "ceiling"],
  },
  {
    id: "inside",
    label: "Inside",
    hint: "eye height in the car, the cabin finishes at reading distance",
    // At the doorway looking back, not at the back looking out: the cabin's
    // character is the rear wall — the mirror at its stated height, the
    // handrail, the wall finish — and a camera facing the open doors would be
    // pointed at the one part of the scene that is empty. The operating panel
    // is beside the entrance and so behind this camera; it reads from the
    // outside viewpoint instead, through the wall that one cuts away.
    camera: (car) => [0, 1.55, car.depth / 2 + 0.55],
    target: (car) => [0, car.height * 0.45, -car.depth / 2 + 0.1],
    hidden: NO_SHAFT,
  },
  {
    id: "shaft",
    label: "In the shaft",
    hint: "the clearance the car size and the shaft tier produce together",
    camera: (car, shaft) => {
      const width = shaft?.width ?? car.width;
      const depth = shaft?.depth ?? car.depth;
      return [-(width * 1.4 + 1.6), car.height * 1.5, depth * 1.5 + 2.6];
    },
    target: (car) => [0, car.height * 0.3, 0],
    hidden: ["wall-left", "ceiling"],
  },
];

export const DEFAULT_VIEWPOINT = VIEWPOINTS[0];
