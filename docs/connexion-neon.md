# Base d’intégration Neon

PostgreSQL et les migrations Prisma restent communs à l’équipe. Docker sert aux essais
individuels ; Neon sert à partager les mêmes données fictives depuis plusieurs ordinateurs.
Kevin administre le projet, Melvin valide les migrations, chaque développeur utilise un
compte PostgreSQL individuel. Ce guide n’implique pas qu’un projet Neon existe déjà.

## Kevin : créer la base et appliquer les migrations

1. Dans [Neon](https://console.neon.tech), créer un projet Visio Tech et une base PostgreSQL 18
   dédiée à Leyisa (par exemple `leyisa_integration`) sur la branche d’intégration retenue.
   Utiliser uniquement des données fictives. Conserver le compte propriétaire dans le coffre
   d’équipe, accessible aux responsables autorisés.
2. Une fois la cible et la migration approuvées, ouvrir **Connect** pour cette base et ce
   propriétaire. Désactiver **Connection pooling** pour copier l’URL directe TLS. Renseigner
   `LEYISA_DB_MODE=shared` et `DIRECT_DATABASE_URL` dans le `.env` ignoré à la racine, ou les
   injecter via le coffre dans le terminal de migration. La première migration installe
   [`btree_gist`](https://neon.com/docs/extensions/btree_gist) ; le compte propriétaire doit
   pouvoir créer l’extension.
3. Depuis la racine du dépôt, appliquer les migrations versionnées :

   ```sh
   cd backend
   npm ci
   npm run db:validate
   npm run db:migrate
   npm run db:status
   cd ..
   ```

   Prisma 7 lit l’URL CLI dans `prisma.config.ts`. En mode `shared`, cette URL est
   exclusivement `DIRECT_DATABASE_URL` ; l’URL des modules ne sert pas de secours.
   `db:migrate` lance `prisma migrate deploy`. Réserver la création de migrations et
   les tests avec écritures à une base locale. Les changements de structure passent en PR ;
   ne pas modifier les tables dans la console Neon ni utiliser `prisma db push` sur la base commune.
4. Toujours avec le propriétaire, ouvrir `psql` sur la même base via la connexion directe.
   Définir `PGHOST`, `PGPORT` (généralement 5432), `PGDATABASE` et `PGUSER` d’après Neon,
   sans mot de passe dans la commande :

   ```sh
   PGSSLMODE=verify-full PGSSLROOTCERT=system psql -X -W -v ON_ERROR_STOP=1 -f backend/prisma/access/shared-runtime.sql
   ```

   Le [script de droits](../backend/prisma/access/shared-runtime.sql) crée un groupe sans
   connexion. Il peut être rejoué après une migration ; si de nouvelles tables sont ajoutées,
   faire valider les droits correspondants dans la même PR. Le groupe permet les opérations
   courantes sur les tables métier, la lecture et l’ajout dans l’audit, sans DDL ni accès à
   `_prisma_migrations`. Il couvre les données de toute l’intégration ; les droits par ressource
   restent une responsabilité du backend.

   Pour chaque développeur et, plus tard, pour le service Railway, créer un compte par SQL et
   lui attribuer seulement ce groupe. Les comptes créés via SQL ne reçoivent pas automatiquement
   `neon_superuser` ([documentation Neon sur les rôles](https://neon.com/docs/manage/roles)).

   Générer un mot de passe fort dans le coffre, puis lancer ces commandes dans Bash :

   ```bash
   read -r -p 'Nom du compte PostgreSQL : ' LEYISA_LOGIN_ROLE
   read -r -s -p 'Mot de passe du nouveau compte : ' LEYISA_LOGIN_PASSWORD
   printf '\n'
   LEYISA_LOGIN_ROLE="$LEYISA_LOGIN_ROLE" LEYISA_LOGIN_PASSWORD="$LEYISA_LOGIN_PASSWORD" \
     PGSSLMODE=verify-full PGSSLROOTCERT=system \
     psql -X -W -v ON_ERROR_STOP=1 -f backend/prisma/access/create-runtime-login.sql
   unset LEYISA_LOGIN_ROLE LEYISA_LOGIN_PASSWORD
   ```

   L’invite suivante de `psql` demande le mot de passe du **propriétaire**. Le mot de passe
   du nouveau compte est transmis au script sans être écrit dans le fichier ni dans l’historique
   du shell. Depuis **Connect**, récupérer le point de terminaison **avec
   pooling** pour cette branche et cette base. Si le compte SQL n’est pas proposé dans
   l’interface, construire son URL à partir de l’hôte, du port et de la base fournis par Neon,
   en remplaçant l’utilisateur et le mot de passe par ceux du compte limité et en encodant les
   caractères réservés. Garder TLS, avec `sslmode=verify-full` pour le client Node.
   Remettre chaque URL individuellement dans le coffre partagé avec accès nominatif ;
   ne pas la copier dans une PR, un chat ou une variable frontend. Retirer le compte ou
   renouveler son secret en cas de départ ou d’exposition.

## Développeurs : connecter un module

Récupérer la branche publiée, puis définir ces deux variables dans le `.env` ignoré à la racine :

| Variable | Valeur |
| --- | --- |
| `LEYISA_DB_MODE` | `shared` |
| `DATABASE_URL` | URL Neon pooled TLS du compte personnel, reçue dans le coffre |
| `DIRECT_DATABASE_URL` | Laisser vide : réservée aux migrations de Kevin |

```sh
cd backend
npm ci
npm run db:generate
npm run db:check-connection
```

Le contrôle lit `SchoolYear` sans écrire ni afficher l’URL. Ensuite l’équipe peut créer le
premier dossier fictif depuis le module élèves et retrouver la même inscription dans les
autres modules. `db:seed` et `db:verify` sont réservés au PostgreSQL local.

## NestJS et Railway

Le socle fournit la fabrique [`createClient()`](../backend/prisma/client.mjs) : elle instancie
`PrismaClient` avec `PrismaPg` à partir de `DATABASE_URL`. Le futur backend NestJS devra
enregistrer un seul client comme fournisseur partagé et appeler `$disconnect()` à l’arrêt.
Générer le client avant la compilation et inclure le client généré dans le paquet exécuté ;
le client actuel est généré en TypeScript ESM pour Node 24, donc le build NestJS devra respecter
ce format ou adapter la configuration de génération avec Melvin.

Avant le déploiement, le backend devra fournir des commandes de build et de démarrage vérifiées.
Sur Railway, utiliser Node 24 et déclarer `LEYISA_DB_MODE=shared` et `DATABASE_URL` dans les
[variables du service](https://docs.railway.com/variables), avec le compte limité propre au service.
NestJS devra écouter sur `0.0.0.0` et le `PORT` fourni par Railway. Les migrations restent dans
le terminal ou un job contrôlé par Kevin, avec le secret direct uniquement dans cet environnement.
