# Utiliser le socle commun LEYISA V1

La branche `feat/socle-commun-v1` réunit le socle collaboratif, PostgreSQL, le backend NestJS et les huit écrans du parcours. Connexion, élèves et affectations reprennent les interfaces de l’équipe. Scolarité, notes, validation, résultats et bulletins sont consultables en aperçu avec des données fictives. Les API métier et leur raccordement aux écrans restent à développer par les responsables de chaque module.

## Contributions reprises dans le socle

| Contribution | Où la retrouver | Historique d’origine |
| --- | --- | --- |
| Sidonie — connexion et validation des champs | [Écran de connexion](../frontend/src/features/auth/LoginPage.tsx) | [Interface](https://github.com/VisioTechLab/LEYISA/commit/724523400e89a790b6c14b2d1c3f53a2096353e1), [validation locale](https://github.com/VisioTechLab/LEYISA/commit/5e40191e3f3acc71bdeacf46d5b88aec7ee51e34) |
| Franck — dossiers d’élèves, inscription et recherche | [Écran élèves](../frontend/src/features/students/StudentsPage.tsx) | [Inscription](https://github.com/VisioTechLab/LEYISA/commit/64e8dca96324cb36301be0cb9cf421013b5cd5ea), [recherche](https://github.com/VisioTechLab/LEYISA/commit/d115eb62b191efffbe6a2471bc26d5f8659270d1) |
| Kevin — base React/Vite, affectations et intégration | [Écran enseignants](../frontend/src/features/assignments/AssignmentsPage.tsx) | [React et affectations](https://github.com/VisioTechLab/LEYISA/commit/61a5ae1cd71a4bb2c596bb6d19e91ac34100e3e7), [intégration](https://github.com/VisioTechLab/LEYISA/commit/6e7b18e), [logo et mise en page](https://github.com/VisioTechLab/LEYISA/commit/ee4d3cf) |
| Références de scolarité et de bulletins pour le module de Jonathan | [Guide et PDF](school-configuration/README.md), [huit maquettes](wireframes/README.md) | [PR #2 et historique des fichiers déposés par Kevin](https://github.com/VisioTechLab/LEYISA/pull/2/commits) |
| Kevin — socle, base de données et NestJS | [Schéma Prisma](../backend/prisma/schema.prisma), [guide backend](backend.md) | [PR #1](https://github.com/VisioTechLab/LEYISA/pull/1), [PR #3](https://github.com/VisioTechLab/LEYISA/pull/3), [PR #4](https://github.com/VisioTechLab/LEYISA/pull/4) |

Les commits repris de Sidonie, Franck et Kevin conservent leur auteur et la référence du commit original. Au moment de cet assemblage, les branches de Joel (évaluations et notes) et de Melvin (validation et résultats) étaient au commit initial du socle collaboratif. Les écrans consultables dans ces domaines reprennent les wireframes.

## Démarrer sur son poste

Installer Node.js 24, npm et Docker avec Compose. Depuis un clone de `VisioTechLab/LEYISA`, créer une copie de travail distincte pour garder les changements du module en cours.

```sh
git fetch origin
git worktree add --detach ../LEYISA-socle-v1 origin/feat/socle-commun-v1
cd ../LEYISA-socle-v1
```

Pour modifier le code, créer ensuite sa propre branche depuis cette copie, par exemple `git switch -c feat/inscription-api`.

Lancer le frontend depuis la racine de cette copie.

```sh
cd frontend
npm ci
npm run dev
```

Dans un autre terminal, depuis la racine de la même copie, préparer le PostgreSQL local. Copier `.env.example` avec `cp -n` pour garder un éventuel fichier existant. Avant de poursuivre, vérifier `LEYISA_DB_MODE=local` et que `DATABASE_URL` pointe sur `127.0.0.1`. Si le port 5432 est pris, ajuster `POSTGRES_PORT` et le port dans `DATABASE_URL`.

```sh
cp -n .env.example .env
docker compose -p leyisa-socle-v1 up -d --wait postgres
cd backend
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Le frontend indique son URL au démarrage. `curl --fail http://127.0.0.1:3000/health` doit renvoyer `{"status":"ok"}` avec le PostgreSQL local prêt. Le chargement des données fictives sert à tester la base locale. La page élèves conserve pour l’instant sa source en mémoire en mode développement.

## Ordre des revues et de l’intégration

1. Faire relire la [PR #1](https://github.com/VisioTechLab/LEYISA/pull/1) vers `main`. Elle pose les conventions et l’arborescence.
2. Après la #1, cibler `main` dans la [PR #3](https://github.com/VisioTechLab/LEYISA/pull/3) et dans la [PR #2](https://github.com/VisioTechLab/LEYISA/pull/2). La #3 livre PostgreSQL et Prisma. La #2 livre les références documentaires, avec les cinq consignes rétablies et les liens des maquettes corrigés. Leurs revues peuvent avancer en parallèle.
3. Après la #3, cibler `main` dans la [PR #4](https://github.com/VisioTechLab/LEYISA/pull/4) et vérifier le diff NestJS.
4. Après la #4 et la #2, cibler `main` dans la PR de `feat/socle-commun-v1`. Vérifier que son diff porte sur le frontend et son guide d’intégration. La revue peut être répartie entre Sidonie pour la connexion, Franck pour les élèves et Kevin pour les affectations et l’assemblage.

Utiliser des commits de fusion pour conserver la filiation des PR et les auteurs. Garder les branches parentes jusqu’au changement de cible des PR qui en dépendent. GitHub exige une approbation sur `main` et peut demander une nouvelle approbation après un changement de diff.

## Vérifications et mise à jour Prisma proposée

- Frontend sous Node 24. `npm ci`, `npm run lint` et `npm run build` réussis. Huit écrans vérifiés dans Chrome à 1440, 390 et 320 px. Navigation, validation locale du formulaire de connexion, recherche, inscription en mémoire, contrôle de doublon d’affectation et aperçu du bulletin vérifiés.
- Backend sous Node 24 avec PostgreSQL 18 jetable sur `127.0.0.1`. Schéma validé, build réussi, deux tests HTTP réussis, deux migrations appliquées localement, données fictives chargées et 31 contrôles PostgreSQL réussis. Le NestJS démarré avec cette base a répondu HTTP 200 sur `/health`.
- Audit npm du backend de la PR #4. Sept entrées remontent dans le graphe, dont quatre de gravité élevée et trois modérées. Les outils Prisma figurent dans le graphe installé via le lien de dépendance entre le client et le CLI. Le serveur NestJS utilise l’adaptateur PostgreSQL. Les chemins liés à MySQL et au serveur statique des outils Prisma ne correspondent pas à des routes du serveur examiné. Le score npm ne démontre donc pas leur exposition par NestJS.
- Une copie séparée du backend a été testée en alignant uniquement `prisma`, `@prisma/client` et `@prisma/adapter-pg` sur `7.10.1`. L’audit de production n’a remonté aucune alerte dans cette copie. La validation du schéma, la compilation, les deux tests HTTP, l’état des migrations, les 31 contrôles PostgreSQL et la réponse HTTP 200 du serveur ont réussi. Proposer cette mise à jour dans une PR dédiée après la PR #4. La branche commune garde la version de la PR #4.
