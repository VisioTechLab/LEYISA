# Senior Code Auditor — espaces utilisateurs et visibilité des données

Date : 20 novembre 2026. Modes : `FIX_APPROVED`, `VERIFY_FIX`, puis préparation `AUDIT_RELEASE` de la DEMO. Référence avant : `d053a2b81a852cdd796682d8a8b15b40ffdf60e0`. Branche : `fix/v1-quality-recovery`. L’autorisation couvre les quatre espaces, la navigation contextuelle, les listes, les erreurs et leurs vérifications ; le message « Double déploiement » autorise ensuite la publication DEMO. Le projet Neon principal reste en lecture seule jusqu’à présentation et accord sur la source et les migrations.

## Défauts confirmés et correction

| Constat | Gravité / confiance | Preuve et comportement corrigé |
| --- | --- | --- |
| Sélecteur de rôle décoratif ; menu calculé sur l’union des droits | Moyenne / haute | `App.tsx` et services sensibles aux rôles cumulés ; menus dédiés, permissions dérivées de la matrice et contexte serveur restreint au rôle attribué choisi. Refus d’ADM pour ENS/DIR vérifié. |
| Étapes de détail toutes dans le menu | Moyenne / haute | Routeur avant et captures des quatre accueils ; 4 ou 5 entrées par espace, parents actifs et liens contextuels. Routes conservées. |
| Première période choisie sans action utilisateur | Moyenne / haute | Code antérieur, distribution SQL Neon, tests navigateur ; entrée sur toutes les périodes. La soumission P2 ne doit plus être masquée par P1. |
| Filtres de bulletin implicites | Moyenne / haute | Code antérieur et tests de recherche ; toutes les années/classes/périodes, dossier identifié et lecteur PDF conservé. Pagination réseau au-delà des 500 premiers. |
| Compteur élèves basé sur une page | Moyenne / haute | Ancien `/students` borné à 50 ; réponse paginée additive, total et lignes utilisant le même prédicat ABAC, tri stable. Page suivante réellement testée sur une base contenant plus de 50 dossiers. |
| Formulaires longs ouverts dans les listes | Moyenne / haute | Captures avant/après ; formulaires secondaires sur demande, pages de création explicites et filtres/pagination. |
| Indisponibilité du serveur assimilée à une session absente | Moyenne / haute | `fetchCurrentUser` absorbait toutes les erreurs ; seul401 signifie session absente, les autres erreurs affichent une alerte avec reprise. Test503 puis reprise réelle sur le serveur local. |

Le compte générique enseignant sans affectation n’est **pas un défaut RBAC** : son périmètre vide est confirmé sur Neon et ne doit pas être élargi. Voir `VERIFICATION_DONNEES_NEON_V1.md`.

## Huit domaines

| Domaine | Couverture / résultat |
| --- | --- |
| Métier | Parcours réel local affectation → évaluation → zéro → rejet motivé → correction → approbation → confirmation de clôture → publication → PDF réussi. Aucun changement de règle, calcul, calendrier ou pondération. |
| Architecture | Monolithe et frontières conservés ; contrats additifs seulement (permissions par rôle, pagination élèves, page de bulletins, identité année/classe des contextes de résultats). |
| Frontend | Quatre comptes séparés, menus exacts, recherche/pagination, conservation du dossier et des filtres explicites, états503/403/409, 31 vues, largeurs390 et320. Captures réelles. |
| Backend | Rôle actif vérifié sur la session ; permission et ABAC existants inchangés ; contexte sans en-tête compatible avec les clients historiques. |
| Données | Schéma et six migrations inchangés. SQL Neon en lecture seule. Aucune migration/seed local exécuté dans cette reprise ; base de recette existante réutilisée. Écritures de recette uniquement sur PostgreSQL loopback. |
| Sécurité | Aucun rôle non attribué proposé ou accepté ; séparation des tâches conservée ; cookies HttpOnly/CSRF/relais signé/PDF protégés maintenus ; pas de secret dans les preuves. |
| Tests | 55 tests backend locaux réussis, sans saut. 34 scénarios navigateur initialement exécutés : 33 réussis, un arrêté avant le parcours car mauvais chemin du fichier archive de référence ; contrôle d’archive rejoué avec le fichier original retrouvé et réussi. Après correction de l’erreur de session, 10 scénarios ciblés réussis (archive, quatre espaces, multirôle, pagination, filtres, erreur réseau et reprise503). Cela couvre 35 scénarios distincts à travers ces exécutions, sans présenter le premier run comme vert. |
| DevOps | Builds backend/frontend et lint réussis ; schéma sans diff ; contrôles de release ; tests Playwright automatiquement inclus par la CI existante. Publication DEMO ensuite autorisée, preuves hébergées à ajouter après observation effective. |

## Réserves et risques

- API publiées authentifiées pas encore comparées avant déploiement : aucun onglet distant connecté accessible au moment de l’audit ; l’utilisateur a proposé d’en ouvrir un. L’autorisation ultérieure de recette DEMO permet les connexions et parcours en ligne.
- La mise en ligne doit embarquer frontend **et** backend au même commit ; un frontend récent avec l’ancienne API multirôle ne constitue pas le candidat vérifié.
- Render gratuit peut se réveiller plus lentement que le délai du relais. Risque d’indisponibilité transitoire ; pas de modification commerciale automatique.
- Les tableaux enseignants/évaluations/résultats paginent à l’écran les listes autorisées renvoyées par leurs API. Pour des volumes nettement supérieurs, une pagination serveur supplémentaire sera à définir ; aucun volume n’est masqué ici par cette pagination visuelle.
- Le rôle actif est un choix de navigation courant ; son choix revient au premier rôle attribué après rechargement complet. La mémoire des dossiers est volontairement séparée entre rôles.
- Les réserves pédagogiques et documentaires précédentes restent applicables : profils DEMO, primaire P1 bloqué, titre annuel du gabarit primaire pour les synthèses trimestrielles, validation humaine avant exploitation réelle.
- La recette ne constitue pas un audit réglementaire ou une certification d’accessibilité. Toutes les mutations de tous les modules n’ont pas été rejouées à chaque rôle.

## Verdict avant publication

**DEMO locale : VALIDÉ SOUS RÉSERVES.** Les quatre espaces et les régressions critiques sont vérifiés. **Version hébergée corrigée : À VÉRIFIER APRÈS DÉPLOIEMENT.** **Exploitation réelle : VÉRIFICATION INSUFFISANTE**, jusqu’au contrôle de la base principale et à la validation des références pédagogiques, de l’hébergement et de la protection des données.
