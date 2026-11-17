/**
 * Contrôles de forme des notes reçues par l'API. Aucun accès à la base ici.
 * Les limites appliquées sont celles déjà posées par le schéma commun :
 * note vide autorisée, note >= 0, note <= barème de l'évaluation, 4 décimales au plus.
 */

export const MAX_GRADES_PER_REQUEST = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DECIMAL = /^\d{1,6}(\.\d{1,4})?$/;

export type GradeInput = { enrollmentId: string; score: string | null };
export type GradeError = { enrollmentId: string | null; message: string };
export type GradeParseResult = { grades: GradeInput[]; errors: GradeError[] };

/** Convertit une note en texte décimal canonique, ou renvoie un message d'erreur. */
export function parseScore(value: unknown, maxScore: string): { score: string | null } | { error: string } {
  if (value === null) return { score: null };
  let text: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { error: "La note doit être un nombre." };
    text = String(value);
  } else if (typeof value === "string") {
    text = value.trim();
  } else {
    return { error: "La note doit être un nombre ou rester vide." };
  }
  if (text.startsWith("-")) return { error: "La note ne peut pas être négative." };
  if (!DECIMAL.test(text)) return { error: "La note doit être un nombre avec 4 décimales au plus." };
  if (compareDecimals(text, maxScore) > 0) {
    return { error: `La note dépasse le barème de ${formatScore(maxScore)}.` };
  }
  return { score: text };
}

/** Valide le corps de PUT /evaluations/:id/grades. */
export function parseGrades(body: unknown, maxScore: string): GradeParseResult {
  const list = isRecord(body) ? body.grades : undefined;
  if (!Array.isArray(list) || list.length === 0) {
    return { grades: [], errors: [{ enrollmentId: null, message: "Le champ grades doit contenir au moins une note." }] };
  }
  if (list.length > MAX_GRADES_PER_REQUEST) {
    return { grades: [], errors: [{ enrollmentId: null, message: `Au plus ${MAX_GRADES_PER_REQUEST} notes par envoi.` }] };
  }
  const grades: GradeInput[] = [];
  const errors: GradeError[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const enrollmentId = isRecord(item) && typeof item.enrollmentId === "string" ? item.enrollmentId.toLowerCase() : null;
    if (!enrollmentId || !UUID.test(enrollmentId)) {
      errors.push({ enrollmentId: null, message: "Chaque note doit porter un identifiant d'inscription valide." });
      continue;
    }
    if (seen.has(enrollmentId)) {
      errors.push({ enrollmentId, message: "Cette inscription figure plusieurs fois dans l'envoi." });
      continue;
    }
    seen.add(enrollmentId);
    const parsed = parseScore((item as Record<string, unknown>).score ?? null, maxScore);
    if ("error" in parsed) errors.push({ enrollmentId, message: parsed.error });
    else grades.push({ enrollmentId, score: parsed.score });
  }
  return { grades, errors };
}

/** Retire les zéros décimaux inutiles : "20.0000" devient "20", "12.5000" devient "12.5". */
export function formatScore(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
}

/** Compare deux décimaux positifs écrits en texte, sans passer par les flottants. */
function compareDecimals(a: string, b: string): number {
  const [aInt, aFrac = ""] = a.split(".");
  const [bInt, bFrac = ""] = b.split(".");
  const intA = aInt.replace(/^0+(?=\d)/, "");
  const intB = bInt.replace(/^0+(?=\d)/, "");
  if (intA.length !== intB.length) return intA.length - intB.length;
  if (intA !== intB) return intA < intB ? -1 : 1;
  const width = Math.max(aFrac.length, bFrac.length);
  const fracA = aFrac.padEnd(width, "0");
  const fracB = bFrac.padEnd(width, "0");
  return fracA === fracB ? 0 : fracA < fracB ? -1 : 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
