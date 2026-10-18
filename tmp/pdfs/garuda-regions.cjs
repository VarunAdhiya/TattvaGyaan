const fs=require('node:fs');
const d=require('../../library/editions/drafts/garuda-purana-hi.json');
const a=require('../../library/editions/drafts/garuda-purana-hi.audit.json');
const pp=new Map();
for(const s of d.sections) for(const p of s.passages) {const list=pp.get(p.sourcePage)||[];list.push(p);pp.set(p.sourcePage,list);}
let count=0;
for(const p of a.pages) {
 if(p.page<14 || p.page>635) continue;
 const lines=(pp.get(p.page)||[]).map(x=>x.text).join('\n').split('\n');
 for(let i=0;i<(p.regions||[]).length;i++) {
  const r=p.regions[i],next=p.regions[i+1];
  if(r.kind==='full-width' && (next?.kind==='left' || next?.kind==='left-column' || next?.kind==='column-left')) {
    if(!(i===0 && r.lineCount===2)) continue;
    console.log(p.page,r.firstLine,r.lineCount,JSON.stringify(lines.slice(r.firstLine-1,r.firstLine-1+r.lineCount).join('\n')));count++;
  }
 }
}
console.log('COUNT',count,'REGION KINDS', [...new Set(a.pages.flatMap(p=>p.regions||[]).map(r=>r.kind))]);
