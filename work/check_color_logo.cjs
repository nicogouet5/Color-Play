const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const results = [];
    for (const size of [{ width: 1536, height: 864 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport: size });
      const page = await context.newPage();
      const errors = [], external = [];
      page.on('pageerror', error => errors.push(String(error)));
      page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
      await page.goto('file://' + root + '/ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Standalone.html');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.querySelectorAll('.meta-right .color-logo').length === 22);
      const state = await page.evaluate(() => ({
        viewport: innerWidth,
        scrollWidth: document.body.scrollWidth,
        colorLogos: document.querySelectorAll('.meta-right .color-logo').length,
        colorPlayWordmarks: document.querySelectorAll('.meta-right .wordmark').length,
        simpleTechLogos: document.querySelectorAll('.meta-right .brand').length,
        visibleColorLogos: [...document.querySelectorAll('.meta-right .color-logo')].filter(item => getComputedStyle(item).display !== 'none').length,
        invalidImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).length,
        headers: [...document.querySelectorAll('.meta-right')].map(item => item.getBoundingClientRect().right <= innerWidth)
      }));
      assert.equal(state.scrollWidth, state.viewport);
      assert.equal(state.colorLogos, 22);
      assert.equal(state.colorPlayWordmarks, 0);
      assert.equal(state.simpleTechLogos, 22);
      assert.equal(state.invalidImages, 0);
      assert(state.headers.every(Boolean));
      assert.equal(errors.length, 0, errors.join('\n'));
      assert.equal(external.length, 0, external.join('\n'));
      results.push({ ...state, errors, externalRequests: external });
      await context.close();
    }
    fs.writeFileSync(path.join(__dirname, 'check-color-logo.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
