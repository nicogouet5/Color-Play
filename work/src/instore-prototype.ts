import {
  FIXTURE_HOTSPOTS,
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
  ScenarioId
} from './types';
import {
  initVisionKioskApp,
  type VisionKioskController
} from './vision-kiosk';

let rack3d: Rack3DController | null = null;
let visionKiosk: VisionKioskController | null = null;

interface PrototypeState {
  activeStageId: DeploymentStageId;
  activeHotspotId: FixtureHotspotId;
  activeScenarioId: ScenarioId;
}

const state: PrototypeState = {
  activeStageId: 'stage2-station',
  activeHotspotId: 'touch-terminal',
  activeScenarioId: 'cool-winter'
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
      <span class="editorial-kicker">COMPONENT ${escapeHtml(hotspot.code)}</span>
      <h3>${escapeHtml(hotspot.title)}</h3>
      <span class="tag ${hotspot.evidenceTag === 'O' ? 'o' : 'a'}">[${hotspot.evidenceTag}] ${escapeHtml(stageModeLabel)}</span>
    </div>
    <p class="hotspot-spec">${escapeHtml(hotspot.physicalSpec)}</p>
    <div class="hotspot-comparison">
      <div class="hotspot-stage-col ${isStage1 ? 'is-highlighted' : ''}">
        <strong>STAGE 01 · PORTABLE DISCOVERY</strong>
        <p>${escapeHtml(hotspot.stage1Behavior)}</p>
      </div>
      <div class="hotspot-stage-col ${!isStage1 ? 'is-highlighted' : ''}">
        <strong>STAGE 02 · IN-STORE STATION</strong>
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

function initHeroGalleryAnd3DControls(): void {
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
    lightBtn.textContent = isOn ? '5000K Cone: On' : '5000K Cone: Off';
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
}

function initScrollMotionFallback(): void {
  // Fallback for browsers that do not support CSS Scroll-Driven Animations (view() + animation-range: entry)
  const supportsScrollDriven =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('(animation-timeline: view()) and (animation-range: entry)');
  const noReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: no-preference)'
  ).matches;

  if (!supportsScrollDriven && noReducedMotion) {
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>('.editorial-reveal')
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          const ratio = entry.intersectionRatio;
          target.style.transform = `translateY(${Math.round((1 - ratio) * 28)}px) scale(${0.985 + ratio * 0.015})`;
        }
      },
      {
        threshold: Array.from({ length: 21 }, (_, i) => i / 20)
      }
    );
    for (const el of revealItems) {
      observer.observe(el);
    }
  }
}

function bootstrap(): void {
  initStageTabs();
  initFixtureHotspots();
  initHeroGalleryAnd3DControls();
  visionKiosk = initVisionKioskApp({
    onRecommendationSync(scenarioId: ScenarioId) {
      state.activeScenarioId = scenarioId;
      rack3d?.setScenario(scenarioId);
    }
  });
  void visionKiosk;
  initScrollMotionFallback();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
