const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const artifacts = path.join(__dirname, 'artifacts', 'ripley-v2');

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const server = http.createServer((req,res) => {
    const route = new URL(req.url, 'http://localhost').pathname;
    const file = route === '/Color-Play/' ? 'index.html' : route === '/Color-Play/privacy.html' ? 'privacy.html' : route === '/Color-Play/credits.html' ? 'credits.html' : null;
    if (!file) {res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type', 'text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'dist',file)));
  });
  await new Promise(r => server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}/Color-Play/`;
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const report = {passed:false,viewports:[],axe:[],errors:[],externalRequests:[],failedRequests:[],checks:[]};
  try {
    const context = await browser.newContext({reducedMotion:'reduce',permissions:['camera']});
    await context.addInitScript(() => {
      window.__streams = []; window.__cameraCalls = 0;
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async constraints => { window.__cameraCalls++; const stream = await original(constraints); window.__streams.push(stream); return stream; };
    });
    const page = await context.newPage();
    page.on('pageerror',e => report.errors.push(String(e)));
    page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))report.externalRequests.push(r.url());});
    page.on('requestfailed',r=>report.failedRequests.push(r.url()));
    const shot = async name => page.locator('#kiosk-ui').screenshot({path:path.join(artifacts,name+'.png')});
    const audit = async name => {
      const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
      report.axe.push({name,violations:result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});
      assert.deepEqual(result.violations.map(v=>v.id),[], 'Axe '+name+' '+JSON.stringify(report.axe.at(-1)));
    };
    const chooseVisit = async mode => {
      const form = page.locator('.kiosk-entry');
      if (await form.count() && await form.getAttribute('data-visit-mode') !== mode) await page.getByRole('button',{name:'Back to options',exact:true}).click();
      if (await page.locator('.kiosk-visit-options').count()) await page.locator('#kiosk-mode-'+mode).click();
    };
    const assertCleared = async () => { assert.equal(await page.locator('#kiosk-rut').count(),0); assert.equal(await page.locator('.kiosk-visit-option').count(),2); };
    const consent = async (mode='first',rut='11.111.111-1') => {
      await chooseVisit(mode);
      await page.locator('#kiosk-rut').fill(rut);await page.locator('#kiosk-session-consent').check();
      await page.getByRole('button',{name:mode==='first'?'Start my color test':'Find my saved demo profile',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('#kiosk-rut'));
    };
    for(const width of [1440,1024,768,390,320]) {
      await page.setViewportSize({width,height:900});await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{});}));});
      const geometry = await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,sections:document.querySelectorAll('main > section').length,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length}));
      assert.equal(geometry.width,geometry.scrollWidth,'Overflow at '+width);assert.equal(geometry.sections,3);assert.equal(geometry.brokenImages,0);report.viewports.push(geometry);
      const left = await page.locator('#kiosk-mode-first').boundingBox(), right = await page.locator('#kiosk-mode-returning').boundingBox();
      assert.ok(width > 600 ? (right.x > left.x && Math.abs(right.y-left.y)<1) : (right.y > left.y && Math.abs(right.x-left.x)<1), 'Visit choice layout at '+width);
      assert.equal(await page.locator('#kiosk-rut').count(),0);
      assert.ok(!(await page.locator('#kiosk-ui').innerText()).includes('Inicio'));
      assert.match(await page.locator('#kiosk-mode-first').innerText(),/I want to see what could suit me/);
      assert.match(await page.locator('#kiosk-mode-returning').innerText(),/What's new for me\?/);
      await shot('visit-choice-'+width);
      await page.screenshot({path:path.join(artifacts,`page-${width}.png`),fullPage:true});
      if([1440,768,390].includes(width))await audit('entry-'+width);
    }
    await page.setViewportSize({width:1440,height:900});await page.goto(base);
    await page.locator('[data-screen="3"]').click();assert.ok((await page.locator('#kiosk-message').innerText()).includes('consent first'));
    await page.locator('#kiosk-mode-first').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.kiosk-entry').getAttribute('data-visit-mode'),'first');
    await page.getByRole('button',{name:'Back to options',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'kiosk-mode-first');
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.kiosk-entry').getAttribute('data-visit-mode'),'returning');
    await chooseVisit('first'); await audit('first-visit-rut-form');
    await page.locator('#kiosk-rut').fill('11.111.111-2');await page.getByRole('button',{name:'Start my color test',exact:true}).click();assert.ok((await page.locator('#rut-error').innerText()).includes('check digit'));
    await page.locator('#kiosk-rut').fill('11.111.111-1');await page.getByRole('button',{name:'Start my color test',exact:true}).click();assert.ok((await page.locator('#rut-error').innerText()).includes('consent'));
    await consent();await audit('color-test');await shot('color-test');
    assert.equal(await page.locator('#kiosk-camera').isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Upload a photo',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Use this color reference',exact:true}).click();assert.ok((await page.locator('#kiosk-message').innerText()).includes('Select a reference'));
    await page.getByRole('button',{name:'Use sample color test',exact:true}).click();await audit('taste');
    await page.getByRole('button',{name:'See my recommendation',exact:true}).click();assert.ok((await page.locator('#kiosk-profile-error').innerText()).includes('top'));
    for(const id of ['shirt','tee','jeans','chinos'])await page.locator(`input[name="kiosk-wardrobe"][value="${id}"]`).check();
    await page.locator('#kiosk-style').selectOption('smart');await page.locator('#kiosk-occasion').selectOption('work');
    await page.getByRole('button',{name:'See my recommendation',exact:true}).click();await audit('result');await shot('result');
    assert.ok(await page.locator('.kiosk-product').count()>=3);
    await page.getByRole('button',{name:'Get ticket / QR',exact:true}).click();await audit('ticket');await shot('ticket');
    const payload=await page.locator('.ticket-token').innerText();assert.match(payload,/^CP-ALC-84920:CPD-[A-F0-9-]+$/);assert.ok(!payload.includes('11111111'));
    const qr=page.locator('.ticket-qr');assert.equal(await qr.count(),1);await qr.screenshot({path:path.join(artifacts,'ticket-qr.png')});
    const qrDecoded=await page.evaluate(async()=>{
      if(!('BarcodeDetector' in window))return {available:false};
      const formats=await BarcodeDetector.getSupportedFormats();if(!formats.includes('qr_code'))return {available:false};
      const svg=document.querySelector('.ticket-qr');const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg));await image.decode();
      const found=await new BarcodeDetector({formats:['qr_code']}).detect(image);return {available:true,values:found.map(x=>x.rawValue)};
    });
    if(qrDecoded.available)assert.deepEqual(qrDecoded.values,[payload]);report.qrDecode=qrDecoded;
    await page.evaluate(()=>{window.__printCalls=0;window.print=()=>window.__printCalls++;});
    await page.getByRole('button',{name:'Print demo ticket',exact:true}).click();assert.equal(await page.evaluate(()=>window.__printCalls),1);assert.equal(await page.locator('#print-ticket svg').count(),1);
    await page.pdf({path:path.join(artifacts,'ticket-demo.pdf'),preferCSSPageSize:true,printBackground:true});
    await page.getByRole('button',{name:'Try checkout scan (demo)',exact:true}).click();await audit('checkout');
    await page.locator('#checkout-token').fill('tampered');await page.getByRole('button',{name:'Simulate ticket scan',exact:true}).click();assert.ok((await page.locator('#checkout-status').innerText()).includes('Unknown'));
    await page.locator('#checkout-token').fill(payload);await page.getByRole('button',{name:'Simulate ticket scan',exact:true}).click();assert.ok((await page.locator('#checkout-status').innerText()).includes('at least one'));
    const purchased=page.locator('input[name="checkout-purchased"]');await purchased.nth(0).check();assert.ok((await page.locator('.checkout-summary').innerText()).includes('3%'));
    await purchased.nth(1).check();assert.ok((await page.locator('.checkout-summary').innerText()).includes('5%'));
    await purchased.nth(2).check();assert.ok((await page.locator('.checkout-summary').innerText()).includes('8%'));
    assert.equal(await page.locator('#puntos-go-demo').isChecked(),false);await page.locator('#puntos-go-demo').check();
    await page.getByRole('button',{name:'Simulate ticket scan',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Demo ticket already used',exact:true}).isDisabled(),true);await shot('checkout-receipt');
    await page.getByRole('button',{name:'View Merchant data loop (demo)',exact:true}).click();await audit('merchant-loop');await shot('merchant-loop');assert.equal(await page.locator('.merchant-demo-row').count(),1);
    assert.ok(!(await page.locator('.merchant-preview').innerText()).includes('11.111'));
    await page.getByRole('button',{name:'Return to RUT entry (keep this local demo)',exact:true}).click();await consent('returning');await audit('returning');await shot('returning');
    assert.equal(await page.locator('.fastfind-result').count(),3);
    await page.locator('#kiosk-size').selectOption('XXL');assert.equal(await page.locator('.fastfind-result').count(),0);
    await page.getByRole('button',{name:'Get ticket / QR',exact:true}).click();assert.equal(await page.locator('.ticket-qr').count(),0);
    await page.locator('#kiosk-size').selectOption('L');await page.getByRole('button',{name:'Hide size',exact:true}).click();assert.equal(await page.locator('#kiosk-size').count(),0);assert.ok((await page.locator('.fastfind-results').innerText()).includes('Size hidden'));
    await page.getByRole('button',{name:'Get ticket / QR',exact:true}).click();assert.ok((await page.locator('.kiosk-ticket-demo').innerText()).includes('Size hidden'));assert.notEqual(await page.locator('.ticket-token').innerText(),payload);
    await page.getByRole('button',{name:'Finish and clear',exact:true}).click();await assertCleared();assert.equal(await page.locator('#print-ticket').count(),0);
    await chooseVisit('returning');await page.locator('#kiosk-store').selectOption('valparaiso');await page.locator('#kiosk-rut').fill('11.111.111-1');await page.locator('#kiosk-session-consent').check();await page.getByRole('button',{name:'Find my saved demo profile',exact:true}).click();assert.ok((await page.locator('#rut-error').innerText()).includes('not enabled'));
    await page.locator('#kiosk-store').selectOption('santiago');await page.locator('#kiosk-rut').fill('12.345.678-5');await page.getByRole('button',{name:'Find my saved demo profile',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#rut-error').textContent.includes('No local demo profile'));assert.equal(await page.locator('.fastfind-result').count(),0);
    await page.getByRole('button',{name:'Finish and clear',exact:true}).click();await consent('returning');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await assertCleared();await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}));
    await page.goto(base); await consent();
    assert.equal(await page.evaluate(()=>window.__cameraCalls),0);
    await page.locator('#kiosk-consent').check();await page.locator('#kiosk-camera').click();
    await page.getByRole('button',{name:'Take my photo',exact:true}).waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelector('#kiosk-camera-view video')?.readyState>=2);
    await page.getByRole('button',{name:'Take my photo',exact:true}).click();
    assert.ok(await page.locator('.kiosk-color').count()>0);assert.ok(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
    await page.locator('.kiosk-color').first().click();await page.getByRole('button',{name:'Use this color reference',exact:true}).click();assert.equal(await page.locator('#kiosk-screen canvas').count(),0);
    await page.getByRole('button',{name:'Finish and clear',exact:true}).click();await consent();await page.locator('#kiosk-consent').check();
    const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=200;const x=c.getContext('2d');['#b80a6b','#55738c','#785944','#b7ab9c'].forEach((color,i)=>{x.fillStyle=color;x.fillRect((i%2)*100,Math.floor(i/2)*100,100,100);});return c.toDataURL('image/png').split(',')[1];});
    await page.locator('#kiosk-file').setInputFiles({name:'color-sample.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.locator('.kiosk-color').first().waitFor();await audit('local-image-extraction');await shot('local-color-extraction');
    await page.locator('#kiosk-file').setInputFiles({name:'not-a-photo.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a photo')});assert.ok((await page.locator('#kiosk-message').innerText()).includes('JPG'));
    await page.getByRole('button',{name:'No result — leave safely',exact:true}).click();await assertCleared();
    for(const width of [390,768]) {
      await page.setViewportSize({width,height:900});await page.goto(base);await consent('returning');await audit('returning-'+width);await shot('returning-'+width);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    }
    await page.setViewportSize({width:390,height:900});await page.goto(base);await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await shot('text-200-percent');
    await page.goto(base);await page.locator('[data-stage-tab]').nth(0).click();assert.equal(await page.locator('[data-stage-tab]').nth(0).getAttribute('aria-selected'),'true');await page.locator('[data-stage-tab]').nth(0).press('ArrowRight');assert.equal(await page.locator('[data-stage-tab]').nth(1).getAttribute('aria-selected'),'true');
    await page.locator('[data-cam-preset="kiosk-closeup"]').click();await page.locator('[data-hotspot-btn="qr-handoff"]').click();assert.ok((await page.locator('#hotspot-detail-card').innerText()).includes('Ticket / QR'));
    const storage=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}));assert.deepEqual(storage,{local:0,session:0,cookie:''});
    await page.goto(base);await page.clock.install();await consent('returning');await page.clock.fastForward(181000);await assertCleared();assert.ok((await page.locator('#kiosk-message').innerText()).includes('3 minutes'));
    await page.goto(base+'privacy.html');assert.ok((await page.locator('main').innerText()).includes('not authentication'));
    const nojs=await browser.newContext({javaScriptEnabled:false});const fallback=await nojs.newPage();await fallback.goto(base);assert.equal(await fallback.locator('noscript').count(),1);await nojs.close();
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.failedRequests,[]);
    report.checks=['split visit chooser: left/right desktop, stacked mobile, keyboard entry/back and no RUT before choice','RUT format/check digit, consent and gated navigation','Mode1 sample color test, wardrobe validation and result','Mode2 local profile and store enablement, no-profile recovery','editable/hideable size, no sample stock exit','real QR and print-only ticket','checkout token rejection and one-time local receipt','3/5/8 non-additive tiers and separate optional loyalty preview','local Merchant loop without RUT exposure','camera consent, fake-camera capture and stopped tracks; real local-image extraction','reset/visibility/3-minute idle cleanup, zero persistent storage','responsive overflow, 200% text, keyboard tabs, 3D controls, no-JS fallback'];
    report.passed=true;
  } finally {
    fs.writeFileSync(path.join(artifacts,'verification.json'),JSON.stringify(report,null,2));
    await browser.close();
    server.closeAllConnections();
    await new Promise(r=>server.close(r));
  }
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
