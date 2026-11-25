export type StoreFloorView = 'all' | 'floor1' | 'floor2';
export type StoreCameraPreset = 'isometric' | 'front' | 'top';
export type StoreKioskId = 'womens' | 'mens';

export interface StoreKioskFocusInfo {
  id: StoreKioskId;
  floor: 'floor1' | 'floor2';
  badge: string;
  location: string;
  title: string;
  placement: string;
  intro: string;
  highlights: string[];
}

export interface StoreMapController {
  rotate: (amount: number) => void;
  tilt: (amount: number) => void;
  zoomBy: (delta: number) => void;
  setFloor: (floor: StoreFloorView) => void;
  setPreset: (preset: StoreCameraPreset) => void;
  focusKiosk: (id: StoreKioskId | null) => void;
  reset: () => void;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Projected {
  x: number;
  y: number;
  depth: number;
  scale: number;
}

interface Quad3D {
  points: Vec3[];
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  alpha?: number;
  depthBias?: number;
}

interface Line3D {
  a: Vec3;
  b: Vec3;
  color: string;
  width: number;
  alpha?: number;
}

interface FloorLayer {
  flats: Quad3D[];
  lines: Line3D[];
  shadows: Quad3D[];
  solids: Quad3D[];
  glass: Quad3D[];
}

interface ZoneLabel {
  text: string;
  sub?: string;
  pos: Vec3;
  floor: 'floor1' | 'floor2';
  detailOnly?: boolean;
  tone?: 'plum' | 'slate' | 'neutral';
}

interface KioskPinSpec {
  id: 'womens' | 'mens';
  floor: 'floor1' | 'floor2';
  badge: string;
  title: string;
  subtitle: string;
  location: string;
  anchor: Vec3;
  top: Vec3;
}

interface ProjectedPin {
  spec: KioskPinSpec;
  x: number;
  y: number;
  ax: number;
  ay: number;
}

const FLOOR_HEIGHT = 6.5;

// Precomputed normalized lighting directions for crisp architectural studio shading.
const KEY_LIGHT = normalize({ x: -0.42, y: 0.84, z: 0.52 });
const FILL_LIGHT = normalize({ x: 0.65, y: 0.36, z: -0.45 });

const shadeCache = new Map<string, string>();

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function shadeHex(hex: string, factor: number): string {
  const bucket = Math.round(factor * 40);
  const key = `${hex}_${bucket}`;
  const cached = shadeCache.get(key);
  if (cached) return cached;
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (clean.length !== 6) return hex;
  const f = bucket / 40;
  const r = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) * f)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) * f)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) * f)));
  const result = `rgb(${r},${g},${b})`;
  shadeCache.set(key, result);
  return result;
}

function shadeForNormal(hex: string, normal: Vec3): string {
  const keyDot = Math.max(0, normal.x * KEY_LIGHT.x + normal.y * KEY_LIGHT.y + normal.z * KEY_LIGHT.z);
  const fillDot = Math.max(0, normal.x * FILL_LIGHT.x + normal.y * FILL_LIGHT.y + normal.z * FILL_LIGHT.z);
  const factor = 0.62 + keyDot * 0.44 + fillDot * 0.14;
  return shadeHex(hex, factor);
}

function createLayer(): FloorLayer {
  return { flats: [], lines: [], shadows: [], solids: [], glass: [] };
}

function pushFloorQuad(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  fill: string,
  stroke?: string,
  depthBias = 10
): void {
  const hw = w / 2;
  const hd = d / 2;
  // Wound CCW when viewed from +Y above so upward-facing floor pads pass backface culling.
  layer.flats.push({
    points: [
      { x: x - hw, y, z: z + hd },
      { x: x + hw, y, z: z + hd },
      { x: x + hw, y, z: z - hd },
      { x: x - hw, y, z: z - hd }
    ],
    fill,
    stroke,
    strokeWidth: stroke ? 0.8 : 0,
    depthBias
  });
}

function pushShadow(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  alpha = 0.11
): void {
  const hw = w / 2;
  const hd = d / 2;
  layer.shadows.push({
    points: [
      { x: x - hw, y: y + 0.018, z: z - hd },
      { x: x + hw, y: y + 0.018, z: z - hd },
      { x: x + hw, y: y + 0.018, z: z + hd },
      { x: x - hw, y: y + 0.018, z: z + hd }
    ],
    fill: '#23132b',
    alpha
  });
}

interface BoxOptions {
  stroke?: string;
  strokeWidth?: number;
  alpha?: number;
  depthBias?: number;
  target?: 'solids' | 'glass' | 'flats';
  topHex?: string;
  frontHex?: string;
  noBottom?: boolean;
}

function pushBox(
  layer: FloorLayer,
  x: number,
  yBottom: number,
  z: number,
  w: number,
  h: number,
  d: number,
  hex: string,
  opts: BoxOptions = {}
): void {
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const y0 = yBottom;
  const y1 = yBottom + h;
  const z0 = z - d / 2;
  const z1 = z + d / 2;
  const list = opts.target === 'glass' ? layer.glass : opts.target === 'flats' ? layer.flats : layer.solids;
  const stroke = opts.stroke ?? (opts.target === 'glass' ? 'rgba(92,118,140,0.42)' : 'rgba(34,20,42,0.14)');
  const strokeWidth = opts.strokeWidth ?? (opts.target === 'glass' ? 0.9 : 0.55);
  const alpha = opts.alpha;
  const depthBias = opts.depthBias ?? 0;

  // All faces wound counter-clockwise when viewed from outside (+Y up, +Z toward viewer).
  // Front (+Z)
  list.push({
    points: [
      { x: x0, y: y0, z: z1 },
      { x: x1, y: y0, z: z1 },
      { x: x1, y: y1, z: z1 },
      { x: x0, y: y1, z: z1 }
    ],
    fill: shadeForNormal(opts.frontHex ?? hex, { x: 0, y: 0, z: 1 }),
    stroke,
    strokeWidth,
    alpha,
    depthBias
  });
  // Back (-Z)
  list.push({
    points: [
      { x: x1, y: y0, z: z0 },
      { x: x0, y: y0, z: z0 },
      { x: x0, y: y1, z: z0 },
      { x: x1, y: y1, z: z0 }
    ],
    fill: shadeForNormal(hex, { x: 0, y: 0, z: -1 }),
    stroke,
    strokeWidth,
    alpha,
    depthBias
  });
  // Right (+X)
  list.push({
    points: [
      { x: x1, y: y0, z: z1 },
      { x: x1, y: y0, z: z0 },
      { x: x1, y: y1, z: z0 },
      { x: x1, y: y1, z: z1 }
    ],
    fill: shadeForNormal(hex, { x: 1, y: 0, z: 0 }),
    stroke,
    strokeWidth,
    alpha,
    depthBias
  });
  // Left (-X)
  list.push({
    points: [
      { x: x0, y: y0, z: z0 },
      { x: x0, y: y0, z: z1 },
      { x: x0, y: y1, z: z1 },
      { x: x0, y: y1, z: z0 }
    ],
    fill: shadeForNormal(hex, { x: -1, y: 0, z: 0 }),
    stroke,
    strokeWidth,
    alpha,
    depthBias
  });
  // Top (+Y)
  list.push({
    points: [
      { x: x0, y: y1, z: z1 },
      { x: x1, y: y1, z: z1 },
      { x: x1, y: y1, z: z0 },
      { x: x0, y: y1, z: z0 }
    ],
    fill: shadeForNormal(opts.topHex ?? hex, { x: 0, y: 1, z: 0 }),
    stroke,
    strokeWidth,
    alpha,
    depthBias
  });
  if (!opts.noBottom) {
    list.push({
      points: [
        { x: x0, y: y0, z: z0 },
        { x: x1, y: y0, z: z0 },
        { x: x1, y: y0, z: z1 },
        { x: x0, y: y0, z: z1 }
      ],
      fill: shadeForNormal(hex, { x: 0, y: -1, z: 0 }),
      stroke,
      strokeWidth,
      alpha,
      depthBias
    });
  }
}

function pushSubdividedWallX(
  layer: FloorLayer,
  xStart: number,
  xEnd: number,
  yBottom: number,
  z: number,
  h: number,
  thickness: number,
  hex: string,
  segments: number,
  topHex?: string
): void {
  const step = (xEnd - xStart) / segments;
  for (let i = 0; i < segments; i += 1) {
    const cx = xStart + (i + 0.5) * step;
    pushBox(layer, cx, yBottom, z, Math.abs(step) + 0.01, h, thickness, hex, {
      topHex: topHex ?? '#f7f3f6',
      noBottom: true
    });
  }
}

function pushSubdividedWallZ(
  layer: FloorLayer,
  x: number,
  yBottom: number,
  zStart: number,
  zEnd: number,
  h: number,
  thickness: number,
  hex: string,
  segments: number,
  topHex?: string
): void {
  const step = (zEnd - zStart) / segments;
  for (let i = 0; i < segments; i += 1) {
    const cz = zStart + (i + 0.5) * step;
    pushBox(layer, x, yBottom, cz, thickness, h, Math.abs(step) + 0.01, hex, {
      topHex: topHex ?? '#f7f3f6',
      noBottom: true
    });
  }
}

function addTileGrid(
  layer: FloorLayer,
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
  step: number,
  color: string,
  alpha = 0.25
): void {
  for (let x = x0 + step; x < x1 - 0.05; x += step) {
    layer.lines.push({ a: { x, y: y + 0.01, z: z0 }, b: { x, y: y + 0.01, z: z1 }, color, width: 0.7, alpha });
  }
  for (let z = z0 + step; z < z1 - 0.05; z += step) {
    layer.lines.push({ a: { x: x0, y: y + 0.01, z }, b: { x: x1, y: y + 0.01, z }, color, width: 0.7, alpha });
  }
}

function addClothingRack(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  orient: 'x' | 'z',
  palette: string[],
  frameColor = '#3a3440'
): void {
  const len = 2.45;
  const dep = 0.74;
  pushShadow(layer, x, y, z, orient === 'x' ? len + 0.2 : dep + 0.2, orient === 'x' ? dep + 0.2 : len + 0.2, 0.11);

  if (orient === 'x') {
    // Base plinth + feet
    pushBox(layer, x, y + 0.02, z, len, 0.08, dep, '#cbc3c8', { topHex: '#e4dde1', noBottom: true });
    pushBox(layer, x - len * 0.45, y + 0.1, z, 0.07, 1.32, 0.07, frameColor, { noBottom: true });
    pushBox(layer, x + len * 0.45, y + 0.1, z, 0.07, 1.32, 0.07, frameColor, { noBottom: true });
    pushBox(layer, x, y + 1.36, z, len * 0.96, 0.07, 0.07, '#9f96a6', { noBottom: true });
    // Center feature topper sign
    pushBox(layer, x, y + 1.43, z, 0.56, 0.24, 0.05, '#f8f4f7', { frontHex: '#741472', noBottom: true });
    // Individual hanging garments
    for (let i = 0; i < 8; i += 1) {
      const gx = x - 0.94 + i * 0.268;
      const col = palette[i % palette.length];
      const gh = 0.84 + (i % 3) * 0.08;
      pushBox(layer, gx, y + 1.24 - gh, z, 0.16, gh, 0.52, col, { topHex: shadeHex(col, 1.1), noBottom: true });
    }
  } else {
    pushBox(layer, x, y + 0.02, z, dep, 0.08, len, '#cbc3c8', { topHex: '#e4dde1', noBottom: true });
    pushBox(layer, x, y + 0.1, z - len * 0.45, 0.07, 1.32, 0.07, frameColor, { noBottom: true });
    pushBox(layer, x, y + 0.1, z + len * 0.45, 0.07, 1.32, 0.07, frameColor, { noBottom: true });
    pushBox(layer, x, y + 1.36, z, 0.07, 0.07, len * 0.96, '#9f96a6', { noBottom: true });
    pushBox(layer, x, y + 1.43, z, 0.05, 0.24, 0.56, '#f8f4f7', { frontHex: '#741472', noBottom: true });
    for (let i = 0; i < 8; i += 1) {
      const gz = z - 0.94 + i * 0.268;
      const col = palette[i % palette.length];
      const gh = 0.84 + (i % 3) * 0.08;
      pushBox(layer, x, y + 1.24 - gh, gz, 0.52, gh, 0.16, col, { topHex: shadeHex(col, 1.1), noBottom: true });
    }
  }
}

