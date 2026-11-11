import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rgbToLab,hex,analyzePixels} from '../color-engine.js';
test('D65 reference black and white',()=>{assert.ok(Math.abs(rgbToLab([255,255,255])[0]-100)<.001);assert.equal(rgbToLab([0,0,0])[0],0);assert.equal(hex([255,0,128]),'#FF0080');});
test('solid color produces one cluster and no fabricated hues',()=>{const data=new Uint8ClampedArray(Array.from({length:100},()=>[180,20,90,255]).flat());const result=analyzePixels(data);assert.equal(result.colors.length,1);assert.deepEqual(result.colors[0].rgb,[180,20,90]);assert.equal(result.colors[0].percent,100);});
test('known split is preserved and displayed percentages reconcile',()=>{const data=new Uint8ClampedArray([...Array.from({length:75},()=>[255,0,0,255]),...Array.from({length:25},()=>[0,0,255,255])].flat());const {colors}=analyzePixels(data);assert.deepEqual(colors.map(c=>c.percent),[75,25]);assert.equal(colors.reduce((sum,c)=>sum+c.percent,0),100);});
test('transparent pixels ignored, empty image rejected',()=>{assert.throws(()=>analyzePixels(new Uint8ClampedArray([0,0,0,0])));});
test('diverse pixels deterministic with percentage sum of 100',()=>{const data=new Uint8ClampedArray(Array.from({length:500},(_,i)=>[i%256,(i*31)%256,(i*17)%256,255]).flat());const a=analyzePixels(data);assert.deepEqual(a,analyzePixels(data));assert.equal(a.colors.reduce((s,c)=>s+c.percent,0),100);assert.equal(a.colors.reduce((s,c)=>s+c.count,0),500);});
