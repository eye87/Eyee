const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const runtime = process.env.EYEE_NODE_MODULES || '/Users/jbrugman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium} = require(path.join(runtime, 'playwright'));
const root = path.resolve(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const shots = path.join(root, '.refactor-reference', 'language');
fs.mkdirSync(shots, {recursive: true});

(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.EYEE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    for (const [locale, expected] of [['nl-NL','nl'], ['en-US','en'], ['fr-FR','en']]) {
      const page = await browser.newPage({locale, viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, {waitUntil: 'domcontentloaded'});
      assert.equal(await page.locator('html').getAttribute('lang'), expected);
      assert.equal(await page.locator('.language-switcher [aria-pressed="true"]').count(), 2);
      assert.deepEqual(await page.locator('.language-switcher [aria-pressed="true"]').evaluateAll(nodes => nodes.map(node => node.dataset.language)), [expected, expected]);
      assert.match(await page.locator('#hero-title').innerText(), expected === 'en' ? /Digital starts/ : /Digitaal begint/);
      assert.match(await page.locator('#faq-title').innerText(), expected === 'en' ? /Good to/ : /Goed om/);
      assert.match(await page.locator('#review-text-12').innerText(), expected === 'en' ? /new shop/ : /nieuwe shop/);
      assert.match(await page.locator('.footer-policy-links').innerText(), expected === 'en' ? /Terms and conditions/ : /Algemene voorwaarden/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Horizontal overflow at ${locale}`);
      assert.deepEqual(errors, [], `Runtime errors for ${locale}`);
      if (locale === 'en-US') {
        await page.screenshot({path: path.join(shots, 'english-mobile.png'), fullPage: true, animations: 'disabled'});
        await page.locator('.menu-toggle').click();
        assert.equal(await page.locator('#menu').evaluate(el => el.open), true);
        await page.screenshot({path: path.join(shots, 'english-mobile-menu.png'), animations: 'disabled'});
        await page.locator('.menu-language [data-language="nl"]').click();
        assert.equal(await page.locator('html').getAttribute('lang'), 'nl');
        assert.match(await page.locator('#hero-title').innerText(), /Digitaal begint/);
        assert.equal(new URL(page.url()).searchParams.get('lang'), 'nl');
        await page.reload({waitUntil: 'domcontentloaded'});
        assert.equal(await page.locator('html').getAttribute('lang'), 'nl');
        await page.locator('.menu-toggle').click();
        await page.locator('.menu-language [data-language="en"]').click();
        assert.equal(await page.locator('html').getAttribute('lang'), 'en');
        assert.match(await page.locator('#hero-title').innerText(), /Digital starts/);
        assert.deepEqual(await page.locator('.language-switcher [aria-pressed="true"]').evaluateAll(nodes => nodes.map(node => node.dataset.language)), ['en', 'en']);
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-label'), 'Open menu');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#menu').evaluate(el => el.open), false);
      }
      await page.close();
      console.log(`${locale}: ${expected} passed`);
    }
    for (const width of [320, 820, 1024, 1440, 1728, 2560]) {
      const page = await browser.newPage({locale: 'en-US', viewport: {width, height: 1000}, reducedMotion: 'reduce'});
      await page.goto(url, {waitUntil: 'domcontentloaded'});
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Horizontal overflow in English at ${width}`);
      if (width <= 900) {
        await page.locator('.menu-toggle').click();
        assert.equal(await page.locator('.menu-language').isVisible(), true);
        await page.keyboard.press('Escape');
      } else {
        assert.equal(await page.locator('.menu-language').isVisible(), false);
      }
      if ([1024,1728].includes(width)) await page.screenshot({path: path.join(shots, `english-${width}.png`), fullPage: true, animations: 'disabled'});
      if (width === 1728) {
        for (const selector of ['.hero', '.approach', 'footer']) {
          const name = selector.replace(/[^a-z]/g, '');
          await page.locator(selector).first().screenshot({path: path.join(shots, `english-${name}.png`), animations: 'disabled'});
        }
      }
      await page.close();
      console.log(`${width}px English: no overflow`);
    }
    console.log('Language checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
