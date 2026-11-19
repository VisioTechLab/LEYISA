import { useCallback, useEffect, useState } from 'react';
import { AppreciationsGrid } from './AppreciationsGrid';
import {
  ApiError,
  getEvaluation,
  listEvaluations,
  saveGrades,
  submitEvaluation,
  type EvaluationDetail,
  type EvaluationState,
  type EvaluationSummary,
} from './evaluationsApi';
import './evaluations.css';
import { locationValue, rememberLocation, useWorkspaceState } from '../../shared/workspaceState';

const STATE_LABELS: Record<EvaluationState, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  REJECTED: 'Rejetée',
  VALIDATED: 'Validée',
};

type Notice = { kind: 'success' | 'error'; text: string };

function formatDate(isoDay: string) {
  const [year, month, day] = isoDay.split('-');
  return `${day}/${month}/${year}`;
}

/** Affiche une note enregistrée avec une virgule décimale. */
function toField(score: string | null) {
  return score === null ? '' : score.replace('.', ',');
}

/** Contrôle local d'une note saisie ; le serveur refait les mêmes contrôles. */
function checkField(value: string, maxScore: string): string | null {
  const text = value.trim().replace(',', '.');
  if (text === '') return null;
  if (!/^\d{1,6}(\.\d{1,4})?$/.test(text)) return 'Saisir un nombre positif.';
  if (Number(text) > Number(maxScore)) return `Maximum : ${maxScore}.`;
  return null;
}

function toScore(value: string): string | null {
  const text = value.trim().replace(',', '.');
  return text === '' ? null : text;
}

