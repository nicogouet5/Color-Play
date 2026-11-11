const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 const context=await b.newContext({viewport:{width:1536,height:864},reducedMotion:'no-preference'});
 const p=await context.newPage();const errors=[],network=[];
 p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 const url='file://'+root+'/ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Standalone.html';
 await p.goto(url);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);
 const state=()=>p.evaluate(()=>document.documentElement.dataset.borderMotion);
 const pixels=()=>p.evaluate(()=>document.querySelector('#color-wave').toDataURL());
 assert.equal(await state(),'running');
 const a=await pixels();await p.waitForTimeout(700);const c=await pixels();assert.notEqual(a,c);
 const transparency=await p.evaluate(()=>{
  const c=document.querySelector('#color-wave'),x=c.getContext('2d');
  return {center:x.getImageData(c.width/2,c.height/2,1,1).data[3],edge:x.getImageData(0,0,1,1).data[3]};
 });assert.equal(transparency.center,0);assert.equal(transparency.edge,255);
 await p.screenshot({path:'/tmp/color-play-border-desktop.png'});
 await p.locator('#motion-toggle').click();assert.equal(await state(),'paused');
 const paused=await pixels();await p.waitForTimeout(150);assert.equal(await pixels(),paused);
 await p.reload();assert.equal(await state(),'paused');
 await p.locator('#motion-toggle').click();assert.equal(await state(),'running');
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.documentElement.dataset.borderMotion==='reduced');assert.equal(await state(),'reduced');assert(await p.locator('#motion-toggle').isDisabled());
 const reduced=await pixels();await p.waitForTimeout(150);assert.equal(await pixels(),reduced);
 await p.emulateMedia({media:'print'});assert(await p.locator('#color-wave').isHidden());
 await p.emulateMedia({media:'screen',reducedMotion:'no-preference'});await p.waitForFunction(()=>document.documentElement.dataset.borderMotion==='running');
 const mobile=[];
 for(const width of [320,390,780]){
  await p.setViewportSize({width,height:844});
  const metrics=await p.evaluate(()=>({width:innerWidth,body:document.body.scrollWidth,toolbar:document.querySelector('.toolbar').getBoundingClientRect().width,controls:[...document.querySelectorAll('.toolbar button')].filter(e=>getComputedStyle(e).display!=='none').map(e=>({id:e.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))}));
  assert.equal(metrics.width,metrics.body);metrics.controls.forEach(c=>{assert(c.w>=44);assert(c.h>=44)});mobile.push(metrics);
  if(width===390)await p.screenshot({path:'/tmp/color-play-border-mobile.png'});
 }
 await p.setViewportSize({width:1536,height:864});
 await p.selectOption('#slide-select','dmu');await p.waitForTimeout(900);assert.equal(await p.locator('#slide-select').inputValue(),'dmu');
 assert.equal(await state(),'running');
 assert.equal(errors.length,0);assert.equal(network.length,0);
 const result={animated:true,pauseStopsFrames:true,pausePersists:true,reducedMotionStopsFrames:true,printHidesFrame:true,transparency,mobile,errors,externalRequests:network};
 fs.writeFileSync(path.join(__dirname,'check-border-motion.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
