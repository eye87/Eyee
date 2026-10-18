const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {chromium} = require('/Users/jbrugman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    for (const width of [320,393,768,1440]) {
      const page = await browser.newPage({viewport:{width,height:900},locale:'nl-NL',reducedMotion:'reduce'});
      const errors = [];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(pathToFileURL(path.resolve(__dirname,'../ui-ux-design.html')).href);
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('main').count(),1);
      assert.equal(await page.locator('h1').count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.locator('.ux-faq summary').first().click();
      assert.equal(await page.locator('.ux-faq details').first().getAttribute('open'),'');
      if (width<=900) {
        await page.locator('.menu-toggle').click();
        await page.locator('.mobile-expertise-trigger').click();
        assert.equal(await page.locator('#mobile-expertise').isVisible(),true);
        await page.locator('.mobile-menu-back').click();
        await page.locator('.menu-close').click();
      } else {
        await page.locator('.expertise-trigger').click();
        assert.equal(await page.locator('#expertise-heading').evaluate(e=>getComputedStyle(e).fontSize),'18px');
        await page.keyboard.press('Escape');
      }
      await page.locator('.accessibility-launch').click();
      assert.equal(await page.locator('.accessibility-panel h2').evaluate(e=>getComputedStyle(e).fontSize),width<=360?'20px':'21px');
      await page.locator('.accessibility-close').click();
      await page.locator('.footer-language [data-language=en]').click();
      assert.match(await page.locator('h1').textContent(),/Easy to use/);
      assert.match(await page.title(),/UX & UI design/);
      await page.locator('.footer-language [data-language=nl]').click();
      assert.match(await page.locator('h1').textContent(),/Helder in gebruik/);
      assert.equal(errors.length,0,errors.join(', '));
      console.log(`${width}px: layout, FAQ, navigation, accessibility and NL/EN passed`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
