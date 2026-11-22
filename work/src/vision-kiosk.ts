import type { ScenarioId } from './types';
import { ticketQr } from './ticket-qr';

declare const VISION_ASSETS: Record<string, string>;

export interface VisionGarment {
  id: string;
  name: string;
  kind: 'top' | 'bottom' | 'layer' | 'shoes';
  shape: string;
  styles: ('casual' | 'smart' | 'street' | 'minimal')[];
  occasions: ('daily' | 'work' | 'social')[];
  climates: ('warm' | 'mild' | 'cold')[];
}

export interface VisionColor {
  name: string;
  hex: string;
  neutral: boolean;
  lab: [number, number, number];
}

export interface VisionProfile {
  style: 'casual' | 'smart' | 'street' | 'minimal';
  wardrobe: string[];
  occasion: 'daily' | 'work' | 'social';
  climate: 'warm' | 'mild' | 'cold';
  comfort: 'neutral' | 'balanced' | 'bold';
  avoid: string[];
  avoidColors: string[];
}

export interface VisionLookItem {
  garmentId: string;
  kind: 'top' | 'bottom' | 'layer' | 'shoes';
  color: VisionColor;
}

export interface VisionLook {
  id: string;
  title: string;
  strategy: string;
  items: VisionLookItem[];
  reasons: string[];
}

