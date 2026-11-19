import { object } from "../../common/input.js";
import { display, joined, nameOf, type BulletinData, type BulletinSubject } from "./bulletin-data.js";
import { centered, label, PdfForm } from "./pdf-form.js";

const periods = ['T1', 'T2', 'T3'];
const fields = (a: string, b: unknown, c: string, d: unknown) =>
  [{ text: a }, { text: display(b) }, { text: c }, { text: display(d) }];

function periodPoints(subject?: BulletinSubject) {
  if (subject?.nonApplicable) return 'N/A';
  if (subject?.earned == null) return '';
  return joined(subject.earned, subject.maximum);
}

export async function renderPrimary(data: BulletinData) {
  const form = await PdfForm.create('Bulletin de fin d’année');
  const { identity } = data;
  const school = object(identity.school ?? {});
  const fractions = (sizes: number[]) => sizes.map(size => size * form.width);
  const widths = fractions([.054, .300, .119, .119, .119, .145, .144]);
  const admin = fractions([.16, .315, .20, .235]);
  const inset = form.left + .045 * form.width;
  form.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', 12, true, true);
  form.text('MINISTÈRE DE L’ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET', 11, true, true);
  form.text('TECHNIQUE', 11, true, true);
  form.y -= 13;
  form.text('BULLETIN DE FIN D’ANNÉE', 15, true, true);
  form.y -= 13;
  const rows = [
    fields('Province', school.province, 'Ville / Territoire', school.city),
    fields('École', school.name, 'Code école', school.code),
    fields('Nom de l’élève', nameOf(identity), 'Sexe', identity.sex),
    fields('Classe', identity.classLabel, 'Option', identity.optionCode),
    fields('Année scolaire', identity.yearCode, 'N° permanent', identity.permanentNumber)
  ];
  for (const row of rows) form.row(admin, row, { x: inset, size: 9, min: 19 });
  if (identity.kind !== 'ANNUEL') form.text(display(identity.periodLabel), 8, false, true);
  form.y -= 12;

  const heading = () => form.row(widths,
    [centered('N°', true, true), label('BRANCHES', true), ...['Période 1', 'Période 2', 'Période 3', 'Total /100', 'Mention'].map(title => centered(title, true, true))],
    { min: 22, size: 9 });
  form.room(47);
  heading();
  data.baseSubjects.forEach((subject, i) => {
    const notes = periods.map(code => centered(periodPoints(data.component(subject, code))));
    form.row(widths, [centered(String(i + 1)), { text: subject.label }, ...notes, {}, {}], { min: 19, size: 9, repeat: heading });
  });

  const annual = data.releaseVisible && identity.kind === 'ANNUEL';
  const summary = annual ? identity : {};
  const summaries = [
    ['TOTAL GÉNÉRAL', joined(summary.totalEarned, summary.totalMaximum)],
    ['POURCENTAGE', summary.percentage == null ? '' : `${display(summary.percentage)} %`],
    ['PLACE DE L’ÉLÈVE', display(summary.rank)]
  ];
  for (const [title, value] of summaries) {
    form.row([widths[0], form.width - widths[0] - widths[6], widths[6]],
      [{}, label(title), centered(value)], { size: 9, min: 18, repeat: heading });
  }
  form.y -= 11;

  const [description, response] = fractions([.34, .57]);
  form.room(75);
  const top = form.y;
  form.cell(inset, top, description, 19, { text: 'Décision du conseil de classe' }, 9);
  const choices = [['Admis', 'ADMIS'], ['Ajourné', 'AJOURNE'], ['Reprise', 'REDOUBLEMENT']];
  const choice = response / 3;
  form.cell(inset + description, top, response, 19, {});
  choices.forEach(([title, value], i) => {
    const x = inset + description + i * choice;
    form.cell(x, top, choice, 19, centered(title), 9);
    form.checkbox(x + 10, top - 6, annual && data.decision?.outcome === value);
  });
  form.y -= 19;
  form.row([description, response], [{ text: 'Observation du titulaire' }, { text: display(summary.teacherObservation) }], { x: inset, min: 19, size: 9 });
  form.row([description, response], [{ text: 'Observation du directeur' }, { text: display(summary.directorObservation) }], { x: inset, min: 19, size: 9 });
  form.y -= 16;

  const signatures = fractions([.32, .32, .32]);
  form.room(57);
  form.row(signatures, ['Le titulaire', 'Le directeur', 'Parent / Tuteur'].map(title => centered(title)), { x: form.left + form.width * .02, min: 19, size: 9 });
  form.row(signatures, Array.from({ length: 3 }, () => ({ ...centered('Nom et signature'), top: true })),
    { x: form.left + form.width * .02, min: 37, size: 9 });
  return form.save();
}
