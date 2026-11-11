# Color-Play · Color Studio

## Scope
Operate mode. An independent technical lab that inherits Color-Play's visual world; it does not replace the dossier or the store experience. Main question: what colors does this image contain, and how do they look next to others?

## Direction
Framed sheet: a very pale lavender frame, discreet navigation, and a white sheet with no shadows. Self-hosted Manrope, the supplied logo, and fuchsia #B80A6B. The product's signature is the retail image next to a band of extracted colors, their proportions, and the color comparator. Color occupies the data and the comparison materials, not decorative metrics.

Desktop: 72 px header + 218 px side frame; sheet with a 1 px border and 16 px radius. 32 px interior, two columns with a 32 px gap and a 1.6:1 ratio. Width is split between the image and the color readout; the same borders repeat in the comparison. On tablet the side navigation disappears; on mobile the image, results, and comparison stack, with 18 px margins.

## Evidence discipline
Show the example as a render. Show percentages as pixel proportions, not accuracy. Do not attribute seasons, undertones, sensitive attributes, or appearance judgments. Editorial palettes, not validated clinical or personal recommendations. Explain background, lighting, and white balance in the interface itself.

## Interaction and states
Upload/camera as explicit actions. Recoverable errors for formats, size, corrupt file, and camera without access. Empty state after clearing; copy/export disabled without a sample. Camera stopped on capture/cancel/hide/leave. Arrows and Enter to sample without a mouse, fuchsia focus, aria-live notices, and reduced motion.

## Outfit extension · v0.2

The approved identity is kept. The question expands to "which garments can I wear with these colors, based on my habits?". A visible entry point on the first screen leads to a guided six-question interview. Optional skin/hair/garment samples are always confirmed manually on the user's own image; the initial render does not allow assigning personal references.

The module combines the form in the main column with a side brief that explains the criteria and lets the user generate three looks. Results show technical diagrams of colored garments, piece names, explanation, and compatible swaps. Three columns on wide desktop; horizontal layout on tablet and vertical on mobile. Compact exclusions in two columns; usual questions with native labels, fieldset/legend, and a visible selected state.

References and answers are not a permanent profile. Modifying them invalidates results; changing the photo clears references; clearing the session wipes everything. The looks have no stock/prices and are not presented as a personal color-analysis diagnosis. The catalog is illustrative and the local rules algorithm can be inspected.

Verification of the extension: 16 unit tests in total; browser flow for the interview, references, outfits, swaps, download, invalidation, no-result, and reset. Five widths with no overflow; Axe with no automated violations on the interview and results; zero JavaScript errors and zero external HTTP requests in the tested flow. Simulated camera. One detector pass reported legacy 11 px mobile text and the cadence of negative phrasing: a clean detector is not claimed; the scope and privacy clarifications are deliberately kept.

## Photography and kiosk UI review · v0.3

The extension keeps colors, typography, and layout. Answers are more visual: local photos with an overlaid native selection for styles and garments; thumbnails in exclusions; color swatches for the color preference. In the looks, reference photographs replace the diagrams; a swatch and text indicate the color to look for without pretending the photo has that color or that an in-stock variant exists.

`#ui-review` adds a four-screen tour inside a machine frame: welcome, optional photo, visual interview, and result. Its customer interface has larger type and touch targets; the review controls sit outside the machine. The camera requires consent, stops when its screen is left, and is not shared with the lab's camera. Independent session, explicit restart, and global clearing.

Store results have DEMO references and simulated rack locations. Jumping directly to the result shows an explicit example marker. No inventory, availability, purchase, or salesperson alert is invented. Photo references in `assets/photo-sources.json`; credit visible in the footer. The user's PNG (Simple Tech / UDD MTI) is unaltered, in the machine header and footer.

Screenshots of the options, welcome, desktop result, and mobile interview were reviewed. The existing tests still pass. Additional tests: consent, simulated camera, references, interview, results, and restart; five widths with no overflow; zero failed images/requests; Axe with no automated violations on all four screens. One detector pass flagged auxiliary text of 10–11 px: the new captions were raised to 12 px, without claiming a clean second pass.

## Verification notes
Direction selected with tasteskill (framed-sheet, keeping palette/typography). One Impeccable detector pass found auxiliary sizes of 10–11 px: auxiliary typography was raised to 12 px, with some compact mobile controls at 11 px. A clean second pass is not claimed. Desktop and mobile screenshots were reviewed; the browser script checks overflow at five widths and Axe on the example.
