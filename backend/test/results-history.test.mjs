import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ResultsService } from '../dist/modules/results/results.service.js';

test('Résultats figés : distinguer un total absent du zéro conservé', async () => {
 const legacy={id:'legacy-fictif',identitySnapshot:{matricule:'FICTIF-ANCIEN'},subjectResults:[{subjectCode:'MATH',meanOn20:'0'}],overallMean:'12'};
 const current={id:'current-fictif',identitySnapshot:{totalEarned:'0',totalMaximum:'40',percentage:'0',rank:1},subjectResults:[{label:'Mathématiques',earned:'0',maximum:'40'}]};
 const before=JSON.stringify([legacy,current]);
 const service=new ResultsService({client:{classPeriod:{findUnique:async()=>({id:'period-fictive',closedAt:new Date(),publishedAt:null,schoolClass:{label:'Classe fictive'},period:{label:'P1'},results:[legacy,current]})}}});
 const {students}=await service.finalResults('period-fictive');
 assert.equal(students[0].totalEarned,null);
 assert.equal(students[0].totalMaximum,null);
 assert.deepEqual(students[0].subjectResults,legacy.subjectResults);
 assert.equal(students[1].totalEarned,'0');
 assert.equal(students[1].totalMaximum,'40');
 assert.equal(students[1].percentage,'0');
 assert.equal(JSON.stringify([legacy,current]),before);
});
