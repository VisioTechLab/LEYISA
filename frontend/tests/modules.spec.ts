import { test, expect, request as http, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const credentials = JSON.parse(await readFile(process.env.LEYISA_E2E_CREDENTIALS!, 'utf8'));
const proofs = resolve(process.env.LEYISA_E2E_PROOFS ?? '../docs/preuves-quality-modules/apres');
const origin = process.env.LEYISA_E2E_ORIGIN ?? 'http://127.0.0.1:5176';
const screens = {
 adm: [['D-ADM','accueil'],['W02','comptes'],['W03','scolarite'],['W04','classes'],['W05','programme'],['W26','audit']],
 sec: [['D-SEC','accueil'],['W08','eleves'],['W09','dossier'],['W10','historique'],['W11','inscription'],['W12','bulletins'],['W25','bulletin'],['W27','acces']],
 ens: [['D-ENS','accueil'],['W13','cours'],['W14','evaluations'],['W15','evaluation'],['W16','notes'],['W17','soumission'],['W18','corrections']],
 dir: [['D-DIR','accueil'],['W06','enseignants'],['W07','affectations'],['W19','validation'],['W20','detail-soumission'],['W21','rejet'],['W22','previsualisation'],['W23','cloture'],['W24','resultats']],
};
async function login(page: Page, role: string) {
 await page.goto('/');
 await page.getByLabel('Identifiant',{exact:true}).or(page.getByRole('button',{name:'Déconnexion',exact:true})).waitFor();
 if (await page.getByRole('button',{name:'Déconnexion',exact:true}).isVisible()) await page.getByRole('button',{name:'Déconnexion',exact:true}).click();
 await page.getByLabel('Identifiant',{exact:true}).fill(credentials[role].login);
 await page.getByLabel('Mot de passe',{exact:true}).fill(credentials[role].password);
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await expect(page.getByRole('button',{name:'Déconnexion',exact:true})).toBeVisible();
}
async function capture(page:Page,name:string) { await page.screenshot({path:resolve(proofs,`${name}.png`),fullPage:true}); }
async function settled(page: Page) {
 const route=new URL(page.url()).hash.split('?')[0];
 await expect(page.locator('[data-route]')).toHaveAttribute('data-route',route);
 await page.locator('main h1').waitFor();
 await expect(page.getByRole('status').filter({hasText:/Chargement|Vérification de la session|Ouverture du lecteur/})).toHaveCount(0);
 await page.waitForLoadState('networkidle');
 if (page.url().includes('#bulletin')) await page.locator('canvas[data-rendered="true"], .bulletin-empty, .bulletin-error').first().waitFor();
}
test.beforeAll(async()=>{await mkdir(proofs,{recursive:true});});

test('W01 : connexion, erreur lisible, clavier et téléphone',async({page})=>{
 await page.goto('/');await page.getByLabel('Identifiant',{exact:true}).waitFor();
 await capture(page,'W01');
 for(const width of [390,320]) {
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  if(width===390)await capture(page,'W01-mobile-390');
 }
 await page.getByLabel('Identifiant',{exact:true}).fill(`inconnu-fictif-${randomUUID().slice(0,8)}`);
 await page.getByLabel('Mot de passe',{exact:true}).fill('Essai fictif sans compte');
 await page.getByLabel('Mot de passe',{exact:true}).press('Enter');
 await expect(page.getByRole('alert')).toBeVisible();
 await page.getByLabel('Identifiant',{exact:true}).fill(credentials.sec.login);
 await page.getByLabel('Mot de passe',{exact:true}).fill(credentials.sec.password);
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await expect(page.getByRole('button',{name:'Déconnexion',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Déconnexion',exact:true}).click();
 await page.getByLabel('Identifiant',{exact:true}).waitFor();
 expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
});

for (const [role,routes] of Object.entries(screens)) test(`Module ${role} : vues réelles, navigation et adaptation390/320px`,async({page})=>{
 test.setTimeout(180_000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await login(page,role);
 const report=[];
 for(const [screen,route] of routes) {
  await page.goto(`/#${route}`);await settled(page);
  await expect(page.getByRole('navigation',{name:'Navigation principale'}).locator('a[aria-current="page"]')).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await capture(page,screen);
  for(const width of [390,320]) {
   await page.setViewportSize({width,height:844});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${screen} dépasse ${width}px`).toBeTruthy();
   await expect(page.getByRole('navigation',{name:'Navigation principale'})).toBeHidden();
   await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();
   await expect(page.getByRole('navigation',{name:'Navigation principale'})).toBeVisible();
   await expect(page.getByRole('button',{name:'Fermer le menu',exact:true})).toHaveAttribute('aria-expanded','true');
   await page.getByRole('button',{name:'Fermer le menu',exact:true}).click();
   if(width===390)await capture(page,`${screen}-mobile-390`);
  }
  await page.setViewportSize({width:1440,height:1080});
  report.push({screen,route,role,heading:await page.locator('main h1').innerText(),desktop:true,mobile:[390,320]});
 }
 expect(errors).toEqual([]);
 await writeFile(resolve(proofs,`recette-${role}.json`),JSON.stringify(report,null,2)+'\n');
});

test('Dossier : homonymes, recherche nom/matricule, historique et inscription sans perte de sélection',async({page})=>{
 test.setTimeout(120_000);await login(page,'sec');
 const suffix=randomUUID().slice(0,8),ids:string[]=[],matricules=[`QA-HOM-${suffix}-1`,`QA-HOM-${suffix}-2`], lastName=`Homonyme Fictif ${suffix}`;
 for(const matricule of matricules) {
  await page.goto('/#dossier');await settled(page);
  await page.getByLabel('Matricule permanent',{exact:true}).fill(matricule);
  await page.getByLabel('Nom',{exact:true}).fill(lastName);
  await page.getByLabel('Postnom',{exact:true}).fill('Essai');
  await page.getByLabel('Prénom',{exact:true}).fill('Camille');
  const creation=page.waitForResponse(response=>response.url().endsWith('/students/records')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Enregistrer le dossier',exact:true}).click();
  const response=await creation;expect(response.status()).toBe(201);ids.push((await response.json()).id);
  await expect(page.getByRole('status').filter({hasText:'Enregistrement confirmé'})).toBeVisible();
 }
 await page.goto('/#historique');await settled(page);
 await page.getByLabel('Rechercher un dossier').fill(lastName);await page.waitForLoadState('networkidle');
 await expect(page.getByLabel('Élève',{exact:true}).locator('option').filter({hasText:'Camille'})).toHaveCount(2);
 for(const matricule of matricules)await expect(page.getByLabel('Élève',{exact:true}).locator('option').filter({hasText:matricule})).toHaveCount(1);
 await page.getByLabel('Élève',{exact:true}).selectOption(ids[0]);
 await expect(page.getByRole('heading',{name:`${lastName} Essai Camille`})).toBeVisible();
 await capture(page,'W10-homonymes');
 await page.getByRole('link',{name:'Inscrire à une nouvelle année'}).click();await settled(page);
 await expect(page.getByLabel('Élève',{exact:true})).toHaveValue(ids[0]);
 await page.reload();await settled(page);await expect(page.getByLabel('Élève',{exact:true})).toHaveValue(ids[0]);
 await page.goto('/#eleves');await settled(page);
 await page.getByLabel('Recherche',{exact:true}).fill(matricules[1]);
 await page.getByRole('button',{name:'Rechercher',exact:true}).click();
 await expect(page.getByRole('row').filter({hasText:matricules[0]})).toHaveCount(0);
 // Dossiers sans inscription présents dans la vraie liste ; le lien porte son identifiant.
 await expect(page.getByRole('link',{name:`Consulter le dossier ${matricules[1]}`})).toBeVisible();
 await page.getByRole('link',{name:`Consulter le dossier ${matricules[1]}`}).click();await settled(page);
 await expect(page.getByLabel('Élève',{exact:true})).toHaveValue(ids[1]);
 expect(await page.evaluate(()=>Object.keys(localStorage).length+Object.keys(sessionStorage).length)).toBe(0);
 await page.getByRole('button',{name:'Déconnexion',exact:true}).click();await login(page,'sec');
 await page.goto('/#historique');await settled(page);
 await expect(page.getByLabel('Élève',{exact:true})).not.toHaveValue(ids[1]);
});

test('Scolarité : la classe choisie reste ouverte entre classes, programme et calendrier',async({page})=>{
 await login(page,'adm');await page.goto('/#classes');await settled(page);
 const year=await page.getByLabel('Année scolaire',{exact:true}).locator('option').filter({hasText:'DEMO-2025-2026'}).getAttribute('value');
 await page.getByLabel('Année scolaire',{exact:true}).selectOption(year!);
 const row=page.getByRole('row').filter({hasText:'Classe primaire DEMO'});
 await row.getByRole('link',{name:'Programme',exact:true}).click();await settled(page);
 await expect(page.getByLabel('Classe',{exact:true}).locator('option:checked')).toHaveText('Classe primaire DEMO');
 await expect(page.getByLabel('Année scolaire',{exact:true})).toHaveValue(year!);
 await page.getByRole('navigation',{name:'Navigation principale'}).getByRole('link',{name:'Configuration scolaire',exact:true}).click();await settled(page);
 await expect(page.getByLabel('Classe',{exact:true}).locator('option:checked')).toHaveText('Classe primaire DEMO');
 await capture(page,'W05-classe-conservee');
});

// Préparation par les API réellement autorisées ; aucun accès direct à PostgreSQL.
async function actor(role:string) {
 const context=await http.newContext({baseURL:origin,extraHTTPHeaders:{Origin:origin}});
 const csrf=await(await context.get('/api/v1/auth/csrf')).json();
 const authenticated=await context.post('/api/v1/auth/login',{headers:{'X-CSRF-Token':csrf.csrfToken},data:{login:credentials[role].login,password:credentials[role].password}});
 expect(authenticated.status()).toBe(200);
 return { async get(path:string){const response=await context.get(`/api/v1${path}`);expect(response.status()).toBe(200);return response.json();},
  async post(path:string,data:unknown){const response=await context.post(`/api/v1${path}`,{headers:{'X-CSRF-Token':csrf.csrfToken},data});expect([200,201]).toContain(response.status());return response.json();},dispose:()=>context.dispose() };
}

test('Parcours métier navigateur : affectation, zéro, rejet, correction, validation, clôture, publication et PDF',async({page})=>{
 test.setTimeout(240_000);
 const suffix=randomUUID().slice(0,8),adm=await actor('adm'),sec=await actor('sec'),dir=await actor('dir');
 const school=await adm.get('/school/bootstrap'),year=school.years.find((y:{code:string})=>y.code==='2026-2027');
 const period=year.periods.find((p:{profile:string;code:string})=>p.profile==='SECONDAIRE_TECHNIQUE'&&p.code==='P1');
 const schoolClass=await adm.post('/school/classes',{schoolYearId:year.id,code:`QA-${suffix}`,label:`Classe fictive QA ${suffix}`,cycle:'SECONDAIRE_TECHNIQUE',level:'7e EB',programVersion:'DEMO-V1.QA'});
 const sourceYear=school.years.find((y:{code:string})=>y.code==='DEMO-2025-2026');
 const sourceClass=sourceYear.classes.find((c:{code:string})=>c.code==='DEMO-LIVE');
 const programs=[];
 for(let index=0;index<2;index++)programs.push(await adm.post('/school/program',{classId:schoolClass.id,subjectId:sourceClass.subjects[index].subjectId,resultMaxScore:'20',componentMaxima:{P1:'20'},position:index+1,source:'DEMO_PROPOSE : parcours navigateur fictif'}));
 const pupils=[];
 for(let index=0;index<2;index++) {
  const pupil=await sec.post('/students/records',{matricule:`QA-${suffix}-${index+1}`,lastName:'Homonyme QA',postName:'Fictif',firstName:'Alex'});
  await sec.post(`/students/${pupil.id}/enrollments`,{classId:schoolClass.id,schoolYearId:year.id});pupils.push(pupil);
 }
 const assignments=await dir.get('/assignments'),createdAssignments=[];
 await login(page,'dir');await page.goto('/#affectations');await settled(page);
 await page.getByText('Nouvelle affectation',{exact:true}).click();
 await page.getByLabel('Classe de la nouvelle affectation',{exact:true}).selectOption(schoolClass.id);
 for(let index=0;index<2;index++) {
  const teacher=assignments.teachers.find((t:{userId:string})=>t.userId===credentials[`ens-demo-live-${index+1}`].id);
  await page.getByLabel('Enseignant',{exact:true}).selectOption(teacher.id);
  await page.getByLabel('Matière du programme',{exact:true}).selectOption(programs[index].id);
  await page.getByLabel('Début inclus',{exact:true}).fill(year.startsOn.slice(0,10));
  const saved=page.waitForResponse(r=>r.url().endsWith('/assignments')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Enregistrer',exact:true}).click();const response=await saved;expect(response.status()).toBe(201);createdAssignments.push(await response.json());
  await page.waitForLoadState('networkidle');
 }
 await capture(page,'W07-affectations-reelles');
 const updated=await adm.get('/school/bootstrap'),fresh=updated.years.find((y:{id:string})=>y.id===year.id).classes.find((c:{id:string})=>c.id===schoolClass.id);
 const classPeriod=fresh.classPeriods.find((cp:{periodId:string})=>cp.periodId===period.id);
 const evaluations=[];
 for(let index=0;index<2;index++) {
  await login(page,`ens-demo-live-${index+1}`);await page.goto(`/#evaluation?assignment=${createdAssignments[index].id}`);await settled(page);
  console.info(`Parcours local : création de l’évaluation ${index+1}.`);
  await page.getByLabel('Composant de résultat',{exact:true}).selectOption(classPeriod.id);
  await page.getByLabel('Intitulé',{exact:true}).fill(`Évaluation QA ${suffix}-${index}`);
  await page.getByLabel('Date',{exact:true}).fill(period.startsOn.slice(0,10));
  const created=page.waitForResponse(r=>r.url().endsWith('/evaluations')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Créer l’évaluation',exact:true}).click();const response=await created;expect(response.status()).toBe(201);const evaluation=await response.json();evaluations.push(evaluation);
  console.info(`Parcours local : grille ${index+1} créée.`);
  const inputs=page.locator('input.evaluations-score');await expect(inputs).toHaveCount(2);
  await inputs.nth(0).fill('21');await expect(inputs.nth(0)).toHaveAttribute('aria-invalid','true');
  await expect(page.getByRole('button',{name:'Enregistrer le brouillon'})).toBeDisabled();
  await inputs.nth(0).fill('0');await inputs.nth(1).fill('15');
  const saved=page.waitForResponse(r=>r.url().includes(`/evaluations/${evaluation.id}/grades`)&&r.request().method()==='PUT');
  await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();expect((await saved).status()).toBe(200);
  await page.reload();await expect(inputs.nth(0)).toHaveValue('0');
  await capture(page,'W16-zero-et-homonymes');
  await page.getByRole('button',{name:'Soumettre les notes',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Confirmation de soumission'})).toBeVisible();
  await capture(page,'W17-confirmation-reelle');
  const submitted=page.waitForResponse(r=>r.url().endsWith(`/evaluations/${evaluation.id}/submission`));
  await page.getByRole('button',{name:'Confirmer la soumission',exact:true}).click();expect((await submitted).status()).toBe(201);
 }
 await login(page,'dir');await page.goto('/#validation');await settled(page);
 await page.getByLabel('Période',{exact:true}).selectOption(period.id);await page.waitForLoadState('networkidle');
 await page.locator('.results-list article').filter({hasText:evaluations[0].title}).getByRole('button',{name:'Ouvrir',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Détail d’une soumission'})).toBeVisible();await capture(page,'W20-detail-reel');
 await page.getByRole('button',{name:'Rejeter avec motif',exact:true}).click();
 await page.getByLabel('Motif du rejet').fill('Vérifier la première note fictive.');
 await expect(page.locator('.leyisa-nav a[aria-current="page"]')).toHaveAttribute('href','#validation');
 await expect(page.locator('[data-route]')).toHaveAttribute('data-route','#rejet');
 await expect(page.getByLabel('Motif du rejet')).toHaveValue('Vérifier la première note fictive.');
 await expect(page.getByRole('button',{name:'Confirmer le rejet',exact:true})).toBeEnabled();await capture(page,'W21-rejet-reel');
 const rejected=page.waitForResponse(r=>r.url().endsWith('/reject')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Confirmer le rejet',exact:true}).click();expect((await rejected).status()).toBe(200);
 await login(page,'ens-demo-live-1');await page.goto(`/#corrections?id=${evaluations[0].id}`);
 await expect(page.locator('.evaluations-notice').filter({hasText:'Vérifier la première note fictive.'})).toBeVisible();
 await page.locator('input.evaluations-score').nth(0).fill('10');await capture(page,'W18-correction-reelle');
 await page.getByRole('button',{name:'Soumettre les notes',exact:true}).click();
 await page.getByRole('button',{name:'Confirmer la soumission',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Notes soumises'})).toBeVisible();
 await login(page,'dir');await page.goto('/#validation');await settled(page);await page.getByLabel('Période',{exact:true}).selectOption(period.id);
 for(const evaluation of evaluations) {
  await page.locator('.results-list article').filter({hasText:evaluation.title}).getByRole('button',{name:'Ouvrir',exact:true}).click();
  const approved=page.waitForResponse(r=>r.url().endsWith('/approve')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Accepter la soumission',exact:true}).click();expect((await approved).status()).toBe(200);
 }
 // Navigation volontaire avant la fin du rafraîchissement de validation : une réponse tardive ne doit pas reprendre la main.
 await page.goto('/#previsualisation');await settled(page);await expect(page.getByLabel('Période',{exact:true})).toHaveValue(period.id);
 await page.getByLabel('Classe-période',{exact:true}).selectOption(classPeriod.id);await page.getByRole('button',{name:'Vérifier',exact:true}).click();
 await expect(page.getByRole('button',{name:'Continuer vers clôture'})).toBeEnabled();await capture(page,'W22-avant-cloture');
 await page.getByRole('button',{name:'Continuer vers clôture'}).click();
 await expect(page.getByLabel('Je confirme la clôture de la période.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Confirmer la clôture',exact:true})).toBeDisabled();
 await page.getByLabel('Je confirme la clôture de la période.').check();
 await expect(page.locator('.leyisa-nav a[aria-current="page"]')).toHaveAttribute('href','#resultats');
 await expect(page.locator('[data-route]')).toHaveAttribute('data-route','#cloture');
 await expect(page.getByLabel('Je confirme la clôture de la période.')).toBeChecked();await capture(page,'W23-confirmation-reelle');
 const closed=page.waitForResponse(r=>r.url().endsWith(`/class-periods/${classPeriod.id}/close`)&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Confirmer la clôture',exact:true}).click();expect((await closed).status()).toBe(201);
 await expect(page.getByRole('button',{name:'Publier les résultats clôturés'})).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());
 const published=page.waitForResponse(r=>r.url().endsWith(`/class-periods/${classPeriod.id}/publish`)&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Publier les résultats clôturés'}).click();expect((await published).status()).toBe(200);
 await expect(page.getByRole('link',{name:/Bulletin de QA-/})).toHaveCount(2);await capture(page,'W24-publication-reelle');
 await page.getByRole('link',{name:/Bulletin de QA-/}).first().click();
 await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
 await expect(page.locator('.bulletin-dossier')).toContainText('Homonyme QA Fictif Alex');
 for(const pupil of pupils)await expect(page.getByLabel('Élève',{exact:true}).locator('option').filter({hasText:pupil.matricule})).toHaveCount(1);
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Télécharger PDF',exact:true}).click();
 const downloaded=await download;const bytes=await readFile((await downloaded.path())!);expect(bytes.subarray(0,5).toString()).toBe('%PDF-');
 await downloaded.saveAs(resolve(proofs,'bulletin-parcours-navigateur.pdf'));await capture(page,'W25-parcours-reel');
 await adm.dispose();await sec.dispose();await dir.dispose();
});