function addFourWayRack(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  palette: string[]
): void {
  pushShadow(layer, x, y, z, 1.55, 1.55, 0.12);
  pushBox(layer, x, y + 0.02, z, 0.72, 0.07, 0.72, '#3a3440', { noBottom: true });
  pushBox(layer, x, y + 0.09, z, 0.12, 1.45, 0.12, '#2d2734', { noBottom: true });
  // 4 hanging arms
  const offsets: [number, number, number, number][] = [
    [-0.44, 0, 0.56, 0.24],
    [0.44, 0, 0.56, 0.24],
    [0, -0.44, 0.24, 0.56],
    [0, 0.44, 0.24, 0.56]
  ];
  offsets.forEach(([dx, dz, gw, gd], idx) => {
    const col = palette[idx % palette.length];
    pushBox(layer, x + dx, y + 1.32, z + dz, gw * 0.9, 0.05, gd * 0.45, '#9d95a6', { noBottom: true });
    pushBox(layer, x + dx, y + 0.34, z + dz, gw, 0.92, gd, col, { noBottom: true });
  });
}

function addDisplayTable(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  woodHex: string,
  stacks: string[],
  tiered = false
): void {
  pushShadow(layer, x, y, z, w + 0.22, d + 0.22, 0.12);
  // Legs
  const lx = w / 2 - 0.12;
  const lz = d / 2 - 0.12;
  for (const sx of [-lx, lx]) {
    for (const sz of [-lz, lz]) {
      pushBox(layer, x + sx, y + 0.02, z + sz, 0.08, 0.64, 0.08, '#3d3644', { noBottom: true });
    }
  }
  // Tabletop
  pushBox(layer, x, y + 0.66, z, w, 0.1, d, woodHex, { topHex: shadeHex(woodHex, 1.09), noBottom: true });

  // Folded clothing stacks
  const cols = stacks.length;
  const span = w - 0.48;
  stacks.forEach((col, i) => {
    const sx = cols === 1 ? x : x - span / 2 + (i / (cols - 1)) * span;
    pushBox(layer, sx, y + 0.76, z - 0.14, 0.42, 0.12, 0.46, col, { noBottom: true });
    pushBox(layer, sx, y + 0.88, z - 0.14, 0.39, 0.1, 0.43, shadeHex(col, 1.08), { noBottom: true });
    pushBox(layer, sx, y + 0.76, z + 0.24, 0.4, 0.11, 0.36, shadeHex(col, 0.92), { noBottom: true });
  });

  if (tiered) {
    // Nested lower pull-out table
    pushBox(layer, x + 0.35, y + 0.02, z + d * 0.52, w * 0.58, 0.44, d * 0.48, shadeHex(woodHex, 0.92), {
      topHex: shadeHex(woodHex, 1.04),
      noBottom: true
    });
    pushBox(layer, x + 0.35, y + 0.46, z + d * 0.52, 0.44, 0.14, 0.38, stacks[0], { noBottom: true });
  }
  // Small acrylic tabletop promo riser
  pushBox(layer, x + w * 0.34, y + 0.76, z + d * 0.28, 0.18, 0.26, 0.04, '#ffffff', { frontHex: '#a8115f', noBottom: true });
}

function addMannequin(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  topHex: string,
  bottomHex: string
): void {
  // Base plate & pole
  pushBox(layer, x, y, z, 0.32, 0.04, 0.32, '#c8c0cc', { noBottom: true });
  pushBox(layer, x, y + 0.04, z, 0.06, 0.46, 0.06, '#706879', { noBottom: true });
  // Lower garment / legs
  pushBox(layer, x, y + 0.42, z, 0.28, 0.66, 0.22, bottomHex, { noBottom: true });
  // Upper torso / jacket / top
  pushBox(layer, x, y + 1.08, z, 0.36, 0.58, 0.24, topHex, { topHex: shadeHex(topHex, 1.1), noBottom: true });
  // Stylized neck + head
  pushBox(layer, x, y + 1.66, z, 0.09, 0.1, 0.09, '#ebe3de', { noBottom: true });
  pushBox(layer, x, y + 1.76, z, 0.2, 0.24, 0.2, '#f5efe9', { noBottom: true });
}

function addMannequinPodium(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  outfits: { top: string; bottom: string }[]
): void {
  pushShadow(layer, x, y, z, w + 0.32, d + 0.32, 0.13);
  // Subtle spotlight floor glow
  pushFloorQuad(layer, x, y + 0.015, z, w + 0.55, d + 0.55, 'rgba(255,248,232,0.52)', undefined, 16);
  // Stepped architectural plinth
  pushBox(layer, x, y + 0.02, z, w, 0.14, d, '#d8cfd9', { topHex: '#f6f2f5', noBottom: true });
  pushBox(layer, x, y + 0.16, z, w - 0.18, 0.16, d - 0.18, '#eee8ee', { topHex: '#ffffff', noBottom: true });
  // Accent plum trim strip
  pushBox(layer, x, y + 0.14, z + d / 2 - 0.02, w - 0.06, 0.035, 0.04, '#a8115f', { noBottom: true });

  if (outfits.length === 1) {
    addMannequin(layer, x, y + 0.32, z, outfits[0].top, outfits[0].bottom);
  } else {
    const spread = Math.min(w * 0.27, 0.56);
    addMannequin(layer, x - spread, y + 0.32, z + 0.05, outfits[0].top, outfits[0].bottom);
    addMannequin(layer, x + spread, y + 0.32, z - 0.05, outfits[1].top, outfits[1].bottom);
  }
}

function addWallMerchBay(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  wall: 'back' | 'left' | 'right',
  palette: string[],
  woodHex = '#e6ddd9'
): void {
  if (wall === 'back') {
    pushBox(layer, x, y + 0.02, z, 2.35, 2.15, 0.42, woodHex, { topHex: '#f4eef1', noBottom: true });
    // Warm recessed top shelf
    pushBox(layer, x, y + 1.72, z + 0.24, 2.15, 0.08, 0.36, '#fff8e8', { noBottom: true });
    // Folded boxes on top shelf
    for (let i = 0; i < 4; i += 1) {
      pushBox(layer, x - 0.75 + i * 0.5, y + 1.8, z + 0.24, 0.36, 0.22, 0.28, palette[(i + 2) % palette.length], { noBottom: true });
    }
    // Hanging garments below
    for (let i = 0; i < 6; i += 1) {
      pushBox(layer, x - 0.85 + i * 0.34, y + 0.45, z + 0.26, 0.22, 1.02, 0.26, palette[i % palette.length], { noBottom: true });
    }
  } else if (wall === 'left') {
    pushBox(layer, x, y + 0.02, z, 0.42, 1.85, 2.25, woodHex, { topHex: '#f4eef1', noBottom: true });
    pushBox(layer, x + 0.24, y + 1.48, z, 0.34, 0.07, 2.05, '#fff8e8', { noBottom: true });
    for (let i = 0; i < 5; i += 1) {
      pushBox(layer, x + 0.26, y + 0.38, z - 0.78 + i * 0.39, 0.26, 0.94, 0.24, palette[i % palette.length], { noBottom: true });
    }
  } else {
    pushBox(layer, x, y + 0.02, z, 0.42, 1.85, 2.25, woodHex, { topHex: '#f4eef1', noBottom: true });
    pushBox(layer, x - 0.24, y + 1.48, z, 0.34, 0.07, 2.05, '#fff8e8', { noBottom: true });
    for (let i = 0; i < 5; i += 1) {
      pushBox(layer, x - 0.26, y + 0.38, z - 0.78 + i * 0.39, 0.26, 0.94, 0.24, palette[i % palette.length], { noBottom: true });
    }
  }
}

function addFittingRooms(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  stalls: number,
  woodHex: string,
  curtainHex: string
): void {
  const stallW = 1.22;
  const totalW = stalls * stallW + 0.36;
  const depth = 2.05;
  pushShadow(layer, x, y, z, totalW + 0.25, depth + 0.25, 0.14);
  // Warm carpet floor inside suite
  pushFloorQuad(layer, x, y + 0.02, z + 0.45, totalW + 0.5, depth + 1.15, '#e8e0e6', 'rgba(116,20,114,0.16)', 14);
  // Back wall of stalls
  pushSubdividedWallX(layer, x - totalW / 2, x + totalW / 2, y, z - depth / 2, 2.28, 0.18, woodHex, stalls);
  // Individual stall partition walls & curtains
  for (let i = 0; i <= stalls; i += 1) {
    const px = x - totalW / 2 + 0.18 + i * stallW;
    pushBox(layer, px, y, z, 0.14, 2.2, depth, woodHex, { topHex: '#f5eff2', noBottom: true });
    if (i < stalls) {
      const cx = px + stallW / 2;
      // Soft illuminated floor inside stall
      pushFloorQuad(layer, cx, y + 0.025, z, stallW - 0.18, depth - 0.24, '#f8f2ec', undefined, 16);
      // Interior wooden bench inside stall
      pushBox(layer, cx, y + 0.02, z - depth * 0.26, 0.56, 0.42, 0.34, '#c4b1a3', { noBottom: true });
      // Recessed door / draped curtain panel (partially open)
      pushBox(layer, cx - 0.14, y + 0.16, z + depth / 2 - 0.08, 0.64, 1.84, 0.08, curtainHex, { noBottom: true });
    }
  }
  // Ripley plum fascia header beam across all stalls
  pushBox(layer, x, y + 2.16, z + depth / 2 - 0.06, totalW + 0.06, 0.34, 0.24, '#741472', {
    topHex: '#923590',
    frontHex: '#741472',
    noBottom: true
  });
  // External waiting bench & full-length mirror pillar
  pushBox(layer, x - totalW * 0.2, y + 0.02, z + depth / 2 + 0.68, 1.45, 0.44, 0.48, '#6e576c', { topHex: '#8d728a', noBottom: true });
  pushBox(layer, x + totalW * 0.34, y + 0.02, z + depth / 2 + 0.62, 0.55, 1.85, 0.16, '#2f2936', { frontHex: '#dce7f2', noBottom: true });
}

