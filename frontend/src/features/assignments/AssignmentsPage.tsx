import { useMemo, useState } from 'react';
import './assignments.css';

type Assignment = { id: string; teacher: string; subject: string; schoolClass: string };

const DEMO_TEACHERS = ['Enseignant fictif A', 'Enseignant fictif B'];
const DEMO_SUBJECTS = ['Mathématiques', 'Français'];
const DEMO_CLASS = '6e A';
const INITIAL: Assignment[] = [
  { id: 'demo-a1', teacher: DEMO_TEACHERS[0], subject: DEMO_SUBJECTS[0], schoolClass: DEMO_CLASS },
  { id: 'demo-a2', teacher: DEMO_TEACHERS[1], subject: DEMO_SUBJECTS[1], schoolClass: DEMO_CLASS },
];

/** Maquette fonctionnelle isolée : aucune API, aucun utilisateur réel et aucune persistance. */
export function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL);
  const [teacher, setTeacher] = useState('');
  const [subject, setSubject] = useState('');
  const [notice, setNotice] = useState('');
  const usedSubjects = useMemo(() => new Set(assignments.map(a => `${a.schoolClass}|${a.subject}`)), [assignments]);

  function addAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    if (!teacher || !subject) {
      setNotice('Choisissez un enseignant et une matière.');
      return;
    }
    if (usedSubjects.has(`${DEMO_CLASS}|${subject}`)) {
      setNotice('Cette matière a déjà un enseignant dans la classe de démonstration.');
      return;
    }
    setAssignments(previous => [...previous, { id: `demo-a${previous.length + 1}`, teacher, subject, schoolClass: DEMO_CLASS }]);
    setNotice('Affectation ajoutée dans la démonstration (non enregistrée en base).');
    setTeacher('');
    setSubject('');
  }

  return (
    <main className="leyisa-assignments">
      <aside className="assignments-sidebar" aria-label="Navigation de la maquette">
        <div className="assignments-brand"><span className="assignments-logo">L</span><span><strong>LEYISA SCHOOL</strong><small>Espace de gestion</small></span></div>
        <p className="assignments-menu-title">MENU PRINCIPAL</p>
        <nav aria-label="Rubriques"><span>Accueil</span><span>Scolarité</span><span>Élèves / inscriptions</span><span className="is-active">Enseignants</span><span>Évaluations / notes</span><span>Validation</span><span>Résultats</span><span>Bulletins</span></nav>
        <div className="assignments-sidebar-foot">VISIO TECH — V1 DEMO<br/><small>Données fictives uniquement</small></div>
      </aside>
      <section className="assignments-content">
        <header className="assignments-topbar"><span>Leyisa School　/　Enseignants et affectations</span><span className="assignments-year">Année 2026–2027</span></header>
        <div className="assignments-inner">
          <h1>Enseignants et affectations</h1>
          <p className="assignments-subtitle">Définir qui enseigne quelle matière dans une classe.</p>
          <p className="assignments-demo-note">Aperçu de démonstration : les affectations disparaissent au rechargement.</p>
          <div className="assignments-layout">
            <section className="assignments-panel"><h2>Affectations de l'année</h2><p>Exemple de classe 6e A</p>
              <div className="assignments-table-wrap"><table><thead><tr><th>Enseignant</th><th>Matière</th><th>Classe</th></tr></thead><tbody>{assignments.map(a => <tr key={a.id}><td>{a.teacher}</td><td>{a.subject}</td><td>{a.schoolClass}</td></tr>)}</tbody></table></div>
              <span className="assignments-count">{assignments.length} affectation(s)</span>
            </section>
            <section className="assignments-panel"><h2>Nouvelle affectation</h2><p>Associer un enseignant au programme</p>
              <form onSubmit={addAssignment}>
                <label htmlFor="assign-teacher">Enseignant</label><select id="assign-teacher" value={teacher} onChange={e => setTeacher(e.target.value)} required><option value="">Sélectionner un enseignant</option>{DEMO_TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}</select>
                <label htmlFor="assign-class">Classe</label><input id="assign-class" value={DEMO_CLASS} readOnly aria-readonly="true" />
                <label htmlFor="assign-subject">Matière</label><select id="assign-subject" value={subject} onChange={e => setSubject(e.target.value)} required><option value="">Sélectionner une matière</option>{DEMO_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                <button type="submit">Enregistrer l'affectation</button>
                {notice && <p className="assignments-notice" role="status">{notice}</p>}
              </form>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
