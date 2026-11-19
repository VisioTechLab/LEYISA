import { object } from "../../common/input.js";
import { display, nameOf, type BulletinData, type BulletinSubject } from "./bulletin-data.js";
import { centered, label, PdfForm, type Cell } from "./pdf-form.js";

const codes = ['P1', 'P2', 'E1', 'S1', 'P3', 'P4', 'E2', 'S2', 'ANNEE'];
const marks = (subject?: BulletinSubject) => subject?.nonApplicable ? 'N/A' : display(subject?.earned);
const maxima = (subject?: BulletinSubject) => subject?.nonApplicable ? 'N/A' : display(subject?.maximum);
const unboxed = { edges: '' };
const gray = { fill: .51 };
const dotted = [.6, 1.2];
const day = (value: unknown) => display(value).replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3 / $2 / $1');
const rank = (value: Record<string, unknown>) => [display(value.rank), '/', display(value.effectif)].join(' ');

function slots(form: PdfForm, value: string, count: number, x: number, top: number, width: number, height: number) {
  const characters = [...value];
  const slot = width / count;
  for (let index = 0; index < count; index++) {
    const text = characters.length <= count ? characters[index] ?? '' : '';
    form.cell(x + index * slot, top, slot, height, centered(text), 7.8);
  }
  return characters.length > count ? value : '';
}

