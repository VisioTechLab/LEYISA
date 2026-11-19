import type { StudentsDataSource } from "./types";
import { createApiStudentsDataSource } from "./apiStudentsDataSource";
export async function loadStudentsDataSource():Promise<StudentsDataSource> {return createApiStudentsDataSource();}
