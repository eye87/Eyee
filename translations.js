/* Dutch source copy stays in index.html. English copy is applied without replacing
   elements, so links, focus, video and slider state survive a language switch. */
(() => {
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const copy = new Map([
    ['Naar de inhoud', 'Skip to content'],
    ['Expertises', 'Expertise'],
    ['Cases', 'Projects'],
    ['Over ons', 'About us'],
    ['Sluiten', 'Close'],
    ['Bel ons', 'Call us'],
    ['Een frisse blik begint hier', 'A fresh perspective starts here'],
    ['Een goed gesprek.', 'A good conversation.'],
    ['Een nieuw perspectief.', 'A new perspective.'],
    ['Digitaal begint', 'Digital starts'],
    ['bij', 'with'],
    ['mensen.', 'people.'],
    ['Wij maken complexe vragen eenvoudig.', 'We make complex challenges easier to solve.'],
    ['Met', 'With'],
    ['gebruikersonderzoek', 'user research'],
    [', doordacht', ', thoughtful'],
    ['en', 'and'],
    ['betrouwbare techniek', 'reliable technology'],
    ['Hiermee helpen we je', 'How we can help'],
    ['Maak kennis met Eyee', 'Meet Eyee'],
    ['Een selectie van', 'A selection of'],
    ['ons werk.', 'our work.'],
    ['UX & UI design voor een internationaal platform voor het plannen van maritiem onderzoek.', 'UX & UI design for an international platform used to plan maritime research.'],
    ['Een overzichtelijk platform dat mensen met diabetes helpt de juiste informatie te vinden.', 'A clear platform that helps people with diabetes find the information they need.'],
    ['Een toegankelijke, contentrijke website die maatschappelijke kennis helder ontsluit.', 'An accessible, content-rich website that makes social research easy to explore.'],
    ['Ontwerp en ontwikkeling van een nieuwe website voor het belonen van medewerkers en klanten.', 'Design and development of a new website for rewarding employees and customers.'],
    ['Bekijk alle cases', 'View all projects'],
    ['Ontdek meer van ons werk.', 'Explore more of our work.'],
    ['Eerst', 'First,'],
    ['begrijpen.', 'understand.'],
    ['Dan', 'Then,'],
    ['maken.', 'create.'],
    ['Elke vraag verdient een eigen aanpak. We zetten onderzoek, design en techniek in op een manier die past bij jouw project. Jij denkt mee, wij maken het concreet.', 'Every challenge calls for its own approach. We bring research, design and technology together in a way that fits your project. You bring your perspective; we turn ideas into something tangible.'],
    ['Gebruikers\u00adonderzoek', 'User research'],
    ['We luisteren, vragen door en onderzoeken wat mensen nodig hebben. Zo weet je waar je het verschil kunt maken.', 'We listen, ask questions and find out what people need. That shows where you can make a real difference.'],
    ['Van structuur tot visueel ontwerp. We maken interfaces die logisch werken en passen bij jouw organisatie.', 'From structure to visual design, we create intuitive interfaces that fit your organisation.'],
    ['Betrouwbare techniek', 'Reliable technology'],
    ['Een solide basis die met je meegroeit. We gebruiken AI om slimmer te bouwen en bewaken zelf de kwaliteit.', 'A solid foundation that grows with you. We use AI to build more efficiently while keeping quality firmly in our own hands.'],
    ['Korte', 'Straight'],
    ['lijnen.', 'talk.'],
    ['Brede', 'Broad'],
    ['blik.', 'thinking.'],
    ['Designers en developers met meer dan 15 jaar ervaring. We denken met je mee, houden de lijnen kort en maken complexe vragen helder.', 'Designers and developers with more than 15 years of experience. We work closely with you and make complex challenges clear.'],
    ['Leer ons kennen', 'Get to know us'],
    ['UI / UX Designer & Eigenaar', 'UI / UX Designer & Owner'],
    ['Back-end & Front-end Developer', 'Back-end & Front-end Developer'],
    ['Wat onze', 'What our'],
    ['klanten', 'clients'],
    ['zeggen.', 'say.'],
    ['van', 'at'],
    ['Bekijk alle reviews op Google', 'Read all reviews on Google'],
    ['Reviews op Google', 'Google reviews'],
    ['(opent in een nieuw tabblad)', '(opens in a new tab)'],
    ['Goed om', 'Good to'],
    ['te weten.', 'know.'],
    ['Van een eerste idee tot de stap na livegang. Hier vind je antwoorden op vragen die we vaak krijgen.', 'From the first idea to life after launch: answers to questions we often hear.'],
    ['Vragen over je project of samenwerken met ons?', 'Questions about your project or working with us?'],
    ['Liever even overleggen?', 'Prefer to talk it through?'],
    ['Kunnen we jullie voor één onderdeel inschakelen?', 'Can we hire you for just one part of a project?'],
    ['Ja. Je kunt ons inschakelen voor onderzoek, UX & UI design of development, of voor een combinatie daarvan. We kijken samen welke expertise aansluit bij je vraag en wat er al ligt.', 'Yes. You can work with us on research, UX & UI design, development or a combination of these. Together we decide which expertise fits your needs and what is already in place.'],
    ['Verbeteren jullie ook bestaande websites?', 'Do you also improve existing websites?'],
    ['We kijken graag mee naar wat goed werkt en waar verbetering mogelijk is. Dat kan gaan om gebruiksgemak, ontwerp of techniek. Op basis van je doelen en de bestaande website bepalen we samen of gerichte verbeteringen of een grotere aanpassing passend zijn.', 'Absolutely. We look at what works well and where there is room to improve, whether that is usability, design or technology. Based on your goals and current website, we decide together whether focused improvements or a broader update make sense.'],
    ['Welke aanpak past bij ons project?', 'What approach would suit our project?'],
    ['We beginnen bij je vraag, je doelen en de mensen die het gaan gebruiken. We bespreken wat er al bekend is en waar nog inzicht ontbreekt. Van daaruit kiezen we samen een aanpak die past bij het project, in plaats van een vast traject voor iedereen.', 'We start with your challenge, your goals and the people who will use the result. We discuss what you already know and where more insight is needed. Then we choose an approach that fits your project, rather than following the same process every time.'],
    ['Helpen jullie na de lancering?', 'Can you help after launch?'],
    ['Live gaan is een nieuw begin. We blijven meten, leren en verbeteren. En zorgen met onderhoud en ondersteuning dat je product met je organisatie meegroeit.', 'Launch is a new beginning. We keep measuring, learning and improving. With maintenance and support, we help your product grow with your organisation.'],
    ['Hoe gebruiken jullie AI in jullie werk?', 'How do you use AI in your work?'],
    ['Ideeën, ontwerp en belangrijke keuzes komen van ons, in gesprek met jou. Bij de technische uitwerking gebruiken we AI waar het helpt om sneller te bouwen en oplossingen te verkennen. We beoordelen en testen het resultaat zelf. Ook bij onderhoud, updates en veiligheid houden we de regie: AI ondersteunt ons werk, maar neemt onze verantwoordelijkheid niet over.', 'Ideas, design and important decisions come from us, in conversation with you. During development, we use AI where it helps us build faster and explore solutions. We review and test the results ourselves. We also stay in control of maintenance, updates and security: AI supports our work, but never takes over our responsibility.'],
    ['Wat kost een project bij jullie?', 'How much does a project cost?'],
    ['Dat hangt af van de vraag, de omvang en wat er al beschikbaar is. Een gerichte verbetering vraagt iets anders dan een compleet nieuw product. Bespreek je doelen en budget met ons, dan kunnen we kijken welke aanpak daarbij past.', 'That depends on the challenge, the scope and what is already available. A focused improvement requires something different from a completely new product. Tell us about your goals and budget, and we can explore an approach that fits.'],
    ['Hoe lang duurt een project?', 'How long does a project take?'],
    ['De planning hangt af van de omvang, de techniek en de keuzes die nog gemaakt moeten worden. Ook beschikbare content en feedback spelen mee. Vertel ons wat je wilt bereiken en of er een gewenste lanceringsdatum is, dan bespreken we wat haalbaar is.', 'The timeline depends on the scope, the technology and the decisions still to be made. Available content and feedback also play a part. Tell us what you want to achieve and whether you have a target launch date, and we will discuss what is realistic.'],
    ['Wat hebben jullie nodig om te beginnen?', 'What do you need from us to get started?'],
    ['Je hoeft nog geen uitgewerkt plan te hebben. Je vraag, je doelen en een beeld van de mensen voor wie je het maakt zijn een goed begin. Heb je al een website, onderzoek of huisstijl? Neem die gerust mee, zodat we kunnen voortbouwen op wat er ligt.', 'You do not need a finished plan. Your question, your goals and an idea of the people you want to reach are enough to start. If you already have a website, research or brand identity, bring it along so we can build on what is there.'],
    ['Hoe werken we samen?', 'How do we work together?'],
    ['Jullie kennen je organisatie en gebruikers, wij brengen onze expertise mee. Samen bespreken we de keuzes en toetsen we of de richting past. Hoe we afstemmen en wanneer jullie input nodig is, bepalen we aan de hand van het project.', 'You know your organisation and your users; we bring our expertise. We discuss decisions together and check whether the direction feels right. How we stay in touch and when we need your input depends on the project.'],
    ['Wat gaan we', 'What will we'],
    ['samen maken?', 'make together?'],
    ['Laten we kennismaken', 'Let’s meet'],
    ['Wat we doen', 'What we do'],
    ['Gebruikersonderzoek', 'User research'],
    ['Websites & platformen', 'Websites & platforms'],
    ['Techniek & koppelingen', 'Technology & integrations'],
    ['Onderhoud & doorontwikkeling', 'Maintenance & improvement'],
    ['Maak kennis', 'Get to know us'],
    ['Je vindt ons in', 'Find us in'],
    ['Direct contact', 'Get in touch'],
    ['Algemene voorwaarden', 'Terms and conditions'],
    ['Privacy en cookieverklaring', 'Privacy and cookie policy'],
  ]);

  const reviews = [
    `If you are looking for beautiful design, you have come to the right place. Jeroen & Jeroen listen carefully to what their clients want, then surprise you by adding their own expertise and creativity. Alongside a great result, they are a pleasure to work with. So I would say: go for it!`,
    `Eye Entertainment has built an impressive portfolio for CMO STAMM, including websites such as trendbureaudrenthe.nl, sociaalplanbureaugroningen.nl and drenthezorgmetouderen.nl. Working with Jeroen and Jeroen is a real pleasure. Communication is smooth and quick, making the whole process efficient. The team is skilled not only at designing and developing websites, but also at maintaining and improving them. In short, Eye Entertainment delivers quality work and a positive experience at every stage of the project.`,
    `Our collaboration with Eye Entertainment has been extremely successful! BivT has benefited greatly from their professional approach and creative input. Their team is dedicated, approachable and full of innovative ideas that fit our vision perfectly. This partnership clearly adds value to our projects, and we look forward to future work together. Highly recommended to anyone who values quality and professionalism!`,
    `I really enjoyed working with Eye Entertainment on a new website for Yesty. The team was organised, approachable and a pleasure to work with from start to finish. They quickly understood what we wanted to achieve, contributed thoughtful ideas and delivered a result we are truly proud of. If you are looking for a reliable, capable and friendly partner for web design and development, I certainly recommend Eye Entertainment. We are very happy with the result and the collaboration.`,
    `Jeroen and Jeroen helped build our new website. It turned out beautifully, exactly as we had imagined, and we are very happy with it! What we appreciate most is that they are always there when we need them. One email or phone call and they help straight away. Communication is easy. Explaining your ideas and vision to others can be challenging, but with Jeroen and Jeroen it was simple. It is also reassuring that they offer a maintenance and support plan, so we do not have to worry about updates or changes to the website. Thank you, Eye Entertainment; we look forward to continuing our work together!`,
    `Excellent work. You should be proud of what you delivered for us. It turned out brilliantly: a great visual identity, and even the invoices and packing slips look excellent. THANK YOU!`,
    `We worked hard together on Advantive’s new website. Communication with Jeroen & Jeroen was smooth and quick. Thank you for your design insights, tips and advice, and the beautiful design. This gives us room to grow again.`,
    `The Jeroens did wonderful work designing our OutreachXXL platform and its website. Their creativity and professionalism resulted in a clean, user-friendly platform and a strong brand identity. Communication was clear and pleasant. We are happy with the result and would gladly keep working with them on future improvements.`,
    `We want to thank Eye Entertainment for helping us at short notice. Communication was direct and smooth. Together we created a strong foundation to build on. Thank you!`,
    `It was such a pleasure working with you! We are incredibly happy with the final result.`,
    `I am very satisfied with Eye Entertainment. They helped me tremendously and there was always personal contact. Discussions went smoothly and they understood what I wanted. I am happy with the final result. I highly recommend Eye Entertainment to anyone looking for high-quality, personal service.`,
    `De Print Partner’s new shop looks fantastic once again. Thank you so much!`,
  ];

  const clientNotes = {
    'Sociaal Planbureau Groningen': 'Design, development and maintenance of a website that makes social research accessible.',
    'Diabetesvereniging Nederland': 'A clear platform that helps people with diabetes find the information they need.',
    Yesty: 'Design and development of a website for rewarding employees and customers.',
    Salda: 'A specialist in ventilation systems and air treatment for homes and businesses.',
    'Provincie Groningen': 'The provincial government serving the people, organisations and environment of Groningen.',
    Gullimex: 'Measurement and monitoring solutions for reliable process control.',
    'Trendbureau Drenthe': 'A website that makes research and insights about life in Drenthe accessible.',
    'The Indian Maharadja': 'An updated Magento shop for the Dutch hockey and sports brand, created with Mountain IT.',
    'CMO STAMM': 'An accessible, content-rich website that makes social research easy to explore.',
    '101BHV': 'First aid and workplace safety training and products.',
    'Beach Wagon': 'Foldable wagons for the beach, camping and other outings.',
    'Provincie Drenthe': 'The provincial government serving the people, organisations and environment of Drenthe.',
    'Bijscholing Instituut voor Therapeuten': 'Courses and workshops for therapists’ professional development.',
    'Drenthe samen gezond in beweging': 'An initiative encouraging sport, exercise and healthy living in Drenthe.',
    'De Print Partner': 'Digital print solutions for resellers, print shops and high-volume customers.',
    Horecagoedkoop: 'Updated UX/UI design and a Magento shop for the online drinks wholesaler, created with Mountain IT.',
    Gooze: 'A specialist in performance parts for classic American cars.',
    'Ukraine Food': 'Design and development of a new online shop for Ukraine Food.',
    'Symphony Travel': 'A website and logo for a bespoke travel agency, created with Mountain IT.',
    'Kwekerij Arborealis': 'Distinctive trees, shrubs and plants, with biodiversity in mind.',
    'Groenstudio Schöne': 'A Groningen-based design studio for sustainable gardens and landscapes.',
    Spijs: 'A Groningen restaurant with a focus on craft and local ingredients.',
  };

  const attributes = new Map([
    ['Eyee — pagina verversen', 'Eyee — refresh page'],
    ['Hoofdnavigatie', 'Main navigation'],
    ['Menu openen', 'Open menu'],
    ['Menu sluiten', 'Close menu'],
    ['Uitgebreide navigatie', 'Expanded navigation'],
    ['Dronebeeld van de stad', 'Aerial view of the city'],
    ['Een selectie van onze opdrachtgevers', 'A selection of our clients'],
    ['Uitgelichte cases', 'Featured projects'],
    ['Interface van het Marine Facilities Planning platform voor Maas Software Engineering', 'Interface of the Marine Facilities Planning platform for Maas Software Engineering'],
    ['Website van Diabetesvereniging Nederland op tablet en telefoon', 'Diabetesvereniging Nederland website on a tablet and phone'],
    ['Websiteontwerp van CMO STAMM op een tablet', 'CMO STAMM website design on a tablet'],
    ['Digitaal beloningsplatform van Yesty', 'Yesty digital rewards platform'],
    ['Onze hoofddiensten', 'Our main services'],
    ['Showreel van Eyee met beelden van de stad, mensen, onderzoek en techniek', 'Eyee showreel featuring the city, people, research and technology'],
    ['Projectvideo afspelen', 'Play project video'],
    ['Projectvideo pauzeren', 'Pause project video'],
    ['Ervaringen van onze klanten', 'What our clients say'],
    ['Vorige referentie', 'Previous review'],
    ['Volgende referentie', 'Next review'],
    ['Diensten', 'Services'],
    ['Over Eyee', 'About Eyee'],
    ['Sociale media', 'Social media'],
    ['Taalkeuze', 'Language selection'],
  ]);

  const entries = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    if (node.parentElement.closest('script,style,svg')) continue;
    const original = node.nodeValue;
    const key = normalize(original);
    const english = node.parentElement.matches('blockquote[id^="review-text-"]')
      ? reviews[Number(node.parentElement.id.replace('review-text-', '')) - 1]
      : copy.get(key);
    if (!english) continue;
    entries.push({node, original, english});
  }
  const attributeEntries = [];
  document.querySelectorAll('[aria-label],[alt],[title]').forEach(element => {
    for (const name of ['aria-label', 'alt', 'title']) {
      const original = element.getAttribute(name);
      if (!original) continue;
      const english = attributes.get(original) || (name === 'aria-label' && /^\d+ van 12$/.test(original) ? original.replace(' van ', ' of ') : null);
      if (english) attributeEntries.push({element, name, original, english});
    }
  });

  const title = document.title;
  const description = document.querySelector('meta[name="description"]');
  const descriptionNl = description?.content;
  const buttons = [...document.querySelectorAll('.language-switcher [data-language]')];
  const preferenceKey = 'eyee-language';
  let stored;
  try { stored = localStorage.getItem(preferenceKey); } catch { /* Private browsing may block storage. */ }
  const queryLanguage = () => {
    const value = new URLSearchParams(location.search).get('lang');
    return value === 'nl' || value === 'en' ? value : null;
  };
  const browserLanguage = (navigator.languages?.[0] || navigator.language || '').toLowerCase().startsWith('nl') ? 'nl' : 'en';
  let language = 'nl';

  function applyLanguage(next) {
    language = next;
    document.documentElement.lang = next;
    entries.forEach(({node, original, english}) => {
      const leading = original.match(/^\s*/)[0];
      const trailing = original.match(/\s*$/)[0];
      node.nodeValue = next === 'en' ? leading + english + trailing : original;
    });
    attributeEntries.forEach(({element, name, original, english}) => element.setAttribute(name, next === 'en' ? english : original));
    document.title = next === 'en' ? 'Eyee — Digital experiences that move people forward' : title;
    if (description) description.content = next === 'en'
      ? 'Eyee combines user research, UX & UI design and reliable technology to make complex challenges easier to solve.'
      : descriptionNl;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === next)));
    document.dispatchEvent(new CustomEvent('eyeelanguagechange', {detail: {language: next}}));
  }

  window.EyeeI18n = {
    get language() { return language; },
    translateClientNote(name) { return language === 'en' ? clientNotes[name] : null; },
  };

  buttons.forEach(button => button.addEventListener('click', () => {
    const next = button.dataset.language;
    if (next === language) return;
    try { localStorage.setItem(preferenceKey, next); } catch { /* Choice still applies to this visit. */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    history.pushState({...history.state, language: next}, '', url);
    applyLanguage(next);
    const dialog = button.closest('dialog');
    if (dialog?.id === 'menu') dialog.dispatchEvent(new Event('requestclose'));
    else dialog?.close();
  }));
  addEventListener('popstate', () => applyLanguage(queryLanguage() || stored || browserLanguage));
  applyLanguage(queryLanguage() || (stored === 'nl' || stored === 'en' ? stored : browserLanguage));
})();
