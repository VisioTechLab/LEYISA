import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { day, todayCivil } from '../dist/common/input.js';
import { createClient } from '../prisma/client.mjs';
import { requireLocalFixtures } from '../prisma/env.mjs';

const skip=process.env.LEYISA_V1_TESTS!=='1'?'LEYISA_V1_TESTS=1 et seed local requis':false;
let app,db,base,credentials,sec,dir,adm,teacher;
const proofDir=process.env.LEYISA_V1_PROOFS??'/tmp/leyisa-v1-proofs';
const suffix=randomUUID().slice(0,8);
class Browser {
 cookies=new Map();csrf='';
 async request(path,method='GET',data,extra={}) {
  const response=await fetch(`${base}${path}`,{method,headers:{Origin:'http://127.0.0.1:5173',Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(data!==undefined?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-Token':this.csrf}:{}),...extra},body:data===undefined?undefined:JSON.stringify(data)});
  for(const cookie of response.headers.getSetCookie()){const [pair]=cookie.split(';');const at=pair.indexOf('=');this.cookies.set(pair.slice(0,at),pair.slice(at+1));}
  const bytes=new Uint8Array(await response.arrayBuffer());let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{body=null;}
  return {status:response.status,body,headers:response.headers,bytes};
 }
 async login(key) {
  const token=await this.request('/auth/csrf');assert.equal(token.status,200);this.csrf=token.body.csrfToken;
  const r=await this.request('/auth/login','POST',{login:credentials[key].login,password:credentials[key].password});
  assert.equal(r.status,200,`login ${key}: ${r.body?.message}`);return r;
 }
}
async function ok(browser,path,method='GET',body,status=200){const r=await browser.request(path,method,body);assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(r.body)}`);return r.body;}
before(async()=>{
 if(skip)return;requireLocalFixtures();db=createClient();
 credentials=JSON.parse(await readFile(process.env.LEYISA_DEMO_CREDENTIALS_FILE??'/tmp/leyisa-v1-credentials.json','utf8'));
 app=await NestFactory.create(AppModule,{logger:false,abortOnError:false});app.setGlobalPrefix('api/v1',{exclude:['health']});await app.listen(0,'127.0.0.1');base=`${await app.getUrl()}/api/v1`;
 [sec,dir,adm,teacher]=Array.from({length:4},()=>new Browser());
 await sec.login('sec');await dir.login('dir');await adm.login('adm');await teacher.login('ens-demo-sec-1');await mkdir(proofDir,{recursive:true});
});
after(async()=>{await app?.close();await db?.$disconnect();});

test('T01/T05/T06/T07 — cookie opaque, hash seul, profil, révocation réelle',{skip},async()=>{
 const browser=new Browser();const r=await browser.login('ens');
 const cookie=r.headers.getSetCookie().find(c=>c.startsWith('leyisa_session='));assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Path=\//);assert.equal(JSON.stringify(r.body).includes('passwordHash'),false);
 const token=browser.cookies.get('leyisa_session');const session=await db.session.findFirst({where:{userId:credentials.ens.id,revokedAt:null},orderBy:{createdAt:'desc'}});assert.notEqual(token,session.tokenHash);assert.match(session.tokenHash,/^[a-f0-9]{64}$/);
 assert.equal((await browser.request('/auth/me')).status,200);await ok(browser,'/auth/logout','POST',{},204);assert.equal((await browser.request('/auth/me')).status,401);
 const expired=new Browser();await expired.login('ens');const current=await db.session.findUnique({where:{tokenHash:createHash('sha256').update(expired.cookies.get('leyisa_session')).digest('hex')}});assert.ok(current.expiresAt-current.createdAt<=8*3600000);
 await db.session.update({where:{id:current.id},data:{createdAt:new Date(Date.now()-9*3600000),expiresAt:new Date(Date.now()-3600000)}});assert.equal((await expired.request('/auth/me')).status,401);
});
test('T08/T09/T10 — refus CSRF, privilèges verticaux et horizontaux',{skip},async()=>{
 assert.equal((await new Browser().request('/students')).status,401);
 assert.equal((await sec.request('/users')).status,403);
 assert.equal((await adm.request('/students')).status,403);
 assert.equal((await dir.request('/audit')).status,403);
 assert.equal((await sec.request(`/users/${credentials.ens.id}/roles`,'PUT',{roles:['ADM']})).status,403);
 assert.equal((await adm.request('/users','POST',{}, {'X-CSRF-Token':''})).status,403);
 assert.equal((await adm.request('/users','POST',{}, {Origin:'https://attacker.invalid'})).status,403);
 const roster=await ok(sec,'/students');const foreign=roster.find(s=>s.matricule.startsWith('DEMO-DEMO-PRI'));
 assert.ok(foreign);assert.equal((await teacher.request(`/students/${foreign.id}`)).status,404);
 assert.equal((await teacher.request(`/students?classId=${foreign.enrollments[0].classId}`)).body.length,0);
});
test('T10 — historique et filtres restent dans la classe de l’enseignant',{skip},async()=>{
 const today=day(todayCivil());
 const dateAt=offset=>new Date(today.getTime()+offset*86400000);
 const current=await db.schoolYear.create({data:{code:`ACTIVE-${suffix}`,startsOn:dateAt(-5),endsOn:dateAt(30)}});
 const past=await db.schoolYear.create({data:{code:`PAST-${suffix}`,startsOn:dateAt(-400),endsOn:dateAt(-20)}});
 const [currentClass,pastClass]=await Promise.all([current,past].map(year=>db.schoolClass.create({
  data:{schoolYearId:year.id,code:`SCOPE-${suffix}`,label:'Classe fictive contrôle du périmètre'},
 })));
 const staff=await db.teacher.findUniqueOrThrow({where:{userId:credentials['ens-demo-sec-1'].id}});
 const subject=await db.subject.create({data:{code:`SCOPE-${suffix}`,label:'Matière fictive'}});
 const course=await db.classSubject.create({data:{classId:currentClass.id,subjectId:subject.id}});
 await db.teacherAssignment.create({data:{classId:currentClass.id,classSubjectId:course.id,teacherId:staff.id,startsOn:dateAt(-2),endsOn:dateAt(15)}});
 const student=await ok(sec,'/students/records','POST',{matricule:`SCOPE-${suffix}`,firstName:'Fictive',lastName:'Élève'},201);
 for(const [year,schoolClass] of [[past,pastClass],[current,currentClass]]) {
  await ok(sec,`/students/${student.id}/enrollments`,'POST',{schoolYearId:year.id,classId:schoolClass.id},201);
 }

 const history=await ok(teacher,`/students/${student.id}`);
 assert.deepEqual(history.enrollments.map(row=>row.classId),[currentClass.id]);
 const filtered=await ok(teacher,`/students?search=SCOPE-${suffix}&schoolYearId=${past.id}&classId=${pastClass.id}`);
 assert.deepEqual(filtered,[]);
 const visible=await ok(teacher,`/students?search=SCOPE-${suffix}&classId=${currentClass.id}`);
 assert.equal(visible.length,1);
 assert.deepEqual(visible[0].enrollments.map(row=>row.classId),[currentClass.id]);
 const secretary=await ok(sec,`/students/${student.id}`);
 assert.equal(secretary.enrollments.length,2);
});

test('T08 — le chargement du jeton dans un autre onglet ne rend pas le premier inutilisable',{skip},async()=>{
 const browser=new Browser();await browser.login('ens');
 const before=browser.csrf;
 const reloaded=await browser.request('/auth/csrf');
 assert.equal(reloaded.body.csrfToken,before);
 assert.equal(reloaded.headers.getSetCookie().length,0);
 await ok(browser,'/auth/logout','POST',{},204);
});
test('T12 — rôles modifiés, sessions révoquées et audit persistant',{skip},async()=>{
 const password=randomUUID();
 const user=await ok(adm,'/users','POST',{login:`role-${suffix}@demo.test`,firstName:'Compte',lastName:'Fictif',initialPassword:password,roles:['ENS']},201);
 await ok(adm,`/users/${user.id}/status`,'PATCH',{enabled:true});
 credentials.revocation={id:user.id,login:user.login,password};const session=new Browser();await session.login('revocation');
 await ok(adm,`/users/${user.id}/roles`,'PUT',{roles:['SEC']});
 assert.equal((await session.request('/auth/me')).status,401);
 const audit=await db.auditEntry.findFirst({where:{targetId:user.id,action:'ROLE_CHANGED'}});assert.deepEqual(audit.details.previousRoles,['ENS']);assert.deepEqual(audit.details.newRoles,['SEC']);
 await session.login('revocation');await ok(adm,`/users/${user.id}/status`,'PATCH',{enabled:false});assert.equal((await session.request('/auth/me')).status,401);
 assert.equal(await db.auditEntry.count({where:{targetId:user.id,action:'ROLE_CHANGED'}}),1);
 assert.equal((await adm.request(`/users/${credentials.adm.id}/roles`,'PUT',{roles:['SEC']})).status,403);
});
test('ADM — initialisation profil enseignant existant, rotation et révocation',{skip},async()=>{
 const original=await db.user.create({data:{kind:'STAFF',firstName:'Enseignant',lastName:'Fictif sans accès',loginEnabled:false,roles:{create:{role:'ENS'}}}});
 const staff=await db.teacher.create({data:{userId:original.id}});
 const login=`credential-${suffix}@demo.test`,first=randomUUID(),next=randomUUID();
 const endpoint=`/users/${original.id}/credentials`;
 const payload={login,newPassword:first,adminPassword:credentials.adm.password};
 assert.equal((await sec.request(endpoint,'POST',payload)).status,403);
 assert.equal((await adm.request(endpoint,'POST',{...payload,adminPassword:randomUUID()})).status,403);
 assert.equal((await adm.request(endpoint,'POST',{...payload,newPassword:'short'})).status,400);
 assert.equal((await adm.request(endpoint,'POST',payload,{'X-CSRF-Token':''})).status,403);
 const created=await ok(adm,endpoint,'POST',payload);
 assert.equal(created.id,original.id);assert.equal(created.login,login);assert.equal(created.loginEnabled,false);
 assert.equal(JSON.stringify(created).includes('passwordHash'),false);
 assert.equal((await db.teacher.findUnique({where:{id:staff.id}})).userId,original.id);
 await ok(adm,`/users/${original.id}/status`,'PATCH',{enabled:true});
 credentials.temporaryStaff={id:original.id,login,password:first};
 const browser=new Browser();await browser.login('temporaryStaff');
 assert.equal((await browser.request('/auth/me')).status,200);
 assert.equal((await adm.request(endpoint,'POST',{...payload,login:login+'-other'})).status,400);
 assert.equal((await adm.request(`/users/${credentials.adm.id}/credentials`,'POST',{newPassword:next,adminPassword:credentials.adm.password})).status,403);
 const reset=await ok(adm,endpoint,'POST',{newPassword:next,adminPassword:credentials.adm.password});
 assert.equal(reset.loginEnabled,true);assert.equal(reset.id,original.id);
 assert.equal((await browser.request('/auth/me')).status,401);
 const anonymous=new Browser();const csrf=await anonymous.request('/auth/csrf');anonymous.csrf=csrf.body.csrfToken;
 assert.equal((await anonymous.request('/auth/login','POST',{login,password:first})).status,401);
 credentials.temporaryStaff.password=next;await browser.login('temporaryStaff');
 assert.equal((await browser.request('/auth/me')).status,200);
 const audit=await db.auditEntry.findMany({where:{targetId:original.id,action:{in:['USER_CREDENTIALS_INITIALIZED','PASSWORD_RESET']}}});
 assert.equal(audit.length,2);assert.ok(audit.every(a=>a.actorId===credentials.adm.id&&!JSON.stringify(a).includes(first)&&!JSON.stringify(a).includes(next)));
});
test('T15 — dossier séparé, réinscription concurrente et atomicité',{skip},async()=>{
 const roster=await ok(sec,'/students/registration-options');const year=roster.find(y=>y.code==='2026-2027');
 // Classe ouverte créée via la configuration scolaire réelle.
 const cls=await ok(adm,'/school/classes','POST',{schoolYearId:year.id,code:`TEST-${suffix}`,label:'Classe fictive concurrence',cycle:'PRIMAIRE',level:'3e primaire',programVersion:'DEMO-V1.1'},201);
 const student=await ok(sec,'/students/records','POST',{matricule:`TEST-${suffix}`,firstName:'Fictive',lastName:'Élève',postName:'Test',birthDate:'2014-01-02'},201);
 assert.ok((await ok(sec,'/students?search='+encodeURIComponent('Élève Test Fictive'))).some(row=>row.id===student.id));
 assert.deepEqual((await ok(sec,`/students?search=test-${suffix}`)).map(row=>row.id),[student.id]);
 const calls=await Promise.all([sec.request(`/students/${student.id}/enrollments`,'POST',{classId:cls.id,schoolYearId:year.id}),sec.request(`/students/${student.id}/enrollments`,'POST',{classId:cls.id,schoolYearId:year.id})]);
 assert.deepEqual(calls.map(r=>r.status).sort(),[201,409]);assert.equal(await db.enrollment.count({where:{studentId:student.id}}),1);
});

async function workflow(code,{publish=true,components=['P1'],unpublished=[]}={}) {
 const schoolClass=await db.schoolClass.findFirst({where:{code},include:{subjects:{include:{assignments:{include:{teacher:true}}}},classPeriods:{include:{period:true}}}});
 assert.ok(schoolClass);const produced=[];
 for(const component of components) {
  const cp=schoolClass.classPeriods.find(cp=>cp.period.code===component);assert.ok(cp);
  if(cp.publishedAt){produced.push(cp);continue;}
  if(!cp.closedAt) {
   if(!['TRIMESTRE','SEMESTRE','ANNUEL'].includes(cp.period.kind))for(const cs of schoolClass.subjects) {
    const assignment=cs.assignments[0],key=Object.keys(credentials).find(k=>credentials[k].id===assignment.teacher.userId);assert.ok(key);
    const browser=new Browser();await browser.login(key);
    const kind=code==='DEMO-MAT'?'APPRECIATION':cp.period.kind==='EXAMEN'?'EXAMEN':'TRAVAIL_JOURNALIER';
    let detail=(await ok(browser,'/evaluations')).find(e=>e.subject.code===`${code}-${String(cs.position).padStart(2,'0')}`&&e.period.code===component);
    if(!detail)detail=await ok(browser,'/evaluations','POST',{assignmentId:assignment.id,classPeriodId:cp.id,title:`Démo ${component}`,heldOn:cp.period.startsOn.toISOString().slice(0,10),kind,maxScore:'20'},201);
    detail=await ok(browser,`/evaluations/${detail.id}`);
    if(detail.state==='VALIDATED')continue;
    const grades=detail.grades.map((g,index)=>({enrollmentId:g.enrollmentId,score:kind==='APPRECIATION'?null:index===0?'0':index===1?'15':'15',...(kind==='APPRECIATION'?{appreciation:{QTE:'D1',QLT:'D2',COUL:'D3',observation:'Observation fictive'},status:'PRESENT'}:{})}));
    assert.equal((await browser.request(`/evaluations/${detail.id}/grades`,'PUT',{version:detail.version,grades:[{enrollmentId:grades[0].enrollmentId,score:'21'}]})).status,kind==='APPRECIATION'?400:400);
    detail=await ok(browser,`/evaluations/${detail.id}/grades`,'PUT',{version:detail.version,grades});
    const stale=await browser.request(`/evaluations/${detail.id}/grades`,'PUT',{version:detail.version-1,grades});assert.equal(stale.status,409);
    detail=await ok(browser,`/evaluations/${detail.id}/submission`,'POST',{version:detail.version},201);
    const pending=await db.submission.findFirst({where:{evaluationId:detail.id,status:'PENDING'}});
    assert.equal((await sec.request(`/results/submissions/${pending.id}/approve`,'POST',{})).status,403);
    if(kind==='APPRECIATION'){
     const inspection=await ok(dir,`/results/submissions/${pending.id}`);
     assert.equal(inspection.evaluation.kind,'APPRECIATION');
     for(const g of inspection.grades){assert.equal(g.score,null);assert.equal(g.status,'PRESENT');assert.deepEqual(g.appreciation,{QTE:'D1',QLT:'D2',COUL:'D3',observation:'Observation fictive'});}
    }
    if(component==='P1'&&cs.position===1&&code==='DEMO-SEC') {
     await ok(dir,`/results/submissions/${pending.id}/reject`,'POST',{reason:'Vérification de démonstration'});
     detail=await ok(browser,`/evaluations/${detail.id}`);detail=await ok(browser,`/evaluations/${detail.id}/grades`,'PUT',{version:detail.version,grades});
     await ok(browser,`/evaluations/${detail.id}/submission`,'POST',{version:detail.version},201);
     const retry=await db.submission.findFirst({where:{evaluationId:detail.id,status:'PENDING'}});await ok(dir,`/results/submissions/${retry.id}/approve`,'POST',{});
    }else await ok(dir,`/results/submissions/${pending.id}/approve`,'POST',{});
   }
   const preview=await ok(dir,`/results/class-periods/${cp.id}/preview`);assert.equal(preview.readyToClose,true,JSON.stringify(preview.problems));
   const close=await Promise.all([dir.request(`/results/class-periods/${cp.id}/close`,'POST',{confirmed:true}),dir.request(`/results/class-periods/${cp.id}/close`,'POST',{confirmed:true})]);assert.deepEqual(close.map(r=>r.status).sort(),[201,409]);
   assert.equal(await db.resultSnapshot.count({where:{classPeriodId:cp.id}}),3);
  }
  if(publish&&!unpublished.includes(component)) {
    if(cp.period.kind==='ANNUEL'&&code!=='DEMO-MAT') {
      const profiles=await ok(adm,'/results/profiles');
      let profile=profiles.find(p=>p.schoolYearId===schoolClass.schoolYearId&&p.cycle===schoolClass.cycle&&p.level===schoolClass.level&&p.optionCode===schoolClass.optionCode);
      if(!profile)profile=await ok(adm,'/results/profiles','POST',{code:`DEMO-${code}`,version:1,schoolYearId:schoolClass.schoolYearId,cycle:schoolClass.cycle,level:schoolClass.level,optionCode:schoolClass.optionCode,status:'DEMO_PROPOSE',source:'Profil synthétique de réception, seuils non officiels.',config:{admissionThreshold:'50',failureThreshold:'50',retakeMode:'REPLACE_E2_DEMO'}},201);
      const snapshots=await db.resultSnapshot.findMany({where:{classPeriodId:cp.id}});
      for(const result of snapshots) {
        const state=await ok(dir,`/results/snapshots/${result.id}/deliberation`);
        if(state.decisions.length)continue;
        const low=result.identitySnapshot.totalEarned==='0';
        await ok(dir,`/results/snapshots/${result.id}/decisions`,'POST',{profileId:profile.id,outcome:code==='DEMO-SEC'&&low?'REPECHAGE':low?'A_VERIFIER':'ADMIS',courses:code==='DEMO-SEC'&&low?[schoolClass.subjects[0].subjectId]:[],reason:'Conseil fictif : décision de démonstration, sans règle officielle.'},201);
      }
    }
    await ok(dir,`/results/class-periods/${cp.id}/publish`,'POST',{});
  }
  produced.push(cp);
 }
 return produced;
}
const primaryProof = 'BULLETIN_PRIMAIRE_DEMO-V1.pdf';
const maternalProof = 'BULLETIN_MATERNEL_DEMO-V1.pdf';
const annualProof = 'BULLETIN_SECONDAIRE_ANNUEL_DEMO-V1.pdf';

async function extendBulletinProgram(code, rows) {
 const schoolClass=await db.schoolClass.findFirstOrThrow({where:{code},include:{schoolYear:true}});
 const teacher=await db.teacher.findUniqueOrThrow({where:{userId:credentials[`ens-${code.toLowerCase()}-1`].id}});
 for(const [index,[label,maximum]] of rows.entries()) {
  const position=index+3;
  const subject=await ok(adm,'/school/subjects','POST',{code:`${code}-${String(position).padStart(2,'0')}`,label},201);
  const components=code==='DEMO-PRI'?['P1','P2','P3','P4','P5','P6','E1','E2','E3']:['P1','P2','P3','P4','E1','E2'];
  const componentMaxima=Object.fromEntries(components.map(period=>[period,String(period.startsWith('E')?maximum*2:maximum)]));
  const course=await ok(adm,'/school/program','POST',{classId:schoolClass.id,subjectId:subject.id,resultMaxScore:String(maximum),position,
   componentMaxima,source:'DEMO_PROPOSE : programme fictif, fixture de conformité documentaire'},201);
  await ok(dir,'/assignments','POST',{teacherId:teacher.id,classSubjectId:course.id,
   startsOn:schoolClass.schoolYear.startsOn.toISOString().slice(0,10)},201);
 }
}

async function pdfProof(result, filename) {
 const resource=`/bulletins/${result.id}/pdf`;
 const pdf=await sec.request(resource);
 assert.equal(pdf.status,200);
 assert.equal(new TextDecoder().decode(pdf.bytes.slice(0,8)),'%PDF-1.7');
 assert.match(pdf.headers.get('content-type'),/application\/pdf/);
 assert.match(pdf.headers.get('content-disposition'),/^attachment/);
 assert.equal(pdf.headers.get('cache-control'),'private, no-store');
 const repeat=await sec.request(resource);
 assert.deepEqual(pdf.bytes,repeat.bytes);
 await writeFile(`${proofDir}/${filename}`,pdf.bytes);
 await writeFile(`${proofDir}/${filename.replace('.pdf','.json')}`,JSON.stringify({
  identity:result.identitySnapshot,subjects:result.subjectResults
 },null,2));
 return pdf.bytes;
}

test('Parcours réel — notes zéro, rejet/correction, concurrence, clôture, publication, PDF trois cycles',{skip,timeout:360000},async()=>{
 await extendBulletinProgram('DEMO-PRI',[
  ['Anglais',20],['Physique',20],['Chimie',20],['Biologie',20],['Histoire',20],['Géographie',20],['Informatique',20],['Éducation civique et morale',20]
 ]);
 await extendBulletinProgram('DEMO-SEC',[
  ['Religion',10],['Éducation civique et morale',10],['Éducation physique',10],['Histoire',15],
  ['Technologie',15],['Sciences',30],['Informatique',30],['Géographie',30]
 ]);
 for(const [code,name] of [['DEMO-SEC',annualProof],['DEMO-PRI',primaryProof],['DEMO-MAT',maternalProof]]) {
  const components=code==='DEMO-SEC'?['P1','P2','E1','S1','P3','P4','E2','S2','ANNEE']:code==='DEMO-PRI'?['P1','P2','E1','T1','P3','P4','E2','T2','P5','P6','E3','T3','ANNEE']:['P1','P2','P3','P4','P5','P6','T1','T2','T3','ANNEE'];
  const contexts=await workflow(code,{components,unpublished:code==='DEMO-PRI'?['P6']:[]});
  const snapshots=await db.resultSnapshot.findMany({where:{classPeriodId:contexts.at(-1).id}});
  const result=snapshots.find(snapshot=>snapshot.identitySnapshot.matricule.endsWith('-2'));
  assert.equal(result.subjectResults.length,10);
  if(code==='DEMO-PRI') {
   const p1=await db.resultSnapshot.findFirstOrThrow({where:{classPeriodId:contexts.find(cp=>cp.period.code==='P1').id}});
   assert.equal((await ok(sec,`/bulletins/${p1.id}`)).documentPeriodSupported,false,'P1 ne correspond pas aux colonnes T1/T2/T3 du PDF primaire');
   const before=await db.reportCard.count({where:{resultSnapshotId:p1.id}});
   assert.equal((await sec.request(`/bulletins/${p1.id}/pdf`)).status,409);
   assert.equal((await sec.request(`/bulletins/${p1.id}/pdf?templateVersion=DEMO-V1.7`)).status,409);
   assert.equal((await sec.request(`/bulletins/${p1.id}/generate`,'POST',{})).status,409);
   assert.equal(await db.reportCard.count({where:{resultSnapshotId:p1.id}}),before,'Aucune émission incompatible créée');
   await db.reportCard.create({data:{resultSnapshotId:p1.id,templateVersion:'DEMO-V1.5',notice:'DEMO-V1'}});
   assert.equal((await sec.request(`/bulletins/${p1.id}/pdf?templateVersion=DEMO-V1.5`)).status,409,'Une archive ne contourne pas le contrôle');
   assert.equal(await db.reportCard.count({where:{resultSnapshotId:p1.id}}),before+1,'Archive conservée');
   assert.equal((await ok(sec,`/bulletins/${result.id}`)).documentPeriodSupported,true);
   const closed=await db.resultSnapshot.findFirstOrThrow({where:{classPeriodId:contexts.find(cp=>cp.period.code==='P6').id}});
   assert.equal((await sec.request(`/bulletins/${closed.id}/pdf`)).status,404);
   const zero=snapshots.find(snapshot=>snapshot.identitySnapshot.totalEarned==='0');
   assert.equal((await sec.request(`/bulletins/${zero.id}/generate`,'POST',{})).status,409);
   const preview=await ok(sec,`/bulletins/${zero.id}`);
   assert.equal(preview.publicationComplete,false);
   assert.equal(preview.identity.totalEarned,null);
   assert.equal(preview.subjects[0].earned,null);
   assert.ok(!('components' in preview.subjects[0]));
   assert.equal((await sec.request(`/bulletins/${zero.id}/pdf`)).status,409,'Pas de PDF partiellement publié');
   assert.equal((await sec.request(`/bulletins/${zero.id}/pdf?templateVersion=DEMO-V1.7`)).status,409);
   await ok(dir,`/results/class-periods/${closed.classPeriodId}/publish`,'POST',{});
   assert.equal((await ok(sec,`/bulletins/${zero.id}`)).identity.totalEarned,'0');
   const issued=await ok(sec,`/bulletins/${zero.id}/generate`,'POST',{},201);
   assert.equal((await sec.request(`/bulletins/${zero.id}/pdf`)).status,200);
   assert.equal((await ok(sec,`/bulletins/${zero.id}/generate`,'POST',{},201)).id,issued.id);
  }
  await db.reportCard.create({data:{resultSnapshotId:result.id,templateVersion:'DEMO-V1.3',notice:'DEMO-V1'}});
  const archived=await sec.request(`/bulletins/${result.id}/pdf`);
  const historicPath=`/bulletins/${result.id}/pdf?templateVersion=DEMO-V1.3`;
  assert.equal(archived.status,200);
  assert.deepEqual(archived.bytes,(await sec.request(historicPath)).bytes);
  const v14Path=`/bulletins/${result.id}/pdf?templateVersion=DEMO-V1.4`;
  assert.equal((await sec.request(v14Path)).status,404);
  await db.reportCard.create({data:{resultSnapshotId:result.id,templateVersion:'DEMO-V1.4',notice:'DEMO-V1'}});
  const v14=await sec.request(v14Path);
  assert.equal(v14.status,200);
  await db.reportCard.create({data:{resultSnapshotId:result.id,templateVersion:'DEMO-V1.5',notice:'DEMO-V1'}});
  const v15Path=`/bulletins/${result.id}/pdf?templateVersion=DEMO-V1.5`;
  const v15=await sec.request(v15Path);assert.equal(v15.status,200);
  const generated=await ok(sec,`/bulletins/${result.id}/generate`,'POST',{},201);
  const again=await ok(sec,`/bulletins/${result.id}/generate`,'POST',{},201);
  assert.equal(generated.templateVersion,'DEMO-V1.7');
  const v16Path=`/bulletins/${result.id}/pdf?templateVersion=DEMO-V1.6`;
  await db.reportCard.create({data:{resultSnapshotId:result.id,templateVersion:'DEMO-V1.6',notice:'DEMO-V1'}});
  const archive16=await sec.request(v16Path);assert.equal(archive16.status,200);
  assert.deepEqual((await sec.request(v16Path)).bytes,archive16.bytes);
  if(code==='DEMO-PRI') assert.notDeepEqual(archive16.bytes,(await sec.request(`/bulletins/${result.id}/pdf?templateVersion=DEMO-V1.7`)).bytes);
  assert.equal(generated.id,again.id);
  assert.notDeepEqual(await pdfProof(result,name),v14.bytes);
  assert.deepEqual((await sec.request(v14Path)).bytes,v14.bytes);
  assert.deepEqual((await sec.request(v15Path)).bytes,v15.bytes);
  assert.deepEqual((await sec.request(historicPath)).bytes,archived.bytes);
  assert.equal((await teacher.request(historicPath)).status,403);
  assert.equal((await new Browser().request(historicPath)).status,401);
  assert.equal((await sec.request(`/bulletins/${result.id}/pdf?templateVersion=inconnue`)).status,404);
  const expected=await db.resultSnapshot.count({where:{classPeriod:{publishedAt:{not:null}}}});
  assert.equal((await ok(sec,'/bulletins/count')).total,expected);
  assert.equal((await ok(dir,'/bulletins/count')).total,expected);
  assert.equal((await adm.request('/bulletins/count')).status,403);
  assert.equal((await teacher.request('/bulletins/count')).status,403);
  const byMatricule=await ok(sec,`/bulletins?search=${encodeURIComponent(result.identitySnapshot.matricule.toLowerCase())}`);
  assert.ok(byMatricule.length>0);
  assert.ok(byMatricule.every(row=>row.identitySnapshot.matricule===result.identitySnapshot.matricule));
  assert.ok((await ok(sec,`/bulletins?search=${encodeURIComponent('Fictif Élève 2')}`)).some(row=>row.id===result.id));
  assert.equal((await sec.request(`/bulletins?search=${'x'.repeat(121)}`)).status,400);
  await writeFile(`${proofDir}/AVANT-${name}`,v14.bytes);
 }
});

test('Bulletin CTEB de vingt branches, ventilation des maxima P1 et option scientifique distincte',{skip,timeout:180000},async()=>{
 for(const [code,filename] of [['CTEB7','BULLETIN_SECONDAIRE_DEMO-V1.pdf'],['DEMO-1H','secondaire-option-scientifique.pdf']]) {
  const [cp]=await workflow(code);
  const result=await db.resultSnapshot.findFirstOrThrow({where:{classPeriodId:cp.id,identitySnapshot:{path:['totalEarned'],equals:'0'}}});
  assert.equal(result.identitySnapshot.optionCode,code==='CTEB7'?null:'1.02');
  assert.equal(result.identitySnapshot.totalMaximum,code==='CTEB7'?'400':'40');
  assert.equal(result.subjectResults.length,code==='CTEB7'?20:2);
  await pdfProof(result,filename);
  await db.reportCard.create({data:{resultSnapshotId:result.id,templateVersion:'DEMO-V1.4',notice:'DEMO-V1'}});
  const historical=await sec.request(`/bulletins/${result.id}/pdf?templateVersion=DEMO-V1.4`);
  assert.equal(historical.status,200);
  await writeFile(`${proofDir}/AVANT-${filename}`,historical.bytes);
 }
});

test('T16 — compte runtime sans DDL ni accès migrations, audit append-only',{skip},async()=>{
 const [row]=await db.$queryRaw`SELECT has_schema_privilege(current_user,'public','CREATE') AS create, has_table_privilege(current_user,'"_prisma_migrations"','SELECT') AS migrations`;
 assert.equal(row.create,false);assert.equal(row.migrations,false);
 await assert.rejects(()=>db.auditEntry.deleteMany({where:{id:randomUUID()}}));
});
test('T18 — publication avant clôture refusée',{skip},async()=>{
 const cp=await db.classPeriod.findFirst({where:{closedAt:null}});assert.ok(cp);assert.equal((await dir.request(`/results/class-periods/${cp.id}/publish`,'POST',{})).status,409);
});


test('Deuxième session DEMO — autorisation, validation, remplacement E2 et conservation première session',{skip,timeout:60000},async()=>{
 const decision=await db.deliberationDecision.findFirst({where:{outcome:'REPECHAGE'},include:{resultSnapshot:true,profile:true}});assert.ok(decision,'Le parcours annuel doit préparer une autorisation explicite.');
 const original=JSON.stringify(decision.resultSnapshot);
 const cp=await db.classPeriod.findFirst({where:{classId:decision.resultSnapshot.classId,period:{kind:'REPECHAGE'}},include:{period:true}});
 const cs=await db.classSubject.findFirst({where:{classId:cp.classId,subjectId:decision.courses[0]},include:{assignments:{include:{teacher:true}}}});
 const assignment=cs.assignments[0];const key=Object.keys(credentials).find(k=>credentials[k].id===assignment.teacher.userId);const browser=new Browser();await browser.login(key);
 let detail=await ok(browser,'/evaluations','POST',{assignmentId:assignment.id,classPeriodId:cp.id,decisionId:decision.id,title:'Épreuve DEMO de deuxième session',kind:'REPECHAGE',heldOn:cp.period.startsOn.toISOString().slice(0,10),maxScore:'20'},201);
 assert.equal(detail.grades.length,1);
 detail=await ok(browser,`/evaluations/${detail.id}/grades`,'PUT',{version:detail.version,grades:[{enrollmentId:detail.grades[0].enrollmentId,score:'20'}]});
 await ok(browser,`/evaluations/${detail.id}/submission`,'POST',{version:detail.version},201);
 const submission=await db.submission.findFirst({where:{evaluationId:detail.id,status:'PENDING'}});await ok(dir,`/results/submissions/${submission.id}/approve`,'POST',{});
 const preview=await ok(dir,`/results/class-periods/${cp.id}/preview`);assert.equal(preview.readyToClose,true,JSON.stringify(preview.problems));
 const corrected=preview.students.find(s=>s.enrollmentId===decision.resultSnapshot.enrollmentId);assert.equal(corrected.totalEarned,'40');assert.equal(corrected.totalMaximum,'1520');
 await ok(dir,`/results/class-periods/${cp.id}/close`,'POST',{confirmed:true},201);
 const results=await db.resultSnapshot.findMany({where:{classPeriodId:cp.id}});
 for(const result of results)await ok(dir,`/results/snapshots/${result.id}/decisions`,'POST',{profileId:decision.profileId,outcome:'A_VERIFIER',courses:[],reason:'Deuxième session fictive : décision du conseil à confirmer.'},201);
 await ok(dir,`/results/class-periods/${cp.id}/publish`,'POST',{});
 assert.equal(JSON.stringify(await db.resultSnapshot.findUnique({where:{id:decision.resultSnapshot.id}})),original);
 const snapshot=results.find(r=>r.enrollmentId===decision.resultSnapshot.enrollmentId);
 const name='BULLETIN_REPECHAGE_DEMO-V1.pdf';
 await pdfProof(snapshot,name);
 await db.reportCard.create({data:{resultSnapshotId:snapshot.id,templateVersion:'DEMO-V1.4',notice:'DEMO-V1'}});
 const historical=await sec.request(`/bulletins/${snapshot.id}/pdf?templateVersion=DEMO-V1.4`);
 assert.equal(historical.status,200);
 await writeFile(`${proofDir}/AVANT-${name}`,historical.bytes);
 await db.reportCard.create({data:{resultSnapshotId:snapshot.id,templateVersion:'DEMO-V1.5',notice:'DEMO-V1'}});
 const archivedV15=await sec.request(`/bulletins/${snapshot.id}/pdf?templateVersion=DEMO-V1.5`);
 assert.equal(archivedV15.status,200);
 await ok(sec,`/bulletins/${snapshot.id}/generate`,'POST',{},201);
 assert.deepEqual((await sec.request(`/bulletins/${snapshot.id}/pdf?templateVersion=DEMO-V1.5`)).bytes,archivedV15.bytes);
 await writeFile(`${proofDir}/AVANT-REPECHAGE-V15.pdf`,archivedV15.bytes);
 await writeFile(`${proofDir}/REPECHAGE-premiere-session.json`,JSON.stringify({
  identity:decision.resultSnapshot.identitySnapshot,subjects:decision.resultSnapshot.subjectResults,authorized:decision.courses,
 },null,2));
});

async function courseFixture(label,{maximum='40',cycle='SECONDAIRE_TECHNIQUE',maxima={P1:'40'},owner='ens'}={}) {
 const school=await ok(adm,'/school/bootstrap');const year=school.years.find(y=>y.code==='DEMO-2025-2026');
 const cls=await ok(adm,'/school/classes','POST',{schoolYearId:year.id,code:`CHECK-${label}-${suffix}`,label:`Classe DEMO ${label}`,cycle,level:'7e EB',programVersion:'DEMO-V1.TEST'},201);
 const subject=await ok(adm,'/school/subjects','POST',{code:`CHECK-${label}-${suffix}`,label:'Branche DEMO de réception'},201);
 const cs=await ok(adm,'/school/program','POST',{classId:cls.id,subjectId:subject.id,resultMaxScore:maximum,componentMaxima:maxima,position:1,source:'DEMO_PROPOSE : exemple de réception du prompt maître'},201);
 let profile=await db.teacher.findUnique({where:{userId:credentials[owner].id}});
 if(!profile)profile=await ok(dir,'/assignments/teachers','POST',{userId:credentials[owner].id},201);
 const assignment=await ok(dir,'/assignments','POST',{teacherId:profile.id,classSubjectId:cs.id,startsOn:year.startsOn.slice(0,10)},201);
 const student=await ok(sec,'/students/records','POST',{matricule:`CHECK-${label}-${suffix}`,firstName:'Élève',lastName:'Fictive'},201);
 await ok(sec,`/students/${student.id}/enrollments`,'POST',{classId:cls.id,schoolYearId:year.id},201);
 const periods=await db.classPeriod.findMany({where:{classId:cls.id},include:{period:true}});
 const browser=new Browser();await browser.login(owner);return {cls,cs,assignment,student,periods,browser};
}
async function approvedEvaluation(f,component,score,maxScore) {
 const cp=f.periods.find(cp=>cp.period.code===component);assert.ok(cp);
 let detail=await ok(f.browser,'/evaluations','POST',{assignmentId:f.assignment.id,classPeriodId:cp.id,title:`Réception ${component}`,heldOn:cp.period.startsOn.toISOString().slice(0,10),kind:cp.period.kind==='EXAMEN'?'EXAMEN':'TRAVAIL_JOURNALIER',maxScore},201);
 detail=await ok(f.browser,`/evaluations/${detail.id}/grades`,'PUT',{version:detail.version,grades:[{enrollmentId:detail.grades[0].enrollmentId,score}]});
 await ok(f.browser,`/evaluations/${detail.id}/submission`,'POST',{version:detail.version},201);
 const submission=await db.submission.findFirst({where:{evaluationId:detail.id,status:'PENDING'}});await ok(dir,`/results/submissions/${submission.id}/approve`,'POST',{});return {cp,detail,submission};
}
async function closeComponent(f,code) {
 const cp=f.periods.find(cp=>cp.period.code===code);const preview=await ok(dir,`/results/class-periods/${cp.id}/preview`);assert.equal(preview.readyToClose,true,JSON.stringify(preview.problems));
 await ok(dir,`/results/class-periods/${cp.id}/close`,'POST',{confirmed:true},201);return preview;
}
test('Calcul périodique réel — 15/20 + 30/40 => 30/40 ; 10/10 + 0/30 => 10/40',{skip},async()=>{
 for(const [label,grades,expected] of [['weighted',[[15,20],[30,40]],'30'],['discriminant',[[10,10],[0,30]],'10']]) {
  const f=await courseFixture(label);const cp=f.periods.find(cp=>cp.period.code==='P1');
  assert.equal((await ok(dir,`/results/class-periods/${cp.id}/preview`)).readyToClose,false);
  for(const [score,max] of grades)await approvedEvaluation(f,'P1',String(score),String(max));
  const preview=await closeComponent(f,'P1');assert.equal(preview.students[0].totalEarned,expected);assert.equal(preview.students[0].totalMaximum,'40');
 }
});
test('Agrégations réelles — semestre 66/80 et primaire annuel 280/350',{skip,timeout:60000},async()=>{
 const secondary=await courseFixture('semester',{maximum:'20',maxima:{P1:'20',P2:'20',E1:'40'}});
 for(const [component,score,max] of [['P1','16','20'],['P2','18','20'],['E1','32','40']]){await approvedEvaluation(secondary,component,score,max);await closeComponent(secondary,component);}
 const semester=await closeComponent(secondary,'S1');assert.equal(semester.students[0].totalEarned,'66');assert.equal(semester.students[0].totalMaximum,'80');assert.equal(semester.students[0].percentage,'82.5');
 const primary=await courseFixture('primary',{cycle:'PRIMAIRE',maximum:'50',maxima:{P1:'50',P2:'25',E1:'25',P3:'50',P4:'50',E2:'50',P5:'25',P6:'25',E3:'50'}});
 for(const [component,score,max] of [['P1','35','50'],['P2','17.5','25'],['E1','17.5','25'],['P3','40','50'],['P4','40','50'],['E2','40','50'],['P5','22.5','25'],['P6','22.5','25'],['E3','45','50']]){await approvedEvaluation(primary,component,score,max);await closeComponent(primary,component);}
 for(const term of ['T1','T2','T3'])await closeComponent(primary,term);
 const annual=await closeComponent(primary,'ANNEE');assert.equal(annual.students[0].totalEarned,'280');assert.equal(annual.students[0].totalMaximum,'350');assert.equal(annual.students[0].percentage,'80');
});
test('T14 — le compte ENS+DIR ne décide pas sa soumission, même avec acteur forgé',{skip},async()=>{
 const f=await courseFixture('sod',{owner:'multi'});const cp=f.periods.find(cp=>cp.period.code==='P1');
 let detail=await ok(f.browser,'/evaluations','POST',{assignmentId:f.assignment.id,classPeriodId:cp.id,title:'Séparation des tâches',heldOn:cp.period.startsOn.toISOString().slice(0,10),kind:'TRAVAIL_JOURNALIER',maxScore:'20'},201);
 detail=await ok(f.browser,`/evaluations/${detail.id}/grades`,'PUT',{version:detail.version,grades:[{enrollmentId:detail.grades[0].enrollmentId,score:'15'}]});
 await ok(f.browser,`/evaluations/${detail.id}/submission`,'POST',{version:detail.version},201);
 const submission=await db.submission.findFirst({where:{evaluationId:detail.id,status:'PENDING'}});
 assert.equal((await f.browser.request(`/results/submissions/${submission.id}/approve`,'POST',{actorId:credentials.dir.id})).status,403);
 assert.equal((await f.browser.request(`/results/submissions/${submission.id}/reject`,'POST',{actorId:credentials.dir.id,reason:'Tentative forgée'})).status,403);
 assert.equal((await db.submission.findUnique({where:{id:submission.id}})).status,'PENDING');
});


test('T17 — contrôle propre bulletin au service ; ouverture de session élève reste désactivée',{skip},async()=>{
 const {BulletinsController}=await import('../dist/modules/bulletins/bulletins.module.js');
 const rows=await db.resultSnapshot.findMany({where:{classPeriod:{publishedAt:{not:null}}},include:{enrollment:{include:{student:true}}},take:20});
 const own=rows[0],foreign=rows.find(r=>r.enrollment.student.userId!==own.enrollment.student.userId);assert.ok(foreign);
 const controller=new BulletinsController({client:db});const auth={userId:own.enrollment.student.userId,roles:['ELEVE']};
 assert.ok((await controller.list(auth)).every(row=>row.identitySnapshot.matricule===own.identitySnapshot.matricule));
 assert.deepEqual(await controller.list(auth,foreign.identitySnapshot.matricule),[],'La recherche ne contourne pas le périmètre élève');
 assert.equal((await controller.detail(own.id,auth)).id,own.id);
 await assert.rejects(()=>controller.detail(foreign.id,auth),error=>error.getStatus()===403);
 assert.equal((await db.user.findUnique({where:{id:auth.userId}})).loginEnabled,false);
});

test('Dernier ADM — deux désactivations concurrentes conservent un administrateur actif',{skip},async()=>{
 const password=randomUUID();const user=await ok(adm,'/users','POST',{login:`adm-${suffix}@demo.test`,firstName:'Second',lastName:'ADM fictif',initialPassword:password,roles:['ADM']},201);
 await ok(adm,`/users/${user.id}/status`,'PATCH',{enabled:true});credentials.secondAdm={id:user.id,login:user.login,password};const second=new Browser();await second.login('secondAdm');
 try {
  const replies=await Promise.all([adm.request(`/users/${user.id}/status`,'PATCH',{enabled:false}),second.request(`/users/${credentials.adm.id}/status`,'PATCH',{enabled:false})]);
  assert.ok(replies.some(r=>r.status===200));assert.ok(replies.some(r=>r.status===403||r.status===401));
  assert.equal(await db.user.count({where:{loginEnabled:true,roles:{some:{role:'ADM'}}}}),1);
 }finally{
  // Nettoyage limité aux deux comptes synthétiques du test ; aucun compte extérieur visé.
  await db.$transaction(async tx=>{await tx.user.update({where:{id:credentials.adm.id},data:{loginEnabled:true}});await tx.user.update({where:{id:user.id},data:{loginEnabled:false}});await tx.session.updateMany({where:{userId:user.id,revokedAt:null},data:{revokedAt:new Date()}});});
 }
});

test('T02/T03/T04 — réponses indifférenciées et limitation persistante après redémarrage serveur',{skip,timeout:30000},async()=>{
 const browser=new Browser();const c=await browser.request('/auth/csrf');browser.csrf=c.body.csrfToken;
 const known=await browser.request('/auth/login','POST',{login:credentials.dir.login,password:'incorrect-fictif'});
 const unknown=await browser.request('/auth/login','POST',{login:`inconnu-${suffix}`,password:'incorrect-fictif'});
 assert.equal(known.status,401);assert.equal(unknown.status,401);assert.deepEqual(known.body,unknown.body);
 const login=`throttle-${suffix}`;let limited=false;
 for(let i=0;i<7;i++){const reply=await browser.request('/auth/login','POST',{login,password:'incorrect-fictif'});if(reply.status===429){limited=true;break;}}
 assert.equal(limited,true);
 let restart;const oldBase=base;
 try {
  restart=await NestFactory.create(AppModule,{logger:false,abortOnError:false});restart.setGlobalPrefix('api/v1');await restart.listen(0,'127.0.0.1');base=`${await restart.getUrl()}/api/v1`;
  assert.equal((await browser.request('/auth/login','POST',{login,password:'incorrect-fictif'})).status,429);
 }finally{
  base=oldBase;await restart?.close();
  const keys=[`origin:127.0.0.1`,`account:${login}`,`account:${credentials.dir.login}`].map(v=>createHash('sha256').update(v).digest('hex'));
  await db.loginLimit.updateMany({where:{key:{in:keys}},data:{failures:0}});
 }
});
