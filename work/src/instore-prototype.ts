import {
  DMU_STAKEHOLDERS,
  FIXTURE_HOTSPOTS,
  SHOPPER_SCENARIOS,
  STAGE_BLUEPRINTS
} from './data';
import {
  type CameraPresetId,
  initRack3DViewer,
  type Rack3DController
} from './rack3d';
import type {
  DeploymentStageId,
  FixtureHotspotId,
  ScenarioId,
  SessionTelemetry,
  ShopperScenario,
  SimulatorStepId
} from './types';

let rack3d: Rack3DController | null = null;

interface PrototypeState {
  activeStageId: DeploymentStageId;
  activeHotspotId: FixtureHotspotId;
  simulatorStep: SimulatorStepId;
  activeScenarioId: ScenarioId;
  selectedSkus: string[];
  qrViewOpen: boolean;
  telemetry: SessionTelemetry;
}

const state: PrototypeState = {
  activeStageId: 'stage2-station',
  activeHotspotId: 'touch-terminal',
  simulatorStep: 'welcome',
  activeScenarioId: 'cool-winter',
  selectedSkus: ['CP-TOP-104', 'CP-TOP-108'],
  qrViewOpen: false,
  telemetry: {
    sessionsStarted: 1,
    palettesExplored: 1,
    garmentsShortlisted: 2,
    safeExitsOrRefusals: 0,
    noResultFallbacks: 0,
    associateHandoffs: 0,
    selectedGarmentSkus: ['CP-TOP-104', 'CP-TOP-108']
  }
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getActiveScenario(): ShopperScenario {
  return (
    SHOPPER_SCENARIOS.find((item) => item.id === state.activeScenarioId) ??
    SHOPPER_SCENARIOS[0]
  );
}

function announcePolite(message: string): void {
  const region = document.querySelector<HTMLElement>('#live-announcer');
  if (region) {
    region.textContent = message;
  }
}

function initStageTabs(): void {
  const tabs = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-stage-tab]')
  );
  const panels = Array.from(
    document.querySelectorAll<HTMLElement>('[data-stage-panel]')
  );

  function selectStage(stageId: DeploymentStageId, moveFocus = false): void {
    state.activeStageId = stageId;
    for (const tab of tabs) {
      const isSelected = tab.dataset.stageTab === stageId;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      tab.toggleAttribute('focusgroupstart', isSelected);
      if (isSelected && moveFocus) {
        tab.focus();
      }
    }

    for (const panel of panels) {
      const isMatch = panel.dataset.stagePanel === stageId;
      if (isMatch) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', 'until-found');
      }
    }

    renderFixtureDiagramState();
    rack3d?.setStage(stageId);
    const stage = STAGE_BLUEPRINTS.find((s) => s.id === stageId);
    if (stage) {
      announcePolite(`Viewing ${stage.tabLabel}`);
    }
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const id = tab.dataset.stageTab as DeploymentStageId | undefined;
      if (id) selectStage(id, false);
    });

    tab.addEventListener('keydown', (event: KeyboardEvent) => {
      const index = tabs.indexOf(tab);
      if (index === -1) return;
      let nextIndex = -1;
      if (event.key === 'ArrowRight') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      }
      if (nextIndex !== -1) {
        event.preventDefault();
        const nextId = tabs[nextIndex].dataset.stageTab as
          | DeploymentStageId
          | undefined;
        if (nextId) selectStage(nextId, true);
      }
    });
  }

  for (const panel of panels) {
    panel.addEventListener('beforematch', () => {
      const id = panel.dataset.stagePanel as DeploymentStageId | undefined;
      if (id) selectStage(id, false);
    });
  }
}

function renderFixtureDiagramState(): void {
  const hotspotButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-hotspot-btn]')
  );
  for (const button of hotspotButtons) {
    const active = button.dataset.hotspotBtn === state.activeHotspotId;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-active', active);
  }

  const hotspot =
    FIXTURE_HOTSPOTS.find((h) => h.id === state.activeHotspotId) ??
    FIXTURE_HOTSPOTS[0];
  const detailContainer = document.querySelector<HTMLElement>(
    '#hotspot-detail-card'
  );
  if (!detailContainer) return;

  const isStage1 = state.activeStageId === 'stage1-portable';
  const stageModeLabel = isStage1
    ? 'Stage 1 Portable Study Mode'
    : 'Stage 2 Differentiated Station Mode';

  detailContainer.innerHTML = `
    <div class="hotspot-detail-header">
      <h3>${escapeHtml(hotspot.code)} · ${escapeHtml(hotspot.title)}</h3>
      <span class="tag ${hotspot.evidenceTag === 'O' ? 'o' : 'a'}">[${hotspot.evidenceTag}] ${escapeHtml(stageModeLabel)}</span>
    </div>
    <p class="hotspot-spec">${escapeHtml(hotspot.physicalSpec)}</p>
    <div class="hotspot-comparison">
      <div class="hotspot-stage-col ${isStage1 ? 'is-highlighted' : ''}">
        <strong>Stage 1 · Portable Rack Study [A]</strong>
        <p>${escapeHtml(hotspot.stage1Behavior)}</p>
      </div>
      <div class="hotspot-stage-col ${!isStage1 ? 'is-highlighted' : ''}">
        <strong>Stage 2 · Differentiated Station [A]</strong>
        <p>${escapeHtml(hotspot.stage2Behavior)}</p>
      </div>
    </div>
    <p class="hotspot-evidence-note">${escapeHtml(hotspot.evidenceNote)}</p>
  `;
}

