import { api as request } from '../../shared/api';
import type { NewStudent, Student, StudentsDataSource } from "./types";

interface ApiStudent {
  id: string;
  matricule: string;
  birthDate: string | null;
  user: { firstName: string; lastName: string };
  enrollments: Array<{
    classId?: string;
    schoolYearId?: string;
    schoolClass?: { label: string; schoolYear: { code: string } };
  }>;
}

interface ApiSchoolYear {
  id: string;
  code: string;
  classes: Array<{ id: string; code: string; label: string }>;
}

function toStudent(row: ApiStudent): Student {
  const enrollment = row.enrollments[0];
  return {
    id: row.id,
    matricule: row.matricule,
    lastName: row.user.lastName,
    firstName: row.user.firstName,
    birthDate: row.birthDate?.slice(0, 10) ?? null,
    className: enrollment?.schoolClass?.label ?? "—",
    schoolYear: enrollment?.schoolClass?.schoolYear.code ?? "—",
  };
}

export function createApiStudentsDataSource(): StudentsDataSource {
  return {
    async getStudents(search="",page=1) {
      const rows = await request<ApiStudent[]>(`/students?page=${page}&search=${encodeURIComponent(search)}`);
      return rows.map(toStudent);
    },
    async getClasses() {
      const years = await request<ApiSchoolYear[]>("/students/registration-options");
      return years.flatMap((year) => year.classes.map((schoolClass) => ({
        ...schoolClass,
        schoolYearId: year.id,
        schoolYearCode: year.code,
      })));
    },
    async registerStudent(student: NewStudent) {
      const created = await request<ApiStudent>("/students", {
        method: "POST",
        body: JSON.stringify(student),
      });
      return toStudent(created);
    },
  };
}
