# Render assets

Everything the visual configurator loads at runtime
(docs/specs/visual-configuration). All self-hosted: the render fetches nothing
from a CDN.

| File | What it is | Source |
|---|---|---|
| `studio-1k.hdr` | environment map — what makes brushed steel read as brushed steel | [Poly Haven, `brown_photostudio_02`, 1K](https://polyhaven.com/a/brown_photostudio_02), CC0 |
| `floor-granite.webp` | the granite composite floor | [ambientCG, `Terrazzo003`, 1K colour map](https://ambientcg.com/view?id=Terrazzo003), CC0 |
| `floor-rubber.webp` | the studded rubber floor | drawn by `scripts/make-rubber-texture.py`; see design decision 5 |
