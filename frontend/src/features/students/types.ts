export type StudentSex = "F" | "M";

export interface Student {
  id: string;
  lastName: string;
  postName: string;
  firstName: string;
  birthDate: string;
  sex: StudentSex;
  className: string;
}

export type NewStudent = Omit<Student, "id">;

export interface StudentsDataSource {
  getStudents(): Promise<Student[]>;
  registerStudent(student: NewStudent): Promise<Student>;
}
