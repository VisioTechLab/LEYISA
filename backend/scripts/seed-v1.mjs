import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { requireLocalFixtures } from '../prisma/env.mjs';
import { createClient } from '../prisma/client.mjs';
import { hashPassword } from '../dist/modules/auth/password.js';

requireLocalFixtures();
if(process.env.LEYISA_DEMO_SEED!=='1')throw new Error('LEYISA_DEMO_SEED=1 requis sur la base locale jetable.');
const db=createClient();
const credentialsPath=process.env.LEYISA_DEMO_CREDENTIALS_FILE??'/tmp/leyisa-v1-credentials.json';
const refs=JSON.parse(await readFile(new URL('../prisma/reference-data.json',import.meta.url),'utf8'));
let credentials={};try{credentials=JSON.parse(await readFile(credentialsPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const date=s=>new Date(`${s}T00:00:00.000Z`);
const shift=s=>`${Number(s.slice(0,4))-1}${s.slice(4)}`;
const attitudes=["Intégration au groupe école","Participation aux activités et application","Respect/protection de l’environnement et soi-même","Réaction aux consignes et autres sollicitations","Sens de responsabilité et esprit d’affirmation","Prudence dans le choix et les actions","Fréquentation de l’école et amour aux études","Sensibilité aux genres et confiance en soi","Sensibilité aux valeurs de son milieu","Maintien de son corps"];
async function account(key,roles){
 const login=`${key}@demo.leyisa.test`;
 let user=await db.user.findUnique({where:{login}});
 if(user&&!credentials[key])throw new Error(`Compte préexistant sans secret local attendu : ${key}. Aucune réinitialisation.`);
 if(!user){const password=randomBytes(24).toString('base64url');user=await db.user.create({data:{kind:'STAFF',login,firstName:key,lastName:'Fictif',loginEnabled:true,passwordHash:await hashPassword(password),roles:{create:roles.map(role=>({role}))}}});credentials[key]={login,password,id:user.id};await writeFile(credentialsPath,JSON.stringify(credentials,null,2),{mode:0o600});}
 return user;
}
try {
 const existingSettings=await db.schoolSettings.findUnique({where:{id:'school'}});
 if(existingSettings&&existingSettings.identity?.name!=='École fictive LEYISA')throw new Error('Établissement préexistant inattendu : aucun jeu DEMO ajouté.');
 for(const [key,roles] of [['adm',['ADM']],['sec',['SEC']],['dir',['DIR']],['ens',['ENS']],['multi',['ENS','DIR']]])await account(key,roles);
 await db.schoolSettings.upsert({where:{id:'school'},create:{identity:{name:'École fictive LEYISA',code:'DEMO-001',province:'Province fictive',city:'Ville de démonstration',commune:'Commune démo'},options:refs.options,profiles:{DEMO_V1:{version:'1',status:'DEMO_PROPOSE',source:'Prompt maître §§11–13',description:'Somme pondérée par maxima ; délibération à vérifier ; aucune règle officielle.'}}},update:{}});
 const years=[];
 for(const completed of [false,true]) {
  const code=completed?'DEMO-2025-2026':'2026-2027';
  const year=await db.schoolYear.upsert({where:{code},create:{code,startsOn:date(completed?'2025-09-01':'2026-09-01'),endsOn:date(completed?'2026-07-02':'2027-07-02')},update:{}});
  const positions={};
  for(const row of refs.calendar){
   const profile=row.cycle,kind=['PERIODE','EXAMEN','EVEIL','TRIMESTRE','SEMESTRE','REPECHAGE'].includes(row.type)?row.type:'EVENEMENT';
   positions[profile]=(positions[profile]??0)+1;
   const period=await db.period.upsert({where:{schoolYearId_profile_code:{schoolYearId:year.id,profile,code:row.code}},create:{schoolYearId:year.id,profile,code:row.code,label:`${row.code} — ${profile} / ${code}`,kind,position:positions[profile],parentCode:row.parent_ou_contexte,startsOn:date(completed?shift(row.debut_inclus):row.debut_inclus),endsOn:date(completed?shift(row.fin_incluse):row.fin_incluse),source:completed?'DEMO_PROPOSE : calendrier transposé un an avant, aucune norme':'REFERENCE_A_VERIFIER : calendrier transmis 2026–2027 p.'+row.page_pdf},update:{}});
  }
  for(const profile of ['MATERNEL','PRIMAIRE','SECONDAIRE_TECHNIQUE'])await db.period.upsert({where:{schoolYearId_profile_code:{schoolYearId:year.id,profile,code:'ANNEE'}},create:{schoolYearId:year.id,profile,code:'ANNEE',label:`Annuel ${profile} / ${code}`,kind:'ANNUEL',position:1000,startsOn:year.startsOn,endsOn:year.endsOn,source:'DEMO_PROPOSE agrégation des synthèses complètes'},update:{}});
  years.push(year);
 }
 const year=years[1];
 const definitions=[['DEMO-LIVE','Classe ouverte pour le parcours en direct','SECONDAIRE_TECHNIQUE','7e EB',null,['Mathématiques','Français']],['DEMO-SEC','Classe secondaire DEMO','SECONDAIRE_TECHNIQUE','7e EB',null,['Mathématiques','Français']],['DEMO-PRI','Classe primaire DEMO','PRIMAIRE','3e primaire',null,['Mathématiques','Français']],['DEMO-MAT','Classe maternelle DEMO','MATERNEL','3e maternelle',null,attitudes],['CTEB7','7e CTEB — référence P1','SECONDAIRE_TECHNIQUE','7e EB',null,null],['CTEB8','8e CTEB — référence P1','SECONDAIRE_TECHNIQUE','8e EB',null,null],['DEMO-1H','Humanité scientifique DEMO','SECONDAIRE_TECHNIQUE','1re H','1.02',['Mathématiques','Français']]];
 for(const [code,label,cycle,level,optionCode,names] of definitions) {
  const schoolClass=await db.schoolClass.upsert({where:{schoolYearId_code:{schoolYearId:year.id,code}},create:{schoolYearId:year.id,code,label,cycle,level,optionCode,programVersion:'DEMO-V1.1',programStatus:'DEMO_PROPOSE'},update:{}});
  if(schoolClass.label!==label||schoolClass.cycle!==cycle||schoolClass.level!==level)throw new Error('Classe préexistante inattendue : '+code);
  const periods=await db.period.findMany({where:{schoolYearId:year.id,profile:cycle,kind:{not:'EVENEMENT'}}});
  await db.classPeriod.createMany({data:periods.map(p=>({classId:schoolClass.id,periodId:p.id,schoolYearId:year.id})),skipDuplicates:true});
  const weights=names?names.map((name,index)=>({libelle_source:name,maximum:'20',capture:cycle==='MATERNEL'?'MATERNEL_01/02.png':'Profil synthétique démonstration',index})):refs.weights.filter(w=>w.profil==='CTEB'&&w.niveau===level).map((w,index)=>({...w,index}));
  if(!names&&(weights.length!==20||weights.reduce((s,w)=>s+Number(w.maximum),0)!==400))throw new Error('CTEB incomplet ou maximum différent de 400.');
  for(const weight of weights) {
   const subjectCode=`${code}-${String(weight.index+1).padStart(2,'0')}`;
   const subject=await db.subject.upsert({where:{code:subjectCode},create:{code:subjectCode,label:weight.libelle_source},update:{}});
   const componentMaxima={};
   for(const period of periods.filter(p=>['PERIODE','EXAMEN'].includes(p.kind))) {
    // Grille CTEB seulement attestée en P1 ; autres composantes restent inconnues.
    if(!names&&period.code!=='P1')continue;
    componentMaxima[period.code]=cycle==='MATERNEL'?'1':String(Number(weight.maximum)*(period.kind==='EXAMEN'?2:1));
   }
   const cs=await db.classSubject.upsert({where:{classId_subjectId:{classId:schoolClass.id,subjectId:subject.id}},create:{classId:schoolClass.id,subjectId:subject.id,resultMaxScore:weight.maximum,position:weight.index+1,componentMaxima,source:names?'DEMO_PROPOSE : maxima fictifs ; '+weight.capture:'REFERENCE_A_VERIFIER : '+weight.capture+' P1'},update:{}});
   const staff=await account(`ens-${code.toLowerCase()}-${weight.index+1}`,['ENS']);
   const teacher=await db.teacher.upsert({where:{userId:staff.id},create:{userId:staff.id,staffNumber:`DEMO-${subjectCode}`},update:{}});
   if(!await db.teacherAssignment.findFirst({where:{teacherId:teacher.id,classSubjectId:cs.id}}))await db.teacherAssignment.create({data:{teacherId:teacher.id,classSubjectId:cs.id,classId:schoolClass.id,startsOn:year.startsOn,endsOn:new Date(year.endsOn.getTime()+86400000)}});
  }
  for(let index=1;index<=3;index++) {
   const matricule=`DEMO-${code}-${index}`;
   let student=await db.student.findUnique({where:{matricule},include:{user:true}});
   if(student&&(student.user.firstName!==`Élève ${index}`||student.user.lastName!=='Fictif'))throw new Error('Matricule préexistant inattendu : '+matricule);
   if(!student)student=await db.student.create({data:{matricule,postName:'Exemple',sex:index%2?'F':'M',birthDate:date(cycle==='MATERNEL'?'2020-03-10':'2013-03-10'),birthPlace:'Ville fictive',user:{create:{kind:'STUDENT',firstName:`Élève ${index}`,lastName:'Fictif',roles:{create:{role:'ELEVE'}}}}}});
   await db.enrollment.upsert({where:{studentId_schoolYearId:{studentId:student.id,schoolYearId:year.id}},create:{studentId:student.id,schoolYearId:year.id,classId:schoolClass.id},update:{}});
  }
 }
 console.log(`Jeu local non destructeur préparé. Identifiants privés : ${credentialsPath}. Aucun secret affiché.`);
} finally {await db.$disconnect();}