function addCheckoutCounter(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  w: number,
  terminals: number,
  plumAccent = '#741472'
): void {
  pushShadow(layer, x, y, z, w + 0.35, 1.55, 0.14);
  // Rear service credenza wall
  pushBox(layer, x, y + 0.02, z - 0.92, w, 2.24, 0.34, '#efe9ee', { topHex: '#faf7fa', noBottom: true });
  // Illuminated header bar on rear wall
  pushBox(layer, x, y + 1.88, z - 0.72, w - 0.3, 0.34, 0.12, plumAccent, { topHex: '#943592', noBottom: true });
  // Front customer counter (white top + plum front apron)
  pushBox(layer, x, y + 0.02, z + 0.38, w, 0.96, 0.82, '#ebe4ea', {
    frontHex: plumAccent,
    topHex: '#ffffff',
    noBottom: true
  });
  // Side return wing
  pushBox(layer, x - w / 2 + 0.34, y + 0.02, z - 0.15, 0.68, 0.96, 0.85, '#ebe4ea', { topHex: '#ffffff', noBottom: true });
  // POS monitors
  const span = w - 1.1;
  for (let i = 0; i < terminals; i += 1) {
    const tx = terminals === 1 ? x : x - span / 2 + (i / (terminals - 1)) * span;
    pushBox(layer, tx, y + 0.98, z + 0.34, 0.12, 0.16, 0.12, '#2d2734', { noBottom: true });
    pushBox(layer, tx, y + 1.12, z + 0.34, 0.44, 0.34, 0.09, '#221c29', { frontHex: '#43384f', noBottom: true });
    // Mini card reader beside POS
    pushBox(layer, tx + 0.32, y + 0.98, z + 0.56, 0.12, 0.11, 0.16, '#3c3445', { noBottom: true });
  }
  // Queue stanchions in front of counter
  const stanchionCount = 3;
  for (let i = 0; i < stanchionCount; i += 1) {
    const sx = x - w * 0.36 + (i / (stanchionCount - 1)) * (w * 0.72);
    pushBox(layer, sx, y + 0.02, z + 1.48, 0.22, 0.05, 0.22, '#3d3645', { noBottom: true });
    pushBox(layer, sx, y + 0.07, z + 1.48, 0.06, 0.82, 0.06, '#6e6678', { noBottom: true });
  }
  pushBox(layer, x, y + 0.78, z + 1.48, w * 0.72, 0.05, 0.04, '#a8115f', { noBottom: true });
}

function addGlassShowcase(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  items: string[]
): void {
  pushShadow(layer, x, y, z, w + 0.2, d + 0.2, 0.12);
  // Marble base cabinet
  pushBox(layer, x, y + 0.02, z, w, 0.68, d, '#e4dce2', { topHex: '#f8f4f7', noBottom: true });
  // Gold/brass accent rim
  pushBox(layer, x, y + 0.7, z, w + 0.02, 0.04, d + 0.02, '#c5a46e', { noBottom: true });
  // Tiny accessories / handbags displayed inside
  items.forEach((col, i) => {
    const ix = items.length === 1 ? x : x - (w * 0.34) + (i / (items.length - 1)) * (w * 0.68);
    pushBox(layer, ix, y + 0.74, z, 0.28, 0.24, 0.2, col, { noBottom: true });
  });
  // Translucent glass vitrine canopy (Pass D)
  pushBox(layer, x, y + 0.74, z, w - 0.04, 0.44, d - 0.04, '#d8eef8', {
    target: 'glass',
    alpha: 0.34,
    noBottom: true
  });
}

function addFootwearWall(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  d: number
): void {
  pushShadow(layer, x - 0.3, y, z, 1.3, d + 0.2, 0.12);
  // Dark slatted backwall panel
  pushBox(layer, x, y + 0.02, z, 0.24, 2.05, d, '#35313d', { topHex: '#504a5c', noBottom: true });
  const shoeColors = ['#eceae4', '#2e3a4d', '#8e6248', '#465249', '#25262e', '#b9aba0'];
  for (let row = 0; row < 3; row += 1) {
    const sy = y + 0.56 + row * 0.48;
    pushBox(layer, x - 0.24, sy, z, 0.32, 0.05, d - 0.24, '#e6e0db', { noBottom: true });
    for (let s = 0; s < 6; s += 1) {
      const sz = z - d * 0.38 + (s / 5) * (d * 0.76);
      const col = shoeColors[(s + row * 2) % shoeColors.length];
      pushBox(layer, x - 0.26, sy + 0.05, sz, 0.24, 0.13, 0.14, col, { noBottom: true });
    }
  }
  // Leather try-on bench in front of shoe wall
  pushBox(layer, x - 1.35, y + 0.02, z, 0.56, 0.44, 1.85, '#59473d', { topHex: '#786053', noBottom: true });
}

function addPlanter(layer: FloorLayer, x: number, y: number, z: number): void {
  pushShadow(layer, x, y, z, 0.82, 0.82, 0.13);
  pushBox(layer, x, y + 0.02, z, 0.58, 0.56, 0.58, '#d4c9c3', { topHex: '#6e5c52', noBottom: true });
  pushBox(layer, x, y + 0.58, z, 0.11, 0.45, 0.11, '#6a5042', { noBottom: true });
  // Sculpted foliage crown
  pushBox(layer, x, y + 0.88, z, 0.66, 0.48, 0.66, '#507257', { topHex: '#6a9171', noBottom: true });
  pushBox(layer, x, y + 1.32, z, 0.46, 0.34, 0.46, '#5e8365', { topHex: '#7ba482', noBottom: true });
}

function addDigitalTotem(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  orient: 'x' | 'z',
  screenHex: string
): void {
  const w = orient === 'x' ? 0.82 : 0.22;
  const d = orient === 'x' ? 0.22 : 0.82;
  pushShadow(layer, x, y, z, w + 0.25, d + 0.25, 0.12);
  pushBox(layer, x, y + 0.02, z, w + 0.12, 0.12, d + 0.12, '#2d2635', { noBottom: true });
  pushBox(layer, x, y + 0.14, z, w, 1.82, d, '#231d2b', { frontHex: screenHex, noBottom: true });
}

/**
 * Miniature 3D architectural replica of the actual Color-Play Kiosk & Curated Rack
 * placed strategically at each apparel floor entrance.
 */
function addColorPlayKiosk(
  layer: FloorLayer,
  x: number,
  y: number,
  z: number,
  garments: string[],
  floorTint: string
): void {
  // Bright 5000K illuminated floor pool so shoppers & reviewers spot it immediately
  pushFloorQuad(layer, x, y + 0.02, z + 0.12, 3.0, 2.2, floorTint, '#a8115f', 16);
  pushShadow(layer, x, y, z, 2.45, 1.32, 0.16);

  // Architectural plinth platform + magenta front accent strip
  pushBox(layer, x, y + 0.02, z, 2.34, 0.12, 1.16, '#ebe3ef', { topHex: '#f8f4fa', noBottom: true });
  pushBox(layer, x, y + 0.04, z + 0.59, 2.32, 0.07, 0.06, '#b80a6b', { noBottom: true });

  // Matte charcoal outer portal frame (#201b27) + stabilizer feet
  pushBox(layer, x - 1.06, y + 0.14, z, 0.11, 0.06, 0.86, '#201b27', { noBottom: true });
  pushBox(layer, x + 1.06, y + 0.14, z, 0.11, 0.06, 0.86, '#201b27', { noBottom: true });
  pushBox(layer, x - 1.06, y + 0.14, z, 0.09, 2.08, 0.09, '#201b27', { noBottom: true });
  pushBox(layer, x + 1.06, y + 0.14, z, 0.09, 2.08, 0.09, '#201b27', { noBottom: true });
  pushBox(layer, x - 0.12, y + 0.14, z, 0.07, 2.04, 0.07, '#2a2233', { noBottom: true });

  // 5000K CRI 95+ Overhead Daylight Canopy Bar + luminous diffuser
  pushBox(layer, x, y + 2.18, z + 0.08, 2.26, 0.14, 0.34, '#201b27', {
    frontHex: '#741472',
    topHex: '#3c3249',
    noBottom: true
  });
  pushBox(layer, x, y + 2.22, z + 0.26, 1.35, 0.05, 0.03, '#f6d2e8', { noBottom: true });
  pushBox(layer, x, y + 2.12, z + 0.1, 2.08, 0.06, 0.22, '#fff9e4', { topHex: '#ffffff', noBottom: true });

  // Left Bay: Kiosk Backboard, Mirror, Camera, Magenta Touchscreen, Swatches & QR slot
  pushBox(layer, x - 0.59, y + 0.14, z - 0.04, 0.86, 1.98, 0.09, '#ffffff', { noBottom: true, depthBias: -0.2 });
  // Framing mirror with subtle reflective sheen band
  pushBox(layer, x - 0.59, y + 1.32, z + 0.04, 0.66, 0.56, 0.05, '#dce7f3', { stroke: '#a8115f', noBottom: true, depthBias: 0.1 });
  pushBox(layer, x - 0.68, y + 1.42, z + 0.08, 0.16, 0.36, 0.02, '#f2f7fc', { noBottom: true, depthBias: 0.25 });
  // Camera module & optical lens above screen
  pushBox(layer, x - 0.59, y + 1.21, z + 0.14, 0.2, 0.09, 0.08, '#201b27', { noBottom: true, depthBias: 0.2 });
  pushBox(layer, x - 0.59, y + 1.23, z + 0.2, 0.055, 0.055, 0.025, '#59829d', { noBottom: true, depthBias: 0.35 });
  // Angled touchscreen console housing & bright interactive UI tiles
  pushBox(layer, x - 0.59, y + 0.78, z + 0.16, 0.72, 0.44, 0.24, '#201b27', {
    frontHex: '#341430',
    noBottom: true,
    depthBias: 0.15
  });
  pushBox(layer, x - 0.59, y + 0.84, z + 0.3, 0.58, 0.32, 0.035, '#fcecf5', {
    frontHex: '#fff5fa',
    stroke: '#a8115f',
    noBottom: true,
    depthBias: 0.28
  });
  // Mini split welcome tiles rendered right on the kiosk screen for close-up realism
  pushBox(layer, x - 0.73, y + 0.89, z + 0.33, 0.23, 0.2, 0.02, '#a8115f', { noBottom: true, depthBias: 0.42 });
  pushBox(layer, x - 0.45, y + 0.89, z + 0.33, 0.23, 0.2, 0.02, '#f1c7df', { noBottom: true, depthBias: 0.42 });
  // Brushed metal drape bar + 4 tactile fabric drape swatches below console
  pushBox(layer, x - 0.59, y + 0.69, z + 0.14, 0.72, 0.03, 0.04, '#887f94', { noBottom: true, depthBias: 0.22 });
  const drapes = ['#b80a6b', '#d999be', '#b84a27', '#4a5d3f'];
  drapes.forEach((col, i) => {
    pushBox(layer, x - 0.83 + i * 0.16, y + 0.45, z + 0.16, 0.12, 0.24, 0.045, col, { noBottom: true, depthBias: 0.32 });
  });
  // QR ticket printer bay + glowing slot
  pushBox(layer, x - 0.59, y + 0.23, z + 0.11, 0.64, 0.18, 0.16, '#fcecf5', { stroke: '#a8115f', noBottom: true, depthBias: 0.18 });
  pushBox(layer, x - 0.59, y + 0.3, z + 0.21, 0.32, 0.04, 0.02, '#201b27', { noBottom: true, depthBias: 0.36 });

  // Right Bay: Curated Garment Rail with 5 Color-Matched Pieces, Hangers & Hook Tags
  pushBox(layer, x + 0.48, y + 1.88, z, 1.12, 0.055, 0.055, '#9d95a6', { noBottom: true });
  garments.forEach((col, i) => {
    const gx = x + 0.08 + i * 0.2;
    const zPull = i % 2 === 0 ? 0.05 : 0;
    // Metal hanger stem
    pushBox(layer, gx, y + 1.78, z + zPull, 0.025, 0.11, 0.06, '#625a6c', { noBottom: true });
    // Sculpted garment body
    pushBox(layer, gx, y + 0.78, z + zPull, 0.13, 1.0, 0.42, col, { noBottom: true });
    // Light collar highlight
    pushBox(layer, gx, y + 1.67, z + zPull + 0.04, 0.135, 0.1, 0.24, '#f7f1ee', { noBottom: true });
    // Bottom hook number tag
    pushBox(layer, gx, y + 0.64, z + zPull + 0.14, 0.11, 0.09, 0.04, i % 2 === 0 ? '#b80a6b' : '#201b27', { noBottom: true });
  });

  // Translucent 5000K daylight cone beneath canopy (Pass D)
  layer.glass.push({
    points: [
      { x: x - 1.0, y: y + 2.12, z: z + 0.18 },
      { x: x + 1.0, y: y + 2.12, z: z + 0.18 },
      { x: x + 1.25, y: y + 0.08, z: z + 0.62 },
      { x: x - 1.25, y: y + 0.08, z: z + 0.62 }
    ],
    fill: '#fff8d9',
    stroke: 'rgba(255,244,200,0.2)',
    strokeWidth: 0.6,
    alpha: 0.24
  });
}

