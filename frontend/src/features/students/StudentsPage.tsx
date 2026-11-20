import { api } from '../../shared/api';
import { locationValue } from '../../shared/workspaceState';
import { useSession } from '../../shared/session';
import { can } from '../auth/authApi';
import { type FormEvent, useEffect, useRef, useState } from "react";
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

export function StudentsPage() {
  const allowed=can(useSession(),"students.create");
  const [dataSource, setDataSource] = useState<StudentsDataSource | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [form, setForm] = useState<NewStudent>(EMPTY_FORM);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page,setPage]=useState(1),[total,setTotal]=useState(0);
  const [filters,setFilters]=useState({schoolYearId:'',classId:locationValue('class')});
  const requestGeneration=useRef(0);
  const [loading, setLoading] = useState(true);
  const [canRegister, setCanRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const source = await loadStudentsDataSource();
        if (!active || !source) return;
        setDataSource(source);
        const [result, options] = await Promise.all([fetchStudentPage('',1,filters), source.getClasses()]);
        const rows=result.items;setTotal(result.total);
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

  const filteredStudents = students;
  async function fetchStudentPage(search:string,page:number,filters:{classId:string;schoolYearId:string}) {
    const result=await api<{items:any[];total:number}>(`/students?${new URLSearchParams({pagination:'1',search,page:String(page),...filters})}`);
    return {...result,items:result.items.map(row=>{const en=row.enrollments.find((e:any)=>(!filters.classId||e.schoolClass.id===filters.classId)&&(!filters.schoolYearId||e.schoolClass.schoolYear.id===filters.schoolYearId))??row.enrollments[0];return {id:row.id,matricule:row.matricule,lastName:row.user.lastName,postName:row.postName,firstName:row.user.firstName,birthDate:row.birthDate?.slice(0,10)??null,className:en?.schoolClass.label??'—',schoolYear:en?.schoolClass.schoolYear.code??'—'};})};
  }

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

  async function loadPage(next:number,search=appliedSearch,nextFilters=filters) {
    if(!dataSource)return;const request=++requestGeneration.current;setLoading(true);setError('');
    try{const result=await fetchStudentPage(search,next,nextFilters);if(request!==requestGeneration.current)return;setStudents(result.items);setTotal(result.total);setPage(next);setAppliedSearch(search);}catch(error){if(request===requestGeneration.current)setError(error instanceof Error?error.message:'Recherche impossible.');}finally{if(request===requestGeneration.current)setLoading(false);}
  }
  function changeFilters(values:Partial<typeof filters>){const next={...filters,...values};setFilters(next);void loadPage(1,appliedSearch,next);}
  function handleSearch(event: FormEvent<HTMLFormElement>) {event.preventDefault();void loadPage(1,searchInput);}


  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || submissionInProgress.current || !dataSource) return;
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
      await loadPage(1,appliedSearch);
      setForm({ ...EMPTY_FORM, classId: form.classId, schoolYearId: form.schoolYearId });
      setSuccess(`Inscription enregistrée pour ${student.firstName} ${student.lastName}.`);
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "L’inscription a échoué.");
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }


  return (
    <main className="leyisa-page students-app">
      <header className="leyisa-page-heading"><h1>Élèves</h1>{allowed&&<a className="leyisa-button" href="#dossier">Créer un dossier élève</a>}</header>
          <div className="students-workspace">
            <section className="leyisa-card" aria-labelledby="roster-title">
              <div className="panel-header"><div><h2 id="roster-title">Liste des élèves</h2><p className="panel-description">Recherche par nom ou matricule</p></div></div>
              <form className="search-form" onSubmit={handleSearch} role="search">
                <label htmlFor="student-search">Recherche</label>
                <div className="search-controls">
                  <input id="student-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nom ou matricule" />
                  <button className="leyisa-button leyisa-button-secondary" type="submit" disabled={loading || !dataSource}>Rechercher</button>
                </div>
              </form>

              <div className="collection-tools"><label>Année scolaire<select value={filters.schoolYearId} onChange={e=>changeFilters({schoolYearId:e.target.value,classId:''})}><option value="">Toutes les années</option>{[...new Map(classes.map(c=>[c.schoolYearId,c])).values()].map(c=><option key={c.schoolYearId} value={c.schoolYearId}>{c.schoolYearCode}</option>)}</select></label><label>Classe<select value={filters.classId} onChange={e=>changeFilters({classId:e.target.value})}><option value="">Toutes les classes</option>{classes.filter(c=>!filters.schoolYearId||c.schoolYearId===filters.schoolYearId).map(c=><option key={c.id} value={c.id}>{c.label} · {c.schoolYearCode}</option>)}</select></label></div>
              {loading ? <div className="state-message" role="status">Chargement des élèves…</div>
                : error ? <div className="state-message state-error" role="alert">{error}</div>
                  : filteredStudents.length ? (
                    <div className="leyisa-table-wrap"><table className="student-table">
                      <thead><tr><th scope="col">Matricule</th><th scope="col">Élève</th><th scope="col">Date de naissance</th><th scope="col">Année</th><th scope="col">Classe</th><th scope="col">Dossier</th></tr></thead>
                      <tbody>{filteredStudents.map((student) => <tr key={student.id}>
                        <td>{student.matricule}</td><td>{student.lastName} {student.postName} {student.firstName}</td><td>{displayDate(student.birthDate)}</td><td>{student.schoolYear}</td><td>{student.className}</td><td><a href={`#historique?student=${student.id}`} aria-label={`Consulter le dossier ${student.matricule}`}>Consulter</a></td>
                      </tr>)}</tbody>
                    </table></div>
                  ) : <div className="state-message" role="status">{students.length ? "Aucun résultat" : "Aucun élève disponible."}</div>}
              <p className="table-footnote">{filteredStudents.length} élève(s) affiché(s) sur {total} — page {page}</p><button disabled={loading||page===1} onClick={()=>void loadPage(page-1)}>Précédent</button> <button disabled={loading||page*50>=total} onClick={()=>void loadPage(page+1)}>Suivant</button>
            </section>

            {allowed&&<details className="leyisa-card workspace-disclosure"><summary>Créer un dossier et une inscription ensemble</summary><section aria-labelledby="form-title">
              <div className="panel-header"><div><h2 id="form-title">Nouvelle inscription</h2><p className="panel-description">Le dossier et l’inscription sont enregistrés ensemble.</p></div></div>
              <form className="leyisa-form student-registration-form" onSubmit={handleSubmit}>
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
                {!allowed&&<p>Inscription réservée au secrétariat.</p>}
                {canRegister && allowed && <button className="leyisa-button" type="submit" disabled={loading || submitting || !dataSource || classes.length === 0}>
                  {submitting ? <><span className="button-spinner" /> Enregistrement…</> : "Créer l’inscription"}
                </button>}
                <p className="form-note"><span className="required">*</span> Champs obligatoires</p>
              </form>
            </section></details>}
          </div>
    </main>
  );
}
