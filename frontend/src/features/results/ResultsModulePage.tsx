import { useEffect, useState } from 'react';
import { resultsApi, type ClassPeriod, type FinalResults, type Period, type Preview, type Reviewer, type Submission } from './resultsApi';
import './results.css';

type View = 'queue' | 'detail' | 'reject' | 'preview' | 'close' | 'final';
const displayNumber = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ValidationPage() { return <ResultsModulePage initialView="queue" />; }
export function FinalResultsPage() { return <ResultsModulePage initialView="final" />; }

export function ResultsModulePage({ initialView }: { initialView: View }) {
  const [view, setView] = useState<View>(initialView);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [actorId, setActorId] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [classPeriods, setClassPeriods] = useState<ClassPeriod[]>([]);
  const [classPeriodId, setClassPeriodId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [finalResults, setFinalResults] = useState<FinalResults | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('Chargement des données fictives…');

  useEffect(() => { void loadBootstrap(); }, []);
  useEffect(() => { if (periodId) void loadPeriodData(periodId); }, [periodId]);

  async function loadBootstrap() {
    try {
      const data = await resultsApi.bootstrap();
      setPeriods(data.periods); setReviewers(data.reviewers);
      setPeriodId(data.periods[0]?.id ?? ''); setActorId(data.reviewers[0]?.id ?? '');
      setMessage(data.periods.length ? '' : 'Aucune période fictive disponible.');
    } catch (error) { setMessage(errorMessage(error)); }
  }
  async function loadPeriodData(nextPeriodId: string) {
    try {
      const [queue, contexts] = await Promise.all([resultsApi.submissions(nextPeriodId), resultsApi.classPeriods(nextPeriodId)]);
      setSubmissions(queue); setClassPeriods(contexts); setClassPeriodId(contexts[0]?.id ?? ''); setMessage('');
    } catch (error) { setMessage(errorMessage(error)); }
  }
  async function openDetail(submission: Submission) {
    try { setSelected(await resultsApi.detail(submission.id)); setView('detail'); setMessage(''); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function approve() {
    if (!selected || !actorId) return;
    try { await resultsApi.decide(selected.id, 'approve', actorId); await loadPeriodData(periodId); setView('queue'); setMessage('Soumission approuvée.'); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function reject() {
    if (!selected || !actorId || !reason.trim()) return;
    try { await resultsApi.decide(selected.id, 'reject', actorId, reason); await loadPeriodData(periodId); setReason(''); setView('queue'); setMessage('Soumission rejetée avec son motif.'); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function loadPreview() {
    if (!classPeriodId) return;
    try { setPreview(await resultsApi.preview(classPeriodId)); setView('preview'); setMessage(''); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function closePeriod() {
    if (!classPeriodId || !actorId || !confirmed) return;
    try { await resultsApi.close(classPeriodId, actorId); await loadPeriodData(periodId); setConfirmed(false); setView('final'); setMessage('Période clôturée : les résultats sont désormais figés.'); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function loadFinal() {
    if (!classPeriodId) return;
    try { setFinalResults(await resultsApi.finalResults(classPeriodId)); setView('final'); setMessage(''); }
    catch (error) { setMessage(errorMessage(error)); }
  }

  return <main className="leyisa-page results-module-page">
    <header className="leyisa-page-heading"><div><h1>{titleFor(view)}</h1><p>{descriptionFor(view)}</p></div><span className="leyisa-chip">DÉMO V1 · NON OFFICIELLE</span></header>
    <div className="results-toolbar">
      <label>Période<select value={periodId} onChange={event => setPeriodId(event.target.value)}>{periods.map(period => <option key={period.id} value={period.id}>{period.label}</option>)}</select></label>
      <label>Direction<select value={actorId} onChange={event => setActorId(event.target.value)}>{reviewers.map(reviewer => <option key={reviewer.id} value={reviewer.id}>{reviewer.label}</option>)}</select></label>
    </div>
    <nav className="results-steps" aria-label="Parcours résultats"><button className={view === 'queue' ? 'is-current' : ''} onClick={() => setView('queue')}>Validation</button><button onClick={loadPreview}>Prévisualiser</button><button className={view === 'final' ? 'is-current' : ''} onClick={loadFinal}>Résultats</button></nav>
    {message && <p className="results-message">{message}</p>}
    {view === 'queue' && <Queue submissions={submissions} onOpen={openDetail} />}
    {view === 'detail' && selected && <Detail submission={selected} onApprove={approve} onReject={() => setView('reject')} />}
    {view === 'reject' && selected && <Reject submission={selected} reason={reason} onReason={setReason} onCancel={() => setView('detail')} onConfirm={reject} />}
    {view === 'preview' && <PreviewScreen preview={preview} contexts={classPeriods} classPeriodId={classPeriodId} onSelect={setClassPeriodId} onLoad={loadPreview} onClose={() => setView('close')} />}
    {view === 'close' && <CloseScreen preview={preview} confirmed={confirmed} onConfirm={setConfirmed} onClose={closePeriod} />}
    {view === 'final' && <FinalScreen results={finalResults} contexts={classPeriods} classPeriodId={classPeriodId} onSelect={setClassPeriodId} onLoad={loadFinal} />}
  </main>;
}

function Queue({ submissions, onOpen }: { submissions: Submission[]; onOpen: (submission: Submission) => void }) { return <section className="leyisa-card"><h2>Soumissions à examiner</h2><p className="leyisa-description">File de validation de toutes les classes de la période ouverte.</p><div className="results-list">{submissions.length ? submissions.map(item => <article key={item.id}><div><strong>{item.evaluation.title}</strong><small>{item.author.label} · {item.schoolClass.label} · {item.subject} · tentative {item.attempt}</small></div><button className="leyisa-button leyisa-button-secondary" onClick={() => onOpen(item)}>Ouvrir</button></article>) : <p>Aucune soumission PENDING pour cette période.</p>}</div></section>; }
function Detail({ submission, onApprove, onReject }: { submission: Submission & { grades?: Array<{ matricule: string; student: string; score: string | number | null }> }; onApprove: () => void; onReject: () => void }) { return <div className="leyisa-grid results-detail-grid"><section className="leyisa-card"><h2>Détail d’une soumission</h2><p className="leyisa-description">Tentative {submission.attempt} · lecture seule.</p><ResultTable students={(submission.grades ?? []).map(grade => ({ label: `${grade.matricule} · ${grade.student}`, values: [grade.score === null ? 'Absente' : `${grade.score} / ${submission.evaluation.maxScore}`] }))} headings={['Élève', 'Note']} /><div className="preview-actions"><button className="leyisa-button" onClick={onApprove}>Accepter la soumission</button><button className="leyisa-button leyisa-button-secondary" onClick={onReject}>Rejeter avec motif</button></div></section><aside className="leyisa-card"><h2>Décision de la Direction</h2><p>Auteur : {submission.author.label}</p><p>Évaluation : {submission.evaluation.title}</p><p>Statut : {submission.status}</p><p className="leyisa-description">L’auteur ne peut jamais décider sur sa propre soumission.</p></aside></div>; }
function Reject({ submission, reason, onReason, onCancel, onConfirm }: { submission: Submission; reason: string; onReason: (value: string) => void; onCancel: () => void; onConfirm: () => void }) { return <div className="leyisa-grid results-detail-grid"><section className="leyisa-card"><h2>Rejeter la soumission</h2><p className="leyisa-description">Le motif est obligatoire et visible par l’enseignant.</p><label>Évaluation<input disabled value={submission.evaluation.title} /></label><label>Motif du rejet<textarea value={reason} onChange={event => onReason(event.target.value)} placeholder="Veuillez préciser la correction attendue…" /></label><div className="preview-actions"><button className="leyisa-button" disabled={!reason.trim()} onClick={onConfirm}>Confirmer le rejet</button><button className="leyisa-button leyisa-button-secondary" onClick={onCancel}>Annuler</button></div></section><aside className="leyisa-card"><h2>Traçabilité</h2><p>La version soumise est conservée.</p><p>État suivant : REJECTED</p><p>Après correction : nouvelle soumission obligatoire.</p></aside></div>; }
function PreviewScreen({ preview, contexts, classPeriodId, onSelect, onLoad, onClose }: { preview: Preview | null; contexts: ClassPeriod[]; classPeriodId: string; onSelect: (value: string) => void; onLoad: () => void; onClose: () => void }) { return <><section className="results-toolbar"><label>Classe-période<select value={classPeriodId} onChange={event => onSelect(event.target.value)}>{contexts.map(context => <option key={context.id} value={context.id}>{context.classLabel} · {context.periodLabel} · {context.status}</option>)}</select></label><button className="leyisa-button" onClick={onLoad}>Vérifier</button></section>{preview && <div className="leyisa-grid results-detail-grid"><section className="leyisa-card"><h2>Aperçu des résultats</h2><p className="leyisa-description">Moyennes par matière uniquement ; aucune moyenne générale avant clôture.</p><StudentResults students={preview.students} /></section><aside className="leyisa-card"><h2>Contrôles avant clôture</h2>{preview.problems.length ? <ul>{preview.problems.map(problem => <li key={problem}>{problem}</li>)}</ul> : <p>Toutes les matières et soumissions sont validées.</p>}<button className="leyisa-button" disabled={!preview.readyToClose} onClick={onClose}>Continuer vers clôture</button></aside></div>}</>; }
function CloseScreen({ preview, confirmed, onConfirm, onClose }: { preview: Preview | null; confirmed: boolean; onConfirm: (value: boolean) => void; onClose: () => void }) { return <div className="leyisa-grid results-detail-grid"><section className="leyisa-card"><h2>Confirmer la clôture</h2><p className="results-warning">Cette opération est irréversible : les résultats sont figés et toute modification est refusée.</p><p>Classe / période : {preview?.classPeriod.classLabel} / {preview?.classPeriod.periodLabel}</p><label className="results-check"><input type="checkbox" checked={confirmed} onChange={event => onConfirm(event.target.checked)} /> Je confirme la clôture de la période.</label><button className="leyisa-button" disabled={!preview?.readyToClose || !confirmed} onClick={onClose}>Confirmer la clôture</button></section><aside className="leyisa-card"><h2>Contrôle transactionnel</h2><ol><li>Vérifier les soumissions et les notes.</li><li>Calculer les résultats.</li><li>Créer les instantanés.</li><li>Passer OPEN à CLOSED.</li></ol></aside></div>; }
function FinalScreen({ results, contexts, classPeriodId, onSelect, onLoad }: { results: FinalResults | null; contexts: ClassPeriod[]; classPeriodId: string; onSelect: (value: string) => void; onLoad: () => void }) { return <><section className="results-toolbar"><label>Classe-période<select value={classPeriodId} onChange={event => onSelect(event.target.value)}>{contexts.map(context => <option key={context.id} value={context.id}>{context.classLabel} · {context.periodLabel} · {context.status}</option>)}</select></label><button className="leyisa-button" onClick={onLoad}>Afficher</button></section>{results && <div className="leyisa-grid results-detail-grid"><section className="leyisa-card"><h2>Résultats figés</h2><StudentResults students={results.students} final /></section><aside className="leyisa-card"><h2>Clôture de la période</h2><p>Statut : CLOSED</p><p>Les résultats sont figés.</p><a className="leyisa-button" href="#bulletins">Préparer bulletin</a></aside></div>}</>; }
function StudentResults({ students, final = false }: { students: Preview['students']; final?: boolean }) { const subjects = students[0]?.subjectResults ?? []; return <ResultTable headings={['Élève', ...subjects.map(subject => subject.label), ...(final ? ['Total'] : [])]} students={students.map(student => ({ label: `${student.identity.matricule ?? ''} ${student.identity.firstName ?? ''} ${student.identity.lastName ?? ''}`.trim(), values: [...student.subjectResults.map(subject => subject.earned === null ? '—' : `${displayNumber.format(subject.earned)}/${subject.maximum}`), ...(final ? [`${displayNumber.format(student.totalEarned)}/${displayNumber.format(student.totalMaximum)}`] : [])] }))} />; }
function ResultTable({ headings, students }: { headings: string[]; students: Array<{ label: string; values: string[] }> }) { return <div className="leyisa-table-wrap"><table><thead><tr>{headings.map(heading => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{students.map(student => <tr key={student.label}><td>{student.label}</td>{student.values.map((value, index) => <td key={`${student.label}-${index}`}>{value}</td>)}</tr>)}</tbody></table></div>; }
function titleFor(view: View) { return ({ queue: 'Validation des notes', detail: 'Détail d’une soumission', reject: 'Rejeter avec motif', preview: 'Prévisualiser les résultats', close: 'Confirmer la clôture', final: 'Résultats et clôture' })[view]; }
function descriptionFor(view: View) { return ({ queue: 'Examiner les soumissions et décider sur la version envoyée.', detail: 'Consulter les notes transmises sans les modifier.', reject: 'Expliquer à l’enseignant ce qui doit être corrigé.', preview: 'Vérifier toutes les conditions avant de clôturer.', close: 'Clôturer une classe pour une période précise.', final: 'Consulter les résultats figés après la clôture.' })[view]; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.'; }
