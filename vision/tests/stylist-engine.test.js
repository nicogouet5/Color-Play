import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recommend,garments,validateProfile,swapItem} from '../stylist-engine.js';
const base=()=>({style:'casual',wardrobe:['tee','shirt','jeans','chinos'],occasion:'daily',climate:'mild',comfort:'balanced',avoid:[]});
test('interview produces three concrete outfits with tops, bottoms and footwear',()=>{
 const {looks,error}=recommend(base());assert.equal(error,'');assert.equal(looks.length,3);
 for(const look of looks){assert.ok(look.items.some(v=>v.kind==='top'));assert.ok(look.items.some(v=>v.kind==='bottom'));assert.ok(look.items.some(v=>v.kind==='shoes'));assert.ok(look.items.every(v=>garments.some(g=>g.id===v.garmentId)));assert.ok(look.reasons.some(r=>r.includes("didn't use photo swatches")));}
});
test('hard exclusions and wardrobe selection apply to all outfits and swaps',()=>{
 const p={...base(),avoid:['shirt','jeans','sneakers']};const {looks}=recommend(p);assert.equal(looks.length,3);
 for(const look of looks){for(const item of look.items){assert.ok(!p.avoid.includes(item.garmentId));if(['top','bottom'].includes(item.kind))assert.ok(p.wardrobe.includes(item.garmentId));const next=swapItem(item,p);if(next)assert.ok(!p.avoid.includes(next.garmentId));}}
});
test('conflicting exclusions return a recovery message, never a prohibited outfit',()=>{const p={...base(),avoid:['tee','shirt']};assert.match(validateProfile(p),/excluded/);assert.equal(recommend(p).looks.length,0);});
test('heat filters knitwear and never adds a coat',()=>{const p={...base(),wardrobe:['tee','knit','jeans'],climate:'warm'};const {looks}=recommend(p);assert.equal(looks.length,3);for(const l of looks){assert.ok(!l.items.some(i=>['knit','coat'].includes(i.garmentId)));assert.ok(!l.items.some(i=>i.kind==='layer'));}});
test('unavailable climate combination does not silently replace habitual clothes',()=>{const r=recommend({...base(),climate:'warm',wardrobe:['knit','jeans']});assert.equal(r.looks.length,0);assert.match(r.error,/climate/);});
test('cold adds a layer and uses compatible shoes',()=>{const r=recommend({...base(),climate:'cold'});for(const look of r.looks){assert.ok(look.items.some(i=>i.kind==='layer'));assert.ok(look.items.every(i=>garments.find(g=>g.id===i.garmentId).climates.includes('cold')));}});
test('neutral preference overrides even a vivid confirmed reference',()=>{const {looks}=recommend({...base(),comfort:'neutral'},[{label:'My garment',rgb:[255,0,140]}]);assert.ok(looks.every(l=>l.items.every(i=>i.color.neutral)));});
test('balanced colors are restricted to the top, no accidental multi-accent',()=>{const {looks}=recommend({...base(),style:'smart'});assert.ok(looks.every(l=>l.items.filter(i=>i.kind!=='top').every(i=>i.color.neutral)));});
test('changing confirmed colors affects garment colors, with explicit rationale',()=>{const p={...base(),comfort:'bold'};const a=recommend(p,[{label:'My garment',rgb:[184,10,107]}]);const b=recommend(p,[{label:'My garment',rgb:[50,107,112]}]);assert.notEqual(a.looks[0].items[0].color.hex,b.looks[0].items[0].color.hex);assert.match(a.looks[0].reasons.at(-1),/#B80A6B/);});
test('swaps cycle through compatible clothes, keeping the selected color',()=>{const p=base();let item=recommend(p).looks[0].items[0];const first=item;item=swapItem(item,p);assert.ok(item);assert.notEqual(item.garmentId,first.garmentId);assert.deepEqual(item.color,first.color);assert.equal(swapItem(item,p).garmentId,first.garmentId);});
test('incomplete interview and invalid references are handled safely',()=>{assert.ok(recommend({}).error);const result=recommend(base(),[{label:'invalid',rgb:[NaN,1,2]}]);assert.equal(result.error,'');assert.ok(result.looks[0].reasons.at(-1).includes("didn't use photo swatches"));});
