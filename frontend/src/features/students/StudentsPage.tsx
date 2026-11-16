import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
      setSuccess(`Inscription enregistrée pour ${student.firstName} ${student.lastName} dans cette session.`);
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
    <main className="leyisa-page students-app">
      <header className="leyisa-page-heading">
        <h1>Élèves et inscriptions</h1>
        <p>Retrouver le dossier de l’élève et enregistrer son inscription annuelle.</p>
      </header>

      <div className="leyisa-grid">
        <section className="leyisa-card" aria-labelledby="roster-title">
          <h2 id="roster-title">Liste des élèves</h2>
          <p className="leyisa-description">Recherche par nom ou matricule</p>

          <form className="leyisa-form search-form" onSubmit={handleSearch} role="search">
            <label htmlFor="student-search">Recherche</label>
            <div className="search-controls">
              <input
                id="student-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nom ou matricule"
              />
              <button className="leyisa-button leyisa-button-secondary" type="submit" disabled={loading || !dataSource}>
                Rechercher
              </button>
            </div>
          </form>

          {loading ? (
            <div className="state-message" role="status">Chargement des élèves…</div>
          ) : error && !students.length ? (
            <div className="state-message state-error" role="alert">{error}</div>
          ) : filteredStudents.length ? (
            <div className="leyisa-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Matricule</th>
                    <th scope="col">Élève</th>
                    <th scope="col">Classe</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.id}</td>
                      <td>
                        <details className="student-record">
                          <summary>{student.lastName} {student.postName} {student.firstName}</summary>
                          <dl>
                            <div><dt>Naissance</dt><dd>{displayDate(student.birthDate)}</dd></div>
                            <div><dt>Sexe</dt><dd>{student.sex === "F" ? "Féminin" : "Masculin"}</dd></div>
                          </dl>
                        </details>
                      </td>
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
          <p className="leyisa-description student-note">
            {dataSource ? `${filteredStudents.length} sur ${students.length} dossiers fictifs` : "Liste indisponible sans connexion API"}
          </p>
        </section>

        <section className="leyisa-card" aria-labelledby="form-title">
          <h2 id="form-title">Nouvelle inscription</h2>
          <p className="leyisa-description">Créer le dossier et inscrire un nouvel élève en 6e A.</p>

          <form className="leyisa-form student-registration-form" onSubmit={handleSubmit}>
            <label>
              <span>Nom <span className="required">*</span></span>
              <input
                autoComplete="family-name"
                required
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                placeholder="Ex. : Ilunga"
              />
            </label>
            <label>
              <span>Postnom <span className="required">*</span></span>
              <input
                required
                value={form.postName}
                onChange={(event) => updateField("postName", event.target.value)}
                placeholder="Ex. : Moke"
              />
            </label>
            <label>
              <span>Prénom <span className="required">*</span></span>
              <input
                autoComplete="given-name"
                required
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                placeholder="Ex. : Sarah"
              />
            </label>
            <label>
              <span>Date de naissance <span className="required">*</span></span>
              <input
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={form.birthDate}
                onChange={(event) => updateField("birthDate", event.target.value)}
              />
            </label>
            <label>
              <span>Sexe <span className="required">*</span></span>
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
              Année scolaire
              <input value={DEFAULT_SCHOOL_YEAR} readOnly />
            </label>
            <label>
              Classe
              <input value={form.className} readOnly />
            </label>

            {error && <p className="form-feedback feedback-error" role="alert">{error}</p>}
            {success && (
              <p className="form-feedback feedback-success" role="status">
                {success}
              </p>
            )}

            <button className="leyisa-button" type="submit" disabled={loading || submitting || !dataSource}>
              {submitting ? "Traitement…" : "Enregistrer l’inscription"}
            </button>
            <p className="leyisa-description">
              {dataSource
                ? "Données fictives. Les ajouts sont réinitialisés en quittant l’écran."
                : loading ? "Chargement…" : "L’inscription est disponible avec les données locales en développement."}
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
