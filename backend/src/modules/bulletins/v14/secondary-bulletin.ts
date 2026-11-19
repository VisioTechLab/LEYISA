import { object } from "../../../common/input.js";
import { display, joined, nameOf, type BulletinData, type BulletinSubject } from "../bulletin-data.js";
import { centered, label, PdfForm } from "../pdf-form.js";

const codes = ['P1', 'P2', 'E1', 'S1', 'P3', 'P4', 'E2', 'S2', 'ANNEE'];
const marks = (subject?: BulletinSubject) => subject?.nonApplicable ? 'N/A' : display(subject?.earned);
const maxima = (subject?: BulletinSubject) => subject?.nonApplicable ? 'N/A' : display(subject?.maximum);

export async function renderSecondary(data: BulletinData) {
  const form = await PdfForm.create(data.isRetake ? 'Bulletin secondaire — deuxième session' : 'Bulletin secondaire');
  const { identity } = data;
  const school = object(identity.school ?? {});
  const name = 122;
  const column = 34;
  const gap = 6;
  const exam = 37;
  const percent = 25;
  const sign = form.width - name - 9 * column - gap - exam - percent;
  const widths = [name, ...Array<number>(9).fill(column), gap, exam, percent, sign];
  const wide = form.width;
  const middle = wide / 2;
  const body = { min: 12.8, size: 7.3 };

  form.row([wide], [centered('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO\nMINISTÈRE DE L’ENSEIGNEMENT PRIMAIRE, SECONDAIRE\nET PROFESSIONNEL', true)], { size: 10, min: 42 });
  const id = display(school.educationId);
  form.room(29);
  form.cell(form.left, form.y, wide, 29, label('N° ID.'));
  const idSlots = 26;
  if ([...id].length <= idSlots) {
    const slot = (wide - 136) / idSlots;
    for (let index = 0; index < idSlots; index++) {
      form.cell(form.left + 94 + index * slot, form.y - 6, slot, 17, centered([...id][index] ?? ''), 8);
    }
    form.y -= 29;
  } else {
    form.y -= 29;
    form.row([wide], [{ text: id }]);
  }
  form.row([wide], [label(`PROVINCE   ${display(school.province)}`)], { min: 15 });
  const admin = [
    [`VILLE   ${display(school.city)}`, `ÉLÈVE   ${nameOf(identity)}`, `SEXE   ${display(identity.sex)}`],
    [`COMMUNE   ${display(school.commune)}`, `NÉ(E) À   ${display(identity.birthPlace)}`, `LE   ${display(identity.birthDate)}`],
    [`ÉCOLE   ${display(school.name)}`, `CLASSE   ${display(identity.classLabel)}`, `OPTION   ${display(identity.optionCode)}`],
    [`CODE   ${display(school.code)}`, `N° PERMANENT   ${display(identity.permanentNumber)}`, '']
  ];
  admin.forEach(([schoolField, studentField, complement]) =>
    form.row([middle, .33 * wide, .17 * wide], [{ text: schoolField }, { text: studentField }, { text: complement }], { size: 8, min: 15 }));
  form.row([wide * .61, wide * .39], [
    centered(`BULLETIN DE L’ENSEIGNEMENT SECONDAIRE   ${display(identity.level)}`, true),
    centered(`ANNÉE SCOLAIRE   ${display(identity.yearCode)}`, true)
  ], { min: 17 });
  if (identity.kind !== 'ANNUEL') {
    const context = data.isRetake ? 'DEUXIÈME SESSION — REPÊCHAGE' : display(identity.periodLabel);
    form.row([wide], [centered(context, true)], { min: 15 });
  }

  function heading() {
    const x = form.left;
    const y = form.y;
    const head = 14;
    const last = 17;
    const height = head * 2 + last;
    form.cell(x, y, name, height, label('BRANCHES'), 8.4);
    for (const [semester, number] of ['PREMIER SEMESTRE', 'SECOND SEMESTRE'].entries()) {
      const start = x + name + semester * 4 * column;
      form.cell(start, y, 4 * column, head, centered(number, true), 8.4);
      form.cell(start, y - head, 2 * column, head, centered('TR. JOURNAL.', true), 7.4);
      const ordinal = semester === 0 ? ['1re période', '2e période'] : ['3e période', '4e période'];
      ordinal.forEach((period, i) => form.cell(start + i * column, y - head * 2, column, last, centered(period, true), 5.6));
      form.cell(start + 2 * column, y - head, column, head + last, centered('EXAMEN', true), 6.2);
      form.cell(start + 3 * column, y - head, column, head + last, centered('TOTAL', true), 6.6);
    }
    form.cell(x + name + 8 * column, y, column, height, centered('T.G.', true), 8.4);
    form.cell(x + name + 9 * column, y, gap, height, centered('', false, true));
    const after = x + name + 9 * column + gap;
    form.cell(after, y, exam + percent + sign, 2 * head, centered('EXAMEN DE REPÊCHAGE', true), 8);
    form.cell(after, y - 2 * head, exam, last, centered('NOTE', true), 7);
    form.cell(after + exam, y - 2 * head, percent, last, centered('%', true), 7);
    form.cell(after + exam + percent, y - 2 * head, sign, last, centered('SIGN. PROF.', true), 6.6);
    form.y -= height;
  }

  const groups = new Map<string, { maxima: string[]; subjects: BulletinSubject[] }>();
  for (const subject of data.baseSubjects) {
    const vector = codes.map(code => maxima(data.component(subject, code)));
    const key = JSON.stringify(vector);
    if (!groups.has(key)) groups.set(key, { maxima: vector, subjects: [] });
    groups.get(key)!.subjects.push(subject);
  }
  const divider = { shaded: true };
  form.room(68);
  heading();
  for (const group of groups.values()) {
    const maximaRow = () => form.row([name, ...Array<number>(9).fill(column), gap, exam + percent + sign],
      [label('MAXIMA', true), ...group.maxima.map(value => centered(value, true, true)), divider, divider], { ...body });
    form.room(27, heading);
    maximaRow();
    const repeat = () => { heading(); maximaRow(); };
    for (const subject of group.subjects) {
      form.row(widths, [
        { text: subject.label },
        ...codes.map(code => centered(marks(data.component(subject, code)))),
        divider, centered(marks(data.retakeScores.get(subject.subjectId))), {}, {}
      ], { ...body, repeat });
    }
  }

  const syntheses: Array<[string, (value: Record<string, unknown>) => string]> = [
    ['MAXIMA GÉNÉRAUX', value => display(value.totalMaximum)],
    ['TOTAUX', value => display(value.totalEarned)],
    ['POURCENTAGE', value => value.percentage == null ? '' : `${display(value.percentage)} %`],
    ['PLACE / NOMBRE D’ÉLÈVES', value => joined(value.rank, value.effectif)],
    ['APPLICATION', value => display(value.application)],
    ['CONDUITE', value => display(value.conduct)],
    ['SIGNATURE DU RESPONSABLE', () => '']
  ];
  form.room(106, heading);
  for (const [title, value] of syntheses) {
    const secondSession = data.isRetake && data.releaseVisible && ['MAXIMA GÉNÉRAUX', 'TOTAUX', 'POURCENTAGE', 'PLACE / NOMBRE D’ÉLÈVES'].includes(title);
    const cells = codes.map(code => centered(value(data.identityFor(code))));
    if (title === 'APPLICATION' || title === 'CONDUITE') {
      form.row([name, column, column, 2 * column, column, column, 3 * column, gap, exam + percent + sign],
        [label(title), ...cells.slice(0, 2), divider, ...cells.slice(4, 6), divider, divider, {}], { ...body, repeat: heading });
    } else {
      form.row([name, ...Array<number>(9).fill(column), gap, exam + percent + sign],
        [{ ...label(title), size: title === 'SIGNATURE DU RESPONSABLE' ? 6.6 : undefined }, ...cells, divider, centered(secondSession ? value(identity) : '')], { ...body, repeat: heading });
    }
  }

  const footerContext = () => form.text(`BULLETIN SECONDAIRE — ${nameOf(identity)}`, 8, true, true);
  form.room(111, footerContext);
  const decisions = [
    ['Passe dans la classe supérieure', 'ADMIS'],
    ['Double sa classe', 'REDOUBLEMENT'],
    ['A échoué', 'ECHEC'],
    ['Est à réorienter', 'REORIENTATION'],
    ['Doit réussir un examen de repêchage', 'REPECHAGE']
  ];
  const record = data.isRetake ? data.firstDecision : data.decision;
  const options = decisions.map(([title, outcome]) => `${record?.outcome === outcome ? '[X]' : '[ ]'}  ${title}`);
  const location = [display(identity.issuePlace), display(identity.issueDate)];
  const right = middle * .79;
  form.row([wide - right, right], [
    { text: options.join('\n'), top: true },
    { text: `Fait à   ${location[0]}\nLe   ${location[1]}\n\nLe Chef d’établissement`, top: true }
  ], { min: 51, size: 8 });
  if (data.isRetake) {
    const outcome = decisions.find(([, value]) => value === data.decision?.outcome)?.[0] ?? '';
    form.row([wide], [{ text: `DÉCISION DE DEUXIÈME SESSION   ${outcome}` }], { size: 8 });
  }
  form.row([wide], [{ text: ['OBSERVATIONS', record?.reason, data.isRetake ? data.decision?.reason : ''].filter(Boolean).join('\n'), top: true }], { min: 23, size: 7.6 });
  form.room(39, footerContext);
  form.row([wide / 3, wide / 3, wide / 3],
    ['Signature de l’élève', 'Sceau de l’école', 'Nom et signature du chef d’établissement'].map(title => ({ ...centered(title), top: true })),
    { min: 39, size: 8 });
  return form.save();
}
