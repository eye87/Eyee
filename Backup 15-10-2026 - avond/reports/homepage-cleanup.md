# Homepage: opschoning en controle (15 oktober 2026)

## Vastgelegde referentie

De goedgekeurde `index.html`, `style.css` en `script.js` staan in `.refactor-reference/2026-10-15/source/`. De map `baseline/` bevat volledige pagina-afbeeldingen en metingen op 320, 390, 430, 650, 768, 820, 900, 1024, 1100, 1280, 1440, 1680, 1920 en 2560 px breed. Deze referentie is bewust uitgesloten van Git. De bestaande Backup-mappen zijn niet gewijzigd.

Tijdens deze opschoning zijn de videobronnen in de actieve pagina afzonderlijk van versie 3 naar versie 4 gewijzigd. Die wijziging is behouden en valt niet onder de CSS-opschoning. De vastgelegde bronbestanden verwijzen nog naar versie 3; de gebruikte oudere video-assets zijn niet aangepast.

## Wijzigingen

- In `style.css` zijn 91 selectorvarianten zonder actieve class-verwijzing, 16 identieke dubbele declaraties en 86 daardoor lege regels verwijderd. De volgorde van de overgebleven regels is behouden. De CSS is van 145.704 naar 139.392 bytes gegaan (6.312 bytes minder).
- In `index.html` staat de footer nu buiten het `<main>`-element, zodat de hoofdinhoud en het contactgedeelte aparte paginaonderdelen zijn. De zichtbare inhoud, classes en volgorde zijn gelijk gebleven.
- De lokale controle staat in `tools/home-regression.cjs`; de assetinventaris in `tools/audit-assets.cjs` en `reports/asset-audit.md`.

## Controle

De posities, afmetingen en berekende zichtbare stijlen van alle elementen zijn op de veertien breedtes gelijk aan de referentie. Het `<main>`-element zelf is uitgezonderd van de afmetingsvergelijking vanwege de bedoelde semantische verplaatsing van de footer; de footer en alle elementen erin zijn wel vergeleken. Er is geen horizontale pagina-overloop gevonden.

Daarnaast zijn het openen en sluiten van het menu met Escape en focusherstel, de FAQ, horizontaal schuiven van cases en team, de hoverlift van cases, de hover- en focustoelichting bij logo’s, een reviewnavigatieactie, de mobiele footer en de bediening van afspelen/pauzeren gecontroleerd. De media-afspeelactie is met een gesimuleerde videostatus getest, omdat de lokale testbrowser de video niet steeds werkelijk afspeelt.

De volledige screenshots zijn bewaard. Een strikte pixelvergelijking wisselt ook tussen twee opnamen van exact dezelfde referentiebron, vooral bij video. Daarom is de stabiele vergelijking van elementposities en berekende stijlen de doorslaggevende visuele controle; de pixelverschillen zijn alleen diagnostisch.

De definitieve Safari-controle op een echte iPhone en iPad blijft nodig, vooral voor videoweergave en beweging. Er is niets gepubliceerd of gepusht.

## Assets

De huidige homepage verwijst naar 86 assetbestanden. In `reports/asset-audit.md` staan 36 bestanden zonder verwijzing (87,65 MiB), grotendeels eerdere videoversies. Er is niets verwijderd. Een bestand zonder verwijzing vanuit de homepage kan nog voor ander werk nodig zijn; beoordeel de lijst voordat iets wordt opgeruimd.
