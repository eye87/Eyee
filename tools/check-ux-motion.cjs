const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {chromium}=require('/Users/jbrugman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const width of [393,1440]){
   const page=await browser.newPage({viewport:{width,height:1000},locale:'nl-NL',reducedMotion:'no-preference'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.resolve(__dirname,'../ui-ux-design.html')).href);
   await page.waitForFunction(()=>document.querySelector('#hero-video').hasAttribute('src'));
   await page.waitForFunction(()=>!document.querySelector('#hero-video').paused);
   const video=page.locator('#hero-video');
   assert.equal(await video.evaluate(e=>e.muted&&e.loop&&e.playsInline),true);
   assert.equal(await page.locator('.ux-hero-pause,.ux-reel-launch').count(),0);
   assert.equal(await page.locator('.ux-service-chapter').count(),3);
   assert.equal(await page.locator('.ux-service-disclosures').count(),0);
   const card=page.locator('.ux-case-image').first();
   await card.scrollIntoViewIfNeeded();await page.waitForTimeout(750);
   await card.hover();
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.ux-case-image'),'::before').opacity==='1');
   assert.equal(await card.evaluate(e=>getComputedStyle(e,'::before').opacity),'1');
   assert.equal(await card.locator('.case-link-arrow').evaluate(e=>getComputedStyle(e).opacity),'1');
   const question=page.locator('.ux-faq summary').first();
   await question.hover();await page.waitForTimeout(350);
   assert.equal(await question.evaluate(e=>getComputedStyle(e).color),'rgb(53, 88, 253)');
   await question.click();
   assert.equal(await question.evaluate(e=>e.parentElement.open),true);
   assert.equal(await question.locator('span').last().evaluate(e=>getComputedStyle(e,'::after').content),'"−"');
   await question.focus();await page.keyboard.press('Enter');
   assert.equal(await question.evaluate(e=>e.parentElement.open),false);
   const benefit=page.locator('.ux-challenges article').first();
   await benefit.scrollIntoViewIfNeeded();await page.waitForTimeout(900);await benefit.hover();
   assert.equal(await benefit.locator('svg').evaluate(e=>getComputedStyle(e).animationName),'ux-icon-wave');
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>document.querySelector('#hero-video').paused);
   await page.waitForFunction(()=>!document.querySelector('.ux-reveal-ready:not(.is-revealed)'));
   assert.equal(await page.locator('.ux-reveal-ready:not(.is-revealed)').count(),0);
   assert.equal(await benefit.locator('svg').evaluate(e=>getComputedStyle(e).animationName),'none');
   assert.equal(errors.length,0,errors.join(', '));
   console.log(`${width}px: autoplay, service/FAQ hover, case overlay, keyboard and reduced motion passed`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
