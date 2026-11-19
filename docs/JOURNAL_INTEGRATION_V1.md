# Journal d’intégration LEYISA SCHOOL V1

## 19 novembre 2026 — ouverture de la branche

- Le dépôt GitHub présentait 16 branches et six pull requests. La branche d’intégration a été publiée depuis `45b62052594526ada995abb9bb422d5951973372`. Le SHA distant correspondait exactement au SHA local après ce premier push.
- La base contient le socle React ainsi que les contributions récentes de Joël et Melvin aux évaluations et aux résultats. Les autres contributions sont en cours de comparaison avec leurs branches d’origine.
- La consultation du commit `d35cce8bc83df8c9f5330924fa10e6b5579543e0` dans GitHub a renvoyé HTTP 422. Le clone initial ne contient pas cet objet. L’archive fournit des sources et des preuves historiques à contrôler.
- Le contrôle Git existant est maintenant ciblé sur cette branche. Le résultat du push de cette modification et celui de la CI doivent être constatés à distance.

## Reprise du code intégré

- Git a recensé sept têtes de pull request (#1 à #7), dont deux ouvertes. Le dépôt ne pouvait pas fournir `d35cce8bc83df8c9f5330924fa10e6b5579543e0` par fetch ciblé. Les 43 empreintes du kit et les 269 empreintes de l’archive de travail correspondent.
- `main` a été rattachée comme ancêtre de la branche de travail sans impact sur son arbre. Les quatre commits de Sidonie sont réappliqués avec attribution d’origine. Les imports ciblés de Franck et Jonathan excluent leurs anciens socles concurrents. L’historique de Kevin, Joël et Melvin est porté par la base intégrée.
- L’état intégré vient de l’instantané de travail vérifié. Les preuves historiques de cette sauvegarde sont écartées du commit. Les sources de calcul, la matrice des droits et les variantes de démonstration restent identifiées dans le registre des décisions.
- Node 24.22.1, PostgreSQL 18.7 isolé en loopback. Installation verrouillée, compilation backend et frontend, lint et validation Prisma réussis. Six migrations appliquées sur une base vierge, statut Prisma à jour. Suite backend de cette reprise : **71 réussis, 0 échec, 0 ignoré**. Contrôles transactionnels PostgreSQL : **39 réussis**. PDFs de trois cycles et du repêchage générés dans la recette API.
- Le contrôle de privilèges hérité refusait quatre tables dont les droits sont volontairement restreints. L’assertion suit désormais les droits V1 et passe en lecture seule avec le rôle limité. Elle tourne aussi dans la CI.
- Le premier push modifiant un workflow, `f7fa6c6b260cee161677635903ceeeef6ff1d14f`, a déclenché le [run 44544558337](https://github.com/VisioTechLab/LEYISA/actions/runs/44544558337) réussi. Le workflow applicatif comporte désormais une sauvegarde Git indépendante qui vérifie un clone avant de publier son artefact.

## Recette navigateur, migrations historiques et corrections

- Exécution GitHub du candidat `c10b863c80fecc39636207eb811be93ace06d862` réussie. Le [run 44545644139](https://github.com/VisioTechLab/LEYISA/actions/runs/44545644139) a livré un [bundle](https://github.com/VisioTechLab/LEYISA/actions/runs/44545644139/artifacts/14540591747). Téléchargé via le connecteur GitHub, il a passé la somme SHA-256, `git bundle verify`, le clonage au SHA attendu et `git fsck`. 27 références répertoriées.
- PostgreSQL 18.7 : trois migrations historiques et leur jeu fictif, puis six migrations. Les empreintes des trois résultats figés et des trois documents historiques concordent avant, après et après restauration en base distincte. Diff Prisma vide. [Preuves](preuves/logs/)
- La direction ne peut plus réutiliser un aperçu ou une confirmation quand la classe-période change. Chromium a vérifié le blocage de la clôture d’un contexte incomplet et l’effacement de l’action de publication lors d’un changement de classe. La confirmation de publication nomme la classe et la période.
- Le jeton CSRF reste utilisable dans le premier onglet quand un second le charge. Le test API ajouté a passé avec l’ancienne session toujours valide. Les bulletins V1.3 affichent la mention DEMO-V1 et conservent une pagination sobre.
- Nouvelle base vierge, Node 24.22.1, PostgreSQL 18.7. **72 tests réussis**, **0 échec**, **0 ignoré**, **39 contrôles DB réussis** et contrôle du rôle runtime réussi. Builds, lint et validation de schéma réussis.
- Chromium 156 a capturé les 31 vues à 1440 × 1000 et la liste élèves à 390 et 320 px. Le scénario de saisie, rejet, correction, validation, clôture et publication a produit un PDF. Après redémarrage de NestJS, les empreintes des notes, des résultats et du PDF sont identiques. [Preuves](preuves/)

## Préparation Render, Vercel et Neon

- Blueprint Render NestJS avec déploiement manuel, contrôle de santé et variables de coffre. Configuration Vercel Vite en même origine, relais serveur HTTPS authentifié, cookies conservés et réponses privées.
- Trois tests ciblés du relais réussis. Ils couvrent le refus API direct, le contrôle de santé, le transfert de l’IP attestée par Vercel et des cookies, la réponse PDF sans exposition d’en-têtes internes, et le refus des redirections amont.
- Neon a été consulté en lecture seule. Cinq branches ont été observées dans le projet indiqué et la cible `demo-v1` reste à créer. Aucun service distant ni aucune base Neon n’a été modifié. [Guide de préparation](DEPLOIEMENT_V1.md)
