// Contrat d'intégration : l'ancien nom de Franck réutilise maintenant la session de Sidonie.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {UnauthorizedException} from '@nestjs/common';
import {StudentsSessionGuard} from '../dist/modules/students/students-session.guard.js';
import {SessionGuard} from '../dist/modules/auth/session.guard.js';
test('le module élèves utilise la même garde cookie',()=>assert.equal(StudentsSessionGuard,SessionGuard));
test('aucun Bearer ne remplace le cookie',async()=>{
 const guard=new StudentsSessionGuard({resolveSession:async()=>{throw new Error('ne doit pas être appelé');}});
 await assert.rejects(()=>guard.canActivate({switchToHttp:()=>({getRequest:()=>({headers:{authorization:'Bearer '+ 'A'.repeat(48)}})})}),UnauthorizedException);
});
test('le contexte vérifié provient de la session commune',async()=>{
 const auth={userId:'sec',roles:['SEC']};const request={headers:{cookie:'leyisa_session='+ 'A'.repeat(48)}};
 const guard=new StudentsSessionGuard({resolveSession:async()=>auth});assert.equal(await guard.canActivate({switchToHttp:()=>({getRequest:()=>request})}),true);assert.equal(request.auth,auth);
});
test('une session révoquée est refusée',async()=>{
 const guard=new StudentsSessionGuard({resolveSession:async()=>null});await assert.rejects(()=>guard.canActivate({switchToHttp:()=>({getRequest:()=>({headers:{cookie:'leyisa_session='+ 'A'.repeat(48)}})})}),UnauthorizedException);
});
