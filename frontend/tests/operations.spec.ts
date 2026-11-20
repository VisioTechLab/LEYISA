import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

const credentials=JSON.parse(await readFile(process.env.LEYISA_E2E_CREDENTIALS!,'utf8'));
async function login(page:Page,role:string){
 await page.goto('/');await page.getByLabel('Identifiant',{exact:true}).or(page.getByRole('button',{name:'Déconnexion',exact:true})).waitFor();
 if(await page.getByRole('button',{name:'Déconnexion',exact:true}).isVisible())await page.getByRole('button',{name:'Déconnexion',exact:true}).click();
 await page.getByLabel('Identifiant',{exact:true}).fill(credentials[role].login);
 await page.getByLabel('Mot de passe',{exact:true}).fill(credentials[role].password);
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await expect(page.getByRole('button',{name:'Déconnexion',exact:true})).toBeVisible();
}
test('Enseignant → Affectations : conserver la personne et préremplir la création',async({page})=>{
 await login(page,'dir');
 const data=await(await page.request.get('/api/v1/assignments')).json();
 const teacher=data.teachers.find((t:any)=>t.user.loginEnabled);
 const school=await(await page.request.get('/api/v1/school/bootstrap')).json();
 const schoolClass=school.years.flatMap((y:any)=>y.classes).find((c:any)=>c.subjects.length>0);
 expect(data.candidates.every((c:any)=>!data.teachers.some((t:any)=>t.user.id===c.id))).toBeTruthy();
 await page.goto('/#enseignants');await page.getByLabel('Rechercher',{exact:true}).fill(`${teacher.user.lastName} ${teacher.user.firstName}`);
 await page.getByRole('row').filter({hasText:`${teacher.user.lastName} ${teacher.user.firstName}`}).getByRole('link',{name:'Affectations',exact:true}).click();
 await expect(page.getByLabel('Enseignant affiché',{exact:true})).toHaveValue(teacher.id);
 expect(new URL(page.url()).hash).toContain(`teacher=${teacher.id}`);
 await page.getByText('Nouvelle affectation',{exact:true}).click();
 await page.getByLabel('Classe de la nouvelle affectation',{exact:true}).selectOption(schoolClass.id);
 await expect(page.getByLabel('Enseignant',{exact:true})).toHaveValue(teacher.id);
 await page.reload();await expect(page.getByLabel('Enseignant affiché',{exact:true})).toHaveValue(teacher.id);
});

