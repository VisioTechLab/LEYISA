# Instructions communes aux assistants

## Avant toute modification

Lire `README.md`, `docs/equipe.md`, `docs/architecture.md`, `docs/regles-communes.md`, `docs/workflow-git.md`, puis les règles et contrats concernés dans `docs/regles-metier.md` et `docs/contrats-api.md`. Lire le Skill du membre dans `.agents/skills/leyisa-<prenom>/SKILL.md` lorsqu'il est identifié. Si le rôle est inconnu, examiner la demande et les propriétaires des dossiers avant d'agir.

Examiner l'état Git, la branche, les derniers commits et le code existant avec ses tests. Préserver les modifications présentes. Ne jamais développer directement sur `main`, forcer un push ou fusionner sans autorisation. Une demande courte doit être ramenée à une petite fonctionnalité dans le périmètre concerné.

## Périmètre et décisions

Le socle initial ne comporte aucun code métier. Pendant l'initialisation, ne pas installer de dépendances ni de framework. Pour les prochaines fonctionnalités, respecter la stack effectivement validée par Melvin ; ne pas considérer NestJS/Prisma/PostgreSQL comme approuvés.

Respecter la répartition officielle de `docs/equipe.md`. Toute modification d'un autre module, de `shared`, de `common`, des modèles partagés, migrations, contrats API ou configurations racine nécessite une coordination avec le responsable concerné et Melvin pour les décisions techniques. Kevin coordonne l'intégration. Joel est référent cybersécurité proposé, sans pouvoir d'approbation exclusif.

## Livrer une tranche intégrable

Réutiliser les contrats et conventions existants. Ne pas inventer de règles scolaires, coefficients, seuils, états ou endpoints officiels. Distinguer confirmé, proposé et non décidé dans la documentation. Utiliser uniquement des données fictives pour la démonstration et afficher `DÉMONSTRATION - NON OFFICIEL` sur chaque bulletin.

Exécuter les contrôles disponibles et pertinents, `git diff --check`, puis vérifier les fichiers ajoutés et l'absence de secrets. Signaler explicitement les tests impossibles, les dépendances et les décisions ouvertes. Décrire les changements et les résultats dans la PR ; obtenir au moins une revue humaine d'un autre membre avant fusion.
