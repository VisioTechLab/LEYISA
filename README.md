# LEYISA SCHOOL — intégration V1

Application mono-établissement : React/Vite/TypeScript, NestJS, Prisma/PostgreSQL. Contributions des six membres conservées ; finalisation sur `integration/leyisa-v1-cloud`, sans modification de main ni migration Neon. Les nouveaux documents fictifs portent **DEMO-V1**. Les profils pédagogiques proposés ne certifient aucune règle officielle.

Commencer par [le rapport de release](docs/AUDIT_RELEASE_V1.md), [la recette](docs/TESTS_V1.md) et [le parcours démontrable](docs/PARCOURS_DEMO_V1.md). [Décisions](docs/DECISIONS_V1.md), [contrats réellement implémentés](docs/CONTRATS_API_V1.md), [intégration des contributions](docs/INTEGRATION_V1.md), [31 écrans et écarts](docs/CONFORMITE_WIREFRAMES_V1.md), [migrations](docs/MIGRATIONS_V1.md) et [déploiement à approuver](docs/DEPLOIEMENT_V1.md).

## Démarrage local

Node>=24.7 et PostgreSQL18. Préparer une base **locale jetable** et deux accès séparés propriétaire/runtime. Les commandes de seed et de vérification avec écritures refusent les hôtes distants et NODE_ENV=production. Ne jamais réutiliser une base partagée pour les tests.

```bash
cd backend
npm ci
npm run build
# DATABASE_URL propriétaire loopback ; LEYISA_DB_MODE=local
npm run db:migrate
LEYISA_DEMO_SEED=1 npm run demo:seed
# Avec propriétaire : appliquer prisma/access/shared-runtime.sql,
# puis attribuer leyisa_runtime à un login local dédié.
# Remplacer DATABASE_URL par le login runtime limité avant le serveur.
HOST=127.0.0.1 PORT=3000 npm start
```

Dans un autre terminal :

```bash
cd frontend
npm ci
LEYISA_API_TARGET=http://127.0.0.1:3000 npm run dev -- --host 127.0.0.1
```

Les secrets aléatoires sont écrits en600 dans le fichier désigné par LEYISA_DEMO_CREDENTIALS_FILE (par défaut `/tmp/leyisa-v1-credentials.json`), jamais affichés ni versionnés. Chaque cours fictif a son enseignant. Toutes les données métier de l'interface viennent des API, cookies HttpOnly et CSRF communs.

## Contrôles

```bash
npm run db:validate --prefix backend
npm run build --prefix backend
npm run build --prefix frontend
npm run lint --prefix frontend
# Base locale neuve migrée/seedée, URL runtime :
LEYISA_V1_TESTS=1 npm test --prefix backend
npm run db:verify --prefix backend
node backend/scripts/check-release.mjs
npm audit --prefix backend --audit-level=moderate
npm audit --prefix frontend --audit-level=moderate
```

La suite complète consomme un jeu local neuf : ne pas la rejouer sur les résultats déjà publiés d'une recette. Les tests d'intégration sont explicitement ignorés sans LEYISA_V1_TESTS=1 ; une exécution sans cette variable ne constitue pas une validation complète. Le workflow `.github/workflows/v1.yml` prépare une PostgreSQL éphémère et un rôle runtime sans DDL. Chaque push déclenche les vérifications et une sauvegarde Git restaurable. Voir les [runs de la branche](https://github.com/VisioTechLab/LEYISA/actions?query=branch%3Aintegration%2Fleyisa-v1-cloud).

Les guides historiques, maquettes et anciens scripts sont conservés pour provenance. Les documents suffixés V1 ci-dessus prévalent pour les commandes de finalisation, droits approuvés, marque et limites. Aucun seed/migration n'est lancé au démarrage HTTP. Les responsabilités restent celles de [l'équipe](docs/equipe.md) et les changements communs suivent la MOC avant fusion.
