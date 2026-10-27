import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { NewStudent, Student, StudentsDataSource } from "./types";
import { loadStudentsDataSource } from "./studentsDataSource";
import "./students.css";

const DEFAULT_SCHOOL_YEAR = "2026–2027";
const EMPTY_FORM: NewStudent = {
  lastName: "",
  postName: "",
  firstName: "",
  birthDate: "",
  sex: "F",
  className: "6e A",
};

function displayDate(value: string): string {
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
  const [form, setForm] = useState<NewStudent>(EMPTY_FORM);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const source = await loadStudentsDataSource();
        if (!active) return;
        setDataSource(source);
        if (!source) return;
        setStudents(await source.getStudents());
      } catch {
        if (active) setError("Impossible de charger les élèves. Réessayez plus tard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const searchTerms = normalizeSearchValue(appliedSearch).trim().split(/\s+/).filter(Boolean);
    if (!searchTerms.length) return students;
    return students.filter((student) => {
      const searchableValues = [
        student.id,
        student.lastName,
        student.postName,
        student.firstName,
      ].map(normalizeSearchValue);
      return searchTerms.every((term) =>
        searchableValues.some((value) => value.includes(term)),
      );
    });
  }, [appliedSearch, students]);

  function updateField<K extends keyof NewStudent>(key: K, value: NewStudent[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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
    if (!form.lastName.trim() || !form.postName.trim() || !form.firstName.trim() || !form.birthDate) {
      setError("Veuillez renseigner le nom, le postnom, le prénom et la date de naissance.");
      return;
    }

    submissionInProgress.current = true;
    setSubmitting(true);
    try {
      const student = await dataSource.registerStudent({
        ...form,
        lastName: form.lastName.trim(),
        postName: form.postName.trim(),
        firstName: form.firstName.trim(),
      });
      setStudents((current) => [...current, student]);
      setForm(EMPTY_FORM);
      setSuccess(`Inscription simulée avec succès pour ${student.firstName} ${student.lastName}.`);
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : "L’inscription n’a pas pu être simulée. Veuillez réessayer.",
      );
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="students-app">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="LEYISA SCHOOL">
          <span className="brand-mark">L</span>
          <span className="brand-copy">
            <strong>LEYISA SCHOOL</strong>
            <small>Espace de gestion</small>
          </span>
        </a>
        <div className="sidebar-rule" />
        <p className="sidebar-label">MENU PRINCIPAL</p>
        <ul className="side-menu" aria-label="Menu principal">
          <li>Accueil</li>
          <li>Scolarité</li>
          <li className="active" aria-current="page">Élèves / inscriptions</li>
          <li>Enseignants</li>
          <li>Évaluations / notes</li>
          <li>Validation</li>
          <li>Résultats</li>
          <li>Bulletins</li>
        </ul>
        <div className="sidebar-foot">
          <span>VISIO TECH — V1 DEMO</span>
          <small>{dataSource ? "Données fictives uniquement" : "Mode démonstration désactivé"}</small>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="breadcrumbs"><span>Leyisa School</span><span>/</span><strong>Élèves et inscriptions</strong></div>
          <span className="year-chip">Année {DEFAULT_SCHOOL_YEAR}</span>
        </header>

        <div className="page-shell">
          <div className="page-heading">
            <div>
              <h1>Élèves et inscriptions</h1>
              <p className="page-subtitle">Retrouver le dossier de l’élève et enregistrer son inscription annuelle.</p>
            </div>
          </div>

          {dataSource ? (
            <div className="demo-notice" role="status">
              <strong>Mode démonstration — données fictives</strong>
              <span>Les inscriptions sont simulées en mémoire et disparaissent au rechargement. Aucune donnée n’est envoyée au serveur.</span>
            </div>
          ) : (
            <div className="demo-notice notice-warning" role="status">
              <strong>Le mode démonstration est désactivé en production.</strong>
              <span>Le contrat API officiel n’est pas disponible dans le dépôt ; aucune donnée fictive n’est affichée.</span>
            </div>
          )}

          <div className="content-grid">
            <section className="panel roster-panel" aria-labelledby="roster-title">
              <div className="panel-header">
                <div>
                  <h2 id="roster-title">Liste des élèves</h2>
                  <p className="panel-description">Recherche par nom ou matricule</p>
                </div>
              </div>

              <form className="search-form" onSubmit={handleSearch} role="search">
                <label htmlFor="student-search">Recherche</label>
                <div className="search-controls">
                  <input
                    id="student-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Nom ou matricule"
                  />
                  <button className="button-secondary" type="submit" disabled={loading || !dataSource}>
                    Rechercher
                  </button>
                </div>
              </form>

              {loading ? (
                <div className="state-message" role="status">Chargement des élèves…</div>
              ) : error && !students.length ? (
                <div className="state-message state-error" role="alert">{error}</div>
              ) : filteredStudents.length ? (
                <div className="student-table-wrap">
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th scope="col">Identifiant</th>
                        <th scope="col">Élève</th>
                        <th scope="col">Date de naissance</th>
                        <th scope="col">Sexe</th>
                        <th scope="col">Classe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td>{student.id}</td>
                          <td>{student.lastName} {student.postName} {student.firstName}</td>
                          <td>{displayDate(student.birthDate)}</td>
                          <td>{student.sex === "F" ? "Féminin" : "Masculin"}</td>
                          <td>{student.className}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="state-message" role="status">
                  {students.length ? "Aucun résultat" : "Aucun élève disponible."}
                </div>
              )}
              <p className="table-footnote">
                {dataSource ? `${filteredStudents.length} élève(s) fictif(s) affiché(s)` : "Liste indisponible sans connexion API"}
              </p>
            </section>

            <section className="panel form-panel" aria-labelledby="form-title">
              <div className="panel-header">
                <div>
                  <h2 id="form-title">Nouvelle inscription</h2>
                  <p className="panel-description">Créer le dossier et inscrire un nouvel élève en 6e A.</p>
                </div>
              </div>

              <form className="enrollment-form student-registration-form" onSubmit={handleSubmit}>
                <label>
                  Nom <span className="required">*</span>
                  <input
                    autoComplete="family-name"
                    required
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                    placeholder="Ex. : Ilunga"
                  />
                </label>
                <label>
                  Postnom <span className="required">*</span>
                  <input
                    required
                    value={form.postName}
                    onChange={(event) => updateField("postName", event.target.value)}
                    placeholder="Ex. : Moke"
                  />
                </label>
                <label>
                  Prénom <span className="required">*</span>
                  <input
                    autoComplete="given-name"
                    required
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                    placeholder="Ex. : Sarah"
                  />
                </label>
                <label>
                  Date de naissance <span className="required">*</span>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.birthDate}
                    onChange={(event) => updateField("birthDate", event.target.value)}
                  />
                </label>
                <label>
                  Sexe <span className="required">*</span>
                  <select
                    required
                    value={form.sex}
                    onChange={(event) => updateField("sex", event.target.value === "M" ? "M" : "F")}
                  >
                    <option value="F">Féminin</option>
                    <option value="M">Masculin</option>
                  </select>
                </label>
                <label>
                  Classe
                  <input value="6e A" readOnly aria-readonly="true" />
                </label>

                {error && <p className="form-feedback feedback-error" role="alert">{error}</p>}
                {success && (
                  <p className="form-feedback feedback-success" role="status">
                    {success} L’ajout est simulé et n’est pas enregistré dans PostgreSQL.
                  </p>
                )}

                <button className="submit-button" type="submit" disabled={loading || submitting || !dataSource}>
                  {submitting ? <><span className="button-spinner" /> Traitement…</> : "Créer l’inscription"}
                </button>
                <p className="form-note"><span className="required">*</span> Champs obligatoires</p>
              </form>
            </section>
          </div>
          {dataSource && (
            <p className="simulation-note" role="note">
              Démonstration : les élèves initiaux et les nouveaux dossiers sont fictifs et disparaissent au rechargement.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