function initFixtureHotspots(): void {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-hotspot-btn]')
  );
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const id = button.dataset.hotspotBtn as FixtureHotspotId | undefined;
      if (!id) return;
      state.activeHotspotId = id;
      renderFixtureDiagramState();
      rack3d?.setActiveHotspot(id, true);
      const found = FIXTURE_HOTSPOTS.find((h) => h.id === id);
      if (found) {
        announcePolite(`Selected fixture component: ${found.title}`);
      }
    });
  }
  renderFixtureDiagramState();
}

function buildSimulatorMarkup(surfacePrefix: 'inline' | 'kiosk'): string {
  const scenario = getActiveScenario();
  const steps: { id: SimulatorStepId; label: string; number: string }[] = [
    { id: 'welcome', label: 'Invitation', number: '1' },
    { id: 'scenario', label: 'Drape & Light', number: '2' },
    { id: 'palette', label: 'Explained Palette', number: '3' },
    { id: 'rack', label: 'Rack Stock (2–3)', number: '4' }
  ];

  const stepHeader = `
    <div class="sim-chrome-bar">
      <div class="sim-terminal-id">
        <span class="sim-live-dot" aria-hidden="true"></span>
        <span>Rack Bay A · Terminal 01 · ${scenario.lightingStatus === 'calibrated' ? 'CRI 95+ 5000K Active' : 'Ambient Light Caution'}</span>
      </div>
      <div class="sim-privacy-pill">Zero camera · Zero stored profile · Auto-resets</div>
    </div>
    <nav class="sim-stepper" aria-label="${surfacePrefix === 'kiosk' ? 'Kiosk' : 'Inline'} station steps">
      ${steps
        .map((step) => {
          const isCurrent = state.simulatorStep === step.id;
          return `<button type="button" class="sim-step-btn ${isCurrent ? 'is-current' : ''}" data-sim-goto="${step.id}" ${isCurrent ? 'aria-current="step"' : ''}>
            <span class="sim-step-num">${step.number}</span>
            <span>${escapeHtml(step.label)}</span>
          </button>`;
        })
        .join('')}
    </nav>
  `;

  let bodyHtml = '';

  if (state.simulatorStep === 'welcome') {
    bodyHtml = `
      <div class="sim-screen-body sim-welcome-grid">
        <div class="sim-main-col">
          <h3>Unsure which color works beyond black, white, or beige?</h3>
          <p class="sim-lead">Compare physical fabric drapes right at this rack and see <strong>2 to 3 available tops</strong> in your contrast family—explained in plain language in under 2 minutes.</p>
          <ul class="sim-trust-list" role="list">
            <li><strong>Optional &amp; human-explained:</strong> You see why a tone sharpens or washes out collar contrast, never an opaque beauty score.</li>
            <li><strong>No camera, no profile, no email:</strong> Nothing is photographed or saved. Your session clears automatically when you walk away.</li>
            <li><strong>Safe to disagree or skip:</strong> If the lighting feels off or you prefer your usual colors, tap <em>No result / Prefer my own choice</em> anytime.</li>
          </ul>
          <div class="sim-action-row">
            <button type="button" class="btn-primary" data-sim-action="start-comparison">Compare colors at this rack</button>
            <button type="button" class="btn-secondary" data-sim-action="go-rack-direct">Skip to rack stock (Hooks 01–06)</button>
            <button type="button" class="btn-ghost" data-sim-action="safe-exit">Just browsing · No guidance</button>
          </div>
        </div>
        <aside class="sim-side-col" aria-label="Physical rack preview">
          <div class="sim-swatch-strip-preview">
            <strong>Physical Drape Bar Below Screen</strong>
            <p>Touch and hold the fabric tabs beneath this display against your sleeve or collar while comparing:</p>
            <div class="sim-mini-swatches">
              ${scenario.swatches
                .map(
                  (s) => `
                <div class="sim-mini-swatch">
                  <span class="swatch-chip" style="background:${s.hex}"></span>
                  <span>${escapeHtml(s.name)}</span>
                </div>`
                )
                .join('')}
            </div>
          </div>
        </aside>
      </div>
    `;
  } else if (state.simulatorStep === 'scenario') {
    bodyHtml = `
      <div class="sim-screen-body">
        <div class="sim-section-head">
          <h3>Step 2 · Compare physical fabric drapes under the rack light</h3>
          <p>Select a shopper contrast &amp; store lighting scenario below to see how the station responds (including our mandatory quality-gate fallback when lighting is unclear):</p>
        </div>
        <div class="sim-scenario-grid" role="group" aria-label="Shopper contrast and lighting scenarios">
          ${SHOPPER_SCENARIOS.map((item) => {
            const active = item.id === state.activeScenarioId;
            return `
              <button type="button" class="sim-scenario-card ${active ? 'is-selected' : ''} ${item.lightingStatus === 'caution' ? 'is-caution' : ''}" data-sim-scenario="${item.id}" aria-pressed="${active}">
                <div class="sim-scenario-top">
                  <strong>${escapeHtml(item.label)}</strong>
                  <span class="tag ${item.lightingStatus === 'caution' ? 'a' : 'o'}">${item.lightingStatus === 'caution' ? 'Quality Gate Fallback' : 'Calibrated 5000K'}</span>
                </div>
                <p class="sim-scenario-sub">${escapeHtml(item.undertoneSummary)}</p>
                <div class="sim-scenario-swatches" aria-hidden="true">
                  ${item.swatches.map((sw) => `<i style="background:${sw.hex}" title="${escapeHtml(sw.name)}"></i>`).join('')}
                </div>
              </button>
            `;
          }).join('')}
        </div>
        <div class="sim-active-scenario-banner">
          <div>
            <strong>Shopper habit context [O, E1]:</strong>
            <p>${escapeHtml(scenario.defaultHabitQuote)}</p>
          </div>
          <div class="sim-action-row">
            ${
              scenario.id === 'mixed-lighting'
                ? `<button type="button" class="btn-primary" data-sim-action="trigger-no-result">Inspect Quality Gate (No-Result Route)</button>
                   <button type="button" class="btn-secondary" data-sim-action="ask-associate">Ask associate for human drape check</button>`
                : `<button type="button" class="btn-primary" data-sim-action="view-palette">See explained palette &amp; reason to believe</button>
                   <button type="button" class="btn-secondary" data-sim-action="trigger-no-result">Lighting feels unclear / No result</button>`
            }
            <button type="button" class="btn-ghost" data-sim-action="safe-exit">Exit</button>
          </div>
        </div>
      </div>
    `;
  } else if (state.simulatorStep === 'palette') {
    bodyHtml = `
      <div class="sim-screen-body">
        <div class="sim-section-head">
          <h3>Step 3 · ${escapeHtml(scenario.paletteTitle)}</h3>
          <p>${escapeHtml(scenario.explanation)}</p>
        </div>
        <div class="sim-palette-columns">
          <div class="sim-palette-recommended">
            <strong>Recommended Palette on This Rack (Drape Match)</strong>
            <div class="sim-swatch-cards">
              ${scenario.swatches
                .map(
                  (sw) => `
                <article class="sim-swatch-card">
                  <div class="sim-swatch-color" style="background:${sw.hex}"></div>
                  <div class="sim-swatch-info">
                    <strong>${escapeHtml(sw.name)} <code>${sw.hex}</code></strong>
                    <span class="sim-swatch-role">${escapeHtml(sw.role)}</span>
                    <p>${escapeHtml(sw.contrastNote)}</p>
                  </div>
                </article>
              `
                )
                .join('')}
            </div>
          </div>
          <div class="sim-palette-avoid">
            <strong>Why Familiar Defaults Often Get Discarded [O, E1]</strong>
            <p class="sim-avoid-intro">In our qualifying survey, 8/9 shoppers defaulted to safe colors and 7/9 discarded garments later. Here is what to watch out for next to your collar:</p>
            ${
              scenario.avoidSwatches.length > 0
                ? scenario.avoidSwatches
                    .map(
                      (av) => `
                  <div class="sim-avoid-item">
                    <span class="swatch-chip" style="background:${av.hex}"></span>
                    <div>
                      <strong>${escapeHtml(av.name)}</strong>
                      <p>${escapeHtml(av.reason)}</p>
                    </div>
                  </div>
                `
                    )
                    .join('')
                : `<p class="sim-avoid-intro">Under mixed store lighting, automated exclusions are paused so we never steer you away from a garment on a low-confidence reading.</p>`
            }
            <div class="sim-specialist-gate">
              <strong>Quality Gate Benchmark (Appendix E) [A]</strong>
              <p>${escapeHtml(scenario.confidenceNote)}. If you disagree with this palette, you can switch scenarios or browse the rack directly.</p>
            </div>
          </div>
        </div>
        <div class="sim-action-row">
          <button type="button" class="btn-primary" data-sim-action="view-rack">Show ${scenario.rackGarments.length} matching tops on this rack</button>
          <button type="button" class="btn-secondary" data-sim-action="ask-associate">I disagree · Ask associate for second opinion</button>
          <button type="button" class="btn-ghost" data-sim-action="safe-exit">Prefer my usual colors · Exit</button>
        </div>
      </div>
    `;
  } else if (state.simulatorStep === 'rack') {
    bodyHtml = `
      <div class="sim-screen-body">
        <div class="sim-section-head">
          <h3>Step 4 · Available Garments on This Rack (${scenario.rackGarments.length} In-Stock Matches)</h3>
          <p>Tap 1 to 3 tops below to highlight their physical hook location on Rack Bay A/B and generate an ephemeral fitting-room slip (zero personal data stored):</p>
        </div>
        <div class="sim-garments-grid">
          ${scenario.rackGarments
            .map((g) => {
              const isSelected = state.selectedSkus.includes(g.sku);
              return `
              <article class="sim-garment-card ${isSelected ? 'is-selected' : ''}">
                <div class="sim-garment-visual" style="background: linear-gradient(135deg, ${g.swatchHex} 0%, ${g.secondaryHex} 100%);">
                  <span class="sim-hook-badge">${escapeHtml(g.hookLocation)}</span>
                  <span class="sim-sku-badge">${escapeHtml(g.sku)}</span>
                </div>
                <div class="sim-garment-content">
                  <h4>${escapeHtml(g.title)}</h4>
                  <p class="sim-garment-cut">${escapeHtml(g.cut)} · Sizes: <strong>${escapeHtml(g.sizesAvailable.join(', '))}</strong></p>
                  <p class="sim-garment-why"><strong>Why it works:</strong> ${escapeHtml(g.whyItWorks)}</p>
                  <p class="sim-garment-habit">${escapeHtml(g.habitAlternative)} · ${escapeHtml(g.fabricNote)}</p>
                  <button type="button" class="sim-select-garment-btn ${isSelected ? 'is-picked' : ''}" data-toggle-sku="${escapeHtml(g.sku)}" aria-pressed="${isSelected}">
                    ${isSelected ? 'Selected for Fitting Room (Tap to remove)' : 'Select Hook for Fitting Room'}
                  </button>
                </div>
              </article>
            `;
            })
            .join('')}
        </div>
        <div class="sim-handoff-strip">
          <div>
            <strong>Fitting-Room Handoff (${state.selectedSkus.length} selected):</strong>
            <p>${
              state.selectedSkus.length > 0
                ? `Pull from ${scenario.rackGarments
                    .filter((g) => state.selectedSkus.includes(g.sku))
                    .map((g) => `${g.hookLocation} (${g.title})`)
                    .join(' · ')}.`
                : 'Select at least one garment hook above, or choose a safe exit below if none of these cuts fit your style.'
            }</p>
          </div>
          <div class="sim-action-row">
            <button type="button" class="btn-primary" data-sim-action="toggle-qr-pass">${state.qrViewOpen ? 'Hide Fitting-Room Slip' : 'View Ephemeral Fitting-Room Slip'}</button>
            <button type="button" class="btn-secondary" data-sim-action="ask-associate">Ask associate for another size / cut</button>
            <button type="button" class="btn-ghost" data-sim-action="safe-exit">None of these fit my style · Finish</button>
          </div>
        </div>
        ${
          state.qrViewOpen
            ? `
          <div class="sim-ephemeral-pass" role="region" aria-label="Ephemeral fitting-room rack pass">
            <div>
              <strong>Ephemeral Rack Pass · Zero CRM / Zero Profile Storage</strong>
              <p>Take these hooks directly to the fitting room or show this code to a store associate. No phone number, photo, or personal profile is created.</p>
              <p class="sim-pass-hooks"><strong>Active Hooks:</strong> ${escapeHtml(
                scenario.rackGarments
                  .filter((g) => state.selectedSkus.includes(g.sku))
                  .map((g) => `${g.hookLocation} · ${g.swatchName}`)
                  .join(' | ') || 'None selected'
              )}</p>
            </div>
            <div class="sim-qr-box" aria-hidden="true">
              <svg viewBox="0 0 80 80" role="img" aria-label="Offline rack pass code">
                <rect width="80" height="80" fill="#ffffff"/>
                <rect x="8" y="8" width="22" height="22" fill="none" stroke="#201b27" stroke-width="4"/>
                <rect x="14" y="14" width="10" height="10" fill="#b80a6b"/>
                <rect x="50" y="8" width="22" height="22" fill="none" stroke="#201b27" stroke-width="4"/>
                <rect x="56" y="14" width="10" height="10" fill="#201b27"/>
                <rect x="8" y="50" width="22" height="22" fill="none" stroke="#201b27" stroke-width="4"/>
                <rect x="14" y="56" width="10" height="10" fill="#201b27"/>
                <rect x="38" y="38" width="10" height="10" fill="#b80a6b"/>
                <rect x="54" y="42" width="16" height="6" fill="#201b27"/>
                <rect x="40" y="56" width="14" height="14" fill="none" stroke="#201b27" stroke-width="4"/>
                <rect x="60" y="58" width="12" height="12" fill="#b80a6b"/>
              </svg>
              <span>Auto-clears in 15s</span>
            </div>
          </div>
        `
            : ''
        }
      </div>
    `;
  } else if (state.simulatorStep === 'no-result') {
    bodyHtml = `
      <div class="sim-screen-body sim-outcome-box">
        <h3>Quality Gate Active · No Forced Color Verdict</h3>
        <p class="sim-lead">When store spotlights skew fabric perception or an undertone sits on a close boundary, Color-Play halts automated recommendations rather than guessing.</p>
        <div class="sim-outcome-cards">
          <div class="sim-outcome-col">
            <strong>Option A · 60-Second Human Drape Check</strong>
            <p>Step 50 cm left to the physical fabric drape bar under the neutral canopy, or ask a store associate to compare Cool Berry vs. Warm Terracotta at the collar.</p>
          </div>
          <div class="sim-outcome-col">
            <strong>Option B · Browse Safe Universal Mid-Tones</strong>
            <p>Rack Bay A · Hook 03 holds balanced plum-slate and sage cuts designed to work across warm and cool lighting without wash-out.</p>
          </div>
        </div>
        <div class="sim-action-row">
          <button type="button" class="btn-primary" data-sim-action="ask-associate">Request Associate Drape Check</button>
          <button type="button" class="btn-secondary" data-sim-action="retry-calibrated">Retake under calibrated 5000K preset</button>
          <button type="button" class="btn-ghost" data-sim-action="reset-welcome">End session (0 bytes stored)</button>
        </div>
      </div>
    `;
  } else if (state.simulatorStep === 'associate') {
    bodyHtml = `
      <div class="sim-screen-body sim-outcome-box">
        <h3>Associate Handoff Queued · Assisted B2B2C Protocol</h3>
        <p class="sim-lead">A floor associate receives the short rack context below—never a personal profile—so the conversation stays under 90 seconds and focused on garments in stock.</p>
        <div class="sim-outcome-cards">
          <div class="sim-outcome-col">
            <strong>What the Associate Sees</strong>
            <p>Active Scenario: <strong>${escapeHtml(scenario.label)}</strong> · Requested Hooks: <strong>${escapeHtml(state.selectedSkus.join(', ') || 'General rack comparison')}</strong>.</p>
          </div>
          <div class="sim-outcome-col">
            <strong>Operational Guardrail (Gate A4) [A]</strong>
            <p>Associate validates fabric texture in person, offers one familiar control garment alongside the suggested hue, and respects an immediate pass if the shopper is not convinced.</p>
          </div>
        </div>
        <div class="sim-action-row">
          <button type="button" class="btn-primary" data-sim-action="view-rack">Return to Rack Matches</button>
          <button type="button" class="btn-secondary" data-sim-action="reset-welcome">Complete Handoff &amp; Clear Screen</button>
        </div>
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="sim-screen-body sim-outcome-box">
        <h3>Session Cleared · Shopper Agency Preserved</h3>
        <p class="sim-lead">Choosing familiar colors, skipping guidance, or disagreeing with a palette is a valid, first-class outcome in Color-Play.</p>
        <p>Zero photos, zero profile records, and zero contact details were captured during this interaction. The terminal is ready for the next shopper at the rack.</p>
        <div class="sim-action-row">
          <button type="button" class="btn-primary" data-sim-action="reset-welcome">Start New Rack Session</button>
        </div>
      </div>
    `;
  }

  return `${stepHeader}${bodyHtml}`;
}

