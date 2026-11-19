# Rapport d’audit de release LEYISA SCHOOL V1

19 novembre 2026 · Senior Code Auditor · AUDIT_INTEGRATION, AUDIT_SECURITY, AUDIT_WORKFLOW, VERIFY_FIX et AUDIT_RELEASE.

Référence auditée et testée sur la branche integration/leyisa-v1-cloud, issue de 45b62052594526ada995abb9bb422d5951973372. Le backend NestJS utilise Prisma/PostgreSQL et le frontend React utilise Vite. Les preuves concernent des données fictives locales et le workflow GitHub. [Intégration et provenance](INTEGRATION_V1.md)

## Anomalies confirmées et contre-audit

| ID | Gravité initiale | Preuve et conséquence | Correction et vérification |
| --- | --- | --- | --- |
| AUD-01 | Critique | Dans 45b6205, evaluations.controller.ts:8–30 et results.controller.ts:8–60 exposaient les opérations hors garde globale. Lecture statique, confiance haute. | Session commune, permission déclarée et refus par défaut. Inventaire des routes, appels sans session et hors rôle testés. |
| AUD-02 | Critique | Dans 45b6205, results.service.ts:78,98,139,330 acceptait l’acteur fourni par le client. Une décision pouvait prendre une autre identité. Lecture statique, confiance haute. | Acteur session et séparation transactionnelle. T14 vérifie le refus d’auto-décision et l’état intact. |
| AUD-03 | Élevée | Dans 761d92c, permissions.ts:18–49 différait des matrices sur les affectations et l’audit. Lecture statique, confiance haute. | Matrice alignée sur l’approbation du 14 novembre. Accès et refus SEC/ADM/DIR vérifiés. |
| AUD-04 | Élevée | Dans 9524c88, students-session.guard.ts et apiStudentsDataSource.ts:21–34 utilisaient un mécanisme Bearer distinct et un stockage navigateur. Lecture statique, confiance haute. | Cookie opaque et garde commune. Stockages Web vides dans Chromium, scan bundle et empreinte seule en DB. |
| AUD-05 | Élevée | L’ancien password.ts utilisait scrypt sans conformité Argon2id C01 et l’authentification n’appliquait pas le jeton CSRF commun. Lecture statique, confiance haute. | Argon2id avec rehash compatible. Cookie réel HTTPS, refus CSRF et conservation du jeton entre onglets vérifiés. |
| AUD-06 | Élevée | Dans 45b6205, results.service.ts:283–302 calculait avec des flottants et les seules matières déjà calculées. Une matière attendue pouvait disparaître avant clôture. Lecture statique, confiance haute. | Decimal, contrôle des composantes, résultats incomplets et instantanés figés. Tests 30/40, 10/40, 66/80 et 280/350. |
| AUD-07 | Élevée | Dans 45b6205, la configuration, les affectations et les bulletins ne constituaient pas un parcours backend relié. Lecture statique, confiance haute. | Tranche reliée à PostgreSQL. Recettes API, navigateur et PDF des trois cycles. |
| AUD-08 | Élevée | Dans c10b863, ResultsModulePage.tsx réutilisait l’aperçu ou le résultat affiché après un changement de classe-période. La décision pouvait toucher une classe différente. Lecture statique, confiance haute. | Le changement de contexte efface aperçu et confirmation. Chromium a vérifié les blocages en clôture et publication. La confirmation nomme classe et période. |
| AUD-09 | Élevée | Dans 88e4998, StudentsService autorisait l’entrée dans le dossier et renvoyait aussi des inscriptions hors affectation. La recette T10 a reproduit le défaut sur deux années fictives. Confiance haute. | Le filtre ENS s’applique à la même inscription pour les critères classe/année et masque les autres inscriptions dans liste et détail. T10 passe après correction et l’historique SEC reste complet. [Service](../backend/src/modules/students/students.service.ts) · [Test](../backend/test/v1.integration.test.mjs) |
| AUD-10 | Moyenne | Le script de contrôle runtime exigeait UPDATE/DELETE sur quatre nouvelles tables à droits volontairement limités. Reproduction sur PostgreSQL local. | Le contrôle en lecture seule utilise les privilèges attendus de la V1 et s’exécute en CI. |

