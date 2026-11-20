import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const origin=process.env.LEYISA_E2E_ORIGIN??'http://127.0.0.1:5176';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Recette locale uniquement.');
const credentials=JSON.parse(await readFile(process.env.LEYISA_E2E_CREDENTIALS,'utf8'));
const directory=resolve(process.env.LEYISA_E2E_PROOFS??'../docs/preuves-espaces-v1/apres');await mkdir(directory,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/opt/google/chrome/chrome',args:['--no-sandbox']});
try{for(const role of ['adm','sec','ens','dir']){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 await page.goto(origin);await page.getByLabel('Identifiant',{exact:true}).fill(credentials[role].login);await page.getByLabel('Mot de passe',{exact:true}).fill(credentials[role].password);await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await page.getByRole('button',{name:'Déconnexion',exact:true}).waitFor();await page.waitForLoadState('networkidle');await page.screenshot({path:resolve(directory,`${role}-accueil.png`),fullPage:true});
 await writeFile(resolve(directory,`${role}-navigation.json`),JSON.stringify({role,heading:await page.locator('main h1').innerText(),menu:await page.locator('.leyisa-nav a').allTextContents()},null,2)+'\n');await context.close();
}}finally{await browser.close();}
