import { object } from "../../common/input.js";
import { display, joined, nameOf, type BulletinData, type BulletinSubject } from "./bulletin-data.js";
import { centered, label, PdfForm } from "./pdf-form.js";

const periods = ['T1', 'T2', 'T3'];
const fields = (a: string, b: unknown, c: string, d: unknown) =>
  [{ text: a + ' :' }, { text: display(b) }, { text: c + ' :' }, { text: display(d) }];

function periodPoints(subject?: BulletinSubject) {
  if (subject?.nonApplicable) return 'N/A';
  if (subject?.earned == null) return '';
  return joined(subject.earned, subject.maximum);
}

export async function renderPrimary(data: BulletinData) {
  const form = await PdfForm.create('Bulletin de fin d’année', false, { left: 25, top: 27 });
  const { identity } = data;
  const school = object(identity.school ?? {});
  const fractions = (sizes: number[]) => sizes.map(size => size * form.width);
  // Proportions relevées entre les traits verticaux de la grille originale.
  const widths = [43, 232, 93, 92, 92, 108, 111].map(width => width * form.width / 771);
  const admin = [124, 247, 154, 185].map(width => width * form.width / 771);
  const inset = form.left + .045 * form.width;
  form.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', 17.5, true, true);
  form.text('MINISTÈRE DE L’ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET', 15, true, true);
  form.text('TECHNIQUE', 15, true, true);
  form.y -= 23;
  form.text('BULLETIN DE FIN D’ANNÉE', 18, true, true);
  form.y -= 23;
  const rows = [
    fields('Province', school.province, 'Ville / Territoire', school.city),
    fields('École', school.name, 'Code école', school.code),
    fields('Nom de l’élève', nameOf(identity), 'Sexe', identity.sex),
    fields('Classe', identity.classLabel, 'Option', identity.optionCode),
    fields('Année scolaire', identity.yearCode, 'N° permanent', identity.permanentNumber)
  ];
  for (const row of rows) {
    const page = form.page;
    form.row(admin, row, { x: inset, size: 9.4, min: 19 });
    if (page === form.page) {
      if (!row[1].text) form.rule(inset + admin[0] + 8, form.y + 5, inset + admin[0] + admin[1] - 13, form.y + 5, .55, [.8, 1.2]);
      if (!row[3].text) form.rule(inset + admin[0] + admin[1] + admin[2] + 8, form.y + 5, inset + admin.reduce((a, b) => a + b) - 23, form.y + 5, .55, [.8, 1.2]);
      if (row[0].text === 'École :') form.rule(inset, form.y, inset + admin.reduce((a, b) => a + b), form.y, .95);
    }
  }
  if (identity.kind !== 'ANNUEL') form.text(display(identity.periodLabel), 8, false, true);
  form.y -= 12;

  const heading = () => form.row(widths,
    [{ ...centered('N°', true), fill: .82 }, ...['BRANCHES', 'Période 1', 'Période 2', 'Période 3', 'Total /100', 'Mention'].map(title => ({ ...label(title), fill: .82 }))],
    { min: 22, size: 9 });
  form.room(47);
  heading();
  const gridPage = form.page;
  const gridTop = form.y + 22;
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
      [{}, { text: title }, centered(value)], { size: 9, min: 18, repeat: heading });
  }
  if (form.page === gridPage) {
    form.rule(form.left, gridTop, form.left + form.width, gridTop, 1.15);
    form.rule(form.left, form.y, form.left + form.width, form.y, 1.15);
    form.rule(form.left, gridTop, form.left, form.y, 1.15);
    form.rule(form.left + form.width, gridTop, form.left + form.width, form.y, 1.15);
  }
  form.y -= 12;

  const [description, response] = fractions([.34, .57]);
  form.room(75);
  const top = form.y;
  form.cell(inset, top, description, 19, { text: 'Décision du conseil de classe :' }, 9);
  const choices = [['Admis', 'ADMIS'], ['Ajourné', 'AJOURNE'], ['Reprise', 'REDOUBLEMENT']];
  const choice = 58;
  form.cell(inset + description, top, response, 19, {});
  choices.forEach(([title, value], i) => {
    const x = inset + description + 7 + i * choice;
    form.cell(x + 9, top, choice - 9, 19, { text: title, edges: '' }, 9);
    form.checkbox(x, top - 6, annual && data.decision?.outcome === value);
  });
  form.y -= 19;
  for (const [title, value] of [
    ['Observation du titulaire :', display(summary.teacherObservation)],
    ['Observation du directeur :', display(summary.directorObservation)]
  ]) {
    form.row([description, response], [{ text: title }, { text: value }], { x: inset, min: 19, size: 9 });
    if (!value) form.rule(inset + description + 8, form.y + 5, inset + description + response - 42, form.y + 5, .55, [.8, 1.2]);
  }
  form.y -= 16;

  const signatures = fractions([.32, .32, .32]);
  form.room(40);
  form.row(signatures, ['Le titulaire', 'Le directeur', 'Parent / Tuteur'].map(title => centered(title)), { x: form.left + form.width * .02, min: 19, size: 9 });
  form.row(signatures, Array.from({ length: 3 }, () => ({ ...centered('Nom & Signature :') })),
    { x: form.left + form.width * .02, min: 20, size: 9 });
  return form.save();
}
