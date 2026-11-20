# Affectations, créations et soumissions — reprise du 20 novembre 2026

## Périmètre autorisé

Le responsable demande de corriger les clics d'affectation, de création et de soumission, puis de déployer. Travail sur `fix/v1-quality-recovery`, sans modification de `main`, de la DEMO indépendante, des permissions métier ou des données scolaires hébergées.

La version publiée `8029c90` est intégrée localement en conservant son historique et ses contributions (comptes enseignants, calendrier historique, grille primaire provisoire, bulletins V1.7, appréciations maternelles et compteurs). Les doublons de traitement du réveil Render sont résolus en conservant les lectures réessayables et l'interdiction de rejouer automatiquement une écriture. Les PR11/12 restent hors périmètre, sans fusion.

## Défauts corrigés

- Enseignant → Affectations : le lien porte maintenant l'identifiant de l'enseignant ; liste filtrée et enseignant prérempli pour la nouvelle affectation, avec conservation au rechargement et possibilité de voir tous les enseignants.
- Création du profil enseignant : les comptes déjà rattachés ne sont plus proposés comme nouveaux candidats. Un compte actif sans profil peut être rattaché une seule fois ; le contrôle serveur d'unicité est conservé.
- Nouvelle affectation : enseignants actifs, année dans le libellé de classe, explication si le programme ou les enseignants disponibles manquent. Aucun doublon ou chevauchement autorisé par contournement.
- Création d'évaluation : seules les périodes ouvertes, du même cycle, compatibles avec le type et en intersection avec les dates de l'affectation sont proposées. Pas d'agrégat trimestriel/annuel ni de calendrier historique dans la saisie. Changer de type efface le composant précédent ; la date est bornée par la période et l'affectation, fin exclusive incluse dans le calcul.
- Maternel : seul le type appréciation est proposé, sans imposer un barème numérique. Les références pédagogiques existantes restent inchangées et ne deviennent pas officielles par cette correction.
- Lien direct vers une évaluation absente : erreur conservée sur l'identifiant demandé ; pas d'ouverture silencieuse d'une autre évaluation quand la liste arrive plus tard.
- Compatibilité historique : les totaux absents restent inconnus, les vrais zéros restent des zéros ; aucun recalcul d'un résultat figé.

## Vérifications réalisées avant publication

Nouvelle base locale `leyisa_operations_20261120` sur loopback, sept migrations existantes appliquées sans modification, seed fictif explicite et compte runtime limité. Aucun seed ou migration Neon.

- 97 tests backend réussis, zéro échec/ignoré : RBAC/ABAC, CSRF, concurrence, versions, invariants et calculs, résultats et PDF.
- 39 contrôles SQL réussis ; écritures de vérification annulées. Contrôle des privilèges runtime réussi.
- Builds frontend/backend, lint frontend, contrôle de livraison et `git diff --check` réussis.
- Parcours navigateur effectivement exécuté : affectation → deux évaluations → notes (zéro et dépassement de barème) → soumission → rejet motivé → correction → resoumission → approbation → clôture → publication → PDF. Période fictive passée utilisée sans modifier l'horloge.
- Première suite navigateur : 43/44 réussis ; le nouveau test d'affectation cherchait « Recherche » au lieu du libellé réel « Rechercher ». Test corrigé. Les cinq tests d'opérations, incluant une création réelle de compte ENS inactif, activation ADM et rattachement DIR sans doublon, passent ensuite.
- Les autres cas couvrent les quatre espaces, les liens, les dossiers, les PDF et le comportement mobile. Les captures ne contiennent que les données fictives locales.

## Publication

Publication effectuée avec l'autorisation explicite du responsable, réaffirmée avant sa présentation :

- Révision applicative commune : `48ccf241f076ea760c3d1f2fb1553a64197ad521`.
- [CI du commit publié](https://github.com/VisioTechLab/LEYISA/actions/runs/44829256852) entièrement réussie : 97 tests backend, zéro ignoré, 45 tests Playwright, 39 contrôles SQL, vérification des PDF, builds/lint et sauvegarde/restauration Git.
- Render `leyisa-production-api` : déploiement manuel du commit exact `dep-dc0clru7bikc73f4brc0`, LIVE ; contrôle `/health` HTTP200 avec statut ok. Aucun seed, migration ou changement de configuration.
- Vercel `leyisa-school-recette` : `dpl_Ad9BgZ7fy5E1P3oEhVBKLCnZxjEh`, READY, même commit, alias https://leyisa-school-recette.vercel.app/ affecté sans erreur. Node24 et protection Vercel Authentication All Deployments conservés.
- Navigateur hébergé : nouvelle version rechargée ; 12 liens d'affectation contextualisés, clic réel et conservation de l'enseignant dans le filtre confirmés après chargement. Aucun formulaire métier soumis sur les données hébergées.
- Erreurs après publication : aucune entrée applicative error Render dans la fenêtre du déploiement ; aucune erreur/fatal Vercel retournée pour le nouveau déploiement. Fenêtre courte, sans promesse d'absence de défaut.
- Les empreintes et nombres de lignes de 18 tables métier Neon sont identiques avant/après publication. Main, branche de livraison et DEMO restent inchangées. Les sessions existantes sont utilisées pour le contrôle.
- Bundle Git complet vérifié : `LEYISA-quality-evidence/LEYISA-operations-20261120.bundle`.

Les deux services ont été publiés depuis la branche d'intégration sur ce commit précis, sans fusion de PR ni avance de la branche de livraison. La revue humaine reste nécessaire avant une fusion, conformément à AGENTS.md. Aucun changement de plan ou de secret.

Le test d'une vraie décision scolaire sur les élèves hébergés n'est pas remplacé par les tests locaux. Les notes, affectations et décisions existantes ne sont pas changées pour remplir artificiellement une file de soumission.
