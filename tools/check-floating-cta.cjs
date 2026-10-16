const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {chromium} = require('/Users/jbrugman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    for (const width of [320,393,768,1440]) {
      const page = await browser.newPage({viewport:{width,height:852},locale:'nl-NL',reducedMotion:'reduce'});
      await page.clock.install();
      await page.goto(url, {waitUntil:'domcontentloaded'});
      await page.evaluate(()=>document.fonts.ready);
      const card = page.locator('.floating-cta');
      const wait = width <= 900 ? 12000 : 8000;
      const scroll = async fraction => page.evaluate(f => window.scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*f,behavior:'instant'}), fraction);
      await scroll(.2);
      await page.clock.fastForward(wait+200);
      assert.equal(await card.isVisible(),false,'Time alone must not show CTA');
      await scroll(width <= 900 ? .39 : .29);
      await page.clock.runFor(100);
      assert.equal(await card.isVisible(),false,'Below scroll threshold');
      await scroll(.45);
      await page.clock.runFor(150);
      await scroll(.5);
      await page.evaluate(()=>dispatchEvent(new Event('scroll')));
      await page.clock.runFor(200);
      if (!await card.isVisible()) console.log(await page.evaluate(()=>({now:performance.now(),y:scrollY,range:document.documentElement.scrollHeight-innerHeight,hidden:document.hidden,modal:!!document.querySelector('dialog[open]'),session:sessionStorage.getItem('eyee-floating-cta-shown')})));
      assert.equal(await card.isVisible(),true);
      const c = await card.boundingBox(), a = await page.locator('.accessibility-launch').boundingBox();
      assert.ok(Math.abs(a.x-c.x-c.width-20)<1,'20px gap');
      assert.ok(c.x >= 19 && c.y >= 0 && c.y+c.height<=852,'Card inside screen');
      await page.screenshot({path:`/tmp/eyee-floating-cta-${width}.png`});
      await page.evaluate(()=>{document.documentElement.lang='en'; document.dispatchEvent(new Event('eyeelanguagechange'));});
      assert.match(await card.locator('h2').textContent(),/New plans/);
      await page.locator('.accessibility-launch').click();
      await page.clock.runFor(100);
      assert.equal(await card.isVisible(),false,'Hide for accessibility dialog');
      await page.locator('.accessibility-close').click();
      await page.clock.runFor(100);
      assert.equal(await card.isVisible(),true);
      await card.locator('button').click();
      assert.equal(await card.isVisible(),false);
      await page.reload({waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('.floating-cta').count(),1,'Preview is available again after reload');
      await page.close();
      console.log(`${width}px: thresholds, placement, language, modal and session passed`);
    }
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    await page.clock.install();
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight*.5,behavior:'instant'}));
    await page.clock.fastForward(7000);
    assert.equal(await page.locator('.floating-cta').isVisible(),false,'Scroll alone must not show CTA');
    await page.clock.fastForward(1400);
    assert.equal(await page.locator('.floating-cta').isVisible(),true);
    console.log('Desktop minimum time passed');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