function buildFloor1(layer: FloorLayer, facadeLayer: FloorLayer): void {
  const y = 0;

  // 1. Structural Foundation Slab
  pushBox(layer, 0, -0.44, 0, 21.4, 0.44, 15.2, '#b9b1bb', {
    topHex: '#f1edea',
    target: 'flats',
    depthBias: -25
  });

  // 2. Department Flooring Zones
  // Left wing: Women's Casual & Trends (warm oak planks)
  pushFloorQuad(layer, -6.5, y + 0.012, 0.2, 7.6, 12.6, '#eadcd1', 'rgba(126,98,84,0.18)', 10);
  addTileGrid(layer, -10.3, -2.7, y + 0.012, -6.1, 6.5, 1.25, '#bfa795', 0.28);

  // Right wing: Accessories, Footwear & Tailoring (warm blush limestone)
  pushFloorQuad(layer, 6.5, y + 0.012, 0.2, 7.6, 12.6, '#efe7e9', 'rgba(116,20,114,0.12)', 10);
  addTileGrid(layer, 2.7, 10.3, y + 0.012, -6.1, 6.5, 1.5, '#cbbcc3', 0.28);

  // Central Travertine Marble Boulevard (Entrance -> Atrium)
  pushFloorQuad(layer, 0, y + 0.018, 0.5, 5.4, 13.8, '#f7f4f0', '#d5c9ce', 12);
  addTileGrid(layer, -2.7, 2.7, y + 0.018, -6.4, 7.4, 1.35, '#d6cbc6', 0.35);

  // Entrance welcome mat & directional brass inlay lines
  pushFloorQuad(layer, 0, y + 0.025, 6.45, 3.8, 1.15, '#4c3e4d', undefined, 16);
  pushFloorQuad(layer, 0, y + 0.024, 4.3, 0.12, 2.8, '#c9ab78', undefined, 16);

  // 3. Perimeter Cutaway Walls (subdivided for clean depth sorting)
  pushSubdividedWallX(layer, -10.6, 10.6, y, -7.45, 2.55, 0.28, '#e3dce0', 8, '#f7f3f5');
  pushSubdividedWallZ(layer, -10.55, y, -7.35, 7.35, 1.75, 0.26, '#e0d8dd', 6, '#f7f3f5');
  pushSubdividedWallZ(layer, 10.55, y, -7.35, 7.35, 1.75, 0.26, '#e0d8dd', 6, '#f7f3f5');

  // Back wall Ripley plum department fascia banner + flanking feature merchandising bays
  pushBox(layer, 0, y + 2.15, -7.24, 7.2, 0.42, 0.16, '#741472', { topHex: '#943592', noBottom: true });
  addWallMerchBay(layer, -2.55, y, -7.12, 'back', ['#b85e74', '#f2e3da', '#8e3d52', '#dfa9a8', '#685966', '#d8b79f']);
  addWallMerchBay(layer, 2.55, y, -7.12, 'back', ['#c88ea2', '#f5ece6', '#67776c', '#d5a897', '#493c4d', '#e4cfc3']);

  // 4. Front Mall Storefront Facade (z = +7.35) — placed in facadeLayer so close-up interior zoom cuts away cleanly
  // Left & right low showcase plinths + dressed display window mannequins + glass fronts
  pushBox(facadeLayer, -6.75, y, 7.15, 7.2, 0.34, 0.92, '#d9cfd6', { topHex: '#f8f5f7', noBottom: true });
  pushBox(facadeLayer, 6.75, y, 7.15, 7.2, 0.34, 0.92, '#d9cfd6', { topHex: '#f8f5f7', noBottom: true });
  addMannequin(facadeLayer, -8.1, y + 0.34, 7.05, '#b80a6b', '#27222f');
  addMannequin(facadeLayer, -5.4, y + 0.34, 7.05, '#e8d4c8', '#7d4d5b');
  addMannequin(facadeLayer, 5.4, y + 0.34, 7.05, '#c48996', '#f2e8e2');
  addMannequin(facadeLayer, 8.1, y + 0.34, 7.05, '#5b6c5a', '#e4d8ce');

  // Storefront translucent glass windows (Pass D)
  pushBox(facadeLayer, -6.75, y + 0.34, 7.56, 7.1, 1.85, 0.08, '#cde4f2', { target: 'glass', alpha: 0.28, noBottom: true });
  pushBox(facadeLayer, 6.75, y + 0.34, 7.56, 7.1, 1.85, 0.08, '#cde4f2', { target: 'glass', alpha: 0.28, noBottom: true });

  // Ripley Main Entrance Portal Arch (cut away during interior kiosk close-up)
  pushBox(facadeLayer, -3.15, y, 7.45, 0.3, 2.38, 0.36, '#302435', { noBottom: true });
  pushBox(facadeLayer, 3.15, y, 7.45, 0.3, 2.38, 0.36, '#302435', { noBottom: true });
  pushBox(facadeLayer, 0, y + 2.28, 7.45, 6.65, 0.44, 0.38, '#741472', { topHex: '#943592', noBottom: true });
  // 4 Security EAS anti-theft pedestals at doorway (stay visible to orient the entrance)
  for (const gx of [-2.25, -0.78, 0.78, 2.25]) {
    pushBox(layer, gx, y + 0.02, 6.55, 0.12, 1.24, 0.34, '#dcd6df', { topHex: '#a8115f', noBottom: true });
  }

  // 5. STRATEGIC COLOR-PLAY KIOSK #1 — Women's Apparel Entrance!
  addColorPlayKiosk(
    layer,
    -3.35,
    y,
    4.55,
    ['#b80a6b', '#f0dcd5', '#8c3d5e', '#d999be', '#566859'],
    'rgba(255,244,218,0.68)'
  );

  // 6. Feature Mannequin Podiums along Main Boulevard
  addMannequinPodium(layer, 3.35, y, 4.75, 2.15, 1.35, [
    { top: '#a8115f', bottom: '#f3eae4' },
    { top: '#d6b49d', bottom: '#3a3444' }
  ]);
  addMannequinPodium(layer, -4.65, y, 1.45, 1.45, 1.35, [
    { top: '#944a5e', bottom: '#e6d8d1' }
  ]);

  // 7. Women's Casual & Trends Zone (Left Wing)
  const womenWarm = ['#b85e74', '#f2e3da', '#8e3d52', '#dfa9a8', '#685966', '#d8b79f', '#a8115f', '#e7d5cc'];
  const womenSoft = ['#c88ea2', '#f5ece6', '#67776c', '#d5a897', '#493c4d', '#e4cfc3', '#9e5d70', '#c7b8c9'];
  addClothingRack(layer, -8.35, y, 4.65, 'x', womenWarm);
  addClothingRack(layer, -8.35, y, 1.65, 'x', womenSoft);
  addClothingRack(layer, -8.35, y, -1.25, 'x', womenWarm);
  addClothingRack(layer, -4.9, y, -1.25, 'x', womenSoft);
  addDisplayTable(layer, -6.5, y, 3.15, 2.05, 1.05, '#d5beb0', ['#a65a6e', '#e7d4cb', '#685b6a'], true);
  addFourWayRack(layer, -5.2, y, 0.05, ['#b80a6b', '#ecdcd3', '#7f5162', '#d7a89c']);

  // Perimeter Wall Merchandising Bays (Left & Back-Center)
  addWallMerchBay(layer, -10.22, y, 3.4, 'left', womenWarm);
  addWallMerchBay(layer, -10.22, y, -0.2, 'left', womenSoft);

  // 8. Accessories, Handbags & Footwear Island (Front-Right Wing)
  addGlassShowcase(layer, 6.95, y, 4.75, 2.55, 0.92, ['#a8115f', '#d9b58e', '#322b38', '#c88092']);
  addDisplayTable(layer, 6.95, y, 2.45, 2.15, 1.05, '#decbc0', ['#8d3d5c', '#f0e2da', '#c5957f'], false);
  // Plush try-on ottoman + freestanding mirror
  pushShadow(layer, 4.45, y, 2.6, 1.15, 1.15, 0.12);
  pushBox(layer, 4.45, y + 0.02, 2.6, 0.96, 0.44, 0.96, '#844e75', { topHex: '#9d648d', noBottom: true });
  pushBox(layer, 9.65, y + 0.02, 4.4, 0.18, 1.85, 0.72, '#342c3c', { frontHex: '#dce7f3', noBottom: true });

  // 9. Tailoring & Knitwear Zone (Mid-Right Wing)
  addClothingRack(layer, 5.2, y, -0.35, 'x', womenSoft);
  addClothingRack(layer, 8.35, y, -0.35, 'x', womenWarm);
  addClothingRack(layer, 6.8, y, -2.55, 'x', ['#554558', '#f0e5de', '#9e4b62', '#cbb4a4', '#373140', '#d6a4aa']);
  addWallMerchBay(layer, 10.22, y, 1.5, 'right', womenSoft);
  addWallMerchBay(layer, 10.22, y, -1.9, 'right', womenWarm);
  addDigitalTotem(layer, 3.45, y, 0.85, 'z', '#a8115f');

  // 10. Women's Fitting Rooms (Back-Left Corner)
  addFittingRooms(layer, -7.2, y, -5.85, 4, '#d9c5b8', '#a1738b');

  // 11. Floor 1 Checkout & Customer Service (Back-Right)
  addCheckoutCounter(layer, 6.8, y, -5.95, 5.1, 3, '#741472');

  // 12. Architectural Planters (front-left planter goes in facadeLayer so it never obscures Kiosk L1 close-up)
  addPlanter(facadeLayer, -3.55, y, 6.45);
  addPlanter(layer, 3.55, y, 6.45);
  addPlanter(layer, -3.15, y, -2.85);
  addPlanter(layer, 3.15, y, -2.85);
}

