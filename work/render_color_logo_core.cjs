const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await page.goto('file://' + root + '/ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Standalone.html');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelectorAll('.meta-right .color-logo').length === 22);
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.equal(requests.length, 0, requests.join('\n'));
    await page.screenshot({ path: '/tmp/color-play-co-branding.png' });
    await page.pdf({
      path: root + '/work/Color-Play_v12_Logo_Core.pdf',
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true
    });
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
