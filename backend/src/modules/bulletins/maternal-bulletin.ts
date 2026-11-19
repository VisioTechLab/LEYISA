import { object } from "../../common/input.js";
import { display, nameOf, type BulletinData } from "./bulletin-data.js";
import { centered, label, PdfForm, type Cell } from "./pdf-form.js";

const attitudes = [
  'Intégration au groupe école',
  'Participation aux activités et application',
  'Respect/protection de l’environnement et soi-même',
  'Réaction aux consignes et autres sollicitations',
  'Sens de responsabilité et esprit d’affirmation',
  'Prudence dans le choix et les actions',
  'Fréquentation de l’école et amour aux études',
  'Sensibilité aux genres et confiance en soi',
  'Sensibilité aux valeurs de son milieu',
  'Maintien de son corps'
];
const columns = ['QTE', 'QLT', 'COUL'];
const periods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const key = (text: string) => text.normalize('NFD').toLowerCase().replace(/[^a-z]/g, '');
const unboxed = { edges: '' };

export async function renderMaternal(data: BulletinData) {
  const form = await PdfForm.create('Carte d’appréciation périodique', true, { left: 29, top: 22, rowPadding: 3.2 });
  const { identity } = data;
  const school = object(identity.school ?? {});
  const x = form.left;
  const wide = form.width;
  const u = wide / 801;
  const [number, attitude] = [24 * u, 154 * u];
  const pWidths = [[30, 32, 40], [33, 33, 38], [33, 33, 38], [34, 31, 40], [34, 32, 38], [34, 32, 38]];
  const tracks = pWidths.map(group => group.map(width => width * u));
  const periodWidths = tracks.map(group => group.reduce((a, b) => a + b, 0));
  const widths = [number, attitude, ...tracks.flat()];
  const body = { min: 14 * u, size: 8.5 };

  function frame() {
    const top = form.page.getHeight() - 9;
    const left = x - 24 * u;
    const right = x + wide + 19 * u;
    const lower = 42;
    form.rule(left, top, right, top, 1.5);
    form.rule(left, lower, right, lower, 1.5);
    form.rule(left, top, left, lower, 1.5);
    form.rule(right, top, right, lower, 1.5);
  }
  frame();
  form.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', 11, true, true);
  form.y -= 51 * u;
  form.text('MINISTÈRE DE L’ÉDUCATION NATIONALE ET NOUVELLE CITOYENNETÉ', 10.5, true, true);
  const inspection = display(school.provincialInspection);
  form.text(inspection ? `INSPECTION PROVINCIALE DE ${inspection}` : 'INSPECTION PROVINCIALE', 10.5, true, true);
  form.text('ENSEIGNEMENT MATERNEL', 10.5, true, true);

  const inset = x + 26 * u;
  const adminWidth = wide - 30 * u;
  form.row([adminWidth], [centered(`CARTE D’APPRÉCIATION PÉRIODIQUE ANNÉE SCOLAIRE   ${display(identity.yearCode)}`, true)],
    { x: inset, size: 9.4, min: 15 * u });
  const adminRows = [
    [`ÉCOLE ${display(school.name)}`],
    [`ENFANT ${nameOf(identity)}`, `CLASSE ${display(identity.classLabel)}`],
    [`NIVEAU ${display(identity.level)}`, `SEXE ${display(identity.sex)}`]
  ];
  for (const [i, fields] of adminRows.entries()) {
    const cells = fields.map(text => ({ text, ...unboxed }));
    const sizes = fields.length === 1 ? [adminWidth] : [.60 * adminWidth, .40 * adminWidth];
    const height = form.rowHeight(sizes, cells, (i === 1 ? 24 : 14) * u, 8.4);
    if (i !== 1) form.cell(inset, form.y, adminWidth, height, {});
    let left = inset;
    for (const [j, cell] of cells.entries()) {
      form.cell(left, form.y, sizes[j], height, cell, 8.4);
      form.rule(left + 27, form.y - height + 2, left + sizes[j] - 7, form.y - height + 2, .37, [.5, 1]);
      left += sizes[j];
    }
    form.y -= height;
  }
  form.text('APPRÉCIATION', 10, true, true);
  form.y -= 9 * u;

  const byAttitude = new Map(data.baseSubjects.map(subject => [key(subject.label), subject]));
  const observations = periods.map(() => new Map<string, number[]>());
  const grades = attitudes.map((title, index) => {
    const subject = byAttitude.get(key(title));
    return periods.flatMap((period, i) => {
      const entries = (subject && data.component(subject, period)?.appreciation) ?? [];
      const valuesFor = (field: string) => [...new Set(entries.map(entry => display(entry[field])).filter(Boolean))];
      for (const value of valuesFor('observation')) {
        const noted = observations[i].get(value) ?? [];
        observations[i].set(value, [...noted, index + 1]);
      }
      return columns.map(column => centered(valuesFor(column).join('\n')));
    });
  });

  function heading(initial = false) {
    const top = form.y;
    const titleHeight = 14 * u;
    const subHeight = 14 * u;
    form.cell(x, top, number, titleHeight, centered('N°', true), 8.6);
    form.cell(x + number, top, attitude, titleHeight, label('ATTITUDES'), 8.6);
    let left = x + number + attitude;
    for (const [i, period] of tracks.entries()) {
      form.cell(left, top, periodWidths[i], titleHeight, centered(`${i + 1} PÉRIODE`, true), 8.6);
      let slot = left;
      for (const [j, width] of period.entries()) {
        form.cell(slot, top - titleHeight, width, subHeight, centered(columns[j], true), 7.6);
        slot += width;
      }
      left += periodWidths[i];
    }
    const first = [centered('01'), label(attitudes[0])];
    const scores = grades[0];
    const firstHeight = form.rowHeight(widths, [unboxed, unboxed, ...scores], body.min, body.size);
    const labelHeight = subHeight + (initial ? firstHeight : 0);
    form.cell(x, top - titleHeight, number, labelHeight, initial ? first[0] : {}, 8.2);
    form.cell(x + number, top - titleHeight, attitude, labelHeight, initial ? first[1] : {}, 8.5);
    form.y -= titleHeight + subHeight;
  }
  const continuation = () => { frame(); heading(); };
  heading(true);
  form.row(widths, [unboxed, unboxed, ...grades[0]], body);
  for (const [index, title] of attitudes.entries()) {
    if (index === 0) continue;
    form.row(widths, [centered(String(index + 1).padStart(2, '0')), label(title), ...grades[index]], { ...body, repeat: continuation });
  }

  const comments = observations.map(items => ({
    text: [...items].map(([value, indexes]) => indexes.length === attitudes.length ? value : `${indexes.join(', ')}. ${value}`).join('\n')
  }));
  // Dans la référence, le trait à droite de QLT en P4 descend jusque dans cette ligne.
  const lastOfFourth = tracks[3][2];
  const observationWidths = [number, attitude, ...periodWidths.slice(0, 3), periodWidths[3] - lastOfFourth,
    lastOfFourth, ...periodWidths.slice(4)];
  const observationsCells: Cell[] = [{}, { ...label('OBSERVATION'), top: true }, ...comments.slice(0, 4), {}, ...comments.slice(4)];
  form.row(observationWidths, observationsCells, { min: 27 * u, size: 7.7, repeat: continuation });

  const signs = [number, attitude, periodWidths[0] + periodWidths[1], periodWidths[2] + periodWidths[3], periodWidths[4] + periodWidths[5]];
  form.room(65 * u + 2, frame);
  form.row(signs, [
    {}, ...['INSTITUTRICE', 'PARENT', 'SCEAU DE L’ÉCOLE', 'DIRECTION'].map(title => ({ ...centered(title, true), top: true }))
  ], { min: 65 * u, size: 8.3 });
  return form.save();
}
