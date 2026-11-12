import type {
  DeploymentStageId,
  FixtureHotspotId,
  ScenarioId
} from './types';

export type CameraPresetId =
  | 'isometric'
  | 'front'
  | 'kiosk-closeup'
  | 'rack-hooks'
  | 'top-floorplan';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
}

interface Face3D {
  points: Vec3[];
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  alpha?: number;
  depthBias?: number;
  label?: {
    text: string;
    color: string;
    fontSize: number;
  };
}

interface HotspotPin3D {
  id: FixtureHotspotId;
  code: string;
  label: string;
  pos: Vec3;
  cameraTarget: { yaw: number; pitch: number; zoom: number };
}

export interface Rack3DControllerOptions {
  canvas: HTMLCanvasElement;
  onSelectHotspot: (id: FixtureHotspotId) => void;
  getInitialStage: () => DeploymentStageId;
  getInitialHotspot: () => FixtureHotspotId;
  getInitialScenario: () => ScenarioId;
}

export interface Rack3DController {
  setStage: (stage: DeploymentStageId) => void;
  setActiveHotspot: (hotspot: FixtureHotspotId, flyCamera?: boolean) => void;
  setScenario: (scenario: ScenarioId) => void;
  setCameraPreset: (preset: CameraPresetId) => void;
  toggleDaylightCone: () => boolean;
  toggleAutoRotate: () => boolean;
  renderNow: () => void;
}

const HOTSPOT_PINS: HotspotPin3D[] = [
  {
    id: 'lighting-bar',
    code: '01',
    label: '5000K CRI 95+ Canopy',
    pos: { x: 0.28, y: 1.52, z: 0.14 },
    cameraTarget: { yaw: -0.32, pitch: 0.14, zoom: 0.94 }
  },
  {
    id: 'drape-rail',
    code: '02',
    label: 'Physical Fabric Drapes',
    pos: { x: -1.1, y: -0.26, z: 0.34 },
    cameraTarget: { yaw: 0.42, pitch: 0.18, zoom: 1.18 }
  },
  {
    id: 'touch-terminal',
    code: '03',
    label: '12" Touch Kiosk Console',
    pos: { x: -0.44, y: 0.36, z: 0.28 },
    cameraTarget: { yaw: 0.38, pitch: 0.22, zoom: 1.2 }
  },
  {
    id: 'curated-rack',
    code: '04',
    label: 'Curated Garments (Hooks 01–06)',
    pos: { x: 0.58, y: 0.48, z: 0.2 },
    cameraTarget: { yaw: -0.45, pitch: 0.18, zoom: 1.02 }
  },
  {
    id: 'qr-handoff',
    code: '05',
    label: 'Ephemeral Hook Pass (Zero CRM)',
    pos: { x: -0.42, y: -0.62, z: 0.26 },
    cameraTarget: { yaw: 0.34, pitch: 0.14, zoom: 1.15 }
  }
];

const GARMENT_HOOKS_3D: {
  hook: string;
  x: number;
  color: string;
  collarColor: string;
  scenarios: ScenarioId[];
}[] = [
  {
    hook: 'HK 01',
    x: 0.02,
    color: '#b80a6b',
    collarColor: '#fcecf5',
    scenarios: ['cool-winter']
  },
  {
    hook: 'HK 02',
    x: 0.24,
    color: '#b84a27',
    collarColor: '#fdf2ed',
    scenarios: ['warm-autumn']
  },
  {
    hook: 'HK 03',
    x: 0.46,
    color: '#d5b8d7',
    collarColor: '#ffffff',
    scenarios: ['cool-winter', 'soft-summer']
  },
  {
    hook: 'HK 04',
    x: 0.68,
    color: '#4a5d3f',
    collarColor: '#f3f6f1',
    scenarios: ['warm-autumn']
  },
  {
    hook: 'HK 05',
    x: 0.9,
    color: '#244e91',
    collarColor: '#eef3fb',
    scenarios: ['cool-winter', 'soft-summer']
  },
  {
    hook: 'HK 06',
    x: 1.12,
    color: '#8d3b72',
    collarColor: '#fcecf5',
    scenarios: ['warm-autumn', 'soft-summer']
  }
];

function shadeHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.max(
    0,
    Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) * factor))
  );
  const g = Math.max(
    0,
    Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) * factor))
  );
  const b = Math.max(
    0,
    Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) * factor))
  );
  return `rgb(${r}, ${g}, ${b})`;
}

