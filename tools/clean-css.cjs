/* Conservative mechanical cleanup: preserve cascade order and all fallbacks.
 * Never merge nonadjacent rules or move declarations past other selectors.
 * Functional selectors are deliberately excluded from unused-class pruning.
 */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const sources=['index.html','script.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const stats={unusedSelectorBranches:0,duplicateDeclarations:0,emptyRules:0};
function boundary(text,start,stops){
 let quote='',comment=false,depth=0;
 for(let i=start;i<text.length;i++){
  const c=text[i],n=text[i+1];
  if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
  if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
  if(c==='/'&&n==='*'){comment=true;i++;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='('||c==='[')depth++;
  if(c===')'||c===']')depth--;
  if(depth===0&&stops.includes(c))return i;
 }
 return text.length;
}
function split(text,separator){
 const parts=[];let start=0;
 while(start<text.length){const end=boundary(text,start,[separator]);parts.push(text.slice(start,end));start=end+1;}
 return parts;
}
function parse(text){
 const nodes=[];let i=0;
 while(i<text.length){
  const start=i;
  while(/\s/.test(text[i]||'')&&i<text.length)i++;
  if(i>=text.length)break;
  if(text.slice(i,i+2)==='/*'){
   const end=text.indexOf('*/',i+2);if(end<0)throw Error('Unclosed comment');
   nodes.push({comment:text.slice(i,end+2)});i=end+2;continue;
  }
  const end=boundary(text,i,['{',';']);
  if(end===text.length)throw Error(`Unexpected CSS at ${start}`);
  const header=text.slice(i,end).trim();
  if(text[end]===';'){nodes.push({statement:header+';'});i=end+1;continue;}
  let cursor=end+1,level=1;
  while(level){
   const next=boundary(text,cursor,['{','}']);
   if(next===text.length)throw Error('Unclosed block');
   level+=text[next]==='{'?1:-1;cursor=next+1;
  }
  const body=text.slice(end+1,cursor-1);
  const container=/^@(media|supports|layer|container|(?:-webkit-)?keyframes)\b/.test(header);
  nodes.push({header,children:container?parse(body):null,body:container?null:body});
  i=cursor;
 }
 return nodes;
}
const ast=parse(css);
const seen=new Set();
function clean(nodes,context=[]){
 for(let i=nodes.length-1;i>=0;i--){
  const node=nodes[i];
  if(node.children){clean(node.children,[...context,node.header]);continue;}
  if(node.body==null)continue;
  const isStyle=!node.header.startsWith('@')&&!context.some(c=>/keyframes/.test(c));
  if(isStyle){
   const selectors=split(node.header,',').map(s=>s.trim());
   node.header=selectors.filter(selector=>{
    if(/:(not|has|is|where)\(/.test(selector))return true;
    const unquoted=selector.replace(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g,'');
    const classes=[...unquoted.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(m=>m[1]);
    const unused=classes.some(c=>!sources.includes(c));
    if(unused)stats.unusedSelectorBranches++;
    return !unused;
   }).join(',\n');
   if(!node.header){node.removed=true;stats.emptyRules++;continue;}
  }
  const declarations=split(node.body,';').map(s=>s.trim()).filter(Boolean);
  const keep=[];
  for(let j=declarations.length-1;j>=0;j--){
   const declaration=declarations[j];
   // Comments and at-rules are retained verbatim; don't infer their meaning.
   if(declaration.includes('/*')){keep.unshift(declaration);continue;}
   const colon=boundary(declaration,0,[':']);
   const property=declaration.slice(0,colon).trim(),value=declaration.slice(colon+1).trim();
   const key=JSON.stringify([context,node.header,property,value]);
   if(isStyle&&seen.has(key)){stats.duplicateDeclarations++;continue;}
   if(isStyle)seen.add(key);
   keep.unshift(declaration);
  }
  node.body=keep;
  if(!keep.length){node.removed=true;stats.emptyRules++;}
 }
}
clean(ast);
function render(nodes,level=0){
 const indent='  '.repeat(level);
 return nodes.filter(n=>!n.removed).map(n=>{
  if(n.comment)return indent+n.comment;
  if(n.statement)return indent+n.statement;
  if(n.children){const body=render(n.children,level+1);return body?`${indent}${n.header} {\n${body}\n${indent}}`:'';}
  return `${indent}${n.header.replace(/\n/g,'\n'+indent)} {\n${n.body.map(d=>indent+'  '+d+';').join('\n')}\n${indent}}`;
 }).filter(Boolean).join('\n\n');
}
const output=render(ast)+'\n';
const destination=process.argv.includes('--write')?path.join(root,'style.css'):path.join(root,'.refactor-reference','2026-10-15','style.proposed.css');
fs.writeFileSync(destination,output);
console.log(JSON.stringify({...stats,beforeBytes:Buffer.byteLength(css),afterBytes:Buffer.byteLength(output),destination},null,2));
