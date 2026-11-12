import { useMemo, useState, type FormEvent } from 'react';
import './assignments.css';

type Assignment = { id: string; teacher: string; subject: string; schoolClass: string };

const TEACHERS = ['Nathalie Kambale', 'Patrick Mbuyi'];
const SUBJECTS = ['Mathématiques', 'Français'];
const SCHOOL_CLASS = '6e A';
const INITIAL: Assignment[] = [
  { id: 'a1', teacher: TEACHERS[0], subject: SUBJECTS[0], schoolClass: SCHOOL_CLASS },
  { id: 'a2', teacher: TEACHERS[1], subject: SUBJECTS[1], schoolClass: SCHOOL_CLASS },
];

/** Les affectations de test sont conservées en mémoire sur cet écran. */
export function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL);
  const [teacher, setTeacher] = useState('');
  const [subject, setSubject] = useState('');
  const [notice, setNotice] = useState('');
  const usedSubjects = useMemo(() => new Set(assignments.map(a => `${a.schoolClass}|${a.subject}`)), [assignments]);

  function addAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    if (!teacher || !subject) {
      setNotice('Choisissez un enseignant et une matière.');
      return;
    }
    if (usedSubjects.has(`${SCHOOL_CLASS}|${subject}`)) {
      setNotice('Cette matière a déjà un enseignant dans cette classe.');
      return;
    }
    setAssignments(previous => [
      ...previous,
      { id: `a${previous.length + 1}`, teacher, subject, schoolClass: SCHOOL_CLASS },
    ]);
    setNotice('Affectation ajoutée pour cette session.');
    setTeacher('');
    setSubject('');
  }

  return (
    <main className="leyisa-page leyisa-assignments">
      <header className="leyisa-page-heading">
        <h1>Enseignants et affectations</h1>
        <p>Définir qui enseigne quelle matière dans une classe.</p>
      </header>

      <div className="leyisa-grid">
        <section className="leyisa-card" aria-labelledby="assignment-list-title">
          <h2 id="assignment-list-title">Affectations de l’année</h2>
          <p className="leyisa-description">Classe de 6e A</p>
          <div className="leyisa-table-wrap">
            <table>
              <thead>
                <tr><th scope="col">Enseignant</th><th scope="col">Matière</th><th scope="col">Classe</th></tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}><td>{a.teacher}</td><td>{a.subject}</td><td>{a.schoolClass}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="leyisa-chip assignments-count">{assignments.length} affectations</span>
        </section>

        <section className="leyisa-card" aria-labelledby="new-assignment-title">
          <h2 id="new-assignment-title">Nouvelle affectation</h2>
          <p className="leyisa-description">Associer un enseignant au programme</p>
          <form className="leyisa-form assignments-form" onSubmit={addAssignment}>
            <div className="leyisa-field">
              <label htmlFor="assign-teacher">Enseignant</label>
              <select id="assign-teacher" value={teacher} onChange={event => setTeacher(event.target.value)} required>
                <option value="">Sélectionner un enseignant</option>
                {TEACHERS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
            <div className="leyisa-field">
              <label htmlFor="assign-class">Classe</label>
              <input id="assign-class" value={SCHOOL_CLASS} readOnly />
            </div>
            <div className="leyisa-field">
              <label htmlFor="assign-subject">Matière</label>
              <select id="assign-subject" value={subject} onChange={event => setSubject(event.target.value)} required>
                <option value="">Sélectionner une matière</option>
                {SUBJECTS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
            <button className="leyisa-button" type="submit">Enregistrer l’affectation</button>
            {notice && <p className="leyisa-description" role="status">{notice}</p>}
            <p className="leyisa-description">Données fictives. Les modifications sont réinitialisées en quittant l’écran.</p>
          </form>
        </section>
      </div>
    </main>
  );
}
