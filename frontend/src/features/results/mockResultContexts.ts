import type { SubmissionStatus } from './mockSubmittedNotes';

export interface ResultNote {
  studentId: string;
  studentName: string;
  points: number;
}

export interface ResultCourse {
  subject: string;
  maximumPoints: number;
  status: SubmissionStatus;
  notes: ResultNote[];
}

export interface ResultContext {
  id: string;
  className: string;
  periodName: string;
  academicYear: string;
  pendingEvaluations: number;
  submissionIds?: string[];
  courses?: ResultCourse[];
}

const students = [
  { studentId: 'student-a', studentName: 'Élève fictif A' },
  { studentId: 'student-b', studentName: 'Élève fictif B' },
  { studentId: 'student-c', studentName: 'Élève fictif C' },
];

function notes(points: number[]): ResultNote[] {
  return students.map((student, index) => ({ ...student, points: points[index] }));
}

// Données fictives : elles permettent de tester la consultation et la clôture
// sans définir de règle scolaire ou de source de données officielle.
export const resultContextFixtures: ResultContext[] = [
  {
    id: '6a-period-1',
    className: '6e A',
    periodName: 'Période 1',
    academicYear: '2026–2027',
    pendingEvaluations: 0,
    submissionIds: [
      'submission-mathematics-6a-1',
      'submission-french-6a-1',
      'submission-science-6a-1',
    ],
  },
  {
    id: '6a-period-2',
    className: '6e A',
    periodName: 'Période 2',
    academicYear: '2026–2027',
    pendingEvaluations: 0,
    courses: [
      { subject: 'Mathématiques', maximumPoints: 20, status: 'validated', notes: notes([14, 12, 16]) },
      { subject: 'Français', maximumPoints: 20, status: 'validated', notes: notes([13, 11, 15]) },
      { subject: 'Sciences', maximumPoints: 20, status: 'validated', notes: notes([15, 12, 14]) },
    ],
  },
  {
    id: '6b-period-1',
    className: '6e B',
    periodName: 'Période 1',
    academicYear: '2026–2027',
    pendingEvaluations: 0,
    courses: [
      { subject: 'Mathématiques', maximumPoints: 20, status: 'validated', notes: notes([12, 14, 15]) },
      { subject: 'Français', maximumPoints: 20, status: 'validated', notes: notes([14, 13, 12]) },
      { subject: 'Sciences', maximumPoints: 20, status: 'validated', notes: notes([13, 15, 16]) },
    ],
  },
];
