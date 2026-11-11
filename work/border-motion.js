// One viewport-wide frame, not 88 independent videos. Only the perimeter is painted.
(() => {
  const canvas = document.querySelector('#color-wave');
  const button = document.querySelector('#motion-toggle');
  if (!canvas || !button) return;
  const ctx = canvas.getContext('2d', {alpha: true});
  if (!ctx) {button.hidden = true; return;}
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const printMedia = matchMedia('print');
  const storageKey = 'color-play-border-paused';
  let paused = false;
  try {paused = localStorage.getItem(storageKey) === 'true';} catch (_) { /* file:// or private mode */ }
  let width = 0, height = 0, rim = 18, cells = [];
  let animation = 0, lastDraw = null, phase = 0, printing = false;
  const glyphs = '.:-=+*#%';
  const pauseIcon = '<path d="M8 5v14M16 5v14"/>';
  const playIcon = '<path d="m8 5 11 7-11 7z"/>';

  function paint() {
    ctx.fillStyle = '#111323';
    ctx.fillRect(0, 0, width, rim);
    ctx.fillRect(0, height-rim, width, rim);
    ctx.fillRect(0, rim, rim, Math.max(0, height-2*rim));
    ctx.fillRect(width-rim, rim, rim, Math.max(0, height-2*rim));
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const cell of cells) {
      // Slow travelling waves of color and character density; no random flicker.
      const field = Math.sin(cell.s*0.011-phase*0.52 + cell.d*0.4)
        + 0.48*Math.sin(cell.s*0.026+phase*0.31-cell.d*0.8);
      const density = Math.max(0, Math.min(1, (field+1.48)/2.96));
      const mix = density*density;
      const highlight = Math.max(0, (density-0.8)/0.2);
      const r = Math.round(44+211*mix);
      const g = Math.round(36+30*mix+119*highlight);
      const b = Math.round(76+99*mix+50*highlight);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(glyphs[Math.min(glyphs.length-1, Math.floor(density*glyphs.length))], cell.x, cell.y);
    }
  }

  function resize() {
    width = innerWidth; height = innerHeight;
    rim = width <= 600 ? 10 : 18;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cells = [];
    for (let d=3; d<rim; d+=6) {
      for (let x=3; x<width; x+=6) {
        cells.push({x, y:d, s:x, d:d/6});
        cells.push({x, y:height-d, s:2*width+height-x, d:d/6});
      }
      for (let y=rim+3; y<height-rim; y+=6) {
        cells.push({x:width-d, y, s:width+y, d:d/6});
        cells.push({x:d, y, s:2*(width+height)-y, d:d/6});
      }
    }
    paint();
  }

  function frame(now) {
    if (lastDraw === null) lastDraw = now;
    if (now-lastDraw >= 1000/24) {
      phase += Math.min(now-lastDraw,100)/1000;
      lastDraw = now;
      paint();
    }
    animation = requestAnimationFrame(frame);
  }

  function sync() {
    cancelAnimationFrame(animation);
    animation = 0; lastDraw = null;
    const reduced = preference.matches;
    const blocked = document.hidden || printing || printMedia.matches;
    const state = reduced ? 'reduced' : paused ? 'paused' : blocked ? 'hidden' : 'running';
    document.documentElement.dataset.borderMotion = state;
    const label = reduced ? 'Motion reduced' : paused ? 'Resume animated border' : 'Pause animated border';
    button.disabled = reduced;
    button.setAttribute('aria-pressed', String(paused || reduced));
    button.setAttribute('aria-label', label);
    button.title = reduced ? 'Animation disabled by your reduced-motion preference' : label;
    button.querySelector('svg').innerHTML = paused || reduced ? playIcon : pauseIcon;
    button.querySelector('.control-label').textContent = reduced ? 'Motion reduced' : paused ? 'Resume' : 'Pause';
    if (state === 'running') animation = requestAnimationFrame(frame);
  }

  button.addEventListener('click', () => {
    paused = !paused;
    try {localStorage.setItem(storageKey, String(paused));} catch (_) { /* optional preference */ }
    sync();
  });
  preference.addEventListener('change', sync);
  printMedia.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('beforeprint', () => {printing=true;sync();});
  addEventListener('afterprint', () => {printing=false;sync();});
  addEventListener('resize', resize, {passive:true});
  resize();
  sync();
})();
