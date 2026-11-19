export interface Student {
  id: string;
  matricule: string;
  lastName: string;
  firstName: string;
  birthDate: string | null;
  className: string;
  schoolYear: string;
}

export interface ClassOption {
  id: string;
  code: string;
  label: string;
  schoolYearId: string;
  schoolYearCode: string;
}

export interface NewStudent {
  firstName: string;
  lastName: string;
  matricule: string;
  birthDate: string;
  classId: string;
  schoolYearId: string;
}

export interface StudentsDataSource {
  getStudents(search?:string,page?:number): Promise<Student[]>;
  getClasses(): Promise<ClassOption[]>;
  registerStudent(student: NewStudent): Promise<Student>;
}
