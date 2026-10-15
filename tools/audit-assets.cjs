/* Inventory references in the active homepage only, never in Backup folders. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const assets=path.join(root,'assets');
const used=new Map();
const missing=new Set();
function scan(file){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of text.matchAll(/assets\/([^\s"'<>?#)]+)/g)){
  const asset=decodeURIComponent(match[1]);
  if(!fs.existsSync(path.join(assets,asset))){missing.add(asset);continue;}
  if(!used.has(asset))used.set(asset,new Set());
  used.get(asset).add(file);
 }
}
for(const file of ['index.html','style.css','script.js'])scan(file);
// Include dependencies embedded by referenced SVG/CSS files.
for(const asset of used.keys())if(/\.(svg|css)$/i.test(asset))scan('assets/'+asset);
const unused=fs.readdirSync(assets).filter(file=>fs.statSync(path.join(assets,file)).isFile()&&!used.has(file)).map(file=>({file,bytes:fs.statSync(path.join(assets,file)).size})).sort((a,b)=>b.bytes-a.bytes);
const mb=bytes=>(bytes/1024/1024).toFixed(2)+' MiB';
const report=[
 '# Assetinventaris homepage — 15 oktober 2026',
 '',
 'Alleen actieve index.html, style.css en script.js zijn doorzocht, inclusief letterlijk vermelde JavaScript-paden en verwijzingen vanuit gebruikte SVG/CSS-assets. Backup-mappen zijn niet meegenomen en blijven onaangeroerd.',
 '',
 `- Bestanden zonder verwijzing: ${unused.length} (${mb(unused.reduce((sum,a)=>sum+a.bytes,0))}).`,
 `- Bestanden met verwijzing: ${used.size}.`,
 `- Ontbrekende verwijzingen: ${missing.size}.`,
 '',
 '**Er is niets verwijderd.** Zonder verwijzing betekent kandidaat voor opruimen, niet bewezen waardeloos: bestanden kunnen voor andere pagina’s, handmatige exports of toekomstige publicatie bedoeld zijn. Ook verborgen HTML en ongebruikte CSS-verwijzingen tellen conservatief als gebruikt.',
 '',
 '## Kandidaten zonder verwijzing',
 '',
 '| Bestand | Omvang |',
 '| --- | ---: |',
 ...unused.map(a=>`| ${a.file} | ${mb(a.bytes)} |`),
 '',
 '## Gebruikte bestanden en vindplaatsen',
 '',
 ...[...used].sort(([a],[b])=>a.localeCompare(b)).map(([file,sources])=>`- ${file} — ${[...sources].join(', ')}`),
 '',
 '## Ontbrekende bestanden',
 '',
 ...(missing.size?[...missing].map(file=>'- '+file):['Geen.']),
 '',
];
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
fs.writeFileSync(path.join(root,'reports','asset-audit.md'),report.join('\n'));
console.log(JSON.stringify({unused:unused.length,unusedBytes:unused.reduce((sum,a)=>sum+a.bytes,0),referenced:used.size,missing:[...missing]},null,2));
