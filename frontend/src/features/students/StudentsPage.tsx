import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ClassOption, NewStudent, Student, StudentsDataSource } from "./types";
import { loadStudentsDataSource } from "./studentsDataSource";
import "./students.css";

const EMPTY_FORM: NewStudent = {
  lastName: "",
  firstName: "",
  matricule: "",
  birthDate: "",
  classId: "",
  schoolYearId: "",
};

function displayDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function normalizeSearchValue(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

export function StudentsPage() {
  const [dataSource, setDataSource] = useState<StudentsDataSource | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [form, setForm] = useState<NewStudent>(EMPTY_FORM);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [canRegister, setCanRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isDemo = import.meta.env.DEV && import.meta.env.VITE_STUDENTS_DEMO === "true";

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const source = await loadStudentsDataSource();
        if (!active || !source) return;
        setDataSource(source);
        const [rows, options] = await Promise.all([source.getStudents(), source.getClasses()]);
        if (!active) return;
        setStudents(rows);
        setClasses(options);
        setCanRegister(options.length > 0);
        if (options[0]) {
          setForm((current) => ({
            ...current,
            classId: options[0].id,
            schoolYearId: options[0].schoolYearId,
          }));
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Impossible de charger les élèves.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadData();
    return () => { active = false; };
  }, []);

  const filteredStudents = useMemo(() => {
    const terms = normalizeSearchValue(appliedSearch).trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return students;
    return students.filter((student) => {
      const values = [student.matricule, student.lastName, student.firstName, student.className]
        .map(normalizeSearchValue);
      return terms.every((term) => values.some((value) => value.includes(term)));
    });
  }, [appliedSearch, students]);

  function updateField<K extends keyof NewStudent>(key: K, value: NewStudent[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  function handleClassChange(classId: string) {
    const selected = classes.find((item) => item.id === classId);
    setForm((current) => ({ ...current, classId, schoolYearId: selected?.schoolYearId ?? "" }));
    setError("");
    setSuccess("");
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(searchInput);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInProgress.current || !dataSource) return;
    setError("");
    setSuccess("");
    if (!form.firstName.trim() || !form.lastName.trim() || !form.matricule.trim() || !form.birthDate || !form.classId || !form.schoolYearId) {
      setError("Renseignez les champs obligatoires et choisissez une classe existante.");
      return;
    }

    submissionInProgress.current = true;
    setSubmitting(true);
    try {
      const student = await dataSource.registerStudent({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        matricule: form.matricule.trim(),
      });
      setStudents((current) => [...current, student]);
      setForm({ ...EMPTY_FORM, classId: form.classId, schoolYearId: form.schoolYearId });
      setSuccess(`Inscription enregistrée pour ${student.firstName} ${student.lastName}.`);
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "L’inscription a échoué.");
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  const selectedClass = classes.find((item) => item.id === form.classId);

  return (
    <main className="students-app">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="LEYISA SCHOOL">
          <span className="brand-mark">L</span>
          <span className="brand-copy"><strong>LEYISA SCHOOL</strong><small>Espace de gestion</small></span>
        </a>
        <div className="sidebar-rule" />
        <p className="sidebar-label">MENU PRINCIPAL</p>
        <ul className="side-menu" aria-label="Menu principal">
          <li>Accueil</li><li>Scolarité</li><li className="active" aria-current="page">Élèves / inscriptions</li>
          <li>Enseignants</li><li>Évaluations / notes</li><li>Validation</li><li>Résultats</li><li>Bulletins</li>
        </ul>
        <div className="sidebar-foot"><span>VISIO TECH — V1</span><small>{isDemo ? "Données fictives" : "Données du serveur"}</small></div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="breadcrumbs"><span>Leyisa School</span><span>/</span><strong>Élèves et inscriptions</strong></div>
          <span className="year-chip">{selectedClass?.schoolYearCode ?? "Année scolaire"}</span>
        </header>

        <div className="page-shell">
          <div className="page-heading"><div><h1>Élèves et inscriptions</h1><p className="page-subtitle">Consulter, rechercher et inscrire un élève dans une classe existante.</p></div></div>

          {isDemo ? (
            <div className="demo-notice" role="status"><strong>Mode démonstration</strong><span>Les données de cet écran sont fictives et conservées en mémoire.</span></div>
          ) : (
            <div className="demo-notice" role="status"><strong>Connexion au service d’inscription</strong><span>Les dossiers et inscriptions sont chargés depuis l’API.</span></div>
          )}

          <div className="content-grid">
            <section className="panel roster-panel" aria-labelledby="roster-title">
              <div className="panel-header"><div><h2 id="roster-title">Liste des élèves</h2><p className="panel-description">Recherche par nom ou matricule</p></div></div>
              <form className="search-form" onSubmit={handleSearch} role="search">
                <label htmlFor="student-search">Recherche</label>
                <div className="search-controls">
                  <input id="student-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nom ou matricule" />
                  <button className="button-secondary" type="submit" disabled={loading || !dataSource}>Rechercher</button>
                </div>
              </form>

              {loading ? <div className="state-message" role="status">Chargement des élèves…</div>
                : error && !students.length ? <div className="state-message state-error" role="alert">{error}</div>
                  : filteredStudents.length ? (
                    <div className="student-table-wrap"><table className="student-table">
                      <thead><tr><th scope="col">Matricule</th><th scope="col">Élève</th><th scope="col">Date de naissance</th><th scope="col">Année</th><th scope="col">Classe</th></tr></thead>
                      <tbody>{filteredStudents.map((student) => <tr key={student.id}>
                        <td>{student.matricule}</td><td>{student.lastName} {student.firstName}</td><td>{displayDate(student.birthDate)}</td><td>{student.schoolYear}</td><td>{student.className}</td>
                      </tr>)}</tbody>
                    </table></div>
                  ) : <div className="state-message" role="status">{students.length ? "Aucun résultat" : "Aucun élève disponible."}</div>}
              <p className="table-footnote">{filteredStudents.length} élève(s) affiché(s)</p>
            </section>

            <section className="panel form-panel" aria-labelledby="form-title">
              <div className="panel-header"><div><h2 id="form-title">Nouvelle inscription</h2><p className="panel-description">Le dossier et l’inscription sont enregistrés ensemble.</p></div></div>
              <form className="enrollment-form student-registration-form" onSubmit={handleSubmit}>
                <label>Nom <span className="required">*</span><input autoComplete="family-name" required value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} placeholder="Ex. : Ilunga" /></label>
                <label>Prénom <span className="required">*</span><input autoComplete="given-name" required value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} placeholder="Ex. : Sarah" /></label>
                <label>Matricule <span className="required">*</span><input required value={form.matricule} onChange={(event) => updateField("matricule", event.target.value)} placeholder="Ex. : ELEVE-2026-001" /></label>
                <label>Date de naissance <span className="required">*</span><input type="date" required max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} /></label>
                <label>Classe et année scolaire <span className="required">*</span>
                  <select required value={form.classId} onChange={(event) => handleClassChange(event.target.value)} disabled={loading || classes.length === 0}>
                    <option value="">Choisir une classe</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.schoolYearCode}</option>)}
                  </select>
                </label>
                {error && <p className="form-feedback feedback-error" role="alert">{error}</p>}
                {success && <p className="form-feedback feedback-success" role="status">{success}</p>}
                {!loading && dataSource && classes.length === 0 && !error && <p className="form-feedback feedback-error" role="alert">Aucune classe existante n’est disponible pour une inscription.</p>}
                {canRegister && <button className="submit-button" type="submit" disabled={loading || submitting || !dataSource || classes.length === 0}>
                  {submitting ? <><span className="button-spinner" /> Enregistrement…</> : "Créer l’inscription"}
                </button>}
                <p className="form-note"><span className="required">*</span> Champs obligatoires</p>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
