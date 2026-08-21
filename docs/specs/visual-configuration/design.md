# Visual configuration — design

Implemented 2026-08-19 against [requirements.md](requirements.md).

## Decision 1: three.js through react-three-fiber, and nothing else new

The dependencies are `three` 0.185, `@react-three/fiber` 9.7 — the release that pairs with React 19, and the repo is on 19.2 — and `@react-three/drei` 10.7 for the half-dozen helpers this needs: orbit controls, an environment map, contact shadows, a reflective material and texture loading. `next.config.ts` gains `transpilePackages: ["three"]`, which the three.js add-ons ship untranspiled and require.

The viewer is reached through `next/dynamic` with `ssr: false`, which does two jobs at once: a WebGL surface can't render on the server, and the three.js chunk stays out of the page a workspace opens on, so a canvas showing the document costs nothing to download either.

Raw three.js was the alternative. It is rejected because the scene is a function of the configuration, and R3F is the declarative form of exactly that: parts appear and materials change by re-rendering with new props, which is how every other surface in this repo already treats agent state. An imperative scene would need its own diffing against a state that isn't ours to own.

## Decision 2: the mode is classes over one tree, and the render is never an ancestor of the document

Placement and its argument are settled in [requirements.md](requirements.md); this is how it is built. The canvas holds both surfaces in one unchanging tree, and the mode is a set of classes, exactly as the chat's four geometries are and for the same reason: re-parenting either surface would reset its scroll. The mode control sits at the canvas head beside the draft switcher, and the schedules layer carries the second way in. The render renders nothing until its own mount effect has run, which is necessary for a client-only WebGL surface and follows the draft switcher's established precedent.

Two things settle how the document is put away while the render is up, and neither is `display: none`. An acceptance criterion demands the document's scroll survive the round trip, and a node with no layout box has no scroll offset to keep — the same argument `workspace-split.tsx` already makes for the hidden chat. So the document stays laid out, with `opacity-0 pointer-events-none` and `inert`, and the render covers the canvas panel absolutely. The panel gains `relative` for that, which is a class on an element that already exists rather than a new node, and `ConfigCanvas` returns a fragment, so the document keeps its exact position in the tree and the render is appended after it.

The mode control at the canvas head is one plain `Button` that enters the render, and the way back is the render's own chrome, which is what keeps it one node and what keeps a Radix primitive out of the hydrated tree. The render couldn't leave the way back to the head anyway, because it covers the head. A second entry point sits at the top of the schedules layer, routed through `DocumentView` like every other layer callback.

Three placements are rejected. A band at the head of the document inverts the layering, for the requirements' reason. Radix `Tabs` mints React ids in a tree that forbids them, so the mode control is built the way the chat's already is. And a nested `ResizablePanelGroup` around the document is the tempting mistake: the outer group in `workspace-split.tsx` proves a panel group can live in the hydrated tree, but it doesn't license wrapping the document's subtree in a new one, which moves every id-minting descendant's tree position. That is the shape the `LayerHeading` factoring already broke hydration with, and it would be its third instance.

## Decision 3: the scene is a parts list, each part naming its variable

One module exports the parts as data: an id, the geometry it contributes, and the `variable` it depicts. Read-only, this only selects a material, and it is the whole of the requirements' designed-for seam: a hit test returns a part, a part names a variable, and `OptionEditor` already takes a variable and the document view.

Model millimetres divide by 1000 into scene metres. The car's floor plane sits at the origin, centred in width and depth, with the entrance on the front face. Walls are thin boxes rather than planes, so the cutaway view has an edge to read.

| Part | Variable |
|---|---|
| floor | `floor` |
| rear wall, side walls | `wall_finish` |
| mirror panel on the rear wall, half or full height | `mirror` |
| handrail, on the rear wall or on three | `handrail` |
| operating panel beside the entrance | `cop` |
| door leaves | `door_finish` |
| the opening and its leaf count | `door_type`, `door_width` |
| the box itself | `car_size`, `car_height` |

## Decision 4: three door variants from two variables

Leaf count and travel direction come from `door_type`, and leaf widths from `door_width`. Side-opening telescopic draws two leaves of unequal width nesting to one side, centre-opening draws two half-width leaves parting at the centre, and the four-panel variant draws two nesting pairs. Doors render open, so the interior reads from outside and the three types are distinguishable at a glance, which is the criterion. Animating between states is out of scope, and nothing here depends on it.

## Decision 5: materials carry the finishes; textures only where the surface is its texture

Painted steel, laminate, brushed stainless, PVC and the door finishes are `meshStandardMaterial` with colour, roughness and metalness, under an environment map that is what makes brushed steel read as brushed steel. Studded rubber and granite composite get a real CC0 texture each at 1K, converted to WebP, because their identity is the pattern. The panoramic glass back wall is a transmissive material and the mirror is drei's reflective material; those two do most of the visual work in the cabin and are worth the render cost.

