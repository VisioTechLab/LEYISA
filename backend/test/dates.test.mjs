import assert from 'node:assert/strict';
import {test} from 'node:test';
import {day,todayCivil} from '../dist/common/input.js';
test('les dates civiles utilisent Kinshasa, y compris avant minuit UTC',()=>{
 assert.equal(todayCivil(new Date('2026-11-18T23:30:00Z')),'2026-11-19');
 assert.equal(todayCivil(new Date('2026-11-19T22:59:59Z')),'2026-11-19');
 assert.equal(day('2026-11-19').toISOString(),'2026-11-19T00:00:00.000Z');
 assert.throws(()=>day('2026-02-31'));
});
