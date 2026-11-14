# Matrice des droits (RBAC et ABAC)

Activité G01 de la matrice RACI. Réalisation : Sidonie. Validation : Kevin. Consultés : Joel, Melvin.

**Statut : proposé.** Source : rôles et user stories US-001 à US-027 du Ready-to-Code. Code : `backend/src/modules/auth/permissions.ts` et `access-rules.ts`.

## Principes

- **R02 : refus par défaut.** Une permission absente de la matrice n'est accordée à personne. Une route protégée sans permission déclarée est refusée.
- **Le rôle ouvre la porte, l'appartenance décide (ABAC).** Avoir le rôle ENS ne donne accès qu'à ses propres affectations et grilles.
- **Plusieurs rôles possibles** pour un même compte : les permissions s'additionnent, sauf la règle R03 qui s'applique toujours.
- **Le serveur décide.** L'écran masque les menus avec la liste `permissions` renvoyée par `/auth/me`, mais chaque API revérifie.
- **ELEVE** existe dans le schéma mais ne reçoit aucun droit en V1.

## Rôles

| Rôle | Mission | Limite (Ready-to-Code) |
|---|---|---|
| ADM | Comptes, année, périodes, classes, matières, affectations | N'approuve jamais une note |
| SEC | Recherche et dossier élève, inscription, téléchargement des bulletins | N'accède pas aux notes en cours |
| ENS | Ses classes et matières, évaluations, notes, soumission | Ni les notes d'un collègue, ni la validation des siennes |
| DIR | Soumissions, validation ou rejet, résultats, clôture, bulletins | N'écrit pas une note à la place de l'enseignant |

## Matrice RBAC

| Permission | ADM | SEC | ENS | DIR | User stories | Module |
|---|:-:|:-:|:-:|:-:|---|---|
| `accounts.manage` | ✓ | | | | US-003 | auth (Sidonie) |
| `audit.read` | ✓ | | | ✓ | US-027 | auth (Sidonie) |
| `school.configure` | ✓ | | | | US-004 à US-008 | school (Jonathan) |
| `school.read` | ✓ | ✓ | ✓ | ✓ | lecture de la configuration | school (Jonathan) |
| `students.search` | | ✓ | | | US-009 | students (Franck) |
| `students.create` | | ✓ | | | US-010 | students (Franck) |
| `students.enroll` | | ✓ | | | US-011 | students (Franck) |
| `students.history` | | ✓ | | | US-012 | students (Franck) |
| `teachers.manage` | ✓ | | | | US-013 | assignments (Kevin) |
| `assignments.manage` | ✓ | | | | US-014 | assignments (Kevin) |
| `assignments.readOwn` | | | ✓ | | US-015 + A1 | assignments (Kevin) |
| `evaluations.create` | | | ✓ | | US-016 + A2 | evaluations (Joel) |
| `grades.write` | | | ✓ | | US-017, US-019 + A2 | evaluations (Joel) |
| `grades.submit` | | | ✓ | | US-018 + A2 | evaluations (Joel) |
| `submissions.read` | | | | ✓ | US-020 | results (Melvin) |
| `submissions.decide` | | | | ✓ | US-021, US-022 + A3 | results (Melvin) |
| `results.preview` | | | | ✓ | US-023 | results (Melvin) |
| `results.close` | | | | ✓ | US-024 | results (Melvin) |
| `bulletins.produce` | | | | ✓ | US-025 | bulletins (Jonathan) |
| `bulletins.download` | | ✓ | | ✓ | US-026 | bulletins (Jonathan) |

Connexion, déconnexion et `/auth/me` (US-001, US-002) : tout compte actif, sans permission particulière.

## Règles d'appartenance (ABAC)

Chaque responsable les applique dans son service (RACI G04 : « chaque responsable protège aussi ses propres API »), avec les fonctions de `access-rules.ts`.

| Règle | Contrôle | Fonction | Source |
|---|---|---|---|
| A1 | Un enseignant ne voit que ses affectations (`Teacher.userId` = compte connecté). Changer un identifiant dans l'URL ne donne rien. | `assertOwnedBy` | US-015, R15 |
| A2 | Seul l'enseignant affecté crée une évaluation et modifie sa grille, en brouillon ou rejetée. | `assertOwnedBy` | R15, R16 |
| A3 | Personne ne valide ni ne rejette sa propre soumission (`decidedBy` ≠ `submittedBy`), même avec ENS et DIR. | `assertNotOwnSubmission` | R03 |
| A4 | Aucune écriture sur une classe-période clôturée. | `assertPeriodOpen` | R22 |
| A5 | Le dernier administrateur actif ne peut être ni désactivé ni privé du rôle ADM. | module auth | US-003 |
| A6 | Le journal d'audit est en lecture seule : aucune API ne modifie ni n'efface une trace. | module auth | US-027 |

## Utilisation dans un module

```ts
import { CurrentAuth, Requires, assertOwnedBy, type AuthContext } from "../auth/index.js";

@Controller("eleves")
export class StudentsController {
  @Requires("students.enroll")   // 401 sans session, 403 si le rôle ne suffit pas
  @Post(":id/inscriptions")
  inscrire(@CurrentAuth() auth: AuthContext) { /* … */ }
}
```

Le module importe `AuthModule`. Réponse 403 : « Votre rôle ne permet pas cette action. »

## Cas de test (dans `backend/test/auth.test.mjs`)

- ADM ne peut pas décider d'une soumission ; SEC et DIR n'écrivent pas de note ; ENS ne cherche pas d'élève ; ELEVE n'a aucun droit ; une permission inconnue est refusée.
- Un compte ENS et DIR ne décide pas de sa propre soumission.
- Route protégée : 401 sans session, 403 pour DIR sur une inscription, 200 pour SEC.

## Points à valider

| Sujet | Proposition | À valider avec |
|---|---|---|
| `school.read` pour les quatre rôles | Nécessaire pour inscrire (SEC), affecter (ADM), noter (ENS) et clôturer (DIR) ; absent du Ready-to-Code | Kevin, Jonathan |
| Lecture d'un dossier élève par DIR | Non accordée : le Ready-to-Code réserve US-009 à US-012 au secrétariat | Franck, Melvin |
| `results.preview` pour ADM | Non accordée | Melvin |
| Premier administrateur | Aucun compte ADM dans les données de démonstration | Kevin, Melvin |
