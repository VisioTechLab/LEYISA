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

const apiBase = (import.meta.env.VITE_STUDENTS_API_URL || "/api").replace(/\/$/, "");
const tokenKey = import.meta.env.VITE_SESSION_STORAGE_KEY || "leyisa.sessionToken";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = window.sessionStorage.getItem(tokenKey);
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(" ") : payload?.message;
    if (response.status === 401) throw new Error("Connectez-vous avec un compte autorisé pour consulter les élèves.");
    if (response.status === 403) throw new Error("Votre compte ne peut pas accéder au module élèves.");
    throw new Error(message || "Le serveur n’a pas pu traiter la demande.");
  }
  return response.json() as Promise<T>;
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
    async getStudents() {
      const rows = await request<ApiStudent[]>("/students");
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
