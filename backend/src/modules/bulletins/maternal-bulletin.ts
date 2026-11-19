import { object } from "../../common/input.js";
import { display, nameOf, type BulletinData } from "./bulletin-data.js";
import { centered, label, PdfForm } from "./pdf-form.js";

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

export async function renderMaternal(data: BulletinData) {
  const form = await PdfForm.create('Carte d’appréciation périodique', true);
  const { identity } = data;
  const school = object(identity.school ?? {});
  const number = 24;
  const attitude = 156;
  const slot = (form.width - number - attitude) / 18;
  const widths = [number, attitude, ...Array<number>(18).fill(slot)];
  const schoolTitle = display(school.educationZone) || 'ZONE ADMINISTRATIVE DE L’ENSEIGNEMENT';
  form.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', 11, true, true);
  form.y -= 13;
  form.text(schoolTitle, 10, true, true);
  form.text(['INSPECTION PROVINCIALE', display(school.provincialInspection)].filter(Boolean).join(' — '), 10, true, true);
  form.text('ENSEIGNEMENT MATERNEL', 10, true, true);
  form.row([form.width], [centered(`CARTE D’APPRÉCIATION PÉRIODIQUE — ANNÉE SCOLAIRE   ${display(identity.yearCode)}`, true)], { size: 10, min: 21 });
  form.row([form.width], [{ text: `ÉCOLE   ${display(school.name)}` }], { min: 17 });
  form.row([.62 * form.width, .38 * form.width], [{ text: `ENFANT   ${nameOf(identity)}` }, { text: `CLASSE   ${display(identity.classLabel)}` }], { min: 17 });
  form.row([.62 * form.width, .38 * form.width], [{ text: `NIVEAU   ${display(identity.level)}` }, { text: `SEXE   ${display(identity.sex)}` }], { min: 17 });
  form.text('APPRÉCIATION', 9, true, true);

  function heading() {
    const top = form.y;
    const dayHeight = 15;
    form.cell(form.left, top, number, 2 * dayHeight, centered('N°', true));
    form.cell(form.left + number, top, attitude, 2 * dayHeight, label('ATTITUDES'));
    periods.forEach((_, i) => {
      const x = form.left + number + attitude + 3 * i * slot;
      form.cell(x, top, 3 * slot, dayHeight, centered(`${i + 1}${i === 0 ? 're' : 'e'} PÉRIODE`, true));
      columns.forEach((column, j) => {
        form.cell(x + j * slot, top - dayHeight, slot, dayHeight, centered(column, true), 7);
      });
    });
    form.y -= 2 * dayHeight;
  }

  const byAttitude = new Map(data.baseSubjects.map(subject => [key(subject.label), subject]));
  const observations = periods.map(() => new Map<string, number[]>());
  heading();
  for (const [index, title] of attitudes.entries()) {
    const subject = byAttitude.get(key(title));
    const values = periods.flatMap((period, i) => {
      const entries = (subject && data.component(subject, period)?.appreciation) ?? [];
      const valuesFor = (field: string) => [...new Set(entries.map(entry => display(entry[field])).filter(Boolean))];
      for (const value of valuesFor('observation')) {
        const noted = observations[i].get(value) ?? [];
        observations[i].set(value, [...noted, index + 1]);
      }
      return columns.map(column => centered(valuesFor(column).join('\n')));
    });
    form.row(widths, [centered(String(index + 1).padStart(2, '0')), { text: title }, ...values], { min: 19, repeat: heading });
  }
  form.row([number, attitude, ...periods.map(() => slot * 3)],
    [{}, { ...label('OBSERVATION'), top: true }, ...observations.map(items => ({ text: [...items].map(([value, indexes]) => indexes.length === attitudes.length ? value : `${indexes.join(', ')}. ${value}`).join('\n') }))],
    { min: 23, size: 7.4, repeat: heading });
  const quarter = (form.width - number) / 4;
  form.room(53);
  form.row([number, quarter, quarter, quarter, quarter],
    [{}, ...['INSTITUTRICE', 'PARENT', 'SCEAU DE L’ÉCOLE', 'DIRECTION'].map(title => ({ ...centered(title, true), top: true }))],
    { min: 53 });
  return form.save();
}