function rgbToLab(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb.map((v) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  const f = (t: number): number =>
    t > 216 / 24389 ? Math.cbrt(t) : (t * 841) / 108 + 4 / 29;
  const x = f((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047);
  const y = f(r * 0.2126729 + g * 0.7151522 + b * 0.072175);
  const z = f((r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function hexFromRgb(rgb: [number, number, number]): string {
  return (
    '#' +
    rgb
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function labDistanceSq(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function analyzePixels(
  data: Uint8ClampedArray,
  k = 5
): {
  colors: { rgb: [number, number, number]; count: number; share: number; percent: number }[];
  samples: number;
  meanLight: number;
  clipped: number;
} {
  const pixels: { rgb: [number, number, number]; lab: [number, number, number] }[] = [];
  const stride = Math.max(1, Math.ceil(data.length / 4 / 8000));
  for (let i = 0; i < data.length; i += 4 * stride) {
    if (data[i + 3] < 128) continue;
    const rgb: [number, number, number] = [data[i], data[i + 1], data[i + 2]];
    pixels.push({ rgb, lab: rgbToLab(rgb) });
  }
  if (!pixels.length) {
    throw new Error('The image has no visible pixels. Try another photo.');
  }
  const centers: [number, number, number][] = [
    [...pixels[Math.floor(pixels.length / 2)].lab]
  ];
  while (centers.length < k) {
    let best = pixels[0];
    let far = -1;
    for (const p of pixels) {
      const d = Math.min(...centers.map((c) => labDistanceSq(p.lab, c)));
      if (d > far) {
        far = d;
        best = p;
      }
    }
    if (far < 1) break;
    centers.push([...best.lab]);
  }
  const nearest = (p: { lab: [number, number, number] }): number => {
    let index = 0;
    let d = Infinity;
    centers.forEach((c, i) => {
      const next = labDistanceSq(p.lab, c);
      if (next < d) {
        index = i;
        d = next;
      }
    });
    return index;
  };
  for (let iter = 0; iter < 12; iter++) {
    const sums = centers.map(() => ({ n: 0, lab: [0, 0, 0] }));
    for (const p of pixels) {
      const s = sums[nearest(p)];
      s.n++;
      s.lab[0] += p.lab[0];
      s.lab[1] += p.lab[1];
      s.lab[2] += p.lab[2];
    }
    sums.forEach((s, i) => {
      if (s.n) {
        centers[i] = [s.lab[0] / s.n, s.lab[1] / s.n, s.lab[2] / s.n];
      }
    });
  }
  const groups = centers.map(() => ({ count: 0, rgb: [0, 0, 0] }));
  for (const p of pixels) {
    const s = groups[nearest(p)];
    s.count++;
    s.rgb[0] += p.rgb[0];
    s.rgb[1] += p.rgb[1];
    s.rgb[2] += p.rgb[2];
  }
  const rawColors = groups
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((g) => ({
      rgb: [
        Math.round(g.rgb[0] / g.count),
        Math.round(g.rgb[1] / g.count),
        Math.round(g.rgb[2] / g.count)
      ] as [number, number, number],
      count: g.count,
      share: (g.count / pixels.length) * 100,
      percent: 0
    }));
  const percentages = rawColors.map((c) => Math.floor(c.share));
  const order = rawColors
    .map((c, i) => ({ i, remainder: c.share - percentages[i] }))
    .sort((a, b) => b.remainder - a.remainder);
  const missing = 100 - percentages.reduce((a, b) => a + b, 0);
  for (let i = 0; i < missing; i++) {
    percentages[order[i % order.length].i]++;
  }
  rawColors.forEach((c, i) => {
    c.percent = percentages[i];
  });
  const meanLight =
    pixels.reduce((sum, p) => sum + p.lab[0], 0) / pixels.length;
  const clipped =
    pixels.filter(
      (p) => p.rgb.every((v) => v < 12) || p.rgb.every((v) => v > 247)
    ).length / pixels.length;
  return { colors: rawColors, samples: pixels.length, meanLight, clipped };
}

const VISION_GARMENTS: VisionGarment[] = [
  { id: 'tee', name: 'Cotton tee', kind: 'top', shape: 'tee', styles: ['casual', 'minimal', 'street'], occasions: ['daily', 'social'], climates: ['warm', 'mild', 'cold'] },
  { id: 'shirt', name: 'Poplin shirt', kind: 'top', shape: 'shirt', styles: ['smart', 'minimal', 'casual'], occasions: ['work', 'social', 'daily'], climates: ['warm', 'mild', 'cold'] },
  { id: 'knit', name: 'Knit sweater', kind: 'top', shape: 'knit', styles: ['minimal', 'smart', 'casual'], occasions: ['daily', 'work', 'social'], climates: ['mild', 'cold'] },
  { id: 'hoodie', name: 'Hooded sweatshirt', kind: 'top', shape: 'hoodie', styles: ['street', 'casual'], occasions: ['daily', 'social'], climates: ['mild', 'cold'] },
  { id: 'jeans', name: 'Straight jeans', kind: 'bottom', shape: 'pants', styles: ['casual', 'street', 'minimal'], occasions: ['daily', 'social'], climates: ['warm', 'mild', 'cold'] },
  { id: 'chinos', name: 'Chino pants', kind: 'bottom', shape: 'pants', styles: ['smart', 'casual', 'minimal'], occasions: ['work', 'daily', 'social'], climates: ['warm', 'mild', 'cold'] },
  { id: 'tailored', name: 'Dress pants', kind: 'bottom', shape: 'pants', styles: ['smart', 'minimal'], occasions: ['work', 'social'], climates: ['warm', 'mild', 'cold'] },
  { id: 'skirt', name: 'Midi skirt', kind: 'bottom', shape: 'skirt', styles: ['smart', 'minimal', 'casual'], occasions: ['work', 'social', 'daily'], climates: ['warm', 'mild', 'cold'] },
  { id: 'blazer', name: 'Unstructured blazer', kind: 'layer', shape: 'blazer', styles: ['smart', 'minimal'], occasions: ['work', 'social'], climates: ['mild', 'cold'] },
  { id: 'overshirt', name: 'Overshirt', kind: 'layer', shape: 'shirt', styles: ['casual', 'street', 'minimal'], occasions: ['daily', 'social', 'work'], climates: ['mild', 'cold'] },
  { id: 'coat', name: 'Wool coat', kind: 'layer', shape: 'coat', styles: ['smart', 'minimal', 'casual', 'street'], occasions: ['work', 'daily', 'social'], climates: ['cold'] },
  { id: 'sneakers', name: 'Plain sneakers', kind: 'shoes', shape: 'sneakers', styles: ['casual', 'street', 'minimal'], occasions: ['daily', 'social'], climates: ['warm', 'mild', 'cold'] },
  { id: 'loafers', name: 'Loafers', kind: 'shoes', shape: 'loafers', styles: ['smart', 'minimal'], occasions: ['work', 'social'], climates: ['warm', 'mild'] },
  { id: 'boots', name: 'Ankle boots', kind: 'shoes', shape: 'boots', styles: ['smart', 'casual', 'street', 'minimal'], occasions: ['work', 'daily', 'social'], climates: ['cold', 'mild'] }
];

const VISION_FABRIC_COLORS: VisionColor[] = [
  { name: 'ivory', hex: '#E8E0D3', neutral: true },
  { name: 'stone', hex: '#B7AB9C', neutral: true },
  { name: 'graphite', hex: '#48464C', neutral: true },
  { name: 'midnight blue', hex: '#283346', neutral: true },
  { name: 'denim blue', hex: '#55738C', neutral: false },
  { name: 'sage', hex: '#8B9B83', neutral: false },
  { name: 'cocoa', hex: '#785944', neutral: true },
  { name: 'dusty rose', hex: '#BC8C9E', neutral: false },
  { name: 'terracotta', hex: '#AF654F', neutral: false },
  { name: 'burgundy', hex: '#792F48', neutral: false },
  { name: 'teal', hex: '#326B70', neutral: false },
  { name: 'fuchsia', hex: '#B80A6B', neutral: false },
  { name: 'bright blue', hex: '#3B629A', neutral: false },
  { name: 'olive', hex: '#73764E', neutral: false }
].map((c) => {
  const parts = c.hex.slice(1).match(/../g) ?? ['00', '00', '00'];
  const rgb: [number, number, number] = [
    parseInt(parts[0], 16),
    parseInt(parts[1], 16),
    parseInt(parts[2], 16)
  ];
  return { ...c, lab: rgbToLab(rgb) };
});

const VISION_LABELS = {
  style: {
    casual: 'casual',
    smart: 'smart casual',
    street: 'urban',
    minimal: 'minimalist'
  },
  occasion: {
    daily: 'everyday life',
    work: 'work or formal study',
    social: 'a night out'
  },
  climate: {
    warm: 'warm weather',
    mild: 'mild weather',
    cold: 'cold weather'
  },
  comfort: {
    neutral: 'neutrals',
    balanced: 'one color accent',
    bold: 'expressive colors'
  }
} as const;

function validateVisionProfile(p: VisionProfile): string {
  if (
    !p ||
    !VISION_LABELS.style[p.style] ||
    !VISION_LABELS.occasion[p.occasion] ||
    !VISION_LABELS.climate[p.climate] ||
    !VISION_LABELS.comfort[p.comfort]
  ) {
    return 'Complete the questions about style, occasion, weather and color.';
  }
  const allowed = VISION_GARMENTS.filter(
    (g) => p.wardrobe.includes(g.id) && !p.avoid.includes(g.id)
  );
  if (
    !allowed.some((g) => g.kind === 'top') ||
    !allowed.some((g) => g.kind === 'bottom')
  ) {
    return "We need at least one top and one bottom that you haven't excluded. Review your usual garments or what you prefer to avoid.";
  }
  if (!VISION_FABRIC_COLORS.some(c => c.neutral && !p.avoidColors.includes(c.name))) {
    return 'Keep at least one neutral color available, or finish without a recommendation.';
  }
  return '';
}

function garmentScore(g: VisionGarment, p: VisionProfile): number {
  return (
    (g.styles.includes(p.style) ? 5 : 0) +
    (g.occasions.includes(p.occasion) ? 4 : 0)
  );
}

function getCandidates(
  kind: VisionGarment['kind'],
  p: VisionProfile
): VisionGarment[] {
  return VISION_GARMENTS.filter(
    (g) =>
      g.kind === kind &&
      !p.avoid.includes(g.id) &&
      g.climates.includes(p.climate) &&
      (!['top', 'bottom'].includes(kind) || p.wardrobe.includes(g.id))
  ).sort(
    (a, b) =>
      garmentScore(b, p) - garmentScore(a, p) || a.id.localeCompare(b.id)
  );
}

function pickColorFor(
  p: VisionProfile,
  tones: { label: string; rgb: [number, number, number] }[],
  variant: number,
  kind: VisionGarment['kind']
): VisionColor {
  const pool = VISION_FABRIC_COLORS.filter((c) =>
    !p.avoidColors.includes(c.name) &&
    ((p.comfort === 'neutral' ||
    (['bottom', 'shoes', 'layer'].includes(kind) && p.comfort !== 'bold'))
      ? c.neutral : true)
  );
  if (kind !== 'top') {
    const preferred =
      kind === 'shoes'
        ? ['ivory', 'graphite', 'cocoa']
        : ['midnight blue', 'stone', 'graphite'];
    return (
      pool.find((c) => c.name === preferred[variant % preferred.length]) ??
      pool[0]
    );
  }
  const anchor = tones.length
    ? rgbToLab(tones[variant % tones.length].rgb)
    : null;
  if (!anchor) {
    const names =
      p.comfort === 'neutral'
        ? ['ivory', 'stone', 'graphite']
        : p.comfort === 'balanced'
          ? ['sage', 'dusty rose', 'denim blue']
          : ['fuchsia', 'teal', 'terracotta'];
    return pool.find((c) => c.name === names[variant]) ?? pool[0];
  }
  const target: [number, number, number] =
    variant === 2 ? [anchor[0], -anchor[1], -anchor[2]] : anchor;
  const ranked = [...pool].sort(
    (a, b) =>
      Math.hypot(a.lab[0] - target[0], a.lab[1] - target[1], a.lab[2] - target[2]) -
      Math.hypot(b.lab[0] - target[0], b.lab[1] - target[1], b.lab[2] - target[2])
  );
  return ranked[variant === 1 ? Math.min(1, ranked.length - 1) : 0];
}

function recommendVisionLooks(
  p: VisionProfile,
  tones: { label: string; rgb: [number, number, number] }[] = []
): { error: string; looks: VisionLook[] } {
  const error = validateVisionProfile(p);
  if (error) return { error, looks: [] };

  const pools = {
    top: getCandidates('top', p),
    bottom: getCandidates('bottom', p),
    layer: getCandidates('layer', p),
    shoes: getCandidates('shoes', p)
  };
  if (
    !pools.top.length ||
    !pools.bottom.length ||
    !pools.shoes.length ||
    (p.climate === 'cold' && !pools.layer.length)
  ) {
    return {
      error:
        'No compatible combination exists for those garments, exclusions and climate in the sample catalog. Try another usual garment or a different climate.',
      looks: []
    };
  }
  const titles = [
    'Your everyday base',
    'A change of pace',
    'Another way to combine'
  ];
  const strategies = [
    'Color proximity',
    'An alternative shade',
    'Color contrast'
  ];
  const looks: VisionLook[] = Array.from({ length: 3 }, (_, i) => {
    const kinds: VisionGarment['kind'][] = [
      'top',
      'bottom',
      ...(p.climate === 'cold' ||
      (p.climate === 'mild' && p.style === 'smart')
        ? (['layer'] as const)
        : []),
      'shoes'
    ];
    const items: VisionLookItem[] = kinds.map((kind) => ({
      garmentId: pools[kind][i % pools[kind].length].id,
      kind,
      color: pickColorFor(p, tones, i, kind)
    }));
    const topBottomNames = items
      .filter((v) => ['top', 'bottom'].includes(v.kind))
      .map(
        (v) =>
          VISION_GARMENTS.find((g) => g.id === v.garmentId)?.name.toLowerCase() ??
          v.garmentId
      )
      .join(' and ');
    return {
      id: `look-${i + 1}`,
      title: titles[i],
      strategy: tones.length ? strategies[i] : 'Interview preferences',
      items,
      reasons: [
        `${VISION_LABELS.style[p.style]} style for ${VISION_LABELS.occasion[p.occasion]}.`,
        `Starts from your usual garments: ${topBottomNames}.`,
        p.climate === 'cold'
          ? 'Includes a warm layer because you chose cold weather.'
          : p.climate === 'warm'
            ? 'No warm layers because you chose warm weather.'
            : 'Designed for mild weather.',
        tones.length
          ? `${strategies[i]} relative to ${tones[i % tones.length].label.toLowerCase()} (${hexFromRgb(tones[i % tones.length].rgb)}), limited to your preference for ${VISION_LABELS.comfort[p.comfort]}.`
          : `Colors chosen for your preference for ${VISION_LABELS.comfort[p.comfort]}; you didn't use photo swatches.`
      ]
    };
  });
  return { looks, error: '' };
}

function createClothingImg(
  id: string,
  options: { alt?: string; className?: string; eager?: boolean } = {}
): HTMLImageElement {
  const image = document.createElement('img');
  const uri =
    typeof VISION_ASSETS !== 'undefined' && VISION_ASSETS[id]
      ? VISION_ASSETS[id]
      : `vision/assets/clothes/${id}.jpg`;
  image.src = uri;
  image.alt = options.alt ?? '';
  if (options.className) image.className = options.className;
  image.loading = options.eager ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.width = 640;
  image.height = 800;
  return image;
}

export interface VisionKioskController {
  setStep(stepIndex: number): void;
  reset(): void;
}

export function initVisionKioskApp(options: {
  onRecommendationSync?: (scenarioId: ScenarioId) => void;
}): VisionKioskController {
  const screen = document.querySelector<HTMLElement>('#kiosk-screen');
  const stepLabel = document.querySelector<HTMLElement>('#kiosk-step-label');
  const messageEl = document.querySelector<HTMLElement>('#kiosk-message');
  const restartBtn = document.querySelector<HTMLButtonElement>('#kiosk-restart');
  const stepBtns = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-screen]')
  );

  const titles = [
    'RUT & consent', 'Color test', 'Your clothes', 'Your Mode 1 result',
    'Welcome back', 'Ticket / QR', 'Checkout demo', 'Merchant data loop'
  ];
  const initialProfile = (): VisionProfile => ({
    style: 'casual',
    wardrobe: [],
    occasion: 'daily',
    climate: 'mild',
    comfort: 'balanced',
    avoid: [],
    avoidColors: []
  });
  const demoProfile = (): VisionProfile => ({
    ...initialProfile(),
    wardrobe: ['tee', 'shirt', 'jeans', 'chinos']
  });

  let stage = 0;
  let profile: VisionProfile = initialProfile();
  let interviewDone = false;
  let capture: HTMLCanvasElement | null = null;
  let colors: {
    rgb: [number, number, number];
    count: number;
    share: number;
    percent: number;
  }[] = [];
  let reference: [number, number, number] | null = null;
  let media: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let epoch = 0;
  let uploadEpoch = 0;
  let lookIndex = 0;
  let samplePoint = { x: 0.5, y: 0.5 };
  let fastFindColor = 'Cool palette';
  let fastFindTaste = 'Relaxed poplin and knit';
  let fastFindSize = 'M';
  let fastFindSizeVisible = true;
  let sessionOrdinal = 1;
  let authorized = false;
  let mode: 'first' | 'returning' = 'first';
  let entryModeChosen = false;
  let identityKey = '';
  let authEpoch = 0;
  let imageConsent = false;
  let colorSource: 'sample' | 'local-image' | null = null;
  let captureQuality = '';
  let selectedStore = 'santiago';
  let puntosGo = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const identitySalt = crypto.getRandomValues(new Uint8Array(16)).join('-');
  type SavedProfile = { profile: VisionProfile; reference: [number, number, number]; size: string; color: string; taste: string; recentPurchases: string[] };
  const profiles = new Map<string, SavedProfile>();
  type TicketRow = { sku: string; garmentId: string; title: string; color: string; floor: string; sizes: string[] };
  type DemoTicket = { id: string; payload: string; rows: TicketRow[]; used: boolean; mode: string; tier: number; purchased: string[]; loyalty: boolean };
  let activeTicket: DemoTicket | null = null;
  let recommendationRows: TicketRow[] = [];
  let purchasedSkus = new Set<string>();
  const receipts: { ticketId: string; mode: string; colors: string[]; style: string; size: string; bought: string[]; declined: string[]; tier: number; loyalty: boolean }[] = [];

  const campaignCode = 'CP-ALC-84920';

  function demoSessionId(): string {
    return `DEMO-S${String(sessionOrdinal).padStart(3, '0')}`;
  }

  function make<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    cls = '',
    text?: string
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function button(
    text: string,
    action: () => void,
    cls = ''
  ): HTMLButtonElement {
    const b = make('button', cls, text);
    b.type = 'button';
    b.onclick = action;
    return b;
  }

  function say(text: string): void {
    if (messageEl) messageEl.textContent = text;
  }

  function stopCamera(): void {
    epoch++;
    if (media) {
      media.getTracks().forEach((track) => track.stop());
    }
    media = null;
    if (video) {
      video.srcObject = null;
    }
    video = null;
  }

  function move(next: number, focus = true): void {
    if (next === 0) { authEpoch++; entryModeChosen = false; authorized = false; identityKey = ''; document.querySelector('#print-ticket')?.remove(); }
    if (next > 0 && !authorized) { say('Enter a RUT and give demo-session consent first.'); return; }
    if (next === 2 && !colorSource) { say('Complete the color-reference step or choose the sample test first.'); return; }
    if (next === 3 && !interviewDone) { say('Complete your clothing preferences first.'); return; }
    if (next === 4 && mode !== 'returning') { say('Choose returning shopper and look up a demo profile first.'); return; }
    if (next >= 5 && !activeTicket) { say('Generate a ticket from your recommendations first.'); return; }
    if (next === 7 && !activeTicket?.used) { say('Complete the simulated checkout first.'); return; }
    if (next === 2) { activeTicket = null; interviewDone = false; }
    if (next !== 1 && capture) { capture.width = 1; capture.height = 1; capture = null; colors = []; }
    stopCamera();
    uploadEpoch++;
    stage = next;
    render();
    if (focus) {
      screen?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
      screen?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }

  function reset(): void {
    authEpoch++;
    authorized = false;
    identityKey = '';
    imageConsent = false;
    colorSource = null;
    captureQuality = '';
    mode = 'first';
    entryModeChosen = false;
    selectedStore = 'santiago';
    puntosGo = false;
    profiles.clear();
    receipts.length = 0;
    activeTicket = null;
    recommendationRows = [];
    purchasedSkus.clear();
    document.querySelector('#print-ticket')?.remove();
    clearTimeout(idleTimer);
    stopCamera();
    uploadEpoch++;
    if (capture) {
      capture.width = 1;
      capture.height = 1;
    }
    capture = null;
    colors = [];
    reference = null;
    profile = initialProfile();
    interviewDone = false;
    lookIndex = 0;
    fastFindColor = 'Cool palette';
    fastFindTaste = 'Relaxed poplin and knit';
    fastFindSize = '';
    fastFindSizeVisible = true;
    sessionOrdinal++;
    stage = 0;
    render();
  }

  function heading(title: string, description: string): HTMLDivElement {
    const wrap = make('div', 'kiosk-heading');
    const h = make('h3', '', title);
    h.tabIndex = -1;
    wrap.append(h, make('p', '', description));
    return wrap;
  }

  function actions(...buttons: HTMLElement[]): HTMLDivElement {
    const row = make('div', 'kiosk-actions');
    row.append(...buttons);
    return row;
  }

  function endButton(): HTMLButtonElement {
    return button('Finish and clear', () => {
      reset();
      say(
        'Session finished. Identifier link, photo, profiles, preferences, tickets and checkout records cleared from this page.'
      );
    });
  }

  function welcome(): void {
    if (!screen) return;
    if (!entryModeChosen) {
      screen.append(heading('What are you looking for today?', 'Choose how you would like to start.'));
      const choices = make('div', 'kiosk-visit-options');
      const visits = [
        { value: 'first' as const, title: 'I want to see what could suit me', description: 'On your first visit, discover colors and clothes based on your tastes.', action: 'It\'s my first visit' },
        { value: 'returning' as const, title: 'What\'s new for me?', description: 'Used Color-Play before? Return to your preferences and explore new suggestions.', action: 'I\'ve used Color-Play before' }
      ];
      visits.forEach(visit => {
        const choice = button('', () => {
          authEpoch++; mode = visit.value; entryModeChosen = true; render();
          screen?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
        }, 'kiosk-visit-option kiosk-visit-' + visit.value);
        choice.id = 'kiosk-mode-' + visit.value;
        const title = make('span', 'kiosk-visit-title', visit.title); title.id = choice.id + '-title';
        const description = make('span', 'kiosk-visit-description', visit.description); description.id = choice.id + '-description';
        choice.append(title, description, make('span', 'kiosk-visit-action', visit.action));
        choices.append(choice);
      });
      screen.append(choices, make('p', 'kiosk-private-note', 'Demo prototype. Both options continue with a demo RUT and consent. Neither connects to Ripley systems.'));
      return;
    }
    screen.append(heading(mode === 'first' ? 'Your first visit starts here.' : 'Welcome back to Color-Play.', 'Use a demo RUT and consent to continue. This public prototype has no Ripley CRM connection. Do not enter a real identifier.'));
    const layout = make('div', 'kiosk-welcome');
    const form = make('form', 'kiosk-entry');
    form.dataset.visitMode = mode;
    form.append(button('Back to options', () => {
      authEpoch++; entryModeChosen = false; render();
      document.getElementById('kiosk-mode-' + mode)?.focus({ preventScroll: true });
    }));
    const storeLabel = make('label', 'kiosk-select-label', 'Demo store');
    const store = make('select'); store.id = 'kiosk-store';
    [['santiago', 'Santiago demo · returning mode enabled'], ['valparaiso', 'Valparaíso demo · first visit only']].forEach(([value, text]) => {
      const option = make('option', '', text); option.value = value; option.selected = selectedStore === value; store.append(option);
    });
    store.onchange = () => { selectedStore = store.value; };
    storeLabel.append(store); form.append(storeLabel);
    const rutLabel = make('label', 'kiosk-select-label', 'RUT');
    const rut = make('input'); rut.id = 'kiosk-rut'; rut.type = 'text'; rut.autocomplete = 'off'; rut.spellcheck = false; rut.maxLength = 12; rut.placeholder = '11.111.111-1'; rut.setAttribute('aria-describedby', 'rut-help rut-error');
    rutLabel.append(rut); form.append(rutLabel, make('p', 'kiosk-private-note', 'Use 11.111.111-1 for the saved sample profile. Any entered identifier is processed only in this page, never sent or persistently stored.'));
    form.lastElementChild!.id = 'rut-help';
    form.append(button('Use demo RUT', () => { rut.value = '11.111.111-1'; rut.focus(); }));
    const consent = make('label', 'kiosk-consent');
    const check = make('input'); check.type = 'checkbox'; check.id = 'kiosk-session-consent';
    consent.append(check, document.createTextNode('I consent to this local demo linking my color and taste choices to a temporary identifier, and to simulated checkout / CRM previews. Nothing is sent to Ripley. I can finish and erase the session at any time.'));
    form.append(consent);
    const privacy = make('a', '', 'Read demo privacy and retention'); privacy.href = 'privacy.html'; privacy.target = '_blank'; privacy.rel = 'noopener'; form.append(privacy);
    const error = make('p', 'quiz-error'); error.id = 'rut-error'; error.setAttribute('role', 'alert'); form.append(error);
    const submit = make('button', 'primary', mode === 'first' ? 'Start my color test' : 'Find my saved demo profile'); submit.type = 'submit'; form.append(submit);
    form.onsubmit = async e => {
      e.preventDefault();
      const entered = rut.value.trim().replaceAll('.', '').replaceAll('-', '').toUpperCase();
      if (!/^[1-9][0-9]{6,7}[0-9K]$/.test(entered)) { error.textContent = 'Enter a RUT with 7–8 digits and a check digit, for example 11.111.111-1.'; rut.setAttribute('aria-invalid', 'true'); return; }
      let sum = 0, factor = 2;
      for (const digit of entered.slice(0, -1).split('').reverse()) { sum += Number(digit) * factor; factor = factor === 7 ? 2 : factor + 1; }
      const checkValue = 11 - sum % 11;
      const expected = checkValue === 11 ? '0' : checkValue === 10 ? 'K' : String(checkValue);
      if (entered.at(-1) !== expected) { error.textContent = 'The RUT check digit does not match. Use the demo RUT or correct the number.'; rut.setAttribute('aria-invalid', 'true'); return; }
      if (!check.checked) { error.textContent = 'Give demo-session consent to continue, or leave without starting.'; check.focus(); return; }
      if (mode === 'returning' && selectedStore !== 'santiago') { error.textContent = 'Returning mode is not enabled at this sample store. Choose Santiago demo or start a first visit.'; return; }
      const version = ++authEpoch; submit.disabled = true; error.textContent = 'Preparing your local demo…';
      try {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identitySalt + entered));
        if (version !== authEpoch) return;
        const key = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
        const saved = profiles.get(key) ?? (entered === '111111111' ? {
          profile: demoProfile(), reference: [184, 10, 107] as [number, number, number], size: 'M',
          color: 'Cool sample palette', taste: 'casual', recentPurchases: ['DEMO-SHIRT', 'DEMO-JEANS']
        } : null);
        if (mode === 'returning' && !saved) { error.textContent = 'No local demo profile is available. Use 11.111.111-1 or complete a first visit in this tab. This is not a Ripley customer lookup.'; return; }
        stopCamera(); uploadEpoch++; if (capture) { capture.width = 1; capture.height = 1; } capture = null; colors = [];
        authorized = true; identityKey = key; imageConsent = false; colorSource = null; captureQuality = '';
        activeTicket = null; recommendationRows = []; purchasedSkus.clear(); puntosGo = false; lookIndex = 0; fastFindSizeVisible = true;
        document.querySelector('#print-ticket')?.remove(); rut.value = '';
        if (mode === 'returning' && saved) {
          profile = structuredClone(saved.profile); reference = [...saved.reference]; fastFindSize = saved.size;
          fastFindColor = saved.color; fastFindTaste = saved.taste; colorSource = 'sample'; interviewDone = true;
          profiles.set(key, structuredClone(saved)); move(4);
        } else {
          profile = initialProfile(); reference = null; fastFindSize = ''; interviewDone = false; move(1);
        }
        armIdle(); say('Demo session ready. No identifier was sent or saved to persistent storage.');
      } catch { if (version === authEpoch) error.textContent = 'This demo needs HTTPS or localhost for a private session token. Please reopen the secure site.'; }
      finally { if (submit.isConnected) submit.disabled = false; }
    };
    const visuals = make('div', 'kiosk-welcome-photos');
    visuals.append(createClothingImg('shirt', { alt: 'Sample shirt reference', eager: true }), createClothingImg('chinos', { alt: 'Sample trousers reference', eager: true }));
    layout.append(form, visuals); screen.append(layout, endButton());
  }

  function renderReference(): void {
    const status = document.querySelector<HTMLElement>('#kiosk-reference');
    if (status) {
      status.textContent = reference
        ? `Confirmed reference: ${hexFromRgb(reference)}`
        : 'No confirmed reference. Select a color, use the sample test, or leave without a result.';
    }
    document
      .querySelectorAll<HTMLElement>('.kiosk-color')
      .forEach((el) =>
        el.setAttribute(
          'aria-pressed',
          el.dataset.hex === (reference ? hexFromRgb(reference) : '')
            ? 'true'
            : 'false'
        )
      );
  }

  function sample(x: number, y: number): void {
    if (!capture) return;
    samplePoint = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y))
    };
    const px = Math.min(
      capture.width - 1,
      Math.round(samplePoint.x * capture.width)
    );
    const py = Math.min(
      capture.height - 1,
      Math.round(samplePoint.y * capture.height)
    );
    const sx = Math.max(0, px - 3);
    const sy = Math.max(0, py - 3);
    const w = Math.min(7, capture.width - sx);
    const h = Math.min(7, capture.height - sy);
    const ctx = capture.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const d = ctx.getImageData(sx, sy, w, h).data;
    const rgb: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) {
      rgb[0] += d[i];
      rgb[1] += d[i + 1];
      rgb[2] += d[i + 2];
    }
    reference = [
      Math.round(rgb[0] / (w * h)),
      Math.round(rgb[1] / (w * h)),
      Math.round(rgb[2] / (w * h))
    ];
    renderReference();
    say(
      `Chosen reference: ${hexFromRgb(reference)}. Local color extraction only, not a validated skin-tone diagnosis.`
    );
  }

  function setCapture(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): void {
    const width =
      (source as HTMLVideoElement).videoWidth ||
      (source as HTMLImageElement).naturalWidth ||
      source.width;
    const height =
      (source as HTMLVideoElement).videoHeight ||
      (source as HTMLImageElement).naturalHeight ||
      source.height;
    if (!width || !height) {
      throw new Error("The image isn't ready yet.");
    }
    const next = document.createElement('canvas');
    const scale = Math.min(1, 1000 / Math.max(width, height));
    next.width = Math.round(width * scale);
    next.height = Math.round(height * scale);
    const ctx = next.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, next.width, next.height);
    ctx.drawImage(source, 0, 0, next.width, next.height);
    const analyzed = analyzePixels(
      ctx.getImageData(0, 0, next.width, next.height).data
    );
    if (capture) {
      capture.width = 1;
      capture.height = 1;
    }
    capture = next;
    captureQuality = analyzed.meanLight < 8 || analyzed.meanLight > 96 || analyzed.clipped > 0.65
      ? 'Lighting is too dark or overexposed. Retake the image, use the sample test, or leave without a result.' : '';
    colors = analyzed.colors;
    reference = null;
    samplePoint = { x: 0.5, y: 0.5 };
    stopCamera();
    stage = 1;
    render();
    say(
      "Photo ready. The camera is off. Choose a reference color or continue without using the photo's colors."
    );
  }

  async function openCamera(): Promise<void> {
    const consentInput =
      document.querySelector<HTMLInputElement>('#kiosk-consent');
    if (!consentInput?.checked) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      say(
        'The camera requires localhost or HTTPS. You can upload a photo or continue without a camera.'
      );
      return;
    }
    uploadEpoch++;
    stopCamera();
    const token = epoch;
    const start = document.querySelector<HTMLButtonElement>('#kiosk-camera');
    if (start) start.disabled = true;
    say('Requesting camera permission…');
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 } },
        audio: false
      });
      if (token !== epoch || stage !== 1) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      media = next;
      video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.srcObject = media;
      const viewBox =
        document.querySelector<HTMLElement>('#kiosk-camera-view');
      viewBox?.replaceChildren(video);
      await video.play();
      if (token !== epoch) return;
      const liveActions =
        document.querySelector<HTMLElement>('#kiosk-live-actions');
      if (liveActions) liveActions.hidden = false;
      if (start) start.hidden = true;
      consentInput.disabled = true;
      say(
        'Camera on. Position yourself in soft front lighting and press Take my photo.'
      );
    } catch {
      if (token === epoch) {
        stopCamera();
        render();
        say(
          "We couldn't open the camera. Check the permissions, upload a photo or continue without it."
        );
      }
    } finally {
      if (start?.isConnected) start.disabled = false;
    }
  }

  async function loadPhoto(file?: File): Promise<void> {
    if (!file || !imageConsent || !authorized) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      say('Choose a JPG, PNG or WebP photo.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      say('The photo exceeds 15 MB. Use a smaller version.');
      return;
    }
    const version = ++uploadEpoch;
    stopCamera();
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (version === uploadEpoch) setCapture(img);
    } catch {
      if (version === uploadEpoch) {
        render();
        say("We couldn't read the photo. Try another file.");
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function photo(): void {
    if (!screen) return;
    screen.append(
      heading(
        capture ? 'Choose your color reference.' : 'Your color test, in this browser.',
        'The proposed kiosk uses computer vision under 5000K CRI 95+ light. This browser extracts image colors locally; it cannot verify calibration or deliver validated skin colorimetry. No photo is uploaded or saved.'
      )
    );
    const layout = make('div', 'kiosk-photo-layout');
    const view = make('div', 'kiosk-camera-view');
    view.id = 'kiosk-camera-view';
    if (capture) {
      const cap = capture;
      cap.tabIndex = 0;
      cap.setAttribute('role', 'img');
      cap.setAttribute(
        'aria-label',
        'Your photo. Tap an area to choose its color. On a keyboard, use the arrow keys and Enter.'
      );
      cap.onclick = (e: MouseEvent) => {
        const rect = cap.getBoundingClientRect();
        const scale = Math.min(
          rect.width / cap.width,
          rect.height / cap.height
        );
        const w = cap.width * scale;
        const h = cap.height * scale;
        const x = e.clientX - rect.left - (rect.width - w) / 2;
        const y = e.clientY - rect.top - (rect.height - h) / 2;
        if (x >= 0 && x <= w && y >= 0 && y <= h) {
          sample(x / w, y / h);
        }
      };
      cap.onkeydown = (e: KeyboardEvent) => {
        const keys: Record<string, [number, number]> = {
          ArrowLeft: [-0.03, 0],
          ArrowRight: [0.03, 0],
          ArrowUp: [0, -0.03],
          ArrowDown: [0, 0.03],
          Enter: [0, 0],
          ' ': [0, 0]
        };
        if (keys[e.key]) {
          e.preventDefault();
          sample(
            samplePoint.x + keys[e.key][0],
            samplePoint.y + keys[e.key][1]
          );
        }
      };
      view.append(cap);
    } else {
      const guide = make('div', 'camera-guide');
      guide.setAttribute('aria-hidden', 'true');
      guide.append(make('span'));
      view.append(guide, make('p', '', 'Your camera view will appear here.'));
    }

    const side = make('div', 'kiosk-photo-instructions');
    side.append(
      make('h4', '', capture ? 'You choose the color.' : 'Before the photo'),
      make(
        'p',
        '',
        capture
          ? 'Tap an area of the photo or one of the swatches. Colors include the background and your clothes.'
          : 'Use even front lighting and no filters. Use the sample test if you do not want to use your camera. Store light calibration is a pilot requirement, not a browser measurement.'
      )
    );
    if (capture) {
      const swatches = make('div', 'kiosk-color-options');
      colors.forEach((c) => {
        const h = hexFromRgb(c.rgb);
        const b = button(
          h,
          () => {
            reference = [...c.rgb];
            renderReference();
            say(`Confirmed reference: ${hexFromRgb(reference)}.`);
          },
          'kiosk-color'
        );
        b.dataset.hex = h;
        b.setAttribute(
          'aria-pressed',
          reference && hexFromRgb(reference) === h ? 'true' : 'false'
        );
        const dot = make('i');
        dot.style.background = h;
        b.prepend(dot);
        swatches.append(b);
      });
      side.append(swatches);
      const info = make('p', 'kiosk-reference');
      info.id = 'kiosk-reference';
      side.append(info);
    }
    const consent = make('label', 'kiosk-consent');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.id = 'kiosk-consent';
    check.checked = imageConsent;
    consent.append(
      check,
      document.createTextNode(
        'I allow local image-color processing for this session. Camera access is requested separately by my browser.'
      )
    );
    side.append(consent);
    const start = button(
      capture ? 'Retake the photo' : 'Turn on my camera',
      () => {
        void openCamera();
      },
      'primary'
    );
    start.id = 'kiosk-camera';
    start.disabled = !imageConsent;
    check.onchange = () => {
      imageConsent = check.checked;
      start.disabled = !check.checked;
      uploadButton.disabled = !check.checked;
      if (!check.checked) {
        uploadEpoch++; stopCamera();
        if (capture) { capture.width = 1; capture.height = 1; }
        capture = null; colors = []; reference = null; colorSource = null; captureQuality = ''; render();
        say('Image processing consent withdrawn. Image and reference cleared.');
      }
    };
    side.append(start);

    const live = actions(
      button(
        'Take my photo',
        () => {
          try {
            if (video) setCapture(video);
          } catch (err) {
            say(err instanceof Error ? err.message : 'Capture error');
          }
        },
        'primary'
      ),
      button('Cancel camera', () => {
        stopCamera();
        render();
        say('Camera off. You can continue without capturing.');
      })
    );
    live.id = 'kiosk-live-actions';
    live.hidden = true;
    side.append(live);

    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/jpeg,image/png,image/webp';
    file.id = 'kiosk-file';
    file.hidden = true;
    file.onchange = () => {
      const f = file.files?.[0];
      void loadPhoto(f);
      file.value = '';
    };
    const uploadButton = button('Upload a photo', () => file.click());
    uploadButton.disabled = !imageConsent;
    side.append(
      uploadButton,
      file,
      make('small', '', 'JPG, PNG or WebP · up to 15 MB')
    );

    layout.append(view, side);
    screen.append(
      layout,
      actions(
        button('Back', () => move(0)),
        button('Use this color reference', () => {
          if (!reference || captureQuality) { say(captureQuality || 'Select a reference color first, or use the sample test.'); return; }
          colorSource = 'local-image'; move(2);
        }, 'primary'),
        button('Use sample color test', () => { reference = [184, 10, 107]; colorSource = 'sample'; captureQuality = ''; move(2); say('Using a sample palette, not a camera analysis.'); }),
        button('No result — leave safely', () => { reset(); say('No result selected. All session data cleared.'); }),
        endButton()
      )
    );
    if (captureQuality) screen.append(make('p', 'quiz-error', captureQuality));
    renderReference();
  }

  function selectField<K extends 'style' | 'occasion' | 'climate' | 'comfort'>(
    label: string,
    key: K,
    entries: [string, string][]
  ): HTMLLabelElement {
    const wrap = make('label', 'kiosk-select-label', label);
    const select = document.createElement('select');
    select.id = `kiosk-${key}`;
    entries.forEach(([value, text]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      opt.selected = profile[key] === value;
      select.append(opt);
    });
    select.onchange = () => {
      profile[key] = select.value as VisionProfile[K];
      interviewDone = false;
    };
    wrap.append(select);
    return wrap;
  }

  function interview(): void {
    if (!screen) return;
    screen.append(
      heading(
        'What do you like to wear?',
        'Select at least one top and one bottom. Your style, occasion, colors to avoid and optional size guide the sample catalog. We do not infer your gender or body type.'
      )
    );
    const layout = make('div', 'kiosk-interview-layout');
    const wardrobe = make('fieldset', 'kiosk-wardrobe');
    wardrobe.append(make('legend', '', 'My usual garments'));
    const grid = make('div', 'kiosk-wardrobe-grid');
    VISION_GARMENTS.filter((g) => ['top', 'bottom'].includes(g.kind)).forEach(
      (g) => {
        const label = make('label', 'kiosk-wardrobe-option');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'kiosk-wardrobe';
        input.value = g.id;
        input.checked = profile.wardrobe.includes(g.id);
        input.onchange = () => {
          profile.wardrobe = Array.from(
            grid.querySelectorAll<HTMLInputElement>('input:checked')
          ).map((i) => i.value);
          interviewDone = false;
        };
        label.append(
          createClothingImg(g.id, { eager: true }),
          input,
          make('span', '', g.name)
        );
        grid.append(label);
      }
    );
    wardrobe.append(grid);

    const prefs = make('div', 'kiosk-preferences');
    prefs.append(
      make('p', 'kiosk-default-note', 'Adjust these starting values to your day.')
    );
    prefs.append(
      selectField('My style', 'style', Object.entries(VISION_LABELS.style)),
      selectField(
        'My occasion',
        'occasion',
        Object.entries(VISION_LABELS.occasion)
      ),
      selectField(
        'The weather',
        'climate',
        Object.entries(VISION_LABELS.climate)
      ),
      selectField(
        'How much color I want',
        'comfort',
        Object.entries(VISION_LABELS.comfort)
      )
    );

    const exclusions = make('details', 'kiosk-exclusions');
    exclusions.append(make('summary', '', 'Garments I prefer to avoid'));
    const list = make('div');
    VISION_GARMENTS.forEach((g) => {
      const l = make('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'kiosk-avoid';
      input.value = g.id;
      input.checked = profile.avoid.includes(g.id);
      input.onchange = () => {
        profile.avoid = Array.from(
          list.querySelectorAll<HTMLInputElement>('input:checked')
        ).map((i) => i.value);
        interviewDone = false;
      };
      l.append(input, document.createTextNode(g.name));
      list.append(l);
    });
    exclusions.append(list);
    prefs.append(exclusions);
    const colorExclusions = make('details', 'kiosk-exclusions');
    colorExclusions.append(make('summary', '', 'Colors I prefer to avoid'));
    VISION_FABRIC_COLORS.forEach(c => {
      const label = make('label'); const input = make('input'); input.type = 'checkbox'; input.name = 'kiosk-avoid-color'; input.value = c.name; input.checked = profile.avoidColors.includes(c.name);
      input.onchange = () => { profile.avoidColors = Array.from(colorExclusions.querySelectorAll<HTMLInputElement>('input:checked')).map(i => i.value); interviewDone = false; };
      label.append(input, document.createTextNode(c.name)); colorExclusions.append(label);
    });
    prefs.append(colorExclusions, sizeControl());

    const error = make('p', 'quiz-error');
    error.id = 'kiosk-profile-error';
    error.setAttribute('role', 'alert');
    prefs.append(error);
    layout.append(wardrobe, prefs);
    screen.append(layout);

    screen.append(
      actions(
        button('Back to my photo', () => move(1)),
        button(
          'See my recommendation',
          () => {
            const res = recommendVisionLooks(
              profile,
              reference
                ? [{ label: 'My chosen reference', rgb: reference }]
                : []
            );
            if (res.error) {
              const errEl = document.querySelector<HTMLElement>(
                '#kiosk-profile-error'
              );
              if (errEl) errEl.textContent = res.error;
              return;
            }
            interviewDone = true;
            lookIndex = 0;
            const scenarioMap: Record<VisionProfile['comfort'], ScenarioId> = {
              neutral: 'mixed-lighting',
              balanced: 'warm-autumn',
              bold: 'cool-winter'
            };
            options.onRecommendationSync?.(scenarioMap[profile.comfort]);
            move(3);
          },
          'primary'
        ),
        endButton()
      )
    );
  }

  function result(): void {
    if (!screen) return;
    const example = !interviewDone;
    const p = example ? demoProfile() : profile;
    const refs =
      !example && reference
        ? [{ label: 'My chosen reference', rgb: reference }]
        : [];
    const r = recommendVisionLooks(p, refs);
    if (r.error) {
      screen.append(
        heading("Let's try another combination.", r.error),
        button('Review my preferences', () => move(2), 'primary')
      );
      return;
    }
    const look = r.looks[lookIndex % r.looks.length];
    screen.append(
      heading(
        'Your look, ready to find.',
        example
          ? "Example view: you haven't completed this machine's interview yet. Your photo has not been used."
          : `A ${VISION_LABELS.style[p.style]} suggestion for ${VISION_LABELS.occasion[p.occasion]}. ${reference ? `Chosen reference: ${hexFromRgb(reference)}.` : 'Based only on your preferences; no confirmed photo reference.'}`
      )
    );
    const strip = make('div', 'kiosk-result-palette');
    strip.append(
      make('strong', '', example ? 'Example palette' : 'Your combination')
    );
    look.items.forEach((item) => {
      const chip = make('span');
      const dot = make('i');
      dot.style.background = item.color.hex;
      chip.append(dot, document.createTextNode(item.color.name));
      strip.append(chip);
    });
    screen.append(strip);

    const products = make('div', 'kiosk-products');
    look.items.forEach((item, index) => {
      if (fastFindSize && !(item.kind === 'shoes' ? ['S', 'M', 'L'] : ['XS', 'S', 'M', 'L']).includes(fastFindSize)) return;
      const g = VISION_GARMENTS.find((gar) => gar.id === item.garmentId);
      if (!g) return;
      const article = make('article', 'kiosk-product');
      const imageWrap = make('div', 'kiosk-product-image');
      imageWrap.append(
        createClothingImg(g.id, {
          alt: `Reference photo: ${g.name.toLowerCase()}`,
          eager: true
        })
      );
      imageWrap.append(make('span', 'demo-tag', 'Visual reference'));
      article.append(imageWrap);

      const detail = make('div', 'kiosk-product-info');
      detail.append(make('h4', '', g.name));
      const color = make('p', 'kiosk-product-color');
      const dot = make('i');
      dot.style.background = item.color.hex;
      color.append(
        dot,
        document.createTextNode(`Color to look for: ${item.color.name}`)
      );
      detail.append(color);
      const place =
        item.kind === 'top'
          ? 'Clothing · Rack A (Hooks 01–03)'
          : item.kind === 'bottom'
            ? 'Clothing · Rack B (Hooks 04–06)'
            : item.kind === 'layer'
              ? 'Clothing · Rack D'
              : 'Footwear · Module C';
      detail.append(
        make('p', 'kiosk-location', `Floor 2 · Aisle ${index + 3} · ${place} · simulated location`),
        make('small', '', `Ref. DEMO-${g.id.toUpperCase()} · No connected stock`)
      );
      article.append(detail);
      products.append(article);
    });
    screen.append(products);

    screen.append(
      make(
        'p',
        'kiosk-result-note',
        "Reference photographs: the suggested color is shown on each card and may differ from the photo. In a real deployment, this store's catalog products and availability would be shown."
      )
    );
    const reasons = make('details', 'kiosk-reasons');
    reasons.append(make('summary', '', 'Why this combination'));
    const list = make('ul');
    look.reasons.forEach((text) => list.append(make('li', '', text)));
    reasons.append(list);
    screen.append(reasons);

    recommendationRows = look.items.map((item, index) => ({
      sku: `DEMO-${item.garmentId.toUpperCase()}`, garmentId: item.garmentId,
      title: VISION_GARMENTS.find(g => g.id === item.garmentId)!.name, color: item.color.name,
      floor: `Floor 2 · Aisle ${index + 3} · Rack ${String.fromCharCode(65 + index)}`,
      sizes: item.kind === 'shoes' ? ['S', 'M', 'L'] : ['XS', 'S', 'M', 'L']
    })).filter(row => !fastFindSize || row.sizes.includes(fastFindSize));
    if (!recommendationRows.length) {
      screen.append(heading('No sample size match.', 'No recommendation is available for that size in this demonstration catalog. Change your size or ask an associate; no live inventory is connected.'));
      screen.append(actions(button('Change my preferences', () => move(2)), endButton())); return;
    }
    screen.append(make('p', 'kiosk-private-note', `${colorSource === 'sample' ? 'Sample color test' : 'Local image-color reference'} · Demo stock and layout only. Size ${fastFindSizeVisible ? (fastFindSize || 'not specified') : 'hidden'}. No CRM or Ripley connection.`));

    screen.append(
      actions(
        button('See another combination', () => {
          lookIndex++;
          render();
          say(
            "Showing another combination compatible with this view's preferences."
          );
        }),
        button('Change my preferences', () => move(2)),
        button('Ask for help in store', () =>
          say(
            'Simulation: this is where help from a store employee would be requested. This demo sends no alerts and does not share your photo.'
          )
        ),
        button('Get ticket / QR', () => generateTicket(), 'primary'),
        endButton()
      )
    );
  }

  function sizeControl(): HTMLDivElement {
    const wrap = make('div', 'kiosk-size-control');
    if (fastFindSizeVisible) {
      const label = make('label', 'kiosk-select-label', 'Size filter (sample stock)');
      const select = make('select'); select.id = 'kiosk-size';
      ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL'].forEach(value => { const option = make('option', '', value || 'Not specified'); option.value = value; option.selected = value === fastFindSize; select.append(option); });
      select.onchange = () => { fastFindSize = select.value; activeTicket = null; if (stage === 4) render(); };
      label.append(select); wrap.append(label);
    }
    const visibility = button(fastFindSizeVisible ? 'Hide size' : 'Edit size', () => { fastFindSizeVisible = !fastFindSizeVisible; render(); });
    visibility.id = 'kiosk-size-visibility'; wrap.append(visibility);
    return wrap;
  }

  function fastFind(): void {
    if (!screen) return;
    screen.append(heading('Welcome back. Straight to the aisle.', 'Mode 2 uses a saved demo palette, tastes, size and sample purchase history. No repeat photo or interview. Profile lookup, locations and stock are simulated, enabled store by store.'));
    const saved = profiles.get(identityKey);
    screen.append(make('p', 'kiosk-private-note', 'Saved demo profile · ' + fastFindColor + ' · Taste: ' + fastFindTaste + ' · Recent sample purchases: ' + (saved?.recentPurchases.join(', ') || 'none in this tab')));
    const controls = make('div', 'fastfind-controls');
    const paletteLabel = make('label', 'kiosk-select-label', 'Saved color preference');
    const palette = make('select'); palette.id = 'fastfind-color';
    Array.from(new Set([fastFindColor, 'Cool sample palette', 'Warm sample palette', 'Soft sample palette'])).forEach(value => { const o = make('option', '', value); o.value = value; palette.append(o); });
    palette.onchange = () => {
      fastFindColor = palette.value; reference = palette.value.startsWith('Warm') ? [175, 101, 79] : palette.value.startsWith('Soft') ? [183, 171, 156] : [184, 10, 107];
      activeTicket = null; render();
    };
    paletteLabel.append(palette);
    const tasteLabel = make('label', 'kiosk-select-label', 'Saved clothing taste');
    const taste = make('select'); taste.id = 'fastfind-taste';
    Object.entries(VISION_LABELS.style).forEach(([value, text]) => { const o = make('option', '', text); o.value = value; o.selected = value === profile.style; taste.append(o); });
    taste.onchange = () => { profile.style = taste.value as VisionProfile['style']; fastFindTaste = taste.value; activeTicket = null; render(); };
    tasteLabel.append(taste); controls.append(paletteLabel, tasteLabel, sizeControl()); screen.append(controls);
    const result = recommendVisionLooks(profile, reference ? [{ label: 'Saved demo reference', rgb: reference }] : []);
    recommendationRows = result.looks.map((look, index) => {
      const item = look.items.find(v => v.kind === 'top')!;
      return { sku: 'DEMO-' + item.garmentId.toUpperCase() + '-' + index, garmentId: item.garmentId,
        title: VISION_GARMENTS.find(g => g.id === item.garmentId)!.name, color: item.color.name,
        floor: 'Floor 2 · Aisle ' + (index + 3) + ' · Rack ' + String.fromCharCode(65 + index), sizes: ['XS', 'S', 'M', 'L'] };
    }).filter(row => !fastFindSize || row.sizes.includes(fastFindSize));
    const results = make('div', 'fastfind-results');
    recommendationRows.forEach(row => {
      const card = make('article', 'fastfind-result');
      card.append(createClothingImg(row.garmentId, { alt: 'Reference photograph, not a live SKU' }), make('h4', '', row.title + ' · ' + row.color), make('p', '', row.floor),
        make('p', 'kiosk-location', fastFindSizeVisible ? 'Sample stock: ' + (fastFindSize || row.sizes.join(' / ')) : 'Size hidden'),
        make('small', '', row.sku + ' · illustrative location and stock, not a live feed'));
      results.append(card);
    });
    screen.append(results, make('p', 'kiosk-private-note', 'Reference photographs may differ from the suggested color in each label. These are not live Ripley products.'));
    if (!recommendationRows.length) screen.append(make('p', 'quiz-error', result.error || 'No sample stock matches this size. Edit your size, ask an associate or finish without a result.'));
    screen.append(actions(button('Back to RUT entry', () => move(0)), button('Get ticket / QR', () => generateTicket(), 'primary'), endButton()));
  }

  function generateTicket(): void {
    if (!authorized || !recommendationRows.length) { say('No available sample items. Change preferences or finish without a result.'); return; }
    const id = 'CPD-' + crypto.randomUUID().toUpperCase();
    activeTicket = { id, payload: campaignCode + ':' + id, rows: structuredClone(recommendationRows), used: false, mode, tier: 0, purchased: [], loyalty: false };
    purchasedSkus.clear(); puntosGo = false;
    if (identityKey && reference) profiles.set(identityKey, { profile: structuredClone(profile), reference: [...reference], size: fastFindSize, color: mode === 'first' ? 'Reference ' + hexFromRgb(reference) : fastFindColor, taste: profile.style, recentPurchases: profiles.get(identityKey)?.recentPurchases || [] });
    move(5);
  }

  function ticketContent(): HTMLElement {
    const ticket = make('aside', 'kiosk-ticket-demo'); ticket.setAttribute('aria-label', 'Color-Play demo ticket');
    if (!activeTicket) return ticket;
    ticket.append(make('h3', '', 'Color-Play × Ripley'), make('strong', '', 'DEMO TICKET — NOT VALID AT CHECKOUT'), ticketQr(activeTicket.payload),
      make('p', 'ticket-token', activeTicket.payload), make('p', '', 'Campaign: ' + campaignCode + ' · ' + demoSessionId()),
      make('p', '', 'Mode ' + (mode === 'first' ? '1' : '2') + ' · Sample store layout'));
    activeTicket.rows.forEach(row => ticket.append(make('p', '', row.title + ' · ' + row.color + ' · ' + row.floor)));
    ticket.append(make('p', '', fastFindSizeVisible ? 'Size: ' + (fastFindSize || 'not specified') : 'Size hidden'),
      make('p', '', 'Cumulative working tiers: 1 garment → 3%, 2 → 5%, 3+ → 8%. Maximum one tier, not 3% + 5% + 8%. Eligibility and stacking require Ripley approval.'),
      make('p', '', 'Optional Puntos Go sign-up is previewed separately at demo checkout. No enrollment occurs here.'),
      make('small', '', 'QR contains only the campaign and a random ticket token. No RUT, photo or profile. Not redeemable in a real store.'));
    return ticket;
  }

  function ticketView(): void {
    if (!screen) return;
    screen.append(heading('One ticket. A clearer handoff.', 'A real QR is generated locally. Print it or try the clearly simulated checkout. There is no POS, CRM or printer integration.'), ticketContent(),
      actions(button('Print demo ticket', () => {
        document.querySelector('#print-ticket')?.remove(); const copy = ticketContent(); copy.id = 'print-ticket'; document.body.append(copy); window.print();
      }, 'primary'), button('Try checkout scan (demo)', () => move(6)), button('Back to recommendations', () => move(mode === 'first' ? 3 : 4)), endButton()));
  }

  function checkout(): void {
    if (!screen || !activeTicket) return;
    const ticket = activeTicket;
    screen.append(heading('Checkout, without a real transaction.', 'Select what the shopper buys, then simulate scanning this ticket. Only this page changes: no sale, discount, loyalty enrollment or CRM write occurs.'));
    const picks = make('fieldset', 'checkout-items'); picks.append(make('legend', '', 'Purchased in this simulation'));
    const summary = make('p', 'checkout-summary');
    const updateSummary = (): void => { const n = purchasedSkus.size; summary.textContent = n + ' sample garment(s) · proposed tier ' + (n >= 3 ? 8 : n === 2 ? 5 : n === 1 ? 3 : 0) + '%'; };
    ticket.rows.forEach(row => {
      const label = make('label', 'kiosk-consent'); const input = make('input'); input.type = 'checkbox'; input.value = row.sku; input.name = 'checkout-purchased'; input.checked = purchasedSkus.has(row.sku); input.disabled = ticket.used;
      input.onchange = () => { if (input.checked) purchasedSkus.add(row.sku); else purchasedSkus.delete(row.sku); updateSummary(); };
      label.append(input, document.createTextNode(row.title + ' · ' + row.color)); picks.append(label);
    });
    updateSummary(); screen.append(picks, summary);
    const loyalty = make('label', 'kiosk-consent'); const loyaltyCheck = make('input'); loyaltyCheck.type = 'checkbox'; loyaltyCheck.id = 'puntos-go-demo'; loyaltyCheck.checked = puntosGo; loyaltyCheck.disabled = ticket.used;
    loyaltyCheck.onchange = () => { puntosGo = loyaltyCheck.checked; };
    loyalty.append(loyaltyCheck, document.createTextNode('Preview Puntos Go opt-in (separate and optional; this does not enroll anyone).')); screen.append(loyalty);
    const scanLabel = make('label', 'kiosk-select-label', 'Scanned ticket payload (demo)');
    const scan = make('input'); scan.id = 'checkout-token'; scan.autocomplete = 'off'; scan.value = ticket.payload; scan.disabled = ticket.used; scanLabel.append(scan); screen.append(scanLabel);
    const status = make('p', 'quiz-error'); status.id = 'checkout-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); screen.append(status);
    const scanButton = button(ticket.used ? 'Demo ticket already used' : 'Simulate ticket scan', () => {
      if (ticket.used) { status.textContent = 'This demo ticket has already been scanned. Duplicate checkout blocked in this tab.'; return; }
      if (scan.value.trim() !== ticket.payload) { status.textContent = 'Unknown or modified demo QR token. No checkout recorded.'; return; }
      if (!purchasedSkus.size) { status.textContent = 'Select at least one purchased sample garment, or finish without a purchase.'; return; }
      ticket.used = true; ticket.purchased = [...purchasedSkus]; ticket.tier = purchasedSkus.size >= 3 ? 8 : purchasedSkus.size === 2 ? 5 : 3; ticket.loyalty = puntosGo;
      const boughtRows = ticket.rows.filter(row => purchasedSkus.has(row.sku));
      receipts.push({ ticketId: ticket.id, mode: ticket.mode, colors: boughtRows.map(row => row.color), style: profile.style, size: fastFindSize, bought: [...purchasedSkus], declined: ticket.rows.filter(row => !purchasedSkus.has(row.sku)).map(row => row.sku), tier: ticket.tier, loyalty: puntosGo });
      const saved = profiles.get(identityKey); if (saved) saved.recentPurchases = [...purchasedSkus];
      render(); say('Simulated checkout recorded once in this tab. No purchase, discount or Puntos Go enrollment occurred.');
    }, 'primary');
    scanButton.disabled = ticket.used; screen.append(actions(scanButton, button('Back to ticket', () => move(5)), endButton()));
    if (ticket.used) {
      status.textContent = 'Demo receipt recorded · tier ' + ticket.tier + '% · Puntos Go preview ' + (ticket.loyalty ? 'opted in' : 'not requested') + '. Duplicate scan is blocked.';
      screen.append(button('View Merchant data loop (demo)', () => move(7), 'primary'));
    }
  }

  function merchant(): void {
    if (!screen) return;
    screen.append(heading('From a shortlist to a buying signal.', 'Session → simulated checkout → mock CRM → Merchant preview. These are local demo events, not shopper research, a real customer database or proof of better supplier buys.'));
    const panel = make('div', 'merchant-preview');
    receipts.forEach(receipt => {
      const row = make('article', 'merchant-demo-row');
      row.append(make('h4', '', 'Local demo receipt'), make('p', 'ticket-token', receipt.ticketId), make('p', '', 'Colors purchased (demo): ' + receipt.colors.join(', ') + ' · Style: ' + receipt.style + ' · Size: ' + (fastFindSizeVisible ? receipt.size || 'unspecified' : 'hidden')),
        make('p', '', 'Bought: ' + receipt.bought.join(', ') + ' · Not bought from shortlist: ' + (receipt.declined.join(', ') || 'none')),
        make('p', '', 'Proposed discount: ' + receipt.tier + '% · Puntos Go: ' + (receipt.loyalty ? 'optional preview' : 'not requested')),
        make('small', '', 'A non-purchase does not establish color doubt or a causal reason. CRM matching is simulated; no RUT is exposed.'));
      panel.append(row);
    });
    screen.append(panel, make('p', 'kiosk-private-note', 'Retailer, IT/Data, Operations and privacy approvals are required before any real profile, stock, POS or CRM integration. All values disappear on reset, tab hide, reload or after 3 minutes without input.'),
      actions(button('Return to RUT entry (keep this local demo)', () => move(0)), endButton()));
  }

  function armIdle(): void {
    clearTimeout(idleTimer);
    if (authorized || profiles.size || receipts.length || document.querySelector<HTMLInputElement>('#kiosk-rut')?.value) {
      idleTimer = setTimeout(() => { reset(); say('Session cleared after 3 minutes without input.'); }, 180000);
    }
  }

  function render(): void {
    if (!screen) return;
    document.querySelector('#print-ticket')?.remove();
    const previousFocus = document.activeElement?.id;
    screen.replaceChildren();
    if (stepLabel) stepLabel.textContent = stage === 0 && !entryModeChosen ? 'Inicio' : titles[stage];
    stepBtns.forEach((b) =>
      b.setAttribute(
        'aria-pressed',
        Number(b.dataset.screen) === stage ? 'true' : 'false'
      )
    );
    const views = [welcome, photo, interview, result, fastFind, ticketView, checkout, merchant];
    views[stage]();
    if (previousFocus) document.getElementById(previousFocus)?.focus({ preventScroll: true });
  }

  stepBtns.forEach((b) => {
    b.onclick = () => {
      uploadEpoch++;
      const requested = Number(b.dataset.screen);
      move(requested);
      if (stage === requested) say(`Kiosk view: ${titles[stage]}.`);
    };
  });

  if (restartBtn) {
    restartBtn.onclick = () => {
      reset();
      say(
        "Walkthrough restarted. The camera is off and this view's session is empty."
      );
    };
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { reset(); say('Session and camera cleared when this tab was hidden.'); }
  });
  window.addEventListener('pagehide', reset);
  ['pointerdown', 'keydown', 'input'].forEach(event => document.addEventListener(event, armIdle, { passive: true }));

  render();

  return {
    setStep(stepIndex: number) {
      if (stepIndex >= 0 && stepIndex <= 7) {
        move(stepIndex, false);
      }
    },
    reset
  };
}
