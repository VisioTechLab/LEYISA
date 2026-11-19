# Migrations V1 et conservation

Avant : trois migrations historiques, schéma secondaire P1–P4 sans cycles complets. Après : six migrations au total. Les trois anciennes sont inchangées ; aucune suppression de contribution ni modification d'historique.

| Migration ajoutée | Évolution |
|---|---|
| 20261119000000_integration_v1 | Calendriers par profil/kind/parent et exclusion limitée ; classes cycle/niveau/option/version ; champs identité élèves ; maxima explicites et sources ; appréciations/statuts ; SchoolSettings/LoginLimit ; audit cible nullable ; nouveaux documents DEMO-V1 ; protection programme utilisé/publication. |
| 20261119010000_audit_details | Détails JSON d'audit pour modifications de statut/rôles, sans secret. |
| 20261119020000_deliberation_demo | Profils typés/versionnés, décisions append-only, lien évaluation repêchage ; contraintes sur résultats clôturés non publiés. |

Vérifications exécutées sur PostgreSQL18.6 local loopback55432 : installation des six migrations sur bases vierges `leyisa_v1_candidate` puis `leyisa_v1_release` ; tests avec rôle runtime limité. Diff Prisma candidate→schéma : migration vide. Vérification DB :39 contrôles dans transaction entièrement rollbackée. Les tests ciblent uniquement des identités synthétiques locales.

Mise à niveau réellement exécutée : schéma trois migrations de la baseGit initiale + ancien seed ; dump préalable ; six migrations appliquées ; empreintes MD5 des colonnes figées de trois ResultSnapshot identiques avant/après. Les trois ReportCard historiques et leur ancienne notice sont restés intacts. Dump après migration restauré sur une autre base vide `leyisa_v1_restore` ; mêmes empreintes. Preuves conservées dans `docs/preuves/logs/` avec le rapport de release. Il s'agit d'une preuve de conservation et de restauration de ce jeu synthétique, pas d'une simulation du volume Neon réel.

Procédure locale reproductible : Node24.7+ et PostgreSQL18, URL propriétaire loopback vers base jetable, `LEYISA_DB_MODE=local`, puis `npm ci`, `npm run build`, `npm run db:migrate`, `LEYISA_DEMO_SEED=1 npm run demo:seed`. Appliquer `prisma/access/shared-runtime.sql` avec propriétaire ; créer un login local membre de `leyisa_runtime` ; démarrer/tester avec ce login. `npm run db:status` puis `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` doivent confirmer état et absence de divergence.

Runtime : pas de CREATE DATABASE/ROLE, pas de DDL ni lecture `_prisma_migrations`. Tables métier soumises aux contraintes et triggers ; audit SELECT/INSERT seulement ; profils/décisions sans UPDATE/DELETE. Les commandes migrate utilisent DATABASE_URL en local et DIRECT_DATABASE_URL en mode shared. Aucun seed ni migration automatique au lancement HTTP.

## Neon : lecture seule, aucune migration appliquée

Projet `gentle-math-59421236` inspecté : branches dev, dev-inscriptions, dev-scolarite, dev-resultats et ancienne branche de test. Sur dev-resultats, deux migrations enregistrées ; la troisième historique manque. L'ancienne branche de test a la colonne resultMaxScore sans enregistrement équivalent de migration : **ne pas baseliner aveuglément**. Groupe runtime présent ; login Railway attendu non constaté. Aucune URL secrète copiée, aucune branche créée et aucun changement appliqué.

Avant migration partagée : revue MOC des trois migrations nouvelles et de l'écart historique avec lead/propriétaires, création autorisée d'une branche dédiée démo, inventaire des données/contraintes, sauvegarde/restauration vérifiée de cette branche, compte propriétaire séparé, accès runtime nominatif et consentement explicite d'exécuter. Ne pas réutiliser une base de développement d'un membre comme base de démo.

Rollback : arrêter écritures, conserver dump et journaux avant migration, restaurer le dump sur une **nouvelle** branche/base et vérifier empreintes/intégrité avant bascule autorisée. Aucun down destructeur ni `prisma migrate reset` sur partagé. Les nouveaux snapshots/profils n'ont pas de conversion descendante sans perte ; restaurer la sauvegarde est la stratégie testée.
