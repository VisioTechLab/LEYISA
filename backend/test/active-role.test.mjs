import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SessionGuard} from '../dist/modules/auth/session.guard.js';
import {permissionsByRole,permissionsFor} from '../dist/modules/auth/permissions.js';
const assigned={userId:'synthetic',roles:['ENS','DIR'],sessionId:'synthetic-session'};
function fixture(role){const request={headers:{cookie:'leyisa_session=opaque-local-test',...(role===undefined?{}:{'x-leyisa-role':role})}};return{request,context:{switchToHttp:()=>({getRequest:()=>request})},guard:new SessionGuard({resolveSession:async()=>assigned})};}
test('le rôle actif ENS réduit le contexte sans modifier les rôles attribués',async()=>{const f=fixture('ENS');await f.guard.canActivate(f.context);assert.deepEqual(f.request.auth.roles,['ENS']);assert.deepEqual(assigned.roles,['ENS','DIR']);});
test('un rôle non attribué ou mal formé est refusé',async()=>{for(const role of ['ADM','SEC','',['ENS','DIR']]){const f=fixture(role);await assert.rejects(f.guard.canActivate(f.context),/ne vous est pas attribué/);assert.equal(f.request.auth,undefined);}});
test('les clients historiques conservent la matrice existante sans en-tête',async()=>{const f=fixture();await f.guard.canActivate(f.context);assert.deepEqual(f.request.auth.roles,['ENS','DIR']);});
test('les permissions par rôle dérivent exclusivement de la matrice approuvée',()=>{const permissions=permissionsByRole(['ENS','DIR']);assert.deepEqual(Object.keys(permissions),['ENS','DIR']);assert.deepEqual(permissions.ENS,permissionsFor(['ENS']));assert.ok(!permissions.ENS.includes('submissions.decide'));assert.ok(permissions.DIR.includes('submissions.decide'));});

test('la pagination élèves compte le même périmètre ABAC que les lignes',async()=>{
 const {StudentsService}=await import('../dist/modules/students/students.service.js');let listArgs,countArgs;
 const service=new StudentsService({client:{student:{findMany:async args=>{listArgs=args;return[];},count:async args=>{countArgs=args;return 61;}}}});
 const role={userId:'00000000-0000-4000-8000-000000000001',roles:['ENS']};
 const result=await service.listPage(role,{page:'2',search:'Nom Test'});assert.equal(result.total,61);assert.equal(result.page,2);assert.equal(listArgs.skip,50);assert.deepEqual(listArgs.where,countArgs.where);assert.ok(listArgs.where.enrollments.some);
});
test('la deuxième page de bulletins conserve publication, recherche et propriété',async()=>{
 const {BulletinsController}=await import('../dist/modules/bulletins/bulletins.module.js');let args;
 const controller=new BulletinsController({client:{resultSnapshot:{findMany:async input=>{args=input;return[];}}}});
 await controller.list({userId:'synthetic-student',roles:['ELEVE']},'Test','2');assert.equal(args.skip,500);assert.equal(args.take,500);assert.equal(args.where.enrollment.student.userId,'synthetic-student');assert.deepEqual(args.where.classPeriod.publishedAt,{not:null});assert.equal(args.where.AND.length,1);
});
