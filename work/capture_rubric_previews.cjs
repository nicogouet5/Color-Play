const {chromium}=require('playwright');
const path=require('path');
const {pathToFileURL}=require('url');
(async()=>{
 const root=path.resolve(__dirname,'..');const dir=path.join(root,'ENTREGA_FINAL_v12');
 const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await b.newPage({viewport:{width:1536,height:864},reducedMotion:'reduce'});
  await p.goto(pathToFileURL(path.join(dir,'Color-Play_Certamen_II_Dossier_v12_Standalone.html')).href);
  await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>document.querySelectorAll('.color-logo').length===26);
  await p.screenshot({path:path.join(dir,'Vista_previa_portada.png')});
  await p.screenshot({path:path.join(dir,'Vista_previa_co-branding.png')});
  for(const [id,name] of [['rubric','rubrica'],['one-page','one_page'],['assumptions-1','assumption_log']]){
   await p.locator('#'+id).evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));
   await p.waitForTimeout(60);await p.locator('#'+id).screenshot({path:path.join(dir,'Vista_previa_'+name+'.png')});
  }
  await p.setViewportSize({width:390,height:844});
  await p.locator('#s1').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));
  await p.screenshot({path:path.join(dir,'Vista_previa_logo_movil.png')});
  await p.locator('#one-page').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));
  await p.screenshot({path:path.join(dir,'Vista_previa_one_page_movil.png')});
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
