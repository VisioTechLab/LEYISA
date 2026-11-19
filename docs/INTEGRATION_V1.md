# Intégration LEYISA V1 — 19 novembre 2026

Autorisation : demande explicite de finalisation et §0 du prompt maître. Implémentation et migrations locales isolées autorisées ; MOC, revue humaine, fusion, migration Neon et publication Internet restent à approuver. Aucun accord des six responsables n'est inventé.

## État initial et conservation

- Référence GitHub actualisée par `git fetch --all` ; base `origin/integration/results-evaluations` : `45b62052594526ada995abb9bb422d5951973372`.
- Worktree `/home/bmk/Documents/ChatGPT/VisioTech/LEYISA-integration-v1`, branche `integration/leyisa-v1`. Aucun changement de main.
- Le worktree initial `LEYISA`, branche database, contient seed/verify et fichiers non commités : conservés intacts. Les autres worktrees sont conservés.
- Joël et Melvin : historique complet dans la base d'intégration.
- Sidonie : cherry-picks a195178, 761d92c, ef1558a, c452106, auteurs conservés. Conflits app.module : union des modules ; Vite : union des proxys avant normalisation API.
- Franck : import ciblé du diff 9524c88, auteur conservé. Backend students, parseur, tests et source API conservés ; racine, migrations et fichiers de build anciens exclus. StudentsPage conserve la structure du socle et adopte la source persistante ; ancien double shell supprimé.
- Jonathan : import ciblé fc085db (SchoolConfigurationPage et CSS), auteur conservé ; fichiers racine exclus.
- Kevin : AssignmentsPage modernisé, logo, shell et styles du socle conservés. Ancienne maquette 61a5ae1 disponible dans l'historique.
- PR #2 fusionnée au commit b2c6d20, avant fc085db ; sa fusion ne livrait donc pas le dernier écran.

## Références

Kit extrait hors dépôt dans `../LEYISA_CODEX_V1`. 43 empreintes SHA256 vérifiées. Prompt maître lu intégralement ; Senior Code Auditor lu avec références, modèle et scripts. 13 feuilles matricielles extraites. 31 pages principales rendues et examinées. Les preuves de conformité nécessitent encore les captures de l'application réelle.

## Anomalies initiales confirmées (lecture statique)

| ID | Gravité | Preuve initiale | Conséquence | Vérification attendue |
|---|---|---|---|---|
| AUD-01 | CRITIQUE | evaluations.controller.ts:8-30, absence guards ; results.controller.ts:8-60 | Lecture et mutations sans identité vérifiée | inventaire routes + API anonyme/roles/IDOR |
| AUD-02 | CRITIQUE | results.service.ts:78,98,139, parseActorId:330 | Acteur DIR choisi par client | acteur forgé refusé, acteur session seul |
| AUD-03 | ÉLEVÉ | permissions.ts:18-49 | Ancienne matrice : ADM écrit affectations, DIR lit audit | tests matrice approuvée |
| AUD-04 | ÉLEVÉ | students-session.guard.ts, apiStudentsDataSource.ts:21-34 | Auth Bearer distincte, secret en sessionStorage | cookies communs, aucun token stockage client |
| AUD-05 | ÉLEVÉ | password.ts:1-38, auth.controller.ts:35-38 | scrypt et absence jeton CSRF contraires C01 | Argon2id compatible ancien hash, CSRF API |
| AUD-06 | ÉLEVÉ | results.service.ts:283-302 | Calcul flottant, vide peut sembler complet | Decimal, incomplet, calcul discriminant |
| AUD-07 | ÉLEVÉ | modules assignments/school/bulletins sans backend | Parcours académique interrompu | persistance et parcours navigateur/API |

Ce registre est initial, pas un verdict release. Les tests et limites seront renseignés au fur et à mesure dans TESTS_V1.md.
