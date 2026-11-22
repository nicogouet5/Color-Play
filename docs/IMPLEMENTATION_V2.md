# Color-Play × Ripley — implementation v2

## Controlling brief
The user's `ColorPlay_x_Ripley.zip` replaces the older anonymous/drapes-first strategy. Its two original documents are preserved unchanged in docs. The former draft is replaced by a superseded notice. Financial projections and public-source claims are user-supplied strategy inputs, not newly verified research.

## Implemented
1. **RUT-first entry:** first / returning modes, format and Chilean check digit, explicit local-session consent, demo-RUT helper and store-by-store returning-mode gate.
2. **Color test:** separately consented camera or photo upload; real local pixel clustering / color-reference extraction; lighting-quality fallback. Camera stops after capture, cancellation and reset. Pixels are discarded when leaving the color step. Sample test is explicitly labeled; no validated skin-tone analysis is implied.
3. **Taste survey:** usual garments, style, occasion, climate, color comfort, garment and color exclusions, optional size. Invalid / no-compatible recommendation paths are explicit.
4. **Mode1 recommendations:** sample category photos, target colors, floor / aisle / rack and synthetic availability. No claim of actual store stock.
5. **Mode2:** RUT lookup in this tab's volatile mock profile store (or the supplied demo fixture), saved palette, tastes, recent sample purchases, editable/hideable size and unavailable-size fallback. Not restricted to the old Phase3 concept.
6. **Ticket / genuine QR:** campaign CP-ALC-84920 plus random opaque token. QR has no RUT, photo, colors or size. A real print action produces only the ticket. Browser demo, not a thermal-printer driver.
7. **Caja simulation:** known-token validation, explicit purchased-item selection, local one-use receipt and non-additive3/5/8% working tiers. Eligibility, promotional stacking and real monetary redemption are not implemented.
8. **Puntos Go:** separate, optional mock opt-in, unchecked by default. No enrollment or external call.
9. **Merchant loop:** local session → simulated purchase → mock CRM → bought/unbought shortlist and color/size/style preview. Not buying-accuracy proof; no causal rejection reason is inferred.
10. **Privacy:** no persistent storage or data endpoint; outbound connections blocked by CSP. All profile/ticket/event memory clears on finish/reset, reload, hidden tab and3 minutes idle. A per-page salted digest joins the entered RUT to memory-only demo data. A RUT is not authentication.
11. **Brand / strategy:** unchanged recipient Ripley mark, Color-Play and Simple Tech marks, local Manrope, proposed CV kiosk and sell-then-embed framing. Existing renders clearly disclose the older enclosure.
12. **Publication:** build only the current index/privacy/credits pages into dist. GitHub Pages no longer receives the whole repository.

## Cleanup
66 obsolete top-level items/subtrees were removed from the checkout / project work area / Desktop into macOS Trash, including old pitch, Canva/Stitch exports, dossier/standalone copies, previous delivery package, v11 archive, old screenshots and presentation tooling. Reused images/logos were first transferred into the current work/assets tree. .git/history and the supplied ZIP remain intact.

See `CLEANUP_V2.json`. Finder initially could not trash an iCloud-backed item; the staging container was then moved successfully to macOS Trash by same-user filesystem rename. No permanent erasure or history rewrite was performed. No unrelated app or session was closed.

## Verification
- `npm --prefix work test`: TypeScript + production build + Playwright suite PASS.
- Five viewport widths:1440 /1024 /768 /390 /320, no horizontal overflow or broken images.
-14 Axe scans across the split visit chooser, RUT form, image, taste, result, returning, ticket, checkout and Merchant states: zero automated violations detected.
- Real generated QR decoded by Chrome BarcodeDetector to the exact payload.
- One-page A5 ticket PDF; print action called and print-only DOM checked.
- Fake-camera device exercises capture and stopped tracks; local PNG upload/extraction and invalid MIME recovery checked. This is not physical-device calibration testing.
- RUT error/consent guards, no saved profile, unavailable store, zero stock, size hiding, unique tickets, invalid token and duplicate scan,3/5/8 tiers, optional loyalty, Merchant preview, visibility/idle reset, no storage, keyboard tabs,3D controls,200% text at 390px and no-JS fallback checked.
- Zero JavaScript errors, failed requests or external data requests in the local suite.
- Impeccable mechanical detector on changed UI targets: empty finding list.
- Taste inspector1440/768/390:0 FAIL /2 WARN. Warnings concern the retained showcase hero and below-fold showcase sections, not a single-screen Merchant dashboard; the embedded kiosk is the operating UI.
- Current captures and detailed verification remain in work/artifacts/ripley-v2 (ignored). A compact verification record is retained in docs/qa.

## Visual review
Retained retail editorial world / supplied v2 palette and Manrope; no new direction deal or new decorative scene. Live thing: the actual two-mode kiosk, QR and mock checkout loop. Final nine inspector images were opened, plus desktop and mobile interaction captures. Removed inherited tiny tracked uppercase labels, removed the floating kiosk shadow and tightened the hardware-detail spacing.

Conservative internal critique: design 6.5, usability 8, creativity 6.5, content 8; weighted overall7.1/10, not an academic grade or external review. Existing concept imagery is the realism cap; no authentic field footage or installation was fabricated. The combined showcase is still long on a phone and its reference photos do not show exact suggested colors; both limits are disclosed.

## Entry-choice refinement

The kiosk now begins with two equally sized, fully clickable panels: left “Quiero ver qué me podría quedar bien” for a first visit; right “¿Qué hay de nuevo para mí?” for returning shoppers. Both proceed to their existing RUT and consent form. Back returns to the chooser and restores focus. Reset / idle / tab-hide restores the chooser with no identifier field remaining. Desktop/tablet side-by-side and mobile stacked ordering were checked at1440/1024/768/390/320px, with keyboard selection and the complete downstream flow. Four entry screenshots were visually reviewed; the changed-target mechanical detector returned no findings. No retailer integrations or recommendation algorithm changes were added by this refinement.

## Still required for a real service
Retailer / IT / Operations / legal authorization; backend and identity safeguards; real stock/location/POS/CRM contracts; actual loyalty enrollment; an approved controller/retention/rights policy; validated colorimetry and calibration; hardware quotes and printer support; a consented study and traceable iteration. None are implied completed by publishing this prototype.
