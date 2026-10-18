/* Page-specific behaviour. Shared menu and footer code is built from script.js. */
(() => {
  const fields = [...document.querySelectorAll('[data-en]')].map(element => ({element,nl:element.textContent,en:element.dataset.en}));
  function translateDetail() {
    const english = document.documentElement.lang === 'en';
    document.querySelector('.ux-demo-tabs')?.setAttribute('aria-label',english?'UX Quickscan example':'UX Quickscan voorbeeld');
    document.querySelector('.ux-reel-launch')?.setAttribute('aria-label',english ? 'Play showreel' : 'Showreel afspelen');
    fields.forEach(({element,nl,en}) => {element.textContent = english ? en : nl;});
    document.title = english ? 'UX & UI design — Clear interfaces, better experiences | Eyee' : 'UX & UI design — Heldere interfaces, betere ervaringen | Eyee';
    document.querySelector('meta[name="description"]').content = english ? 'Eyee combines user research, interaction design and UI design. For clear websites, webshops and applications. Explore our work and UX Quickscan.' : 'Eyee verbindt gebruikersonderzoek, interactieontwerp en UI design. Voor heldere websites, webshops en applicaties. Bekijk ons werk en de UX Quickscan.';
  }
  document.addEventListener('eyeelanguagechange', translateDetail);
  translateDetail();
  const header = document.querySelector('.header');
  let frame;
  addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(() => {header.classList.toggle('is-compact',scrollY>80);frame=0;});
  },{passive:true});
})();
