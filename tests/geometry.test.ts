// docs/specs/visual-configuration/design.md, docs/specs/offline-checks/design.md
import { describe, expect, it } from "vitest";

import {
  GEOMETRY_VARIABLES,
  LEAF,
  WALL,
  carGeometry,
  doorLeaves,
  shaftGeometry,
} from "@/components/config-canvas/render/geometry";
import { productModel, variablesByName } from "@/lib/configurator";
import { agreement, candidate, chose } from "./agreement";

const A_CAR = {
  car_size: "c1100x1400",
  car_height: "ch2200",
  door_width: "d800",
  door_type: "telescopic_2",
};

const A_SHAFT = { shaft: "t1_1800x1700", pit_depth: "p1100" };

describe("the car", () => {
  it("reads the millimetre codes as metres", () => {
    const car = carGeometry(agreement({ choices: chose(A_CAR) }))!;
    expect(car).toMatchObject({
      width: 1.1,
      depth: 1.4,
      height: 2.2,
      doorWidth: 0.8,
      doorType: "telescopic_2",
    });
  });

  it("is drawn from a proposed value as readily as from a chosen one", () => {
    const proposed = agreement({ candidate: candidate(A_CAR, 900) });
    expect(carGeometry(proposed)).toEqual(
      carGeometry(agreement({ choices: chose(A_CAR) })),
    );
  });

  it("derives the door height from the cabin rather than asking for it", () => {
    const under = carGeometry(
      agreement({ choices: chose({ ...A_CAR, car_height: "ch2200" }) }),
    )!;
    const tallest = carGeometry(
      agreement({ choices: chose({ ...A_CAR, car_height: "ch2400" }) }),
    )!;
    expect(under.doorHeight).toBe(2.0);
    expect(tallest.doorHeight).toBe(2.1);
  });

  it("is null, never a default cabin, while any of its terms is open", () => {
    expect(carGeometry(agreement())).toBeNull();
    for (const variable of GEOMETRY_VARIABLES) {
      const partial = { ...A_CAR };
      delete (partial as Record<string, string>)[variable];
      expect(carGeometry(agreement({ choices: chose(partial) }))).toBeNull();
    }
  });

  it("is null on a code the parser does not recognise", () => {
    const renamed = agreement({
      choices: chose({ ...A_CAR, car_size: "eleven-hundred by fourteen" }),
    });
    expect(carGeometry(renamed)).toBeNull();
  });
});

describe("the shaft", () => {
  it("reads its own codes, ignoring the type prefix", () => {
    const shaft = shaftGeometry(agreement({ choices: chose(A_SHAFT) }))!;
    expect(shaft).toEqual({ width: 1.8, depth: 1.7, pit: 1.1 });
  });

  it("needs both its size and its pit", () => {
    expect(shaftGeometry(agreement({ choices: chose({ shaft: "t1_1800x1700" }) })))
      .toBeNull();
    expect(shaftGeometry(agreement({ choices: chose({ pit_depth: "p1100" }) })))
      .toBeNull();
  });

  it("encloses the car it is drawn around", () => {
    const config = agreement({ choices: chose({ ...A_CAR, ...A_SHAFT }) });
    const car = carGeometry(config)!;
    const shaft = shaftGeometry(config)!;
    expect(shaft.width).toBeGreaterThan(car.width + 2 * WALL);
    expect(shaft.depth).toBeGreaterThan(car.depth);
  });
});

describe("the door panels", () => {
  const car = (doorType: string) =>
    carGeometry(agreement({ choices: chose({ ...A_CAR, door_type: doorType }) }))!;

  it("gives each door type its own panel count", () => {
    expect(doorLeaves(car("telescopic_2"))).toHaveLength(2);
    expect(doorLeaves(car("center_2"))).toHaveLength(2);
    expect(doorLeaves(car("center_4"))).toHaveLength(4);
  });

  it("clears the whole opening whatever the type", () => {
    for (const doorType of ["telescopic_2", "center_2", "center_4"]) {
      const geometry = car(doorType);
      const total = doorLeaves(geometry).reduce((sum, l) => sum + l.width, 0);
      expect(total).toBeCloseTo(geometry.doorWidth, 6);
    }
  });

  it("parks a telescopic pair to one side and a centre pair to both", () => {
    expect(doorLeaves(car("telescopic_2")).every((l) => l.x < 0)).toBe(true);

    const centre = doorLeaves(car("center_2"));
    expect(centre.some((l) => l.x < 0) && centre.some((l) => l.x > 0)).toBe(true);
  });

  it("stands the fast panel of a nesting pair in front of the slow one", () => {
    const [fast, slow] = doorLeaves(car("telescopic_2"));
    expect(fast.width).toBeGreaterThan(slow.width);
    expect(fast.offset).toBeGreaterThan(slow.offset);
    expect(fast.offset).toBeGreaterThan(LEAF);
  });

  it("parks every panel clear of the opening", () => {
    for (const doorType of ["telescopic_2", "center_2", "center_4"]) {
      const geometry = car(doorType);
      for (const leaf of doorLeaves(geometry)) {
        expect(Math.abs(leaf.x) - leaf.width / 2).toBeGreaterThanOrEqual(
          geometry.doorWidth / 2 - 1e-9,
        );
      }
    }
  });
});

describe("the codes the parser depends on", () => {
  it("names only variables the model has", () => {
    for (const variable of [...GEOMETRY_VARIABLES, "shaft", "pit_depth"]) {
      expect(variablesByName.has(variable)).toBe(true);
    }
  });

  it("still parses every code the model has, so a rename cannot empty the scene", () => {
    const codesOf = (name: string) =>
      productModel.variables.find((v) => v.name === name)!.options.map((o) => o.value);

    for (const car_size of codesOf("car_size")) {
      for (const car_height of codesOf("car_height")) {
        for (const door_width of codesOf("door_width")) {
          for (const door_type of codesOf("door_type")) {
            const geometry = carGeometry(
              agreement({
                choices: chose({ car_size, car_height, door_width, door_type }),
              }),
            );
            expect(geometry, `${car_size}/${car_height}/${door_width}/${door_type}`)
              .not.toBeNull();
            expect(doorLeaves(geometry!).length).toBeGreaterThan(0);
          }
        }
      }
    }

    for (const shaft of codesOf("shaft")) {
      for (const pit_depth of codesOf("pit_depth")) {
        expect(
          shaftGeometry(agreement({ choices: chose({ shaft, pit_depth }) })),
          `${shaft}/${pit_depth}`,
        ).not.toBeNull();
      }
    }
  });

  it("reads each code as the millimetres its label states", () => {
    // The label is the customer's figure and the code is the car's: a code that
    // stopped agreeing with its label would draw a car the sheet does not
    // describe.
    const car = carGeometry(agreement({ choices: chose(A_CAR) }))!;
    const label = variablesByName
      .get("car_size")!
      .options.find((o) => o.value === "c1100x1400")!.label;
    expect(label).toContain("1100");
    expect(label).toContain("1400");
    expect(car.width * 1000).toBe(1100);
    expect(car.depth * 1000).toBe(1400);
  });
});
