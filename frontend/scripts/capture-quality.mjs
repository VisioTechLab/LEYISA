import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const origin = process.env.LEYISA_E2E_ORIGIN ?? 'http://127.0.0.1:5176';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw Error('Capture locale uniquement.');
const credentials = JSON.parse(await readFile(process.env.LEYISA_E2E_CREDENTIALS, 'utf8'));
const destination = resolve(process.env.LEYISA_E2E_PROOFS);
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/google/chrome/chrome', args: ['--no-sandbox'] });
const report = [];
const groups = {
 adm: [['D-ADM','accueil'],['W02','comptes'],['W03','scolarite'],['W04','classes'],['W05','programme'],['W26','audit']],
 sec: [['D-SEC','accueil'],['W08','eleves'],['W09','dossier'],['W10','historique'],['W11','inscription'],['W12','bulletins'],['W25','bulletin'],['W27','acces']],
 ens: [['D-ENS','accueil'],['W13','cours'],['W14','evaluations'],['W15','evaluation'],['W16','notes'],['W17','soumission'],['W18','corrections']],
 dir: [['D-DIR','accueil'],['W06','enseignants'],['W07','affectations'],['W19','validation'],['W20','detail-soumission'],['W21','rejet'],['W22','previsualisation'],['W23','cloture'],['W24','resultats']],
};
try {
 const login = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
 await login.goto(origin); await login.getByLabel('Identifiant',{exact:true}).waitFor();
 await login.screenshot({ path: resolve(destination,'W01.png'), fullPage:true }); await login.close();
 for (const [role, routes] of Object.entries(groups)) {
  const context = await browser.newContext({ viewport: { width:1440, height:1080 } });
  const page = await context.newPage();
  await page.goto(origin);
  await page.getByLabel('Identifiant',{exact:true}).fill(credentials[role].login);
  await page.getByLabel('Mot de passe',{exact:true}).fill(credentials[role].password);
  await page.getByRole('button',{name:'Se connecter',exact:true}).click();
  await page.getByRole('button',{name:'Déconnexion',exact:true}).waitFor();
  for (const [screen, route] of routes) {
   const errors = [];
   const listener = error => errors.push(error.message); page.on('pageerror',listener);
   await page.goto(`${origin}/#${route}`);
   await page.locator(`.leyisa-nav a[aria-current="page"][href="#${route}"]`).waitFor();
   await page.locator('main h1').waitFor();
   await page.waitForFunction(()=>![...document.querySelectorAll('[role="status"]')].some(node=>/Chargement|Vérification de la session|Ouverture du lecteur/.test(node.textContent??'')));
   await page.waitForLoadState('networkidle');
   if (route.startsWith('bulletin') && !(await page.locator('.document-preview').count())) await page.locator('canvas[data-rendered="true"], .bulletin-empty, .bulletin-error').first().waitFor({timeout:15000}).catch(()=>{});
   await page.screenshot({path:resolve(destination,`${screen}.png`),fullPage:true});
   report.push({screen,role,route,heading:await page.locator('main h1').innerText(),errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
   page.off('pageerror',listener);
  }
  await context.close();
 }
 await writeFile(resolve(destination,'captures.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`${report.length+1} captures enregistrées ; ${report.filter(r=>r.errors.length).length} écran(s) avec erreur JavaScript.`);
} finally { await browser.close(); }
