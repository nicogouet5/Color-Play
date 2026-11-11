const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const targetFile = path.join(root, 'index.html');
const artifactDir =
  '/Users/nicolas/.gemini/antigravity/brain/a5f04521-658d-4b98-a651-5aafbca2e514';

(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const report = {
    viewports: [],
    errors: [],
    externalRequests: [],
    interactiveFlow: {},
    axeViolations: []
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('pageerror', (err) => report.errors.push(String(err)));
    page.on('request', (req) => {
      if (/^https?:/.test(req.url())) {
        report.externalRequests.push(req.url());
      }
    });

    for (const width of [1536, 1024, 780, 390, 320]) {
      const height = width > 1000 ? 864 : 844;
      await page.setViewportSize({ width, height });
      await page.goto(pathToFileURL(targetFile).href);
      await page.evaluate(() => document.fonts.ready);

      const state = await page.evaluate(() => {
        const isMobile = window.innerWidth <= 600;
        const visibleSimpleTech = [...document.querySelectorAll('.simple-tech-logo')].filter(
          (el) => getComputedStyle(el).display !== 'none'
        ).length;
        return {
          width: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          sections: document.querySelectorAll('main > .paper-section').length,
          badImages: [...document.images].filter(
            (img) => !img.complete || !img.naturalWidth
          ).length,
          colorLogos: document.querySelectorAll('.color-logo').length,
          visibleSimpleTech,
          isMobile
        };
      });

      assert.equal(
        state.documentWidth,
        width,
        `Horizontal overflow at viewport width ${width}: scrollWidth=${state.documentWidth}`
      );
      assert.equal(state.sections, 4, 'Expected 4 main paper sections');
      assert.equal(state.badImages, 0, 'Expected 0 broken images');
      if (state.isMobile) {
        assert.equal(
          state.visibleSimpleTech,
          0,
          'Simple Tech mark should be hidden on <=600px mobile viewports'
        );
      } else {
        assert.ok(
          state.visibleSimpleTech > 0,
          'Simple Tech mark should be visible on desktop viewports'
        );
      }

      report.viewports.push(state);
    }

    // Check 200% text zoom at 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const zoomWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    assert.equal(zoomWidth, 390, `Overflow at 200% text size: ${zoomWidth}`);
    report.textZoom = '200% at 390px: no horizontal page overflow';

    // Reset to desktop 1536x864 for interactive walkthrough, Axe audit, and screenshots
    await page.setViewportSize({ width: 1536, height: 864 });
    await page.goto(pathToFileURL(targetFile).href);
    await page.evaluate(() => document.fonts.ready);

    // Run Axe WCAG A/AA check
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    report.axeViolations = axeResults.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length
    }));
    assert.deepEqual(
      report.axeViolations,
      [],
      `Axe WCAG A/AA violations found: ${JSON.stringify(report.axeViolations)}`
    );

    // Screenshot 1: Hero & Stage Switcher
    await page.screenshot({
      path: path.join(artifactDir, 'prototype_hero_desktop.png')
    });

    // Test Stage Tabs
    await page.locator('#tab-stage1').click();
    assert.equal(
      await page.locator('#tab-stage1').getAttribute('aria-selected'),
      'true'
    );
    await page.locator('#tab-stage3').click();
    assert.equal(
      await page.locator('#tab-stage3').getAttribute('aria-selected'),
      'true'
    );
    await page.locator('#tab-stage2').click();

    // Test Fixture Hotspots & Screenshot 2
    await page.locator('#fixture-anatomy').scrollIntoViewIfNeeded();
    await page.locator('[data-hotspot-btn="drape-rail"]').click();
    assert.ok(
      (await page.locator('#hotspot-detail-card').textContent()).includes(
        'Physical Fabric Comparison Drapes'
      )
    );
    await page.locator('#fixture-anatomy').screenshot({
      path: path.join(artifactDir, 'prototype_fixture_elevation.png')
    });

    // Test Interactive Simulator Walkthrough & Screenshot 3
    await page.locator('#simulator').scrollIntoViewIfNeeded();
    await page
      .locator('#simulator-inline-root [data-sim-action="start-comparison"]')
      .click();
    await page
      .locator('#simulator-inline-root [data-sim-scenario="warm-autumn"]')
      .click();
    await page
      .locator('#simulator-inline-root [data-sim-action="view-palette"]')
      .click();
    assert.ok(
      (await page.locator('#simulator-inline-root').textContent()).includes(
        'Spiced Terracotta'
      )
    );
    await page
      .locator('#simulator-inline-root [data-sim-action="view-rack"]')
      .click();
    await page
      .locator('#simulator-inline-root [data-sim-action="toggle-qr-pass"]')
      .click();
    assert.ok(
      await page.locator('#simulator-inline-root .sim-ephemeral-pass').isVisible()
    );
    await page.locator('#simulator').screenshot({
      path: path.join(artifactDir, 'prototype_simulator_rack_matches.png')
    });

    // Test Quality Gate No-Result Route
    await page
      .locator('#simulator-inline-root [data-sim-goto="scenario"]')
      .click();
    await page
      .locator('#simulator-inline-root [data-sim-scenario="mixed-lighting"]')
      .click();
    await page
      .locator('#simulator-inline-root [data-sim-action="trigger-no-result"]')
      .click();
    assert.ok(
      (await page.locator('#simulator-inline-root').textContent()).includes(
        'Quality Gate Active'
      )
    );

    // Test Fullscreen Kiosk Modal (<dialog>) & Screenshot 4
    await page.locator('header [data-open-kiosk]').click();
    assert.equal(
      await page.locator('#kiosk-dialog').evaluate((d) => d.open),
      true
    );
    await page.screenshot({
      path: path.join(artifactDir, 'prototype_kiosk_modal.png')
    });
    await page.locator('#close-kiosk-dialog').click();
    assert.equal(
      await page.locator('#kiosk-dialog').evaluate((d) => d.open),
      false
    );

    // Mobile screenshot at 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(artifactDir, 'prototype_mobile_390.png')
    });

    assert.deepEqual(report.errors, [], 'Expected 0 runtime page errors');
    assert.deepEqual(
      report.externalRequests,
      [],
      'Expected 0 external network requests'
    );

    report.interactiveFlow = {
      stageTabs: 'PASS',
      fixtureHotspots: 'PASS',
      simulatorSteps: 'PASS',
      noResultRoute: 'PASS',
      kioskDialog: 'PASS'
    };

    fs.writeFileSync(
      path.join(__dirname, 'check-instore-prototype.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(
      'In-Store Prototype (TypeScript + CSS / Responsive / Axe WCAG A-AA / Offline / Simulator / Kiosk): PASS'
    );
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
