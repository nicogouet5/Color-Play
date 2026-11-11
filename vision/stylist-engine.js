import {rgbToLab, hex} from './color-engine.js';

// Illustrative garments, not retailer products. All matching is deterministic and local.
export const garments = [
  {id:'tee', name:'Cotton tee', kind:'top', shape:'tee', styles:['casual','minimal','street'], occasions:['daily','social'], climates:['warm','mild','cold']},
  {id:'shirt', name:'Poplin shirt', kind:'top', shape:'shirt', styles:['smart','minimal','casual'], occasions:['work','social','daily'], climates:['warm','mild','cold']},
  {id:'knit', name:'Knit sweater', kind:'top', shape:'knit', styles:['minimal','smart','casual'], occasions:['daily','work','social'], climates:['mild','cold']},
  {id:'hoodie', name:'Hooded sweatshirt', kind:'top', shape:'hoodie', styles:['street','casual'], occasions:['daily','social'], climates:['mild','cold']},
  {id:'jeans', name:'Straight jeans', kind:'bottom', shape:'pants', styles:['casual','street','minimal'], occasions:['daily','social'], climates:['warm','mild','cold']},
  {id:'chinos', name:'Chino pants', kind:'bottom', shape:'pants', styles:['smart','casual','minimal'], occasions:['work','daily','social'], climates:['warm','mild','cold']},
  {id:'tailored', name:'Dress pants', kind:'bottom', shape:'pants', styles:['smart','minimal'], occasions:['work','social'], climates:['warm','mild','cold']},
  {id:'skirt', name:'Midi skirt', kind:'bottom', shape:'skirt', styles:['smart','minimal','casual'], occasions:['work','social','daily'], climates:['warm','mild','cold']},
  {id:'blazer', name:'Unstructured blazer', kind:'layer', shape:'blazer', styles:['smart','minimal'], occasions:['work','social'], climates:['mild','cold']},
  {id:'overshirt', name:'Overshirt', kind:'layer', shape:'shirt', styles:['casual','street','minimal'], occasions:['daily','social','work'], climates:['mild','cold']},
  {id:'coat', name:'Wool coat', kind:'layer', shape:'coat', styles:['smart','minimal','casual','street'], occasions:['work','daily','social'], climates:['cold']},
  {id:'sneakers', name:'Plain sneakers', kind:'shoes', shape:'sneakers', styles:['casual','street','minimal'], occasions:['daily','social'], climates:['warm','mild','cold']},
  {id:'loafers', name:'Loafers', kind:'shoes', shape:'loafers', styles:['smart','minimal'], occasions:['work','social'], climates:['warm','mild']},
  {id:'boots', name:'Ankle boots', kind:'shoes', shape:'boots', styles:['smart','casual','street','minimal'], occasions:['work','daily','social'], climates:['cold','mild']}
];
export const fabricColors = [
  {name:'ivory',hex:'#E8E0D3',neutral:true}, {name:'stone',hex:'#B7AB9C',neutral:true},
  {name:'graphite',hex:'#48464C',neutral:true}, {name:'midnight blue',hex:'#283346',neutral:true},
  {name:'denim blue',hex:'#55738C',neutral:false}, {name:'sage',hex:'#8B9B83',neutral:false},
  {name:'cocoa',hex:'#785944',neutral:true}, {name:'dusty rose',hex:'#BC8C9E',neutral:false},
  {name:'terracotta',hex:'#AF654F',neutral:false}, {name:'burgundy',hex:'#792F48',neutral:false},
  {name:'teal',hex:'#326B70',neutral:false}, {name:'fuchsia',hex:'#B80A6B',neutral:false},
  {name:'bright blue',hex:'#3B629A',neutral:false}, {name:'olive',hex:'#73764E',neutral:false}
].map(c=>({...c,lab:rgbToLab(c.hex.slice(1).match(/../g).map(v=>parseInt(v,16)))}));
export const labels = {
  style:{casual:'casual',smart:'smart casual',street:'urban',minimal:'minimalist'},
  occasion:{daily:'everyday life',work:'work or formal study',social:'a night out'},
  climate:{warm:'warm weather',mild:'mild weather',cold:'cold weather'},
  comfort:{neutral:'neutrals',balanced:'one color accent',bold:'expressive colors'}
};
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export function validateProfile(p){
  if(!p || !labels.style[p.style] || !labels.occasion[p.occasion] || !labels.climate[p.climate] || !labels.comfort[p.comfort])return 'Complete the questions about style, occasion, weather and color.';
  if(!Array.isArray(p.wardrobe)||!Array.isArray(p.avoid))return 'Choose your usual garments.';
  const allowed=garments.filter(g=>p.wardrobe.includes(g.id)&&!p.avoid.includes(g.id));
  if(!allowed.some(g=>g.kind==='top') || !allowed.some(g=>g.kind==='bottom'))return 'We need at least one top and one bottom that you haven\'t excluded. Review your usual garments or what you prefer to avoid.';
  return '';
}
function garmentScore(g,p){return (g.styles.includes(p.style)?5:0)+(g.occasions.includes(p.occasion)?4:0);}
function candidates(kind,p){return garments.filter(g=>g.kind===kind&&!p.avoid.includes(g.id)&&g.climates.includes(p.climate)&&(!['top','bottom'].includes(kind)||p.wardrobe.includes(g.id))).sort((a,b)=>garmentScore(b,p)-garmentScore(a,p)||a.id.localeCompare(b.id));}
function colorFor(p,tones,variant,kind){
  const pool=fabricColors.filter(c=>p.comfort==='neutral'||['bottom','shoes','layer'].includes(kind)&&p.comfort!=='bold'?c.neutral:true);
  const valid=tones.filter(t=>Array.isArray(t.rgb)&&t.rgb.length===3&&t.rgb.every(v=>Number.isFinite(v)&&v>=0&&v<=255));
  if(kind!=='top'){
    const preferred=kind==='shoes'?['ivory','graphite','cocoa']:['midnight blue','stone','graphite'];
    return pool.find(c=>c.name===preferred[variant%preferred.length])||pool[0];
  }
  const anchor=valid.length?rgbToLab(valid[variant%valid.length].rgb):null;
  if(!anchor){const names=p.comfort==='neutral'?['ivory','stone','graphite']:p.comfort==='balanced'?['sage','dusty rose','denim blue']:['fuchsia','teal','terracotta'];return pool.find(c=>c.name===names[variant])||pool[0];}
  // A color reference, not an inferred complexion/season. Contrasting variants use
  // the opposite a*b* direction, preserving L*. Neutral preference always wins.
  const target=variant===2?[anchor[0],-anchor[1],-anchor[2]]:anchor;
  const ranked=[...pool].sort((a,b)=>distance(a.lab,target)-distance(b.lab,target));
  return ranked[variant===1?Math.min(1,ranked.length-1):0];
}
export function recommend(p,tones=[]){
  const error=validateProfile(p);if(error)return {error,looks:[]};
  tones=tones.filter(t=>typeof t.label==='string'&&Array.isArray(t.rgb)&&t.rgb.length===3&&t.rgb.every(v=>Number.isFinite(v)&&v>=0&&v<=255));
  const pools=Object.fromEntries(['top','bottom','layer','shoes'].map(k=>[k,candidates(k,p)]));
  if(!pools.top.length||!pools.bottom.length||!pools.shoes.length||(p.climate==='cold'&&!pools.layer.length))return {error:'No compatible combination exists for those garments, exclusions and climate in the sample catalog. Try another usual garment or a different climate.',looks:[]};
  const titles=['Your everyday base','A change of pace','Another way to combine'];
  const strategies=['Color proximity','An alternative shade','Color contrast'];
  const looks=Array.from({length:3},(_,i)=>{
    const kinds=['top','bottom',...(p.climate==='cold'||p.climate==='mild'&&p.style==='smart'?['layer']:[]),'shoes'];
    const items=kinds.map(kind=>({garmentId:pools[kind][i%pools[kind].length].id,kind,color:colorFor(p,tones,i,kind)}));
    return {id:`look-${i+1}`,title:titles[i],strategy:tones.length?strategies[i]:'Interview preferences',items,
      reasons:[`${labels.style[p.style]} style for ${labels.occasion[p.occasion]}.`,
      `Starts from your usual garments: ${items.filter(v=>['top','bottom'].includes(v.kind)).map(v=>garments.find(g=>g.id===v.garmentId).name.toLowerCase()).join(' and ')}.`,
      p.climate==='cold'?'Includes a warm layer because you chose cold weather.':p.climate==='warm'?'No warm layers because you chose warm weather.':'Designed for mild weather.',
      tones.length?`${strategies[i]} relative to ${tones[i%tones.length].label.toLowerCase()} (${hex(tones[i%tones.length].rgb)}), limited to your preference for ${labels.comfort[p.comfort]}.`:`Colors chosen for your preference for ${labels.comfort[p.comfort]}; you didn't use photo swatches.`]};
  });
  return {looks,error:''};
}
export function alternatives(item,p){return candidates(item.kind,p).filter(g=>g.id!==item.garmentId);}
export function swapItem(item,p){const options=candidates(item.kind,p);if(options.length<2)return null;const index=options.findIndex(g=>g.id===item.garmentId);return {...item,garmentId:options[(index+1)%options.length].id};}
