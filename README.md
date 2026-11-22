# Color-Play × Ripley

**Color clarity at the rack. Better buys for Ripley.**

[Open the prototype](https://nicogouet5.github.io/Color-Play/) · [Strategy v2](docs/COLOR_PLAY_ALIGNMENT_v2.md) · [Strategy and brand](docs/ColorPlay%20x%20Ripley.md) · [Implementation and limits](docs/IMPLEMENTATION_V2.md)

A computer-vision kiosk proposal for Ripley's physical stores: a color reference and clothing tastes guide a shopper toward garments; a proposed purchase-linked data loop helps Merchants learn about color × size × style. Ripley is the proposed buyer, **not a confirmed partner**.

## Try it
Use demo RUT **11.111.111-1** and accept the local-demo consent.

- **First visit:** RUT → consent → local camera/image-color extraction or an explicitly sample color test → tastes and optional size → sample garment locations → printable ticket / genuine QR.
- **Returning shopper:** RUT → saved demo palette, tastes, editable/hideable size and recent sample purchases → aisle recommendations. Available store by store in the demo.
- **Checkout demo:** select bought garments, simulate scanning the ticket, inspect proposed3% → 5% → 8% tiers and separately preview optional Puntos Go enrollment.
- **Merchant preview:** local session → mock checkout → mock CRM → purchased and unpurchased shortlist items. No causal reason for non-purchase is inferred.

### What is real vs. simulated
| Functional in this browser | Not connected or validated |
|---|---|
| RUT check digit, consent and memory-only identifier link | Customer authentication or Ripley customer lookup |
| Local image-color extraction and preference filtering | Validated skin colorimetry or 5000K calibration |
| Editable size, sample-stock no-match and aisle display | Live inventory, real SKUs or actual store floor plans |
| Genuine offline QR, print-only ticket and local duplicate-scan blocking | POS redemption, real discounts or cross-device deduplication |
| Local mock purchase/CRM events | Ripley CRM, purchase attribution or actual Puntos Go enrollment |

**Do not enter a real RUT.** No RUT/photo/profile is sent or persistently saved. The QR contains no RUT. Finish/reset, tab hide, reload or 3 minutes idle clears the local session. A RUT is an identifier, not authentication; a production profile service needs additional approved safeguards. [Privacy](privacy.html).

## Current strategy
The two documents supplied in `ColorPlay_x_Ripley.zip` supersede the former anonymous-first / drapes-first / SaaS proposal. The current sell-then-embed proposal is CLP 25 MM pilot, CLP 200 MM system/IP transfer (80 upfront + 120 earn-out), then CLP 12 MM/month for a three-person embedded team. **All amounts and projections are illustrative assumptions to negotiate**, not a deal or validated forecast. No patentability is asserted without INAPI/legal review.

Old decks, dossiers, exports, screenshots and obsolete tooling have been removed from this checkout. Git history is retained; the current build publishes only `dist/`, never the whole repository.

## Development
Node 22. No new npm dependencies were added for the QR; Project Nayuki's MIT generator is vendored with its license.

```sh
npm ci --prefix work
npm --prefix work run typecheck
npm --prefix work run build:prototype
npm --prefix work run check:prototype
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. Browser checks use Chrome on macOS by default; override `CHROME_PATH` elsewhere. GitHub Actions installs from the lockfile, typechecks, builds and deploys only `dist/` on a push to `main`.

## Structure
- `work/src/`: TypeScript kiosk, offline QR,3D concept and CSS.
- `work/assets/`: only assets used by the current prototype and their provenance.
- `work/build_prototype.mjs`: self-contained HTML builder.
- `work/check_instore_prototype.cjs`: browser, privacy, QR and accessibility tests.
- `docs/`: current strategy, implementation, privacy and cleanup record.
- `index.html`, `privacy.html`, `credits.html`: current generated entry points.
- `dist/`: generated Pages artifact (ignored by Git).

Team: Nicolas Inostrosa · Valeria Ravanal · Rocio Torres · Simple Tech / UDD.
