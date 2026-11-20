# Espaces utilisateurs V1

Travail sur `fix/v1-quality-recovery`, depuis `d053a2b`. Schéma, migrations, moteur de calcul, gabarits PDF, contributions historiques et matrice de permissions conservés. Aucune publication avant validation de l’utilisateur.

## Navigation principale

| Espace | Menu |
| --- | --- |
| Administration | Accueil ; Comptes utilisateurs ; Configuration scolaire ; Classes et programmes ; Audit |
| Secrétariat | Accueil ; Élèves ; Inscriptions ; Bulletins |
| Enseignement | Accueil ; Mes classes et cours ; Mes évaluations ; Mes soumissions |
| Direction | Accueil ; Enseignants et affectations ; Validation des notes ; Résultats ; Bulletins |

Les routes de détail existent toujours, mais elles ne sont plus des entrées du menu. Le menu maintient l’écran parent actif et le fil de navigation permet d’y revenir.

- Enseignant : classe/cours → évaluations du cours → nouvelle évaluation ou notes → confirmation de soumission. Mes soumissions présente les états soumise, rejetée ou validée.
- Secrétariat : élèves → fiche et historique → inscription annuelle. Le dossier reste sélectionné dans les liens et à la navigation ; matricule et postnom distinguent les homonymes. La création groupée dossier + inscription reste disponible sur demande.
- Direction : validation → détail → approuver/rejeter avec motif. Résultats → contexte classe/période → vérification → confirmation de clôture → publication → PDF.
- Administration : classes → programme ; configuration → formulaires à ouvrir ; comptes → fiche ou création à ouvrir.

Les droits métier restent vérifiés côté serveur ; une fonction secondaire autorisée par la matrice reste accessible depuis son contexte ou son URL. Une liste plus courte ne supprime aucune permission.

## Rôle actif

`auth/me` et `auth/login` ajoutent `permissionsByRole`, calculé depuis la matrice existante. Le menu utilise l’intersection des permissions de ce rôle avec les routes de son espace. Les comptes monorôles n’ont plus de sélecteur.

Les requêtes applicatives portent `X-Leyisa-Role` ; le relais Vercel le transmet. La garde de session refuse tout rôle absent de la session et restreint le contexte au rôle choisi avant les contrôles existants. Sans en-tête, les clients existants conservent leur comportement approuvé. Cette sélection ne donne aucun droit supplémentaire. La séparation des tâches (interdiction d’approuver ses propres notes) reste fondée sur l’identité et ne peut être contournée par le sélecteur.

La mémoire des dossiers et des cours est isolée par utilisateur **et par rôle actif**, puis détruite à la déconnexion. Les rôles non attribués ne sont jamais proposés.

## Lisibilité et données

Une action principale sur les tableaux de bord ; raccourcis sous forme de liens. Formulaires secondaires fermés au départ ; pages de création ouvertes seulement depuis leur parent. Recherche, filtres explicites et pagination des listes. Les élèves disposent d’un total calculé côté serveur ; enseignants/affectations/évaluations/soumissions/résultats sont paginés à l’écran sur les listes autorisées renvoyées par leurs API. Les bulletins parcourent les pages réseau de 500 résultats, puis paginent les choix à l’écran. Les erreurs interrompent le rendu de l’état vide.

Le lecteur PDF est conservé : aperçu et téléchargement utilisent les mêmes octets, les archives sont maintenues et le backend refuse toujours les périodes incompatibles.

## Vérification

Les captures `preuves-espaces-v1/avant` montrent les quatre tableaux de bord à la référence de départ ; `apres` montre les menus, tableaux de bord, téléphones, vues et parcours réels sur la base synthétique locale existante. Cette base contient les cas des recettes précédentes et diffère de Neon ; aucun seed ni migration n’est requis ou exécuté pendant cette reprise.

Les nouveaux tests `frontend/tests/workspaces.spec.ts` sont automatiquement inclus par la configuration Playwright et donc par la CI existante. Le rapport d’audit précise les exécutions finales et les limites de l’inspection publiée.
