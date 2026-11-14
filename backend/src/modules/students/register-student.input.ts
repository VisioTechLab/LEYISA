import { BadRequestException } from "@nestjs/common";

export interface RegisterStudentInput {
  firstName: string;
  lastName: string;
  matricule: string;
  birthDate?: string | null;
  classId: string;
  schoolYearId: string;
}

export interface NormalizedRegisterStudentInput {
  firstName: string;
  lastName: string;
  matricule: string;
  birthDate: Date | null;
  classId: string;
  schoolYearId: string;
}

const fields = new Set([
  "firstName",
  "lastName",
  "matricule",
  "birthDate",
  "classId",
  "schoolYearId",
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequestException(`${field} est obligatoire.`);
  }
  return value.trim();
}

function requiredUuid(value: unknown, field: string): string {
  const result = requiredString(value, field);
  if (!uuidPattern.test(result)) {
    throw new BadRequestException(`${field} doit être un UUID valide.`);
  }
  return result;
}

export function parseStudentId(value: unknown): string {
  return requiredUuid(value, "studentId");
}

function optionalDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException("birthDate doit être une date au format AAAA-MM-JJ.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException("birthDate doit être une date valide.");
  }
  return date;
}

export function parseRegisterStudentInput(value: unknown): NormalizedRegisterStudentInput {
  if (!isRecord(value)) {
    throw new BadRequestException("Les données de l’élève sont invalides.");
  }

  const unknownField = Object.keys(value).find((field) => !fields.has(field));
  if (unknownField) {
    throw new BadRequestException(`Champ non pris en charge : ${unknownField}.`);
  }

  const matricule = requiredString(value.matricule, "matricule");
  if (matricule !== value.matricule) {
    throw new BadRequestException("matricule ne peut pas contenir d’espaces superflus.");
  }

  return {
    firstName: requiredString(value.firstName, "firstName"),
    lastName: requiredString(value.lastName, "lastName"),
    matricule,
    birthDate: optionalDate(value.birthDate),
    classId: requiredUuid(value.classId, "classId"),
    schoolYearId: requiredUuid(value.schoolYearId, "schoolYearId"),
  };
}