function createBoxFaces(
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  baseHex: string,
  stroke?: string,
  depthBias = 0
): Face3D[] {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  const v000 = { x: cx - hw, y: cy - hh, z: cz - hd };
  const v100 = { x: cx + hw, y: cy - hh, z: cz - hd };
  const v110 = { x: cx + hw, y: cy + hh, z: cz - hd };
  const v010 = { x: cx - hw, y: cy + hh, z: cz - hd };

  const v001 = { x: cx - hw, y: cy - hh, z: cz + hd };
  const v101 = { x: cx + hw, y: cy - hh, z: cz + hd };
  const v111 = { x: cx + hw, y: cy + hh, z: cz + hd };
  const v011 = { x: cx - hw, y: cy + hh, z: cz + hd };

  return [
    // Front (+Z)
    {
      points: [v001, v101, v111, v011],
      fill: shadeHex(baseHex, 1.0),
      stroke,
      depthBias
    },
    // Back (-Z)
    {
      points: [v100, v000, v010, v110],
      fill: shadeHex(baseHex, 0.78),
      stroke,
      depthBias
    },
    // Top (+Y)
    {
      points: [v011, v111, v110, v010],
      fill: shadeHex(baseHex, 1.14),
      stroke,
      depthBias
    },
    // Bottom (-Y)
    {
      points: [v000, v100, v101, v001],
      fill: shadeHex(baseHex, 0.68),
      stroke,
      depthBias
    },
    // Right (+X)
    {
      points: [v101, v100, v110, v111],
      fill: shadeHex(baseHex, 0.88),
      stroke,
      depthBias
    },
    // Left (-X)
    {
      points: [v000, v001, v011, v010],
      fill: shadeHex(baseHex, 0.92),
      stroke,
      depthBias
    }
  ];
}

