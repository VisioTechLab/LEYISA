# Démarrer le backend LEYISA

Le socle NestJS utilise Node.js 24 et le schéma Prisma du dépôt. Le frontend communique avec NestJS par HTTP. La connexion PostgreSQL est configurée côté backend.

## Développer avec la base commune

Récupérez la branche de référence indiquée par Kevin et créez votre branche de module à partir de celle-ci. Pendant la revue du socle backend, la référence est `feat/backend-foundation`. Si vous avez déjà des commits sur votre branche, convenez de l’intégration du socle avec Kevin.

Depuis la racine du dépôt, préparez le fichier de configuration local.

```sh
cp -n .env.example .env
```

Dans ce fichier `.env` ignoré par Git, définissez `LEYISA_DB_MODE=shared` et renseignez `DATABASE_URL` avec l’URL Neon **pooled** de votre compte individuel reçue via le coffre de l’équipe. Utilisez `sslmode=verify-full`. Laissez `DIRECT_DATABASE_URL` vide. Kevin fournit les accès décrits dans le [guide Neon](connexion-neon.md).

```sh
cd backend
npm ci
npm run build
npm run db:check-access
npm start
```

Dans un autre terminal, vérifiez le serveur.

```sh
curl -i http://localhost:3000/health
```

`GET /health` renvoie **200** avec `{"status":"ok"}` quand le backend peut lire la table `SchoolYear`. En cas d’indisponibilité de PostgreSQL ou de la table, il renvoie **503** avec `{"status":"unavailable"}`. Utilisez la valeur de `PORT` de votre `.env` si vous avez changé le port. `npm test` compile le backend et vérifie les deux réponses HTTP sans connexion PostgreSQL.

Un module NestJS peut importer `PrismaModule` depuis `backend/src/common/` et injecter `PrismaService`. Le service fournit le client partagé via `prisma.client`. NestJS ferme le client à l’arrêt. Chaque module reste responsable des autorisations de ses opérations.

## Développer avec PostgreSQL local

Le [guide PostgreSQL local](base-de-donnees.md) explique comment renseigner le `.env`, démarrer Docker Compose, appliquer les migrations et charger le jeu de données sur votre poste. Gardez `LEYISA_DB_MODE=local` et une `DATABASE_URL` locale. Après la migration, utilisez `npm run build` et `npm start` depuis `backend`. La vérification des droits `db:check-access` concerne un compte du groupe `leyisa_runtime`.

## Configurer le service Railway

Une fois le socle validé, Kevin sélectionne la branche d’intégration sur Railway et configure les paramètres suivants.

| Paramètre | Valeur |
| --- | --- |
| Dossier racine du service | `/backend` |
| Chemin du fichier de configuration | `/backend/railway.toml` |
| `RAILPACK_NODE_VERSION` | `24` |
| `LEYISA_DB_MODE` | `shared` |
| `DATABASE_URL` | URL Neon pooled du compte technique `leyisa_railway`, avec `sslmode=verify-full` |

[Configuration d’un monorepo Railway](https://docs.railway.com/deployments/monorepo) · [Version Node.js sur Railpack](https://railpack.com/languages/node/)

Le fichier [railway.toml](../backend/railway.toml) déclare `npm run build`, `npm start` et `/health`. Le serveur écoute sur `0.0.0.0` et utilise le `PORT` fourni par Railway. Kevin applique les migrations approuvées séparément avant le déploiement, avec son accès direct. [Contrôles de santé Railway](https://docs.railway.com/deployments/healthchecks)
