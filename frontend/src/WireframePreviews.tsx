import { useState, type ReactNode } from 'react';
import { SchoolLogo } from './SchoolLogo';
import './WireframePreviews.css';

const pupils = [
  { id: 'ELV-001', name: 'Aline Mabiala', math: '15', french: '12', average: '13,50' },
  { id: 'ELV-002', name: 'David Lukusa', math: '12', french: '11', average: '11,50' },
  { id: 'ELV-003', name: 'Sarah Ilunga', math: '14', french: '13', average: '13,50' },
];
const schoolClass = '6e A';
const period = 'Période 1';

function Preview({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="leyisa-page wireframe-preview">
      <header className="leyisa-page-heading preview-heading">
        <div><h1>{title}</h1><p>{description}</p></div>
        <span className="leyisa-chip">Aperçu · Données fictives</span>
      </header>
      {children}
    </main>
  );
}

function PreviewTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="leyisa-table-wrap">
      <table>
        <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>
          {rows.map(([label, ...cells]) => (
            <tr key={label}><td>{label}</td>{cells.map((cell, index) => <td key={columns[index + 1]}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return <div className="leyisa-field"><span>{label}</span><span className="leyisa-field-value">{value}</span></div>;
}

export function SchoolPreview() {
  return (
    <Preview title="Configuration scolaire" description="Préparer l’année, les classes et les matières avant les inscriptions.">
      <div className="preview-stat-grid">
        <section className="leyisa-card"><h2>Année scolaire</h2><p className="leyisa-description">En cours de préparation</p><p>2026–2027</p></section>
        <section className="leyisa-card"><h2>Périodes</h2><p className="leyisa-description">Calendrier à confirmer</p><p>{period}</p></section>
        <section className="leyisa-card"><h2>Classes</h2><p className="leyisa-description">Classe du jeu de test</p><p>{schoolClass}</p></section>
      </div>
      <div className="leyisa-grid preview-school-grid">
        <section className="leyisa-card">
          <h2>Programme de la classe</h2>
          <p className="leyisa-description">Matières prévues pour la 6e A</p>
          <PreviewTable columns={['Code', 'Matière', 'Enseignant']} rows={[
            ['MATH', 'Mathématiques', 'À affecter'],
            ['FR', 'Français', 'À affecter'],
          ]} />
        </section>
        <section className="leyisa-card">
          <h2>Ajouter une matière</h2>
          <p className="leyisa-description">Référentiel scolaire partagé</p>
          <div className="leyisa-form preview-form">
            <PreviewField label="Matière" value="Choisir une matière" />
            <button className="leyisa-button" disabled>Ajouter au programme</button>
            <p className="leyisa-description">L’ajout de matières est en cours d’intégration.</p>
          </div>
        </section>
      </div>
    </Preview>
  );
}

export function GradesPreview() {
  return (
    <Preview title="Saisie des notes" description={`Évaluation 1 · Mathématiques · ${schoolClass} · ${period}`}>
      <section className="leyisa-card preview-context">
        <div>
          <h2>Évaluation : interrogation 1</h2>
          <p className="leyisa-description">Nathalie Kambale</p>
          <p className="leyisa-description">Barème : 20 points · Date : 08/10/2026</p>
        </div>
        <span className="leyisa-chip">Brouillon</span>
      </section>
      <section className="leyisa-card">
        <h2>Grille de notes</h2>
        <p className="leyisa-description">Exemple de points saisis pour une évaluation.</p>
        <PreviewTable columns={['Matricule', 'Élève', 'Note / 20', 'État']} rows={pupils.map(pupil => [pupil.id, pupil.name, `${pupil.math},00`, 'Saisie'])} />
        <div className="preview-actions">
          <button className="leyisa-button leyisa-button-secondary" disabled>Enregistrer le brouillon</button>
          <button className="leyisa-button" disabled>Soumettre les notes</button>
        </div>
        <p className="leyisa-description">La saisie et la soumission des notes sont en cours d’intégration.</p>
      </section>
    </Preview>
  );
}

const submissions = [
  { subject: 'Mathématiques', teacher: 'Nathalie Kambale', grade: 'math' },
  { subject: 'Français', teacher: 'Patrick Mbuyi', grade: 'french' },
] as const;

export function ValidationPreview() {
  const [submission, setSubmission] = useState<(typeof submissions)[number]>(submissions[0]);

  return (
    <Preview title="Validation des notes" description="Consulter les soumissions avant leur intégration aux résultats.">
      <div className="leyisa-grid preview-validation-grid">
        <section className="leyisa-card">
          <h2>Soumissions à examiner</h2>
          <p className="leyisa-description">Classe, matière et enseignant</p>
          <div className="preview-submissions">
            {submissions.map(item => (
              <button key={item.grade} className="preview-submission" type="button" aria-pressed={item === submission} onClick={() => setSubmission(item)}>
                <strong>{item.subject}</strong>
                <small>{schoolClass} · {item.teacher}</small>
              </button>
            ))}
          </div>
        </section>
        <section className="leyisa-card">
          <h2>Détail : {submission.subject}</h2>
          <p className="leyisa-description">{submission.teacher} · Interrogation 1 · /20</p>
          <PreviewTable columns={['Élève', 'Points']} rows={pupils.map(pupil => [pupil.name, `${pupil[submission.grade]},00`])} />
          <div className="leyisa-form">
            <PreviewField label="Motif du rejet (si nécessaire)" value="Préciser la correction attendue" />
          </div>
          <div className="preview-actions">
            <button className="leyisa-button leyisa-button-secondary" disabled>Demander une correction</button>
            <button className="leyisa-button" disabled>Valider les notes</button>
          </div>
          <p className="leyisa-description">La validation des notes est en cours d’intégration.</p>
        </section>
      </div>
    </Preview>
  );
}

export function ResultsPreview() {
  return (
    <Preview title="Résultats et clôture" description="Vérifier les moyennes avant de figer les résultats de la classe.">
      <section className="leyisa-card preview-context">
        <div>
          <h2>Contexte du résultat</h2>
          <div className="preview-context-fields">
            <PreviewField label="Classe" value={schoolClass} />
            <PreviewField label="Période" value={period} />
          </div>
        </div>
        <span className="leyisa-chip">Provisoire</span>
      </section>
      <div className="leyisa-grid preview-results-grid">
        <section className="leyisa-card">
          <h2>Aperçu des résultats</h2>
          <PreviewTable columns={['Élève', 'Maths', 'Français', 'Moyenne']} rows={pupils.map(pupil => [pupil.name, `${pupil.math}/20`, `${pupil.french}/20`, `${pupil.average}/20`])} />
        </section>
        <section className="leyisa-card">
          <h2>Clôture de la période</h2>
          <div className="leyisa-form preview-form">
            <p className="leyisa-description"><span className="leyisa-chip">Non clôturée</span></p>
            <button className="leyisa-button" disabled>Clôturer la classe-période</button>
            <p className="leyisa-description">La clôture est en cours d’intégration.</p>
          </div>
        </section>
      </div>
    </Preview>
  );
}

export function BulletinsPreview() {
  const [pupil, setPupil] = useState(pupils[0]);

  return (
    <Preview title="Bulletins scolaires" description="Consulter un exemple de bulletin pour une classe et une période.">
      <div className="leyisa-grid preview-bulletins-grid">
        <section className="leyisa-card">
          <h2>Choix du bulletin</h2>
          <p className="leyisa-description">Sélectionner un élève pour afficher son bulletin.</p>
          <div className="leyisa-form preview-form">
            <PreviewField label="Classe" value={schoolClass} />
            <PreviewField label="Période" value={period} />
            <label>
              Élève
              <select value={pupil.id} onChange={event => setPupil(pupils.find(item => item.id === event.target.value) ?? pupils[0])}>
                {pupils.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <button className="leyisa-button" disabled>Télécharger le PDF</button>
            <p className="leyisa-description">L’export PDF est en cours d’intégration.</p>
          </div>
        </section>
        <section className="leyisa-card">
          <h2>Aperçu du document</h2>
          <article className="preview-bulletin">
            <div className="preview-bulletin-brand"><SchoolLogo label="Leyisa School" /></div>
            <p className="preview-bulletin-mark">DÉMONSTRATION - NON OFFICIEL</p>
            <p>Élève : <strong>{pupil.name}</strong></p>
            <p className="leyisa-description">Classe : {schoolClass} · {period}</p>
            <PreviewTable columns={['Matière', 'Moyenne']} rows={[
              ['Mathématiques', `${pupil.math}/20`],
              ['Français', `${pupil.french}/20`],
            ]} />
            <p><strong>Moyenne générale : {pupil.average} / 20</strong></p>
          </article>
        </section>
      </div>
    </Preview>
  );
}
