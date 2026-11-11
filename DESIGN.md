# Color-Play · Visual system v12

## Direction
Retail color guidance presented as a clear, contemporary academic dossier. Preserve fuchsia, the fashion-store imagery, Simple Tech attribution, the supplied Color logo and evidence-led voice. This is a refinement of the existing editorial world, not a new brand.

The subject-specific signature is the garment comparison image and its color swatches. The HTML background extends that palette into slow curved color bands behind opaque paper-like sections. It replaces the earlier navy ASCII frame; it never passes over copy. Do not introduce remote video, generic glow effects or repeated slide entrance choreography.

## Surface and information architecture
- Mode: Read with a presentation path; comprehension before visual spectacle.
- HTML: 20 main slides + six appendices, 26 sections total.
- Slide 2: a numbered eight-deliverable rubric index with direct links.
- D1 WHO; D2 competition; D3 positioning; D4 channel; D5 customer analysis; D6 business plan; D7 BBBB; D8 one-page plan plus assumption log.
- Integration supports channel/customer analysis; it is not a numbered deliverable.
- D6 economics, options and recommendation are adjacent; D7 follows, then D8.
- D8 comprises one plan page and two readable log pages, covering six risks. The embedded CSV download is a reusable blank template, not fabricated test results.
- PDF: 26 current pages, nine regenerated rationale pages, 22 unchanged historical source/feedback pages, 57 total.

## Tokens
| Role | Value |
|---|---|
| Primary ink | #201B27 |
| Secondary text | #625B6B |
| Fuchsia text/accent | #B80A6B |
| Pale fuchsia | #FCECF5 |
| White reading surface | #FFFFFF |
| Soft supporting field | #F5F2F7 |
| Background base | #EEE7EF |
| Moving palette bands | #D5B8D7 / #D999BE / #BDA9CE / #E5BED1 |
| Structural rule | #DDD7E3 |
| Observed / assumed | #244E91 / #81530E, always labeled [O] / [A] |

Dark fields emphasize a decision, not a second theme. Maintain a light reading appearance for classroom projection and printing. Motion colors do not carry evidence status.

## Type and layout
Embedded OFL-licensed Manrope headings; platform sans-serif body. No network fonts.
- Cover heading up to 76px; slide headings approximately 32–49px.
- Main text 16–20px; compact plan/log text 14–15px.
- Auxiliary credits and metadata use a 12px screen floor after the rubric refinement.
- Tabular numerals for economics, page counts and scores.
- Desktop: centered paper surfaces, 48px outer animated gutters, 48px inner margins; up to 1536px reading width. Quiet offset shadow, 16px corner radius.
- Mobile: 10px background gutters, 18px inner margins; natural vertical growth. Open columns stack. Wide tables scroll inside their region rather than overflowing the page.
- Break long words only when necessary; grid children have a zero minimum width to support 200% text sizing.
- Print: 1536 × 864 CSS-pixel canvas, 16 × 9 inch paper; no background animation, margins between slides, shadows, toolbar or downloadable controls.
- One-page plan is eight open content cells plus one decision strip, not repeated nested cards.

## Branding
Supplied Color logo (74 × 30px bounding box) then existing Simple Tech mark (maximum 55 × 30px), separated by 12px. No typographic Color—Play wordmark in headers. At 600px and below, show only Color at 62 × 25px. New sections use the same embedded logo initialization as existing ones. PDF rationales also use the supplied Color logo.

## Motion thesis and budget
- Authored material: slow garment-palette bands flowing along the viewport edges behind the reading surface.
- Continuity: stable background while the reader navigates between opaque sections; no entrance delay or text reveal.
- Feedback: existing navigation, focus states and play/pause state; links have a short directional arrow response.
- Budget: one Canvas, eight curved strokes, maximum 20fps, device-pixel ratio capped at 1.5; no new library, network access or video.
- Pause freezes the composition and persists in optional localStorage. Reduced motion uses a static composition and disables autoplay. Hidden tabs and print cancel the rendering loop.
- Canonical runtime: `work/palette-background.js`, embedded in final HTML. Refinements: `work/rubric-refinement.css`, also embedded.

## Academic and source discipline
Apparel Merchandising / Buying is the proposed buyer; Makeup / Beauty is the potential champion, not a confirmed budget owner. Apparel first; no makeup accuracy or cross-category demand claim. Survey findings are existing self-report [O]. Role definitions, prototypes, prices, thresholds, access and viability are assumptions [A]. No customer/commercial item is labeled validated.

First study: no capture, profile storage, CRM, transaction linkage or billing. Failed historical unit economics stay explicit; the first study cannot earn historical profile or commission revenue. Historical attachments retain older assumptions verbatim and are clearly separated from the current plan.

## Verification and narrow exceptions
Playwright checks viewport widths 320/390/780/1024/1536, 200% text at 390px, offline behavior, image loads, anchors, keyboard notes, touch targets, motion states and all 26 print section bounds. Axe reports zero automated A/AA violations; two checks still require human review. Rebuilt PDF preserves historical text and rendered-pixel fingerprints.

Impeccable's single detector pass is recorded in `work/impeccable-rubric-v12.json` before final corrections. Its 11 tiny-text findings prompted the 12px auxiliary floor. The 13 padding findings concern outer table wrappers whose cells already have 12–16px insets and deliberately open, ruled editorial columns; do not double-pad tables or turn open columns into cards. The copy-cadence warning includes explicit negative evidence statements; these preserve necessary academic scope, not marketing rebuttals. No claim of a clean final detector rerun is made.
