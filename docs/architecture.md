# Architecture

## Confirmé

Application pour un seul établissement, organisée en monolithe modulaire. Frontend prévu avec React, Vite et TypeScript. Organisation miroir des domaines entre `frontend/src/features/` et `backend/src/modules/` : auth, school, students, assignments, evaluations, results et bulletins.

`frontend/src/shared/` reçoit les éléments réutilisables après coordination. `backend/src/common/` reçoit les mécanismes transversaux après coordination. Aucun framework ni code fictif n'est ajouté pour occuper ces espaces.

## Proposition à valider par Melvin

NestJS, TypeScript, Prisma et PostgreSQL pour le backend. Ne pas installer NestJS, Symfony, un ORM ou des dépendances tant que le choix n'est pas validé. `package.json`, le schéma de données, les migrations et Docker Compose applicatif seront créés une fois la stack confirmée. Kevin coordonne ensuite leur intégration.

## Frontières

Auth fournit identité et droits ; school fournit la configuration ; students gère les inscriptions ; assignments relie les enseignants à la configuration ; evaluations recueille les notes et soumissions ; results porte validation, calcul et clôture ; bulletins produit les PDF à partir des résultats validés selon le contrat décidé.

Ces frontières ne fixent ni modèle de données ni contrat réseau. Les dépendances utilisent des contrats explicites, convenus avec leurs responsables. Melvin arbitre la cohérence architecturale. Voir [équipe](equipe.md) et [contrats API](contrats-api.md).
