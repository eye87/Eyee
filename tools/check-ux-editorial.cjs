const assert=require('node:assert/strict');
const {chromium}=require('/Users/jbrugman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const width of [320,393,768,1440]){
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce',locale:'nl-NL'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8788/ui-ux-design.html',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>document.fonts.ready);
   const tabs=page.locator('.ux-demo-tabs [role="tab"]');
   assert.equal(await tabs.count(),3);
   await tabs.first().focus();await page.keyboard.press('ArrowRight');
   assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');
   assert.equal(await page.locator('#ux-demo-understand-panel').isVisible(),true);
   await page.keyboard.press('End');
   assert.equal(await tabs.nth(2).getAttribute('aria-selected'),'true');
   await tabs.first().click();
   assert.equal(await page.locator('#ux-demo-find-panel').isVisible(),true);
   assert.equal(await page.locator('.ux-team-editorial figure').count(),2);
   assert.equal(await page.locator('.ux-team-editorial blockquote').count(),1);
   assert.equal(await page.locator('section#ux-contact').count(),0);
   assert.equal(await page.locator('.footer .footer-conversation-copy').count(),1);
   assert.equal(await page.locator('.ux-demo-caption').count(),0);
   assert.equal(await page.locator('.ux-scan > div:first-child > .ux-section-intro').evaluate(e=>getComputedStyle(e).fontSize),await page.locator('.ux-process-heading .ux-section-intro').evaluate(e=>getComputedStyle(e).fontSize));
   const more=page.locator('.ux-work .ux-text-link');
   await more.scrollIntoViewIfNeeded();
   assert.equal(await more.evaluate(e=>getComputedStyle(e).textDecorationColor),'rgba(0, 0, 0, 0)');
   await more.hover();
   assert.equal(await more.evaluate(e=>getComputedStyle(e).textDecorationColor),'rgb(53, 88, 253)');
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.locator('.ux-scan-demo').hover();
   await page.waitForTimeout(550);
   assert.ok(await page.locator('.ux-scan-demo').evaluate(e=>new DOMMatrix(getComputedStyle(e,'::before').transform).a)>1.02);
   await page.emulateMedia({reducedMotion:'reduce'});
   for(const [selector,name] of [['.ux-process','process'],['.ux-scan','scan'],['.ux-people','people'],['.footer-conversation','footer']]){
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: ${name} overflows`);
    if(width===393||width===1440)await page.screenshot({path:`/tmp/eyee-editorial-${name}-${width}.png`});
   }
   assert.equal(errors.length,0,errors.join(', '));
   console.log(`${width}px: demo keyboard/click, matching intro size, homepage footer and no overflow passed`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
