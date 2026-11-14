# Bloquants — parcours d’inscription des élèves

État de l’audit du 14 novembre 2026. Ces points empêchent d’activer et de valider le parcours complet sans inventer de contrats ou contourner les autorisations.

| Sujet | Constat vérifié | Décision / personne à solliciter |
|---|---|---|
| Table Neon | Franck indique `Inscription`, mais le catalogue de la base connectée expose `public."Enrollment"` et aucune table `Inscription`. Le code cible `Enrollment`, la table existante, sans en créer une autre. | Si une table nommée littéralement `Inscription` est attendue dans cette base, il faudra la renommer avec un compte propriétaire/migration; le rôle runtime n’a pas de droits DDL. |
| Accès Neon et identifiants | Les contrôles `db:check-connection` et `db:check-access` réussissent avec l’accès réseau autorisé. Neon contient 93 élèves; les IDs existants pour 2026-2027 et 6e A ont été utilisés pour le test. | Aucun blocage d’accès en lecture/écriture pour le compte runtime. |
| Autorisations | Le module vérifie une session Bearer active, non révoquée et de type staff. La règle provisoire autorise `ADM` et `SEC` à lire et inscrire. Le dépôt ne définit pas les droits students, et aucun flux de connexion frontend ne fournit encore le jeton. | Règle à confirmer avec Sidonie. Le frontend lit le jeton dans `sessionStorage` sous `leyisa.sessionToken` (modifiable avec `VITE_SESSION_STORAGE_KEY`). |
| Champs du formulaire | Le formulaire branché envoie seulement les champs du modèle existant. Postnom et sexe ont été retirés car aucune colonne ne les stocke. | Si ces données sont nécessaires, Franck/Melvin doivent définir leur stockage sans créer de table. |
| Intégration backend | `StudentsModule` est importé par `AppModule`; les routes sont `GET /students`, `GET /students/registration-options` et `POST /students`. | À valider dans l’intégration globale par Kevin/Melvin. |

## Vérifications effectuées

- `npm run db:generate` a généré le client Prisma localement à partir du schéma existant.
- `npm run db:check-connection` et `npm run db:check-access` réussissent avec l’accès réseau autorisé.
- Un élève fictif a été créé via `StudentsService` dans Neon, relu via une nouvelle connexion, retrouvé dans la liste et recherché par matricule. Matricule : `DEMO-E2E-99fc907d-b94a-4db7-a709-0389eb9c8ab9`.
