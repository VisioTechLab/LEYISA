# LEYISA
LEYISA_SCHOOL


## Leyisa School V1 — Visio Tech

Socle collaboratif pour la démonstration d'une application destinée à un seul établissement scolaire, à réaliser en cinq jours. La branche de la base de données fournit le socle PostgreSQL et Prisma pour le parcours de démonstration.

- Architecture : monolithe modulaire ; frontend prévu en React, Vite et TypeScript.
- Base de données : PostgreSQL et Prisma. L’intégration au backend applicatif et la validation technique restent à coordonner avec Melvin.
- Intégration : connexion → configuration scolaire → inscription → affectation → évaluation → notes → validation → résultats → bulletin PDF.
- Chaque bulletin de démonstration doit porter **DÉMONSTRATION - NON OFFICIEL**.

## Commencer

Le [guide du socle commun](docs/integration-v1.md#contributions-reprises-dans-le-socle) indique où retrouver les contributions de l’équipe et leurs commits d’origine.

1. Lire [les responsabilités](docs/equipe.md), [les règles communes](docs/regles-communes.md) et [le workflow Git](docs/workflow-git.md).
2. Consulter [AGENTS.md](AGENTS.md) et le Skill de votre rôle dans `.agents/skills/`.
3. Choisir une petite tranche du [parcours de démonstration](docs/parcours-demo.md), vérifier [les contrats](docs/contrats-api.md), puis créer une branche de fonctionnalité.
4. Suivre le [guide du backend](docs/backend.md) pour démarrer NestJS avec PostgreSQL local ou Neon. Le [guide Neon](docs/connexion-neon.md) explique comment préparer les accès individuels.

## Organisation

`frontend/src/features/` et `backend/src/modules/` contiennent les mêmes domaines : `auth`, `school`, `students`, `assignments`, `evaluations`, `results`, `bulletins`. Les espaces `frontend/src/shared/` et `backend/src/common/` sont partagés et nécessitent une coordination. Les `.gitkeep` conservent uniquement les dossiers réservés.

Voir [architecture](docs/architecture.md), [règles métier](docs/regles-metier.md) et [décisions API](docs/contrats-api.md). La répartition officielle figure dans [équipe](docs/equipe.md).

## Utiliser les Skills

Les six Skills sont livrés dans `.agents/skills/leyisa-<prenom>/SKILL.md`. Leur découverte et leur invocation dépendent de l'assistant utilisé : vérifier les mécanismes de votre environnement, installer ou enregistrer le dossier du Skill si nécessaire. Dans un outil compatible avec cette syntaxe, invoquer explicitement `$leyisa-jonathan`, par exemple. Sinon demander à l'assistant de lire le fichier du rôle avant la tâche. Un Skill n'est pas garanti d'être exécuté automatiquement dans tous les outils IA. Les chemins cités par les Skills sont relatifs à la racine du dépôt.

## Contrôles et GitHub

La CI `Contrôle du socle` vérifie les espaces en fin de ligne et la validité des changements Git. Elle ne compile pas d'application et ne teste aucune règle métier. Les vérifications applicatives seront ajoutées avec la stack et le code réels.

CODEOWNERS contient uniquement des exemples commentés : les identifiants GitHub des six membres restent à renseigner. Les règles effectives de protection se vérifient dans GitHub ; consulter [workflow Git](docs/workflow-git.md).
