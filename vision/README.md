# Color-Play · Computer Vision Lab

Functional web prototype for color exploration, based on Color-Play's identity and retail context: the existing logo, local Manrope, fuchsia, and free-form outfit comparison.

This is an **independent experimental surface**. It does not replace the in-store prototype or change the constraints of the academic study. Optional capture in this lab requires consent through the camera button. It does not imply that the study has been carried out or that a personal color-analysis service has been validated.

## Run

From this folder:

```sh
cd /Users/nicolas/Desktop/Color-Play/vision
npm start
```

Open **http://localhost:4175/**. No `npm install` is needed: the app uses native HTML, CSS, and JavaScript modules, and the server uses Python 3. If the port is already in use, pick another: `python3 -m http.server 4176 --bind 127.0.0.1`.

You can also serve it from the repository root:

```sh
cd /Users/nicolas/Desktop/Color-Play
python3 -m http.server 4175 --bind 127.0.0.1
```

In that case, open **http://localhost:4175/vision/**. The same folder works with GitHub Pages at `/Color-Play/vision/` once published. Do not open it via `file://`: the modules require an HTTP server. On a phone, the camera requires HTTPS; a local network IP served over HTTP is not enough.

## Available flow

1. Explore the included retail render or upload a JPG, PNG, or WebP of up to 15 MB. Dragging a file in also works.
2. Voluntarily turn on the camera and capture a photo, or cancel. The camera stops when you capture, cancel, hide, or leave the page.
3. Extract up to five dominant colors and their pixel proportions. The displayed percentages add up to 100%.
4. Select a color from the list or sample an area of the image. With the keyboard, focus the image and use the arrow keys; Enter repeats the current sample.
5. View HEX, RGB, lightness L*, and chroma C*ab. Copy the HEX.
6. Compare the sample with the editorial palettes Soft, Earth, Vibrant, and Cool.
7. Confirm up to three manual references: skin, hair, or a garment. The demo render's colors are not used as personal references.
8. Complete a six-question interview: style, usual garments, occasion, climate, color preference, and garments to avoid.
9. Get three looks with specific garments and color schemes. Swap one piece while keeping the constraints, read the explanation, or edit your answers.
10. Download the palette or the looks as JSON, without the photo. The looks download includes the answers and confirmed references. Clear session removes the image, answers, references, and results from the app.

## Outfit recommender

`stylist-engine.js` defines an illustrative catalog of 14 garment types and 14 fabric colors. It is not a commercial catalog and contains no stock, sizes, prices, brands, or purchase links.

- Tops and bottoms come from the garments the person said they wear.
- Exclusions and climate compatibility are mandatory filters, including when swapping garments.
- Style and occasion rank the candidates. These are editorial affinities, not a claim of suitability for any specific dress code.
- With a neutral preference, all colors are limited to the catalog's neutrals. With an accent, only the top can contribute a non-neutral color.
- Confirmed references guide nearby colors, an alternative hue, or an a*b* direction contrast in CIELAB. **No season, undertone, or what flatters a person is inferred.**
- Recommendations can be made from the interview alone, without a camera or samples; the results explain that condition.
- The style, usual garments, occasion, climate, and exclusion options have reference photographs. The looks show photographs with the recommended color indicated separately; the photo may be a different color. They are not photographs of real inventory or a virtual try-on.
- When no compatible combination exists, the problem is explained without bypassing the filters.
- Changing a reference or an answer invalidates the previous looks. Changing the image removes the references so that samples from a different photo are not used. Clear session resets everything.

The interface lives in `stylist.js`, `stylist.css`, and `visual-preview.css`; `catalog-photos.js` resolves local photographs. `wardrobe-art.js` keeps the previous version's diagrams as an asset, but they are no longer used in the looks. Everything is local and deterministic, with no LLM or external API.

## UI review · Machine view

Open **http://localhost:4175/vision/#ui-review** when served from the repository root, or use "Machine view" in the navigation. It is an interactive view inside the same prototype, with a session independent from the lab's:

1. **Welcome:** the station's entry interface, the pitch, and a button to start.
2. **Your photo:** explicit consent before the camera is enabled, real capture, optional upload, or continuing without a photo. After capturing, the user manually chooses a reference color from the image or from the swatches. Skin tones are not inferred. The camera turns off when you capture, cancel, change screens, hide, or leave the page.
3. **Your clothes:** photo-based selection of usual garments, style, occasion, climate, color preference, and exclusions. A compatible top and bottom are validated.
4. **Result:** a combination of garments with photos, colors to look for, DEMO references, and simulated locations by area/rack. It allows another combination, editing preferences, and finishing by clearing the session. "Ask for help" explains the simulation: it does not send a real alert.