function buildAtriumConnectors(layer: FloorLayer, yBottom: number, yTop: number): void {
  const height = yTop - yBottom;

  // 4 Structural Architectural Columns anchoring Floor 2 around the atrium void
  const colPositions: [number, number][] = [
    [-3.05, -2.45],
    [3.05, -2.45],
    [-3.05, 2.25],
    [3.05, 2.25]
  ];
  for (const [cx, cz] of colPositions) {
    pushBox(layer, cx, yBottom, cz, 0.44, height, 0.44, '#e4dde4', {
      topHex: '#f6f2f6',
      noBottom: true
    });
    // Base & capital plum collars
    pushBox(layer, cx, yBottom + 0.02, cz, 0.52, 0.16, 0.52, '#625668', { noBottom: true });
    pushBox(layer, cx, yTop - 0.18, cz, 0.52, 0.16, 0.52, '#741472', { noBottom: true });
  }

  // Panoramic Glass Elevator Core at rear of atrium (x = 0, z = -3.75)
  const ez = -3.75;
  pushBox(layer, 0, yBottom + 0.02, ez, 2.1, 0.12, 1.65, '#473f50', { noBottom: true });
  // 4 brushed steel shaft corner rails
  for (const dx of [-0.96, 0.96]) {
    for (const dz of [-0.74, 0.74]) {
      pushBox(layer, dx, yBottom, ez + dz, 0.12, height + 2.2, 0.12, '#5a5364', { noBottom: true });
    }
  }
  // Visible elevator cab rising mid-shaft with warm interior light
  const cabY = yBottom + height * 0.34;
  pushBox(layer, 0, cabY, ez, 1.62, 1.95, 1.24, '#e8e2ea', {
    frontHex: '#fff5e0',
    topHex: '#4f4659',
    noBottom: false
  });
  // Elevator top lintel & plum badge
  pushBox(layer, 0, yTop + 1.95, ez, 2.14, 0.28, 1.68, '#383042', { frontHex: '#741472', noBottom: true });
  // Translucent elevator glass enclosure
  pushBox(layer, 0, yBottom + 0.14, ez, 1.96, height + 1.8, 1.52, '#cce5f4', {
    target: 'glass',
    alpha: 0.22,
    noBottom: true
  });

  // Parallel UP & DOWN Escalators bridging Floor 1 (z = -1.75) -> Floor 2 landing (z = +1.75)
  const zStart = -1.75;
  const zEnd = 1.75;
  const steps = 11;
  for (const laneX of [-1.05, 1.05]) {
    const isUp = laneX < 0;
    // Lower & upper landing metal comb plates
    pushBox(layer, laneX, yBottom + 0.01, zStart - 0.36, 1.18, 0.08, 0.65, '#8c8894', {
      topHex: isUp ? '#6f9c7b' : '#c69968',
      noBottom: true
    });
    pushBox(layer, laneX, yTop - 0.06, zEnd + 0.34, 1.18, 0.08, 0.65, '#8c8894', {
      topHex: isUp ? '#6f9c7b' : '#c69968',
      noBottom: true
    });

    // Stepped escalator treads ascending smoothly from zStart to zEnd
    const dz = (zEnd - zStart) / steps;
    const dy = height / steps;
    for (let i = 0; i < steps; i += 1) {
      const sz = zStart + (i + 0.5) * dz;
      const sy = yBottom + i * dy;
      // Structural truss underside block
      pushBox(layer, laneX, sy, sz, 1.14, dy + 0.12, dz + 0.06, '#5f5b69', {
        topHex: '#9c9aa4',
        noBottom: false
      });
      // Step yellow safety nosing line
      pushBox(layer, laneX, sy + dy + 0.09, sz + dz * 0.4, 0.96, 0.03, 0.06, '#e2be56', { noBottom: true });
    }

    // Sloped glass side balustrades & dark rubber moving handrails
    for (const side of [-0.57, 0.57]) {
      const hx = laneX + side;
      layer.glass.push({
        points: [
          { x: hx, y: yBottom + 0.15, z: zStart },
          { x: hx, y: yTop + 0.15, z: zEnd },
          { x: hx, y: yTop + 0.92, z: zEnd },
          { x: hx, y: yBottom + 0.92, z: zStart }
        ],
        fill: '#cde4f2',
        stroke: '#2c2635',
        strokeWidth: 2.1,
        alpha: 0.34
      });
    }
  }
}

function buildFloor1EscalatorStub(layer: FloorLayer): void {
  const y = 0;
  // Elevator lobby portal on Floor 1
  const ez = -3.75;
  pushBox(layer, 0, y + 0.02, ez, 2.15, 2.25, 1.65, '#dfd9e2', { topHex: '#f4f0f5', noBottom: true });
  pushBox(layer, -0.44, y + 0.04, ez + 0.84, 0.72, 1.98, 0.05, '#b6b0be', { noBottom: true });
  pushBox(layer, 0.44, y + 0.04, ez + 0.84, 0.72, 1.98, 0.05, '#b6b0be', { noBottom: true });
  pushBox(layer, 0, y + 2.04, ez + 0.85, 1.85, 0.24, 0.08, '#741472', { noBottom: true });

  // Lower cutaway run of parallel UP & DOWN escalators heading toward Floor 2
  const zStart = -1.75;
  const steps = 6;
  const dz = 3.5 / 11;
  const dy = FLOOR_HEIGHT / 11;
  for (const laneX of [-1.05, 1.05]) {
    const isUp = laneX < 0;
    pushBox(layer, laneX, y + 0.01, zStart - 0.36, 1.18, 0.08, 0.65, '#8c8894', {
      topHex: isUp ? '#6f9c7b' : '#c69968',
      noBottom: true
    });
    for (let i = 0; i < steps; i += 1) {
      const sz = zStart + (i + 0.5) * dz;
      const sy = y + i * dy;
      pushBox(layer, laneX, sy, sz, 1.14, dy + 0.12, dz + 0.06, '#5f5b69', { topHex: '#9c9aa4', noBottom: false });
      pushBox(layer, laneX, sy + dy + 0.09, sz + dz * 0.4, 0.96, 0.03, 0.06, '#e2be56', { noBottom: true });
    }
    const zTop = zStart + steps * dz;
    const yTop = y + steps * dy;
    for (const side of [-0.57, 0.57]) {
      const hx = laneX + side;
      layer.glass.push({
        points: [
          { x: hx, y: y + 0.15, z: zStart },
          { x: hx, y: yTop + 0.15, z: zTop },
          { x: hx, y: yTop + 0.86, z: zTop },
          { x: hx, y: y + 0.86, z: zStart }
        ],
        fill: '#cde4f2',
        stroke: '#2c2635',
        strokeWidth: 2,
        alpha: 0.34
      });
    }
  }
}

function buildFloor2EscalatorStub(layer: FloorLayer): void {
  const yTop = FLOOR_HEIGHT;
  // Upper half of escalators emerging cleanly out of the open Floor 2 atrium void
  const zStart = -1.75;
  const zEnd = 1.75;
  const totalSteps = 11;
  const startStep = 5;
  const dz = (zEnd - zStart) / totalSteps;
  const dy = FLOOR_HEIGHT / totalSteps;
  for (const laneX of [-1.05, 1.05]) {
    const isUp = laneX < 0;
    pushBox(layer, laneX, yTop - 0.06, zEnd + 0.34, 1.18, 0.08, 0.65, '#8c8894', {
      topHex: isUp ? '#6f9c7b' : '#c69968',
      noBottom: true
    });
    for (let i = startStep; i < totalSteps; i += 1) {
      const sz = zStart + (i + 0.5) * dz;
      const sy = i * dy;
      pushBox(layer, laneX, sy, sz, 1.14, dy + 0.12, dz + 0.06, '#5f5b69', { topHex: '#9c9aa4', noBottom: false });
      pushBox(layer, laneX, sy + dy + 0.09, sz + dz * 0.4, 0.96, 0.03, 0.06, '#e2be56', { noBottom: true });
    }
    const zLow = zStart + startStep * dz;
    const yLow = startStep * dy;
    for (const side of [-0.57, 0.57]) {
      const hx = laneX + side;
      layer.glass.push({
        points: [
          { x: hx, y: yLow + 0.15, z: zLow },
          { x: hx, y: yTop + 0.15, z: zEnd },
          { x: hx, y: yTop + 0.86, z: zEnd },
          { x: hx, y: yLow + 0.86, z: zLow }
        ],
        fill: '#cde4f2',
        stroke: '#2c2635',
        strokeWidth: 2,
        alpha: 0.34
      });
    }
  }
}

