# Reprise après la première CI qualité

La révision `86be613e8adaa74ad49ecd2d5322253f5f8b846e` est conservée comme référence du premier run : https://github.com/VisioTechLab/LEYISA/actions/runs/44630983849. Sauvegarde Git restaurée/vérifiée réussie ; job applicatif en échec avec25 tests navigateur réussis sur26. Le motif de rejet pouvait être perdu car le formulaire apparaissait avant le changement effectif de route, puis était démonté après la saisie.

## Correctif Q11

Dans `frontend/src/features/results/ResultsModulePage.tsx`, la route est désormais l’unique source de la vue. Aucun formulaire transitoire de rejet/clôture n’est affiché avant le nouveau montage. Les tests vérifient que le motif et la case de confirmation restent renseignés une fois la navigation terminée. Le patch historique `Q11-navigation-formulaires.patch` conserve le diff de reprise ; il ne faut pas le réappliquer sur la copie déjà corrigée.

Le blocage de quota de la session précédente a empêché un premier essai de test. Après reprise autorisée par le responsable projet, le parcours complet a réellement été exécuté et réussi :1/1, du rejet au PDF publié. Build et lint réussis. Journaux et captures dans `preuves-locales/`. Une nouvelle suite complète26 et la CI doivent encore confirmer la révision finale ; leur conclusion sera donnée dans le compte rendu de livraison.

## Déploiement

Aucune publication Vercel/Render, fusion de main ou mutation Neon n’est autorisée par la demande de finaliser les vérifications. La branche reste `fix/v1-quality-recovery`, avec son déploiement Git Vercel désactivé. Pour voir les changements sur l’URL Vercel existante, il faudra autoriser puis effectuer la publication du frontend et du backend compatibles. Les six migrations sont inchangées ; aucun seed, restauration ni migration de base partagée n’est prévu dans ce correctif.

## Environnement de recette

Frontend127.0.0.1:5176, backend127.0.0.1:53110, PostgreSQL127.0.0.1:55433 ; base fictive `leyisa_quality_modules_final_20261119`. Fichier privé des comptes : `/tmp/leyisa-quality-modules-final-credentials.json`, jamais à publier. Les anciennes bases, contributions et sauvegardes sont conservées.

## Suite après reprise

Les26 tests navigateur ont ensuite réussi ensemble en local avec Q11. Le second run distant `44633997879` a dépassé la recette et les contrôles PDF, puis s’est arrêté sur une alerte `effect` indirecte de Prisma. Q12 fixe uniquement cette dépendance à3.22.1, conserve Prisma7.10.1 et ne change aucune migration. Installation, validation, build, audits et cas de régression de l’avis réussis localement ; journaux dans `preuves-locales/`. La CI de la révision finale reste à observer après la sauvegarde de Q12.
