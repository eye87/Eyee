# EYE — Frontpage concept

## Onderhoud van HTML en CSS

De actieve HTML en CSS zijn geformatteerd. Merkkleuren, terugkerende radii, overgangsduren en de basisafstand tussen secties staan als ontwerpwaarden in `:root`. Navigatie, hero en referenties hebben elk één herkenbaar blok in `style.css`, inclusief de bijbehorende mediaqueries. De navigatiebalk, hero-container en hero-titel hebben elk één basisdefinitie met expliciete schermvarianten. De voorrang van concurrerende stijlen is behouden.

De oorspronkelijke SVG's blijven inline, inclusief de pijlen en het geanimeerde logo. Ongebruikte selectors en declaraties die altijd door dezelfde selector onder dezelfde voorwaarden worden overschreven zijn verwijderd. Classes die door JavaScript worden toegevoegd blijven behouden. Herhaalde regels zijn alleen samengevoegd wanneer tussenliggende regels de voorrang niet veranderen.

Cases gebruiken de bestaande achtergrondfoto met kleurlaag; de vier niet meer zichtbare schaduw-elementen en de oude pseudo-elementlaag zijn verwijderd. De semantische afbeeldingen en hun alt-teksten blijven aanwezig. WebP-afbeeldingen hebben expliciete bronafmetingen.

De opschoning is vergeleken met de vorige versie op 390, 650, 768, 900, 1024 en 1440 pixels breed. Ook het mobiele menu, sluiten met Escape, compacte navigatie, scrollsecties, referentiewisseling en het uitklappen van lange citaten zijn gecontroleerd. De Backup-mappen vallen buiten het onderhoud van de actieve site.

Het menu is ook met Tab en Escape gecontroleerd; na sluiten keert de focus terug naar de menuknop. De focusring op de lichte navigatie en in het menu gebruikt donkerblauw voor voldoende contrast. De afbeeldingen en console zijn lokaal gecontroleerd; dit is geen volledige toegankelijkheidsaudit of representatieve meting van de snelheid van de live website.

Open `index.html` in je browser. Er is geen installatie nodig. Houd `index.html`, `style.css`, `script.js` en de map `assets` bij elkaar. De beelden en video zijn lokaal opgenomen, dus de presentatie werkt ook zonder internet. Externe project-, team- en contactlinks verwijzen naar de bestaande website of openen je mail-/telefoonprogramma.

## Ontwerprichting

Een opening in het bestaande EYE-paars (#3e006f), met grote, organische vormen die langzaam bewegen. Gecombineerd met lichte vlakken, een donkere AI-sectie en frisgroene accenten. De grote titels gebruiken GT Walsheim Pro Medium, zoals de Concept7-hoofdtitel. Kleinere koppen blijven Futura Bold; lopende tekst blijft Avenir. De lettertypen zijn lokaal opgenomen. Grote typografie en ruimte geven het verhaal ritme.

De flow: mensgerichte belofte → de juiste vraag → bewijs met bestaand werk → begrijpen, verbeelden, waarmaken en verbeteren → AI onder menselijke regie → klantervaring → team → UX-scan → contact.

De bestaande brede dienstenlijst is teruggebracht tot research, UX/UI design en development. Projecten, teamleden, contactgegevens, de UX-scan en een kort citaat komen van de huidige website. De positionerings-, research- en AI-teksten zijn nieuwe conceptcopy op basis van jullie briefing; stem de precieze beloftes vóór publicatie intern af. De bestaande belofte van een gratis scan binnen 48 uur is behouden.

## Interactie

- Het hoofdmenu zweeft in een lage, witte, afgeronde balk boven de pagina. Op brede schermen staan alle items direct in de balk; onder 900 px blijft de menuknop beschikbaar. Tijdens scrollen wordt de balk smaller en lager; bovenaan wordt hij weer ruim.

- De eigen projectvideo groeit van een centraal venster naar de volle breedte tijdens scrollen.
- De video speelt zonder geluid; afspelen en pauzeren kan met de knop.
- Het grote menu werkt met muis, toetsenbord en touch; Escape sluit het menu.
- Werkwijze en veelgestelde vragen klappen open.
- De pagina past zich aan mobiel aan. Bij een voorkeur voor minder beweging wordt automatische videoweergave en scrollanimatie uitgeschakeld.

## Bronnen en referenties

- Bestaande teksten, video, logo, team- en projectbeelden: https://eye-entertainment.nl/
- Projecten: https://eye-entertainment.nl/projecten/bedrijfsapplicaties/maas-mfp/ ; https://eye-entertainment.nl/projecten/websites/diabetesvereniging-nederand/ ; https://eye-entertainment.nl/projecten/websites/cmo-stamm/
- Referenties uit de briefing: https://www.b2design.nl/ ; https://concept7.nl/ ; https://afternow.co/

Het is een zelfstandige HTML-ontwerpopzet; er is niets gewijzigd aan de live website. De referenties zijn richtinggevend, hun code of beelden zijn niet overgenomen. Alle opgenomen media komen van EYE.

## Controle

Gecontroleerd in de browser op desktop en op 390 px breed: menu openen/sluiten, video laden en pauzeren, scrollvergroting, geen horizontale overflow. Lokale bestandspaden en interne ankers zijn gecontroleerd. Geen volledige toegankelijkheidsaudit of controle van alle externe bestemmingen uitgevoerd.

## Eyee en portretfotografie

De merknaam is Eyee. Het hoofdmenu bevat Home, Expertises, Projecten, Blogs, Over ons en Contact. De header toont afwisselend de vier door jullie aangeleverde voorbeeldfoto’s van mensen in het dagelijks leven. Vervang de `portrait-slide` afbeeldingen in index.html voor andere fotografie; de uitsnede is per afbeelding ingesteld met object-position. De wisseling stopt bij een voorkeur voor minder beweging.
