import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const credentialPath = process.env.LEYISA_E2E_CREDENTIALS;
if (!credentialPath) throw new Error('LEYISA_E2E_CREDENTIALS doit désigner le fichier privé du seed local.');
const credentials = JSON.parse(await readFile(credentialPath, 'utf8'));
const proofs = resolve(process.env.LEYISA_E2E_PROOFS ?? '../docs/preuves-quality-recovery');
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

async function login(page: Page, role = 'sec') {
  await page.goto('/');
  await page.getByLabel('Identifiant', { exact: true }).fill(credentials[role].login);
  await page.getByLabel('Mot de passe', { exact: true }).fill(credentials[role].password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Déconnexion', exact: true })).toBeVisible();
}
async function choose(page: Page, classLabel: string, period: string, pupil = 'Élève 2') {
  await page.goto('/#bulletin');
  await page.getByLabel('Classe', { exact: true }).selectOption({ label: classLabel });
  await page.getByLabel('Période ou session', { exact: true }).selectOption(period);
  const option = page.getByLabel('Élève', { exact: true }).locator('option').filter({ hasText: pupil });
  await page.getByLabel('Élève', { exact: true }).selectOption(await option.first().getAttribute('value') as string);
}
async function ready(page: Page) {
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  await expect(page.getByTestId('pdf-viewer')).toHaveAttribute('aria-busy', 'false');
}
async function downloaded(page: Page) {
  const event = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Télécharger PDF', exact: true }).click();
  const download = await event;
  const path = await download.path();
  expect(path).toBeTruthy();
  return { bytes: await readFile(path!), download };
}
test.beforeAll(async () => { await mkdir(proofs, { recursive: true }); });

const models = [
  { label: 'maternelle', schoolClass: 'Classe maternelle DEMO', period: 'ANNEE', pupil: 'Élève 2', text: 'D1', filename: 'maternel' },
  { label: 'primaire annuel', schoolClass: 'Classe primaire DEMO', period: 'ANNEE', pupil: 'Élève 2', text: '1800', filename: 'primaire-annuel' },
  { label: 'secondaire P1', schoolClass: '7e CTEB — référence P1', period: 'P1', pupil: 'Élève 1', text: '400', filename: 'secondaire-P1' },
  { label: 'secondaire annuel', schoolClass: 'Classe secondaire DEMO', period: 'ANNEE', pupil: 'Élève 2', text: '1140', filename: 'secondaire-annuel' },
  { label: 'repêchage', schoolClass: 'Classe secondaire DEMO', period: 'REPECHAGE', pupil: 'Élève 1', text: 'TOTAL:40/1520', filename: 'repechage' },
];

for (const model of models) test(`PDF ${model.label} : aperçu et téléchargement identiques`, async ({ page }) => {
  const pdfs: Buffer[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', async response => {
    if (response.url().includes('/pdf?') && response.ok()) pdfs.push(await response.body().catch(() => Buffer.alloc(0)));
  });
  await login(page);
  await choose(page, model.schoolClass, model.period, model.pupil);
  await ready(page);
  await expect.poll(async () => (await page.getByTestId('pdf-text').innerText()).replace(/\s/g, '')).toContain(model.text.replace(/\s/g, ''));
  const { bytes, download } = await downloaded(page);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdfs.some(pdf => digest(pdf) === digest(bytes))).toBeTruthy();
  await download.saveAs(resolve(proofs, `bulletin-${model.filename}.pdf`));
  if (model.filename === 'secondaire-annuel') {
    await page.screenshot({ path: resolve(proofs, 'W25-desktop.png'), fullPage: true });
    const emitted = page.waitForResponse(response => response.url().endsWith('/generate') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Enregistrer l’émission', exact: true }).click();
    expect((await emitted).status()).toBe(201);
    await expect(page.getByRole('status').filter({ hasText: 'Émission enregistrée.' })).toBeVisible();
    await page.reload(); await ready(page);
    expect(await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length)).toBe(0);
  }
  expect(errors).toEqual([]);
});