Six 2K PBR sets in `public/` was the alternative, and it is rejected on weight for a prototype: several megabytes to make four flat surfaces marginally flatter.

What shipped, in `public/render/`: `floor-granite.webp` is ambientCG's CC0 Terrazzo003 colour map at 1K, which is what a granite-composite lift floor actually looks like — the polyhaven granite tiles are a decorative pattern and its terrazzo is brown. `floor-rubber.webp` is *drawn* rather than photographed, and that is a deviation from this decision: no CC0 studded rubber exists in either library, and the rubber floors that do are flat granulate, which is the one thing that wouldn't distinguish this floor from PVC. A studded floor is a regular grid of discs, so it is exactly describable: a 512 px tile drawn by `scripts/make-rubber-texture.py`, seamless at a 40 mm stud pitch, 5 kB. The argument that a texture is needed here is the pattern, and a drawn pattern serves it better than a photograph of the wrong thing.

## Decision 6: lighting is one self-hosted environment map plus contact shadows

A 1K CC0 HDRI sits in `public/render/` — polyhaven's `brown_photostudio_02`, 1.6 MB — loaded by path, never through drei's `Environment preset=`, which fetches from a CDN this repo shouldn't depend on at runtime. `background` stays false, because a backdrop would put the car somewhere and the agreement doesn't say where it is. Contact shadows under the car ground it, and the ceiling gets an emissive panel so the cabin has its own light source. Fidelity for a box comes from here rather than from geometry.

## Decision 7: viewpoints are data over one scene graph

A viewpoint is `{ id, label, hint, camera, target, parts hidden }`, where camera and target are functions of the car, because an 1100 mm cabin and a 2100 mm one can't be framed from the same distance. Three are defined, and the outside one is the default. Switching is a `ToggleGroup`, which is safe here because it lives inside the render subtree, and that subtree only mounts on a click. Adding a fourth is a row in the list.

Two of the three moved during the build, and both moves are the same correction: a viewpoint has to be aimed at something the agreement states.

- *Outside* hides the near side wall and the ceiling, and keeps the car front. The first design also hid the front, which can't be right: the front is what states the opening the door width names, and without it the door type is legible only from the panels standing beside a hole in nothing.
- *Inside* stands at the doorway looking back at the rear wall, rather than at the back looking out. A camera facing the open doors is pointed at the one part of the scene that is empty, which is what the first attempt drew. The operating panel is beside the entrance and so behind this camera, and it reads from the outside viewpoint instead, through the wall that one cuts away, and legibly, which is the criterion it has to meet.
- *In the shaft* draws four shaft walls and the pit floor, open at top and bottom, and is disabled when the agreement hasn't settled a shaft or a pit. A closed box would need a shaft ceiling, and nothing in the model says where one is. The pit is drawn because `pit_depth` is a stated millimetre value, and a shaft with no bottom reads as a bug.

## Decision 8: `car_height` is a variable, and three enumerated assignments go stale with it

It joins the `dimensions` group after `car_size`, coded `ch2100`, `ch2200` and `ch2400` — a prefix that can't be mistaken for headroom's `h3400`, and parseable by the same shape the viewer reads `car_size` and `door_width` with. The 2100 mm cabin carries −25 kg CO₂e and no price, and the 2400 mm one carries +70 kg and €1,400. The 2200 baseline carries no price and no footprint delta, as baseline pit depth and headroom already do, because the validator holds the reference configuration's embodied carbon to a band around the EPD anchor and a non-zero baseline would move it. Door height derives from car height in the viewer — 2000 mm under the two lower cabins, 2100 under the tallest — rather than becoming a second term the customer has to decide.

One new rule, R54, says a 2400 mm cabin requires at least 3800 mm of headroom, which is the honest threshold once car top structure, refuge space and overtravel are allowed for. Its bite is a two-rule one: choosing the tallest cabin on an agreement pinned to 3400 mm raises the headroom, and cabin height stops being a cosmetic choice and becomes a claim on the shaft. Enumerated against the model, it creates no *new* infeasibility in the speed-and-modernization space, because the only conflict there, a 3.0 m/s retrofit, already follows from the speed rule and the modernization ceiling without any cabin height at all. Stating the ripple larger than that would be a claim the model doesn't support, and choosing a harsher threshold to make it larger would be inventing engineering to justify a variable.

Three full assignments in Python enumerate every variable and have to gain the new one in the same change, or the suite fails: the validator's calibration reference, which checks completeness explicitly, and two test fixtures, one of which asserts set equality against the model's variables. A grep for another variable's name across the Python and TypeScript sources confirmed there is no fourth.

## Decision 9: nothing renders when nothing is being looked at

