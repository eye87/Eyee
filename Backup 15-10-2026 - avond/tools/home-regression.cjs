/* Local regression checks. No build step or website dependency is introduced. */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const runtime = process.env.EYEE_NODE_MODULES || '/Users/jbrugman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const { PNG } = require(path.join(runtime, 'pngjs'));
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const reference = path.join(root, '.refactor-reference', '2026-10-15');
const mode = process.argv[2] || 'compare';
const viewports = [
  [320,740], [390,844], [430,932], [650,900], [768,1024], [820,1180],
  [900,1180], [1024,1366], [1100,800], [1280,800], [1440,900],
  [1680,1370], [1920,1080], [2560,1370],
];
const selectedViewports = process.env.EYEE_VIEWPORTS ? viewports.filter(([width])=>process.env.EYEE_VIEWPORTS.split(',').includes(String(width))) : viewports;
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const visualProperties=['display','position','visibility','opacity','color','backgroundColor','backgroundImage','backgroundPosition','backgroundSize','border','borderRadius','boxShadow','clipPath','filter','fontFamily','fontSize','fontWeight','letterSpacing','lineHeight','textAlign','textDecorationLine','textDecorationColor','textUnderlineOffset','transform','width','height','minWidth','maxWidth','minHeight','maxHeight','margin','padding','gap','overflow','objectFit','objectPosition','zIndex'];
async function layoutSignature(page){
  const signature=await page.evaluate(properties=>[...document.querySelectorAll('*')].map((el,index)=>{
    const rect=el.getBoundingClientRect();
    const style=getComputedStyle(el);
    const styles=Object.fromEntries(properties.map(key=>[key,style[key]]));
    const pseudo=Object.fromEntries(['::before','::after'].map(which=>{
      const computed=getComputedStyle(el,which);
      return [which,computed.content==='none'?null:Object.fromEntries(properties.map(key=>[key,computed[key]]))];
    }));
    return {index,tag:el.tagName,classes:el.className?.baseVal??el.className,text:el.children.length?'':el.textContent?.trim().slice(0,100),rect:[rect.x,rect.y,rect.width,rect.height].map(n=>Math.round(n*100)/100),styles,pseudo};
  }),visualProperties);
  const sourcePrefix=path.join(reference,'source')+path.sep;
  return JSON.parse(JSON.stringify(signature).split(sourcePrefix).join(root+path.sep));
}
function comparableSignature(signature){
  return signature.map(element=>element.tag==='MAIN'?{...element,rect:null,styles:null}:element);
}
if (mode === 'baseline' && !process.argv.includes('--resume')) {
  assert(!fs.existsSync(path.join(reference, 'source')), 'Baseline already exists; never overwrite the approved reference.');
  fs.mkdirSync(path.join(reference, 'source'), { recursive: true });
  for (const file of ['index.html','style.css','script.js']) fs.copyFileSync(path.join(root,file),path.join(reference,'source',file));
  fs.symlinkSync(path.join(root,'assets'),path.join(reference,'source','assets'),'dir');
  fs.writeFileSync(path.join(reference,'assets-sha256.json'),JSON.stringify(Object.fromEntries(fs.readdirSync(path.join(root,'assets')).map(file=>[file,digest(path.join(root,'assets',file))])),null,2));
}
function comparePNG(before, after) {
  const a=PNG.sync.read(fs.readFileSync(before)),b=PNG.sync.read(fs.readFileSync(after));
  assert.equal(b.width,a.width,'Screenshot width changed');
  assert.equal(b.height,a.height,'Screenshot height changed');
  let changed=0;
  for(let i=0;i<a.data.length;i+=4) if(a.data[i]!==b.data[i] || a.data[i+1]!==b.data[i+1] || a.data[i+2]!==b.data[i+2] || a.data[i+3]!==b.data[i+3])changed++;
  return changed;
}
async function freeze(page) {
  await page.evaluate(async()=>{
    await document.fonts.ready;
    document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager');
    await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
    document.querySelectorAll('video').forEach(v=>v.pause());
  });
  await page.addStyleTag({content: '*{scroll-behavior:auto!important} *,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}.hero-portrait .hero-video-poster{visibility:visible!important}'});
}
async function interactions(browser) {
  const page=await browser.newPage({viewport:{width:820,height:1180},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'domcontentloaded'});
  await freeze(page);
  await page.locator('.menu-toggle').click();
  assert(await page.locator('#menu').evaluate(e=>e.open),'Menu did not open');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#menu').evaluate(e=>e.open),false);
  assert(await page.locator('.menu-toggle').evaluate(e=>e===document.activeElement),'Menu focus did not return');
  await page.locator('.faq-section details').first().locator('summary').click();
  assert(await page.locator('.faq-section details').first().evaluate(e=>e.open),'FAQ did not open');
  for(const selector of ['.case-poster-grid','.team-grid']){
    const grid=page.locator(selector);
    await grid.evaluate(e=>{e.scrollLeft=e.scrollWidth;});
    assert(await grid.evaluate(e=>e.scrollLeft>0),`${selector} did not scroll`);
    await grid.evaluate(e=>{e.scrollLeft=0;});
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  const caseArea=page.locator('.case-hover-area').first();
  await caseArea.hover();
  assert.equal(await caseArea.locator('.case-poster').evaluate(e=>getComputedStyle(e).translate),'0px -8px','Case hover lift missing');
  await page.locator('.logo-item').first().evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await page.waitForTimeout(100);
  await page.locator('.logo-item').first().hover();
  await page.waitForTimeout(250);
  assert(await page.locator('#client-logo-tooltip').isVisible(),'Logo hover note missing');
  await page.keyboard.press('Tab');
  await page.locator('.logo-item').first().evaluate(e=>e.focus({preventScroll:true}));
  await page.waitForTimeout(50);
  assert(await page.locator('#client-logo-tooltip').isVisible(),'Logo focus note missing');
  await page.keyboard.press('Escape');
  assert(await page.locator('#client-logo-tooltip').isHidden(),'Escape did not hide note');
  await page.locator('.review-next').count().then(async count=>{
    if(count)await page.locator('.review-next').click();
    else {const next=page.locator('[data-review-next]');if(await next.count())await next.click();}
  });
  const button=page.locator('#video-toggle');
  await button.scrollIntoViewIfNeeded();
  await page.locator('#reel').evaluate(video=>{
    let paused=true;
    window.__videoCalls={play:0,pause:0};
    Object.defineProperty(video,'paused',{configurable:true,get:()=>paused});
    video.play=()=>{window.__videoCalls.play++;paused=false;video.dispatchEvent(new Event('play'));return Promise.resolve();};
    video.pause=()=>{window.__videoCalls.pause++;paused=true;video.dispatchEvent(new Event('pause'));};
    video.pause();
  });
  assert.equal(await button.getAttribute('data-paused'),'true');
  await button.click();
  assert(await page.evaluate(()=>window.__videoCalls.play>0),'Video play action missing');
  await page.locator('#reel').evaluate(video=>video.play());
  assert.equal(await button.getAttribute('data-paused'),'false');
  await button.click();
  assert.equal(await button.getAttribute('data-paused'),'true','Video pause action missing');
  await page.setViewportSize({width:390,height:844});
  const toggle=page.locator('.footer-section-toggle').first();
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.deepEqual(errors,[],'Runtime errors');
  await page.close();
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.EYEE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const output=path.join(reference,mode==='baseline'?'baseline':'current');
  fs.mkdirSync(output,{recursive:true});
  const results=[];
  try {
    for(const [width,height] of selectedViewports){
      const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
      const sourceRoot=mode==='baseline'||process.env.EYEE_COMPARE_REFERENCE==='1'?path.join(reference,'source'):root;
      await page.goto(pathToFileURL(path.join(sourceRoot,'index.html')).href,{waitUntil:'domcontentloaded'});
      await freeze(page);
      // Trigger viewport-based lazy states in the same order in both versions.
      await page.evaluate(async()=>{
        for(let y=0;y<document.body.scrollHeight;y+=innerHeight){scrollTo(0,y);await new Promise(r=>requestAnimationFrame(r));}
        scrollTo(0,0);
      });
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow at ${width}`);
      const filename=`${width}x${height}.png`;
      await page.screenshot({path:path.join(output,filename),fullPage:true,animations:'disabled'});
      const pixels=mode==='baseline'?0:comparePNG(path.join(reference,'baseline',filename),path.join(output,filename));
      const signature=await layoutSignature(page);
      const signaturePath=path.join(output,`${width}x${height}.layout.json`);
      fs.writeFileSync(signaturePath,JSON.stringify(signature));
      const original=mode==='baseline'?signature:JSON.parse(fs.readFileSync(path.join(reference,'baseline',`${width}x${height}.layout.json`)));
      const layoutEqual=JSON.stringify(comparableSignature(original))===JSON.stringify(comparableSignature(signature));
      results.push({width,height,changedPixels:pixels,layoutEqual});
      console.log(`${width}x${height}: ${mode==='baseline'?'reference saved':`${pixels} changed pixels; layout ${layoutEqual?'equal':'DIFF'}`}`);
      await page.close();
    }
    await interactions(browser);
    const assets=JSON.parse(fs.readFileSync(path.join(reference,'assets-sha256.json')));
    for(const [file,hash] of Object.entries(assets))assert.equal(digest(path.join(root,'assets',file)),hash,`Asset changed: ${file}`);
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,interactions:'passed',assets:'unchanged'},null,2));
    assert(results.every(r=>r.layoutEqual),'Layout or computed style differences found; inspect signatures before accepting.');
    console.log('All checks passed.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