test('Primaire P1 : aucun document sans les notes de la période sélectionnée', async ({ page }) => {
  await login(page); await choose(page, 'Classe primaire DEMO', 'P1');
  await expect(page.getByRole('heading', { name: 'Choisissez une synthèse trimestrielle' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Télécharger PDF', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enregistrer l’émission' })).toBeDisabled();
  await page.getByLabel('Période ou session', { exact: true }).selectOption('T1'); await ready(page);
});

test('Refus PDF403 visible, aucun téléchargement trompeur et reprise après erreur', async ({ page }) => {
  await login(page);
  await page.route('**/api/v1/bulletins/*/pdf?*', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Accès au document refusé.' }) }));
  await choose(page, 'Classe secondaire DEMO', 'ANNEE');
  await expect(page.getByRole('alert')).toContainText('Accès au document refusé.');
  await expect(page.getByRole('link', { name: 'Télécharger PDF', exact: true })).toHaveCount(0);
  await page.unroute('**/api/v1/bulletins/*/pdf?*');
  await page.getByRole('button', { name: 'Recharger le PDF' }).click(); await ready(page);
});

test('Les versions archivées affichent et téléchargent le même document', async ({ page }) => {
  await login(page); await choose(page, 'Classe secondaire DEMO', 'ANNEE'); await ready(page);
  await page.getByText('Versions archivées', { exact: true }).click();
  await page.getByLabel('Version du document', { exact: true }).selectOption('DEMO-V1.4'); await ready(page);
  const { bytes, download } = await downloaded(page);
  expect(download.suggestedFilename()).toContain('DEMO-V1.4'); expect(bytes.length).toBeGreaterThan(10000);
  await page.getByLabel('Version du document', { exact: true }).selectOption('DEMO-V1.6'); await ready(page);
  const current = await downloaded(page); expect(digest(current.bytes)).not.toBe(digest(bytes));
});

test('Repêchage V1.5 archivé : octets antérieurs conservés ; V1.6 affiche les40 points', async ({ page }) => {
  const original = await readFile(process.env.LEYISA_E2E_ARCHIVE_V15 ?? resolve('../docs/preuves-quality-recovery/archive-repechage-v15.pdf'));
  await login(page); await choose(page, 'Classe secondaire DEMO', 'REPECHAGE', 'Élève 1'); await ready(page);
  await expect.poll(async () => (await page.getByTestId('pdf-text').innerText()).replace(/\s/g, '')).toContain('TOTAL:40/1520');
  await page.getByText('Versions archivées', { exact: true }).click();
  await page.getByLabel('Version du document', { exact: true }).selectOption('DEMO-V1.5'); await ready(page);
  const old = await downloaded(page); expect(digest(old.bytes)).toBe(digest(original));
});

test('Téléphone390px et320px : PDF lisible au zoom sans débordement de la page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await login(page);
  await choose(page, 'Classe secondaire DEMO', 'ANNEE'); await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: resolve(proofs, 'W25-mobile-390.png'), fullPage: true });
  await page.getByLabel('Zoom du document').selectOption('125'); await ready(page);
  expect(await page.locator('.bulletin-pdf-sheet').evaluate(element => element.scrollWidth > element.clientWidth)).toBeTruthy();
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByLabel('Zoom du document').selectOption('fit'); await ready(page);
  await page.screenshot({ path: resolve(proofs, 'W25-mobile-320.png'), fullPage: true });
});

test('ENS : accès direct au bulletin refusé par la vue et par l’API', async ({ page }) => {
  await login(page, 'ens'); await page.goto('/#bulletin');
  await expect(page.getByRole('heading', { name: 'Accès refusé ou conflit' })).toBeVisible();
  const response = await page.request.get('/api/v1/bulletins'); expect(response.status()).toBe(403);
});

