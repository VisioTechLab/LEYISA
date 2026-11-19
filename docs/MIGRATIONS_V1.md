# Migrations V1 et conservation

Avant : trois migrations historiques, schéma secondaire P1–P4 sans cycles complets. Après : six migrations au total. Les trois anciennes sont inchangées ; aucune suppression de contribution ni modification d'historique.

| Migration ajoutée | Évolution |
|---|---|
| 20261119000000_integration_v1 | Calendriers par profil/kind/parent et exclusion limitée ; classes cycle/niveau/option/version ; champs identité élèves ; maxima explicites et sources ; appréciations/statuts ; SchoolSettings/LoginLimit ; audit cible nullable ; nouveaux documents DEMO-V1 ; protection programme utilisé/publication. |
| 20261119010000_audit_details | Détails JSON d'audit pour modifications de statut/rôles, sans secret. |
| 20261119020000_deliberation_demo | Profils typés/versionnés, décisions append-only, lien évaluation repêchage ; contraintes sur résultats clôturés non publiés. |

Les six migrations ont été appliquées sur base vierge PostgreSQL 18.7 en loopback. Le statut Prisma est à jour et le diff de schéma est vide. Les 39 contrôles avec le compte runtime ont été exécutés dans une transaction annulée.

La mise à niveau est partie des trois migrations de 45b6205 et de son seed fictif. La sauvegarde préalable a été prise. Les empreintes des trois ResultSnapshot et des trois ReportCard historiques sont identiques avant, après et après restauration dans une base vierge distincte. Les anciennes notices sont conservées avec ces documents. [Preuves](preuves/logs/)

Procédure locale reproductible : Node24.7+ et PostgreSQL18, URL propriétaire loopback vers base jetable, `LEYISA_DB_MODE=local`, puis `npm ci`, `npm run build`, `npm run db:migrate`, `LEYISA_DEMO_SEED=1 npm run demo:seed`. Appliquer `prisma/access/shared-runtime.sql` avec propriétaire ; créer un login local membre de `leyisa_runtime` ; démarrer/tester avec ce login. `npm run db:status` puis `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` doivent confirmer état et absence de divergence.

Runtime : pas de CREATE DATABASE/ROLE, pas de DDL ni lecture `_prisma_migrations`. Tables métier soumises aux contraintes et triggers ; audit SELECT/INSERT seulement ; profils/décisions sans UPDATE/DELETE. Les commandes migrate utilisent DATABASE_URL en local et DIRECT_DATABASE_URL en mode shared. Aucun seed ni migration automatique au lancement HTTP.

## Neon : lecture seule, aucune migration appliquée

Lecture seule du projet gentle-math-59421236. Branches visibles : dev, dev-inscriptions, dev-scolarite, dev-resultats et test-migration-resultats-20261118. La branche demo-v1 reste à créer. L’archive signale un écart historique entre colonne et registre des migrations sur une ancienne branche de test. Le lead doit examiner cet écart avant toute intervention. Aucune connexion SQL aux branches Neon durant la reprise.

Avant migration partagée : revue MOC des trois migrations nouvelles et de l'écart historique avec lead/propriétaires, création autorisée d'une branche dédiée démo, inventaire des données/contraintes, sauvegarde/restauration vérifiée de cette branche, compte propriétaire séparé, accès runtime nominatif et consentement explicite d'exécuter. Ne pas réutiliser une base de développement d'un membre comme base de démo.

Rollback : arrêter écritures, conserver dump et journaux avant migration, restaurer le dump sur une **nouvelle** branche/base et vérifier empreintes/intégrité avant bascule autorisée. Aucun down destructeur ni `prisma migrate reset` sur partagé. Les nouveaux snapshots/profils n'ont pas de conversion descendante sans perte ; restaurer la sauvegarde est la stratégie testée.