export function initRack3DViewer(
  options: Rack3DControllerOptions
): Rack3DController {
  const { canvas, onSelectHotspot } = options;
  const ctx = canvas.getContext('2d');

  let stage: DeploymentStageId = options.getInitialStage();
  let activeHotspot: FixtureHotspotId = options.getInitialHotspot();
  let activeScenario: ScenarioId = options.getInitialScenario();

  let yaw = -0.38;
  let pitch = 0.2;
  let zoom = 0.88;

  let targetYaw = yaw;
  let targetPitch = pitch;
  let targetZoom = zoom;

  let showDaylightCone = true;
  let autoRotate = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let pointerMoved = false;

  const projectedPins: {
    id: FixtureHotspotId;
    x: number;
    y: number;
    r: number;
  }[] = [];

  function projectPoint(
    v: Vec3,
    width: number,
    height: number
  ): ProjectedPoint {
    // Rotate around Y axis (yaw)
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const x1 = v.x * cosY - v.z * sinY;
    const z1 = v.x * sinY + v.z * cosY;

    // Rotate around X axis (pitch)
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const y2 = v.y * cosP - z1 * sinP;
    const z2 = v.y * sinP + z1 * cosP;

    const cameraDist = 5.4;
    const perspective = cameraDist / Math.max(1.5, cameraDist - z2);
    const baseScale = Math.min(width, height) * 0.275 * zoom;

    return {
      x: width * 0.5 + x1 * baseScale * perspective,
      y: height * 0.54 - y2 * baseScale * perspective,
      z: z2,
      scale: baseScale * perspective
    };
  }

  function buildSceneFaces(): Face3D[] {
    const faces: Face3D[] = [];
    const frameWidth = stage === 'stage1-portable' ? 2.15 : 2.68;
    const halfFrame = frameWidth / 2;

    // 1. Floor Architectural Platform
    faces.push(
      ...createBoxFaces(
        0,
        -1.26,
        0,
        frameWidth + 0.52,
        0.08,
        1.32,
        '#ece4f0',
        '#d5c7dc',
        -0.4
      )
    );
    // Fuchsia front floor accent strip
    faces.push(
      ...createBoxFaces(
        0,
        -1.25,
        0.65,
        frameWidth + 0.48,
        0.03,
        0.04,
        '#b80a6b',
        undefined,
        -0.2
      )
    );

    // 2. Main Matte Charcoal Rack Frame (#201b27)
    // Left & Right Vertical Uprights
    faces.push(
      ...createBoxFaces(-halfFrame, 0.1, 0, 0.07, 2.68, 0.07, '#201b27')
    );
    faces.push(
      ...createBoxFaces(halfFrame, 0.1, 0, 0.07, 2.68, 0.07, '#201b27')
    );
    // Base Stabilizer Feet
    faces.push(
      ...createBoxFaces(-halfFrame, -1.2, 0, 0.12, 0.06, 0.92, '#201b27')
    );
    faces.push(
      ...createBoxFaces(halfFrame, -1.2, 0, 0.12, 0.06, 0.92, '#201b27')
    );
    // Top Horizontal Crossbar
    faces.push(
      ...createBoxFaces(0, 1.42, 0, frameWidth + 0.08, 0.07, 0.07, '#201b27')
    );

    // Center Divider Upright (in Stage 2 & Stage 3)
    if (stage !== 'stage1-portable') {
      faces.push(
        ...createBoxFaces(-0.22, 0.06, 0, 0.055, 2.62, 0.055, '#2b2434')
      );
    }

    // 3. 01 · 5000K CRI 95+ Daylight Canopy Bar
    const canopyColor =
      activeHotspot === 'lighting-bar' ? '#3d1535' : '#201b27';
    faces.push(
      ...createBoxFaces(
        0,
        1.52,
        0.12,
        frameWidth - 0.06,
        0.09,
        0.24,
        canopyColor,
        activeHotspot === 'lighting-bar' ? '#b80a6b' : undefined
      )
    );
    // Glowing LED Diffuser Strip underneath/front of Canopy
    faces.push(
      ...createBoxFaces(
        0,
        1.48,
        0.16,
        frameWidth - 0.24,
        0.03,
        0.12,
        '#fff9e6',
        '#b80a6b',
        0.15
      )
    );

    // 4. Left Sub-Bay: Stage 2/3 Kiosk Console + Mirror + Physical Drapes OR Stage 1 Portable Pedestal
    if (stage !== 'stage1-portable') {
      // Backboard Panel for Kiosk & Mirror Bay
      faces.push(
        ...createBoxFaces(
          -0.78,
          0.12,
          -0.02,
          0.96,
          2.14,
          0.06,
          '#ffffff',
          '#d8cfe0'
        )
      );

      // Upper Framing Mirror (No Camera)
      faces.push(
        ...createBoxFaces(
          -0.78,
          0.78,
          0.03,
          0.74,
          0.66,
          0.03,
          '#e9eef5',
          '#b80a6b',
          0.1
        )
      );

      // 03 · 12-Inch Angled Touchscreen Console Housing
      const consoleHighlighted = activeHotspot === 'touch-terminal';
      faces.push(
        ...createBoxFaces(
          -0.78,
          0.16,
          0.18,
          0.78,
          0.48,
          0.26,
          consoleHighlighted ? '#3b1231' : '#201b27',
          consoleHighlighted ? '#ff6ec7' : '#43394f',
          0.2
        )
      );

      // Tilted 12" Touch Display Screen Face
      const screenFace: Face3D = {
        points: [
          { x: -1.12, y: -0.02, z: 0.33 },
          { x: -0.44, y: -0.02, z: 0.33 },
          { x: -0.44, y: 0.36, z: 0.21 },
          { x: -1.12, y: 0.36, z: 0.21 }
        ],
        fill: '#fcecf5',
        stroke: '#b80a6b',
        strokeWidth: 2,
        depthBias: 0.35,
        label: {
          text: '12" TOUCH KIOSK UI',
          color: '#b80a6b',
          fontSize: 10
        }
      };
      faces.push(screenFace);

      // 02 · Physical Fabric Comparison Drapes (4 Tactile Swatches below Screen)
      const drapeColors = ['#b80a6b', '#d999be', '#b84a27', '#4a5d3f'];
      // Brushed metal drape bar
      faces.push(
        ...createBoxFaces(-0.78, -0.14, 0.14, 0.8, 0.025, 0.03, '#6e6478', undefined, 0.22)
      );
      drapeColors.forEach((hex, idx) => {
        const dx = -1.05 + idx * 0.18;
        const zOffset = activeHotspot === 'drape-rail' ? 0.22 : 0.16;
        faces.push(
          ...createBoxFaces(
            dx,
            -0.28,
            zOffset,
            0.14,
            0.24,
            0.025,
            hex,
            activeHotspot === 'drape-rail' ? '#ffffff' : undefined,
            0.28
          )
        );
      });

      // 05 · Ephemeral Hook Pass Dispenser Slot (Zero CRM)
      faces.push(
        ...createBoxFaces(
          -0.78,
          -0.62,
          0.12,
          0.74,
          0.18,
          0.14,
          '#fcecf5',
          '#b80a6b',
          0.24
        )
      );
    } else {
      // Stage 1: Portable Swatch Binder Pedestal (No Electronic Screen)
      faces.push(
        ...createBoxFaces(
          -0.68,
          -0.48,
          0.14,
          0.54,
          1.36,
          0.34,
          '#ffffff',
          '#d8cfe0'
        )
      );
      // Physical Swatch Book on Angled Reader Top
      const drapeColors = ['#b80a6b', '#d999be', '#b84a27', '#4a5d3f'];
      drapeColors.forEach((hex, idx) => {
        const dx = -0.86 + idx * 0.12;
        faces.push(
          ...createBoxFaces(dx, 0.24, 0.18, 0.1, 0.18, 0.03, hex, '#ffffff', 0.25)
        );
      });
    }

    // 5. Right Sub-Bay: Curated Garment Rail + 6 3D Sculpted Garments on Hooks 01–06
    const railStartX = stage === 'stage1-portable' ? -0.22 : -0.14;
    const railEndX = halfFrame - 0.06;
    const railCenterX = (railStartX + railEndX) / 2;
    const railSpan = railEndX - railStartX;

    // Chrome Garment Rail Bar
    faces.push(
      ...createBoxFaces(
        railCenterX,
        1.14,
        0,
        railSpan,
        0.045,
        0.045,
        '#8c8296'
      )
    );

    // 6 Sculpted 3D Garments hanging at an angle on Hooks 01–06
    GARMENT_HOOKS_3D.forEach((item, index) => {
      const gx =
        railStartX +
        0.16 +
        (index / (GARMENT_HOOKS_3D.length - 1)) * (railSpan - 0.32);
      const isScenarioMatch =
        activeScenario === 'mixed-lighting'
          ? false
          : item.scenarios.includes(activeScenario);
      const zPull = isScenarioMatch ? 0.12 : 0;

      // Metal Hanger Hook
      faces.push(
        ...createBoxFaces(
          gx,
          1.05,
          zPull,
          0.02,
          0.14,
          0.08,
          '#585062',
          undefined,
          0.1
        )
      );

      // 3D Garment Torso & Shoulders Volume (angled 32 deg on the rack)
      faces.push(
        ...createBoxFaces(
          gx,
          0.36,
          zPull,
          0.13,
          1.18,
          0.44,
          item.color,
          isScenarioMatch ? '#ffffff' : shadeHex(item.color, 0.75),
          isScenarioMatch ? 0.22 : 0.08
        )
      );

      // Collar / Neckline Accent Block
      faces.push(
        ...createBoxFaces(
          gx,
          0.92,
          zPull + 0.04,
          0.135,
          0.12,
          0.26,
          item.collarColor,
          undefined,
          0.25
        )
      );

      // Hook Number Tag at bottom of garment
      faces.push(
        ...createBoxFaces(
          gx,
          -0.32,
          zPull + 0.16,
          0.12,
          0.1,
          0.06,
          isScenarioMatch ? '#b80a6b' : '#201b27',
          '#ffffff',
          0.3
        )
      );
    });

    // 6. Stage 3 Optional Makeup Champion Bridge Totem [A]
    if (stage === 'stage3-makeup-champion') {
      faces.push(
        ...createBoxFaces(
          halfFrame + 0.34,
          -0.25,
          0.18,
          0.38,
          1.82,
          0.28,
          '#fcecf5',
          '#b80a6b',
          0.15
        )
      );
      faces.push(
        ...createBoxFaces(
          halfFrame + 0.34,
          0.32,
          0.33,
          0.28,
          0.42,
          0.04,
          '#b80a6b',
          '#ffffff',
          0.25
        )
      );
    }

    return faces;
  }

  function drawScene(): void {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(300, Math.round(rect.width));
    const height = Math.max(260, Math.round(rect.height));

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Studio Store Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#fbf8fc');
    bgGrad.addColorStop(0.55, '#f5eef8');
    bgGrad.addColorStop(1, '#ebe0f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle 3D Floor Grid Lines
    ctx.strokeStyle = 'rgba(184, 10, 107, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = -1.8; gx <= 1.8; gx += 0.3) {
      const p1 = projectPoint({ x: gx, y: -1.22, z: -0.9 }, width, height);
      const p2 = projectPoint({ x: gx, y: -1.22, z: 0.9 }, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let gz = -0.9; gz <= 0.9; gz += 0.3) {
      const p1 = projectPoint({ x: -1.8, y: -1.22, z: gz }, width, height);
      const p2 = projectPoint({ x: 1.8, y: -1.22, z: gz }, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Optional 5000K Neutral Daylight Volumetric Cone
    if (showDaylightCone) {
      const topL = projectPoint({ x: -1.2, y: 1.46, z: 0.14 }, width, height);
      const topR = projectPoint({ x: 1.2, y: 1.46, z: 0.14 }, width, height);
      const botR = projectPoint({ x: 1.48, y: -1.18, z: 0.45 }, width, height);
      const botL = projectPoint({ x: -1.48, y: -1.18, z: 0.45 }, width, height);

      const coneGrad = ctx.createLinearGradient(0, topL.y, 0, botL.y);
      coneGrad.addColorStop(0, 'rgba(255, 250, 230, 0.44)');
      coneGrad.addColorStop(0.6, 'rgba(255, 250, 235, 0.14)');
      coneGrad.addColorStop(1, 'rgba(255, 250, 235, 0.0)');

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(topL.x, topL.y);
      ctx.lineTo(topR.x, topR.y);
      ctx.lineTo(botR.x, botR.y);
      ctx.lineTo(botL.x, botL.y);
      ctx.closePath();
      ctx.fill();
    }

    // Project and depth-sort all 3D faces
    const faces = buildSceneFaces();
    const projectedFaces = faces.map((face) => {
      const pts = face.points.map((pt) => projectPoint(pt, width, height));
      const avgZ =
        pts.reduce((acc, p) => acc + p.z, 0) / pts.length +
        (face.depthBias || 0);
      return { face, pts, avgZ };
    });

    projectedFaces.sort((a, b) => a.avgZ - b.avgZ);

    for (const item of projectedFaces) {
      const { face, pts } = item;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = face.fill;
      ctx.fill();

      if (face.stroke) {
        ctx.strokeStyle = face.stroke;
        ctx.lineWidth = face.strokeWidth || 1;
        ctx.stroke();
      }

      if (face.label) {
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        ctx.fillStyle = face.label.color;
        ctx.font = `800 ${face.label.fontSize}px Manrope, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(face.label.text, cx, cy);
      }
    }

    // Draw Architectural Dimension Callouts in 3D Space
    const dimLeft = projectPoint({ x: -1.34, y: -1.24, z: 0.72 }, width, height);
    const dimRight = projectPoint({ x: 1.34, y: -1.24, z: 0.72 }, width, height);
    ctx.strokeStyle = '#585062';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(dimLeft.x, dimLeft.y);
    ctx.lineTo(dimRight.x, dimRight.y);
    ctx.stroke();

    const dimMidX = (dimLeft.x + dimRight.x) / 2;
    const dimMidY = (dimLeft.y + dimRight.y) / 2 + 14;
    ctx.fillStyle = '#201b27';
    ctx.font = '700 11px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      stage === 'stage1-portable'
        ? '0.8 m² Portable Rack Bay · Zero Fixed Wiring [A]'
        : '1.2 m² Modular Rack-Kiosk Bay · 115 cm ADA Console Height [A]',
      dimMidX,
      dimMidY
    );

    // Draw Interactive 3D Hotspot Pins (01–05)
    projectedPins.length = 0;
    for (const pin of HOTSPOT_PINS) {
      const pt = projectPoint(pin.pos, width, height);
      const isSelected = pin.id === activeHotspot;
      const radius = isSelected ? 16 : 13;

      projectedPins.push({
        id: pin.id,
        x: pt.x,
        y: pt.y,
        r: radius + 4
      });

      // Outer pulse halo for active hotspot
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(184, 10, 107, 0.22)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#b80a6b' : '#201b27';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 11px Manrope, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pin.code, pt.x, pt.y + 0.5);
    }

    // Top-left HUD badge inside 3D viewport
    ctx.fillStyle = 'rgba(32, 27, 39, 0.88)';
    ctx.beginPath();
    ctx.roundRect(12, 12, 266, 28, 7);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px Manrope, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('360° 3D Rack · Drag to Orbit · Click 01–05', 22, 26);

    ctx.restore();
  }

  function stepAnimation(): void {
    let needsFrame = false;

    if (autoRotate && !isDragging) {
      targetYaw += 0.008;
      needsFrame = true;
    }

    const dYaw = targetYaw - yaw;
    const dPitch = targetPitch - pitch;
    const dZoom = targetZoom - zoom;

    if (
      Math.abs(dYaw) > 0.001 ||
      Math.abs(dPitch) > 0.001 ||
      Math.abs(dZoom) > 0.001
    ) {
      yaw += dYaw * 0.18;
      pitch += dPitch * 0.18;
      zoom += dZoom * 0.18;
      needsFrame = true;
    }

    drawScene();

    if (needsFrame) {
      requestAnimationFrame(stepAnimation);
    }
  }

  // Pointer orbit controls + pin click detection
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    isDragging = true;
    pointerMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      pointerMoved = true;
    }
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    targetYaw += dx * 0.0085;
    targetPitch = Math.max(-0.15, Math.min(0.68, targetPitch + dy * 0.0065));
    yaw = targetYaw;
    pitch = targetPitch;
    drawScene();
  });

  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    isDragging = false;
    if (!pointerMoved) {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      for (const pin of projectedPins) {
        const dist = Math.hypot(px - pin.x, py - pin.y);
        if (dist <= pin.r) {
          onSelectHotspot(pin.id);
          break;
        }
      }
    }
  });

  // Keyboard accessibility for 3D canvas
  canvas.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      targetYaw -= 0.18;
      requestAnimationFrame(stepAnimation);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      targetYaw += 0.18;
      requestAnimationFrame(stepAnimation);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetPitch = Math.min(0.68, targetPitch + 0.1);
      requestAnimationFrame(stepAnimation);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      targetPitch = Math.max(-0.12, targetPitch - 0.1);
      requestAnimationFrame(stepAnimation);
    }
  });

  window.addEventListener('resize', () => {
    drawScene();
  });

  drawScene();

  return {
    setStage(nextStage: DeploymentStageId) {
      stage = nextStage;
      requestAnimationFrame(stepAnimation);
    },
    setActiveHotspot(hotspotId: FixtureHotspotId, flyCamera = true) {
      activeHotspot = hotspotId;
      if (flyCamera) {
        const found = HOTSPOT_PINS.find((p) => p.id === hotspotId);
        if (found) {
          targetYaw = found.cameraTarget.yaw;
          targetPitch = found.cameraTarget.pitch;
          targetZoom = found.cameraTarget.zoom;
        }
      }
      requestAnimationFrame(stepAnimation);
    },
    setScenario(scenarioId: ScenarioId) {
      activeScenario = scenarioId;
      requestAnimationFrame(stepAnimation);
    },
    setCameraPreset(preset: CameraPresetId) {
      autoRotate = false;
      if (preset === 'isometric') {
        targetYaw = -0.38;
        targetPitch = 0.2;
        targetZoom = 0.88;
      } else if (preset === 'front') {
        targetYaw = 0;
        targetPitch = 0.08;
        targetZoom = 0.92;
      } else if (preset === 'kiosk-closeup') {
        targetYaw = 0.38;
        targetPitch = 0.22;
        targetZoom = 1.2;
      } else if (preset === 'rack-hooks') {
        targetYaw = -0.45;
        targetPitch = 0.18;
        targetZoom = 1.06;
      } else if (preset === 'top-floorplan') {
        targetYaw = 0;
        targetPitch = 0.66;
        targetZoom = 0.86;
      }
      requestAnimationFrame(stepAnimation);
    },
    toggleDaylightCone() {
      showDaylightCone = !showDaylightCone;
      drawScene();
      return showDaylightCone;
    },
    toggleAutoRotate() {
      autoRotate = !autoRotate;
      if (autoRotate) {
        requestAnimationFrame(stepAnimation);
      }
      return autoRotate;
    },
    renderNow() {
      drawScene();
    }
  };
}
