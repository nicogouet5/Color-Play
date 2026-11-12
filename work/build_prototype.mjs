import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'ENTREGA_FINAL_v12');
const VISION_DIR = path.join(ROOT, 'vision');

function loadJpegDataUri(fileName) {
  const bytes = fs.readFileSync(path.join(__dirname, 'assets', fileName));
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

function loadVisionClothesMap() {
  const clothesDir = path.join(VISION_DIR, 'assets/clothes');
  const ids = [
    'tee',
    'shirt',
    'knit',
    'hoodie',
    'jeans',
    'chinos',
    'tailored',
    'skirt',
    'blazer',
    'overshirt',
    'coat',
    'sneakers',
    'loafers',
    'boots'
  ];
  const map = {};
  for (const id of ids) {
    const file = path.join(clothesDir, `${id}.jpg`);
    const bytes = fs.readFileSync(file);
    map[id] = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  }
  return map;
}

function typecheckAndBundleTS(visionAssetsJson) {
  const configPath = path.join(__dirname, 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    __dirname
  );

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length > 0) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => __dirname,
      getNewLine: () => '\n'
    });
    console.error(formatted);
    process.exit(1);
  }

  const dataSource = fs
    .readFileSync(path.join(__dirname, 'src/data.ts'), 'utf8')
    .replace(/import\s+type\s+\{[\s\S]*?\}\s+from\s+['"]\.\/types['"];?/g, '')
    .replace(/export\s+const\s+/g, 'const ');

  const rack3dSource = fs
    .readFileSync(path.join(__dirname, 'src/rack3d.ts'), 'utf8')
    .replace(/import\s+type\s+\{[\s\S]*?\}\s+from\s+['"]\.\/types['"];?/g, '')
    .replace(/export\s+(type|interface)\s+/g, '$1 ')
    .replace(/export\s+function\s+/g, 'function ');

  const visionKioskSource = fs
    .readFileSync(path.join(__dirname, 'src/vision-kiosk.ts'), 'utf8')
    .replace(/import\s+type\s+\{[\s\S]*?\}\s+from\s+['"]\.\/types['"];?/g, '')
    .replace(/declare\s+const\s+VISION_ASSETS[\s\S]*?;/g, '')
    .replace(/export\s+(type|interface)\s+/g, '$1 ')
    .replace(/export\s+function\s+/g, 'function ');

  const appSource = fs
    .readFileSync(path.join(__dirname, 'src/instore-prototype.ts'), 'utf8')
    .replace(/import\s+\{[\s\S]*?\}\s+from\s+['"]\.\/data['"];?/g, '')
    .replace(/import\s+\{[\s\S]*?\}\s+from\s+['"]\.\/rack3d['"];?/g, '')
    .replace(/import\s+\{[\s\S]*?\}\s+from\s+['"]\.\/vision-kiosk['"];?/g, '')
    .replace(/import\s+type\s+\{[\s\S]*?\}\s+from\s+['"]\.\/types['"];?/g, '');

  const combinedTS = `(() => {\nconst VISION_ASSETS: Record<string, string> = ${visionAssetsJson};\n${dataSource}\n${rack3dSource}\n${visionKioskSource}\n${appSource}\n})();`;
  const transpiled = ts.transpileModule(combinedTS, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
      strict: true
    }
  });

  return transpiled.outputText;
}

const fontBase64 = fs
  .readFileSync(path.join(__dirname, 'Manrope.ttf'))
  .toString('base64');
const colorLogoBase64 = fs
  .readFileSync(path.join(OUT_DIR, 'Logo_Color.png'))
  .toString('base64');
const colorLogoUri = `data:image/png;base64,${colorLogoBase64}`;
const magisterBase64 = fs
  .readFileSync(path.join(VISION_DIR, 'assets/magister-original.png'))
  .toString('base64');
const magisterLogoUri = `data:image/png;base64,${magisterBase64}`;

const render3dHeroUri = loadJpegDataUri('render_3d_hero_store.jpg');
const render3dCloseupUri = loadJpegDataUri('render_3d_kiosk_closeup.jpg');
const render3dStage1Uri = loadJpegDataUri('render_3d_stage1_portable.jpg');

const visionAssetsMap = loadVisionClothesMap();
const cssRaw = fs.readFileSync(
  path.join(__dirname, 'src/instore-prototype.css'),
  'utf8'
);
const cssBundled = cssRaw.replaceAll(
  '__FONT__',
  `data:font/ttf;base64,${fontBase64}`
);
const jsBundled = typecheckAndBundleTS(JSON.stringify(visionAssetsMap));

function buildHtmlDocument() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-play-package" content="Standalone TypeScript + CSS In-Store Prototype: 01 Project Presentation, 02 Interactive 360 3D Rack Viewer, 03 Isolated Vision Kiosk UI.">
  <meta name="description" content="Color-Play in-situ retail prototype: editorial presentation, interactive 360-degree 3D rack-kiosk model, and live in-store kiosk interface.">
  <title>Color-Play · In-Situ Retail Concept, 3D Rack &amp; Kiosk UI</title>
  <style>${cssBundled}</style>
</head>
<body>
  <a class="skip-link visually-hidden" href="#main-content">Skip to in-store prototype</a>
  <div id="live-announcer" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>

  <header class="site-header">
    <div class="brand-cluster">
      <div class="brand-logos">
        <img class="color-logo" src="${colorLogoUri}" alt="Color-Play">
        <img class="simple-tech-logo" src="${magisterLogoUri}" alt="Simple Tech UDD MTI">
      </div>
      <span class="header-context">In-Situ Retail Concept · Store Floor Edition</span>
    </div>
    <nav class="header-nav" aria-label="Prototype chapters">
      <a href="#presentation">01 · Presentation</a>
      <a href="#fixture-3d">02 · 3D Prototype</a>
      <a href="#kiosk-ui">03 · Kiosk UI</a>
    </nav>
  </header>

  <main id="main-content" class="page-shell">
    <!-- CHAPTER 01: PROJECT PRESENTATION -->
    <section class="paper-section editorial-reveal" id="presentation">
      <div class="section-meta">
        <span>01 / Project Presentation · In-Situ Retail Color Clarity [O / A]</span>
        <div class="brand-logos">
          <img class="color-logo" src="${colorLogoUri}" alt="Color-Play">
          <img class="simple-tech-logo" src="${magisterLogoUri}" alt="Simple Tech UDD MTI">
        </div>
      </div>

      <div class="hero-grid">
        <div class="hero-copy">
          <span class="editorial-kicker">Collection &amp; Store Concept · Chile</span>
          <h1>Color clarity <strong>at the rack.</strong></h1>
          <p class="section-lead">
            Rather than isolating shoppers inside a camera booth or pushing an abstract styling app, Color-Play sits directly beside the clothing rail. It pairs physical fabric drapes under calibrated <strong>5000K CRI 95+</strong> light with an optional 12-inch touch station tied to <strong>garments on the rack</strong>—where skipping or choosing without a camera is always first-class.
          </p>
          <div class="hero-actions">
            <a class="btn-cta-link" href="#kiosk-ui">Experience Live Kiosk UI ↓</a>
            <a class="btn-cta-link is-outline" href="#fixture-3d">Explore 360° 3D Rack ↓</a>
          </div>
          <div class="hero-principles">
            <div class="editorial-col">
              <strong>01 · Shopper Agency</strong>
              <p>Optional camera with explicit consent, zero stored profiles, and full continuation using only personal wardrobe preferences.</p>
            </div>
            <div class="editorial-col">
              <strong>02 · Rack-Side Context [O]</strong>
              <p>Among n=9 qualifying shoppers, 8 default to familiar colors and 7 discard garments [O, E1]. Guidance points directly to in-store racks.</p>
            </div>
            <div class="editorial-col">
              <strong>03 · Staged Validation [A]</strong>
              <p>Progresses from a zero-tech portable rack study (Stage 1) to an integrated 12-inch touch bay (Stage 2) once behavioral gates pass.</p>
            </div>
          </div>
        </div>

        <figure class="hero-figure">
          <div class="hero-image-frame">
            <img id="hero-main-img" src="${render3dHeroUri}" alt="Photorealistic 3D architectural render of the Color-Play modular rack and 12-inch touch kiosk station in a modern retail department store.">
          </div>
          <figcaption>
            <span id="hero-main-caption">Look 01 · Stage 2 Modular Rack &amp; 12&quot; Kiosk Bay [A]</span>
            <span class="swatches" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          </figcaption>
          <div class="hero-view-switcher" role="group" aria-label="Switch 3D architectural render">
            <button type="button" class="hero-view-btn is-active" data-hero-view="store" data-hero-src="${render3dHeroUri}" data-hero-caption="Look 01 · Stage 2 Modular Rack & 12&quot; Kiosk Bay [A]" data-hero-alt="Photorealistic 3D architectural render of the Color-Play modular rack and 12-inch touch kiosk station in a modern retail department store." aria-pressed="true">01 · Store Bay</button>
            <button type="button" class="hero-view-btn" data-hero-view="closeup" data-hero-src="${render3dCloseupUri}" data-hero-caption="Look 02 · 45° Kiosk Console & Physical Textile Drapes [A]" data-hero-alt="Close-up 3D industrial design render of the 45-degree angled 12-inch kiosk touchscreen above four tactile fabric swatches." aria-pressed="false">02 · 45° Console</button>
            <button type="button" class="hero-view-btn" data-hero-view="stage1" data-hero-src="${render3dStage1Uri}" data-hero-caption="Look 03 · Stage 1 Portable Discovery Rack (Zero Screen) [A]" data-hero-alt="3D render of the Stage 1 portable retail study rack with caster wheels, 5000K clip-on light bar, and analog swatch binder." aria-pressed="false">03 · Stage 1 Rack</button>
          </div>
        </figure>
      </div>

      <!-- STAGED EVOLUTION TABS -->
      <div class="stage-section-block">
        <div class="stage-tabs-bar" role="tablist" aria-label="In-store deployment stages">
          <button type="button" role="tab" class="stage-tab-btn" id="tab-stage1" data-stage-tab="stage1-portable" aria-selected="false" tabindex="-1">Stage 01 · Portable Rack Study</button>
          <button type="button" role="tab" class="stage-tab-btn" id="tab-stage2" data-stage-tab="stage2-station" aria-selected="true" tabindex="0" focusgroupstart>Stage 02 · Rack-Side Kiosk Station</button>
          <button type="button" role="tab" class="stage-tab-btn" id="tab-stage3" data-stage-tab="stage3-makeup-champion" aria-selected="false" tabindex="-1">Stage 03 · Cross-Category Bridge [A]</button>
        </div>

        <div class="stage-panels-stack">
          <div role="tabpanel" class="stage-panel" aria-labelledby="tab-stage1" data-stage-panel="stage1-portable" hidden="until-found">
            <div class="stage-panel-inner">
              <div class="stage-headline-box">
                <span class="tag a">[A] Immediate Discovery Gate (A1–A2) · Zero Tech Integration</span>
                <h3>Portable human-assisted comparison beside the rack, before hardware commitment.</h3>
              </div>
              <div class="stage-specs-grid">
                <div class="stage-spec-item">
                  <h4>Footprint [A]</h4>
                  <p>0.8 m² movable garment rail + physical fabric swatch book + clip-on 5000K CRI 95+ lamp.</p>
                </div>
                <div class="stage-spec-item">
                  <h4>Shopper Flow [A]</h4>
                  <p>Voluntary invitation → 90-second physical fabric drape check → 2–3 tops pulled from the rack.</p>
                </div>
                <div class="stage-spec-item">
                  <h4>Privacy Rule</h4>
                  <p>Zero camera photos, zero stored profiles, and an immediate neutral-garment fallback.</p>
                </div>
                <div class="stage-spec-item">
                  <h4>Validation Gate [A]</h4>
                  <p>Pass Gate A1 if &ge; 4/5 shoppers select or try a suggested garment with median trust &ge; 4/5.</p>
                </div>
              </div>
            </div>
          </div>

          <div role="tabpanel" class="stage-panel" aria-labelledby="tab-stage2" data-stage-panel="stage2-station">
            <div class="stage-panel-inner">
              <div class="stage-headline-box">
                <span class="tag a">[A] Featured Store Fixture · Physical Drapes + 12&quot; Touch Kiosk</span>
                <h3>A modular 1.2 m² rack station pairing calibrated 5000K light, physical drapes, and the live Kiosk UI.</h3>
              </div>
              <div class="stage-specs-grid">
                <div class="stage-spec-item">
                  <h4>Footprint [A]</h4>
                  <p>1.2 m² feature bay + 45° angled 12&quot; touch screen + upper 5000K canopy + 4 physical fabric tabs.</p>
                </div>
                <div class="stage-spec-item">
                  <h4>Shopper Flow [A]</h4>
                  <p>Welcome at the rack → optional photo or direct wardrobe interview → coordinated outfit on Hooks 01–06.</p>
                </div>
                <div class="stage-spec-item">
                  <h4>Privacy Rule</h4>
                  <p>Ephemeral in-memory session only. One-tap &ldquo;Finish and clear&rdquo; erases all choices and photos.</p>
                </div>
                <div class="stage-spec-item">
                  <h4>Validation Gate [A]</h4>
                  <p>Gates A2–A5: &ge; 80% specialist agreement, verified shift stock freshness, and viable unit economics.</p>
                </div>
              </div>
            </div>
          </div>

          <div role="tabpanel" class="stage-panel" aria-labelledby="tab-stage3" data-stage-panel="stage3-makeup-champion" hidden="until-found">
            <div class="stage-panel-inner">
              <div class="stage-headline-box">
                <span class="tag a">[A] Future Cross-Category Scope · Apparel Buyer + Makeup Champion</span>
                <h3>Apparel merchandising owns the initial station; Makeup / Beauty champions cross-category vocabulary.</h3>
              </div>
              <div class="stage-specs-grid">
                <div class="stage-spec-item">
                  <h4>Placement [A]</h4>
                  <p>Positioned on the boundary aisle connecting Women&rsquo;s Apparel and the Beauty floor.</p>
                </div>
                <div class="stage-spec-item">
                  <h4>Shopper Flow [A]</h4>
                  <p>Complete apparel rack look first → optional contrast takeaway card for the beauty counter.</p>
                </div>
                <div class="stage-spec-item">
                  <h4>Scope Guardrail</h4>
                  <p>Apparel remains the primary commercial scope; cosmetic shade matching requires separate validation.</p>
                </div>
                <div class="stage-spec-item">
                  <h4>DMU Structure [A]</h4>
                  <p>Apparel Buying acts as proposed economic buyer [A]; Beauty acts as internal advocate [A].</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CHAPTER 02: 3D PROTOTYPE VIEW -->
    <section class="paper-section editorial-reveal" id="fixture-3d">
      <div class="section-meta">
        <span>02 / 3D Prototype Overview · Interactive 360° Model &amp; Store Renders [A]</span>
        <div class="brand-logos">
          <img class="color-logo" src="${colorLogoUri}" alt="Color-Play">
          <img class="simple-tech-logo" src="${magisterLogoUri}" alt="Simple Tech UDD MTI">
        </div>
      </div>

      <div>
        <span class="editorial-kicker">Spatial Architecture · 1.2 m² Modular Bay</span>
        <h2>Inspect the prototype <span class="pink">in 360° 3D.</span></h2>
      </div>
      <p class="section-lead">
        Drag to rotate the 3D rack-kiosk structure, switch architectural camera angles, toggle the <strong>5000K daylight canopy cone</strong>, or select hardware pins <strong>01</strong>–<strong>05</strong> to inspect how the physical station is built.
      </p>

      <div class="fixture-explorer-grid">
        <div class="fixture-elevation-box">
          <div class="rack3d-stage-wrap">
            <canvas id="rack-3d-canvas" tabindex="0" aria-label="Interactive 360-degree 3D model of the Color-Play retail rack and 12-inch touchscreen kiosk. Drag or use arrow keys to rotate and inspect hardware pins 01 to 05."></canvas>
            <div class="rack3d-controls-bar">
              <div class="rack3d-preset-group" role="group" aria-label="3D camera angle presets">
                <button type="button" class="rack3d-btn is-active" data-cam-preset="isometric" aria-pressed="true">3/4 Isometric</button>
                <button type="button" class="rack3d-btn" data-cam-preset="front" aria-pressed="false">Front Elevation</button>
                <button type="button" class="rack3d-btn" data-cam-preset="kiosk-closeup" aria-pressed="false">Kiosk Console</button>
                <button type="button" class="rack3d-btn" data-cam-preset="rack-hooks" aria-pressed="false">Hooks 01–06</button>
                <button type="button" class="rack3d-btn" data-cam-preset="top-floorplan" aria-pressed="false">Footprint</button>
              </div>
              <div class="rack3d-toggle-group">
                <button type="button" class="rack3d-btn is-active" id="toggle-3d-light" aria-pressed="true">5000K Cone: On</button>
                <button type="button" class="rack3d-btn" id="toggle-3d-orbit" aria-pressed="false">360° Auto-Orbit</button>
              </div>
            </div>
          </div>

          <div class="hotspot-buttons-row" role="group" aria-label="Fixture hardware hotspots">
            <button type="button" class="hotspot-btn" data-hotspot-btn="lighting-bar" aria-pressed="false">01 · 5000K Canopy</button>
            <button type="button" class="hotspot-btn" data-hotspot-btn="drape-rail" aria-pressed="false">02 · Physical Drapes</button>
            <button type="button" class="hotspot-btn is-active" data-hotspot-btn="touch-terminal" aria-pressed="true">03 · 12&quot; Terminal</button>
            <button type="button" class="hotspot-btn" data-hotspot-btn="curated-rack" aria-pressed="false">04 · Hooks 01–06</button>
            <button type="button" class="hotspot-btn" data-hotspot-btn="qr-handoff" aria-pressed="false">05 · Ephemeral Pass</button>
          </div>
        </div>

        <div class="hotspot-detail-panel" id="hotspot-detail-card" aria-live="polite"></div>
      </div>

      <div class="renders-3d-strip" aria-label="Photorealistic 3D store renders">
        <article class="render-3d-card">
          <div class="render-3d-card-img-wrap">
            <img src="${render3dHeroUri}" alt="Stage 2 modular rack and 12-inch kiosk station positioned inside a modern retail apparel floor">
          </div>
          <div class="render-3d-card-body">
            <strong>01 · Stage 2 In-Store Bay [A]</strong>
            <p>1.2 m² footprint pairing an angled 12&quot; touch kiosk, mirror bay, and 5000K canopy with 6 curated tops in stock.</p>
          </div>
        </article>
        <article class="render-3d-card">
          <div class="render-3d-card-img-wrap">
            <img src="${render3dCloseupUri}" alt="Close-up industrial design view of the tilted 12-inch kiosk housing and four real fabric swatches mounted underneath">
          </div>
          <div class="render-3d-card-body">
            <strong>02 · 45° Kiosk Console + Drapes [A]</strong>
            <p>Anti-glare 45° touch console directly above real woven fabric tabs so explanations stay grounded in tangible cloth.</p>
          </div>
        </article>
        <article class="render-3d-card">
          <div class="render-3d-card-img-wrap">
            <img src="${render3dStage1Uri}" alt="Stage 1 portable rolling rack with clip-on 5000K LED bar and analog printed drape guide without a screen">
          </div>
          <div class="render-3d-card-body">
            <strong>03 · Stage 1 Portable Study [A]</strong>
            <p>0.8 m² rolling fixture with clip-on daylight and analog swatch binder to validate A1–A2 before screen investment.</p>
          </div>
        </article>
      </div>
    </section>

    <!-- CHAPTER 03: ISOLATED VISION KIOSK UI -->
    <section class="paper-section editorial-reveal" id="kiosk-ui">
      <div class="section-meta">
        <span>03 / Interactive Kiosk UI · Vision In-Store Terminal Experience [A]</span>
        <div class="brand-logos">
          <img class="color-logo" src="${colorLogoUri}" alt="Color-Play">
          <img class="simple-tech-logo" src="${magisterLogoUri}" alt="Simple Tech UDD MTI">
        </div>
      </div>

      <div class="kiosk-showcase-head">
        <div>
          <span class="editorial-kicker">12-Inch Touch Console · Isolated Kiosk View</span>
          <h2>This is how it feels <span class="pink">at the station.</span></h2>
          <p class="section-lead" style="margin-top:10px;">
            Walk through the 4 screens of the rack-side machine interface—from the welcome screen and optional camera/photo reference to your habitual wardrobe and a complete look mapped to store racks.
          </p>
        </div>
        <button type="button" id="kiosk-restart">Restart Walkthrough</button>
      </div>

      <div>
        <nav class="review-steps" aria-label="Kiosk screens">
          <button type="button" data-screen="0" aria-pressed="true"><span>1</span> Welcome</button>
          <button type="button" data-screen="1" aria-pressed="false"><span>2</span> Your photo</button>
          <button type="button" data-screen="2" aria-pressed="false"><span>3</span> Your clothes</button>
          <button type="button" data-screen="3" aria-pressed="false"><span>4</span> Result</button>
        </nav>

        <div class="kiosk-device" id="ui-review">
          <div class="kiosk-top">
            <img src="${colorLogoUri}" alt="Color-Play" width="74" height="30">
            <span>Demo store · Color-Play station</span>
            <span id="kiosk-step-label">Welcome</span>
          </div>
          <div id="kiosk-screen" class="kiosk-screen"></div>
          <div class="kiosk-bottom">
            <span>Your session is private. You can finish and clear it at any time.</span>
            <img src="${magisterLogoUri}" alt="Simple Tech UDD MTI" width="48" height="50">
          </div>
        </div>
      </div>

      <p class="review-disclaimer">
        Interactive view of the proposed in-store kiosk terminal. Reference photographs are editorial (Unsplash license); store rack locations and SKU references are simulated. Zero persistent storage or external uploads; the camera only turns on with explicit consent.
      </p>
      <p id="kiosk-message" class="kiosk-message" role="status" aria-live="polite"></p>
    </section>
  </main>

  <footer class="site-footer">
    <span>Color-Play · Product Management I · Nicolas Inostrosa, Valeria Ravanal &amp; Rocio Torres</span>
    <span>[O] Observed survey baseline (n=9) · [A] Proposed in-store hypothesis · Ephemeral privacy-first session</span>
  </footer>

  <script>${jsBundled}</script>
</body>
</html>`;
}

const rootHtml = buildHtmlDocument();
const standaloneHtml = rootHtml;

fs.writeFileSync(path.join(ROOT, 'index.html'), rootHtml, 'utf8');
fs.writeFileSync(
  path.join(OUT_DIR, 'Color-Play_InStore_Prototype_Standalone.html'),
  standaloneHtml,
  'utf8'
);

console.log(
  `Built TypeScript + CSS In-Store Prototype:\n  - ${path.join(ROOT, 'index.html')} (${(rootHtml.length / 1024).toFixed(1)} KiB)\n  - ${path.join(OUT_DIR, 'Color-Play_InStore_Prototype_Standalone.html')} (${(standaloneHtml.length / 1024).toFixed(1)} KiB)`
);
