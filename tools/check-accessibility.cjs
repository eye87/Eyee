const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('/Users/jbrugman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    for (const width of [320,390,768,1024,1440]) {
      const page = await browser.newPage({viewport:{width,height:900},locale:width===1024?'nl-NL':'en-US'});
      const errors=[];
      page.on('pageerror', e=>errors.push(e.message));
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>document.fonts.ready);
      const baseFont=await page.locator('#hero-title').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
      await page.locator('.accessibility-launch').click();
      const panel=page.locator('#accessibility-panel');
      assert.equal(await panel.evaluate(e=>e.open),true);
      assert.equal(await panel.evaluate(e=>e.contains(document.activeElement)),true);
      assert.match(await panel.locator('h2').innerText(),width===1024?/Toegankelijkheid/:/Accessibility/);
      for(const name of ['contrast','dark','reading','motion']) {
        await panel.locator(`[data-preference="${name}"]`).click();
        assert.equal(await page.locator('html').getAttribute(`data-a11y-${name}`),'');
        assert.equal(await panel.locator(`[data-preference="${name}"]`).getAttribute('aria-pressed'),'true');
      }
      await page.waitForTimeout(150);
      assert.equal(await page.locator('video').evaluateAll(videos=>videos.every(v=>v.paused)),true);
      for(let i=0;i<10;i++) await panel.locator('[data-size="10"]').click();
      assert.equal(await panel.locator('output').innerText(),'200%');
      const largeFont=await page.locator('#hero-title').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
      assert.ok(Math.abs(largeFont-baseFont*2)<1,'Text should actually double in size');
      await page.keyboard.press('Escape');
      assert.equal(await panel.evaluate(e=>e.open),false);
      const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(overflow.scroll<=overflow.width,`Overflow at ${width}: ${JSON.stringify(overflow)}`);
      if(width===390) await page.locator('.hero').screenshot({path:path.join(root,'.refactor-reference/language','accessibility-200-hero.png')});
      await page.reload({waitUntil:'domcontentloaded'});
      await page.evaluate(()=>document.fonts.ready);
      await page.locator('.accessibility-launch').click();
      assert.equal(await panel.locator('output').innerText(),'200%');
      await panel.locator('[data-reset]').click();
      assert.equal(await panel.locator('output').innerText(),'100%');
      assert.equal(await page.locator('html').getAttribute('data-a11y-dark'),null);
      if(width===390||width===1440) await panel.screenshot({path:path.join(root,'.refactor-reference/language',`accessibility-${width}.png`)});
      await panel.locator('[data-close]').click();
      assert.equal(await panel.evaluate(e=>e.open),false);
      assert.equal(await page.locator('.accessibility-launch').isVisible(),true);
      await page.locator('.accessibility-launch').click();
      assert.equal(await panel.evaluate(e=>e.open),true);
      await panel.locator('[data-reset]').click();
      await page.keyboard.press('Escape');
      assert.deepEqual(errors,[]);
      console.log(`${width}px: dialog, language, preferences, 200% text, persistence, reset and recovery passed`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
