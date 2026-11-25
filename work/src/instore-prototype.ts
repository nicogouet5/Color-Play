import {
  FIXTURE_HOTSPOTS,
  STAGE_BLUEPRINTS
} from './data';
import {
  type CameraPresetId,
  initRack3DViewer,
  type Rack3DController
} from './rack3d';
import {
  initStoreMap,
  type StoreCameraPreset,
  type StoreFloorView,
  type StoreKioskFocusInfo,
  type StoreKioskId
} from './store-map';
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
      <h3>${escapeHtml(hotspot.title)}</h3>
      <p>${escapeHtml(stageModeLabel)} · hardware proposal</p>
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

  const map = document.querySelector<HTMLElement>('#store-map');
  const detail = document.querySelector<HTMLElement>('#fixture-detail');
  const locationLabel = document.querySelector<HTMLElement>('#fixture-location-label');
  const viewButtons = document.querySelectorAll<HTMLButtonElement>('[data-store-view]');
  const setView = (view: 'map' | 'fixture', location?: string) => {
    if (map) map.hidden = view !== 'map';
    if (detail) detail.hidden = view !== 'fixture';
    viewButtons.forEach((button) => {
      const active = button.dataset.storeView === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (view === 'fixture') {
      if (locationLabel && location) {
        locationLabel.textContent =
          location === "Women's clothing"
            ? "Selected placement: Floor 1 · Women's apparel entrance (Main mall boulevard)"
            : "Selected placement: Floor 2 · Men's apparel entrance (Escalator landing)";
      }
      rack3d?.renderNow();
      if (location) announcePolite(`${location} entrance selected. Showing kiosk detail.`);
    }
  };
  viewButtons.forEach((button) => button.addEventListener('click', () => {
    setView(button.dataset.storeView === 'map' ? 'map' : 'fixture');
  }));
  document.querySelector<HTMLButtonElement>('#back-to-store-map')?.addEventListener('click', () => {
    setView('map');
    document.querySelector<HTMLButtonElement>('[data-store-view="map"]')?.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-map-kiosk]').forEach((button) => {
    button.addEventListener('click', () => {
      setView('fixture', button.dataset.mapKiosk);
      document.querySelector<HTMLButtonElement>('[data-store-view="fixture"]')?.focus();
    });
  });

  const mapCanvas = document.querySelector<HTMLCanvasElement>('#store-map-canvas');
  if (mapCanvas) {
    const floorButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-map-floor]'));
    const presetButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-map-preset]'));
    const introPanel = document.querySelector<HTMLElement>('#store-kiosk-intro');
    const instructionBadge = document.querySelector<HTMLElement>('#store-map-instruction');
    const syncFloorButtons = (floor: StoreFloorView) => {
      for (const button of floorButtons) {
        const active = button.dataset.mapFloor === floor;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      }
    };
    const syncPresetButtons = (preset: StoreCameraPreset) => {
      for (const button of presetButtons) {
        const active = button.dataset.mapPreset === preset;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      }
    };

    const renderKioskIntro = (info: StoreKioskFocusInfo | null) => {
      if (!introPanel) return;
      if (!info) {
        introPanel.hidden = true;
        introPanel.innerHTML = '';
        if (instructionBadge) {
          instructionBadge.textContent =
            'Drag to orbit & tilt · Click a Color-Play pin (L1 / L2) to zoom into the kiosk';
        }
        return;
      }
      const otherId: StoreKioskId = info.id === 'womens' ? 'mens' : 'womens';
      const otherLabel = otherId === 'mens' ? 'Jump to Floor 2 kiosk' : 'Jump to Floor 1 kiosk';
      const badgeClass = info.id === 'womens' ? 'is-l1' : 'is-l2';
      introPanel.innerHTML = `
        <div class="store-kiosk-intro-head">
          <span class="store-floor-badge ${badgeClass}">${escapeHtml(info.badge)}</span>
          <button type="button" class="store-kiosk-close" data-intro-zoom-out aria-label="Zoom back out to store map">← Back out</button>
        </div>
        <h3>${escapeHtml(info.title)}</h3>
        <p class="store-kiosk-placement">${escapeHtml(info.placement)}</p>
        <p class="store-kiosk-copy">${escapeHtml(info.intro)}</p>
        <ul class="store-kiosk-highlights">
          ${info.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
        <div class="store-kiosk-intro-actions">
          <button type="button" class="is-primary" data-intro-open-fixture="${escapeHtml(info.location)}">Inspect full 3D kiosk →</button>
          <button type="button" class="is-secondary" data-intro-switch="${otherId}">${otherLabel}</button>
        </div>
      `;
      introPanel.hidden = false;
      if (instructionBadge) {
        instructionBadge.textContent = 'Close-up inside model · Drag to orbit around kiosk · Esc to zoom out';
      }
      announcePolite(`Zoomed into ${info.title}. ${info.placement}`);
      introPanel.querySelector<HTMLButtonElement>('[data-intro-zoom-out]')?.addEventListener('click', () => {
        storeModel.focusKiosk(null);
        mapCanvas.focus();
      });
      introPanel.querySelector<HTMLButtonElement>('[data-intro-open-fixture]')?.addEventListener('click', (event) => {
        const loc = (event.currentTarget as HTMLButtonElement).dataset.introOpenFixture;
        setView('fixture', loc);
        document.querySelector<HTMLButtonElement>('[data-store-view="fixture"]')?.focus();
      });
      introPanel.querySelector<HTMLButtonElement>('[data-intro-switch]')?.addEventListener('click', (event) => {
        const nextId = (event.currentTarget as HTMLButtonElement).dataset.introSwitch as StoreKioskId | undefined;
        if (nextId) storeModel.focusKiosk(nextId);
      });
    };

    const storeModel = initStoreMap(
      mapCanvas,
      renderKioskIntro,
      (floor) => {
        syncFloorButtons(floor);
        announcePolite(
          floor === 'all'
            ? 'Showing both store floors'
            : floor === 'floor1'
              ? "Showing Floor 1: Women's apparel"
              : "Showing Floor 2: Men's apparel"
        );
      }
    );

    for (const button of floorButtons) {
      button.addEventListener('click', () => {
        const floor = button.dataset.mapFloor as StoreFloorView | undefined;
        if (floor) storeModel.setFloor(floor);
      });
    }
    document.querySelectorAll<HTMLButtonElement>('[data-map-zoom-kiosk]').forEach((button) => {
      button.addEventListener('click', () => {
        const kioskId = button.dataset.mapZoomKiosk as StoreKioskId | undefined;
        if (kioskId) {
          storeModel.focusKiosk(kioskId);
          mapCanvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
    for (const button of presetButtons) {
      button.addEventListener('click', () => {
        const preset = button.dataset.mapPreset as StoreCameraPreset | undefined;
        if (preset) {
          storeModel.setPreset(preset);
          syncPresetButtons(preset);
        }
      });
    }
    document.querySelectorAll<HTMLButtonElement>('[data-map-rotate]').forEach((button) => {
      button.addEventListener('click', () => storeModel.rotate(Number(button.dataset.mapRotate) * 0.32));
    });
    document.querySelectorAll<HTMLButtonElement>('[data-map-zoom]').forEach((button) => {
      button.addEventListener('click', () => storeModel.zoomBy(Number(button.dataset.mapZoom) * 0.22));
    });
    document.querySelector<HTMLButtonElement>('#store-map-reset')?.addEventListener('click', () => {
      storeModel.reset();
      syncPresetButtons('isometric');
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
