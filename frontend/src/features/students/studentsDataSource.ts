import type { StudentsDataSource } from "./types";

export async function loadStudentsDataSource(): Promise<StudentsDataSource | null> {
  if (!import.meta.env.DEV) {
    return null;
  }

  const { createDemoStudentsDataSource } = await import("./demoStudentsDataSource");
  return createDemoStudentsDataSource();
}
