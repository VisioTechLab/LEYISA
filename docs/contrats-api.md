# Contrats API

## Confirmé

Aucun endpoint, DTO, modèle de données ou protocole d'authentification n'est encore défini. Les frontières des modules et leurs responsables figurent dans [architecture](architecture.md) et [équipe](equipe.md). Les contrats partagés évoluent uniquement après coordination.

## Proposition de dépendances à préciser

| Producteur | Consommateur | Besoin à contractualiser |
|---|---|---|
| Sidonie / auth | Tous | Identité, droits, contrôles sensibles |
| Jonathan / school | students, assignments, evaluations, results | Année, période, classe et matière |
| Franck / students | assignments, evaluations, results, bulletins | Élève et inscription |
| Kevin / assignments | evaluations | Enseignant et affectation |
| Joel / evaluations | results | Évaluations, notes et soumissions |
| Melvin / results | bulletins | Résultats validés et état de clôture |

Ce tableau décrit les échanges envisagés, sans fixer de schéma ni d'endpoint.

## Non décidé

Format des identifiants, versionnement API, URLs, authentification, DTO, erreurs, pagination, états, règles de validation, dates et gestion des changements incompatibles.

## Format d'un contrat à ajouter

Documenter : statut (proposé/confirmé), producteurs et consommateurs, accord des responsables, opération, entrées/sorties avec exemples fictifs, autorisations, erreurs, règles métier référencées, cas de test et conséquences de migration. Les exemples doivent être marqués proposés tant que l'accord n'est pas enregistré.

Découper les contrats par tranche du parcours et les convenir avant les développements dépendants. Ne pas compenser un contrat absent par une implémentation fictive d'un autre module.