function buildFloor2(layer: FloorLayer): void {
  const y = FLOOR_HEIGHT;

  // 1. Floor 2 Slab built from 4 precision segments framing the OPEN CENTRAL ATRIUM VOID!
  // Atrium hole: x in [-2.85, 2.85], z in [-2.25, 2.05]
  const slabH = 0.38;
  // Left slab (x: -10.7 .. -2.85)
  pushBox(layer, -6.775, y - slabH, 0, 7.85, slabH, 15.2, '#b2acb8', { topHex: '#edeae8', target: 'flats', depthBias: -25 });
  // Right slab (x: +2.85 .. +10.7)
  pushBox(layer, 6.775, y - slabH, 0, 7.85, slabH, 15.2, '#b2acb8', { topHex: '#edeae8', target: 'flats', depthBias: -25 });
  // Front bridge slab (x: -2.85 .. +2.85, z: +2.05 .. +7.6)
  pushBox(layer, 0, y - slabH, 4.825, 5.7, slabH, 5.55, '#b2acb8', { topHex: '#f1efed', target: 'flats', depthBias: -25 });
  // Rear bridge slab (x: -2.85 .. +2.85, z: -7.6 .. -2.25)
  pushBox(layer, 0, y - slabH, -4.925, 5.7, slabH, 5.35, '#b2acb8', { topHex: '#f1efed', target: 'flats', depthBias: -25 });

  // 2. Department Flooring Zones on Level 2
  // Left wing: Men's Denim & Casual (rich warm walnut wood)
  pushFloorQuad(layer, -6.75, y + 0.012, 0.2, 7.3, 12.6, '#d9cbbd', 'rgba(92,72,58,0.2)', 10);
  addTileGrid(layer, -10.4, -3.1, y + 0.012, -6.1, 6.5, 1.25, '#a89582', 0.28);

  // Right wing: Men's Tailoring, Shirts & Footwear (cool stone-slate carpet)
  pushFloorQuad(layer, 6.75, y + 0.012, 0.2, 7.3, 12.6, '#dfe3e6', 'rgba(65,78,94,0.16)', 10);
  addTileGrid(layer, 3.1, 10.4, y + 0.012, -6.1, 6.5, 1.5, '#b8c0c8', 0.28);

  // Escalator Arrival Promenade (front bridge)
  pushFloorQuad(layer, 0, y + 0.016, 4.75, 5.65, 5.1, '#efecea', '#cbc3cc', 12);
  addTileGrid(layer, -2.8, 2.8, y + 0.016, 2.2, 7.3, 1.35, '#cdc7c2', 0.32);

  // 3. Perimeter Cutaway Walls (subdivided)
  pushSubdividedWallX(layer, -10.6, 10.6, y, -7.45, 2.45, 0.28, '#dcd9e0', 8, '#f4f2f6');
  pushSubdividedWallZ(layer, -10.55, y, -7.35, 7.35, 1.65, 0.26, '#d8d5dd', 6, '#f4f2f6');
  pushSubdividedWallZ(layer, 10.55, y, -7.35, 7.35, 1.65, 0.26, '#d8d5dd', 6, '#f4f2f6');

  // Back wall Ripley plum department fascia banner + flanking denim & shirt wall bays + Floor 2 elevator lobby
  pushBox(layer, 0, y + 2.08, -7.24, 7.2, 0.4, 0.16, '#741472', { topHex: '#943592', noBottom: true });
  addWallMerchBay(layer, -2.55, y, -7.12, 'back', ['#2f435d', '#d6dad9', '#506478', '#262b38', '#988f84', '#566b60'], '#c5b4a4');
  addWallMerchBay(layer, 2.55, y, -7.12, 'back', ['#242c3d', '#edf0f2', '#4c5463', '#a99581', '#1f324d', '#58645a'], '#d6d2d8');
  pushShadow(layer, 0, y, -3.75, 2.35, 1.85, 0.12);
  pushBox(layer, 0, y + 0.02, -3.75, 2.15, 2.15, 1.65, '#dcd8e2', { topHex: '#f1eff5', noBottom: true });
  pushBox(layer, -0.44, y + 0.04, -2.91, 0.72, 1.88, 0.05, '#a8a5b4', { noBottom: true });
  pushBox(layer, 0.44, y + 0.04, -2.91, 0.72, 1.88, 0.05, '#a8a5b4', { noBottom: true });
  pushBox(layer, 0, y + 1.94, -2.9, 1.85, 0.22, 0.08, '#24354c', { noBottom: true });

  // Front Mall Overlook Glazed Balcony Rail (z = +7.42)
  pushBox(layer, 0, y + 0.02, 7.42, 21.0, 0.14, 0.24, '#4e4758', { noBottom: true });
  pushBox(layer, 0, y + 0.16, 7.42, 20.8, 0.92, 0.08, '#cde4f2', { target: 'glass', alpha: 0.26, noBottom: true });

  // 4. Glass Atrium Balustrades surrounding the open Floor 2 void!
  // Left & Right atrium glass edges
  pushBox(layer, -2.84, y + 0.02, -0.1, 0.1, 0.95, 4.3, '#cde4f2', { target: 'glass', alpha: 0.36, noBottom: true });
  pushBox(layer, 2.84, y + 0.02, -0.1, 0.1, 0.95, 4.3, '#cde4f2', { target: 'glass', alpha: 0.36, noBottom: true });
  // Brushed steel handrails along atrium rim
  pushBox(layer, -2.84, y + 0.96, -0.1, 0.12, 0.06, 4.35, '#4c4656', { noBottom: true });
  pushBox(layer, 2.84, y + 0.96, -0.1, 0.12, 0.06, 4.35, '#4c4656', { noBottom: true });
  // Rear atrium rail (between escalators & elevator)
  pushBox(layer, 0, y + 0.02, -2.24, 5.7, 0.95, 0.08, '#cde4f2', { target: 'glass', alpha: 0.36, noBottom: true });
  pushBox(layer, 0, y + 0.96, -2.24, 5.74, 0.06, 0.12, '#4c4656', { noBottom: true });
  // Front atrium wing rails flanking the escalator exit mouth
  pushBox(layer, -2.3, y + 0.02, 2.04, 1.05, 0.95, 0.08, '#cde4f2', { target: 'glass', alpha: 0.36, noBottom: true });
  pushBox(layer, 2.3, y + 0.02, 2.04, 1.05, 0.95, 0.08, '#cde4f2', { target: 'glass', alpha: 0.36, noBottom: true });
  pushBox(layer, -2.3, y + 0.96, 2.04, 1.08, 0.06, 0.12, '#4c4656', { noBottom: true });
  pushBox(layer, 2.3, y + 0.96, 2.04, 1.08, 0.06, 0.12, '#4c4656', { noBottom: true });

  // 5. STRATEGIC COLOR-PLAY KIOSK #2 — Men's Apparel Escalator Entrance!
  addColorPlayKiosk(
    layer,
    2.65,
    y,
    4.55,
    ['#2b3e58', '#dce0e2', '#4a5d4e', '#b59d84', '#383a47'],
    'rgba(242,246,255,0.72)'
  );

  // 6. Feature Mannequin Podiums on Level 2
  addMannequinPodium(layer, -2.95, y, 4.85, 2.05, 1.32, [
    { top: '#2b3e58', bottom: '#c9bba8' },
    { top: '#4a5a4e', bottom: '#2d313d' }
  ]);
  addMannequinPodium(layer, 6.2, y, 4.9, 1.85, 1.25, [
    { top: '#353947', bottom: '#353947' },
    { top: '#b89f85', bottom: '#2c3a4f' }
  ]);

  // 7. Men's Denim, Casual & Streetwear Zone (Left Wing)
  const menDenim = ['#2f435d', '#d6dad9', '#506478', '#262b38', '#988f84', '#566b60', '#c2b3a3', '#3b4d63'];
  const menStreet = ['#424957', '#e5e2dc', '#68796b', '#8d684f', '#273549', '#b8b5ae', '#5c6675', '#323640'];
  addClothingRack(layer, -8.35, y, 4.55, 'x', menDenim, '#292630');
  addClothingRack(layer, -8.35, y, 1.65, 'x', menStreet, '#292630');
  addClothingRack(layer, -8.35, y, -1.25, 'x', menDenim, '#292630');
  addClothingRack(layer, -5.0, y, -1.25, 'x', menStreet, '#292630');
  addDisplayTable(layer, -6.55, y, 3.1, 2.05, 1.05, '#a88c74', ['#2d415b', '#75828c', '#c7b8a3'], true);
  addFourWayRack(layer, -5.1, y, 0.35, ['#30435c', '#5a6b5f', '#b7a087', '#353844']);
  // Perimeter Denim Wall Bays (Left wall)
  addWallMerchBay(layer, -10.22, y, 3.3, 'left', menDenim, '#c5b4a4');
  addWallMerchBay(layer, -10.22, y, -0.3, 'left', menStreet, '#c5b4a4');

  // 8. Men's Smart Casual & Tailoring Zone (Right Wing)
  const menSuit = ['#242c3d', '#edf0f2', '#4c5463', '#a99581', '#1f324d', '#58645a', '#d2d4d6', '#363b47'];
  addClothingRack(layer, 5.2, y, 0.45, 'x', menSuit, '#27242e');
  addClothingRack(layer, 5.2, y, -1.95, 'x', menDenim, '#27242e');
  addDisplayTable(layer, 7.65, y, 2.15, 1.85, 0.96, '#8f7b6c', ['#e8ecf0', '#2b3b54', '#8e6c54'], false);
  addGlassShowcase(layer, 7.75, y, -0.35, 1.95, 0.85, ['#3b2e2a', '#2b3e58', '#8d6b4c']);

  // 9. Men's Footwear & Activewear Wall (Far-Right Wall)
  addFootwearWall(layer, 10.26, y, 1.05, 4.6);

  // 10. Men's Fitting Rooms (Back-Right Corner)
  addFittingRooms(layer, 7.35, y, -5.85, 3, '#9d8572', '#4a5768');

  // 11. Floor 2 Checkout Counter (Back-Left)
  addCheckoutCounter(layer, -6.9, y, -5.95, 4.6, 2, '#5a1e62');

  // 12. Atrium Overlook Lounge Bench, Digital Totem & Planters
  pushShadow(layer, -0.2, y, 6.25, 2.3, 0.82, 0.12);
  pushBox(layer, -0.2, y + 0.02, 6.25, 2.1, 0.46, 0.62, '#434a59', { topHex: '#5a6375', noBottom: true });
  addDigitalTotem(layer, -3.55, y, 1.75, 'z', '#344c6b');
  addPlanter(layer, -3.55, y, 6.35);
  addPlanter(layer, 4.35, y, 6.35);
  addPlanter(layer, 3.65, y, -3.1);
}

const ZONE_LABELS: ZoneLabel[] = [
  // Floor 1 (Women's)
  { text: 'MALL ENTRANCE', pos: { x: 0, y: 2.85, z: 7.55 }, floor: 'floor1', tone: 'plum' },
  { text: 'WOMEN\'S CASUAL & TRENDS', pos: { x: -6.8, y: 1.85, z: 1.75 }, floor: 'floor1', detailOnly: true, tone: 'neutral' },
  { text: 'ACCESSORIES & BAGS', pos: { x: 6.95, y: 1.55, z: 4.55 }, floor: 'floor1', detailOnly: true, tone: 'neutral' },
  { text: 'TAILORING & KNITS', pos: { x: 6.8, y: 1.75, z: -1.4 }, floor: 'floor1', detailOnly: true, tone: 'neutral' },
  { text: 'FITTING ROOMS', pos: { x: -7.2, y: 2.7, z: -5.2 }, floor: 'floor1', detailOnly: true, tone: 'plum' },
  { text: 'L1 CHECKOUT', pos: { x: 6.8, y: 2.55, z: -5.9 }, floor: 'floor1', detailOnly: true, tone: 'plum' },
  { text: 'ESCALATORS TO L2', pos: { x: 0, y: 1.5, z: 0.2 }, floor: 'floor1', detailOnly: true, tone: 'slate' },
  // Floor 2 (Men's)
  { text: 'DENIM & CASUAL', pos: { x: -6.8, y: FLOOR_HEIGHT + 1.85, z: 1.75 }, floor: 'floor2', detailOnly: true, tone: 'neutral' },
  { text: 'TAILORING & SUITS', pos: { x: 6.3, y: FLOOR_HEIGHT + 1.85, z: -1.65 }, floor: 'floor2', detailOnly: true, tone: 'neutral' },
  { text: 'FOOTWEAR WALL', pos: { x: 9.5, y: FLOOR_HEIGHT + 2.45, z: 1.45 }, floor: 'floor2', detailOnly: true, tone: 'slate' },
  { text: 'FITTING ROOMS', pos: { x: 7.35, y: FLOOR_HEIGHT + 2.7, z: -5.2 }, floor: 'floor2', detailOnly: true, tone: 'plum' },
  { text: 'L2 CHECKOUT', pos: { x: -6.9, y: FLOOR_HEIGHT + 2.55, z: -5.9 }, floor: 'floor2', detailOnly: true, tone: 'plum' },
  { text: 'ESCALATORS & ATRIUM', pos: { x: 0, y: FLOOR_HEIGHT + 0.75, z: -0.65 }, floor: 'floor2', detailOnly: true, tone: 'slate' }
];

