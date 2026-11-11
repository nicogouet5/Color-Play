// Uses the repository's existing test tooling; no new browser dependencies.
const {chromium}=require('../../work/node_modules/playwright');
const {AxeBuilder}=require('../../work/node_modules/@axe-core/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({permissions:['camera','clipboard-write','clipboard-read']});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.BASE_URL||'http://localhost:4175/vision/';
 const report={viewports:[],checks:[],errors};
 fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
 try{
 for(const width of [1440,1024,780,390,320]){await page.setViewportSize({width,height:1000});await page.goto(base);await page.waitForFunction(()=>document.querySelectorAll('.color-row').length>0);await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${width}`);await page.screenshot({path:path.join(__dirname,`../artifacts/studio-${width}.png`),fullPage:true});report.viewports.push(width);}
 await page.setViewportSize({width:1440,height:1000});
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.axe=axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
 await page.locator('[data-palette="bright"]').click();assert.equal(await page.locator('[data-palette="bright"]').getAttribute('aria-pressed'),'true');report.checks.push('palette switching');
 await page.locator('#image').click({position:{x:70,y:70}});assert.equal(await page.locator('#sample-position').textContent(),'Image sample');await page.locator('#image').focus();await page.keyboard.press('ArrowRight');report.checks.push('pointer and keyboard sampling');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);const json=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.ok(json.sample);assert.ok(!JSON.stringify(json).includes('data:image'));report.checks.push('color-only JSON export');
 await page.locator('#copy').click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/^#[0-9A-F]{6}$/);report.checks.push('clipboard');
 await page.locator('#file').setInputFiles({name:'red.png',mimeType:'image/png',buffer:await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#FF0000';ctx.fillRect(0,0,100,100);return [...new Uint8Array(await (await new Promise(r=>c.toBlob(r))).arrayBuffer())];}).then(a=>Buffer.from(a))});
 await page.waitForFunction(()=>document.querySelector('#hex').textContent==='#FF0000');assert.equal(await page.locator('.color-row').count(),1);report.checks.push('actual upload and exact red extraction');
 await page.locator('#file').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('We couldn\'t'));report.checks.push('corrupt file recovery');
 await page.locator('#camera').click();await page.waitForFunction(()=>!document.querySelector('#capture').hidden);await page.locator('#capture').click();await page.waitForFunction(()=>document.querySelector('#source-label').textContent.includes('Capture'));assert.equal(await page.locator('#video').evaluate(v=>v.srcObject===null),true);report.checks.push('camera capture stops media stream');
 await page.locator('#camera').click();await page.waitForFunction(()=>!document.querySelector('#capture').hidden);await page.locator('#cancel-camera').click();assert.equal(await page.locator('#video').evaluate(v=>v.srcObject===null),true);report.checks.push('camera cancellation');
 await page.locator('#reset').click();assert.equal(await page.locator('.color-row').count(),0);assert.equal(await page.locator('#export').isDisabled(),true);assert.equal(await page.locator('#empty').isVisible(),true);report.checks.push('session erase');
 await page.locator('#help').click();assert.equal(await page.locator('#method').getAttribute('open'),'');report.checks.push('method disclosure');
 assert.deepEqual(errors,[]);assert.deepEqual(report.axe,[]);console.log(JSON.stringify(report,null,2));
 }finally{fs.writeFileSync(path.join(__dirname,'../artifacts/browser-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
