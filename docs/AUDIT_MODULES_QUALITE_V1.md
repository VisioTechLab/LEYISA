# Contre-audit — reprise qualité des modules LEYISA

Date :19 novembre2026 · Mode : FIX_APPROVED puis VERIFY_FIX · Base : `e0c49ff3f2bd7f17acec75cfe26629bc1b47e45d` · Code : `d5bb92974c25355695e113c711457b2436057c5c` · Branche : `fix/v1-quality-recovery`.

## Résumé exécutif

Autorisation explicite du responsable projet : direction W25 approuvée, extension progressive, correction serveur des incompatibilités, W12/PDF, recherche/homonymes, conservation du dossier, menu par module et CI Playwright. L'autorisation exclut main, Neon partagé et déploiements. Le périmètre a été exécuté sur PostgreSQL locale et vérifié dans Chromium ; ce rapport ne repose pas seulement sur une lecture ou une CI verte.

Le frontend initial est conservé sous la révision de référence ; les contributions des six membres et les fonctionnalités récentes restent la base du travail. Schéma,23 modèles applicatifs, table Prisma et six migrations inchangés. Les sources maîtres, matrices RBAC/RACI/MOC,31 wireframes et références de l'audit restent le cadre de la reprise. Les captures sont comparées à cette direction ; aucune conformité pixel à pixel ou homologation scolaire n'est revendiquée.

## Anomalies confirmées et contre-audit

| ID | Gravité | Défaut initial / preuve | Source corrigée | Non-régression réelle | Confiance |
| --- | --- | --- | --- | --- | --- |
| Q05 | Élevé | Le contrôle W25 n'empêchait pas un PDF primaire P1 ou une synthèse incomplètement publiée via l'API directe | `backend/src/modules/bulletins/bulletins.module.ts:82` | PDF et émission409, y compris archive incompatible ; aucun document créé ; enregistrement d'archive conservé. API réelle locale | Haute |
| Q06 | Moyen | W12 reconstruisait encore un aperçu HTML distinct du PDF | `frontend/src/WorkspacePages.tsx:181` | W12 appelle le lecteur commun ; même Blob pour affichage/téléchargement ; cinq téléchargements authentifiés vérifiés | Haute |
| Q07 | Moyen | Choix d'élève ambigu, sans recherche dédiée et perdu en changeant d'écran | `frontend/src/features/bulletins/BulletinWorkspace.tsx:75`, `frontend/src/WorkspacePages.tsx:159` | Matricules visibles ; recherche réelle, deux homonymes ; W12/W25/retour/rechargement et historique/inscription conservent l'identifiant | Haute |
| Q08 | Moyen | Sélection répétée d'une période vidait la file sans déclencher de nouvelle requête ; même risque pour évaluation/classe-période | `frontend/src/features/results/ResultsModulePage.tsx:34` | Parcours réel avec choix identique à la période courante ; file et sélection restent utilisables | Haute |
| Q09 | Moyen | Une approbation terminée pouvait forcer le retour à la file après navigation vers les résultats | `frontend/src/features/results/ResultsModulePage.tsx:95` | Navigation volontaire après réponse de décision, avant fin du rafraîchissement ; parcours jusqu'au PDF réussi | Haute |
| Q10 | Moyen | Un résultat ouvert directement hors des500 premiers pouvait laisser année/classe/période sans option | `frontend/src/features/bulletins/BulletinWorkspace.tsx:58` | Liste réduite dans le seul harnais ; détail/permissions/PDF réels. Filtres et matricule du document conservés | Haute |

Les corrections sont autorisées pour cette branche. Aucun ancien document n'est supprimé ni écrasé. Le lecteur conserve les octets du téléchargement, pas une reconstitution HTML. Le changement de présentation ne modifie ni calculs, pondérations, décisions, clôtures, permissions ni migrations.

## Risques, améliorations et hypothèses

- **Limite métier confirmée :** primaire P1 n'a pas de gabarit adapté ; sa production est volontairement refusée. Aucun nouveau profil pédagogique n'est inventé.
- **Réserve documentaire :** le modèle primaire original conserve son titre annuel pour les consultations T1/T2/T3. La recette documentaire approfondie porte sur l'annuel primaire ; un relevé trimestriel dédié reste à convenir avec les modèles de référence. Ne pas confondre disponibilité des composantes et homologation d'un formulaire.
- **Limites de couverture :**31 vues lues et contrôlées sur bureau/téléphone ; le parcours critique est joué par clic, mais toutes les mutations de configuration/comptes/audit ne sont pas rejouées par clic. Les tests API/DB couvrent leurs règles existantes. Pas de campagne exhaustive de lecteur d'écran.
- **Amélioration facultative :** recherche de noms sans accents côté PostgreSQL, pagination serveur du catalogue au-delà des500 résultats. La recherche actuelle est sans distinction de casse et porte sur les identités figées.
- **Gouvernance :** composants communs et ajouts rétrocompatibles de recherche documentés pour revue MOC avec les responsables. L'autorisation de correction ne constitue pas une revue humaine de fusion.

## Conformité métier