`frameloop="demand"` means frames are drawn on prop changes and while orbiting rather than continuously, and the `<Canvas>` mounts with the render mode rather than idling behind the document. A workspace that is never switched into the render pays for no WebGL context at all, which was checked in the app by counting `canvas` elements while the document shows. The viewer receives the configuration as props from `ConfigCanvas`, which already holds it, so it adds no subscription to agent state and re-renders only when the values it draws change. The `<Canvas>` is created with `preserveDrawingBuffer`, without which the still-image export the requirements leave out of scope couldn't be added later at all.

Demand mode doesn't draw on its own, and this cost the first build its picture: the panel stayed black. The scene asks for frames itself, from an effect that runs on every commit inside the canvas. A commit is exactly the signal, because it means either the configuration changed or a suspended loader has resolved and there is finally something to show. It asks for five frames rather than one, because the mirror's reflection and the contact shadows are built during rendering and don't settle in a single pass.

The environment map and the floor textures take a few seconds to fetch and decode on the first entry, during which a suspended scene renders nothing. A black panel says nothing, so the scene reports when it has mounted — which, being inside the Suspense boundary, it can't do until the loaders have resolved — and the viewer shows a line until then. The cost is the 1.6 MB HDRI, and a smaller one is the obvious lever if it ever matters.

## Alternatives considered

- *A downloaded 3D model.* Argued and rejected in the requirements: a static mesh can't move with the configuration, and the box needs no mesh.
- *An SVG plan and section instead of 3D.* Cheaper and honest, and it is what a real tender annexes, but it isn't what was asked for. The plan survives as a possible fourth viewpoint, drawn from the same values, and the section stays out for the requirements' reason.
- *One shared WebGL context with drei's `View` for several live viewports.* The right answer if renders ever appear in many places at once, and unnecessary for one panel. It is the alternative to revisit if the chat-card case in the requirements' exclusions is ever built, alongside the still-image approach recommended there.
- *drei's `Html` for the future in-render editor.* Rejected in advance, because it places DOM inside the canvas subtree, where a Radix primitive would mint ids in the hydrated tree. An absolutely positioned overlay outside the canvas is the way in.

## Verification

`uv run python src/product_model/validate.py` and `uv run pytest`, at 148 passing, are green with `car_height` and R54 in the model, and the solver was queried directly to confirm the rule's shape: `ch2400` with `h3400` is UNSAT and the explanation names R54, `ch2400` stays reachable, and a modernization still admits it at 3800 or 4200 mm.

Everything else was verified by running the app (constitution #9), against a 1000 kg, 1.6 m/s office lift.

- Each of the three door types is distinguishable from the outside viewpoint: two panels nesting to one side, two parting at the centre, two nesting pairs.
- Each cabin variable is legible in at least one viewpoint. Drawn and read back over the session: three wall finishes — brushed stainless, laminate, and the panoramic wall, which renders as glass you can see the far side through — two floors, where the studs of the rubber one and the aggregate of the granite one both tell at cabin scale; two door finishes, painted steel and framed glass, the second translucent rather than black, which was the material most at risk; the mirror at both its stated heights; the handrail on one wall and on three; and all three operating panels, through the wall the outside viewpoint cuts away, and again from inside.
- Orbit and zoom both move the camera, so demand mode isn't starving the controls of frames.
- The render follows the agreement. A revision that dropped the priced candidate left the car undescribed, and the viewer fell back to the empty state naming exactly the value it was missing rather than drawing a default cabin. An undo was followed likewise, and disabled the shaft viewpoint with it, because the restored agreement no longer states a shaft.
- The canvas opens on the document, the render is reached by either entry point and left by one click, the document's scroll is exactly where it was left, and no `canvas` element exists at all while the document shows.
- No hydration mismatch on reload. One appeared on a first load after an edit and was clean on the next load with the same code, which is the dev server's own inconsistency and is documented in CLAUDE.md. It was reproduced with this change reverted, so it isn't this change's.

## Known gaps

- The first entry into the render waits a few seconds on the environment map, behind a loading line. Subsequent entries are immediate.
- The camera re-frames only when the viewpoint changes, never when the car's dimensions do. That is deliberate, because a finish change must not throw away an angle the operator orbited to, but it means a car that grows a great deal while being looked at can end up badly framed until the viewpoint is re-picked.
- The document lays the optimistic `pending` overlay over its values while a run is in flight, and the render reads the resolved value only. So a click on the sheet shows there a moment before it shows in the picture. That is defensible as it stands, because the render draws what the agreement says rather than what has just been clicked, but it is a real difference from the criterion's "the same live values the document draws from", and it should be either closed or written into the criterion.
- The `car-shell` part is drawn as the base slab only. It names `car_size` and `car_height` as the design's table requires, but a hit test on the box as such would land on a wall.
