import { useState } from 'react';

import { resultContextFixtures } from './mockResultContexts';
import { submittedNotesFixtures, type SubmissionStatus } from './mockSubmittedNotes';
import { NotesValidationPage } from './NotesValidationPage';
import { ResultsAndClosurePage } from './ResultsAndClosurePage';

type ResultsView = 'validation' | 'results';

export function ResultsWorkspace() {
  const [activeView, setActiveView] = useState<ResultsView>('validation');
  const [submissions, setSubmissions] = useState(submittedNotesFixtures);
  const [closedPeriodIds, setClosedPeriodIds] = useState<string[]>([]);
  const [closedAcademicYearClasses, setClosedAcademicYearClasses] = useState<string[]>([]);

  function decideSubmission(submissionId: string, status: SubmissionStatus, rejectionReason?: string) {
    setSubmissions((currentSubmissions) =>
      currentSubmissions.map((submission) =>
        submission.id === submissionId
          ? { ...submission, status, rejectionReason }
          : submission,
      ),
    );
  }

  function closePeriod(contextId: string) {
    setClosedPeriodIds((currentIds) =>
      currentIds.includes(contextId) ? currentIds : [...currentIds, contextId],
    );
  }

  function closeAcademicYear(className: string) {
    const classPeriodIds = resultContextFixtures
      .filter((context) => context.className === className)
      .map((context) => context.id);
    const everyPeriodIsClosed = classPeriodIds.every((contextId) => closedPeriodIds.includes(contextId));

    if (everyPeriodIsClosed) {
      setClosedAcademicYearClasses((currentClasses) =>
        currentClasses.includes(className) ? currentClasses : [...currentClasses, className],
      );
    }
  }

  const isValidationLocked = submissions.some((submission) => {
    const context = resultContextFixtures.find(
      (item) => item.className === submission.className && item.periodName === submission.periodName,
    );

    return (
      context !== undefined &&
      (closedPeriodIds.includes(context.id) || closedAcademicYearClasses.includes(submission.className))
    );
  });

  if (activeView === 'results') {
    return (
      <ResultsAndClosurePage
        closedAcademicYearClasses={closedAcademicYearClasses}
        closedPeriodIds={closedPeriodIds}
        onCloseAcademicYear={closeAcademicYear}
        onClosePeriod={closePeriod}
        onShowValidation={() => setActiveView('validation')}
        submissions={submissions}
      />
    );
  }

  return (
    <NotesValidationPage
      isLocked={isValidationLocked}
      onDecision={decideSubmission}
      onShowResults={() => setActiveView('results')}
      submissions={submissions}
    />
  );
}
