export type SubmissionStatus = 'pending' | 'validated' | 'rejected';

export interface SubmittedNote {
  studentId: string;
  studentName: string;
  points: number;
}

export interface SubmittedNotes {
  id: string;
  subject: string;
  className: string;
  periodName: string;
  teacherName: string;
  assessmentName: string;
  maximumPoints: number;
  status: SubmissionStatus;
  rejectionReason?: string;
  notes: SubmittedNote[];
}

// Données fictives destinées uniquement à la démonstration de l'interface.
export const submittedNotesFixtures: SubmittedNotes[] = [
  {
    id: 'submission-mathematics-6a-1',
    subject: 'Mathématiques',
    className: '6e A',
    periodName: 'Période 1',
    teacherName: 'Enseignant fictif A',
    assessmentName: 'Interrogation 1',
    maximumPoints: 20,
    status: 'pending',
    notes: [
      { studentId: 'student-a', studentName: 'Élève fictif A', points: 15 },
      { studentId: 'student-b', studentName: 'Élève fictif B', points: 12 },
      { studentId: 'student-c', studentName: 'Élève fictif C', points: 14 },
    ],
  },
  {
    id: 'submission-french-6a-1',
    subject: 'Français',
    className: '6e A',
    periodName: 'Période 1',
    teacherName: 'Enseignant fictif B',
    assessmentName: 'Interrogation 1',
    maximumPoints: 20,
    status: 'pending',
    notes: [
      { studentId: 'student-a', studentName: 'Élève fictif A', points: 12 },
      { studentId: 'student-b', studentName: 'Élève fictif B', points: 11 },
      { studentId: 'student-c', studentName: 'Élève fictif C', points: 13 },
    ],
  },
  {
    id: 'submission-science-6a-1',
    subject: 'Sciences',
    className: '6e A',
    periodName: 'Période 1',
    teacherName: 'Enseignant fictif C',
    assessmentName: 'Contrôle 1',
    maximumPoints: 20,
    status: 'pending',
    notes: [
      { studentId: 'student-a', studentName: 'Élève fictif A', points: 16 },
      { studentId: 'student-b', studentName: 'Élève fictif B', points: 10 },
      { studentId: 'student-c', studentName: 'Élève fictif C', points: 15 },
    ],
  },
];