The review buttons let you jump to any screen. If Result is visited without completing the interview, an example is shown explicitly and the photo from that session is not used. "Restart tour" clears only the machine view; the global "Clear session" also clears this view. The lab's camera and the machine view's camera are never active at the same time.

The machine's photo, answers, and results are ephemeral and are not exported. The prototype does not implement checkout, real inventory, salesperson integration, sizes, reservations, face detection, or automatic session closing on inactivity; a public deployment needs that hardening and a validated consent protocol.

### Photos and institutional seal

- 14 local reference photographs, with sources in `assets/photo-sources.json` and a credits link in the interface. Provider: Unsplash; license: https://unsplash.com/license. Some photos include a person or several garments: they are category/style references, not an exact SKU.
- Photos are not recolored to fake existing variants. The color to look for is shown separately.
- `assets/magister-original.png` is an unaltered copy of the PNG shared by the user: the Simple Tech / UDD MTI seal. It is shown in the prototype's header and in the machine frame. Its presence is a project attribution, not evidence of commercial validation.

## Real processing, limited scope

- Canvas normalizes the longest side to a maximum of 1,200 px and composites transparency over white.
- The analysis uses up to about 8,000 pixels, transformed from sRGB D65 to CIELAB.
- Deterministic K-means: farthest-point initialization and twelve iterations, up to five clusters.
- Each cluster's HEX represents the RGB average of its members; the proportion represents pixels, **not confidence or the accuracy of a recommendation**.
- A manual sample averages a window of up to 7 × 7 pixels around the point.
- Heuristic warnings for darkness or clipping; they are not calibration or a validated quality test.
- There is no ML, face detection, garment or skin segmentation, season classification, or inference of personal attributes.
- The palettes are editorial content of the prototype, not recommendations derived from a personal assessment.
- The retail render comes from `work/assets/render_3d_hero_store.jpg`: it is a project visualization, not a photograph of a validated deployment.

To evolve into personal color analysis, the lighting/calibration protocol, the area of interest, and the evaluation method with consenting participants must be defined and validated. Classifying colors from a photo is not enough.

## Privacy

There is no backend, remote services, external fonts, persistent storage, persistent profiles, cookies, or analytics. Interview answers and references are kept only in memory until cleared or the page is reloaded. Only local assets are requested. Uploaded images and captures are processed in memory; they are not uploaded or saved automatically. Exporting colors is an explicit action. This is not a guarantee of forensic erasure from browser or operating system memory.

## Files

- `index.html`: semantic interface in English.
- `styles.css`: responsive interface, existing identity, and local font.
- `app.js`: state, loading, camera, sampling, comparison, and export.
- `color-engine.js`: dependency-free color conversion and clustering.
- `kiosk-review.js`: the machine tour, session, camera, and simulated store recommendations.
- `visual-preview.css`: photo options and the machine screen.
- `catalog-photos.js`: local photo resolution and fallbacks.
- `assets/`: logos, Manrope and its license, sample render, and local photographs with sources.
- `tests/`: engine tests and browser checks.
- `artifacts/browser-report.json`: latest automated report. Local PNG screenshots are excluded from Git.

## Verification

```sh
npm test
```

Browser tests with the dependencies already present in `../work/node_modules` and Google Chrome (start the server from the repository root first):

```sh
node tests/browser.cjs
node tests/stylist-browser.cjs
node tests/kiosk-browser.cjs
# If the server was started inside vision/:
BASE_URL=http://localhost:4175/ node tests/browser.cjs
```

`CHROME_PATH` lets you point to a different executable. It covers five widths (320, 390, 780, 1024, and 1440), absence of horizontal overflow, pointer/keyboard samples, real upload, corrupt file, clipboard, export, camera capture and cancellation with a simulated device, clearing, and help. Axe runs on the example state. The second script verifies the interview, confirmed references, recommendations, exclusions, garment swaps, export, invalidation, no-combination case, and full clearing; it runs Axe on the interview and results, and checks that there are no external HTTP requests. The third script covers loaded photographs and logo, four machine screens, consent, capture, manual reference choice, validation, recommendation, exclusions, simulated locations, alternatives, restart, corrupt file, and global clearing. It runs Axe on each of the four screens and verifies there are no failed requests. `npm test` bundles 16 color and recommendation tests. Zero automated violations is not an accessibility certification; the physical camera and different lighting conditions require manual testing.