function renderTelemetryStrip(): void {
  const container = document.querySelector<HTMLElement>('#telemetry-readout');
  if (!container) return;
  const t = state.telemetry;
  container.innerHTML = `
    <div class="telemetry-item">
      <span class="telemetry-num">${t.sessionsStarted}</span>
      <span class="telemetry-label">Rack Invitations Started (Gate A4)</span>
    </div>
    <div class="telemetry-item">
      <span class="telemetry-num">${t.palettesExplored}</span>
      <span class="telemetry-label">Explained Palettes Viewed (Gate A2)</span>
    </div>
    <div class="telemetry-item">
      <span class="telemetry-num">${t.garmentsShortlisted}</span>
      <span class="telemetry-label">Rack Garments Shortlisted (Gate A1)</span>
    </div>
    <div class="telemetry-item">
      <span class="telemetry-num">${t.noResultFallbacks + t.safeExitsOrRefusals}</span>
      <span class="telemetry-label">Safe Refusals / No-Result Routes Logged</span>
    </div>
  `;
}

function renderAllSimulatorSurfaces(): void {
  const inlineRoot = document.querySelector<HTMLElement>(
    '#simulator-inline-root'
  );
  if (inlineRoot) {
    inlineRoot.innerHTML = buildSimulatorMarkup('inline');
  }
  const kioskRoot = document.querySelector<HTMLElement>(
    '#simulator-kiosk-root'
  );
  if (kioskRoot) {
    kioskRoot.innerHTML = buildSimulatorMarkup('kiosk');
  }
  renderTelemetryStrip();
}

