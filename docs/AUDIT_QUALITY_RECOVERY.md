# Contre-audit Senior — reprise qualité, tranche W25

Date :19 novembre2026. Modes AUDIT_DIFF, AUDIT_WORKFLOW, FIX_APPROVED, VERIFY_FIX. Référence V1.5 :`7783483d59e5f64f5d7e9e54ecb609a28be4e9a3`. Correctif exécuté :`6555bf11d1bc091bdf024299881a03b9d184ab50`. Autorisation : demande explicite de correction et de sauvegarde du responsable projet ; validation du premier écran requise avant généralisation.

## Résumé exécutif

Ancien travail récupéré et sauvegardé sur GitHub à `e87dcfa`. Comparaison des sources Desktop/socle/Cloud/démo effectuée. Le schéma conserve23 modèles applicatifs, six migrations identiques et la table technique Prisma. Lecture du dépôt et du kit, inspection de la connexion déployée, puis vérification dynamique exclusivement sur PostgreSQL locale et comptes fictifs. La V1.5 hébergée n'a pas été utilisée pour créer sessions ou données, et aucun service Neon n'a été modifié.

## Anomalies confirmées

| ID | Gravité | Preuve et chemin causal | Correction vérifiée | Confiance |
|---|---|---|---|---|
| Q01 | MOYEN | Ancienne vue `WorkspacePages.tsx` : tableau HTML reconstruit ; lien PDF vers un autre gabarit. Aperçu visuellement différent du fichier. | W25 utilise les octets du PDF authentifié pour le canvas et le téléchargement. Cinq modèles téléchargés comparés par SHA256. | Haute |
| Q02 | ÉLEVÉ pour le primaire P1 | `primary-bulletin.ts:5,56` : colonnes figées T1/T2/T3, aucune composante correspondante pour une racine P1. Notes absentes du document malgré résultat publié. | L'API signale l'incompatibilité, la nouvelle vue n'offre pas ce PDF et explique le choix T1/T2/T3/année. Test backend + navigateur. Le gabarit primaire P1 lui-même et l'ancienne vue W12 restent un écart explicite. | Haute |
| Q03 | ÉLEVÉ pour le repêchage | V1.5 `secondary-bulletin.ts` ne lit pas `retakeScores` ni le total de deuxième session. L'ancien contrôle vérifiait40 en JSON, pas sa présence dans le PDF. Défaut observé sur le rendu téléchargé. | Gabarit V1.6 : bloc de deuxième session issu des valeurs figées. Tests spatiaux exigent40/40,40/1520 et pourcentage stocké. Moteur V1.5 isolé, PDF archivé restitué octet pour octet en navigateur. | Haute |
| Q04 | MOYEN | Ancien sélecteur élève/classe/composant unique et aperçu dans le petit panneau de `.leyisa-grid` | Quatre filtres cohérents, lecteur élargi, zoom et pagination, mises en page390/320px sans débordement global. | Haute pour cette tranche |

## Risques, améliorations et hypothèses

- Le catalogue W12 conserve encore son aperçu HTML ; il doit adopter le lecteur après validation de W25. Ne pas déclarer tous les aperçus corrigés.
- Le titre du modèle primaire demeure « fin d'année » lorsqu'un trimestre est consulté. Son adaptation et une représentation propre de P1/P2 demandent une décision de présentation ; aucune fausse note n'est ajoutée pour remplir le formulaire.
- Le nouveau bloc de deuxième session est un ajout documentaire visible à approuver ; les formes et proportions générales V1.5 restent conservées, et les anciennes versions restent lisibles.
- Navigation globale, toutes les tables et toutes les interactions des30 autres vues ne sont pas requalifiées dans ce contre-audit. Accessibilité lecteur d'écran exhaustive, impression papier et test de charge non exécutés.
- Les règles pédagogiques non confirmées, les échelles maternelles et la péréquation restent celles de DECISIONS_V1, sans nouvelle hypothèse réglementaire.

## Conformité métier

