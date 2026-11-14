import type { ClassOption, NewStudent, Student, StudentsDataSource } from "./types";

const demoClass: ClassOption = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  code: "6A",
  label: "6e A",
  schoolYearId: "123e4567-e89b-12d3-a456-426614174001",
  schoolYearCode: "2026-2027",
};

const initialStudents: Student[] = [
  { id: "DEMO-001", matricule: "DEMO-001", lastName: "Mabiala", firstName: "Aline", birthDate: "2013-04-18", className: "6e A", schoolYear: "2026-2027" },
  { id: "DEMO-002", matricule: "DEMO-002", lastName: "Lukusa", firstName: "David", birthDate: "2012-11-02", className: "6e A", schoolYear: "2026-2027" },
  { id: "DEMO-003", matricule: "DEMO-003", lastName: "Ilunga", firstName: "Sarah", birthDate: "2013-08-27", className: "6e A", schoolYear: "2026-2027" },
];

const pause = () => new Promise<void>((resolve) => window.setTimeout(resolve, 250));

export function createDemoStudentsDataSource(): StudentsDataSource {
  let students = [...initialStudents];
  return {
    async getStudents() { await pause(); return [...students]; },
    async getClasses() { await pause(); return [demoClass]; },
    async registerStudent(input: NewStudent) {
      await pause();
      const student: Student = {
        ...input,
        id: `DEMO-${String(students.length + 1).padStart(3, "0")}`,
        className: demoClass.label,
        schoolYear: demoClass.schoolYearCode,
      };
      students = [...students, student];
      return student;
    },
  };
}