| Exigence / source | État | Preuve / limite |
| --- | --- | --- |
| Direction sobre W25 approuvée, extension progressive | Vérifiée | Menu par module, palette/logo conservés, contrôles communs et31 comparaisons de vues |
| W12 et W25 montrent le PDF téléchargé | Vérifiée | Lecteur unique et empreintes des cinq documents réels |
| Refus serveur d'un document sans gabarit ou composantes publiées | Vérifiée | Régressions API, archives incompatibles conservées mais refusées |
| Homonymes et sélection conservée | Vérifiée | Deux dossiers de même identité, matricules distincts, navigation/rechargement |
| RBAC/ABAC, résultats figés, règles existantes | Vérifiée dans le périmètre |79 tests backend ;39 contrôles transactionnels ; refus ENS et accès directs |
| main, Neon et déploiements préservés | Vérifiée dans les actions exécutées | Git isolé, DSN loopback, aucune API Neon/déploiement ; garde Vercel de branche inchangée |
| Réglementation scolaire officielle | Non vérifiée | Profils DEMO et modèles partiels ; aucune certification pédagogique |

## Couverture des domaines

Métier : couvert pour les parcours décrits. Architecture : frontières et contrats conservés, lecteur commun et état de travail partagé. Frontend : vues, chargements, erreurs, sélection, homonymes et responsive contrôlés. Backend : garde de document appliquée avant chaque rendu/émission et recherche bornée. Données : migrations réelles sur base vierge et rôle runtime vérifié. Sécurité : permissions, sessions, CSRF, IDOR et absence de secrets dans les artefacts contrôlés. Tests : API/DB/navigateur/PDF, limites explicites. DevOps : builds/lint/audits locaux et workflow avec PostgreSQL éphémère/Chromium ; conclusion de la CI distante fournie après le push dans le compte rendu final.

## Résultats exécutés

| Contrôle | Environnement / résultat | Preuve |
| --- | --- | --- |
| `node --test test/*.test.mjs`, LEYISA_V1_TESTS=1 | Base locale neuve migrée/seedée, runtime sans DDL ;79 réussis,0 échec,0 ignoré ; sortie0 | `preuves-quality-modules/logs/backend-tests.txt` |
| `npm run test:e2e` | Suite complète25 réussis ; puis cas complémentaire du lien direct1/1 ;26 scénarios distincts | `logs/frontend-tests-25.txt`, `logs/frontend-lien-direct.txt` |
| Recapture finale des modules |4/4 tests de lecture, navigation et390/320px, après attente explicite des données | `logs/frontend-captures-finales.txt` |
| `db:verify`, `db:check-access` |39 contrôles réussis et annulés ; runtime sans DDL ni accès migrations | `logs/db-verify.txt`, `logs/db-access.txt` |
| Comptage propriétaire |24 tables publiques, dont Prisma ; six migrations terminées | `logs/schema.txt`, `logs/migrations.txt` |
| Builds frontend/backend, lint frontend | Réussis ; lecture PDF chargée à la demande | Journaux build/lint |
| Vérificateur de géométrie/valeurs PDF | Sept documents contrôlés et rastérisés à220ppp ; synthèse non publiée désormais refusée plutôt que générée | `logs/pdf-verification.txt` |
| Cinq téléchargements Chrome | Identiques aux PDF API de la même base locale de démonstration | `apres/verification-telechargements.json` |
| `npm audit`, backend/frontend |0 vulnérabilité connue retournée lors du contrôle | `logs/audit-backend.txt`, `logs/audit-frontend.txt` |
| Hygiène Git, `git diff --check`, syntaxe YAML/Bash | Vérifiés avant sauvegarde ; aucun secret détecté par les motifs du script | Contrôle de livraison ; ce n'est pas une certification exhaustive |

PostgreSQL18 sur127.0.0.1:55433 ; base `leyisa_quality_modules_release_20261119` pour la dernière suite backend, base `leyisa_quality_modules_final_20261119` pour la recette navigateur et la comparaison des cinq PDF. Données fictives uniquement. Les premiers essais de harnais ratés (filtre de menu, attente de connexion/déconnexion, fixtures d'homonymes non uniques entre exécutions) ont été corrigés ; ils ne sont pas comptés comme des succès. Deux défauts d'application ont été trouvés puis corrigés pendant le parcours (Q08/Q09).

## Verdicts bornés

- **A — Démonstration locale : VALIDÉ SOUS RÉSERVES.** Parcours complet et tranche qualité vérifiés, avec limites de formulaire primaire et couverture détaillées ci-dessus. Le formulaire officiel des périodes non prises en charge n'est pas livré.
- **B — Démonstration en ligne de cette branche : VÉRIFICATION INSUFFISANTE.** Aucun redéploiement autorisé ou exécuté ; la CI ne remplace pas une recette HTTPS du candidat.
- **C — Exploitation réelle : VÉRIFICATION INSUFFISANTE.** Paramètres/règles pédagogiques, homologation des documents, revue humaine et recette d'exploitation restent distincts de la démonstration.

## Suite et revue

Conserver les sources et sauvegardes ; faire revoir la branche et les contrats communs avant intégration. Poursuivre les scénarios d'édition des autres modules et le modèle primaire selon références/décision explicite, sans déduire d'une CI verte que tous les cas d'exploitation sont couverts. Aucune fusion, suppression, migration partagée ou mise en ligne ne découle de ce contre-audit.
