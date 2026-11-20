import {test,expect,type Page} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const credentials=JSON.parse(await readFile(process.env.LEYISA_E2E_CREDENTIALS!,'utf8'));
const proofs=resolve(process.env.LEYISA_E2E_PROOFS??'../docs/preuves-espaces-v1/apres');
const menus={adm:['Accueil','Comptes utilisateurs','Configuration scolaire','Classes et programmes','Audit'],sec:['Accueil','Élèves','Inscriptions','Bulletins'],ens:['Accueil','Mes classes et cours','Mes évaluations','Mes soumissions'],dir:['Accueil','Enseignants et affectations','Validation des notes','Résultats','Bulletins']};
async function loaded(page:Page){await page.locator('main h1').waitFor();await expect(page.getByRole('status').filter({hasText:/Chargement|Vérification de la session/})).toHaveCount(0);await page.waitForLoadState('networkidle');}
async function login(page:Page,role:string){await page.goto('/');await page.getByLabel('Identifiant',{exact:true}).fill(credentials[role].login);await page.getByLabel('Mot de passe',{exact:true}).fill(credentials[role].password);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await expect(page.getByRole('button',{name:'Déconnexion',exact:true})).toBeVisible();await loaded(page);}
async function json(page:Page,path:string,role?:string){const r=await page.request.get(`/api/v1${path}`,{headers:role?{'X-Leyisa-Role':role}:{}});expect(r.status()).toBe(200);return r.json();}
test.beforeAll(async()=>{await mkdir(proofs,{recursive:true});});
for(const [role,menu] of Object.entries(menus))test(`Espace ${role} : accueil, menu exclusif, données API et téléphone`,async({page})=>{
 test.setTimeout(120_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page,role);
 const nav=page.getByRole('navigation',{name:'Navigation principale'});await expect(nav.locator('a')).toHaveText(menu);await expect(page.locator('#session-role')).toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0);
 expect((await json(page,'/auth/me')).user.roles).toEqual([role.toUpperCase()]);
 if(role==='sec')await expect(page.locator('.leyisa-stats')).toContainText(String((await json(page,'/students?pagination=1')).total));
 if(role==='ens'){const courses=await json(page,'/assignments/mine'),evaluations=await json(page,'/evaluations');expect(evaluations.every((e:any)=>courses.some((c:any)=>c.id===e.assignmentId))).toBeTruthy();}
 if(role==='dir'){const contexts=await json(page,'/results/class-periods');await expect(page.locator('.leyisa-stats')).toContainText(String(contexts.filter((c:any)=>c.status==='PUBLISHED').reduce((n:number,c:any)=>n+c.resultCount,0)));}
 await page.screenshot({path:resolve(proofs,`${role}-accueil.png`),fullPage:true});await writeFile(resolve(proofs,`${role}-navigation.json`),JSON.stringify({role,menu,heading:await page.locator('main h1').innerText(),singleRoleSelector:false},null,2)+'\n');
 const targets=await nav.locator('a').evaluateAll(links=>links.map(a=>a.getAttribute('href')!));
 for(const target of targets){await page.goto(`/${target}`);await loaded(page);await expect(page.getByRole('alert')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 await page.goto('/#accueil');await loaded(page);
 for(const width of [390,320]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await expect(nav).toBeHidden();await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();await expect(nav.locator('a')).toHaveText(menu);if(width===390)await page.screenshot({path:resolve(proofs,`${role}-menu-mobile.png`),fullPage:true});await page.getByRole('button',{name:'Fermer le menu',exact:true}).click();}expect(errors).toEqual([]);
});
test('Multirôle : uniquement ENS/DIR, périmètre actif et refus serveur d’ADM',async({page})=>{
 await login(page,'multi');const select=page.getByLabel('Rôle actif',{exact:true});await expect(select.locator('option')).toHaveCount(2);expect((await select.locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value))).sort()).toEqual(['DIR','ENS']);
 await select.selectOption('ENS');await loaded(page);await expect(page.locator('.leyisa-nav a')).toHaveText(menus.ens);
 const own=await json(page,'/assignments/mine','ENS'),evaluations=await json(page,'/evaluations','ENS');expect(evaluations.every((e:any)=>own.some((a:any)=>a.id===e.assignmentId))).toBeTruthy();
 expect((await page.request.get('/api/v1/results/submissions',{headers:{'X-Leyisa-Role':'ENS'}})).status()).toBe(403);expect((await page.request.get('/api/v1/school/bootstrap',{headers:{'X-Leyisa-Role':'ADM'}})).status()).toBe(403);
 await select.selectOption('DIR');await loaded(page);await expect(page.locator('.leyisa-nav a')).toHaveText(menus.dir);await expect(page.locator('[data-route]')).toHaveAttribute('data-route','#accueil');await page.screenshot({path:resolve(proofs,'multirole-direction.png'),fullPage:true});
});
test('Secrétariat : total réel, pagination et formulaire sur demande',async({page})=>{
 await login(page,'sec');await page.goto('/#eleves');await loaded(page);const result=await json(page,'/students?pagination=1');await expect(page.locator('.table-footnote')).toContainText(`sur ${result.total}`);await expect(page.locator('.student-registration-form')).toBeHidden();await expect(page.locator('.student-table tbody tr')).toHaveCount(Math.min(50,result.total));
 if(result.total>50){await page.getByRole('button',{name:'Suivant',exact:true}).click();await loaded(page);await expect(page.locator('.student-table tbody tr')).toHaveCount(Math.min(50,result.total-50));await page.getByRole('button',{name:'Précédent',exact:true}).click();await loaded(page);}
 await page.getByText('Créer un dossier et une inscription ensemble',{exact:true}).click();await expect(page.locator('.student-registration-form')).toBeVisible();await page.getByText('Créer un dossier et une inscription ensemble',{exact:true}).click();await page.screenshot({path:resolve(proofs,'sec-eleves.png'),fullPage:true});
});
test('Résultats et bulletins : toutes les périodes avant un choix explicite',async({page})=>{
 await login(page,'dir');await page.goto('/#validation');await loaded(page);await expect(page.getByLabel('Période',{exact:true})).toHaveValue('');expect(await page.locator('.results-list article').count()).toBe(Math.min(15,(await json(page,'/results/submissions')).length));
 await page.goto('/#resultats');await loaded(page);await expect(page.getByLabel('Période',{exact:true})).toHaveValue('');await expect(page.getByRole('heading',{name:'Résultats par classe et période'})).toBeVisible();await page.screenshot({path:resolve(proofs,'dir-resultats.png'),fullPage:true});
 await page.goto('/#bulletins');await loaded(page);for(const label of ['Année scolaire','Classe','Période ou session'])await expect(page.getByLabel(label,{exact:true})).toHaveValue('');await expect(page.locator('.bulletin-selection')).toContainText(`${(await json(page,'/bulletins')).length} résultats publiés`);await expect(page.locator('canvas[data-rendered="true"],.bulletin-empty h3').first()).toBeVisible();await page.screenshot({path:resolve(proofs,'dir-bulletins.png'),fullPage:true});
});
test('Erreur réseau : alerte explicite, sans faux état vide',async({page})=>{
 await login(page,'sec');await page.route('**/api/v1/students?pagination=*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Service élèves momentanément indisponible.'})}));await page.goto('/#eleves');await expect(page.getByRole('alert')).toContainText('Service élèves momentanément indisponible.');await expect(page.getByText('Aucun élève disponible.',{exact:true})).toHaveCount(0);
});
test('Serveur indisponible : la vérification de session propose une reprise sans faux formulaire de connexion',async({page})=>{
 await page.route('**/api/v1/auth/me',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Service momentanément indisponible.'})}));await page.goto('/');await expect(page.getByRole('alert')).toContainText('Service momentanément indisponible.');await expect(page.getByLabel('Identifiant',{exact:true})).toHaveCount(0);await page.unroute('**/api/v1/auth/me');await page.getByRole('button',{name:'Réessayer',exact:true}).click();await expect(page.getByLabel('Identifiant',{exact:true})).toBeVisible();
});
