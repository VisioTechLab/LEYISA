import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {requireLocalFixtures} from '../prisma/env.mjs';
import {createClient} from '../prisma/client.mjs';
const catalog=JSON.parse(await readFile(new URL('../prisma/rdc-catalogue-recette-v1.json',import.meta.url),'utf8'));
test('Calendrier secondaire : composants exhaustifs, périodes disjointes, parents cohérents',()=>{
 const rows=catalog.secondaryCalendar;
 assert.equal(rows.length,10);
 assert.equal(new Set(rows.map(r=>r.code)).size,10);
 assert.deepEqual(rows.filter(r=>r.kind==='PERIODE').map(r=>r.code).sort(),['P1','P2','P3','P4']);
 const byCode=new Map(rows.map(r=>[r.code,r]));
 for(const r of rows){assert.ok(r.starts<=r.ends);if(r.parent){const parent=byCode.get(r.parent);assert.ok(parent);assert.ok(parent.starts<=r.starts&&r.ends<=parent.ends);}}
 const periods=rows.filter(r=>r.kind==='PERIODE').sort((a,b)=>a.starts.localeCompare(b.starts));
 for(let i=1;i<periods.length;i++)assert.ok(periods[i-1].ends<periods[i].starts);
 assert.equal(byCode.get('P1').parent,'S1');
 assert.equal(byCode.get('P2').parent,'S1');
 assert.equal(byCode.get('P3').parent,'S2');
 assert.equal(byCode.get('P4').parent,'S2');
});
const skip=process.env.LEYISA_V1_TESTS!=='1';
test('Le runtime ne peut pas convertir ou créer une période historique',{skip},async()=>{
 requireLocalFixtures();const db=createClient();
 try{
  const p=await db.period.findFirstOrThrow({where:{profile:'SECONDAIRE_TECHNIQUE',kind:'PERIODE'}});
  await assert.rejects(db.period.update({where:{id:p.id},data:{profile:'HISTORIQUE'}}),/historical period/i);
  await assert.rejects(db.period.create({data:{schoolYearId:p.schoolYearId,profile:'HISTORIQUE',code:'HIST-A',label:'Test interdit',kind:'PERIODE',position:999,startsOn:p.startsOn,endsOn:p.endsOn}}),/historical period/i);
  assert.equal((await db.period.findUniqueOrThrow({where:{id:p.id}})).profile,'SECONDAIRE_TECHNIQUE');
 }finally{await db.$disconnect();}
});
