const {chromium}=require('../../work/node_modules/playwright');
const {AxeBuilder}=require('../../work/node_modules/@axe-core/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({permissions:['camera']});const page=await context.newPage();const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{const url=new URL(r.url());if(['http:','https:'].includes(url.protocol)&&!['localhost','127.0.0.1'].includes(url.hostname))external.push(r.url());});
 const report={checks:[],viewports:[],errors,external,axe:[]};const artifacts=path.join(__dirname,'../artifacts');fs.mkdirSync(artifacts,{recursive:true});
 const base=process.env.BASE_URL||'http://localhost:4175/vision/';
 async function axe(state){const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.axe.push({state,violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});}
 async function upload(color='#B80A6B'){
  const buffer=Buffer.from(await page.evaluate(async color=>{const c=document.createElement('canvas');c.width=c.height=100;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,100,100);return [...new Uint8Array(await(await new Promise(r=>c.toBlob(r))).arrayBuffer())];},color));
  await page.locator('#file').setInputFiles({name:'my-photo.png',mimeType:'image/png',buffer});await page.waitForFunction(()=>document.querySelector('#source-label').textContent.includes('Your image'));
 }
 async function next(){await page.locator('#quiz-next').click();}
 async function fillProfile({style='casual',wardrobe=['tee','shirt','jeans','chinos'],occasion='work',climate='mild',comfort='balanced',avoid=['jeans','hoodie']}={}){
  await page.locator(`input[name="style"][value="${style}"]`).check();await next();
  for(const id of wardrobe)await page.locator(`input[name="wardrobe"][value="${id}"]`).check();await next();
  await page.locator(`input[name="occasion"][value="${occasion}"]`).check();await next();
  await page.locator(`input[name="climate"][value="${climate}"]`).check();await next();
  await page.locator(`input[name="comfort"][value="${comfort}"]`).check();await next();
  for(const id of avoid)await page.locator(`input[name="avoid"][value="${id}"]`).check();await next();
 }
 try{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.waitForFunction(()=>document.querySelectorAll('.color-row').length>0);
  assert.equal(await page.locator('#pin-tone').isDisabled(),true);await axe('interview');
  await next();assert.match(await page.locator('#quiz-error').textContent(),/Choose/);report.checks.push('question validation and demo cannot become personal reference');
  await upload();await page.locator('#image').click({position:{x:50,y:50}});await page.locator('#pin-tone').click();assert.equal(await page.locator('#tone-list li').count(),1);assert.match(await page.locator('#tone-list').textContent(),/#B80A6B/);report.checks.push('manual confirmed color reference');
  await fillProfile();assert.equal(await page.locator('#generate-looks').isDisabled(),false);await page.locator('#generate-looks').click();assert.equal(await page.locator('.outfit').count(),3);assert.ok(!(await page.locator('.outfit-pieces').allTextContents()).some(s=>s.includes('Straight jeans')));assert.match(await page.locator('#looks-context').textContent(),/confirmed/);report.checks.push('six-question interview and exclusion-aware outfits');
  const before=await page.locator('.outfit-pieces').first().textContent();await page.locator('#swap-0-0').click();const after=await page.locator('.outfit-pieces').first().textContent();assert.notEqual(after,before);assert.match(await page.locator('#look-status').textContent(),/swapped/);report.checks.push('compatible garment swap with explanation refresh');
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download-looks').click()]);const payload=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(payload.looks.length,3);assert.equal(payload.references[0].hex,'#B80A6B');assert.equal(payload.profile.style,'casual');assert.ok(!JSON.stringify(payload).includes('data:image'));report.checks.push('outfit export includes preferences and no image');
  await axe('outfits');
  for(const width of [1440,1024,780,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${width}`);
   await page.locator('#look-results').screenshot({path:path.join(artifacts,`looks-${width}.png`)});report.viewports.push(width);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#tone-list button').click();assert.equal(await page.locator('#look-results').isVisible(),false);await page.locator('#generate-looks').click();assert.match(await page.locator('#looks-context').textContent(),/Based only on your answers/);report.checks.push('reference removal invalidates results; preference-only fallback');
  await page.locator('#pin-tone').click();await page.locator('#generate-looks').click();await upload('#326B70');assert.equal(await page.locator('#tone-list li').count(),0);assert.equal(await page.locator('#look-results').isVisible(),false);assert.equal(await page.locator('#generate-looks').isDisabled(),false);report.checks.push('new image clears old references and outfits, preserves interview');
  await page.locator('#generate-looks').click();await page.locator('#rethink-style').click();assert.equal(await page.locator('#look-results').isVisible(),false);assert.equal(await page.locator('input[name="style"][value="casual"]').isChecked(),true);report.checks.push('edit interview preserves answers and invalidates old looks');
  await page.locator('#reset').click();assert.equal(await page.locator('#tone-list li').count(),0);assert.equal(await page.locator('#look-results').isVisible(),false);assert.equal(await page.locator('#generate-looks').isDisabled(),true);assert.equal(await page.locator('input:checked').count(),0);report.checks.push('reset clears photo, interview, references and outfits');
  await fillProfile({wardrobe:['knit','jeans'],climate:'warm',avoid:[]});await page.locator('#generate-looks').click();assert.match(await page.locator('#look-status').textContent(),/No compatible combination/);assert.equal(await page.locator('#look-results').isVisible(),false);report.checks.push('honest no-compatible-look state');
  await page.locator('#reset').click();await page.locator('#camera').click();await page.waitForFunction(()=>!document.querySelector('#capture').hidden);await page.locator('#capture').click();await page.waitForFunction(()=>document.querySelector('#source-label').textContent.includes('Capture'));assert.equal(await page.locator('#pin-tone').isDisabled(),false);await page.locator('#tone-role').selectOption('hair');await page.locator('#pin-tone').click();assert.match(await page.locator('#tone-list').textContent(),/My hair/);report.checks.push('camera capture supports explicit tone roles');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);for(const a of report.axe)assert.deepEqual(a.violations,[]);
  console.log(JSON.stringify(report,null,2));
 }finally{fs.writeFileSync(path.join(artifacts,'stylist-browser-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