export async function renderSecondary(data: BulletinData) {
  const form = await PdfForm.create(data.isRetake ? 'Bulletin secondaire — deuxième session' : 'Bulletin secondaire', false, { left: 32, top: 35, rowPadding: 2.7 });
  const { identity } = data;
  const school = object(identity.school ?? {});
  const x = form.left;
  const wide = form.width;
  // Abscisses relevées sur le cadre original, de x=41 à x=727.
  const u = wide / 686;
  const scale = (widths: number[]) => widths.map(width => width * u);
  const [branch, ...main] = scale([126, 46, 46, 52, 48, 45, 47, 46, 45, 45]);
  const [gutter, percent, signature] = scale([18, 27, 95]);
  const side = percent + signature;
  const sideX = x + wide - side;
  const separation = sideX - gutter;
  const body = { min: 15.2 * u, size: 7.3 };
  const firstSem = main.slice(0, 4).reduce((sum, width) => sum + width, 0);
  const secondSem = main.slice(4, 8).reduce((sum, width) => sum + width, 0);
  const panelX = x + branch + firstSem;
  const panel = x + wide - panelX;

  form.row([wide], [centered('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO\nMINISTÈRE DE L’ENSEIGNEMENT PRIMAIRE, SECONDAIRE\nET PROFESSIONNEL', true)], { size: 9.8, min: 66 * u });
  form.cell(x, form.y, wide, 57 * u, {});
  form.cell(x + 3, form.y - 10 * u, 116 * u, 24 * u, { ...unboxed, text: 'N° ID.' }, 8);
  const longId = slots(form, display(school.educationId), 27, x + 121 * u, form.y - 10 * u, 505 * u, 24 * u);
  form.y -= 57 * u;
  if (longId) form.row([wide], [{ text: longId }], { size: 8 });
  form.row([wide], [label(`PROVINCE   ${display(school.province)}`)], { min: 18 * u });

  const fieldSize = 7.9;
  const schoolFields = [school.city, school.commune, school.name, school.code];
  const labelWidth = 92 * u;
  const schoolValueWidth = panelX - x - labelWidth;
  const schoolNames = ['VILLE', 'COMMUNE', 'ÉCOLE', 'CODE'];
  const fields: Array<[string, unknown, string?, unknown?]> = [
    ['ÉLÈVE', nameOf(identity), 'SEXE', identity.sex],
    ['NÉ(E) À', identity.birthPlace, 'LE', day(identity.birthDate)],
    ['CLASSE', [display(identity.classLabel), display(identity.optionCode)].filter(Boolean).join(' — ')]
  ];
  const studentWidths = [.76, .60, 1].map(proportion => [
    57 * u, proportion * panel - 57 * u, 46 * u, panel - proportion * panel - 46 * u - 4
  ]);
  const fieldRows = fields.map(([title, value, other, tail]) => [
    label(title + ' :'), { text: display(value) }, ...(other ? [label(other + ' :'), { text: display(tail) }] : [])
  ]);
  const schoolRows = schoolNames.map((title, i) => [label(title), { text: ': ' + display(schoolFields[i]) }]);
  const standard = 15.4 * u;
  const lines = schoolRows.map((cells, i) => Math.max(
    form.rowHeight([labelWidth, schoolValueWidth], cells, standard, fieldSize),
    i >= fieldRows.length ? 18 * u : form.rowHeight(studentWidths[i], fieldRows[i], standard, fieldSize)
  ));
  const top = form.y;
  let fieldTop = top - 14 * u;
  for (const [i, height] of lines.entries()) {
    form.cell(x + 3, fieldTop, labelWidth - 3, height, { ...schoolRows[i][0], ...unboxed }, fieldSize);
    form.cell(x + labelWidth, fieldTop, schoolValueWidth, height, { ...schoolRows[i][1], ...unboxed }, fieldSize);
    let fieldX = panelX + 2;
    for (const [column, entry] of (fieldRows[i] ?? []).entries()) {
      const width = studentWidths[i][column] - (i === 2 && column === 1 ? 4 : 0);
      form.cell(fieldX, fieldTop, width, height, { ...entry, ...unboxed }, fieldSize);
      if ((column === 1 || column === 3) && (column !== 3 || fields[i][2])) {
        form.rule(fieldX + 4, fieldTop - height + 2, fieldX + width - 4, fieldTop - height + 2, .45, dotted);
      }
      fieldX += width;
    }
    if (i === 3) {
      form.cell(panelX + 2, fieldTop, 68 * u, height, { ...label('N° PERM. :'), ...unboxed }, fieldSize);
      const longNumber = slots(form, display(identity.permanentNumber), 11, panelX + 74 * u, fieldTop - 1, 248 * u, 17 * u);
      if (longNumber) {
        const text = { text: longNumber, ...unboxed };
        const continuation = form.rowHeight([panel - 4], [text], standard, fieldSize);
        form.cell(panelX + 2, fieldTop - height, panel - 4, continuation, text, fieldSize);
        fieldTop -= continuation;
      }
    }
    fieldTop -= height;
  }
  fieldTop -= 9 * u;
  form.cell(x, top, panelX - x, top - fieldTop, {});
  form.cell(panelX, top, panel, top - fieldTop, {});
  form.y = fieldTop;
  const context = data.isRetake ? ' — REPÊCHAGE' : identity.kind === 'ANNUEL' ? '' : ` — ${display(identity.periodCode)}`;
  const band = [
    { ...centered(`BULLETIN DE L’ENSEIGNEMENT SECONDAIRE ${display(identity.level)}${context}`, true), ...unboxed },
    { ...centered(`ANNÉE SCOLAIRE   ${display(identity.yearCode)}`, true), ...unboxed }
  ];
  const bandWidths = [wide * .61, wide * .39];
  const bandHeight = form.rowHeight(bandWidths, band, 16 * u, 8);
  form.cell(x, form.y, wide, bandHeight, {});
  form.row(bandWidths, band, { size: 8, min: bandHeight });

  function heading() {
    const y = form.y;
    const [head, journal, last] = scale([18, 15, 17]);
    const height = head + journal + last;
    form.cell(x, y, branch, height, label('BRANCHES'), 8.4);
    for (const [semester, title] of ['PREMIER SEMESTRE', 'SECOND SEMESTRE'].entries()) {
      const start = x + branch + (semester === 0 ? 0 : firstSem);
      const [p1, p2, exam, total] = main.slice(semester * 4, semester * 4 + 4);
      form.cell(start, y, p1 + p2 + exam + total, head, centered(title, true), 8.3);
      form.cell(start, y - head, p1 + p2, journal, label('TR. JOURNAL.'), 7.5);
      form.cell(start, y - head - journal, p1, last, centered(semester === 0 ? '1re P' : '3e P', true), 7.2);
      form.cell(start + p1, y - head - journal, p2, last, centered(semester === 0 ? '2e P' : '4e P', true), 7.2);
      form.cell(start + p1 + p2, y - head, exam, journal + last, {});
      form.cell(start + p1 + p2 + exam, y - head, total, journal + last, {});
      form.cell(start + p1 + p2, y - head - journal, exam, last, { ...centered('EXAM', true), ...unboxed }, 8);
      form.cell(start + p1 + p2 + exam, y - head - journal, total, last, { ...centered('TOT.', true), ...unboxed }, 8);
    }
    form.cell(separation - main[8], y, main[8], height, centered('T.G.', true), 8.2);
    form.cell(separation, y, gutter, height, gray);
    form.cell(sideX, y, side, head + journal, { text: 'EXAMEN DE\nREPÊCHAGE' }, 7.2);
    form.cell(sideX, y - head - journal, percent, last, { text: '%' }, 7);
    form.cell(sideX + percent, y - head - journal, signature, last, { text: 'SIGN. PROF.' }, 6.8);
    form.y -= height;
  }

  const groups = new Map<string, { maxima: string[]; subjects: BulletinSubject[] }>();
  for (const subject of data.baseSubjects) {
    const vector = codes.map(code => maxima(data.component(subject, code)));
    const key = JSON.stringify(vector);
    if (!groups.has(key)) groups.set(key, { maxima: vector, subjects: [] });
    groups.get(key)!.subjects.push(subject);
  }
  const separator = { ...gray, edges: 'lr' };
  form.room(65);
  heading();
  for (const group of groups.values()) {
    const maximaRow = () => form.row([branch, ...main, gutter, side],
      [label('MAXIMA'), ...group.maxima.map(value => centered(value, true)), separator, gray], body);
    form.room(29, heading);
    maximaRow();
    const repeat = () => { heading(); maximaRow(); };
    for (const subject of group.subjects) {
      form.row([branch, ...main, gutter, percent, signature], [
        { text: subject.label }, ...codes.map(code => centered(marks(data.component(subject, code)))),
        separator, {}, {}
      ], { ...body, repeat });
    }
  }

  const summaries: Array<[string, (value: Record<string, unknown>) => string]> = [
    ['MAXIMA GÉNÉRAUX', value => display(value.totalMaximum)],
    ['TOTAUX', value => display(value.totalEarned)],
    ['POURCENTAGE', value => value.percentage == null ? '' : `${display(value.percentage)} %`],
    ['PLACE / NBRE ÉLÈVES', rank]
  ];
  const summaryWidths = [branch, ...main, gutter, side];
  const summaryRows = summaries.map(([title, value], i) => [
    { text: title, bold: i === 0 }, ...codes.map(code => centered(value(data.identityFor(code)))),
    separator, i === 0 ? gray : unboxed
  ]);
  const behaviorWidths = [branch, ...main.slice(0, 2), main[2] + main[3], ...main.slice(4, 6),
    main[6] + main[7] + main[8], gutter, side];
  const behaviorRows = ['APPLICATION', 'CONDUITE'].map((title, i) => {
    const field = title === 'APPLICATION' ? 'application' : 'conduct';
    const cells = ['P1', 'P2', 'P3', 'P4'].map(code => centered(display(data.identityFor(code)[field])));
    const block = { ...gray, edges: i === 0 ? 'lrt' : 'lrb' };
    return [{ text: title }, ...cells.slice(0, 2), block, ...cells.slice(2), block, separator, unboxed];
  });
  const heightOf = (widths: number[], rows: Cell[][]) =>
    rows.reduce((height, row) => height + form.rowHeight(widths, row, body.min, body.size), 0);
  form.room(heightOf(summaryWidths, summaryRows) + heightOf(behaviorWidths, behaviorRows) + 16, heading);
  form.row(summaryWidths, summaryRows[0], body);
  const sideTop = form.y;
  for (const row of summaryRows.slice(1)) form.row(summaryWidths, row, body);
  for (const row of behaviorRows) form.row(behaviorWidths, row, body);

  const footerRecord = data.isRetake ? data.firstDecision : data.decision;
  const finalRecord = data.decision;
  const sideItems = [
    ['– Passe (1)', 'ADMIS'], ['– Double (1)', 'REDOUBLEMENT'], ['– A échoué', 'ECHEC']
  ];
  const sideHeight = sideTop - form.y;
  form.cell(sideX, sideTop, side, sideHeight, {});
  const decisionDate = day(identity.issueDate);
  const sidebar = [...sideItems, [`Le   ${decisionDate || '…… / …… / ……'}`, ''], ['Le Chef d’établissement', ''], ['Sceau de l’école', '']];
  for (const [i, [title, outcome]] of sidebar.entries()) {
    form.cell(sideX + 1, sideTop - 1 - 8.6 * i, side - 2, 9, {
      text: title, bold: !!outcome && finalRecord?.outcome === outcome, ...unboxed
    }, 6.55);
  }
  form.row([branch, firstSem, secondSem + main[8] + gutter, side],
    [{ text: 'SIGN. DU RESPONSABLE' }, {}, {}, {}], { ...body, size: 6.7 });

  const footerContext = () => form.text(`BULLETIN SECONDAIRE — ${nameOf(identity)}`, 8, true, true);
  const decisionOptions = [
    ['– L’élève passe dans la classe supérieure (1)', 'ADMIS'],
    ['– L’élève double sa classe (1)', 'REDOUBLEMENT'],
    ['– L’élève a échoué et est à réorienter vers', 'REORIENTATION']
  ];
  const footerLeft = wide * .60;
  const footerRight = wide - footerLeft;
  const courses = new Set(Array.isArray(footerRecord?.courses) ? footerRecord.courses : []);
  const retakeBranches = data.baseSubjects.filter(subject => courses.has(subject.subjectId)).map(subject => subject.label);
  const retakeText = { text: `en   ${retakeBranches.join(', ')}`, ...unboxed };
  const retakeHeight = form.rowHeight([wide - 12], [retakeText], 12, 8);
  const location = { text: `Fait à ${display(identity.issuePlace) || '…………'}, le ${decisionDate || '…… / …… / ……'}`, ...unboxed };
  const locationHeight = form.rowHeight([footerRight], [location], 13, 8);
  const footerHeight = 120 + retakeHeight + Math.max(0, locationHeight - 13);
  form.room(footerHeight, footerContext);
  const start = form.y;
  form.cell(x, start, wide, footerHeight, {});
  let y = start - 2;
  const instructions = '– L’élève ne pourra passer dans la classe supérieure s’il n’a subi avec succès un examen de repêchage';
  form.cell(x + 2, y, wide - 4, 13, { text: instructions, bold: footerRecord?.outcome === 'REPECHAGE', ...unboxed }, 8);
  y -= 13;
  form.cell(x + 2, y, wide - 12, retakeHeight, retakeText, 8);
  form.cell(x + wide - 27, y, 25, 12, { text: '(1)', ...unboxed }, 7.6);
  form.rule(x + 18, y - retakeHeight + 2, x + wide - 28, y - retakeHeight + 2, .45, dotted);
  y -= retakeHeight;
  for (const [i, [title, outcome]] of decisionOptions.entries()) {
    form.cell(x + 2, y, footerLeft - 3, 11, { text: title, bold: footerRecord?.outcome === outcome, ...unboxed }, 8);
    if (i === 1) form.cell(x + footerLeft, y, footerRight, locationHeight, location, 8);
    y -= 11;
  }
  form.rule(x + 150 * u, y + 1, x + 303 * u, y + 1, .45, dotted);
  form.cell(x + 304 * u, y + 11, 20, 11, { text: '(1)', ...unboxed }, 7.6);
  form.cell(x + footerLeft, y, footerRight, 14, { text: 'Le Chef d’établissement', center: true, ...unboxed }, 8.4);
  y -= 28;
  for (const [i, text] of ['Signature de l’élève', 'Sceau de l’école', 'Nom et Signature'].entries()) {
    const offsets = [2, .375 * wide, .64 * wide];
    form.cell(x + offsets[i], y, .33 * wide, 14, { text, ...unboxed }, 8.4);
  }
  y -= 22;
  form.cell(x + 2, y, wide - 4, 19, {
    text: '(1) Biffer la mention inutile\nNote importante : le bulletin est sans valeur s’il est raturé ou surchargé.',
    ...unboxed
  }, 7.6);
  form.y -= footerHeight;
  return form.save();
}
