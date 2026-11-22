import type { FixtureHotspot, StageBlueprint } from './types';

export const STAGE_BLUEPRINTS: StageBlueprint[] = [
  {
    id: 'stage1-portable', tabLabel: 'Discovery', badgeText: 'Four weeks · proposed', evidenceTag: 'A',
    headline: 'Agree the Merchant problem before integrating.',
    summary: 'Discovery with Ripley Merchants / Apparel Buying, Store Operations, IT/Data, CRM and privacy stakeholders. No retailer access or approval is confirmed.',
    physicalFootprint: 'Portable rack and existing concept renders; hardware specifications and supplier quotes remain to be validated.',
    shopperFlow: 'Test the RUT-first and camera-consent journey using demo identifiers, sample images and a traceable research protocol.',
    associateRole: 'Recruit suitable participants, explain consent and record contradictory findings without presenting the survey as behavioral proof.',
    dataPrivacyRule: 'No real identifiers in discovery. Public browser demo is memory-only; no camera image or RUT is sent to a server.',
    commercialGate: 'Agree pilot KPIs, permission to test, controller, retention, stock interface and earn-out measurement before a real store pilot.',
    dmuOwner: 'Proposed buyer: Ripley Merchants. Approvals: Finance, Operations, IT/Data and Legal/Privacy.',
    fixtureCallouts: { topSignage: 'Color clarity at the rack.', stationHardware: 'Portable study fixture.', rackStockRule: 'Demo garments only.', fallbackProtocol: 'No-result and safe exit always available.' }
  },
  {
    id: 'stage2-station', tabLabel: 'One-store pilot', badgeText: 'Six months · one category · proposed', evidenceTag: 'A',
    headline: 'Two modes. One ticket at checkout.',
    summary: 'Proposed computer-vision colorimetry under 5000K CRI 95+ light, a taste survey and store-specific recommendations. The public prototype demonstrates the interaction, not validated skin analysis or live integrations.',
    physicalFootprint: 'Camera, calibrated light, 21–24 inch kiosk and thermal printer are target requirements pending supplier quotes; existing 12-inch renders illustrate an earlier enclosure.',
    shopperFlow: 'Mode 1: RUT + consent → color test → tastes → garment location → ticket / QR. Mode 2: RUT → saved profile → size and aisle → same ticket.',
    associateRole: 'Explain limitations, maintain verified stock and help with camera refusal, lighting failure or a no-result outcome.',
    dataPrivacyRule: 'Production needs approved consent and retention. RUT is an identifier, not authentication. No photo storage is proposed.',
    commercialGate: 'Negotiate sell-through, ticket uptake and in-stock accuracy gates before the CLP 120 MM earn-out can be earned.',
    dmuOwner: 'Ripley Merchants as proposed buyer, with Operations, IT/Data, CRM / Puntos Go and Legal/Privacy.',
    fixtureCallouts: { topSignage: 'Clarity for you. Better buying signals for Merchants.', stationHardware: 'Camera + calibrated canopy + kiosk + thermal ticket.', rackStockRule: 'Store catalog and stock integration required; demo stock is synthetic.', fallbackProtocol: 'Retake, use a sample reference in the demo, ask an associate or leave safely.' }
  },
  {
    id: 'stage3-rollout', tabLabel: 'Sell, then embed', badgeText: 'Conditional rollout · not a contract', evidenceTag: 'A',
    headline: 'Sell the system, then run it from inside.',
    summary: 'Proposal: CLP 25 MM pilot, CLP 200 MM system/IP transfer (80 upfront + 120 earn-out) and a three-person embedded UX/UI/data team for CLP 12 MM per month. These are negotiation assumptions, not revenue or retailer commitments.',
    physicalFootprint: 'Illustrative rollout: 1 → 10 → 25 → 41 stores across years 1–4, conditional on access, results and approvals.',
    shopperFlow: 'Returning mode is enabled store by store. Saved colors, editable/hideable size, tastes and recent purchases shorten the path to the aisle.',
    associateRole: 'Store Operations owns placement and stock freshness; the proposed embedded team maintains the service and learning loop.',
    dataPrivacyRule: 'A future CRM/POS integration needs retailer authorization, security controls, identity safeguards and rights/retention procedures.',
    commercialGate: 'No rollout or earn-out without agreed measurable pilot results. Conservative economics in the supplied strategy do not pay back.',
    dmuOwner: 'Commercial buyer and operating owners must be agreed with Ripley, not inferred from the proposal.',
    fixtureCallouts: { topSignage: 'From a shortlist to a buying signal.', stationHardware: 'Approved bays only after the pilot gate.', rackStockRule: 'Never promise in-stock sizes without a real feed.', fallbackProtocol: 'Stop or revise when gates fail. No IP patentability claim without legal review.' }
  }
];

export const FIXTURE_HOTSPOTS: FixtureHotspot[] = [
  { id: 'lighting-bar', code: '01', title: '5000K CRI95+ canopy', physicalSpec: 'Proposed calibrated illumination, not measurable from this browser.', stage1Behavior: 'Test lighting and capture setup with sample data.', stage2Behavior: 'Calibrate light and check color extraction before recommendations.', evidenceTag: 'A', evidenceNote: 'A real pilot needs calibration and coverage testing; no accuracy threshold is claimed achieved.' },
  { id: 'drape-rail', code: '02', title: 'Fabric reference rail', physicalSpec: 'Retained tactile comparison tabs in the concept model.', stage1Behavior: 'Optional human-explained comparison during research.', stage2Behavior: 'Supports explanation; does not replace the new camera-led product framing.', evidenceTag: 'A', evidenceNote: 'Existing illustrations predate the revised CV enclosure. No new hardware has been built.' },
  { id: 'touch-terminal', code: '03', title: 'Camera and kiosk', physicalSpec: 'Target 21–24 inch touch display, camera and calibrated light. Existing render uses a smaller illustrative enclosure.', stage1Behavior: 'Test RUT and consent using demo identifiers.', stage2Behavior: 'RUT-first color test and tastes, or returning profile with editable/hideable size.', evidenceTag: 'A', evidenceNote: 'Local browser color extraction is functional. Validated skin analysis and real customer lookup are not connected.' },
  { id: 'curated-rack', code: '04', title: 'Garment location and size', physicalSpec: 'A garment rail maps suggested color and taste to floor, aisle and rack.', stage1Behavior: 'Use sample clothes and synthetic locations.', stage2Behavior: 'A real store-specific catalog and stock feed would drive availability.', evidenceTag: 'A', evidenceNote: 'Reference photographs and sample stock are not Ripley SKUs or a live inventory promise.' },
  { id: 'qr-handoff', code: '05', title: 'Ticket / QR to caja', physicalSpec: 'Campaign CP-ALC-84920 plus a unique, random demo ticket token.', stage1Behavior: 'Generate and print an offline QR with no RUT or photo in its payload.', stage2Behavior: 'Proposed checkout scan links purchases to the consented CRM profile; Puntos Go enrollment is separate.', evidenceTag: 'A', evidenceNote: 'The browser simulates checkout and blocks duplicate scans in this tab only. No actual POS, loyalty or CRM write occurs.' }
];
