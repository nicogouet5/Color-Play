import { qrcodegen } from './vendor/qrcodegen';

/** Offline standards-compliant QR; the payload must never contain a RUT or a profile. */
export function ticketQr(payload: string): SVGSVGElement {
  const qr = qrcodegen.QrCode.encodeText(payload, qrcodegen.QrCode.Ecc.MEDIUM);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const margin = 4;
  svg.setAttribute('viewBox', `0 0 ${qr.size + margin * 2} ${qr.size + margin * 2}`);
  svg.setAttribute('width', '512');
  svg.setAttribute('height', '512');
  svg.setAttribute('class', 'ticket-qr');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Demo ticket QR. Contains only a campaign and an opaque ticket token, never your RUT.');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const background = document.createElementNS(ns, 'rect');
  background.setAttribute('width', '100%'); background.setAttribute('height', '100%'); background.setAttribute('fill', '#fff');
  svg.append(background);
  const path = document.createElementNS(ns, 'path');
  let d = '';
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
    if (qr.getModule(x, y)) d += `M${x + margin},${y + margin}h1v1h-1z`;
  }
  path.setAttribute('d', d); path.setAttribute('fill', '#000'); svg.append(path);
  return svg;
}
