---
name: leyisa-joel
description: "Accompagner Joel sur evaluations dans Leyisa School, en livrant de petites tranches compatibles avec les contrats de l’équipe."
---

# Leyisa — Joel

## Rôle et périmètre

Évaluations, notes et soumissions ; référent cybersécurité proposé. Modules sous responsabilité : evaluations.
Fichiers normalement modifiables : `frontend/src/features/evaluations/`, `backend/src/modules/evaluations/`, avec leurs tests locaux lorsqu’ils existent.

Les chemins sont relatifs à la racine du dépôt. Consulter `AGENTS.md`, `docs/equipe.md`, `docs/architecture.md`, `docs/regles-communes.md`, `docs/regles-metier.md`, `docs/contrats-api.md`, `docs/workflow-git.md` et `docs/parcours-demo.md`.

Les autres modules, shared/common, modèles partagés, migrations, contrats et configurations racine nécessitent une coordination avec leurs responsables. Le rôle de lead ne dispense pas de cette coordination. Le backend proposé doit être validé par Melvin avant installation ; ne pas ajouter de dépendances ou code métier pendant l’initialisation du socle.

## Dépendances

Kevin fournit les affectations, Jonathan la configuration, Franck les inscriptions. Melvin consomme les soumissions ; collaborer avec Sidonie sur les contrôles sensibles.

## Analyser puis développer

1. Examiner l’état Git et la branche, les derniers changements, les fichiers du module, ses tests et ses consommateurs. Préserver les changements présents et réutiliser l’existant.
2. Identifier les décisions confirmées et les contrats manquants. Si une information bloque la tranche demandée, préciser la décision nécessaire au responsable ; progresser sur les parties indépendantes.
3. Ramener une demande courte à une petite fonctionnalité intégrable dans le périmètre. Exemple : « saisis les notes » signifie une saisie selon les règles et autorisations confirmées, sans calculer les résultats ni clôturer. Ne pas lancer une refonte du module.
4. Convenir des changements partagés avant de les appliquer, créer une branche courte puis implémenter la tranche avec la stack réellement validée. Actualiser seulement les contrats et documents affectés.
5. Vérifier le passage au module consommateur avec des données fictives. Pour les PDF, imposer `DÉMONSTRATION - NON OFFICIEL`.

## Vérifications et compte rendu

Exécuter les tests pertinents, compilation et contrôles disponibles dès qu’ils existent ; couvrir les règles et autorisations affectées. Exécuter `git diff --check`, examiner les fichiers ajoutés et vérifier l’absence de secrets. Ne pas prétendre qu’un test métier a fonctionné sans code exécutable.

Dans la PR, donner les fichiers et comportements changés, les contrats affectés et accords obtenus, les commandes exécutées avec résultats, les vérifications impossibles et les décisions ouvertes. Indiquer la prochaine étape d’intégration. Faire revoir par un autre humain ; aucune fusion automatique.
