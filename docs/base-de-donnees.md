# Base PostgreSQL de Leyisa School V1

Ce guide couvre Docker en local. Pour les tests d’intégration en équipe, suivre le
[guide de connexion Neon](connexion-neon.md).

Prérequis : Node.js 24 avec npm, et Docker avec Compose v2. Depuis la racine de Leyisa :

```sh
cp -n .env.example .env
# Ouvrir .env et remplacer le mot de passe d’exemple dans POSTGRES_PASSWORD et DATABASE_URL.
docker compose up -d --wait postgres
cd backend
npm ci
npm run db:validate
npm run db:migrate
npm run db:generate
npm run db:seed
npm run db:verify
```

Si le port 5432 est pris, modifier `POSTGRES_PORT` **et** le port de `DATABASE_URL`. Le port
n’est exposé qu’en local. Si le mot de passe contient des caractères réservés dans une URL,
les encoder dans `DATABASE_URL`. La racine contient le seul fichier `.env` attendu ;
une variable déjà exportée dans le terminal est prioritaire pour Prisma. Ne pas versionner `.env`.
Les variables d’initialisation de PostgreSQL n’altèrent pas un volume qui existe déjà.

`db:migrate` applique la migration versionnée, sans remise à zéro. `db:status` indique son état.
`docker compose stop postgres` (depuis la racine) arrête PostgreSQL en gardant ses données.
Sans Docker, configurer `DATABASE_URL` vers une base de développement PostgreSQL dédiée ;
le rôle de migration doit pouvoir créer l’extension PostgreSQL `btree_gist` ou celle-ci doit être
installée au préalable par l’administrateur dans le schéma `public`.

`db:seed` charge trois élèves fictifs, deux années, deux matières, une relève d’enseignant,
une soumission rejetée puis corrigée, et une période clôturée non publiée. Le jeu est inséré
dans une transaction ; une deuxième exécution retrouve le même jeu. Les identités fictives ne
permettent pas de se connecter. `db:verify` vérifie ce parcours et les refus SQL ; ses écritures
sont annulées. Les deux commandes exigent `LEYISA_DB_MODE=local` et une connexion locale
(loopback). `npm run db:check-connection` vérifie la connexion et une lecture, sans écrire.
Sur une base de test créée avant le rôle `ELEVE`, appliquer la nouvelle migration puis relancer
le seed : il complète les rôles de ses trois élèves fictifs, sans recréer leurs dossiers.

Pour vérifier l’installation sur une base vierge dans le conteneur local, depuis la racine :

```sh
docker compose exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" leyisa_verification'
cd backend
# Exporter DATABASE_URL avec les mêmes identifiants et le même port, mais /leyisa_verification.
npm run db:migrate
npm run db:status
npm run db:seed
npm run db:verify
```

## Repères pour les modules

- **Identités.** `Student` et `Teacher` ont chacun une identité `User`. Les noms vivent dans
  `User`, les matricules dans les profils. Le rôle `ELEVE` peut être enregistré sur un
  `User` de type `STUDENT` ; les autres rôles sont réservés au personnel. Un élève n’a ni
  identifiant de connexion, ni mot de passe, ni session. Lors de la création du dossier, le
  module peut créer `User(kind: STUDENT)`, `Student` et `UserRole(ELEVE)` dans une transaction.
  Pour créer le rôle séparément, renseigner `userKind: STUDENT`. L’auth doit encore
  vérifier le rôle, l’activation du compte, la révocation et l’expiration à chaque requête,
  stocker un hash de mot de passe et ne persister que le condensat du jeton de session.
- **Année et classe.** `Enrollment` rattache l’élève à une classe de son année, avec un seul
  enregistrement par élève et année. Pour faire monter un élève ou le faire redoubler, créer
  une inscription dans la nouvelle année. Les clés composées propagent la classe et l’année
  jusqu’aux notes et résultats pour empêcher les croisements incohérents.
- **Affectation.** `TeacherAssignment` rattache un enseignant à une matière du programme.
  Le début est inclus et la fin est exclue ; une fin vide laisse l’intervalle ouvert. Pour une
  relève, fixer la fin de l’ancienne affectation puis insérer la nouvelle avec cette date de
  début, dans la même transaction. Les évaluations existantes gardent leur affectation.
- **Notes et validation.** Chaque `Evaluation` référence une affectation et une `ClassPeriod`.
  Une `Grade` est unique par évaluation et inscription ; un score vide reste `NULL`.
  Les `Submission` gardent les tentatives et les décisions. Les modules contrôlent encore les
  autorisations par ressource, la complétude et la version de la grille, puis enregistrent
  soumission ou décision et changement d’état ensemble.
- **Clôture et bulletin.** Dans une transaction, verrouiller la classe et la `ClassPeriod`,
  vérifier que toutes les matières attendues ont été traitées, créer les `ResultSnapshot`,
  renseigner la clôture et écrire l’audit. Une fois clôturés, les résultats ne sont plus
  modifiables. Renseigner la publication séparément. Le bulletin interne lit le snapshot
  clôturé et porte la mention **DÉMONSTRATION - NON OFFICIEL**. Le module doit vérifier la
  publication et les droits avant toute diffusion. Aucun paiement ou code de consultation
  n’entre dans ce modèle. `DEMO_V1` est un profil de démonstration, sans formule officielle.
- **Migration.** Les contraintes CHECK, exclusions GiST, index partiels et triggers sont
  versionnés dans le SQL. Ne pas remplacer les migrations par `prisma db push`. Les changements
  passent par Kevin pour l’intégration et Melvin pour la validation technique.

À revoir avec Melvin avant intégration : convention des dates d’affectation, format JSON des
instantanés, valeurs et transitions exposées par les modules et protocole transactionnel de
clôture. Les contrôles métier qui traversent plusieurs écritures appartiennent aux services
concernés ; ne pas déduire un contrat API des noms Prisma.