const KIOSK_PINS: (KioskPinSpec & { focusInfo: StoreKioskFocusInfo; focusPos: Vec3; focusYaw: number })[] = [
  {
    id: 'womens',
    floor: 'floor1',
    badge: 'L1',
    title: "Color-Play · Women's",
    subtitle: 'Floor 1 mall entrance · Click to zoom in',
    location: "Women's clothing",
    anchor: { x: -3.35, y: 2.35, z: 4.55 },
    top: { x: -3.35, y: 3.45, z: 4.55 },
    focusPos: { x: -3.35, y: 1.15, z: 4.55 },
    focusYaw: -0.26,
    focusInfo: {
      id: 'womens',
      floor: 'floor1',
      badge: 'Floor 1 · Women\'s Entrance',
      location: "Women's clothing",
      title: 'Color-Play Station · Floor 1',
      placement: 'Main mall boulevard, right past the storefront windows and EAS security gates.',
      intro:
        'Positioned at the exact entry threshold of Women’s Apparel so incoming shoppers can run a quick color reference check under calibrated 5000K light before browsing Casual & Trends, Tailoring, or Accessories.',
      highlights: [
        '5000K CRI 95+ overhead canopy neutralizes store lighting shifts',
        'Angled camera & touch terminal with 4 physical comparison drapes',
        'Integrated curated seasonal rail + QR ticket printer to checkout'
      ]
    }
  },
  {
    id: 'mens',
    floor: 'floor2',
    badge: 'L2',
    title: "Color-Play · Men's",
    subtitle: 'Floor 2 escalator landing · Click to zoom in',
    location: "Men's clothing",
    anchor: { x: 2.65, y: FLOOR_HEIGHT + 2.35, z: 4.55 },
    top: { x: 2.65, y: FLOOR_HEIGHT + 3.45, z: 4.55 },
    focusPos: { x: 2.65, y: FLOOR_HEIGHT + 1.15, z: 4.55 },
    focusYaw: -0.26,
    focusInfo: {
      id: 'mens',
      floor: 'floor2',
      badge: 'Floor 2 · Men\'s Entrance',
      location: "Men's clothing",
      title: 'Color-Play Station · Floor 2',
      placement: 'Upper escalator landing overlooking the open central atrium.',
      intro:
        'Greets shoppers the moment they step onto the Men’s Apparel floor—guiding returning RUT profiles straight to matching sizes across Denim & Casual, Tailoring & Suits, and the Footwear wall.',
      highlights: [
        'High-visibility arrival touchpoint facing both up/down escalators',
        'RUT returning mode skips re-testing and points straight to aisles',
        'Curated men’s palette rail (navy, charcoal, sage, camel) + QR handoff'
      ]
    }
  }
];

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Interactive 2-floor offline 3D architectural cutaway of an illustrative Ripley apparel store:
 * Floor 1 (Women's apparel + mall entrance) and Floor 2 (Men's apparel + escalator landing),
 * linked by an open atrium with escalators and glass elevator, with strategic Color-Play kiosks.
 */
