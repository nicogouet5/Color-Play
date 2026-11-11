const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
 const root = path.resolve(__dirname,'..');
 const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page = await browser.newPage({viewport:{width:1536,height:864},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 let requests=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 const url='file://'+root+'/ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Standalone.html';
 await page.goto(url);await page.evaluate(()=>document.fonts.ready);
 const results={errors,externalRequests:requests};
 results.desktop = await page.evaluate(()=>[...document.querySelectorAll('main>.slide')].map(s=>({id:s.id,height:Math.round(s.getBoundingClientRect().height),width:s.scrollWidth,viewport:innerWidth})));
 for (const id of ['s1','s2','s4','dmu','s9','s12','a2','a6']) {
   await page.locator('#'+id).scrollIntoViewIfNeeded();
   await page.locator('#'+id).screenshot({path:'/tmp/color-play-v12-'+id+'.png'});
 }
 await page.emulateMedia({media:'print'});
 results.print = await page.evaluate(()=>[...document.querySelectorAll('main>.slide')].map(s=>{
  const sr=s.getBoundingClientRect();
  const nodes=[...s.querySelectorAll('*')].filter(e=>getComputedStyle(e).display!=='none' && !e.closest('[hidden]'));
  const textRects=[];const walker=document.createTreeWalker(s,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){const n=walker.currentNode;if(!n.textContent.trim()||n.parentElement.closest('[hidden],.rationale')||getComputedStyle(n.parentElement).display==='none')continue;const range=document.createRange();range.selectNodeContents(n);for(const rect of range.getClientRects())if(rect.width&&rect.height)textRects.push(rect.bottom);}
  const bottom=Math.max(...nodes.map(e=>e.getBoundingClientRect().bottom),...textRects);
  return {id:s.id,height:sr.height,overflow:Math.max(0,Math.round(bottom-sr.bottom)),contentHeight:s.scrollHeight};
 }));
 await page.pdf({path:root+'/work/Color-Play_v12_Core.pdf',preferCSSPageSize:true,printBackground:true,tagged:true,outline:true});
 await page.goto('file://'+root+'/work/Color-Play_v12_Rationales.html');await page.evaluate(()=>document.fonts.ready);
 results.notes=await page.evaluate(()=>[...document.querySelectorAll('.slide')].map((s,i)=>({page:i+1,overflow:s.scrollHeight-s.clientHeight})));
 await page.pdf({path:root+'/work/Color-Play_v12_Notes.pdf',preferCSSPageSize:true,printBackground:true,tagged:true});
 await page.emulateMedia({media:'screen',reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:844});await page.goto(url);await page.evaluate(()=>document.fonts.ready);
 results.mobile = await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,slides:[...document.querySelectorAll('main>.slide')].map(s=>({id:s.id,width:s.scrollWidth,client:s.clientWidth})),controls:[...document.querySelectorAll('.toolbar button,.toolbar select')].map(e=>({id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}));
 await page.locator('#s1').screenshot({path:'/tmp/color-play-v12-mobile.png'});
 await page.locator('#dmu').screenshot({path:'/tmp/color-play-v12-dmu-mobile.png'});
 await page.selectOption('#slide-select','dmu');await page.waitForTimeout(80);
 results.navigation = {selected:await page.locator('#slide-select').inputValue(),counter:await page.locator('#slide-counter').textContent()};
 await page.locator('#dmu .notes-btn').click();
 results.notesToggle = {expanded:await page.locator('#dmu .notes-btn').getAttribute('aria-expanded'),visible:await page.locator('#notes-dmu').isVisible()};
 await page.locator('h2').first().click({force:true});await page.keyboard.press('Escape');
 results.escapeCloses=await page.locator('#notes-dmu').isHidden();
 await page.setViewportSize({width:320,height:740});
 results.smallMobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,toolbarWidth:document.querySelector('.toolbar').getBoundingClientRect().width}));
 await page.setViewportSize({width:780,height:1024});
 results.tablet=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth}));
 await page.setViewportSize({width:1536,height:864});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 results.largeText=await page.evaluate(()=>({width:document.body.scrollWidth,viewport:innerWidth,bodyFont:getComputedStyle(document.body).fontSize,bodyOverflow:document.body.scrollWidth>innerWidth,tableOverflow:[...document.querySelectorAll('.table-wrap')].some(e=>e.scrollWidth>e.clientWidth)}));
 fs.writeFileSync(root+'/work/check-v12.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
