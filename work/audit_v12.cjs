const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs');
const path = require('path');
(async () => {
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const context=await browser.newContext({viewport:{width:1536,height:864}});
  const page=await context.newPage();
  await page.goto('file://'+root+'/ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Standalone.html');
  await page.evaluate(()=>document.fonts.ready);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  fs.writeFileSync(path.join(__dirname,'axe-v12.json'),JSON.stringify(result,null,2));
  console.log(`Axe WCAG A/AA: ${result.violations.length} automated violations; ${result.incomplete.length} checks require review.`);
  if(result.violations.length) process.exitCode=1;
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