function handleSimulatorClick(event: Event): void {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const gotoBtn = target.closest<HTMLButtonElement>('[data-sim-goto]');
  if (gotoBtn?.dataset.simGoto) {
    state.simulatorStep = gotoBtn.dataset.simGoto as SimulatorStepId;
    renderAllSimulatorSurfaces();
    announcePolite(`Simulator step changed to ${state.simulatorStep}`);
    return;
  }

  const scenarioBtn = target.closest<HTMLButtonElement>('[data-sim-scenario]');
  if (scenarioBtn?.dataset.simScenario) {
    const nextScenarioId = scenarioBtn.dataset.simScenario as ScenarioId;
    state.activeScenarioId = nextScenarioId;
    const sc = getActiveScenario();
    state.selectedSkus = sc.rackGarments.slice(0, 2).map((g) => g.sku);
    state.telemetry.selectedGarmentSkus = [...state.selectedSkus];
    rack3d?.setScenario(nextScenarioId);
    renderAllSimulatorSurfaces();
    announcePolite(`Selected scenario: ${sc.label}`);
    return;
  }

  const skuBtn = target.closest<HTMLButtonElement>('[data-toggle-sku]');
  if (skuBtn?.dataset.toggleSku) {
    const sku = skuBtn.dataset.toggleSku;
    if (state.selectedSkus.includes(sku)) {
      state.selectedSkus = state.selectedSkus.filter((item) => item !== sku);
    } else {
      state.selectedSkus = [...state.selectedSkus, sku];
      state.telemetry.garmentsShortlisted += 1;
    }
    state.telemetry.selectedGarmentSkus = [...state.selectedSkus];
    renderAllSimulatorSurfaces();
    announcePolite(
      `Rack garment ${sku} ${state.selectedSkus.includes(sku) ? 'selected' : 'removed'}`
    );
    return;
  }

  const actionBtn = target.closest<HTMLButtonElement>('[data-sim-action]');
  if (!actionBtn?.dataset.simAction) return;

  const action = actionBtn.dataset.simAction;
  switch (action) {
    case 'start-comparison':
      state.simulatorStep = 'scenario';
      state.telemetry.sessionsStarted += 1;
      break;
    case 'go-rack-direct':
      state.simulatorStep = 'rack';
      break;
    case 'view-palette':
      state.simulatorStep = 'palette';
      state.telemetry.palettesExplored += 1;
      break;
    case 'view-rack':
      state.simulatorStep = 'rack';
      break;
    case 'toggle-qr-pass':
      state.qrViewOpen = !state.qrViewOpen;
      break;
    case 'trigger-no-result':
      state.simulatorStep = 'no-result';
      state.telemetry.noResultFallbacks += 1;
      break;
    case 'ask-associate':
      state.simulatorStep = 'associate';
      state.telemetry.associateHandoffs += 1;
      break;
    case 'retry-calibrated':
      state.activeScenarioId = 'cool-winter';
      state.simulatorStep = 'palette';
      state.telemetry.palettesExplored += 1;
      break;
    case 'safe-exit':
      state.simulatorStep = 'safe-exit';
      state.qrViewOpen = false;
      state.telemetry.safeExitsOrRefusals += 1;
      break;
    case 'reset-welcome':
      state.simulatorStep = 'welcome';
      state.qrViewOpen = false;
      break;
    default:
      break;
  }
  renderAllSimulatorSurfaces();
  announcePolite(`Simulator updated: ${state.simulatorStep}`);
}

