/**
 * The scene as a parts list, each part naming the variable it depicts
 * (docs/specs/visual-configuration design decision 3).
 *
 * Read-only this only selects a material and decides what a viewpoint hides.
 * It is also the designed-for seam: a hit test returns a part, a part names a
 * variable, and `OptionEditor` already takes a variable and the document view.
 * One field per part now; the scene otherwise.
 */

export interface PartSpec {
  id: string;
  label: string;
  /** the variables of the agreement this part stands for */
  variables: string[];
}

export const PARTS: PartSpec[] = [
  { id: "car-shell", label: "Car shell", variables: ["car_size", "car_height"] },
  { id: "ceiling", label: "Car ceiling", variables: ["car_height"] },
  { id: "floor", label: "Car floor", variables: ["floor"] },
  { id: "wall-rear", label: "Rear wall", variables: ["wall_finish"] },
  { id: "wall-left", label: "Left wall", variables: ["wall_finish"] },
  { id: "wall-right", label: "Right wall", variables: ["wall_finish"] },
  {
    id: "wall-front",
    label: "Car front and opening",
    variables: ["car_size", "door_width", "door_type"],
  },
  { id: "mirror", label: "Mirror", variables: ["mirror"] },
  { id: "handrail", label: "Handrail", variables: ["handrail"] },
  { id: "cop", label: "Car operating panel", variables: ["cop"] },
  {
    id: "door-leaves",
    label: "Door panels",
    variables: ["door_type", "door_width", "door_finish"],
  },
  { id: "shaft", label: "Shaft", variables: ["shaft"] },
  { id: "pit", label: "Pit", variables: ["pit_depth"] },
];

export const partsById = new Map(PARTS.map((p) => [p.id, p]));
