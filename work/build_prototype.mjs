import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'ENTREGA_FINAL_v12');

function typecheckAndBundleTS() {
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

  // Concatenate data.ts, rack3d.ts, and instore-prototype.ts (stripping local import/export keywords) and transpile with TypeScript
  const dataSource = fs
    .readFileSync(path.join(__dirname, 'src/data.ts'), 'utf8')
    .replace(/import\s+type\s+\{[\s\S]*?\}\s+from\s+['"]\.\/types['"];?/g, '')
    .replace(/export\s+const\s+/g, 'const ');

  const rack3dSource = fs
    .readFileSync(path.join(__dirname, 'src/rack3d.ts'), 'utf8')
    .replace(/import\s+type\s+\{[\s\S]*?\}\s+from\s+['"]\.\/types['"];?/g, '')
    .replace(/export\s+(type|interface)\s+/g, '$1 ')
    .replace(/export\s+function\s+/g, 'function ');

  const appSource = fs
    .readFileSync(path.join(__dirname, 'src/instore-prototype.ts'), 'utf8')
    .replace(/import\s+\{[\s\S]*?\}\s+from\s+['"]\.\/data['"];?/g, '')
    .replace(/import\s+\{[\s\S]*?\}\s+from\s+['"]\.\/rack3d['"];?/g, '')
    .replace(/import\s+type\s+\{[\s\S]*?\}\s+from\s+['"]\.\/types['"];?/g, '');

  const combinedTS = `(() => {\n${dataSource}\n${rack3dSource}\n${appSource}\n})();`;
  const transpiled = ts.transpileModule(combinedTS, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
      strict: true
    }
  });

  return transpiled.outputText;
}

function createSimpleTechSvgDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56" width="120" height="56">
    <rect x="2" y="2" width="116" height="52" rx="10" fill="#f5f2f7" stroke="#ddd7e3" stroke-width="2"/>
    <text x="60" y="25" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="800" fill="#201b27" letter-spacing="0.04em">SIMPLE</text>
    <text x="60" y="42" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="12" font-weight="700" fill="#b80a6b" letter-spacing="0.08em">TECH</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createHeroSceneSvgDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 540" width="800" height="540">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f7f2f8"/>
        <stop offset="55%" stop-color="#fcecf5"/>
        <stop offset="100%" stop-color="#e9dfec"/>
      </linearGradient>
      <linearGradient id="canopy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.92"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="800" height="540" fill="url(#bg)"/>
    <polygon points="110,44 690,44 750,240 50,240" fill="url(#canopy)"/>
    <!-- Top 5000K Neutral Daylight Bar -->
    <rect x="96" y="28" width="608" height="20" rx="10" fill="#201b27"/>
    <rect x="130" y="34" width="540" height="8" rx="4" fill="#fffdf7"/>
    <text x="400" y="21" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="700" fill="#585062">5000K CRI 95+ NEUTRAL DAYLIGHT RACK CANOPY</text>

    <!-- Main Retail Garment Rack Frame -->
    <rect x="116" y="86" width="568" height="392" rx="14" fill="none" stroke="#201b27" stroke-width="6"/>
    <line x1="86" y1="478" x2="714" y2="478" stroke="#201b27" stroke-width="8" stroke-linecap="round"/>

    <!-- Left Bay: Physical Drape Swatches + 12" Touch Station -->
    <rect x="142" y="114" width="218" height="236" rx="12" fill="#ffffff" stroke="#ddd7e3" stroke-width="2"/>
    <rect x="158" y="130" width="186" height="128" rx="8" fill="#201b27"/>
    <rect x="170" y="142" width="76" height="18" rx="4" fill="#b80a6b"/>
    <text x="208" y="155" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="10" font-weight="700" fill="#ffffff">PALETTE CLARITY</text>
    <rect x="170" y="168" width="162" height="44" rx="6" fill="#322a3d"/>
    <circle cx="190" cy="190" r="11" fill="#b80a6b"/>
    <circle cx="218" cy="190" r="11" fill="#d5b8d7"/>
    <circle cx="246" cy="190" r="11" fill="#244e91"/>
    <circle cx="274" cy="190" r="11" fill="#4a5d3f"/>
    <rect x="170" y="220" width="98" height="24" rx="5" fill="#fcecf5"/>
    <text x="219" y="236" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="10" font-weight="800" fill="#b80a6b">SEE 3 TOPS →</text>

    <!-- Physical Fabric Drapes Bar -->
    <text x="158" y="280" font-family="Manrope, Arial, sans-serif" font-size="11" font-weight="700" fill="#585062">PHYSICAL FABRIC DRAPES</text>
    <rect x="158" y="290" width="40" height="44" rx="6" fill="#b80a6b"/>
    <rect x="206" y="290" width="40" height="44" rx="6" fill="#d999be"/>
    <rect x="254" y="290" width="40" height="44" rx="6" fill="#b84a27"/>
    <rect x="302" y="290" width="40" height="44" rx="6" fill="#4a5d3f"/>

    <!-- Right Bay: Curated Garments on Hooks 01-06 -->
    <line x1="384" y1="126" x2="656" y2="126" stroke="#201b27" stroke-width="5"/>
    <!-- Hook 01 Garment (Orchid Fuchsia) -->
    <g transform="translate(392, 126)">
      <path d="M35,0 L35,18 M12,26 L58,18 L72,58 L58,64 L54,195 L14,195 L10,64 L-4,58 Z" fill="#b80a6b" stroke="#ffffff" stroke-width="2"/>
      <rect x="12" y="206" width="50" height="24" rx="5" fill="#201b27"/>
      <text x="37" y="222" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="11" font-weight="800" fill="#ffffff">HK 01</text>
    </g>
    <!-- Hook 03 Garment (Cool Lavender) -->
    <g transform="translate(476, 126)">
      <path d="M35,0 L35,18 M12,26 L58,18 L72,58 L58,64 L54,195 L14,195 L10,64 L-4,58 Z" fill="#d5b8d7" stroke="#201b27" stroke-width="2"/>
      <rect x="12" y="206" width="50" height="24" rx="5" fill="#b80a6b"/>
      <text x="37" y="222" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="11" font-weight="800" fill="#ffffff">HK 03</text>
    </g>
    <!-- Hook 05 Garment (Cobalt Slate) -->
    <g transform="translate(560, 126)">
      <path d="M35,0 L35,18 M12,26 L58,18 L72,58 L58,64 L54,195 L14,195 L10,64 L-4,58 Z" fill="#244e91" stroke="#ffffff" stroke-width="2"/>
      <rect x="12" y="206" width="50" height="24" rx="5" fill="#201b27"/>
      <text x="37" y="222" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="11" font-weight="800" fill="#ffffff">HK 05</text>
    </g>

    <!-- Bottom Guardrail Strip -->
    <rect x="130" y="394" width="540" height="58" rx="10" fill="#ffffff" stroke="#ddd7e3" stroke-width="2"/>
    <circle cx="154" cy="423" r="8" fill="#176249"/>
    <text x="172" y="418" font-family="Manrope, Arial, sans-serif" font-size="11.5" font-weight="800" fill="#201b27">OPTIONAL IN-SITU RACK HANDOFF · ZERO CAMERA · ZERO STORED PROFILE</text>
    <text x="172" y="437" font-family="Manrope, Arial, sans-serif" font-size="10.5" font-weight="600" fill="#585062">Compare drapes → inspect 2–3 in-stock tops on Hooks 01–06 → try on or choose No Result / Skip</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createCsvDataUri() {
  const csvContent = [
    'ID,Assumption,Why it matters,Evidence status today,Next test,Proposed owner [A],Decision gate [A],Result,Test date,Decision',
    'A1,Meaningful pain at the rack,Color uncertainty changes a real clothing decision,[O] E1 8/9 familiar colors and 7/9 discard; [A] real episodes unobserved,Observe 5 recent shoppers at a portable rack task,Product / research lead,>=4/5 select or want to try a suggestion; median trust >=4/5; <=1 pressure report,,,',
    'A2,Explained guidance beats default habits,Shoppers need credible explanations and safe no-result routes,[O] E2-E4 high reported usefulness/intent; [A] switching and quality untested,Compare controlled guidance with 2 independent color specialists,UX lead + color specialists,>=80% direct/adjacent agreement; <=15pp coverage gap; 100% failed cases get no-result/human route,,,',
    'A3,Apparel buyer pays,Category value must earn actual budget beyond internal advocacy,[A] Apparel buyer and Makeup champion unconfirmed,Interview Apparel Buying + Makeup champion + Finance signatory,Commercial lead,Written conditional pilot commitment naming budget owner and spending cap,,,',
    'A4,Store channel works without associate friction,Voluntary invitations must fit store routines,[A] Assisted delivery designed; funnel and service time unmeasured,Rehearse invitations to try-ons and time associate handoffs,Operations + commercial leads,Written Operations owner and sustainable session throughput limit,,,',
    'A5,Unit economics are viable,Contribution must cover fixed costs within real capacity,[A] Historical CLP 580/250/660k loses CLP 442.2k/month at 660 capacity,Obtain supplier quotes and measure session time before pricing,Finance + engineering leads,Positive contribution and breakeven <= measured capacity,,,',
    'A6,Critical retail assets are accessible,Fresh stock and privacy permissions cannot be assumed,[O] Strategy/survey exist; [A] no inventory feed or deployed station,Secure written expert and retailer stock/privacy responsibilities,Technical lead + retail sponsor,All critical flows pass with zero stale/out-of-stock recommendations,,,'
  ].join('\n');
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function loadJpegDataUri(fileName) {
  const bytes = fs.readFileSync(path.join(__dirname, 'assets', fileName));
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

const fontBase64 = fs
  .readFileSync(path.join(__dirname, 'Manrope.ttf'))
  .toString('base64');
const colorLogoBase64 = fs
  .readFileSync(path.join(OUT_DIR, 'Logo_Color.png'))
  .toString('base64');
const colorLogoUri = `data:image/png;base64,${colorLogoBase64}`;
const simpleTechUri = createSimpleTechSvgDataUri();
const render3dHeroUri = loadJpegDataUri('render_3d_hero_store.jpg');
const render3dCloseupUri = loadJpegDataUri('render_3d_kiosk_closeup.jpg');
const render3dStage1Uri = loadJpegDataUri('render_3d_stage1_portable.jpg');
const stitchKioskUri = loadJpegDataUri('stitch_kiosk_ui.jpg');
const stitchBrandUri = loadJpegDataUri('stitch_brand_visualize.jpg');
const csvUri = createCsvDataUri();

const cssRaw = fs.readFileSync(
  path.join(__dirname, 'src/instore-prototype.css'),
  'utf8'
);
const cssBundled = cssRaw.replaceAll(
  '__FONT__',
  `data:font/ttf;base64,${fontBase64}`
);
const jsBundled = typecheckAndBundleTS();

function buildHtmlDocument() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-play-package" content="Standalone TypeScript + CSS In-Store Prototype: embedded Manrope font, Color logo, interactive rack simulator, and zero external dependencies.">
  <meta name="description" content="Color-Play in-situ retail prototype: contextual store fixture anatomy and interactive 12-inch rack guidance simulator for Chilean fashion retailers.">
  <title>Color-Play · In-Situ Store Prototype &amp; Rack Station Simulator (v12)</title>
  <style>${cssBundled}</style>
</head>
<body>
  <a class="skip-link visually-hidden" href="#main-content">Skip to in-store prototype</a>
  <div id="live-announcer" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>

  <header class="site-header">
    <div class="brand-cluster">
      <div class="brand-logos">
        <img class="color-logo" src="${colorLogoUri}" alt="Color logo">
        <img class="simple-tech-logo" src="${simpleTechUri}" alt="Simple Tech attribution">
      </div>
      <span class="header-context">In-Situ Retail Prototype · Chilean Fashion Store Floor (v12)</span>
    </div>
    <nav class="header-nav" aria-label="Prototype sections">
      <a href="#stages">Deployment Stages</a>
      <a href="#fixture-anatomy">3D Rack Viewer</a>
      <a href="#stitch-showcase">Stitch UI</a>
      <a href="#simulator">Live Simulator</a>
      <a href="#dmu-gates">DMU &amp; Gates</a>
      <button type="button" class="btn-primary" data-open-kiosk>Launch Fullscreen Kiosk</button>
    </nav>
  </header>

  <main id="main-content" class="page-shell">
    <!-- SECTION 1: HERO & DEPLOYMENT STAGES -->
    <section class="paper-section" id="stages">
      <div class="section-meta">
        <span>In-Situ Retail Experience · Bounded B2B2C Experiment [O / A]</span>
        <div class="brand-logos">
          <img class="color-logo" src="${colorLogoUri}" alt="Color logo">
          <img class="simple-tech-logo" src="${simpleTechUri}" alt="Simple Tech attribution">
        </div>
      </div>

      <div class="hero-grid">
        <div class="hero-copy">
          <h1>We test color clarity <span class="pink">in-situ at the rack.</span></h1>
          <p class="section-lead">
            Rather than isolating shoppers in a camera booth or pushing a generic styling app, Color-Play sits directly beside the clothing rail. It pairs physical fabric drapes under neutral 5000K light with plain-language guidance tied to <strong>2 to 3 tops physically in stock</strong>—and treats disagreement or skipping as a safe, first-class choice.
          </p>
          <div class="hero-actions">
            <a class="btn-primary" href="#simulator" style="text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-flex;align-items:center;min-height:44px;">Try Interactive Rack Terminal ↓</a>
            <button type="button" class="btn-secondary" data-open-kiosk>Open 12&quot; Kiosk in Fullscreen</button>
          </div>
          <div class="hero-principles">
            <div class="editorial-col">
              <strong>Shopper Agency First</strong>
              <p>Zero camera photos, zero stored profiles, and an explicit <em>No Result / Skip</em> path whenever store lighting is ambiguous.</p>
            </div>
            <div class="editorial-col">
              <strong>Connected to Rack Stock [O]</strong>
              <p>Among n=9 qualifying shoppers, 8 choose familiar colors and 7 discard garments [O, E1]. Guidance maps directly to Hooks 01–06.</p>
            </div>
            <div class="editorial-col">
              <strong>Apparel First · Makeup Champion [A]</strong>
              <p>Apparel Merchandising / Buying is the proposed buyer [A]; Makeup / Beauty champions the cross-category opportunity [A].</p>
            </div>
          </div>
        </div>

        <figure class="hero-figure">
          <img id="hero-main-img" src="${render3dHeroUri}" alt="Photorealistic 3D architectural render of the Color-Play modular rack and 12-inch touch kiosk station in a modern retail department store.">
          <figcaption>
            <span id="hero-main-caption">3D Architectural Concept · Stage 2 Modular Rack &amp; 12&quot; Kiosk Bay [A]</span>
            <span class="swatches" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          </figcaption>
          <div class="hero-view-switcher" role="group" aria-label="Switch 3D concept render and Stitch view">
            <button type="button" class="hero-view-btn is-active" data-hero-view="store" data-hero-src="${render3dHeroUri}" data-hero-caption="3D Architectural Concept · Stage 2 Modular Rack & 12&quot; Kiosk Bay [A]" data-hero-alt="Photorealistic 3D architectural render of the Color-Play modular rack and 12-inch touch kiosk station in a modern retail department store." aria-pressed="true">3D Store Fixture</button>
            <button type="button" class="hero-view-btn" data-hero-view="closeup" data-hero-src="${render3dCloseupUri}" data-hero-caption="3D Industrial Design Macro · 45° Kiosk Console & Woven Textile Drapes [A]" data-hero-alt="Close-up 3D industrial design render of the 45-degree angled 12-inch kiosk touchscreen above four tactile fabric swatches." aria-pressed="false">12&quot; Kiosk Close-Up</button>
            <button type="button" class="hero-view-btn" data-hero-view="stage1" data-hero-src="${render3dStage1Uri}" data-hero-caption="3D Concept · Stage 1 Portable Discovery Rack with Swatch Binder (Zero Screen) [A]" data-hero-alt="3D render of the Stage 1 portable retail study rack with caster wheels, 5000K clip-on light bar, and analog swatch binder." aria-pressed="false">Stage 1 Portable</button>
            <button type="button" class="hero-view-btn" data-hero-view="stitch" data-hero-src="${stitchKioskUri}" data-hero-caption="Stitch Canvas · 12-Inch Touchscreen Kiosk UI Spec (Node d48957e4)" data-hero-alt="High-resolution Stitch UI design for the 12-inch touchscreen kiosk showing Cool Berry and Navy fabric comparison and Hooks 01, 03, 05 stock." aria-pressed="false">Stitch Kiosk UI</button>
          </div>
        </figure>
      </div>

      <!-- 3-STAGE SWITCHER -->
      <h2>Compare the three <span class="pink">in-store deployment stages.</span></h2>
      <div class="stage-tabs-bar" role="tablist" aria-label="In-store deployment stages">
        <button type="button" role="tab" class="stage-tab-btn" id="tab-stage1" data-stage-tab="stage1-portable" aria-selected="false" tabindex="-1">Stage 1 · Portable Rack Study</button>
        <button type="button" role="tab" class="stage-tab-btn" id="tab-stage2" data-stage-tab="stage2-station" aria-selected="true" tabindex="0" focusgroupstart>Stage 2 · Differentiated In-Store Station</button>
        <button type="button" role="tab" class="stage-tab-btn" id="tab-stage3" data-stage-tab="stage3-makeup-champion" aria-selected="false" tabindex="-1">Future Scope · Makeup Champion Bridge [A]</button>
      </div>

      <div class="stage-panels-stack">
        <!-- Stage 1 Panel -->
        <div role="tabpanel" class="stage-panel" aria-labelledby="tab-stage1" data-stage-panel="stage1-portable" hidden="until-found">
          <div class="stage-panel-inner">
            <div class="stage-headline-box">
              <span class="tag a">[A] Immediate Discovery Gate (A1–A2) · Zero Tech Integration</span>
              <h3>Portable human-assisted comparison beside the rack, with zero data capture.</h3>
              <p class="section-lead">Before investing in store hardware or IT approvals, Stage 1 tests whether explained color guidance changes real garment selection at the rack. A trained specialist uses physical fabric drapes and a curated 6-garment rail to connect a seasonal palette to 2–3 tops in stock.</p>
            </div>
            <div class="stage-specs-grid">
              <div class="stage-spec-item">
                <h4>Physical Store Footprint [A]</h4>
                <p>0.8 m² movable garment rail + physical fabric swatch book + clip-on neutral CRI 95+ daylight lamp. No fixed wiring or POS connection.</p>
              </div>
              <div class="stage-spec-item">
                <h4>In-Situ Shopper Flow [A]</h4>
                <p>Voluntary aisle invitation → 90-second physical fabric drape comparison → plain-language explanation → 2–3 tops pulled from the rack → free choice to try on or skip.</p>
              </div>
              <div class="stage-spec-item">
                <h4>Data &amp; Privacy Guardrail</h4>
                <p>Strict zero-capture protocol: no camera photos, no stored profiles, no email/phone collection, no CRM export, and no transaction linkage.</p>
              </div>
              <div class="stage-spec-item">
                <h4>Decision Gate to Pass [A]</h4>
                <p>Gate A1: Continue only if &ge; 4/5 shoppers select or want to try a suggested garment, median trust &ge; 4/5, and &le; 1 report feeling pressured.</p>
              </div>
            </div>
            <div class="stage-callouts-strip">
              <div class="stage-callout-cell">
                <strong>Rack Signage Copy</strong>
                <p>&ldquo;Unsure which color works beyond black or beige? Compare 3 tops on this rack — optional, 2 minutes, no photos.&rdquo;</p>
              </div>
              <div class="stage-callout-cell">
                <strong>Station Hardware</strong>
                <p>Physical swatch drape board + printed reference card (no screen required during initial 5-shopper observation).</p>
              </div>
              <div class="stage-callout-cell">
                <strong>Merchandising Stock Rule</strong>
                <p>Pre-selected capsule of 6 in-stock tops across 3 color families, verified at shift start.</p>
              </div>
              <div class="stage-callout-cell">
                <strong>No-Result Fallback</strong>
                <p>If store lighting is mixed or shopper disagrees, hand over familiar neutral options with zero friction.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Stage 2 Panel (Default Selected) -->
        <div role="tabpanel" class="stage-panel" aria-labelledby="tab-stage2" data-stage-panel="stage2-station">
          <div class="stage-panel-inner">
            <div class="stage-headline-box">
              <span class="tag a">[A] Conditional Recommendation (Deliverable 6) · Maximum Learning per Dependency</span>
              <h3>A dedicated rack-side touch station that connects explained palettes to live store stock.</h3>
              <p class="section-lead">Recommended in Deliverable 6 once A1–A3 pass: a compact fixture mounted directly to a featured apparel rack. It combines calibrated neutral illumination, physical fabric comparison tabs, and an interactive touch screen that points the shopper to 2–3 exact hooks and available sizes on that rack.</p>
            </div>
            <div class="stage-specs-grid">
              <div class="stage-spec-item">
                <h4>Physical Store Footprint [A]</h4>
                <p>1.2 m² end-cap or feature rack bay + 12&quot; angled touch terminal + upper CRI 95+ daylight canopy + 4 physical fabric comparison drapes.</p>
              </div>
              <div class="stage-spec-item">
                <h4>In-Situ Shopper Flow [A]</h4>
                <p>Tap to start at the rack (no login) → compare physical drape under neutral light → read plain-language palette rationale → pick 1–3 tops from Hooks 01–06 → take ephemeral rack pass to fitting room.</p>
              </div>
              <div class="stage-spec-item">
                <h4>Data &amp; Privacy Guardrail</h4>
                <p>Ephemeral session only: no facial biometric storage and no mandatory account creation. Screen auto-resets 15 seconds after garment selection or exit.</p>
              </div>
              <div class="stage-spec-item">
                <h4>Decision Gate to Pass [A]</h4>
                <p>Gates A2–A5: &ge; 80% agreement with two independent color specialists, &le; 15 pp coverage gap, written Operations owner, and viable unit contribution.</p>
              </div>
            </div>
            <div class="stage-callouts-strip">
              <div class="stage-callout-cell">
                <strong>Rack Signage Copy</strong>
                <p>&ldquo;Test color clarity at the rack. See why 3 available tops work for your contrast — or skip anytime.&rdquo;</p>
              </div>
              <div class="stage-callout-cell">
                <strong>Station Hardware</strong>
                <p>12&quot; anti-glare touch display (45° ergonomic tilt) + physical fabric swatch bar mounted below the bezel.</p>
              </div>
              <div class="stage-callout-cell">
                <strong>Merchandising Stock Rule</strong>
                <p>Hooks 01–06 mapped to live store SKU availability; out-of-stock cuts are suppressed before session start.</p>
              </div>
              <div class="stage-callout-cell">
                <strong>No-Result Fallback</strong>
                <p>First-class &ldquo;Unclear / No Result&rdquo; button routes to human associate drape check or clean exit without forced advice.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Stage 3 Panel -->
        <div role="tabpanel" class="stage-panel" aria-labelledby="tab-stage3" data-stage-panel="stage3-makeup-champion" hidden="until-found">
          <div class="stage-panel-inner">
            <div class="stage-headline-box">
              <span class="tag a">[A] Cross-Category Advocacy Hypothesis · Unvalidated Expansion Scope</span>
              <h3>Apparel owns the initial purchase; Makeup / Beauty champions the cross-category opportunity.</h3>
              <p class="section-lead">In the v12 Decision-Making Unit [A], Makeup / Beauty acts as the internal champion because undertone and contrast guidance naturally bridges clothing and cosmetics. However, apparel remains the first commercial scope: shade matching and cross-category demand require a separate validation gate.</p>
            </div>
            <div class="stage-specs-grid">
              <div class="stage-spec-item">
                <h4>Physical Store Footprint [A]</h4>
                <p>Apparel station positioned on the primary boundary aisle between Women&rsquo;s Apparel and the Beauty / Cosmetics floor.</p>
              </div>
              <div class="stage-spec-item">
                <h4>In-Situ Shopper Flow [A]</h4>
                <p>Complete apparel rack comparison first → optional undertone takeaway card (warm/cool/neutral-soft) to discuss with a Beauty Counter specialist.</p>
              </div>
              <div class="stage-spec-item">
                <h4>Scope Guardrail</h4>
                <p>No automated shade-matching camera claims and no cross-division profile database in the initial pilot.</p>
              </div>
              <div class="stage-spec-item">
                <h4>Commercial &amp; DMU Gate [A]</h4>
                <p>Appendix F Gate: Explicit Makeup champion advocacy and specialist access, while commercial budget signatory remains with Apparel Buying + Finance [A].</p>
              </div>
            </div>
            <div class="stage-callouts-strip">
              <div class="stage-callout-cell">
                <strong>Aisle Bridge Copy</strong>
                <p>&ldquo;Apparel first: find your garment palette here. Ask our Beauty counter how your undertone translates to lip &amp; cheek families [A].&rdquo;</p>
              </div>
              <div class="stage-callout-cell">
                <strong>Station Hardware</strong>
                <p>Apparel rack station with optional printed undertone bridge card (no automated cosmetic shade scanner).</p>
              </div>
              <div class="stage-callout-cell">
                <strong>Merchandising Stock Rule</strong>
                <p>100% anchored in available tops/shirts on the apparel rack; zero unverified cosmetic SKU claims.</p>
              </div>
              <div class="stage-callout-cell">
                <strong>Quality Boundary</strong>
                <p>Cosmetic shade matching requires in-person testing at the beauty counter after apparel validation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: INTERACTIVE 3D RACK-KIOSK VIEWER & 3D ARCHITECTURAL RENDERS -->
    <section class="paper-section" id="fixture-anatomy">
      <div class="section-meta">
        <span>Interactive 360° 3D Fixture Model &amp; Industrial Renders · Stages 1–3 [A]</span>
        <div class="brand-logos">
          <img class="color-logo" src="${colorLogoUri}" alt="Color logo">
          <img class="simple-tech-logo" src="${simpleTechUri}" alt="Simple Tech attribution">
        </div>
      </div>

      <h2>Explore the rack &amp; kiosk <span class="pink">in interactive 3D.</span></h2>
      <p class="section-lead">
        Drag to orbit the physical station in 3D, switch camera presets, toggle the <strong>5000K daylight canopy cone</strong>, or select any numbered component (<strong>01</strong>–<strong>05</strong>) to inspect hardware specifications across Stage 1 and Stage 2.
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
          <img src="${render3dHeroUri}" alt="Stage 2 modular rack and 12-inch kiosk station positioned inside a modern retail apparel floor">
          <strong>Stage 2 · In-Situ Bay Integration [A]</strong>
          <p>1.2 m² footprint pairing an angled 12&quot; touch kiosk, mirror bay, and 5000K canopy with 6 curated tops in stock.</p>
        </article>
        <article class="render-3d-card">
          <img src="${render3dCloseupUri}" alt="Close-up industrial design view of the tilted 12-inch kiosk housing and four real fabric swatches mounted underneath">
          <strong>Hardware Detail · Screen + Real Drapes [A]</strong>
          <p>Anti-glare 45° console directly above real woven fabric tabs so explanations stay grounded in tangible cloth.</p>
        </article>
        <article class="render-3d-card">
          <img src="${render3dStage1Uri}" alt="Stage 1 portable rolling rack with clip-on 5000K LED bar and analog printed drape guide without a screen">
          <strong>Stage 1 · Portable Discovery Study [A]</strong>
          <p>0.8 m² rolling fixture with clip-on daylight and analog swatch binder to validate A1–A2 before screen investment.</p>
        </article>
      </div>
    </section>

    <!-- SECTION 3: STITCH CANVAS & 12-INCH HARDWARE BEZEL SHOWCASE -->
    <section class="paper-section" id="stitch-showcase">
      <div class="section-meta">
        <span>Stitch Canvas Verification · Project 5268539669621980793</span>
        <div class="brand-logos">
          <img class="color-logo" src="${colorLogoUri}" alt="Color logo">
          <img class="simple-tech-logo" src="${simpleTechUri}" alt="Simple Tech attribution">
        </div>
      </div>

      <h2>Inspect the Stitch UI inside <span class="pink">the 12&quot; kiosk bezel.</span></h2>
      <p class="section-lead">
        Both the 12-inch touch interface (<code>node d48957e4</code>) and the full in-store system canvas (<code>node 10958707</code>) are generated and synced to <strong>Stitch Canvas</strong>. Toggle the hardware perspective below to preview how the Stitch screen sits inside the angled aluminum console above the four physical fabric tabs.
      </p>

      <div class="stitch-showcase-grid">
        <div class="stitch-bezel-stage">
          <div class="stitch-bezel-frame" id="stitch-bezel-frame">
            <div class="stitch-bezel-bar">
              <span>HARDWARE BAY A · 12&quot; ANTI-GLARE BEZEL (45° TILT)</span>
              <span>STITCH NODE d48957e4</span>
            </div>
            <img class="stitch-bezel-screen" src="${stitchKioskUri}" alt="Stitch Canvas 12-inch kiosk interface showing physical optical protocol, Cool Berry vs Warm Terracotta drapes, Hooks 01-05 inventory, and safe Unclear / No Result exit">
            <div class="stitch-drape-strip" aria-hidden="true">
              <div class="stitch-drape-tab" style="background:#b80a6b;" title="Drape 1: Cool Berry"></div>
              <div class="stitch-drape-tab" style="background:#d999be;" title="Drape 2: Soft Lavender Rose"></div>
              <div class="stitch-drape-tab" style="background:#b84a27;" title="Drape 3: Warm Terracotta"></div>
              <div class="stitch-drape-tab" style="background:#4a5d3f;" title="Drape 4: Muted Olive"></div>
            </div>
          </div>
          <div class="sim-action-row">
            <button type="button" class="btn-secondary" id="toggle-stitch-tilt" aria-pressed="false">Switch to 45° 3D Console Tilt</button>
            <button type="button" class="btn-primary" data-open-kiosk>Run Interactive Live Kiosk →</button>
          </div>
        </div>

        <aside class="stitch-meta-panel" aria-label="Stitch Canvas screens and synchronization details">
          <h3>Stitch Canvas Assets</h3>
          <p>Generated via <code>stitch generate screen</code> against our uploaded <code>DESIGN.md</code> tokens and design system (<code>Color-Play · Retail Color Guidance v12</code>).</p>
          <div class="stitch-thumb-card">
            <strong>01 · Brand &amp; Fixture Landing Canvas</strong>
            <img src="${stitchBrandUri}" alt="Full-page Stitch Canvas visualization of Color-Play architectural layout and evidence rubric">
            <p>Project <code>5268539669621980793</code> · Light editorial paper surface, fuchsia accents, and <code>[O]</code>/<code>[A]</code> notation.</p>
          </div>
          <div class="sim-action-row">
            <a class="btn-secondary" href="https://stitch.google.com/projects/5268539669621980793" target="_blank" rel="noopener noreferrer" style="text-decoration:none;padding:11px 16px;border-radius:10px;display:inline-flex;align-items:center;min-height:44px;">Open Stitch Project Canvas ↗</a>
          </div>
        </aside>
      </div>
    </section>

    <!-- SECTION 3: LIVE INTERACTIVE RACK STATION SIMULATOR -->
    <section class="paper-section" id="simulator">
      <div class="section-meta">
        <span>Interactive Touch Prototype · 12-Inch Rack-Side Guidance Terminal [A]</span>
        <div class="brand-logos">
          <img class="color-logo" src="${colorLogoUri}" alt="Color logo">
          <img class="simple-tech-logo" src="${simpleTechUri}" alt="Simple Tech attribution">
        </div>
      </div>

      <h2>Experience the shopper flow <span class="pink">at the garment rack.</span></h2>
      <p class="section-lead">
        Walk through all 4 steps below—or switch scenarios to see how the terminal explains a palette, links to 3 specific hooks on the rack, and enforces our mandatory <strong>No-Result / Safe Refusal</strong> route when store lighting is ambiguous.
      </p>

      <div class="sim-terminal-frame" id="simulator-inline-root"></div>

      <div class="telemetry-strip" id="telemetry-readout" aria-label="Ephemeral session telemetry counters"></div>
    </section>

    <!-- SECTION 4: RETAIL DMU & EVIDENCE GATES -->
    <section class="paper-section" id="dmu-gates">
      <div class="section-meta">
        <span>Retail Decision-Making Unit &amp; Assumption Log Gates · Proposed [A] vs. Observed [O]</span>
        <div class="brand-logos">
          <img class="color-logo" src="${colorLogoUri}" alt="Color logo">
          <img class="simple-tech-logo" src="${simpleTechUri}" alt="Simple Tech attribution">
        </div>
      </div>

      <h2>One retail buying unit. <span class="pink">Distinct in-store proof points.</span></h2>
      <p class="section-lead">
        Every physical detail of the in-situ prototype maps to a specific stakeholder in the proposed retail Decision-Making Unit [A] and an explicit Assumption Log gate (A1–A6).
      </p>

      <div class="dmu-grid">
        <article class="dmu-cell">
          <div class="dmu-cell-head">
            <h3>Apparel Merchandising / Buying</h3>
            <span class="tag a">[A] Proposed Buyer · Commercial Owner</span>
          </div>
          <p><strong>What they see in-situ:</strong> A merchandising-first fixture that directs shoppers to full-price seasonal tops already hanging on Hooks 01–06—not an abstract styling app.</p>
          <p><strong>Decision Gate (A3 &amp; A5):</strong> Written conditional pilot commitment naming budget owner and spending cap. Historical CLP 580 revenue vs. CLP 250 variable and CLP 660,000 fixed cost (breakeven 2,000 sessions vs. 660 capacity = &minus;CLP 442,200/month) remains an unviable historical scenario only; real quotes and service times come first.</p>
        </article>

        <article class="dmu-cell">
          <div class="dmu-cell-head">
            <h3>Makeup / Beauty Division</h3>
            <span class="tag a">[A] Proposed Champion · Internal Advocate</span>
          </div>
          <p><strong>What they see in-situ:</strong> A shared undertone and contrast vocabulary at the apparel rack that can later bridge shoppers to beauty counter consultations once apparel gates pass.</p>
          <p><strong>Scope Guardrail (Appendix F):</strong> Advocacy is not purchase authority. Apparel is the first commercial scope; cosmetic shade-matching accuracy and cross-category demand remain unvalidated [A].</p>
        </article>

        <article class="dmu-cell">
          <div class="dmu-cell-head">
            <h3>Fast-Fashion Shopper (Ages 18–28)</h3>
            <span class="tag o">[O] Survey Baseline (n=9) · [A] Behavioral Gate</span>
          </div>
          <p><strong>What they see in-situ:</strong> Optional 2-minute fabric comparison with plain-language explanations, 2–3 immediate tops on the rack, zero photo capture, and a stress-free exit.</p>
          <p><strong>Decision Gate (A1 &amp; A2):</strong> Among n=9 qualifying survey respondents, 8/9 rate usefulness highly and 9/9 report try-on intent [O, E2–E3]. Next test: observe 5 shoppers at a portable rack (&ge;4/5 select/try, median trust &ge;4/5, &le;1 pressure report).</p>
        </article>

        <article class="dmu-cell">
          <div class="dmu-cell-head">
            <h3>Store Associates &amp; Operations</h3>
            <span class="tag a">[A] Operator · Assisted B2B2C Delivery</span>
          </div>
          <p><strong>What they see in-situ:</strong> Clear hook numbering (<strong>Hooks 01–06</strong>) and a 60-second human drape fallback protocol that supports clienteling without turning associates into IT troubleshooters.</p>
          <p><strong>Decision Gate (A4 &amp; A6):</strong> Written Operations owner, measured invitation-to-try-on funnel, sustainable staff time limit, and verified shift stock freshness.</p>
        </article>
      </div>

      <div class="decision-banner">
        <div>
          <h3>Decision Now</h3>
          <span class="tag a" style="color:#ff8dce;">Gates A1–A6 Open</span>
        </div>
        <p>
          <strong>Fund learning, not rollout.</strong> Run the 5-shopper portable rack observation (A1) and specialist agreement benchmark (&ge;80% direct/adjacent agreement, A2) before building fixed store stations. Download the blank Assumption Log CSV or open the full 26-slide v12 Dossier below.
        </p>
      </div>

      <div class="sim-action-row">
        <a class="btn-primary" href="${csvUri}" download="Color-Play_Assumption_Log_Template.csv" style="text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-flex;align-items:center;min-height:44px;">Download Blank Assumption Log (.CSV)</a>
        <button type="button" class="btn-secondary" data-open-kiosk>Launch Fullscreen 12&quot; Kiosk Terminal</button>
      </div>
    </section>
  </main>

  <!-- NATIVE FULLSCREEN KIOSK MODAL DIALOG -->
  <dialog id="kiosk-dialog" closedby="any" aria-labelledby="kiosk-dialog-title">
    <div class="kiosk-dialog-header">
      <div class="brand-cluster">
        <img class="color-logo" src="${colorLogoUri}" alt="Color logo">
        <h2 id="kiosk-dialog-title" style="font-size:1.35rem;">12&quot; Rack-Side Terminal · Fullscreen Kiosk Mode</h2>
      </div>
      <button type="button" id="close-kiosk-dialog" class="btn-secondary" autofocus>Close Kiosk (Esc)</button>
    </div>
    <div id="simulator-kiosk-root" class="sim-terminal-frame"></div>
  </dialog>

  <canvas id="color-wave" aria-hidden="true"></canvas>

  <nav class="utility-bar" aria-label="Quick prototype controls">
    <a href="#stages">Stages</a>
    <a href="#fixture-anatomy">3D Rack</a>
    <a href="#stitch-showcase">Stitch</a>
    <a href="#simulator">Simulator</a>
    <button type="button" data-open-kiosk title="Open fullscreen kiosk mode">Kiosk</button>
    <button type="button" id="motion-toggle" aria-label="Pause animated background" aria-pressed="false" title="Pause animated background">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>
      <span class="control-label">Pause</span>
    </button>
  </nav>

  <footer class="site-footer">
    <span>Color-Play · Product Management I · Nicolas Inostrosa, Valeria Ravanal &amp; Rocio Torres</span>
    <span>[O] Observed survey self-report (n=9) · [A] Proposed hypothesis / gate · Zero validated [V] commercial claims</span>
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
