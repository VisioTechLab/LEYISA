import type { NewStudent, Student, StudentsDataSource } from "./types";

const initialStudents: Student[] = [
  { id: "ELV-001", lastName: "Mabiala", postName: "Kanku", firstName: "Aline", birthDate: "2013-04-18", sex: "F", className: "6e A" },
  { id: "ELV-002", lastName: "Lukusa", postName: "Beya", firstName: "David", birthDate: "2012-11-02", sex: "M", className: "6e A" },
  { id: "ELV-003", lastName: "Ilunga", postName: "Moke", firstName: "Sarah", birthDate: "2013-08-27", sex: "F", className: "6e A" },
];

const pause = () => new Promise<void>((resolve) => window.setTimeout(resolve, 250));

export function createDemoStudentsDataSource(): StudentsDataSource {
  let students = [...initialStudents];

  return {
    async getStudents() {
      await pause();
      return [...students];
    },
    async registerStudent(input: NewStudent) {
      await pause();
      const student: Student = {
        ...input,
        id: `ELV-${String(students.length + 1).padStart(3, "0")}`,
      };
      students = [...students, student];
      return student;
    },
  };
}
