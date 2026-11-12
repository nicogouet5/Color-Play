import type { ScenarioId } from './types';

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
    p.comfort === 'neutral' ||
    (['bottom', 'shoes', 'layer'].includes(kind) && p.comfort !== 'bold')
      ? c.neutral
      : true
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

  const titles = ['Welcome', 'Your photo', 'Your clothes', 'Your result'];
  const initialProfile = (): VisionProfile => ({
    style: 'casual',
    wardrobe: [],
    occasion: 'daily',
    climate: 'mild',
    comfort: 'balanced',
    avoid: []
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
    stopCamera();
    uploadEpoch++;
    stage = next;
    render();
    if (focus) {
      screen?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    }
  }

  function reset(): void {
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
        'Walkthrough finished. Photo, answers and results from the kiosk view cleared.'
      );
    });
  }

  function welcome(): void {
    if (!screen) return;
    const hero = make('div', 'kiosk-welcome');
    const copy = make('div', 'kiosk-welcome-copy');
    copy.append(
      heading(
        'Find your next favorite.',
        'An optional photo, what you like to wear and a look to explore in this store.'
      )
    );
    const list = make('ol', 'kiosk-promise');
    [
      'You choose whether to use the camera.',
      'You tell us which garments you like.',
      'We show you clothes and where to find them.'
    ].forEach((text) => list.append(make('li', '', text)));
    copy.append(list);
    copy.append(
      button('Start my experience', () => move(1), 'primary kiosk-primary'),
      make(
        'p',
        'kiosk-private-note',
        'No account and no photo stored. You can continue without a camera.'
      )
    );
    const visuals = make('div', 'kiosk-welcome-photos');
    visuals.append(
      createClothingImg('shirt', {
        alt: 'Shirts as a clothing reference',
        eager: true
      }),
      createClothingImg('chinos', {
        alt: 'Reference for pants and sneakers',
        eager: true
      })
    );
    hero.append(copy, visuals);
    screen.append(hero);
  }

  function renderReference(): void {
    const status = document.querySelector<HTMLElement>('#kiosk-reference');
    if (status) {
      status.textContent = reference
        ? `Confirmed reference: ${hexFromRgb(reference)}`
        : 'No confirmed reference. You can also continue with just your tastes.';
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
      `Chosen reference: ${hexFromRgb(reference)}. It will be used to match colors, without classifying your appearance.`
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
    if (!file) return;
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
        capture ? 'Choose a color from your photo.' : 'A photo, if you want.',
        "The photo is processed here, during your session. We don't identify your face or automatically determine your skin tone."
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
          : "Find natural light, no filters, and avoid strong shadows. You don't need to pose in any special way."
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
    consent.append(
      check,
      document.createTextNode(
        'I allow the camera to be turned on for this session.'
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
    start.disabled = true;
    check.onchange = () => {
      start.disabled = !check.checked;
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
    side.append(
      button('Upload a photo', () => file.click()),
      file,
      make('small', '', 'JPG, PNG or WebP · up to 15 MB')
    );

    layout.append(view, side);
    screen.append(
      layout,
      actions(
        button('Back', () => move(0)),
        button(
          capture ? 'Continue to my style' : 'Continue without camera',
          () => move(2),
          'primary'
        ),
        endButton()
      )
    );
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
        "Select at least one top and one bottom. These preferences are editable; we don't assume your gender, size or body type."
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
    look.items.forEach((item) => {
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
        make('p', 'kiosk-location', `${place} · simulated location`),
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
        endButton()
      )
    );
  }

  function render(): void {
    if (!screen) return;
    screen.replaceChildren();
    if (stepLabel) stepLabel.textContent = titles[stage];
    stepBtns.forEach((b) =>
      b.setAttribute(
        'aria-pressed',
        Number(b.dataset.screen) === stage ? 'true' : 'false'
      )
    );
    const views = [welcome, photo, interview, result];
    views[stage]();
  }

  stepBtns.forEach((b) => {
    b.onclick = () => {
      uploadEpoch++;
      move(Number(b.dataset.screen));
      say(`Kiosk view: ${titles[stage]}.`);
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
    if (document.hidden) {
      const active = !!media;
      stopCamera();
      if (active && stage === 1) {
        render();
        say('Camera turned off when the page was hidden.');
      }
    }
  });
  window.addEventListener('pagehide', () => {
    stopCamera();
    uploadEpoch++;
  });

  render();

  return {
    setStep(stepIndex: number) {
      if (stepIndex >= 0 && stepIndex <= 3) {
        move(stepIndex, false);
      }
    },
    reset
  };
}
