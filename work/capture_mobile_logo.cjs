const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('file://' + root + '/ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Standalone.html');
    await page.waitForFunction(() => document.querySelectorAll('.color-logo').length === 22);
    await page.screenshot({ path: '/tmp/color-play-mobile-logo-only.png' });
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
