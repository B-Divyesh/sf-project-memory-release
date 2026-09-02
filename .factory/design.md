# Visual thesis: handwritten lab notebook

Project Memory Release treats approved project knowledge like a careful lab record: dated, attributable, reviewed, and easy to reproduce. The interface resembles a working engineering notebook rather than a generic dashboard. Ruled paper, clipped release sheets, ink annotations, and revision stamps make provenance visible without turning the product into a metaphor.

## Palette

- `paper` `#F4EEDC`: warm recycled notebook stock.
- `paper-raised` `#FFFDF5`: fresh pages and form surfaces.
- `ink` `#20241F`: nearly black drafting ink; primary text.
- `ink-muted` `#596057`: pencil note text.
- `rule` `#A8B7AD`: desaturated green-grey notebook lines.
- `blueprint` `#164C63`: primary controls and links.
- `blueprint-dark` `#0B3345`: hover and dark surfaces.
- `vermilion` `#A63C2D`: review marks, stale citations, and destructive actions.
- `moss` `#386641`: approved and current states.
- `amber` `#815500`: warnings.

All text/background pairs are designed for WCAG AA contrast. Status uses words and shapes as well as color. This is an explicitly light, paper-based direction; dark treatment is reserved for the ink-blue release preview, where contrast is still AA.

## Type

- Display and annotations: `Caveat`, self-hosted WOFF2, 600. Its uneven handwritten rhythm is used sparingly for the wordmark, section numbers, and short notes.
- Interface and reading: `Atkinson Hyperlegible`, self-hosted WOFF2, 400/700. It keeps dense source records readable and distinguishes similar glyphs.
- Compiled context uses the system monospace stack so copied output matches its destination.

The scale is 16, 18, 22, 32, and 52 CSS pixels. Body line height is 1.55 and reading measure stays below 70 characters.

## Spacing and shape

An 8-pixel base grid uses 8, 16, 24, 32, 48, 64, and 96 pixel steps. Pages have a red vertical margin and 24-pixel horizontal rules. Borders are 1–2 pixel ink strokes. Corners alternate between 2 and 10 pixels, like stacked paper rather than generic rounded cards. Buttons and inputs are at least 44 pixels high.

## Layout and interaction grammar

The landing page is asymmetric: plain first-screen copy occupies the left notebook page and an original release-sheet still life occupies the right. In the workspace, a narrow source ledger sits beside a wide compiled release page. On phones, the ledger becomes the first section and the release follows it. Selection uses checked margin boxes. Review state is shown with a visible proofing mark and a written label.

Every action reports its result in a polite live region. Route changes focus the new heading. Destructive actions name the item and require confirmation. The demo banner remains visible and offers reset or exit actions.

## Motion

The signature motion is a single page-settle transition: new release sheets move upward 8 pixels while fading in over 220 ms. Buttons depress by 1 pixel. Nothing loops. With `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and state changes are instant.

## Original assets and provenance

Hero art prompt: a top-down editorial still life of a software architect's handwritten lab notebook. It contains ruled cream paper, clipped index cards, tidy dependency arrows, a red revision pencil, small brass binder clips, and a dark teal desk. The composition leaves calm negative space and avoids readable text. Materials are tactile paper, graphite, ink, and worn metal. Light is soft northern-window light. Palette words: warm paper, drafting ink, blueprint teal, muted vermilion, moss. No people, hands, screens, brands, logos, watermarks, or legible text.

The hero image is generated for this product on 2026-09-02 with the Factory image deployment through `/opt/fleet/lib/gen-image.sh`. The source PNG and prompt sidecar live in `assets/src/`; optimized WebP and social derivatives live in `frontend/public/`. Generated imagery is original and disclosed in the footer.

Hand-authored assets: the folded-page favicon and status marks are original SVG/CSS shapes created for this repository under the MIT license.

## Responsive decisions

At 390 pixels, navigation becomes two short links, illustration detail is cropped rather than scaled too small, source/release columns stack, tables become labelled blocks, and sticky desktop controls return to document flow. No task is removed.
