// sRGB (D65) → CIELAB. No skin or face inference.
export function rgbToLab(rgb) {
  const [r,g,b] = rgb.map(v => {v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;});
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : t * 841 / 108 + 4 / 29;
  const x = f((r*.4124564+g*.3575761+b*.1804375)/.95047);
  const y = f(r*.2126729+g*.7151522+b*.072175);
  const z = f((r*.0193339+g*.119192+b*.9503041)/1.08883);
  return [116*y-16,500*(x-y),200*(y-z)];
}
export const hex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
const distance = (a,b) => a.reduce((sum,v,i) => sum + (v-b[i])**2,0);
export function analyzePixels(data, k = 5) {
  const pixels=[];
  // Deterministic stride bounds computation to ~8,000 samples.
  const stride=Math.max(1,Math.ceil(data.length / 4 / 8000));
  for(let i=0;i<data.length;i+=4*stride){if(data[i+3]<128)continue; const rgb=Array.from(data.slice(i,i+3));pixels.push({rgb,lab:rgbToLab(rgb)});}
  if(!pixels.length) throw new Error('The image has no visible pixels. Try another photo.');
  const centers=[pixels[Math.floor(pixels.length/2)].lab.slice()];
  while(centers.length<k){let best=pixels[0],far=-1; for(const p of pixels){const d=Math.min(...centers.map(c=>distance(p.lab,c)));if(d>far){far=d;best=p;}}if(far<1)break;centers.push(best.lab.slice());}
  const nearest=p=>{let index=0,d=Infinity;centers.forEach((c,i)=>{const next=distance(p.lab,c);if(next<d){index=i;d=next;}});return index;};
  for(let iter=0;iter<12;iter++){const sums=centers.map(()=>({n:0,lab:[0,0,0]}));for(const p of pixels){const s=sums[nearest(p)];s.n++;p.lab.forEach((v,j)=>s.lab[j]+=v);}sums.forEach((s,i)=>{if(s.n)centers[i]=s.lab.map(v=>v/s.n);});}
  const groups=centers.map(()=>({count:0,rgb:[0,0,0]}));
  for(const p of pixels){const s=groups[nearest(p)];s.count++;p.rgb.forEach((v,j)=>s.rgb[j]+=v);}
  const colors=groups.filter(g=>g.count).sort((a,b)=>b.count-a.count).map(g=>({rgb:g.rgb.map(v=>Math.round(v/g.count)),count:g.count,share:g.count/pixels.length*100}));
  // Largest-remainder rounding: displayed percentages always sum to 100.
  const percentages=colors.map(c=>Math.floor(c.share));
  const order=colors.map((c,i)=>({i,remainder:c.share-percentages[i]})).sort((a,b)=>b.remainder-a.remainder);
  const missing=100-percentages.reduce((a,b)=>a+b,0);for(let i=0;i<missing;i++)percentages[order[i%order.length].i]++;
  colors.forEach((c,i)=>c.percent=percentages[i]);
  const meanLight=pixels.reduce((sum,p)=>sum+p.lab[0],0)/pixels.length;
  const clipped=pixels.filter(p=>p.rgb.every(v=>v<12)||p.rgb.every(v=>v>247)).length/pixels.length;
  return {colors,samples:pixels.length,meanLight,clipped};
}