## Anomalies restantes et décisions ouvertes

| ID | Nature | Écart et action |
| --- | --- | --- |
| REST-01 | Défaut moyen | W10 affiche le dossier et l’historique. La correction du dossier passe par l’API. Le formulaire et la procédure de correction d’une inscription restent à traiter avec Franck et Melvin. |
| REST-02 | Défaut moyen | Le catalogue limite la réponse à 500 bulletins. Ajouter pagination et filtres adaptés au volume réel. [Contrôleur](../backend/src/modules/bulletins/bulletins.module.ts) |
| REST-03 | Défaut faible | W26 supporte action et acteur. Le filtre de période et les écarts visuels de densité et placement restent à traiter. [Comparaison des 31 vues](CONFORMITE_WIREFRAMES_V1.md) |
| REST-04 | Risque à vérifier | Le mobile est testé sur la liste des élèves. La campagne clavier, lecteur d’écran et états d’erreur reste ouverte pour l’ensemble des vues. |
| REST-05 | Décisions métier et MOC | Les maxima hors plages attestées, groupes, échelles maternelles, conduite, délibération officielle et activation ELEVE requièrent les décisions de l’établissement. [Registre](DECISIONS_V1.md) |
| REST-06 | Vérification indisponible | Aucun essai hébergé et aucune cible Neon demo-v1. Attendre les approbations de mise en service et vérifier la recette HTTPS après provisionnement. [Déploiement](DEPLOIEMENT_V1.md) |

## Couverture et preuves

| Domaine | Vérification et portée |
| --- | --- |
| Métier | Trois cycles, profils DEMO versionnés et deuxième session vérifiés. Les règles officielles restent à confirmer. |
| Architecture | Contributions et contrats relus. Les contrats hors C01 demeurent proposés pour revue. |
| Frontend | 31 vues inspectées, parcours Chromium de l’inscription au PDF et deux petits écrans sur W08. |
| Backend et sécurité | 76 tests sans échec ni ignoré, dont permissions, portée ENS, CSRF, TLS local, persistance, séparation des tâches et relais. Accès ELEVE vérifié au service avec login inactif. |
| Données | Six migrations sur base vierge et mise à niveau de trois à six. 39 contrôles PostgreSQL annulés, empreintes historiques identiques après restauration et runtime sans DDL. |
| DevOps | Builds verrouillés, CI GitHub exécutée, sauvegarde Git téléchargée et restaurée. Les manifestes Render et Vercel sont préparés et vérifiés localement. |

[Tests exécutés](TESTS_V1.md) · [Migrations](MIGRATIONS_V1.md) · [Journal](JOURNAL_INTEGRATION_V1.md) · [GitHub Actions](https://github.com/VisioTechLab/LEYISA/actions?query=branch%3Aintegration%2Fleyisa-v1-cloud)

## Verdicts

| Périmètre | Verdict | Justification |
| --- | --- | --- |
| Démo locale de bout en bout | **VALIDÉ SOUS RÉSERVES** | Parcours persistant, trois formats PDF et contrôles exécutés. Écarts d’interface et limites de consultation ci-dessus. |
| Démo en ligne sécurisée | **VÉRIFICATION INSUFFISANTE** | Relais testé en local. Autorisations de mise en service et recette hébergée ouvertes. |
| Exploitation réelle en établissement | **REFUSÉ** | Profils de démonstration. Règles officielles, traitement des volumes et recette de production à valider. |

Kevin fournit le SHA, la CI et les preuves pour la revue. Les propriétaires examinent leurs contrats et les écarts. Melvin valide les changements techniques et les migrations. Un pair distinct relit le diff avant toute fusion.
