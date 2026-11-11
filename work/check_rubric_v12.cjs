const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Standalone.html');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const report={viewports:[],errors:[],externalRequests:[]};
 try{
  const context=await browser.newContext();const p=await context.newPage();
  p.on('pageerror',e=>report.errors.push(String(e)));
  p.on('request',r=>{if(/^https?:/.test(r.url()))report.externalRequests.push(r.url());});
  for(const width of [1536,1024,780,390,320]){
   await p.setViewportSize({width,height:width>1000?864:844});
   await p.goto(pathToFileURL(file).href);
   await p.evaluate(()=>document.fonts.ready);
   await p.waitForFunction(()=>document.querySelectorAll('.color-logo').length===26);
   const result=await p.evaluate(()=>({
    width:innerWidth,documentWidth:document.documentElement.scrollWidth,
    slides:document.querySelectorAll('main>.slide').length,
    badImages:[...document.images].filter(x=>!x.complete||!x.naturalWidth).length,
    brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.querySelector(a.getAttribute('href'))).length,
    marks:[...document.querySelectorAll('.meta-right')].filter(x=>!x.querySelector('.color-logo')).length,
    wordmarks:document.querySelectorAll('.wordmark').length,
    controls:[...document.querySelectorAll('.toolbar button,.toolbar select')].filter(e=>getComputedStyle(e).display!=='none').map(e=>({id:e.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),
    hiddenText:[...document.querySelectorAll('.slide h1,.slide h2,.meta')].filter(e=>e.getBoundingClientRect().left<0||e.getBoundingClientRect().right>innerWidth+1).map(e=>e.textContent.slice(0,80))
   }));
   assert.equal(result.documentWidth,width,'Horizontal overflow at '+width);
   assert.equal(result.slides,26);assert.equal(result.badImages,0);assert.equal(result.brokenAnchors,0);assert.equal(result.marks,0);assert.equal(result.wordmarks,0);
   assert.deepEqual(result.hiddenText,[]);
   result.controls.forEach(e=>{assert.ok(e.w>=44&&e.h>=44,JSON.stringify(e));});
   report.viewports.push(result);
   if(width===1536){
    await p.screenshot({path:path.join(root,'ENTREGA_FINAL_v12/Vista_previa_portada.png')});
    for(const [id,name] of [['rubric','rubrica'],['one-page','one_page'],['assumptions-1','assumption_log'],['s9','customer']]){
     await p.locator('#'+id).scrollIntoViewIfNeeded();
     await p.locator('#'+id).screenshot({path:'/tmp/color-play-'+name+'.png'});
    }
   }
   if(width===390){await p.locator('#one-page').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/color-play-plan-mobile.png'});}
  }
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),390,'Overflow at 200% text size');
  report.textZoom='200% at 390px: no horizontal page overflow';
  await p.setViewportSize({width:1536,height:864});await p.goto(pathToFileURL(file).href);
  await p.waitForTimeout(150);
  const pixels=()=>p.locator('#color-wave').evaluate(e=>e.toDataURL());
  const a=await pixels();await p.waitForTimeout(500);const b=await pixels();assert.notEqual(a,b,'Background must animate');
  await p.locator('#motion-toggle').click();const c=await pixels();await p.waitForTimeout(350);assert.equal(await pixels(),c,'Pause must freeze pixels');
  await p.reload();assert.equal(await p.evaluate(()=>document.documentElement.dataset.borderMotion),'paused');
  await p.locator('#motion-toggle').click();await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.documentElement.dataset.borderMotion==='reduced');
  assert.equal(await p.evaluate(()=>document.documentElement.dataset.borderMotion),'reduced');
  const d=await pixels();await p.waitForTimeout(350);assert.equal(await pixels(),d);assert.ok(await p.locator('#motion-toggle').isDisabled());
  await p.emulateMedia({reducedMotion:'no-preference'});
  await p.evaluate(()=>{document.querySelector('#rubric a[href="#one-page"]').click();});
  await p.waitForTimeout(1500);assert.equal(await p.locator('#slide-select').inputValue(),'one-page');
  await p.keyboard.press('n');assert.equal(await p.locator('#notes-one-page').isVisible(),true);await p.keyboard.press('Escape');assert.equal(await p.locator('#notes-one-page').isVisible(),false);
  const csv=await p.locator('a[download]').first().getAttribute('href');assert.ok(decodeURIComponent(csv).includes('Result,Test date,Decision'));
  await p.emulateMedia({media:'print'});await p.evaluate(()=>document.fonts.ready);
  report.printOverflow=await p.evaluate(()=>[...document.querySelectorAll('main>.slide')].map(s=>({id:s.id,overflow:s.scrollHeight-s.clientHeight,bottoms:[...s.children].filter(e=>getComputedStyle(e).display!=='none'&&!e.hidden).filter(e=>e.getBoundingClientRect().bottom>s.getBoundingClientRect().bottom+1).map(e=>e.className)})).filter(s=>s.overflow>1||s.bottoms.length));
  assert.equal(await p.locator('#color-wave').isVisible(),false);
  assert.deepEqual(report.printOverflow,[],'Clipped print content');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
  report.motion='Animated; pause freezes pixels and persists; reduced motion static; print hidden';
 }finally{fs.writeFileSync(path.join(__dirname,'check-rubric-v12.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('Rubric / responsive / offline / motion / print: PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