| Exigence | Vérification / limite |
|---|---|
| W25 p29 : choix du bulletin et aperçu | Fonctionnels ; écart intentionnel de largeur pour lire le vrai A4, année et versions ajoutées. Capture bureau + mobile soumise à validation. |
| BUL01/BUL02, RBAC/ABAC | Gardes préservées ; ENS refusé en API et vue ; SEC/DIR utilisent les résultats publiés. Accès élève reste inactif, pas de prétendue recette de connexion ELEVE. |
| Historique et SoD | Première session immuable et versions V1.3/V1.4/V1.5 conservées ; compte auteur ne valide pas sa soumission dans la suite backend. |
| Calculs et migrations | Moteur,23 modèles et six migrations inchangés ;24 tables constatées avec propriétaire local,23 visibles au runtime limité. |
| Données imprimées | Maternelle10 attitudes/6périodes ; primaire1800/2400 ; secondaire annuel1140/1520 ; CTEB P1 zéro/400 ; repêchage40/40 et40/1520. Valeurs du jeu fictif, aucune certification officielle. |

## Couverture des domaines

Métier/données/sécurité : couverts par la suite existante rejouée sur base neuve et les assertions nouvelles. Frontend : W25 et ses erreurs/permissions/mobile couverts. Backend : contrat documentaire et repêchage couverts. Architecture : ajout local au module existant, lecteur Mozilla chargé à la demande. DevOps : builds et sauvegarde GitHub, pas de déploiement ni recette hébergée. Les autres vues restent hors contre-audit graphique de cette tranche.

## Résultats des tests

| Commande / environnement | Résultat observé |
|---|---|
| Backend Node24.22.3/PostgreSQL18.6, base `leyisa_quality_verification` neuve, six migrations, runtime sans DDL |79 tests réussis,0échec,0ignoré,107,1s. [Journal](preuves-quality-recovery/logs/backend-tests.txt) |
| `npm run db:verify` |39 contrôles réussis, écritures annulées. [Journal](preuves-quality-recovery/logs/db-verify.txt) |
| Frontend Chrome réel, API locale, `npm run test:e2e` |15 tests réussis,43,6s : cinq modèles, versions, émission, reload,403,409, vide, chargement, pagination et390/320px. [Journal](preuves-quality-recovery/logs/frontend-tests.txt) |
| Contrôle spatial Python et rasterisation220ppp |8 documents contrôlés, incluant cas partiel et paginé. Comparaison des cinq téléchargements Chrome aux PDF de cette recette. [Empreintes](preuves-quality-recovery/verification-telechargements.json) |
| Builds backend/frontend, lint et scan à motifs | Réussis ; journaux fournis. Un scan à motifs n'est pas une certification exhaustive. |
| CI distante, Vercel/Render/Neon | Pas de déploiement ni mutation partagée demandés. La source de cette branche désactive son déclenchement Git Vercel. Aucune réussite hébergée revendiquée. |

La première installation hors ligne a échoué faute de paquets en cache ; installation verrouillée en ligne réussie. Prisma a d'abord rencontré un cache en lecture seule ; compilation réussie avec XDG_CACHE_HOME temporaire. Le premier build frontend a détecté une option PDF.js retirée ; corrigée avant les recettes. Ces tentatives ne sont pas comptées comme validations.

## Verdict

**VALIDÉ SOUS RÉSERVES pour la démonstration locale de W25** : données et comportements de cette tranche vérifiés, mais approbation graphique du responsable projet attendue. Ce verdict n'est ni une validation des31 écrans ni une autorisation de fusion ou de déploiement.

Démo en ligne de cette correction : **VÉRIFICATION INSUFFISANTE**, non déployée. Exploitation réelle : **VÉRIFICATION INSUFFISANTE**, règles pédagogiques et recette établissement toujours ouvertes.

## Plan de correction et contre-audit

1. Recueillir l'avis sur la capture W25 et le bloc repêchage V1.6.
2. Après accord : reprendre W12, traiter la présentation du primaire périodique, puis les tables et la navigation par tranches testées.
3. Soumettre contrats et diff aux responsables/lead selon MOC, sans attribuer une approbation technique inexistante.
4. Hébergement et migration partagée seulement après autorisation distincte, avec vérification réelle de l'environnement.

Les anciennes sources restent dans leur worktree et dans une branche GitHub nouvelle. Le ZIP original reste intact. Aucun reset, suppression de contribution, force-push ou fusion effectué.
