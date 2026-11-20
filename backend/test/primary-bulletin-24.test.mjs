import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Decimal } from '@prisma/client/runtime/client';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { prepareBulletin } from '../dist/modules/bulletins/bulletin-data.js';
import { renderPrimary, primaryAnnualCells } from '../dist/modules/bulletins/primary-bulletin.js';
import { renderPrimary as renderArchived } from '../dist/modules/bulletins/primary-bulletin-v16.js';

const profile=JSON.parse(await readFile(new URL('../prisma/primary-grade-profile-v1.json',import.meta.url),'utf8'));
const ratios=[0,50,60,70,80,100,67,75,95,45,82,55,65,90,40,85,72,68,98,56,63,79,88,92];
const labels=['Insuffisant','Passable','Assez bien','Bien','Très bien','Très bien','Assez bien','Bien','Très bien','Insuffisant','Très bien','Passable','Assez bien','Très bien','Insuffisant','Très bien','Bien','Assez bien','Très bien','Passable','Assez bien','Bien','Très bien','Très bien'];
const cutoff=new Date('2026-07-02T12:30:00Z');
const identity={firstName:'Élève de recette',lastName:'Synthétique',school:{name:'LEYISA — recette privée',province:'Kinshasa',city:'Kinshasa'},classLabel:'6e Primaire B',yearCode:'2025-2026',cycle:'PRIMAIRE',level:'6e primaire',programVersion:'PRIMAIRE-6-RECETTE-V1',sex:'F',rank:1,effectif:1};
const make=(code,kind,subjects,children=[])=>{
 const total=key=>subjects.reduce((sum,s)=>sum.add(s[key]??0),new Decimal(0));
 return {id:'result-'+code,classPeriodId:'cp-'+code,identitySnapshot:{...identity,periodCode:code,periodLabel:code,kind,totalEarned:total('earned').toString(),totalMaximum:total('maximum').toString(),percentage:total('earned').div(total('maximum')).mul(100).toDecimalPlaces(2).toString()},subjectResults:subjects,classPeriod:{publishedAt:cutoff,period:{code,kind}},sourceVersions:children.map(c=>({snapshotId:c.id,classPeriodId:c.classPeriodId,code:c.classPeriod.period.code})),decisions:kind==='ANNUEL'?[{id:'d',outcome:'ADMIS',reason:'Décision fictive de recette',courses:[]}]:[]};
};
const leaf=code=>make(code,code.startsWith('E')?'EXAMEN':'PERIODE',profile.subjects.map((s,i)=>({subjectId:s.code,label:s.label,subjectCode:s.code,maximum:s.componentMaxima[code],earned:new Decimal(s.componentMaxima[code]).mul(ratios[i]).div(100).toString()})));
const aggregate=(code,kind,children)=>make(code,kind,profile.subjects.map((s,i)=>{
 const parts=children.map(c=>c.subjectResults[i]);const total=key=>parts.reduce((a,p)=>a.add(p[key]),new Decimal(0)).toString();
 return {subjectId:s.code,label:s.label,subjectCode:s.code,earned:total('earned'),maximum:total('maximum'),components:Object.fromEntries(children.map((c,j)=>[c.classPeriod.period.code,parts[j]]))};
}),children);
test('Total /100 et mention : bornes, zéro, précision, N/A, absence, publication',()=>{
 const s=(earned,maximum)=>({subjectId:'A',label:'A',earned,maximum});
 for(const [v,l] of [[0,'Insuffisant'],[49,'Insuffisant'],[50,'Passable'],[60,'Assez bien'],[70,'Bien'],[80,'Très bien'],[100,'Très bien']])assert.deepEqual(primaryAnnualCells(s(String(v),'100'),true,true),[String(v),l]);
 assert.deepEqual(primaryAnnualCells(s('2','3'),true,true),['66,67','Assez bien']);
 for(const row of [s(null,'20'),s('0','0'),s('21','20'),s('-1','20'),s('NaN','20')])assert.deepEqual(primaryAnnualCells(row,true,true),['','']);
 assert.deepEqual(primaryAnnualCells({...s(null,'0'),nonApplicable:true},true,true),['N/A','']);
 assert.deepEqual(primaryAnnualCells(s('10','20'),false,true),['','']);
 assert.deepEqual(primaryAnnualCells(s('10','20'),true,false),['','']);
});
test('24 matières, trois trimestres, 3600 points : PDF primaire A4 paginé et déterministe',async()=>{
 const components=['P1','P2','E1','P3','P4','E2','P5','P6','E3'].map(leaf);
 const terms=[1,2,3].map((n,i)=>aggregate('T'+n,'TRIMESTRE',components.slice(i*3,i*3+3)));
 const annual=aggregate('ANNEE','ANNUEL',terms);
 const snapshots=[...components,...terms,annual];
 const view=prepareBulletin(annual,snapshots,cutoff);
 assert.equal(view.releaseVisible,true);assert.equal(annual.identitySnapshot.totalMaximum,'3600');
 for(let i=0;i<24;i++)assert.deepEqual(primaryAnnualCells(view.baseSubjects[i],true,true),[String(ratios[i]),labels[i]]);
 const pdf=await renderPrimary(view),parsed=await PDFDocument.load(pdf);
 assert.equal(parsed.getPageCount(),2);
 for(const p of parsed.getPages())assert.deepEqual([p.getWidth(),p.getHeight()],PageSizes.A4);
 assert.deepEqual(await renderPrimary(view),pdf);
 assert.notDeepEqual(await renderArchived(view),pdf);
 const withheld=prepareBulletin(annual,snapshots.map(s=>s.id==='result-P6'?{...s,classPeriod:{...s.classPeriod,publishedAt:null}}:s),cutoff);
 assert.equal(withheld.releaseVisible,false);
 assert.ok(withheld.slimSubjects.every(s=>s.earned===null&&s.maximum===null));
 if(process.env.LEYISA_V1_PROOFS){
  const out=process.env.LEYISA_V1_PROOFS;await mkdir(out,{recursive:true});
  await writeFile(out+'/primaire-24-matieres.pdf',pdf);
  await writeFile(out+'/primaire-24-matieres.json',JSON.stringify({identity:annual.identitySnapshot,subjects:annual.subjectResults,ratios,labels}));
  await writeFile(out+'/AVANT-primaire-24-matieres.pdf',await renderArchived(view));
  await writeFile(out+'/primaire-24-non-publie.pdf',await renderPrimary(withheld));
 }
});
