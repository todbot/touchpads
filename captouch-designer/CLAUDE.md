# Captouch Slider Designer

Browser tool for designing interdigitated (spatially interpolated, "ratiometric") self-capacitance touch sensors: linear sliders, arc sliders and wheels. It previews the copper, simulates a finger sweep to estimate linearity, and exports an SVG plus a KiCad footprint.

## Layout

```
index.html                 the whole app: one self-contained file, no build step
tests/geometry-check.mjs   Node regression check for the geometry engine
```

There is no bundler, framework or package.json. Keep it that way unless asked: the single file runs from disk, from GitHub Pages, and as a claude.ai artifact. The only external resource is Google Fonts, with system-font fallbacks.

Inside the HTML, in order:

1. `<style>`: color tokens at the top of `:root`, then light/dark overrides (see Theming).
2. Markup: header with sensor type switch, control rail (`<aside>`), board preview, export panel, sweep chart, checks.
3. `<script id="geo">`: the geometry engine. **Pure and DOM-free.** `tests/geometry-check.mjs` extracts and evals this block by its id, so keep the id, keep it free of DOM/`window` access, and keep `build` a top-level function.
4. Second `<script>`: UI, raster simulation, chart, design checks, exporters, save/copy, finger interaction. Wrapped in an IIFE.

The code carries explanatory comments; read those before changing a function.

## Commands

```
node tests/geometry-check.mjs      # must print "all N cases passed"
```

Run it after any change to the geo script. Add a case to its `cases` list when you add a geometry parameter or fix a geometry bug. For UI changes, open `index.html` in a browser (Playwright/Chromium works headlessly if available).

## Core concepts

- **Strip space (u, v):** u runs along the travel, v across the width (0..W). For linear sliders u is mm; for arcs and wheels u is degrees of travel and v is mm above the inner radius. `map(u, v)` converts to board space.
- **Board space (x, y):** millimetres, y points down (SVG and KiCad convention). Origin is the slider center, or the arc/wheel center. Angles are measured from 12 o'clock, clockwise positive.
- `uScale` = mm per u unit along the finger path (mid radius); use it whenever an angular quantity has to be shown or checked in mm.
- A sensor is a strip cut by zigzag boundaries. Each boundary is offset by +c/2 and -c/2 (`offsetPL`, miter joins) to form the two neighbouring electrode edges, so the copper gap equals the clearance exactly.
- **End styles:** `split` puts one channel at both ends as half-width regions (Atmel splits the highest channel, TI uses CH0); `separate` gives each channel one region. Wheels wrap 360 degrees.
- **Tip width** is the finished copper width after clearance; `build()` compensates the boundary's tip flat for the offset.
- **Finger sweep:** channels are filled into an offscreen canvas with per-channel codes, then a disk is swept along the centreline. Signal = copper area under the disk. Position comes from `estimate()`: vector sum for wheels and split sliders, centroid otherwise. This is a geometric model, not a field solver; it ranks designs, it does not predict absolute counts.

## Invariants (don't break these)

- Electrode polygons never self-intersect and never come closer than the clearance (the test checks both).
- The KiCad footprint uses the KiCad 7 s-expression format (`version 20221018`). Pad number = channel + 1. Both halves of a split channel get the same pad number so they land on one net. Covered mask = `F.Cu` only; exposed adds `F.Mask`.
- SVG export: width/height in `mm`, viewBox in mm, one `<g id="CHn">` per channel, polygons only (no arcs or curves), so KiCad's importer keeps real size at scale 1.0.
- Keys in `DEF` are persisted to `localStorage` (key `captouch-designer`) and written as JSON into the SVG header comment. Renaming a key silently drops users' saved settings; add new keys with defaults instead.
- Form controls get stable ids (`f-<key>`, `r-<key>`, `seg-<key>-<value>`).

## Adding a parameter

1. Add a default to `DEF`.
2. Add an entry to `FIELDS` (numeric) or a `makeSeg` call (choice). The `g` group controls when it shows (`syncVis`).
3. Use `p.<key>` in `build()`; return any derived value the UI needs on the geometry object.
4. Add a design check in `drawChecks()` if the docs give a range for it.
5. Add a test case to `tests/geometry-check.mjs`.

## Running as a claude.ai artifact

The page is also published as a claude.ai artifact. That sandbox imposes rules the code already follows; keep them:

- File saves go through the `downloads` runtime capability (`window.claude.use('downloads')`), which only allows certain extensions. `.svg` and `.zip` are allowed but `.kicad_mod` is not, which is why the footprint ships inside a zip as `CapTouch.pretty/<name>.kicad_mod`. Outside claude.ai `window.claude` is absent and `offer()` falls back to a normal `<a download>` link.
- No `alert`/`confirm`/`prompt`/`window.print`. Clipboard writes happen inside the click handler, with a textarea fallback.
- External scripts only from cdnjs/jsdelivr/unpkg; stylesheets only from Google Fonts.
- Every color is a CSS token defined on bare `:root` (light), redefined under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]`. The board preview is deliberately dark soldermask green in both themes.
- The layout must work at about 400px wide with no horizontal page scroll; on narrow screens the control rail moves below the preview.

## Design rules used by the checks

Thresholds in `drawChecks()` come from these documents:

- **TI SLAA891B**, *Automating Capacitive Touch Sensor PCB Design Using OpenSCAD Scripts*: slider/wheel element and tine model; 3 to 4 elements typical; clearance around 0.25 mm.
- **Atmel AT02259**, *QTouch Schematic and Layout Checklist*: clearance 0.1 to 0.5 mm; split the highest channel at the slider ends; small slider width 5 to 15 mm; no ground or switching traces under sliders and wheels; hatched ground under 40% copper if shielding is needed; sense lines under 150 mm and 0.1 to 0.5 mm wide; route the end-joining trace away from the slider.
- **AT42QT2120 datasheet**: 3-channel slider/wheel on keys 0 to 2; slider typically 50 to 100 mm long and 12 mm wide; wheel typically 30 to 50 mm diameter, up to 80 mm; overlay up to about 3 mm plastic or 4 mm glass.

## Known gaps / ideas

- The KiCad footprint and SVG import have not yet been round-tripped in KiCad; verify on the first real board.
- Not implemented: multi-ring wheels, QMatrix (mutual-cap X/Y) patterns, TI-style diamond touchpads, curved-tine variants with alternating boundary phase, and a separate per-channel SVG export.
- A command-line generator could reuse the geo script the same way the test does.
