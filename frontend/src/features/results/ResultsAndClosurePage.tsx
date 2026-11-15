import { useMemo, useState } from 'react';

import {
  resultContextFixtures,
  type ResultContext,
  type ResultCourse,
} from './mockResultContexts';
import type { SubmittedNotes } from './mockSubmittedNotes';
import './resultsAndClosurePage.css';

interface ResultsAndClosurePageProps {
  submissions: SubmittedNotes[];
  closedPeriodIds: string[];
  closedAcademicYearClasses: string[];
  onClosePeriod: (contextId: string) => void;
  onCloseAcademicYear: (className: string) => void;
  onShowValidation: () => void;
}

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function courseStatusLabel(status: ResultCourse['status']) {
  if (status === 'validated') return 'Validée';
  if (status === 'rejected') return 'Rejetée';
  return 'À valider';
}

export function ResultsAndClosurePage({
  submissions,
  closedPeriodIds,
  closedAcademicYearClasses,
  onClosePeriod,
  onCloseAcademicYear,
  onShowValidation,
}: ResultsAndClosurePageProps) {
  const classes = useMemo(
    () => [...new Set(resultContextFixtures.map((context) => context.className))],
    [],
  );
  const [selectedClassName, setSelectedClassName] = useState(classes[0]);
  const periods = resultContextFixtures.filter(
    (context) => context.className === selectedClassName,
  );
  const [selectedPeriodName, setSelectedPeriodName] = useState(periods[0].periodName);
  const [periodConfirmed, setPeriodConfirmed] = useState(false);
  const [yearConfirmed, setYearConfirmed] = useState(false);

  const selectedContext = resultContextFixtures.find(
    (context) =>
      context.className === selectedClassName && context.periodName === selectedPeriodName,
  ) as ResultContext;
  const selectedCourses = getCourses(selectedContext, submissions);
  const isPeriodClosed = closedPeriodIds.includes(selectedContext.id);
  const isAcademicYearClosed = closedAcademicYearClasses.includes(selectedContext.className);
  const isLocked = isPeriodClosed || isAcademicYearClosed;
  const incompleteCourses = selectedCourses.filter((course) => course.status !== 'validated');
  const canClosePeriod =
    !isLocked && incompleteCourses.length === 0 && selectedContext.pendingEvaluations === 0;
  const classContexts = resultContextFixtures.filter(
    (context) => context.className === selectedContext.className,
  );
  const canCloseAcademicYear =
    !isAcademicYearClosed && classContexts.every((context) => closedPeriodIds.includes(context.id));
  const studentRows = createStudentRows(selectedCourses);

  function changeClass(className: string) {
    const nextPeriods = resultContextFixtures.filter((context) => context.className === className);
    setSelectedClassName(className);
    setSelectedPeriodName(nextPeriods[0].periodName);
    setPeriodConfirmed(false);
    setYearConfirmed(false);
  }

  function changePeriod(periodName: string) {
    setSelectedPeriodName(periodName);
    setPeriodConfirmed(false);
    setYearConfirmed(false);
  }

  return (
    <main className="results-page">
      <header className="results-page-heading">
        <div>
          <p className="results-breadcrumb">Leyisa School / Résultats et clôture</p>
          <h1>Résultats et clôture</h1>
          <p>Vérifier les résultats avant de sceller la période, puis l’année scolaire.</p>
        </div>
        <span className="results-demo-badge">DÉMONSTRATION — NON OFFICIEL</span>
      </header>

      <nav className="results-demo-nav" aria-label="Navigation du module résultats">
        <button onClick={onShowValidation} type="button">
          Validation des notes
        </button>
        <span aria-current="page">Résultats et clôture</span>
      </nav>

      <section className="results-context-card" aria-labelledby="results-context-title">
        <div>
          <h2 id="results-context-title">Contexte du résultat</h2>
          <p>Toutes les valeurs ci-dessous sont fictives.</p>
        </div>
        <div className="results-selects">
          <label htmlFor="results-class">
            Classe
            <select
              id="results-class"
              onChange={(event) => changeClass(event.target.value)}
              value={selectedClassName}
            >
              {classes.map((className) => (
                <option key={className}>{className}</option>
              ))}
            </select>
          </label>
          <label htmlFor="results-period">
            Période
            <select
              id="results-period"
              onChange={(event) => changePeriod(event.target.value)}
              value={selectedPeriodName}
            >
              {periods.map((period) => (
                <option key={period.id}>{period.periodName}</option>
              ))}
            </select>
          </label>
        </div>
        <span className={`results-state${isLocked ? ' is-closed' : ''}`}>
          {isAcademicYearClosed ? 'Année scellée' : isPeriodClosed ? 'Période clôturée' : 'Provisoire'}
        </span>
      </section>

      <section className="results-grid">
        <section className="results-card" aria-labelledby="results-preview-title">
          <div className="results-card-heading">
            <h2 id="results-preview-title">Aperçu des résultats</h2>
            <p>Calcul DEMO_V1 — moyenne arithmétique sur 20, non officielle.</p>
          </div>

          <div className="results-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Élève</th>
                  {selectedCourses.map((course) => (
                    <th key={course.subject} scope="col">
                      {course.subject}
                    </th>
                  ))}
                  <th scope="col">Moyenne</th>
                </tr>
              </thead>
              <tbody>
                {studentRows.map((student) => (
                  <tr key={student.studentId}>
                    <td>{student.studentName}</td>
                    {student.courseResults.map((courseResult) => (
                      <td key={courseResult.subject}>
                        {courseResult.status === 'validated'
                          ? `${numberFormatter.format(courseResult.points)}/${courseResult.maximumPoints}`
                          : courseStatusLabel(courseResult.status)}
                      </td>
                    ))}
                    <td>{student.average === null ? '—' : `${numberFormatter.format(student.average)}/20`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="results-validation-summary" aria-live="polite">
            <strong>Contrôles avant clôture</strong>
            <ul>
              <li>
                {incompleteCourses.length === 0
                  ? 'Toutes les notes sont validées.'
                  : `${incompleteCourses.length} soumission(s) non validée(s) : ${incompleteCourses
                      .map((course) => course.subject)
                      .join(', ')}.`}
              </li>
              <li>
                {selectedContext.pendingEvaluations === 0
                  ? 'Aucune évaluation en attente.'
                  : `${selectedContext.pendingEvaluations} évaluation(s) en attente.`}
              </li>
            </ul>
          </div>
        </section>

        <aside className="results-card results-closure" aria-labelledby="period-closure-title">
          <h2 id="period-closure-title">Clôture de la période</h2>
          <p>Possible uniquement après contrôle de toutes les soumissions et évaluations.</p>
          <span className={`results-state${isLocked ? ' is-closed' : ''}`}>
            {isPeriodClosed ? 'Clôturée' : 'Non clôturée'}
          </span>

          {!isLocked && !canClosePeriod && (
            <p className="results-warning">La clôture reste bloquée tant qu’un contrôle est incomplet.</p>
          )}

          <label className="results-confirmation" htmlFor="period-confirmation">
            <input
              checked={periodConfirmed}
              disabled={!canClosePeriod}
              id="period-confirmation"
              onChange={(event) => setPeriodConfirmed(event.target.checked)}
              type="checkbox"
            />
            Je confirme la clôture de cette période de démonstration.
          </label>
          <button
            className="results-primary-button"
            disabled={!canClosePeriod || !periodConfirmed}
            onClick={() => onClosePeriod(selectedContext.id)}
            type="button"
          >
            Clôturer la période
          </button>

          <div className="results-year-closure">
            <h3>Clôture de l’année</h3>
            <p>La fermeture est disponible une fois toutes les périodes de cette classe clôturées.</p>
            <label className="results-confirmation" htmlFor="year-confirmation">
              <input
                checked={yearConfirmed}
                disabled={!canCloseAcademicYear}
                id="year-confirmation"
                onChange={(event) => setYearConfirmed(event.target.checked)}
                type="checkbox"
              />
              Je confirme le scellement de l’année scolaire.
            </label>
            <button
              className="results-secondary-button"
              disabled={!canCloseAcademicYear || !yearConfirmed}
              onClick={() => onCloseAcademicYear(selectedContext.className)}
              type="button"
            >
              Sceller l’année
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

function getCourses(context: ResultContext, submissions: SubmittedNotes[]): ResultCourse[] {
  if (context.submissionIds) {
    return context.submissionIds.flatMap((submissionId) => {
      const submission = submissions.find((item) => item.id === submissionId);
      if (!submission) return [];

      return [
        {
          subject: submission.subject,
          maximumPoints: submission.maximumPoints,
          status: submission.status,
          notes: submission.notes,
        },
      ];
    });
  }

  return context.courses ?? [];
}

function createStudentRows(courses: ResultCourse[]) {
  const students = new Map<string, string>();
  courses.forEach((course) => {
    course.notes.forEach((note) => students.set(note.studentId, note.studentName));
  });

  return [...students].map(([studentId, studentName]) => {
    const courseResults = courses.map((course) => {
      const note = course.notes.find((item) => item.studentId === studentId);
      return {
        subject: course.subject,
        maximumPoints: course.maximumPoints,
        points: note?.points ?? 0,
        status: course.status,
      };
    });
    const hasOnlyValidatedNotes = courseResults.every((course) => course.status === 'validated');
    const average = hasOnlyValidatedNotes
      ? courseResults.reduce((sum, course) => sum + (course.points / course.maximumPoints) * 20, 0) /
        courseResults.length
      : null;

    return { studentId, studentName, courseResults, average };
  });
}