test('Création réelle : compte ENS inactif, activation ADM puis profil enseignant DIR sans doublon',async({page})=>{
 await login(page,'adm');await page.goto('/#comptes');
 const suffix=randomUUID().slice(0,8),loginName=`qa-operations-${suffix}@demo.test`,lastName=`Fictif QA ${suffix}`;
 await page.getByText('Nouveau compte',{exact:true}).click();
 await page.getByLabel('Identifiant',{exact:true}).fill(loginName);
 await page.getByLabel('Nom',{exact:true}).fill(lastName);
 await page.getByLabel('Prénom',{exact:true}).fill('Enseignant');
 await page.getByLabel('Mot de passe initial (12 caractères minimum)',{exact:true}).fill(randomUUID());
 await page.getByLabel('Rôle initial',{exact:true}).selectOption('ENS');
 const saved=page.waitForResponse(r=>r.url().endsWith('/users')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
 const response=await saved;expect(response.status()).toBe(201);const user=await response.json();
 const row=page.getByRole('row').filter({hasText:loginName});
 // La liste des comptes est paginée ; parcourir les pages visibles si nécessaire.
 for(let n=0;n<10;n++){
  await expect(page.getByRole('status').filter({hasText:'Chargement'})).toHaveCount(0);
  if(await row.count())break;
  const next=page.getByRole('button',{name:'Suivant',exact:true});if(!await next.isEnabled())break;await next.click();await page.waitForLoadState('networkidle');
 }
 await expect(row).toContainText('Inactif');await row.getByRole('button',{name:'Ouvrir',exact:true}).click();
 await page.getByLabel('Statut',{exact:true}).selectOption('true');
 await page.getByRole('button',{name:'Modifier le statut',exact:true}).click();await expect(row).toContainText('Actif');
 await login(page,'dir');await page.goto('/#enseignants');await page.getByText('Nouvel enseignant',{exact:true}).click();
 await page.getByLabel('Compte ENS actif',{exact:true}).selectOption(user.id);
 await page.getByLabel('Matricule enseignant',{exact:true}).fill(`QA-${suffix}`);
 const profile=page.waitForResponse(r=>r.url().endsWith('/assignments/teachers')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();expect((await profile).status()).toBe(201);
 await expect(page.getByLabel('Compte ENS actif',{exact:true}).locator(`option[value="${user.id}"]`)).toHaveCount(0);
 await page.getByLabel('Rechercher',{exact:true}).fill(lastName);
 await expect(page.getByRole('row').filter({hasText:lastName})).toContainText(`QA-${suffix}`);
});

function course(cycle='SECONDAIRE_TECHNIQUE'){
 const period=(id:string,kind:string,start:string,end:string,extra:Record<string,unknown>={})=>({id,closedAt:null,period:{code:id,kind,profile:cycle,label:`Composant fictif ${id}`,startsOn:`${start}T00:00:00.000Z`,endsOn:`${end}T00:00:00.000Z`},...extra});
 return {id:'cours-fictif',startsOn:'2025-10-01T00:00:00.000Z',endsOn:'2025-11-01T00:00:00.000Z',classSubject:{subject:{label:'Matière fictive'},schoolClass:{label:'Classe fictive',cycle,classPeriods:[
  period('P1','PERIODE','2025-09-01','2025-10-31'),
  period('FERME','PERIODE','2025-10-01','2025-10-31',{closedAt:'2025-11-01'}),
  period('HORS-AFFECTATION','PERIODE','2025-09-01','2025-09-30'),
  period('E1','EXAMEN','2025-10-10','2025-10-20'),
  period('S1','SEMESTRE','2025-09-01','2025-12-31'),
  {id:'HISTORIQUE',closedAt:null,period:{code:'P1',kind:'PERIODE',profile:'HISTORIQUE',startsOn:'2025-10-01',endsOn:'2025-10-31'}}
 ]}}};
}
test('Création : composants ouverts compatibles, dates bornées et aucun agrégat/historique',async({page})=>{
 await login(page,'ens');await page.route('**/api/v1/assignments/mine',r=>r.fulfill({json:[course()]}));
 await page.goto('/#evaluation?assignment=cours-fictif');
 const component=page.getByLabel('Composant de résultat',{exact:true});
 await expect(component.locator('option')).toHaveCount(2);
 await component.selectOption('P1');
 await expect(page.getByLabel('Date',{exact:true})).toHaveAttribute('min','2025-10-01');
 await expect(page.getByLabel('Date',{exact:true})).toHaveAttribute('max','2025-10-31');
 await page.getByLabel('Type',{exact:true}).selectOption('EXAMEN');await expect(component).toHaveValue('');
 await expect(component.locator('option')).toHaveCount(2);await component.selectOption('E1');
 await expect(page.getByLabel('Date',{exact:true})).toHaveAttribute('min','2025-10-10');
 await expect(page.getByLabel('Date',{exact:true})).toHaveAttribute('max','2025-10-20');
 await page.getByLabel('Type',{exact:true}).selectOption('REPECHAGE');
 await expect(page.getByText(/Aucune période ouverte compatible/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Créer l’évaluation',exact:true})).toHaveCount(0);
});
test('Création maternelle : appréciations uniquement, sans barème numérique imposé',async({page})=>{
 await login(page,'ens');await page.route('**/api/v1/assignments/mine',r=>r.fulfill({json:[course('MATERNEL')]}));
 await page.goto('/#evaluation?assignment=cours-fictif');
 await expect(page.getByLabel('Type',{exact:true}).locator('option')).toHaveCount(1);
 await expect(page.getByLabel('Type',{exact:true})).toHaveValue('APPRECIATION');
 await expect(page.getByLabel('Barème maximum (hors appréciation)',{exact:true})).toHaveCount(0);
});
test('Lien vers une évaluation absente : erreur explicite sans ouvrir un autre dossier',async({page})=>{
 await login(page,'ens');
 const id='00000000-0000-4000-8000-000000000099';
 await page.route(`**/api/v1/evaluations/${id}`,r=>r.fulfill({status:404,json:{message:'Évaluation introuvable dans votre périmètre.'}}));
 await page.goto(`/#notes?id=${id}`);
 await expect(page.getByRole('alert')).toContainText('Évaluation introuvable dans votre périmètre.');
 await expect(page.locator('.evaluations-context')).toHaveCount(0);
 await expect(page.locator('input.evaluations-score')).toHaveCount(0);
 expect(new URL(page.url()).hash).toContain(id);
});