export function initStoreMap(
  canvas: HTMLCanvasElement,
  onFocusKiosk: (info: StoreKioskFocusInfo | null) => void,
  onFloorChange?: (floor: StoreFloorView) => void
): StoreMapController {
  const context = canvas.getContext('2d');
  if (!context) {
    return {
      rotate() {},
      tilt() {},
      zoomBy() {},
      setFloor() {},
      setPreset() {},
      focusKiosk() {},
      reset() {}
    };
  }
  const ctx = context;

  // Pre-build static architectural geometry once for snappy 60fps interaction.
  const floor1Layer = createLayer();
  const floor1FacadeLayer = createLayer();
  const floor1StubLayer = createLayer();
  const atriumLayer = createLayer();
  const floor2StubLayer = createLayer();
  const floor2Layer = createLayer();
  buildFloor1(floor1Layer, floor1FacadeLayer);
  buildFloor1EscalatorStub(floor1StubLayer);
  buildAtriumConnectors(atriumLayer, 0, FLOOR_HEIGHT);
  buildFloor2EscalatorStub(floor2StubLayer);
  buildFloor2(floor2Layer);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeFloor: StoreFloorView = 'all';
  let focusedKioskId: StoreKioskId | null = null;

  let yaw = -0.52;
  let pitch = 0.48;
  let zoom = 0.96;
  let focusX = 0;
  let focusY = FLOOR_HEIGHT * 0.56;
  let focusZ = 0;
  let screenCenterFrac = 0.5;

  let targetYaw = yaw;
  let targetPitch = pitch;
  let targetZoom = zoom;
  let targetFocusX = focusX;
  let targetFocusY = focusY;
  let targetFocusZ = focusZ;
  let targetScreenCenterFrac = screenCenterFrac;

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let hoveredPinId: StoreKioskId | null = null;
  let projectedPins: ProjectedPin[] = [];
  let rafId = 0;

  function clampTargets(): void {
    targetPitch = Math.max(0.24, Math.min(1.18, targetPitch));
    targetZoom = Math.max(0.74, Math.min(3.6, targetZoom));
  }

  function clearKioskFocus(notify = true): void {
    if (focusedKioskId !== null) {
      focusedKioskId = null;
      targetFocusX = 0;
      targetFocusZ = 0;
      targetScreenCenterFrac = 0.5;
      if (notify) onFocusKiosk(null);
    }
  }

  function applyFloorCamera(floor: StoreFloorView): void {
    clearKioskFocus(true);
    activeFloor = floor;
    targetFocusX = 0;
    targetFocusZ = 0;
    targetScreenCenterFrac = 0.5;
    if (floor === 'all') {
      targetPitch = 0.48;
      targetZoom = 0.96;
      targetFocusY = FLOOR_HEIGHT * 0.56;
    } else if (floor === 'floor1') {
      targetPitch = 0.62;
      targetZoom = 1.06;
      targetFocusY = 1.0;
    } else {
      targetPitch = 0.62;
      targetZoom = 1.06;
      targetFocusY = FLOOR_HEIGHT + 1.0;
    }
    clampTargets();
    onFloorChange?.(floor);
    scheduleFrame();
  }

  function focusKioskInternal(id: StoreKioskId | null): void {
    if (!id) {
      applyFloorCamera(activeFloor);
      return;
    }
    const spec = KIOSK_PINS.find((p) => p.id === id);
    if (!spec) return;
    focusedKioskId = id;
    activeFloor = spec.floor;
    onFloorChange?.(spec.floor);
    targetFocusX = spec.focusPos.x;
    targetFocusY = spec.focusPos.y;
    targetFocusZ = spec.focusPos.z;
    targetYaw = spec.focusYaw;
    targetPitch = 0.4;
    targetZoom = canvas.clientWidth < 600 ? 2.55 : 3.2;
    targetScreenCenterFrac = canvas.clientWidth >= 780 ? 0.35 : 0.5;
    clampTargets();
    onFocusKiosk(spec.focusInfo);
    scheduleFrame();
  }

  function projectPoint(p: Vec3, width: number, height: number, baseScale: number): Projected {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const dx = p.x - focusX;
    const dy = p.y - focusY;
    const dz = p.z - focusZ;

    const rx = dx * cosY - dz * sinY;
    const rz = dx * sinY + dz * cosY;

    const depth = rz * cosP + dy * sinP;
    const cameraDist = 56;
    const persp = cameraDist / Math.max(12, cameraDist - depth);
    const s = baseScale * persp;

    return {
      x: width * screenCenterFrac + rx * s,
      y: height * 0.5 + (rz * sinP - dy * cosP) * s,
      depth,
      scale: s
    };
  }

  function renderQuadList(
    quads: Quad3D[],
    width: number,
    height: number,
    baseScale: number,
    cullBackface: boolean,
    sortDepth: boolean
  ): void {
    const projected: { q: Quad3D; pts: Projected[]; depth: number }[] = [];
    for (const q of quads) {
      const pts = q.points.map((pt) => projectPoint(pt, width, height, baseScale));
      if (cullBackface && pts.length >= 3) {
        // Screen-space signed area (Y-down): outward CCW 3D face projects to negative area when facing viewer.
        const area =
          (pts[1].x - pts[0].x) * (pts[2].y - pts[0].y) -
          (pts[1].y - pts[0].y) * (pts[2].x - pts[0].x);
        if (area >= 0.4) continue;
      }
      const depth =
        pts.reduce((sum, p) => sum + p.depth, 0) / pts.length + (q.depthBias ?? 0);
      projected.push({ q, pts, depth });
    }

    if (sortDepth) {
      projected.sort((a, b) => a.depth - b.depth);
    }

    for (const { q, pts } of projected) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();

      if (q.alpha !== undefined) ctx.globalAlpha = q.alpha;
      ctx.fillStyle = q.fill;
      ctx.fill();
      if (q.stroke && (q.strokeWidth ?? 0.5) > 0) {
        ctx.strokeStyle = q.stroke;
        ctx.lineWidth = q.strokeWidth ?? 0.5;
        ctx.stroke();
      }
      if (q.alpha !== undefined) ctx.globalAlpha = 1;
    }
  }

  function renderLines(lines: Line3D[], width: number, height: number, baseScale: number): void {
    for (const line of lines) {
      const a = projectPoint(line.a, width, height, baseScale);
      const b = projectPoint(line.b, width, height, baseScale);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      if (line.alpha !== undefined) ctx.globalAlpha = line.alpha;
      ctx.stroke();
      if (line.alpha !== undefined) ctx.globalAlpha = 1;
    }
  }

  function renderLayer(layer: FloorLayer, width: number, height: number, baseScale: number): void {
    renderQuadList(layer.flats, width, height, baseScale, true, true);
    renderLines(layer.lines, width, height, baseScale);
    renderQuadList(layer.shadows, width, height, baseScale, false, false);
    renderQuadList(layer.solids, width, height, baseScale, true, true);
    renderQuadList(layer.glass, width, height, baseScale, false, true);
  }

  function drawPill(
    x: number,
    y: number,
    text: string,
    bg: string,
    fg: string,
    border?: string,
    fontSize = 11
  ): void {
    ctx.font = `700 ${fontSize}px Manrope, sans-serif`;
    const metrics = ctx.measureText(text);
    const padX = 9;
    const h = fontSize + 10;
    const w = metrics.width + padX * 2;
    drawRoundedRect(ctx, x - w / 2, y - h / 2, w, h, 4);
    ctx.fillStyle = bg;
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  function draw(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Subtle studio architectural backdrop gradient
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#f4eff4');
    bg.addColorStop(0.55, '#ece6ee');
    bg.addColorStop(1, '#e2dae6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Base scale adapts cleanly across desktop and mobile viewports
    const fitW = width / (activeFloor === 'all' ? 27.5 : 24.5);
    const fitH = height / (activeFloor === 'all' ? 21.5 : 17.5);
    const baseScale = Math.min(fitW, fitH) * zoom;

    // Subtle architectural floor reference grid under the lowest visible level
    const gridY = activeFloor === 'floor2' ? FLOOR_HEIGHT - 0.42 : -0.46;
    ctx.strokeStyle = 'rgba(116, 20, 114, 0.065)';
    ctx.lineWidth = 1;
    for (let gx = -12; gx <= 12; gx += 3) {
      const a = projectPoint({ x: gx, y: gridY, z: -9 }, width, height, baseScale);
      const b = projectPoint({ x: gx, y: gridY, z: 9 }, width, height, baseScale);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let gz = -9; gz <= 9; gz += 3) {
      const a = projectPoint({ x: -12, y: gridY, z: gz }, width, height, baseScale);
      const b = projectPoint({ x: 12, y: gridY, z: gz }, width, height, baseScale);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Strict layered floor rendering eliminates inter-floor Z-fighting!
    if (activeFloor === 'all') {
      renderLayer(floor1Layer, width, height, baseScale);
      renderLayer(floor1FacadeLayer, width, height, baseScale);
      renderLayer(atriumLayer, width, height, baseScale);
      renderLayer(floor2Layer, width, height, baseScale);
    } else if (activeFloor === 'floor1') {
      renderLayer(floor1Layer, width, height, baseScale);
      if (focusedKioskId !== 'womens') {
        renderLayer(floor1FacadeLayer, width, height, baseScale);
      }
      renderLayer(floor1StubLayer, width, height, baseScale);
    } else {
      // Subtle lower-atrium shadow reference + upper escalator run visible through open Floor 2 void
      const atriumWell = createLayer();
      pushFloorQuad(atriumWell, 0, FLOOR_HEIGHT - 2.3, -0.1, 5.7, 4.3, 'rgba(130,115,138,0.16)', 'rgba(116,20,114,0.12)');
      renderQuadList(atriumWell.flats, width, height, baseScale, false, false);
      renderLayer(floor2StubLayer, width, height, baseScale);
      renderLayer(floor2Layer, width, height, baseScale);
    }

    // Floor Elevation Tags & Zone Labels (hidden during close-up kiosk zoom so the station shines cleanly)
    if (!focusedKioskId) {
      const slabTagX = Math.cos(yaw) >= 0 ? 11.45 : -11.45;
      if (activeFloor === 'all' || activeFloor === 'floor1') {
        const p1 = projectPoint({ x: slabTagX, y: 0.7, z: 3.2 }, width, height, baseScale);
        drawPill(p1.x, p1.y, "FLOOR 1 · WOMEN'S", '#3c1f40', '#ffffff', '#ffffff', width < 520 ? 10 : 11);
      }
      if (activeFloor === 'all' || activeFloor === 'floor2') {
        const p2 = projectPoint({ x: slabTagX, y: FLOOR_HEIGHT + 0.7, z: 3.2 }, width, height, baseScale);
        drawPill(p2.x, p2.y, "FLOOR 2 · MEN'S", '#24354c', '#ffffff', '#ffffff', width < 520 ? 10 : 11);
      }

      const compact = width < 540;
      for (const lbl of ZONE_LABELS) {
        if (activeFloor === 'all' && lbl.detailOnly) continue;
        if (activeFloor !== 'all' && lbl.floor !== activeFloor) continue;
        if (compact && lbl.detailOnly && lbl.tone === 'neutral') continue;
        const p = projectPoint(lbl.pos, width, height, baseScale);
        const bgCol =
          lbl.tone === 'plum'
            ? 'rgba(116, 20, 114, 0.9)'
            : lbl.tone === 'slate'
              ? 'rgba(42, 52, 68, 0.88)'
              : 'rgba(255, 255, 255, 0.88)';
        const fgCol = lbl.tone === 'neutral' ? '#2c1f31' : '#ffffff';
        const borderCol = lbl.tone === 'neutral' ? 'rgba(72, 41, 67, 0.22)' : undefined;
        drawPill(p.x, p.y, lbl.text, bgCol, fgCol, borderCol, compact ? 9.5 : 10.5);
      }
    }

    // Interactive Strategic Color-Play Kiosk Pins
    projectedPins = [];
    for (const spec of KIOSK_PINS) {
      if (activeFloor !== 'all' && spec.floor !== activeFloor) continue;
      const anchor = projectPoint(spec.anchor, width, height, baseScale);
      const top = projectPoint(spec.top, width, height, baseScale);

      if (focusedKioskId === spec.id) {
        // Subtle architectural callout above the zoomed-in kiosk canopy (never obscures the screen or rail)
        const canopyTag = projectPoint({ x: spec.anchor.x, y: spec.anchor.y + 0.42, z: spec.anchor.z }, width, height, baseScale);
        drawPill(canopyTag.x, canopyTag.y, `5000K · ${spec.title}`, '#741472', '#ffffff', '#ffffff', 11);
        continue;
      }

      const isHovered = hoveredPinId === spec.id;

      // Vertical leader stem connecting floating pin down to the kiosk canopy
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(top.x, top.y);
      ctx.strokeStyle = isHovered ? '#b80a6b' : '#741472';
      ctx.lineWidth = isHovered ? 2.5 : 1.8;
      ctx.stroke();

      // Anchor dot on kiosk canopy
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#b80a6b';
      ctx.fill();

      // Outer halo ring
      const radius = isHovered ? 20 : 17;
      ctx.beginPath();
      ctx.arc(top.x, top.y, radius + (isHovered ? 7 : 4), 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? 'rgba(184, 10, 107, 0.24)' : 'rgba(116, 20, 114, 0.16)';
      ctx.fill();

      // Main circular pin badge
      ctx.beginPath();
      ctx.arc(top.x, top.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? '#b80a6b' : '#741472';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.font = '800 12px Manrope, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(spec.badge, top.x, top.y + 0.5);
      ctx.textBaseline = 'alphabetic';

      // Crisp inline title chip beside/above pin so location is unmistakably clear
      const labelY = top.y - radius - 14;
      drawPill(
        top.x,
        labelY,
        spec.title,
        isHovered ? '#b80a6b' : '#ffffff',
        isHovered ? '#ffffff' : '#4a1b49',
        isHovered ? '#ffffff' : '#741472',
        11
      );

      projectedPins.push({ spec, x: top.x, y: top.y, ax: anchor.x, ay: anchor.y });
    }

    // Hover callout tooltip bar at top-right of canvas (only when not already zoomed in)
    if (hoveredPinId && !focusedKioskId) {
      const active = projectedPins.find((p) => p.spec.id === hoveredPinId);
      if (active) {
        const text = `${active.spec.title} — ${active.spec.subtitle}`;
        ctx.font = '700 12px Manrope, sans-serif';
        const tw = ctx.measureText(text).width + 24;
        const tx = Math.max(12, width - tw - 16);
        const ty = 16;
        drawRoundedRect(ctx, tx, ty, tw, 34, 4);
        ctx.fillStyle = '#1e1424';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tx + 12, ty + 17.5);
        ctx.textBaseline = 'alphabetic';
      }
    }
  }

  function stepAnimation(): void {
    rafId = 0;
    if (reducedMotion || dragging) {
      yaw = targetYaw;
      pitch = targetPitch;
      zoom = targetZoom;
      focusX = targetFocusX;
      focusY = targetFocusY;
      focusZ = targetFocusZ;
      screenCenterFrac = targetScreenCenterFrac;
      draw();
      return;
    }

    const ease = 0.14;
    yaw += (targetYaw - yaw) * ease;
    pitch += (targetPitch - pitch) * ease;
    zoom += (targetZoom - zoom) * ease;
    focusX += (targetFocusX - focusX) * ease;
    focusY += (targetFocusY - focusY) * ease;
    focusZ += (targetFocusZ - focusZ) * ease;
    screenCenterFrac += (targetScreenCenterFrac - screenCenterFrac) * ease;
    draw();

    const settled =
      Math.abs(targetYaw - yaw) < 0.002 &&
      Math.abs(targetPitch - pitch) < 0.002 &&
      Math.abs(targetZoom - zoom) < 0.004 &&
      Math.abs(targetFocusX - focusX) < 0.01 &&
      Math.abs(targetFocusY - focusY) < 0.01 &&
      Math.abs(targetFocusZ - focusZ) < 0.01 &&
      Math.abs(targetScreenCenterFrac - screenCenterFrac) < 0.002;

    if (!settled) {
      rafId = requestAnimationFrame(stepAnimation);
    } else {
      yaw = targetYaw;
      pitch = targetPitch;
      zoom = targetZoom;
      focusX = targetFocusX;
      focusY = targetFocusY;
      focusZ = targetFocusZ;
      screenCenterFrac = targetScreenCenterFrac;
      draw();
    }
  }

  function scheduleFrame(): void {
    if (!rafId) {
      rafId = requestAnimationFrame(stepAnimation);
    }
  }

  function findPinAt(clientX: number, clientY: number): ProjectedPin | undefined {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return projectedPins.find(
      (p) =>
        Math.hypot(p.x - x, p.y - y) < 30 ||
        Math.hypot(p.ax - x, p.ay - y) < 34 ||
        (Math.abs(x - p.x) < 76 && Math.abs(y - (p.y - 31)) < 18)
    );
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      if (moved) {
        yaw += dx * 0.0075;
        pitch = Math.max(0.28, Math.min(1.18, pitch + dy * 0.0055));
        targetYaw = yaw;
        targetPitch = pitch;
        startX = e.clientX;
        startY = e.clientY;
        draw();
      }
      return;
    }

    const hit = findPinAt(e.clientX, e.clientY);
    const nextHover = hit ? hit.spec.id : null;
    if (nextHover !== hoveredPinId) {
      hoveredPinId = nextHover;
      canvas.style.cursor = nextHover ? 'pointer' : 'grab';
      draw();
    }
  });

  canvas.addEventListener('pointerleave', () => {
    if (hoveredPinId !== null) {
      hoveredPinId = null;
      canvas.style.cursor = 'grab';
      draw();
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    if (!moved) {
      const pin = findPinAt(e.clientX, e.clientY);
      if (pin) {
        hoveredPinId = null;
        canvas.style.cursor = 'grab';
        focusKioskInternal(pin.spec.id);
      }
    }
  });

  canvas.addEventListener('pointercancel', () => {
    dragging = false;
  });

  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && focusedKioskId) {
      e.preventDefault();
      focusKioskInternal(null);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      targetYaw += e.key === 'ArrowLeft' ? -0.22 : 0.22;
      scheduleFrame();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetPitch += e.key === 'ArrowUp' ? 0.08 : -0.08;
      clampTargets();
      scheduleFrame();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      targetZoom += 0.16;
      clampTargets();
      scheduleFrame();
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      targetZoom -= 0.16;
      clampTargets();
      scheduleFrame();
    }
  });

  new ResizeObserver(() => {
    if (focusedKioskId) {
      targetScreenCenterFrac = canvas.clientWidth >= 780 ? 0.35 : 0.5;
      screenCenterFrac = targetScreenCenterFrac;
    }
    draw();
  }).observe(canvas);
  draw();

  return {
    rotate(amount: number) {
      targetYaw += amount;
      scheduleFrame();
    },
    tilt(amount: number) {
      targetPitch += amount;
      clampTargets();
      scheduleFrame();
    },
    zoomBy(delta: number) {
      targetZoom += delta;
      clampTargets();
      scheduleFrame();
    },
    setFloor(floor: StoreFloorView) {
      applyFloorCamera(floor);
    },
    setPreset(preset: StoreCameraPreset) {
      clearKioskFocus(true);
      if (preset === 'isometric') {
        targetYaw = -0.52;
        targetPitch = activeFloor === 'all' ? 0.48 : 0.62;
      } else if (preset === 'front') {
        targetYaw = 0;
        targetPitch = 0.34;
      } else {
        targetYaw = -0.02;
        targetPitch = 1.15;
      }
      targetZoom = activeFloor === 'all' ? 0.96 : 1.06;
      clampTargets();
      scheduleFrame();
    },
    focusKiosk(id: StoreKioskId | null) {
      focusKioskInternal(id);
    },
    reset() {
      targetYaw = -0.52;
      applyFloorCamera('all');
    }
  };
}
