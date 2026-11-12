# Règles communes

Nous développons par modules et intégrons par parcours utilisateur. Livrer des fonctionnalités petites, testables et intégrables, sans attendre la fin d'un module. Tous peuvent travailler en parallèle, en respectant les contrats convenus.

Avant de coder : examiner le code et les tests existants, identifier le propriétaire et les dépendances, lire les contrats et vérifier les décisions ouvertes. Toute décision de stack revient à Melvin. Kevin organise les étapes d'intégration.

Coordonner les changements de contrats API, modèles partagés, migrations, shared/common et configurations racine avec les responsables concernés. Décrire l'accord et ses conséquences dans la PR. Ne pas dupliquer un service d'un autre module.

Utiliser des données fictives ; ne versionner aucun secret, mot de passe réel ou dossier d'élève réel. Prévoir les contrôles d'accès des opérations sensibles avec Sidonie et Joel ; leurs modalités restent à définir selon les besoins validés.

Vérifier les tests concernés dès qu'ils existent, la compilation ou les contrôles disponibles, `git diff --check` et l'absence de secrets. Une vérification non exécutable doit être signalée. La CI du socle ne prouve pas le fonctionnement de l'application.

Le compte rendu indique : fichiers et comportement changés, contrats affectés, contrôles exécutés et résultats, limites et prochaine étape d'intégration. Voir [workflow Git](workflow-git.md), [règles métier](regles-metier.md) et [parcours](parcours-demo.md).
