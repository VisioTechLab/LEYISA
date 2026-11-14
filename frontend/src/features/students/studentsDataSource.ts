import type { StudentsDataSource } from "./types";

export async function loadStudentsDataSource(): Promise<StudentsDataSource | null> {
  if (import.meta.env.DEV && import.meta.env.VITE_STUDENTS_DEMO === "true") {
    const { createDemoStudentsDataSource } = await import("./demoStudentsDataSource");
    return createDemoStudentsDataSource();
  }

  const { createApiStudentsDataSource } = await import("./apiStudentsDataSource");
  return createApiStudentsDataSource();
}