function initKioskDialog(): void {
  const dialog = document.querySelector<HTMLDialogElement>('#kiosk-dialog');
  const openers = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-open-kiosk]')
  );
  const closer = document.querySelector<HTMLButtonElement>(
    '#close-kiosk-dialog'
  );

  if (!dialog) return;

  for (const opener of openers) {
    opener.addEventListener('click', () => {
      renderAllSimulatorSurfaces();
      if (!dialog.open) {
        dialog.showModal();
        announcePolite('Opened fullscreen in-store kiosk terminal');
      }
    });
  }

  closer?.addEventListener('click', () => {
    if (dialog.open) {
      dialog.close('closed-by-user');
    }
  });

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
    announcePolite('Closed fullscreen kiosk terminal');
  });

  // Fallback for light-dismiss where native closedby="any" is not yet supported
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const isOutside = (e: PointerEvent, d: HTMLDialogElement): boolean => {
      const rect = d.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e: PointerEvent) => {
      pressedOutside = isOutside(e, dialog);
    });
    dialog.addEventListener('pointerup', (e: PointerEvent) => {
      if (pressedOutside && isOutside(e, dialog)) {
        dialog.close();
      }
    });
  }
}

function initPaletteWaveCanvas(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#color-wave');
  const button = document.querySelector<HTMLButtonElement>('#motion-toggle');
  if (!canvas || !button) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    button.hidden = true;
    return;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const printMedia = window.matchMedia('print');
  const storageKey = 'color-play-border-paused';
  let paused = false;
  let printing = false;
  let raf = 0;
  let last: number | null = null;
  let phase = 0;
  let width = 0;
  let height = 0;

  try {
    paused = window.localStorage.getItem(storageKey) === 'true';
  } catch {
    paused = false;
  }

  function paint(): void {
    if (!ctx) return;
    ctx.fillStyle = '#eee7ef';
    ctx.fillRect(0, 0, width, height);
    const mobile = width < 700;
    const colors = ['#d5b8d7', '#d999be', '#bda9ce', '#e5bed1'];
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 4; i++) {
        const wave = Math.sin(phase * 0.22 + i * 0.9 + side) * 24;
        const edge = side ? width + 45 : -45;
        const direction = side ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(edge + direction * (i * 17 + wave), -80);
        ctx.bezierCurveTo(
          edge + direction * (mobile ? 85 : 180),
          height * 0.25 + wave * 3,
          edge - direction * 75,
          height * 0.6 - wave * 2,
          edge + direction * (i * 32 + 50),
          height + 80
        );
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = mobile ? 18 : 34;
        ctx.stroke();
      }
    }
  }

  function resize(): void {
    if (!canvas || !ctx) return;
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint();
  }

  function frame(now: number): void {
    if (last === null) last = now;
    if (now - last >= 1000 / 20) {
      phase += Math.min(now - last, 100) / 1000;
      last = now;
      paint();
    }
    raf = window.requestAnimationFrame(frame);
  }

  function sync(): void {
    if (!button) return;
    window.cancelAnimationFrame(raf);
    raf = 0;
    last = null;
    const blocked = document.hidden || printing || printMedia.matches;
    const motionState = reduced.matches
      ? 'reduced'
      : paused
        ? 'paused'
        : blocked
          ? 'hidden'
          : 'running';
    document.documentElement.dataset.borderMotion = motionState;
    const stopped = paused || reduced.matches;
    const label = reduced.matches
      ? 'Motion reduced'
      : paused
        ? 'Resume animated background'
        : 'Pause animated background';
    button.disabled = reduced.matches;
    button.setAttribute('aria-pressed', String(stopped));
    button.setAttribute('aria-label', label);
    button.title = label;
    const svg = button.querySelector('svg');
    if (svg) {
      svg.innerHTML = stopped
        ? '<path d="m8 5 11 7-11 7z"/>'
        : '<path d="M8 5v14M16 5v14"/>';
    }
    const labelSpan = button.querySelector('.control-label');
    if (labelSpan) {
      labelSpan.textContent = reduced.matches
        ? 'Motion reduced'
        : paused
          ? 'Resume'
          : 'Pause';
    }
    if (motionState === 'running') {
      raf = window.requestAnimationFrame(frame);
    }
  }

  button.addEventListener('click', () => {
    paused = !paused;
    try {
      window.localStorage.setItem(storageKey, String(paused));
    } catch {
      // Ignore storage errors in restricted contexts
    }
    sync();
  });

  reduced.addEventListener('change', sync);
  printMedia.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('beforeprint', () => {
    printing = true;
    sync();
  });
  window.addEventListener('afterprint', () => {
    printing = false;
    sync();
  });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  sync();
}

