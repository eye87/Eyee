const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {chromium}=require('/Users/jbrugman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  for(const width of [393,1440]){
   const page=await browser.newPage({viewport:{width,height:1000},locale:'nl-NL',reducedMotion:'no-preference'});
   const errors=[]; page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.resolve(__dirname,'../ui-ux-design.html')).href,{waitUntil:'domcontentloaded',timeout:60000});
   await page.evaluate(()=>document.fonts.ready);
   const label=page.locator('.ux-action-label');
   assert.equal(await label.evaluate(e=>getComputedStyle(e).opacity),'1');
   assert.ok((await label.boundingBox()).width>80);
   assert.equal(await page.locator('.ux-service-disclosures details').count(),3);
   await page.locator('.ux-service-disclosures summary').first().click();
   assert.equal(await page.locator('.ux-service-detail').first().isVisible(),true);
   await page.locator('.ux-service-disclosures summary').first().click();
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await page.waitForTimeout(150);
   assert.equal(await page.locator('.ux-reel-launch').count(),0);
   assert.equal(await page.locator('.ux-steps .ux-process-art').count(),4);
   assert.equal(await page.locator('.ux-challenges .ux-benefit-art').count(),3);
   assert.equal(await page.locator('.footer .footer-brand-art').count(),1);
   assert.equal(await page.locator('section#ux-contact').count(),1);
   assert.equal(await page.locator('.footer .footer-conversation-copy,.footer .footer-start').count(),2);
   assert.equal(await page.locator('.ux-step-number,.ux-story-progress,.ux-steps small').count(),0);
   assert.match(await page.locator('#hero-video').getAttribute('src'),/eyee-showreel/);
   const homeLink=page.locator('.ux-breadcrumb a');
   await homeLink.hover(); await page.waitForTimeout(250);
   assert.equal(await homeLink.evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
   await page.screenshot({path:`/tmp/eyee-ux-hero-${width}.png`});
   const colors=[];
   for(const selector of ['.ux-services','.ux-work','.ux-process','.ux-people']){
    await page.evaluate(selector=>{const e=document.querySelector(selector);scrollTo({top:scrollY+e.getBoundingClientRect().top-innerHeight*.25,behavior:'instant'});},selector);
    await page.waitForTimeout(100);
    colors.push(await page.locator('#ux-main').evaluate(e=>getComputedStyle(e).backgroundColor));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if(selector==='.ux-process')await page.screenshot({path:`/tmp/eyee-ux-story-${width}.png`});
   }
   assert.ok(new Set(colors).size>1,'Story changes shared canvas');
   await page.locator('.ux-people').scrollIntoViewIfNeeded();
   await page.waitForTimeout(300);
   await page.screenshot({path:`/tmp/eyee-ux-team-${width}.png`});
   await page.locator('.footer-conversation').scrollIntoViewIfNeeded();
   await page.waitForTimeout(150);
   await page.screenshot({path:`/tmp/eyee-ux-footer-${width}.png`});
   assert.equal(errors.length,0,errors.join(', '));
   console.log(`${width}px: hero label, service content, shared canvas and layout passed (${colors.join(' / ')})`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
