# Intégration LEYISA SCHOOL V1

Reprise du 19 novembre 2026 sur [integration/leyisa-v1-cloud](https://github.com/VisioTechLab/LEYISA/tree/integration/leyisa-v1-cloud). Les changements MOC restent proposés à la revue des propriétaires et du lead technique.

## Git et provenance

- Le clone initial a comparé 16 branches et sept pull requests. `main` à `7bd4e48cbef4beb4109e54e441431bc41542783d` est devenue ancêtre de la branche d’intégration par une fusion locale sur cette dernière. Sa référence GitHub n’a pas changé.
- Le premier push a créé la branche depuis `45b62052594526ada995abb9bb422d5951973372`. Le second a modifié un workflow, avec SHA local/distant concordant et [run 44544558337 réussi](https://github.com/VisioTechLab/LEYISA/actions/runs/44544558337). Le droit d’écriture sur cette branche et ses workflows a été constaté.
- L’API GitHub a retourné HTTP 422 pour `d35cce8bc83df8c9f5330924fa10e6b5579543e0`. Un fetch ciblé a renvoyé `not our ref`. L’archive de travail, qui fournit un instantané sans objets Git, a été reprise après vérification de ses 269 empreintes. Les 43 empreintes du kit ont également été vérifiées.
- Les têtes publiques et les PR ont été comparées au socle. Les branches anciennes, les PR fusionnées et les têtes non intégrées sont conservées dans GitHub et reprises dans le bundle complet. L’ancienne branche Render fournit un précédent de configuration, tandis que le Blueprint utilise le backend NestJS intégré.

| Membre | Preuve et intégration |
| --- | --- |
| Kevin | Socle `85a3d6f`, navigation, logo, composants React, affectations modernisées et reprise des contrats communs. `61a5ae1` reste accessible comme première contribution UI. |
| Sidonie | `a195178`, `761d92c`, `ef1558a`, `c452106` repris avec auteurs. Conflits limités à l’import des modules Nest et au proxy Vite. Session et permissions communes durcies. |
| Franck | `9524c88` repris sur les fichiers étudiants et tests, avec attribution. Source API et persistance combinée préservées. Historique filtré au niveau de chaque inscription pour ENS. |
| Jonathan | `fc085db` repris sur le composant scolarité et son CSS avec attribution. La PR #2 antérieure ne comprenait pas ce commit. Les nouveaux écrans de scolarité et les trois modèles de bulletins suivent le référentiel. |
| Joël | `0dfea2e` est déjà ancêtre de `45b6205`, dont API et vue évaluations. Gestion de versions, appréciations et soumissions raccordées à l’identité réelle. |
| Melvin | `32e5fc8` et ses ancêtres sont conservés. Les règles de calcul, les transactions, les instantanés et la clôture ont été étendus à la publication et aux profils de démo. |

Les anciens socles racine isolés des branches Franck, Jonathan et Render restent dans leurs branches d’origine. Le code de finalisation de l’archive a été appliqué par-dessus les contributions attribuées. Ses résultats historiques sont conservés dans l’archive. Les [preuves dans cette branche](preuves/) proviennent des exécutions de la reprise.

## Revue et vérification

La référence de départ, les lots publiés et les preuves de sauvegarde figurent dans le [journal](JOURNAL_INTEGRATION_V1.md). Les contrats, les règles et les écarts sont tracés dans [CONTRATS_API_V1.md](CONTRATS_API_V1.md), [DECISIONS_V1.md](DECISIONS_V1.md) et [AUDIT_RELEASE_V1.md](AUDIT_RELEASE_V1.md).
