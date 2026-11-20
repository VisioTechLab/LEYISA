import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
const p=JSON.parse(await readFile(new URL('../prisma/primary-grade-profile-v1.json',import.meta.url),'utf8'));
test('Primaire : grille provisoire, 24 branches distinctes et maxima cohérents',()=>{
 assert.equal(p.status,'DEMO_PROPOSE');
 assert.equal(p.subjects.length,24);
 assert.equal(new Set(p.subjects.map(s=>s.code)).size,24);
 const periods=['P1','P2','P3','P4','P5','P6'], exams=['E1','E2','E3'];
 for(const s of p.subjects){assert.ok(s.maximum>0);assert.equal(Object.keys(s.componentMaxima).length,9);for(const k of periods)assert.equal(Number(s.componentMaxima[k]),s.maximum);for(const k of exams)assert.equal(Number(s.componentMaxima[k]),2*s.maximum);}
 const sum=k=>p.subjects.reduce((a,s)=>a+Number(s.componentMaxima[k]),0);
 for(const k of periods)assert.equal(sum(k),300);for(const k of exams)assert.equal(sum(k),600);
 assert.equal([...periods,...exams].reduce((a,k)=>a+sum(k),0),3600);
 const groups=Object.fromEntries([...new Set(p.subjects.map(s=>s.groupCode))].map(g=>[g,p.subjects.filter(s=>s.groupCode===g).reduce((a,s)=>a+s.maximum,0)]));
 assert.deepEqual(groups,{FORMATION_PERSONNELLE:30,LANGUE_NATIONALE:20,FRANCAIS:70,MATHEMATIQUES:70,EVEIL_SCIENTIFIQUE:60,EVEIL_ARTISTIQUE:50});
});
