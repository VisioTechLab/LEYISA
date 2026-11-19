import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { prepareBulletin } from '../dist/modules/bulletins/bulletin-data.js';
import { renderSecondary } from '../dist/modules/bulletins/secondary-bulletin.js';

const current = new Date('2026-05-31T00:00:00Z');
const later = new Date('2026-06-01T00:00:00Z');
const enrollmentId = 'inscription-fictive';
const names = Array.from({ length: 48 }, (_, index) =>
  `Matière ${String(index + 1).padStart(2, '0')} — Études interdisciplinaires, géographie, éthique et recherches expérimentales approfondies — Repère-final-${String(index + 1).padStart(2, '0')}`);
const longName = 'Éléonore-Fictive-aux-accents-préservés Mwali-démo Nomextrêmementlongsansaucuneespacedanslemotfinal';
const permanentNumber = '01234567890';
const identity = { enrollmentId, permanentNumber, firstName: longName, lastName: 'Élève', programVersion: 'DEMO-V1.TEST', school: {},
  classLabel: 'Classe fictive, option coopérative et étude des sociétés', optionCode: 'OPTION-FICTIVE', yearCode: 'DEMO-2025-2026',
  cycle: 'SECONDAIRE_TECHNIQUE', level: '1re H', totalMaximum: '720', totalEarned: '0', rank: 1, effectif: 3, percentage: '0' };
const subjects = names.map((label, index) => ({ subjectId: String(index), label,
  earned: index === 1 ? null : '0', maximum: index < 24 ? '20' : '10', ...(index === 2 ? { nonApplicable: true, earned: null, maximum: '0' } : {}) }));
const period = (code, kind, publishedAt, sourceVersions = [], subjectResults = subjects) => ({
  id: code, classPeriodId: 'cp-' + code, enrollmentId, identitySnapshot: { ...identity, kind, periodCode: code, periodLabel: code },
  classPeriod: { publishedAt, period: { code, kind } }, sourceVersions, decisions: [], subjectResults
});
const ref = row => ({ snapshotId: row.id, classPeriodId: row.classPeriodId, code: row.classPeriod.period.code });

test('Sources exactes, cutoff de publication, zéro, absence et non applicable', () => {
  const p1 = period('P1', 'PERIODE', current);
  const p2 = period('P2', 'PERIODE', later);
  const s1 = period('S1', 'SEMESTRE', current, [ref(p1), ref(p2)]);
  const bareRecord = { ...ref(p2), snapshotId: 'foreign' };
  const annual = period('ANNEE', 'ANNUEL', current, [ref(s1), bareRecord]);
  const pendingSource = prepareBulletin(s1, [p1, p2, s1], current);
  assert.equal(pendingSource.component(subjects[0], 'P1').earned, '0');
  assert.equal(pendingSource.component(subjects[1], 'P1').earned, null);
  assert.equal(pendingSource.component(subjects[2], 'P1').nonApplicable, true);
  assert.equal(pendingSource.component(subjects[0], 'P2'), undefined);
  assert.deepEqual(pendingSource.identityFor('S1'), {});
  assert.equal(pendingSource.releaseVisible, false);
  assert.equal(prepareBulletin(s1, [p1, p2, s1], later).releaseVisible, true);
  assert.equal(prepareBulletin(annual, [p1, p2, s1, annual], later).releaseVisible, false);
  const mixedVersion = period('P1', 'PERIODE', current, [], [{ ...subjects[0], earned: '9' }]);
  mixedVersion.id = 'previous-P1-other-student';
  assert.equal(prepareBulletin(s1, [mixedVersion, p2, s1], later).component(subjects[0], 'P1'), undefined);
});

test('Un formulaire A4 paginé préserve les matières longues, les noms et les deux groupes', async () => {
  const p1 = period('P1', 'PERIODE', current);
  const view = prepareBulletin(p1, [p1], current);
  const pdf = await renderSecondary(view);
  const parsed = await PDFDocument.load(pdf);
  assert.ok(parsed.getPageCount() > 1);
  for (const page of parsed.getPages()) {
    assert.equal(page.getWidth(), PageSizes.A4[0]);
    assert.equal(page.getHeight(), PageSizes.A4[1]);
  }
  assert.deepEqual(await renderSecondary(view), pdf);
  if (process.env.LEYISA_V1_PROOFS) {
    await mkdir(process.env.LEYISA_V1_PROOFS, { recursive: true });
    await writeFile(`${process.env.LEYISA_V1_PROOFS}/secondaire-pagine.pdf`, pdf);
    await writeFile(`${process.env.LEYISA_V1_PROOFS}/secondaire-pagine.json`, JSON.stringify({ names, longName, permanentNumber }));
  }
});
