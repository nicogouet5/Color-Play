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
        const visibleSimpleTech = [
          ...document.querySelectorAll('.simple-tech-logo')
        ].filter((el) => getComputedStyle(el).display !== 'none').length;
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
      assert.equal(
        state.sections,
        3,
        'Expected strictly 3 main paper sections (Presentation, 3D Prototype, Kiosk UI)'
      );
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
      nodes: v.nodes.length,
      targets: v.nodes.map(
        (n) => n.target.join(' ') + ' ' + n.html.slice(0, 160)
      )
    }));
    assert.deepEqual(
      report.axeViolations,
      [],
      `Axe WCAG A/AA violations found: ${JSON.stringify(report.axeViolations)}`
    );

    // Chapter 01: Hero & 3D Concept Switcher + Stage Tabs
    await page.locator('[data-hero-view="closeup"]').click();
    await page.locator('[data-hero-view="store"]').click();
    await page.screenshot({
      path: path.join(artifactDir, 'prototype_hero_desktop.png')
    });

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

    // Chapter 02: Interactive 360° 3D Viewer, Camera Presets & Hotspots
    await page.locator('#fixture-3d').scrollIntoViewIfNeeded();
    await page.locator('[data-cam-preset="kiosk-closeup"]').click();
    await page.locator('[data-cam-preset="isometric"]').click();
    await page.locator('[data-hotspot-btn="drape-rail"]').click();
    assert.ok(
      (await page.locator('#hotspot-detail-card').textContent()).includes(
        'Physical Fabric Comparison Drapes'
      )
    );
    assert.ok(
      (await page.locator('#rack-3d-canvas').evaluate((c) => c.width)) > 0,
      'Expected rendered 3D rack canvas'
    );
    await page.locator('#fixture-3d').screenshot({
      path: path.join(artifactDir, 'prototype_fixture_elevation.png')
    });

    // Chapter 03: Isolated Vision Kiosk UI (Welcome -> Photo -> Clothes -> Result)
    await page.locator('#kiosk-ui').scrollIntoViewIfNeeded();
    await page.locator('#kiosk-ui').screenshot({
      path: path.join(artifactDir, 'prototype_kiosk_welcome.png')
    });

    await page
      .getByRole('button', { name: 'Start my experience', exact: true })
      .click();
    assert.equal(await page.locator('#kiosk-camera').isDisabled(), true);

    await page
      .getByRole('button', { name: 'Continue without camera', exact: true })
      .click();

    for (const id of ['tee', 'shirt', 'jeans', 'chinos']) {
      await page
        .locator(`input[name="kiosk-wardrobe"][value="${id}"]`)
        .check();
    }
    await page.locator('#kiosk-style').selectOption('smart');
    await page.locator('#kiosk-occasion').selectOption('work');
    await page
      .getByRole('button', { name: 'See my recommendation', exact: true })
      .click();

    assert.equal(await page.locator('.kiosk-product').count(), 4);
    assert.equal(await page.locator('.kiosk-location').count(), 4);
    await page.locator('#kiosk-ui').screenshot({
      path: path.join(artifactDir, 'prototype_kiosk_result.png')
    });

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
      chapter01PresentationAndStages: 'PASS',
      chapter02Rack3dAndRenders: 'PASS',
      chapter03IsolatedVisionKioskUi: 'PASS'
    };

    fs.writeFileSync(
      path.join(__dirname, 'check-instore-prototype.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(
      'In-Store Prototype (3 Chapters / Zara Editorial Motion / 3D Rack / Isolated Vision Kiosk / Axe WCAG A-AA): PASS'
    );
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
