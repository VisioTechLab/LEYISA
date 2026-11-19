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

## Candidat de démonstration locale et audit de release

- [La CI du lot Render/Vercel](https://github.com/VisioTechLab/LEYISA/actions/runs/44548064758) a réussi. Le manifeste Vercel a aussi été validé contre son schéma publié et Prisma a validé le schéma en mode shared local, sans connexion distante.
- T10 a reproduit un défaut de filtrage de l’historique élève sur 88e4998. Après correction, liste et détail ne renvoient que les inscriptions correspondant aux affectations actives de l’enseignant. Les recherches par année et classe respectent le même périmètre. Le secrétariat conserve les deux inscriptions.
- Les quatre accueils présentent les données réelles avec tableau d’aperçu. W01, W09, W12, W19, W24–26 ont été rapprochés des maquettes existantes. Chromium a rejoué le parcours sur une nouvelle classe-période ouverte et produit les 31 captures de recette ainsi que le PDF. Relecture réussie après redémarrage.
- Vérification finale locale avec PostgreSQL 18.7 et Node 24.22.1 : 76 tests réussis, aucun échec ni ignoré, 39 vérifications DB et droits du rôle runtime validés. Compilations des deux applications, lint, scan de motifs et comparaison du manifeste des preuves réussis.
- La [matrice des 31 vues](CONFORMITE_WIREFRAMES_V1.md), le [rapport d’audit](AUDIT_RELEASE_V1.md), les [tests](TESTS_V1.md) et les [migrations](MIGRATIONS_V1.md) documentent les résultats et les écarts. Les verdicts se prononcent sur la démo locale, la démo hébergée et l’exploitation réelle.

## 19 novembre 2026 — accès aux hébergeurs et protection de la démo V1.5

- Vercel confirme le forfait Hobby actif pour `visio-tech-lab`. Le projet `leyisa-v1-5-demo` a été créé avec la protection de tous les déploiements. La relecture confirme Vite, Node.js 24.x, l’absence de liaison Git et zéro déploiement.
- L’API Render rattache le service Free `leyisa-nestjs` au projet communiqué. Le déploiement de départ `dep-dbqss6tg1s2s73f9ld10` au commit `17df06bac29740a6b550f701c04056c63f870e29` reste en service.
- Un bac à sable Vercel privé, éphémère et sans port public a vérifié TLS 1.3 et le nom du serveur sur le point d’accès PostgreSQL direct de `demo-v1`. Le test a rendu `Verification: OK` et s’est arrêté avant l’authentification. L’import et la recette en ligne restent ouverts. [Guide de mise en service](MISE_EN_SERVICE_DEMO_V1_5.md)
- Vercel a attribué le domaine `leyisa-v1-5-demo.vercel.app`. La relecture confirme les deux variables du relais pour les déploiements de production et de prévisualisation, dont le secret en type `sensitive`. Les clients `pg_restore` et `psql` 18.7 démarrent dans le bac à sable. Aucune sauvegarde ni chaîne PostgreSQL n’y a été envoyée.

## 19 novembre 2026 — restauration Neon et contrôle des privilèges

- Autorisation explicite reçue pour le bac à sable privé. La cible `LEYISA School Demo V1 / demo-v1 / leyisa_demo` était vide avant l’import. L’empreinte de la sauvegarde fictive a été vérifiée localement et sur le poste de restauration. SHA-256 `7cd58d884435ad888d0f533e2d7b081eb20455c9fee9ae6871d298c72f6f3672`.
- `pg_restore` 18.7 a restauré la sauvegarde en une transaction sur la connexion PostgreSQL directe `verify-full`. Les six lignes terminées du registre Prisma portent exactement les noms et empreintes des migrations versionnées. La base contient 84 utilisateurs fictifs, 21 élèves et 105 résultats publiés. Elle ne contient aucune session importée, aucun compteur de connexion et aucun accès élève actif.
- Le compte `leyisa_demo_runtime` a réussi le contrôle par la connexion groupée en TLS `verify-full`. Les droits des 24 tables sont conformes, dont le registre Prisma inaccessible et les tables d’audit en ajout seul. Le compte ne peut ni administrer le schéma ni créer des rôles ou des bases. L’accès propriétaire temporaire a été révoqué. L’API Vercel confirme la destruction du bac à sable de restauration.
- Les cinq résultats de référence ont été retrouvés en base. Le téléchargement HTTPS des PDF reste à vérifier après déploiement.

## 19 novembre 2026 — API Render de démonstration active

- Le service Free `leyisa-nestjs` a été réutilisé avec la branche `demo/leyisa-v1`, le répertoire `backend` et le déploiement automatique désactivé. Le déploiement manuel `dep-dbvklqflk1mc73e1cqog` est actif au SHA `7783483d59e5f64f5d7e9e54ecb609a28be4e9a3`. Render reçoit uniquement la chaîne groupée du compte runtime, avec TLS `verify-full`.
- Depuis l’extérieur, `GET /health` répond 200 et un accès direct à `GET /api/v1/auth/csrf` sans authentification du relais répond 403.

## 19 novembre 2026 — recette de la démonstration hébergée

- Vercel Hobby a publié `dpl_5ZodKxRmTSRNPwsJWpy6GECVk8Sp`, associé au SHA `7783483d59e5f64f5d7e9e54ecb609a28be4e9a3`. Sans accès, l’alias stable et l’URL du déploiement redirigent vers Vercel (302). Avec l’accès de recette temporaire, l’accueil répond 200. L’accès technique a ensuite été révoqué et la protection a été recontrôlée. [Démonstration privée](https://leyisa-v1-5-demo.vercel.app/)
- Deux sessions indépendantes du secrétariat ont téléchargé les cinq modèles V1.5 sur le domaine. Les PDF étaient identiques aux références locales, en téléchargement et sous `private, no-store`. Les sessions ADM, DIR et ENS ont également été vérifiées. Refus contrôlés sans session (401), hors rôle (403), sans jeton CSRF (403) et avec origine étrangère (403). La déconnexion renvoie 204 et le rechargement ne rétablit pas la session révoquée.
- Sur une classe de recette fictive distincte, l’inscription a persisté et le doublon a renvoyé 409. Deux enseignants ont saisi les notes ; zéro a été accepté et 21/20 refusé. La direction a rejeté, validé la correction, clôturé le résultat 15/40 et publié. Le bulletin a renvoyé 404 avant publication, 403 à l’enseignant et 200 au secrétariat après publication. Le premier essai avait déclenché le verrou du programme après le début des évaluations. La recette a été rejouée avec les deux matières configurées d’abord.
- Render a confirmé le redémarrage du service. Le point de santé a répondu 200 ensuite. La lecture de l’inscription et un nouveau téléchargement ont confirmé la persistance. SHA-256 du bulletin de recette avant et après redémarrage `4c2785952be97ac1af4ac30c7f88d9d2fa55e076f778e3cf22a080d0b9638531`.
- Sur Chromium tactile, à 390 × 844, le formulaire se présente sans débordement. La connexion, le rechargement et la déconnexion 204 ont réussi sur le site hébergé. Confirmation nominative sur le téléphone de Melvin en attente. Les identifiants sont à remettre par coffre nominatif avec expiration. [Procédure et accès invité](MISE_EN_SERVICE_DEMO_V1_5.md#3-recette-hébergée-avec-melvin)

| PDF V1.5 téléchargé | SHA-256 en ligne, identique à la référence |
| --- | --- |
| Carte maternelle | `ff7bc3440509786e54a66449bb2a3424f642727a3e8caabe1b1cb549699b1fb3` |
| Bulletin primaire | `5e5f7e2a4fe01170b3849be940a688ac6d41c217aff4b508df3d8c5ff924fc4d` |
| Bulletin secondaire | `492c7c41216e57f11fad3200e6dfd69b9d88c0b23c75f590b4067ec65b150457` |
| Bulletin secondaire annuel | `4de7f4f763279dba72ccb96794ca1634822b8e6496bcc5075f56b68ff1e59712` |
| Repêchage | `a0b5b1664d1cf8416ba13b063df0d8e9dce95627cb9099ffd35b6d77ed230e68` |
