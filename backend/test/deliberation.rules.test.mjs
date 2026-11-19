import assert from 'node:assert/strict';
import {test} from 'node:test';
import {proposeDecision,sourceTolerance} from '../dist/modules/results/deliberation.js';
test('les seuils 47/48/49/50/55 sont des paramètres DEMO, les cas ambigus restent à vérifier',()=>{
 for(const threshold of ['50','55'])for(const points of ['47','48','49','50','55']){
  const proposal=proposeDecision([{earned:points,maximum:'100'}],{admissionThreshold:threshold,failureThreshold:'50'});
  assert.equal(proposal.outcome,Number(points)>=Number(threshold)?'ADMIS':'A_VERIFIER');
 }
 assert.equal(proposeDecision([{earned:'65',maximum:'100'},{earned:'40',maximum:'100'}],{admissionThreshold:'50',failureThreshold:'50'}).outcome,'A_VERIFIER');
});
test('zéro n’est pas une note manquante ; les dispenses explicites sont exclues',()=>{
 const profile={admissionThreshold:'50',failureThreshold:'50'};
 assert.equal(proposeDecision([{earned:null,maximum:'20'}],profile).percentage,null);
 assert.equal(proposeDecision([{earned:'0',maximum:'20'}],profile).percentage,'0');
 assert.equal(proposeDecision([{earned:'15',maximum:'20'},{earned:null,maximum:'20',nonApplicable:true}],profile).percentage,'75');
});
test('péréquation : exception 80 vers 5 conservée sans transfert automatique ni extrapolation',()=>{
 assert.deepEqual(sourceTolerance('80'),{value:'5',status:'REFERENCE_A_VERIFIER',exception:true,automaticTransfer:false});
 assert.equal(sourceTolerance('480').value,'24');assert.equal(sourceTolerance('100').value,null);
});
