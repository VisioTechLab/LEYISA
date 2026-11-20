import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ResultsService } from '../dist/modules/results/results.service.js';

for (const operation of ['closeClassPeriod', 'publish']) {
 test(`Recette partagée : ${operation} refuse avant toute transaction`, async t => {
  const previous = {mode:process.env.LEYISA_DB_MODE, flag:process.env.LEYISA_ALLOW_UNVALIDATED_RESULTS};
  t.after(() => {
   for (const [key,value] of [['LEYISA_DB_MODE',previous.mode],['LEYISA_ALLOW_UNVALIDATED_RESULTS',previous.flag]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
   }
  });
  process.env.LEYISA_DB_MODE = 'shared';
  delete process.env.LEYISA_ALLOW_UNVALIDATED_RESULTS;
  let transactions = 0;
  const service = new ResultsService({client:{$transaction:async()=>{transactions++;}}});
  await assert.rejects(service[operation]('period','actor',{confirmed:true}), error => error.getStatus()===409);
  assert.equal(transactions,0);
  process.env.LEYISA_ALLOW_UNVALIDATED_RESULTS='false';
  await assert.rejects(service[operation]('period','actor',{confirmed:true}), error => error.getStatus()===409);
  assert.equal(transactions,0);
 });
}
