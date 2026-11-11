// Rebuild current pages and current rationales from the standalone HTML; no v11 input.
const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:1536,height:864}});
  await p.goto(pathToFileURL(path.join(root,'ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Standalone.html')).href);
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForFunction(()=>document.querySelectorAll('.color-logo').length===26&&[...document.images].every(i=>i.complete&&i.naturalWidth));
  const data=await p.evaluate(()=>({
   style:document.querySelector('style').textContent,
   logo:document.querySelector('.color-logo').src,
   slides:[...document.querySelectorAll('main>.slide')].map(s=>({id:s.id,label:s.querySelector('.meta>span').textContent,title:s.querySelector('h1,h2').textContent,note:s.dataset.note}))
  }));
  await p.emulateMedia({media:'print'});
  const overflow=await p.evaluate(()=>[...document.querySelectorAll('main>.slide')].filter(s=>s.scrollHeight>s.clientHeight+1).map(s=>s.id));assert.deepEqual(overflow,[]);
  await p.pdf({path:path.join(__dirname,'Color-Play_v12_Current_Core.pdf'),preferCSSPageSize:true,printBackground:true,tagged:true,outline:true});
  const perPage=3, pages=[];
  for(let i=0;i<data.slides.length;i+=perPage){
   const entries=data.slides.slice(i,i+perPage);
   pages.push(`<section class="slide rationale-page"><div class="meta"><span>Appendix G · Current decision rationales · ${pages.length+1} / ${Math.ceil(data.slides.length/perPage)}</span><img class="color-logo" src="${data.logo}" alt="Color logo"></div><h2>The reasoning behind the revision.</h2>${entries.map((s,k)=>`<article class="rationale-entry"><h3>${i+k+1} · ${escape(s.label)}</h3><p class="rationale-title">${escape(s.title)}</p><p>${escape(s.note)}</p></article>`).join('')}</section>`);
  }
  await p.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${data.style}\n.rationale-page{gap:22px}.rationale-page h2{font-size:2.5rem}.rationale-entry{padding-top:16px}.rationale-entry h3{font-size:1.125rem}.rationale-entry p{font-size:.9375rem;line-height:1.5}.rationale-entry .rationale-title{font-weight:650;color:var(--ink);margin-bottom:8px}.rationale-page .color-logo{width:90px;height:30px;object-fit:contain}</style></head><body>${pages.join('')}</body></html>`);
  await p.evaluate(()=>document.fonts.ready);
  assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll('.slide')].filter(s=>s.scrollHeight>s.clientHeight+1).map((s,i)=>i+1)),[],'Rationale overflow');
  await p.pdf({path:path.join(__dirname,'Color-Play_v12_Current_Rationales.pdf'),preferCSSPageSize:true,printBackground:true,tagged:true});
  fs.writeFileSync(path.join(__dirname,'rubric-page-map.json'),JSON.stringify({corePages:data.slides.length,rationalePages:pages.length,slides:data.slides.map((s,i)=>({page:i+1,id:s.id,label:s.label,title:s.title}))},null,2));
  console.log(`Rendered ${data.slides.length} current slides + ${pages.length} current rationale pages.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
