import { useState } from 'react';

import {
  type SubmissionStatus,
  type SubmittedNotes,
} from './mockSubmittedNotes';
import './notesValidationPage.css';

const statusLabels: Record<SubmissionStatus, string> = {
  pending: 'En attente',
  validated: 'Validée',
  rejected: 'Rejetée',
};

interface NotesValidationPageProps {
  submissions: SubmittedNotes[];
  isLocked: boolean;
  onDecision: (submissionId: string, status: SubmissionStatus, reason?: string) => void;
  onShowResults: () => void;
}

export function NotesValidationPage({
  submissions,
  isLocked,
  onDecision,
  onShowResults,
}: NotesValidationPageProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(submissions[0].id);
  const [rejectionReason, setRejectionReason] = useState('');
  const [feedback, setFeedback] = useState('');

  const selectedSubmission = submissions.find(
    (submission) => submission.id === selectedSubmissionId,
  ) as SubmittedNotes;

  function selectSubmission(submissionId: string) {
    setSelectedSubmissionId(submissionId);
    setRejectionReason('');
    setFeedback('');
  }

  function updateDecision(status: SubmissionStatus, reason?: string) {
    onDecision(selectedSubmissionId, status, reason);
  }

  function validateSubmission() {
    updateDecision('validated');
    setRejectionReason('');
    setFeedback('Les notes ont été validées pour cette démonstration.');
  }

  function rejectSubmission() {
    const reason = rejectionReason.trim();

    if (!reason) {
      return;
    }

    updateDecision('rejected', reason);
    setFeedback('Les notes ont été rejetées avec le motif saisi.');
  }

  return (
    <main className="notes-validation-page">
      <section className="notes-validation-heading" aria-labelledby="notes-validation-title">
        <div>
          <p className="notes-validation-breadcrumb">Leyisa School / Validation des notes</p>
          <h1 id="notes-validation-title">Validation des notes</h1>
          <p>
            Examiner les soumissions avant qu&apos;elles entrent dans les résultats.
          </p>
        </div>
        <span className="notes-validation-demo">Données fictives — démonstration</span>
      </section>

      <nav className="notes-validation-nav" aria-label="Navigation du module résultats">
        <span aria-current="page">Validation des notes</span>
        <button onClick={onShowResults} type="button">
          Résultats et clôture
        </button>
      </nav>

      <section className="notes-validation-layout" aria-label="Soumissions de notes">
        <aside className="notes-validation-card notes-validation-submissions">
          <div className="notes-validation-card-heading">
            <h2>Soumissions à examiner</h2>
            <p>Classe, matière et enseignant</p>
          </div>

          <div className="notes-validation-submission-list" role="list">
            {submissions.map((submission) => (
              <button
                className={`notes-validation-submission${
                  submission.id === selectedSubmissionId ? ' is-selected' : ''
                }`}
                key={submission.id}
                onClick={() => selectSubmission(submission.id)}
                type="button"
              >
                <span>
                  <strong>{submission.subject}</strong>
                  <small>
                    {submission.className} · {submission.teacherName}
                  </small>
                </span>
                <span
                  className={`notes-validation-status notes-validation-status--${submission.status}`}
                >
                  {statusLabels[submission.status]}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="notes-validation-card notes-validation-detail" aria-live="polite">
          <div className="notes-validation-card-heading">
            <h2>Détail : {selectedSubmission.subject}</h2>
            <p>
              {selectedSubmission.assessmentName} — lecture seule
            </p>
          </div>

          <p className="notes-validation-metadata">
            {selectedSubmission.teacherName} · {selectedSubmission.assessmentName} · /
            {selectedSubmission.maximumPoints}
          </p>

          <div className="notes-validation-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Élève</th>
                  <th scope="col">Points</th>
                </tr>
              </thead>
              <tbody>
                {selectedSubmission.notes.map((note) => (
                  <tr key={note.studentId}>
                    <td>{note.studentName}</td>
                    <td>
                      {note.points.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="notes-validation-reason" htmlFor="rejection-reason">
            Motif du rejet <span>(obligatoire pour rejeter)</span>
            <textarea
              aria-describedby="rejection-reason-help"
              disabled={isLocked || selectedSubmission.status !== 'pending'}
              id="rejection-reason"
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Préciser la correction attendue…"
              value={rejectionReason}
            />
            <small id="rejection-reason-help">
              Sans motif, la soumission reste en attente et ne peut pas être rejetée.
            </small>
          </label>

          <div className="notes-validation-actions">
            <button
              className="notes-validation-button notes-validation-button--secondary"
              disabled={
                isLocked || selectedSubmission.status !== 'pending' || !rejectionReason.trim()
              }
              onClick={rejectSubmission}
              type="button"
            >
              Rejeter
            </button>
            <button
              className="notes-validation-button notes-validation-button--primary"
              disabled={isLocked || selectedSubmission.status !== 'pending'}
              onClick={validateSubmission}
              type="button"
            >
              Valider les notes
            </button>
          </div>

          {selectedSubmission.status !== 'pending' && (
            <p className={`notes-validation-decision is-${selectedSubmission.status}`}>
              Décision : {statusLabels[selectedSubmission.status]}
              {selectedSubmission.rejectionReason
                ? ` — ${selectedSubmission.rejectionReason}`
                : ''}
            </p>
          )}
          {feedback && <p className="notes-validation-feedback">{feedback}</p>}
          {isLocked && (
            <p className="notes-validation-locked">
              Cette période ou cette année a été scellée dans la démonstration : aucune décision
              supplémentaire n’est possible.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