test('Liste vide : explication et retour utiles sans formulaire ni faux document', async ({ page }) => {
  await login(page);
  await page.route('**/api/v1/bulletins', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/#bulletin');
  await expect(page.getByRole('heading', { name: 'Aucun bulletin publié' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Retour à l’accueil' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Télécharger PDF', exact: true })).toHaveCount(0);
});

test('Chargement PDF : état explicite et émission indisponible tant que le document manque', async ({ page }) => {
  await login(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/bulletins/*/pdf?*', async route => { await gate; await route.continue(); });
  await choose(page, 'Classe secondaire DEMO', 'ANNEE');
  await expect(page.getByRole('status', { name: '', exact: true }).filter({ hasText: 'Chargement du document PDF' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enregistrer l’émission' })).toBeDisabled();
  release(); await ready(page);
});

test('Conflit409 d’émission : erreur visible, aucun message de succès et PDF conservé', async ({ page }) => {
  await login(page); await choose(page, 'Classe secondaire DEMO', 'ANNEE'); await ready(page);
  await page.route('**/api/v1/bulletins/*/generate', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'Publication modifiée, rechargez le bulletin.' }) }));
  await page.getByRole('button', { name: 'Enregistrer l’émission' }).click();
  await expect(page.getByRole('alert')).toContainText('Publication modifiée');
  await expect(page.getByRole('status').filter({ hasText: 'Émission enregistrée.' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Télécharger PDF', exact: true })).toBeVisible();
});

test('PDF paginé : toutes les pages sont navigables et les boutons respectent les bornes', async ({ page }) => {
  const path = process.env.LEYISA_E2E_PAGINATED;
  if (!path) throw new Error('LEYISA_E2E_PAGINATED doit désigner le PDF long généré par la recette backend.');
  await login(page);
  await page.route('**/api/v1/bulletins/*/pdf?*', route => route.fulfill({ status: 200, contentType: 'application/pdf', path }));
  await choose(page, 'Classe secondaire DEMO', 'ANNEE'); await ready(page);
  await expect(page.getByRole('button', { name: 'Page précédente', exact: true })).toBeDisabled();
  let pages = 1;
  while (await page.getByRole('button', { name: 'Page suivante', exact: true }).isEnabled()) {
    await page.getByRole('button', { name: 'Page suivante', exact: true }).click(); await ready(page); pages++;
    expect(pages).toBeLessThan(30);
  }
  expect(pages).toBeGreaterThan(1);
  await expect(page.getByRole('img', { name: `Page ${pages} du bulletin scolaire`, exact: true })).toBeVisible();
});

test.afterAll(async () => {
  await writeFile(resolve(proofs, 'portee-tests.txt'), 'Recette locale réelle : cinq modèles PDF, identité des octets aperçu/téléchargement, émission, rechargement, version historique,403, primaire P1 non proposé, mobile390/320. Aucun test contre la production.\n');
});

test('W12 : vrai PDF, recherche par matricule et conservation W12/W25/retour/rechargement', async ({ page }) => {
  await login(page); await choose(page, 'Classe secondaire DEMO', 'ANNEE', 'Élève 2'); await ready(page);
  const selected = await page.getByLabel('Élève', { exact: true }).inputValue();
  const matricule = await page.locator('.bulletin-dossier dd').first().innerText();
  await page.getByRole('link', { name: 'Tous les bulletins', exact: true }).click(); await ready(page);
  await expect(page.getByLabel('Élève', { exact: true })).toHaveValue(selected);
  await expect(page.getByLabel('Classe', { exact: true })).toHaveValue('Classe secondaire DEMO');
  await expect(page.getByRole('heading', { name: 'Bulletins disponibles', exact: true })).toBeVisible();
  await expect(page.locator('.document-preview')).toHaveCount(0);
  await expect(page.getByLabel('Élève', { exact: true }).locator('option').filter({ hasText: matricule })).toHaveCount(1);
  await page.getByLabel('Rechercher un élève', { exact: true }).fill(matricule.toLowerCase());
  const result = page.waitForResponse(response => response.url().includes('/bulletins?search='));
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click(); expect((await result).status()).toBe(200);
  await expect(page.locator('.bulletin-catalog li')).toHaveCount(1);
  await expect(page.locator('.bulletin-catalog')).toContainText(matricule);
  await page.getByLabel('Rechercher un élève', { exact: true }).fill('IntrouvableFictif');
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Aucun résultat dans cette classe' })).toBeVisible();
  await expect(page.getByLabel('Élève', { exact: true })).toHaveValue(selected);
  await ready(page);
  await page.screenshot({ path: resolve(proofs, 'W12-recherche-vide-dossier-conserve.png'), fullPage: true });
  await page.getByRole('button', { name: 'Effacer la recherche' }).click();
  await page.screenshot({ path: resolve(proofs, 'W12-desktop.png'), fullPage: true });
  const displayed = await downloaded(page);
  await page.getByRole('link', { name: 'Préparer la remise' }).click(); await ready(page);
  await expect(page.getByLabel('Élève', { exact: true })).toHaveValue(selected);
  expect(digest((await downloaded(page)).bytes)).toBe(digest(displayed.bytes));
  await page.goBack(); await ready(page);
  await expect(page.getByLabel('Élève', { exact: true })).toHaveValue(selected);
  await page.reload(); await ready(page);
  await expect(page.getByLabel('Élève', { exact: true })).toHaveValue(selected);
});

test('API directe : primaire P1 refusé pour PDF, archive incompatible et émission sans nouvel enregistrement', async ({ page }) => {
  await login(page); await choose(page, 'Classe primaire DEMO', 'P1');
  await expect(page.getByRole('heading', { name: 'Choisissez une synthèse trimestrielle' })).toBeVisible();
  const id = await page.getByLabel('Élève', { exact: true }).inputValue();
  const before = await (await page.request.get(`/api/v1/bulletins/${id}`)).json();
  for (const suffix of ['/pdf', '/pdf?templateVersion=DEMO-V1.7']) {
    const response = await page.request.get(`/api/v1/bulletins/${id}${suffix}`); expect(response.status()).toBe(409);
    expect(response.headers()['content-type']).not.toContain('application/pdf');
  }
  const emission = await page.evaluate(async resultId => {
    const { csrfToken } = await (await fetch('/api/v1/auth/csrf')).json();
    return (await fetch(`/api/v1/bulletins/${resultId}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: '{}' })).status;
  }, id);
  expect(emission).toBe(409);
  const after = await (await page.request.get(`/api/v1/bulletins/${id}`)).json();
  expect(after.archivedTemplates).toEqual(before.archivedTemplates);
});

test('Lien direct hors première liste : le dossier reste accessible sans filtre implicite', async ({ page }) => {
 await login(page);
 const rows = await (await page.request.get('/api/v1/bulletins')).json();
 const selected = rows.find((row: { identitySnapshot: { classLabel: string; periodCode: string; matricule: string } }) => row.identitySnapshot.classLabel === 'Classe secondaire DEMO' && row.identitySnapshot.periodCode === 'ANNEE' && row.identitySnapshot.matricule.endsWith('-2'));
 expect(selected).toBeTruthy();
 // Simule uniquement la limite de liste : détail, permissions et PDF restent réels.
 await page.route('**/api/v1/bulletins', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows.filter((row: { identitySnapshot: { classLabel: string } }) => row.identitySnapshot.classLabel !== selected.identitySnapshot.classLabel)) }));
 await page.goto(`/#bulletin?result=${selected.id}`); await ready(page);
 await expect(page.getByLabel('Élève', { exact: true })).toHaveValue(selected.id);
 await expect(page.getByLabel('Classe', { exact: true })).toHaveValue('');
 await expect(page.getByLabel('Année scolaire', { exact: true })).toHaveValue('');
 await expect(page.getByLabel('Période ou session', { exact: true })).toHaveValue('');
 await expect(page.locator('.bulletin-dossier')).toContainText(selected.identitySnapshot.matricule);
 const file = await downloaded(page); expect(file.download.suggestedFilename()).toContain(selected.identitySnapshot.matricule);
});
