# Current prototype assets

## Strategy supplied by the user
Source: `/Users/nicolas/Downloads/ColorPlay_x_Ripley.zip`.
SHA256: `88129c2aae3b606ca4fadb46dfc9366b447f3b249545fe01dcde7fe9bbbc094c`.
Both Markdown documents are copied unchanged into docs. Claims, external statistics, financial assumptions and legal references in them have not been independently validated by this implementation.

## Existing project imagery
- `work/assets/render_3d_hero_store.jpg`, `render_3d_kiosk_closeup.jpg`, `render_3d_stage1_portable.jpg`: existing illustrative renders, not pilot/store photographs. They predate the revised camera /21–24 inch enclosure.
- `work/assets/catalog/*.jpg`:14 existing category photographs transferred from the retired vision assets. Original Unsplash source IDs and license link are preserved in `work/assets/photo-sources.json`. Original metadata lacks photographer names; none were invented. Verify creators and commercial reuse permissions before external use. Photos are not real Ripley SKUs and can differ from suggested colors.
- Supplied Color-Play and Simple Tech/UDD marks are retained, no new authorship or rights clearance claimed.
- Ripley PNG unchanged, reference source: https://upload.wikimedia.org/wikipedia/commons/6/6b/Logo_Ripley_Chile.png. SHA256: `1ef09df8f16ca9a0181e7118b177a24dbbfd02955b8bdaba6502dd7208450a1b`. Recipient identification only; no partnership or corporate brand-kit approval.
- Manrope self-hosted font: existing project copy, SIL OFL license retained in `work/Manrope-OFL.txt`.

Public credit register: `credits.html`, generated from the preserved source metadata. No external photos, video or fonts were newly fetched.

## QR generator
Project Nayuki QR Code generator, MIT:
https://www.nayuki.io/page/qr-code-generator-library
Source retrieved: https://raw.githubusercontent.com/nayuki/QR-Code-generator/master/typescript-javascript/qrcodegen.ts

Vendored `work/src/vendor/qrcodegen.ts` SHA256:
`6e7e3b3586173ea30a537c35b8b54dd51ae5b0626633d70c061690393fd5d3f7`.

Local adaptations: export the three merged namespaces for module bundling, mark the license comment for preservation in esbuild, normalize trailing whitespace. QR algorithm unchanged. The full MIT copyright/permission notice remains in source and generated HTML. QR uses an actual encoded campaign + random token with a four-module quiet zone, not a decorative grid. Browser BarcodeDetector decoded the generated QR back to its exact payload during tests.
