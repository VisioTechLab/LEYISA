import assert from "node:assert/strict";
import { test } from "node:test";
import { formatScore, parseGrades, parseScore } from "../dist/modules/evaluations/grade-rules.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("une note dans le barème est acceptée, en nombre ou en texte", () => {
  assert.deepEqual(parseScore(15, "20.0000"), { score: "15" });
  assert.deepEqual(parseScore("12.5", "20.0000"), { score: "12.5" });
  assert.deepEqual(parseScore(0, "20.0000"), { score: "0" });
  assert.deepEqual(parseScore("20.0000", "20.0000"), { score: "20.0000" });
});

test("une note vide reste vide et n'est pas convertie en zéro", () => {
  assert.deepEqual(parseScore(null, "20.0000"), { score: null });
});

test("les notes hors limites sont refusées", () => {
  for (const value of [-1, "-0.5", 20.0001, 21, "999999", 1e21]) {
    assert.ok("error" in parseScore(value, "20.0000"), `valeur acceptée à tort : ${value}`);
  }
  assert.ok("error" in parseScore(40.5, "40.0000"));
});

test("les valeurs qui ne sont pas des notes sont refusées", () => {
  for (const value of ["", "abc", "12,5", "1e2", "12.34567", NaN, Infinity, true, {}, [], "15; DROP TABLE"]) {
    assert.ok("error" in parseScore(value, "20.0000"), `valeur acceptée à tort : ${String(value)}`);
  }
});

test("la comparaison au barème ne dépend pas des flottants", () => {
  assert.deepEqual(parseScore("19.9999", "20.0000"), { score: "19.9999" });
  assert.ok("error" in parseScore("100", "20.0000"));
  assert.deepEqual(parseScore("9", "10.0000"), { score: "9" });
  assert.deepEqual(parseScore("007", "10.0000"), { score: "007" });
});

test("le corps de l'envoi doit contenir une liste de notes", () => {
  for (const body of [undefined, null, {}, { grades: [] }, { grades: "x" }, []]) {
    assert.equal(parseGrades(body, "20.0000").errors.length, 1);
  }
});

test("chaque erreur désigne l'inscription concernée", () => {
  const { grades, errors } = parseGrades({ grades: [
    { enrollmentId: A, score: 12 },
    { enrollmentId: B, score: 25 },
    { enrollmentId: A, score: 3 },
    { enrollmentId: "pas-un-uuid", score: 3 },
  ] }, "20.0000");
  assert.deepEqual(grades, [{ enrollmentId: A, score: "12" }]);
  assert.deepEqual(errors.map(({ enrollmentId }) => enrollmentId), [B, A, null]);
});

test("l'envoi est limité en taille", () => {
  const grades = Array.from({ length: 501 }, () => ({ enrollmentId: A, score: 1 }));
  assert.equal(parseGrades({ grades }, "20.0000").errors.length, 1);
});

test("les notes sont affichées sans zéros inutiles", () => {
  assert.equal(formatScore("20.0000"), "20");
  assert.equal(formatScore("12.5000"), "12.5");
  assert.equal(formatScore("100"), "100");
});
