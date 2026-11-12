# Utiliser le socle commun LEYISA V1

La branche `feat/socle-commun-v1` reprend le socle collaboratif, les migrations et le backend de la PR #4. Le frontend ouvre les écrans Connexion, Élèves et inscriptions et Enseignants et affectations depuis une navigation commune. Ces écrans peuvent être utilisés pour vérifier leur assemblage. Les API métier et leur raccordement aux écrans restent à développer par les responsables de chaque module.

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

## Ordre proposé pour les revues

1. Revoir la [PR #1](https://github.com/VisioTechLab/LEYISA/pull/1) vers `main`. Elle pose les conventions et l’arborescence.
2. Après l’intégration de #1, rediriger la [PR #3](https://github.com/VisioTechLab/LEYISA/pull/3) vers `main`, vérifier que le diff ne contient que la tranche PostgreSQL et Prisma, et la passer en revue.
3. Après l’intégration de #3, rediriger la [PR #4](https://github.com/VisioTechLab/LEYISA/pull/4) vers `main`, vérifier que le diff ne contient que la tranche NestJS et la passer en revue.
4. Après l’intégration de #4, proposer une PR de `feat/socle-commun-v1` vers `main` avec le frontend commun. La revue peut être répartie par dossier entre Kevin, Sidonie et Franck. Leurs commits d’origine sont référencés dans les commits repris.

Utiliser des commits de fusion pour conserver la filiation des trois PR empilées. Après chaque étape, vérifier la comparaison avec `main` avant de demander une approbation. Garder les branches parentes jusqu’au changement de cible des PR qui en dépendent. GitHub exige une approbation sur `main` et invalide une approbation devenue obsolète après un nouveau commit.

Si l’équipe préfère des PR séparées pour les écrans, voici les tranches à extraire sur des branches distinctes à partir du socle NestJS validé.

| Revue | Commits d’origine | Contenu et contrôle |
| --- | --- | --- |
| Kevin | `61a5ae1` | Structure React/Vite, styles et écran d’affectation. Compiler et lancer le lint. |
| Sidonie | `7245234`, `5e40191` | Écran de connexion et validation locale du formulaire. Vérifier les champs et l’accès depuis le menu commun. |
| Franck | `64e8dca`, `d115eb6` | Liste, recherche et formulaire d’inscription. Reprendre l’import `type FormEvent` de la branche commune et vérifier le build. |

Intégrer Kevin d’abord si les PR sont séparées, puis Sidonie et Franck. Proposer ensuite le commit de navigation et d’isolation des styles avec les trois écrans présents. Une PR groupée remplace ces PR séparées pour les mêmes changements.

## Correction proposée pour la PR #2

Sur une copie de travail de `feat/school-configuration`, rétablir les cinq consignes depuis le socle, puis corriger les deux liens de `docs/school-configuration/README.md` vers `../wireframes/02_Configuration_scolaire.png` et `../wireframes/08_Bulletins_scolaires.png`. Les deux PDF et les huit maquettes restent dans la PR.

```sh
git restore --source=origin/chore/bootstrap-leyisa -- \
  .agents/skills/leyisa-franck/SKILL.md \
  .agents/skills/leyisa-joel/SKILL.md \
  .agents/skills/leyisa-kevin/SKILL.md \
  .agents/skills/leyisa-melvin/SKILL.md \
  .agents/skills/leyisa-sidonie/SKILL.md
```

Vérifier ensuite que le diff de la PR contient les références documentaires. Kevin et Jonathan peuvent la faire revoir en parallèle après la PR #1.

## Vérifications et mise à jour Prisma proposée

- Frontend sous Node 24. `npm ci`, `npm run lint` et `npm run build` réussis. Navigation, validation d’un formulaire de connexion vide, retour et rechargement vérifiés dans le navigateur.
- Backend sous Node 24 avec PostgreSQL 18 jetable sur `127.0.0.1`. Schéma validé, build réussi, deux tests HTTP réussis, deux migrations appliquées localement, données fictives chargées et 31 contrôles PostgreSQL réussis. Le NestJS démarré avec cette base a répondu HTTP 200 sur `/health`.
- Audit npm du backend de la PR #4. Sept entrées remontent dans le graphe, dont quatre de gravité élevée et trois modérées. Les outils Prisma figurent dans le graphe installé via le lien de dépendance entre le client et le CLI. Le serveur NestJS utilise l’adaptateur PostgreSQL. Les chemins liés à MySQL et au serveur statique des outils Prisma ne correspondent pas à des routes du serveur examiné. Le score npm ne démontre donc pas leur exposition par NestJS.
- Une copie séparée du backend a été testée en alignant uniquement `prisma`, `@prisma/client` et `@prisma/adapter-pg` sur `7.10.1`. L’audit de production n’a remonté aucune alerte dans cette copie. La validation du schéma, la compilation, les deux tests HTTP, l’état des migrations, les 31 contrôles PostgreSQL et la réponse HTTP 200 du serveur ont réussi. Proposer cette mise à jour dans une PR dédiée après la PR #4. La branche commune garde la version de la PR #4.
