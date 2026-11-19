import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { api, post } from '../../shared/api';
import { useSession } from '../../shared/session';
import { can } from '../auth/authApi';
import './bulletins.css';

const PdfDocumentView = lazy(() => import('./PdfDocumentView').then(module => ({ default: module.PdfDocumentView })));

type Identity = { lastName?: string; postName?: string; firstName?: string; classLabel?: string; periodCode?: string; yearCode?: string; matricule?: string; cycle?: string };
type Bulletin = { id: string; identitySnapshot: Identity };
type Detail = { id: string; identity: Identity; templateVersion: string; archivedTemplates: string[]; publicationComplete?: boolean; documentPeriodSupported?: boolean };
type PdfFile = { key: string; bytes: Uint8Array; url: string };
const compare = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' }).compare;
const name = (person: Identity) => [person.lastName, person.postName, person.firstName].filter(Boolean).join(' ');
const unique = (values: string[]) => [...new Set(values)].sort(compare);

export function BulletinWorkspace() {
  const user = useSession();
  const [rows, setRows] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [year, setYear] = useState(''), [schoolClass, setClass] = useState(''), [period, setPeriod] = useState(''), [id, setId] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null), [detailError, setDetailError] = useState('');
  const [version, setVersion] = useState('');
  const [file, setFile] = useState<PdfFile | null>(null), [pdfError, setPdfError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [issuing, setIssuing] = useState(false), [message, setMessage] = useState('');
  const [issueError, setIssueError] = useState('');

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setListError('');
    api<Bulletin[]>('/bulletins', { signal: controller.signal }).then(data => { if (!controller.signal.aborted) { setRows(data); setLoading(false); } })
      .catch(error => { if (!controller.signal.aborted) { setRows([]); setListError(error.message); setLoading(false); } });
    return () => controller.abort();
  }, [refresh]);

  const years = unique(rows.map(row => row.identitySnapshot.yearCode || 'Année non renseignée')).reverse();
  const activeYear = years.includes(year) ? year : years[0] ?? '';
  const yearRows = rows.filter(row => (row.identitySnapshot.yearCode || 'Année non renseignée') === activeYear);
  const classes = unique(yearRows.map(row => row.identitySnapshot.classLabel || 'Classe non renseignée'));
  const activeClass = classes.includes(schoolClass) ? schoolClass : classes[0] ?? '';
  const classRows = yearRows.filter(row => (row.identitySnapshot.classLabel || 'Classe non renseignée') === activeClass);
  const periods = unique(classRows.map(row => row.identitySnapshot.periodCode || 'Composant non renseigné'));
  const activePeriod = periods.includes(period) ? period : periods[0] ?? '';
  const candidates = classRows.filter(row => (row.identitySnapshot.periodCode || 'Composant non renseigné') === activePeriod).sort((a, b) => compare(name(a.identitySnapshot), name(b.identitySnapshot)));
  const selected = candidates.find(row => row.id === id) ?? candidates[0];
  const selectedId = selected?.id;
  const current = detail?.id === selectedId ? detail : null;
  const versions = current ? [current.templateVersion, ...current.archivedTemplates.filter(v => v !== current.templateVersion)] : [];
  const activeVersion = versions.includes(version) ? version : versions[0] ?? '';
  const pdfKey = selectedId && activeVersion ? `${selectedId}:${activeVersion}` : '';
  const currentFile = file?.key === pdfKey ? file : null;
  const downloadable = !!current && current.publicationComplete !== false && current.documentPeriodSupported !== false;

  useEffect(() => {
    setDetail(null); setDetailError(''); setMessage(''); setIssueError(''); setPdfError('');
    if (!selectedId) return;
    const controller = new AbortController();
    api<Detail>(`/bulletins/${selectedId}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setDetail(data); })
      .catch(error => { if (!controller.signal.aborted) setDetailError(error.message); });
    return () => controller.abort();
  }, [selectedId, refresh]);

  useEffect(() => {
    setFile(null); setPdfError('');
    if (!selectedId || !activeVersion || !downloadable) return;
    const controller = new AbortController(); let objectUrl: string | undefined;
    async function load() {
      const response = await fetch(`/api/v1/bulletins/${selectedId}/pdf?${new URLSearchParams({ templateVersion: activeVersion })}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        if (response.status === 401) window.dispatchEvent(new Event('leyisa:session-expired'));
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.message === 'string' ? body.message : `Document indisponible (${response.status}).`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!response.headers.get('content-type')?.includes('application/pdf') || new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('Le serveur n’a pas renvoyé un document PDF valide.');
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      setFile({ key: pdfKey, bytes, url: objectUrl });
    }
    void load().catch(error => { if (!controller.signal.aborted) setPdfError(error.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selectedId, activeVersion, downloadable, pdfKey, refresh]);

  const filename = useMemo(() => {
    const person = current?.identity;
    return `bulletin-${person?.matricule || selectedId || 'eleve'}-${person?.periodCode || 'publie'}-${activeVersion}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-');
  }, [current, selectedId, activeVersion]);

  async function issue() {
    if (!selectedId || issuing) return;
    setIssuing(true); setMessage(''); setIssueError('');
    try { await post(`/bulletins/${selectedId}/generate`, {}); setMessage('Émission enregistrée. Le document affiché est prêt à être remis.'); }
    catch (error) { setIssueError(error instanceof Error ? error.message : 'L’émission n’a pas pu être enregistrée.'); }
    finally { setIssuing(false); }
  }

  return <main className="leyisa-page bulletin-workspace">
    <header className="bulletin-page-header">
      <div><p className="bulletin-eyebrow">Scolarité / Documents scolaires</p><h1>Bulletins scolaires</h1><p>Consulter et remettre un bulletin publié.</p></div>
      <a href="#bulletins" className="bulletin-return">Tous les bulletins</a>
    </header>
    {listError && <div className="bulletin-error" role="alert"><p>{listError}</p><button onClick={() => setRefresh(n => n + 1)}>Réessayer</button></div>}
    {loading && <p role="status">Chargement des bulletins publiés…</p>}
    {!loading && !listError && !rows.length && <section className="bulletin-empty"><h2>Aucun bulletin publié</h2><p>Les documents apparaîtront ici après la publication des résultats par la direction.</p><a href="#accueil">Retour à l’accueil</a></section>}
    {!loading && rows.length > 0 && <div className="bulletin-columns">
      <section className="bulletin-selection" aria-labelledby="bulletin-choice-heading">
        <h2 id="bulletin-choice-heading">Choix du bulletin</h2><p className="bulletin-muted">Sélectionnez le dossier à consulter.</p>
        <div className="bulletin-fields">
          <label>Année scolaire<select aria-label="Année scolaire" value={activeYear} onChange={e => { setYear(e.target.value); setClass(''); setPeriod(''); setId(''); }}>{years.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Classe<select aria-label="Classe" value={activeClass} onChange={e => { setClass(e.target.value); setPeriod(''); setId(''); }}>{classes.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Période ou session<select aria-label="Période ou session" value={activePeriod} onChange={e => { setPeriod(e.target.value); setId(''); }}>{periods.map(value => <option key={value} value={value}>{value === 'ANNEE' ? 'Année complète' : value === 'REPECHAGE' ? 'Deuxième session — repêchage' : value}</option>)}</select></label>
          <label>Élève<select aria-label="Élève" value={selectedId ?? ''} onChange={e => setId(e.target.value)}>{candidates.map(row => <option key={row.id} value={row.id}>{name(row.identitySnapshot)}</option>)}</select></label>
        </div>
        {current && <div className="bulletin-dossier"><p className="bulletin-label">Dossier sélectionné</p><strong>{name(current.identity)}</strong><dl><div><dt>Matricule</dt><dd>{current.identity.matricule || 'Non renseigné'}</dd></div><div><dt>Année scolaire</dt><dd>{current.identity.yearCode || 'Non renseignée'}</dd></div><div><dt>Document</dt><dd>{activeVersion}</dd></div></dl></div>}
        {current && versions.length > 1 && <details className="bulletin-versions"><summary>Versions archivées</summary><label>Version du document<select aria-label="Version du document" value={activeVersion} onChange={e => setVersion(e.target.value)}>{versions.map(value => <option key={value}>{value}</option>)}</select></label></details>}
        {can(user, 'bulletins.produce') && <button className="leyisa-button bulletin-issue" disabled={!currentFile || !downloadable || issuing || activeVersion !== current?.templateVersion} onClick={() => void issue()}>{issuing ? 'Enregistrement…' : 'Enregistrer l’émission'}</button>}
        {message && <p className="bulletin-message" role="status">{message}</p>}
        {issueError && <p className="bulletin-error" role="alert">{issueError}</p>}
        <p className="bulletin-notice">DEMO-V1 · Résultats publiés et figés. Les versions précédentes restent conservées.</p>
      </section>
      <section className="bulletin-document" aria-labelledby="bulletin-preview-heading">
        <div className="bulletin-document-heading"><div><h2 id="bulletin-preview-heading">Aperçu du document</h2><p className="bulletin-muted">Le PDF affiché est celui que vous téléchargez.</p></div>{currentFile && <a className="leyisa-button bulletin-save" href={currentFile.url} download={filename}>Télécharger PDF</a>}</div>
        {detailError && <div className="bulletin-error" role="alert"><p>{detailError}</p><button onClick={() => setRefresh(n => n + 1)}>Réessayer</button></div>}
        {pdfError && <div className="bulletin-error" role="alert"><p>{pdfError}</p><button onClick={() => setRefresh(n => n + 1)}>Recharger le PDF</button></div>}
        {current?.publicationComplete === false && <div className="bulletin-empty"><h3>Publication des composantes en attente</h3><p>Le bulletin complet sera disponible après la publication de toutes ses périodes. Aucun document vide n’est proposé.</p></div>}
        {current?.publicationComplete !== false && current?.documentPeriodSupported === false && <div className="bulletin-empty"><h3>Choisissez une synthèse trimestrielle</h3><p>Le modèle primaire présente les synthèses T1, T2 et T3. Les notes de {current.identity.periodCode} n’apparaissent pas dans ses colonnes : aucun PDF vide n’est proposé. Sélectionnez un trimestre publié ou l’année complète.</p></div>}
        {!currentFile && !detailError && !pdfError && (!current || downloadable) && <p className="bulletin-loading" role="status">Chargement du document PDF…</p>}
        {currentFile && <Suspense fallback={<p className="bulletin-loading" role="status">Ouverture du lecteur PDF…</p>}><PdfDocumentView key={currentFile.key} bytes={currentFile.bytes}/></Suspense>}
      </section>
    </div>}
  </main>;
}