function initHeroGalleryAnd3DControls(): void {
  // 1. Hero 3D Concept & Stitch View Switcher
  const heroMainImg = document.querySelector<HTMLImageElement>('#hero-main-img');
  const heroMainCaption =
    document.querySelector<HTMLElement>('#hero-main-caption');
  const heroViewBtns = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-hero-view]')
  );

  for (const btn of heroViewBtns) {
    btn.addEventListener('click', () => {
      const src = btn.dataset.heroSrc;
      const alt = btn.dataset.heroAlt;
      const caption = btn.dataset.heroCaption;
      if (heroMainImg && src) {
        heroMainImg.src = src;
        if (alt) heroMainImg.alt = alt;
      }
      if (heroMainCaption && caption) {
        heroMainCaption.textContent = caption;
      }
      for (const b of heroViewBtns) {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      }
      if (caption) {
        announcePolite(`Hero view switched: ${caption}`);
      }
    });
  }

  // 2. Interactive 360° 3D Rack-Kiosk Viewer
  const canvas3d = document.querySelector<HTMLCanvasElement>('#rack-3d-canvas');
  if (canvas3d) {
    rack3d = initRack3DViewer({
      canvas: canvas3d,
      onSelectHotspot(hotspotId: FixtureHotspotId) {
        state.activeHotspotId = hotspotId;
        renderFixtureDiagramState();
        rack3d?.setActiveHotspot(hotspotId, true);
        const found = FIXTURE_HOTSPOTS.find((h) => h.id === hotspotId);
        if (found) {
          announcePolite(`Selected 3D fixture pin: ${found.title}`);
        }
      },
      getInitialStage: () => state.activeStageId,
      getInitialHotspot: () => state.activeHotspotId,
      getInitialScenario: () => state.activeScenarioId
    });
  }

  const camPresetBtns = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-cam-preset]')
  );
  for (const btn of camPresetBtns) {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.camPreset as CameraPresetId | undefined;
      if (!preset) return;
      rack3d?.setCameraPreset(preset);
      for (const b of camPresetBtns) {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      }
      const orbitBtn =
        document.querySelector<HTMLButtonElement>('#toggle-3d-orbit');
      if (orbitBtn) {
        orbitBtn.classList.remove('is-active');
        orbitBtn.setAttribute('aria-pressed', 'false');
      }
      announcePolite(`3D camera preset: ${preset}`);
    });
  }

  const lightBtn =
    document.querySelector<HTMLButtonElement>('#toggle-3d-light');
  lightBtn?.addEventListener('click', () => {
    if (!rack3d) return;
    const isOn = rack3d.toggleDaylightCone();
    lightBtn.classList.toggle('is-active', isOn);
    lightBtn.setAttribute('aria-pressed', String(isOn));
    announcePolite(`5000K daylight cone ${isOn ? 'enabled' : 'disabled'}`);
  });

  const orbitBtn =
    document.querySelector<HTMLButtonElement>('#toggle-3d-orbit');
  orbitBtn?.addEventListener('click', () => {
    if (!rack3d) return;
    const isOrbiting = rack3d.toggleAutoRotate();
    orbitBtn.classList.toggle('is-active', isOrbiting);
    orbitBtn.setAttribute('aria-pressed', String(isOrbiting));
    announcePolite(`360 auto-orbit ${isOrbiting ? 'started' : 'stopped'}`);
  });

  // 3. Stitch 3D Hardware Bezel Tilt Toggle
  const stitchTiltFrame = document.querySelector<HTMLElement>(
    '#stitch-bezel-frame'
  );
  const stitchTiltBtn = document.querySelector<HTMLButtonElement>(
    '#toggle-stitch-tilt'
  );
  stitchTiltBtn?.addEventListener('click', () => {
    if (!stitchTiltFrame) return;
    const isTilted = stitchTiltFrame.classList.toggle('is-tilted-3d');
    stitchTiltBtn.setAttribute('aria-pressed', String(isTilted));
    stitchTiltBtn.textContent = isTilted
      ? 'Switch to Flat 1:1 UI View'
      : 'Switch to 45° 3D Console Tilt';
    announcePolite(
      isTilted
        ? 'Viewing Stitch screen in 45-degree 3D console tilt'
        : 'Viewing Stitch screen in flat 1:1 inspection mode'
    );
  });
}

function bootstrap(): void {
  // Export data reference count on documentElement for automated verification
  document.documentElement.dataset.dmuCount = String(DMU_STAKEHOLDERS.length);
  initStageTabs();
  initFixtureHotspots();
  initHeroGalleryAnd3DControls();
  renderAllSimulatorSurfaces();

  const inlineSim = document.querySelector<HTMLElement>(
    '#simulator-inline-root'
  );
  const kioskSim = document.querySelector<HTMLElement>('#simulator-kiosk-root');
  inlineSim?.addEventListener('click', handleSimulatorClick);
  kioskSim?.addEventListener('click', handleSimulatorClick);

  initKioskDialog();
  initPaletteWaveCanvas();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
