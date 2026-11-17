# Module évaluations — consultation, saisie et soumission des notes

Responsable : Joel. Statut du contrat ci-dessous : **proposé**, à confirmer avec Melvin (results),
Kevin (assignments), Franck (students) et Sidonie (auth). Il ne modifie ni le schéma Prisma ni les migrations.

## Opérations proposées

| Opération | Effet | Réponses |
| --- | --- | --- |
| `GET /evaluations` | Liste des évaluations avec classe, matière, période, enseignant, état et `editable`. | 200 |
| `GET /evaluations/:id` | Une évaluation, les inscriptions de sa classe avec leur note, et la dernière soumission. | 200, 400 (identifiant mal formé), 404 |
| `PUT /evaluations/:id/grades` | Enregistre des notes de brouillon. Une inscription absente de l'envoi reste inchangée. | 200, 400, 404, 409 |
| `POST /evaluations/:id/submission` | Fige la grille dans une `Submission` en attente et passe l'évaluation à `SUBMITTED`. | 201, 404, 409 |

Exemple fictif d'envoi de notes :

```json
{ "grades": [
  { "enrollmentId": "11111111-1111-4111-8111-111111111111", "score": 15 },
  { "enrollmentId": "22222222-2222-4222-8222-222222222222", "score": null }
] }
```

Un refus de saisie renvoie 400 avec la liste des notes en cause ; aucune note de l'envoi n'est alors enregistrée :

```json
{ "message": "Certaines notes sont refusées.",
  "errors": [{ "enrollmentId": "22222222-2222-4222-8222-222222222222", "message": "La note dépasse le barème de 20." }] }
```

## Contrôles appliqués

Ils reprennent les limites déjà posées par le schéma commun, sans règle scolaire nouvelle.

- Note vide (`null`) autorisée et jamais convertie en zéro ; sinon nombre entre 0 et le barème de l'évaluation, 4 décimales au plus.
- L'inscription doit appartenir à la classe de l'évaluation ; pas de doublon dans un envoi ; 500 notes au plus par envoi.
- Saisie et soumission possibles seulement si l'évaluation est `DRAFT` ou `REJECTED` et si la période de la classe est ouverte. Sinon 409.
- Une grille sans aucune note ne peut pas être soumise.
- La soumission crée la tentative suivante (`attempt`), avec une nouvelle `evaluationVersion` après un rejet,
  comme dans le jeu de données commun. `gradeSnapshot` contient une entrée par inscription de la classe :
  `{ "enrollmentId": "...", "score": "15" }`, `score` valant `null` pour une note vide.

## Décisions ouvertes

- **Authentification et droits (Sidonie).** Aucune opération n'est encore protégée : tant que l'auth n'identifie pas
  l'utilisateur, l'auteur enregistré d'une soumission est l'enseignant affecté à l'évaluation. À remplacer par
  l'utilisateur connecté, avec contrôle du rôle et de l'affectation, avant toute exposition hors développement.
- **Notes vides à la soumission (Melvin, Franck).** La gestion des absences n'est pas décidée. Proposition actuelle :
  les notes vides sont acceptées et transmises telles quelles ; l'écran demande une confirmation.
- **Échelle et décimales (Melvin, Franck).** Seules les limites du schéma sont appliquées.
- **Audit (Sidonie).** Aucune entrée `AuditEntry` n'est écrite : le nom des actions n'est pas convenu.
- **Création d'une évaluation.** Non couverte par cette tranche.

## Vérifier

```sh
cd backend
npm test
```

Les tests de `test/evaluations.rules.test.mjs` ne demandent pas de base. Ceux de `test/evaluations.db.test.mjs`
écrivent des données fictives : ils s'exécutent seulement avec `LEYISA_DB_MODE=local` et une `DATABASE_URL` locale
(loopback) déjà migrée, et sont ignorés sur la base commune.
