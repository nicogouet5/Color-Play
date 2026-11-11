// A single offline canvas: slow garment-color ribbons behind opaque reading surfaces.
(() => {
  const canvas = document.querySelector('#color-wave');
  const button = document.querySelector('#motion-toggle');
  if (!canvas || !button) return;
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) {button.hidden=true;return;}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const printMedia = matchMedia('print');
  const key = 'color-play-border-paused';
  let paused=false, printing=false, raf=0, last=null, phase=0, width=0, height=0;
  try {paused=localStorage.getItem(key)==='true';} catch (_) {}
  function paint() {
    ctx.fillStyle='#eee7ef';ctx.fillRect(0,0,width,height);
    const mobile=width<700;
    const colors=['#d5b8d7','#d999be','#bda9ce','#e5bed1'];
    for(let side=0;side<2;side++) {
      for(let i=0;i<4;i++) {
        const wave=Math.sin(phase*.22+i*.9+side)*24;
        const edge=side?width+45:-45;
        const direction=side?-1:1;
        ctx.beginPath();
        ctx.moveTo(edge+direction*(i*17+wave),-80);
        ctx.bezierCurveTo(edge+direction*(mobile?85:180),height*.25+wave*3,edge-direction*75,height*.6-wave*2,edge+direction*(i*32+50),height+80);
        ctx.strokeStyle=colors[i];ctx.lineWidth=mobile?18:34;ctx.stroke();
      }
    }
  }
  function resize(){
    width=innerWidth;height=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);paint();
  }
  function frame(now){
    if(last===null)last=now;
    if(now-last>=1000/20){phase+=Math.min(now-last,100)/1000;last=now;paint();}
    raf=requestAnimationFrame(frame);
  }
  function sync(){
    cancelAnimationFrame(raf);raf=0;last=null;
    const blocked=document.hidden||printing||printMedia.matches;
    const state=reduced.matches?'reduced':paused?'paused':blocked?'hidden':'running';
    document.documentElement.dataset.borderMotion=state;
    const stopped=paused||reduced.matches;
    const label=reduced.matches?'Motion reduced':paused?'Resume animated background':'Pause animated background';
    button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(stopped));
    button.setAttribute('aria-label',label);button.title=label;
    button.querySelector('svg').innerHTML=stopped?'<path d="m8 5 11 7-11 7z"/>':'<path d="M8 5v14M16 5v14"/>';
    button.querySelector('.control-label').textContent=reduced.matches?'Motion reduced':paused?'Resume':'Pause';
    if(state==='running')raf=requestAnimationFrame(frame);
  }
  button.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem(key,String(paused));}catch(_){}sync();});
  reduced.addEventListener('change',sync);printMedia.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  addEventListener('beforeprint',()=>{printing=true;sync();});
  addEventListener('afterprint',()=>{printing=false;sync();});
  addEventListener('resize',resize,{passive:true});
  resize();sync();
})();