export function EvaluationsPage() {
  const confirmationMode=window.location.hash.startsWith('#soumission');
  const correctionMode=window.location.hash.startsWith('#corrections');
  const [evaluations, setEvaluations] = useState<EvaluationSummary[] | null>(null);
  const [listError, setListError] = useState('');
  const [selectedId, setSelectedId] = useWorkspaceState('evaluation', '');
  const requested = locationValue('id');
  const [detail, setDetail] = useState<EvaluationDetail | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const showDetail = useCallback((next: EvaluationDetail) => {
    setDetail(next);
    setFields(Object.fromEntries(next.grades.map(grade => [grade.enrollmentId, toField(grade.score)])));
    setServerErrors({});
    setEvaluations(previous => previous?.map(item => (item.id === next.id ? { ...item, state: next.state, editable: next.editable } : item)) ?? previous);
  }, []);

  useEffect(() => {
    let ignore = false;
    listEvaluations()
      .then(list => {
        if (ignore) return;
        setEvaluations(list);
        // Ouvrir d'abord une évaluation encore modifiable, s'il y en a une.
        setSelectedId((list.find(item=>item.id===requested)??list.find(item=>item.id===selectedId)??list.find(item => item.editable) ?? list[0])?.id ?? '');
      })
      .catch((error: unknown) => {
        if (!ignore) setListError(error instanceof Error ? error.message : 'Chargement impossible.');
      });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let ignore = false;
    getEvaluation(selectedId)
      .then(next => { if (!ignore) showDetail(next); })
      .catch((error: unknown) => {
        if (!ignore) setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Chargement impossible.' });
      });
    return () => { ignore = true; };
  }, [selectedId, showDetail]);

  useEffect(() => { if (requested && requested !== selectedId) selectEvaluation(requested); }, [requested]);

  useEffect(() => { if (selectedId && (!requested || requested === selectedId)) rememberLocation('id', selectedId); }, [selectedId]);

  function selectEvaluation(id: string) {
    if (id === selectedId) return;
    setDetail(null);
    setNotice(null);
    setSelectedId(id);
    rememberLocation('id', id);
  }

  const fieldErrors: Record<string, string> = {};
  if (detail) {
    for (const grade of detail.grades) {
      const message = checkField(fields[grade.enrollmentId] ?? '', detail.maxScore);
      if (message) fieldErrors[grade.enrollmentId] = message;
    }
  }
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const dirty = detail?.grades.some(grade => (fields[grade.enrollmentId] ?? '') !== toField(grade.score)) ?? false;
  const filled = detail?.grades.filter(grade => (fields[grade.enrollmentId] ?? '').trim() !== '').length ?? 0;

  function reportFailure(error: unknown) {
    if (error instanceof ApiError) {
      setServerErrors(Object.fromEntries(
        error.errors.filter(item => item.enrollmentId).map(item => [item.enrollmentId as string, item.message]),
      ));
      setNotice({ kind: 'error', text: error.message });
    } else {
      setNotice({ kind: 'error', text: 'Une erreur inattendue est survenue.' });
    }
  }

  async function persist(current: EvaluationDetail) {
    const saved = await saveGrades(current.id,current.version, current.grades.map(grade => ({
      enrollmentId: grade.enrollmentId,
      score: toScore(fields[grade.enrollmentId] ?? ''),
    })));
    showDetail(saved);
    return saved;
  }

  async function onSave() {
    if (!detail || busy || hasFieldErrors) return;
    setBusy(true);
    setNotice(null);
    try {
      await persist(detail);
      setNotice({ kind: 'success', text: 'Brouillon enregistré.' });
    } catch (error) {
      reportFailure(error);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (!detail || busy || hasFieldErrors) return;
    if(!confirmationMode) {
      setBusy(true);try{const saved=dirty?await persist(detail):detail;window.location.hash=`#soumission?id=${saved.id}`;}catch(error){reportFailure(error);}finally{setBusy(false);}return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const saved = dirty ? await persist(detail) : detail;
      showDetail(await submitEvaluation(saved.id,saved.version));
      setNotice({ kind: 'success', text: 'Notes soumises. Elles attendent la décision de validation.' });
    } catch (error) {
      reportFailure(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="leyisa-page leyisa-evaluations">
      <header className="leyisa-page-heading">
        <h1>{confirmationMode?"Confirmation de soumission":correctionMode?"Correction après rejet":"Saisie des notes"}</h1>
        <p>Enregistrer les notes d’une évaluation, puis les soumettre pour validation.</p>
      </header>

      <section className="leyisa-card evaluations-picker" aria-labelledby="evaluations-picker-title">
        <h2 id="evaluations-picker-title">Évaluation</h2>
        {listError && <p className="evaluations-notice" data-kind="error" role="alert">{listError}</p>}
        {!listError && evaluations === null && <p className="leyisa-description" role="status">Chargement des évaluations…</p>}
        {evaluations?.length === 0 && (
          <p className="leyisa-description">Aucune évaluation n’est enregistrée pour le moment.</p>
        )}
        {evaluations && evaluations.length > 0 && (
          <label className="leyisa-field">
            <span>Choisir une évaluation</span>
            <select value={selectedId} onChange={event => selectEvaluation(event.target.value)} disabled={busy}>
              {evaluations.map(item => (
                <option key={item.id} value={item.id}>
                  {item.schoolClass.label} · {item.subject.label} · {item.title} ({STATE_LABELS[item.state]})
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {notice && (
        <p className="evaluations-notice" data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      {selectedId && !detail && !notice && <p className="leyisa-description" role="status">Chargement de la grille…</p>}

      {detail && (
        <>
          <section className="leyisa-card evaluations-context">
            <div>
              <h2>{detail.title}</h2>
              <p className="leyisa-description">
                {detail.subject.label} · {detail.schoolClass.label} · {detail.period.label}
              </p>
              <p className="leyisa-description">
                {detail.teacher.firstName} {detail.teacher.lastName} · Barème : {detail.maxScore} points · Date : {formatDate(detail.heldOn)}
              </p>
            </div>
            <span className="leyisa-chip" data-state={detail.state}>{STATE_LABELS[detail.state]}</span>
          </section>

          {detail.state === 'REJECTED' && detail.lastSubmission?.reason && (
            <p className="evaluations-notice" data-kind="error">
              Soumission rejetée : {detail.lastSubmission.reason} Corrigez les notes puis soumettez à nouveau.
            </p>
          )}
          {!detail.editable && (
            <p className="leyisa-description evaluations-locked">
              {detail.period.closed
                ? 'La période est clôturée : les notes sont en lecture seule.'
                : detail.state === 'SUBMITTED'
                  ? 'Les notes sont soumises et attendent une décision : elles sont en lecture seule.'
                  : 'Les notes sont validées : elles sont en lecture seule.'}
            </p>
          )}

          {confirmationMode?<div className="leyisa-grid"><section className="leyisa-card"><h2>Résumé de la soumission</h2><p>{detail.title} · {detail.subject.label}</p><p>{filled} notes présentes / {detail.grades.length} inscrits · version {detail.version}</p><p>{filled<detail.grades.length?'La soumission est partielle ; la clôture restera bloquée tant que les notes manquent.':'Les notes saisies sont conservées dans un instantané.'}</p><button className="leyisa-button" disabled={!detail.editable||busy} onClick={onSubmit}>Confirmer la soumission</button> <a href={`#notes?id=${detail.id}`}>Annuler / revenir à la grille</a></section><section className="leyisa-card"><h2>Ce qui se passe ensuite</h2><p>La direction examine une copie immuable. Vous pourrez corriger uniquement après un rejet motivé.</p></section></div>:detail.kind==='APPRECIATION'?<AppreciationsGrid key={`${detail.id}-${detail.version}`} detail={detail} onChange={showDetail}/>:<section className="leyisa-card" aria-labelledby="evaluations-grid-title">
            <h2 id="evaluations-grid-title">Grille de notes</h2>
            <p className="leyisa-description">
              {filled} note(s) saisie(s) sur {detail.grades.length} élève(s) inscrit(s).
            </p>
            {detail.grades.length === 0 ? (
              <p className="leyisa-description">Aucun élève n’est inscrit dans cette classe.</p>
            ) : (
              <div className="leyisa-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Matricule</th>
                      <th scope="col">Élève</th>
                      <th scope="col">Note / {detail.maxScore}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.grades.map(grade => {
                      const error = fieldErrors[grade.enrollmentId] ?? serverErrors[grade.enrollmentId];
                      const errorId = `grade-error-${grade.enrollmentId}`;
                      return (
                        <tr key={grade.enrollmentId}>
                          <td>{grade.matricule}</td>
                          <td>{grade.lastName} {grade.firstName}</td>
                          <td>
                            {detail.editable ? (
                              <>
                                <input
                                  className="evaluations-score"
                                  type="text"
                                  inputMode="decimal"
                                  autoComplete="off"
                                  aria-label={`Note de ${grade.firstName} ${grade.lastName} · ${grade.matricule}`}
                                  aria-invalid={error ? true : undefined}
                                  aria-describedby={error ? errorId : undefined}
                                  value={fields[grade.enrollmentId] ?? ''}
                                  disabled={busy}
                                  onChange={event => {
                                    const { value } = event.target;
                                    setFields(previous => ({ ...previous, [grade.enrollmentId]: value }));
                                    setServerErrors(previous => Object.fromEntries(
                                      Object.entries(previous).filter(([key]) => key !== grade.enrollmentId),
                                    ));
                                  }}
                                />
                                {error && <small id={errorId} className="evaluations-field-error">{error}</small>}
                              </>
                            ) : (
                              toField(grade.score) || '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {detail.editable && detail.grades.length > 0 && (
              <div className="evaluations-actions">
                <button
                  type="button"
                  className="leyisa-button leyisa-button-secondary"
                  onClick={onSave}
                  disabled={busy || hasFieldErrors || !dirty}
                >
                  Enregistrer le brouillon
                </button>
                <button
                  type="button"
                  className="leyisa-button"
                  onClick={onSubmit}
                  disabled={busy || hasFieldErrors || filled === 0}
                >
                  Soumettre les notes
                </button>
              </div>
            )}
          </section>}
          {correctionMode&&<section className="leyisa-card"><h2>Historique des tentatives</h2><ul>{detail.history?.map(h=><li key={h.attempt}>Tentative {h.attempt} — {h.status} — {h.reason??'Sans motif de rejet'}</li>)}</ul></section>}
        </>
      )}
    </main>
  );
}
