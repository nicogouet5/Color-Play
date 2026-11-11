export type EvidenceStatus = 'O' | 'A';

export type DeploymentStageId =
  | 'stage1-portable'
  | 'stage2-station'
  | 'stage3-makeup-champion';

export type FixtureHotspotId =
  | 'lighting-bar'
  | 'drape-rail'
  | 'touch-terminal'
  | 'curated-rack'
  | 'qr-handoff';

export type SimulatorStepId =
  | 'welcome'
  | 'scenario'
  | 'palette'
  | 'rack'
  | 'no-result'
  | 'associate'
  | 'safe-exit';

export type ScenarioId =
  | 'cool-winter'
  | 'warm-autumn'
  | 'soft-summer'
  | 'mixed-lighting';

export interface SwatchToken {
  name: string;
  hex: string;
  role: string;
  contrastNote: string;
}

export interface RackGarment {
  sku: string;
  title: string;
  cut: string;
  hookLocation: string;
  swatchName: string;
  swatchHex: string;
  secondaryHex: string;
  sizesAvailable: string[];
  fabricNote: string;
  whyItWorks: string;
  habitAlternative: string;
}

export interface ShopperScenario {
  id: ScenarioId;
  label: string;
  lightingCondition: string;
  lightingStatus: 'calibrated' | 'caution';
  undertoneSummary: string;
  confidenceNote: string;
  defaultHabitQuote: string;
  paletteTitle: string;
  explanation: string;
  swatches: SwatchToken[];
  avoidSwatches: { name: string; hex: string; reason: string }[];
  rackGarments: RackGarment[];
}

export interface FixtureHotspot {
  id: FixtureHotspotId;
  code: string;
  title: string;
  physicalSpec: string;
  stage1Behavior: string;
  stage2Behavior: string;
  evidenceTag: EvidenceStatus;
  evidenceNote: string;
}

export interface StageBlueprint {
  id: DeploymentStageId;
  tabLabel: string;
  badgeText: string;
  evidenceTag: EvidenceStatus;
  headline: string;
  summary: string;
  physicalFootprint: string;
  shopperFlow: string;
  associateRole: string;
  dataPrivacyRule: string;
  commercialGate: string;
  dmuOwner: string;
  fixtureCallouts: {
    topSignage: string;
    stationHardware: string;
    rackStockRule: string;
    fallbackProtocol: string;
  };
}

export interface DmuStakeholderCard {
  roleLabel: string;
  division: string;
  evidenceTag: EvidenceStatus;
  inStoreResponsibility: string;
  whatTheySeeInSitu: string;
  decisionGate: string;
}

export interface SessionTelemetry {
  sessionsStarted: number;
  palettesExplored: number;
  garmentsShortlisted: number;
  safeExitsOrRefusals: number;
  noResultFallbacks: number;
  associateHandoffs: number;
  selectedGarmentSkus: string[];
}
