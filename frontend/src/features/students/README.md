# Livrable du jour — Élèves et inscriptions

**Date : 23 octobre 2026**

## Objectif

Créer un écran frontend fonctionnel qui affiche simultanément la liste de trois élèves fictifs de 6e A et un formulaire permettant de créer le dossier et de simuler l'inscription d'un nouvel élève. La mise en page reprend la logique visuelle de la maquette `02-eleves-inscriptions.png`, sans remplacer le formulaire de création demandé dans le livrable quotidien.

## Fonctionnalités réalisées

- Affichage des trois élèves d'exemple en 6e A, avec identifiant, nom, postnom, prénom, date de naissance et sexe.
- Recherche de la liste par nom ou matricule.
- Formulaire avec nom, postnom, prénom, date de naissance, sexe et classe fixée à 6e A.
- Validation des champs obligatoires, messages de succès et d'erreur, et prévention des doubles soumissions.
- Ajout simulé d'un élève dans la liste après soumission réussie.
- Mise en page responsive avec navigation latérale sur grand écran et présentation adaptée au téléphone.
- Séparation des types et de l'accès aux données de l'interface React.

## Mode de démonstration et données

La source de démonstration est implémentée dans `demoStudentsDataSource.ts` et sélectionnée par `studentsDataSource.ts`. Elle n'est chargée que lorsque Vite fonctionne en mode développement. Les noms des élèves initiaux sont fictifs. Les ajouts sont conservés uniquement dans l'état en mémoire de l'application : ils disparaissent au rechargement et ne sont jamais enregistrés dans PostgreSQL.

Dans le build de production, le mode fictif est désactivé. L'écran n'affiche pas d'élèves de démonstration et le formulaire est indisponible tant qu'une source API réelle n'a pas été implémentée.

## Organisation des fichiers

- `StudentsPage.tsx` : écran, états de chargement, recherche et soumission du formulaire.
- `students.css` : styles, dispositions responsive et états visuels.
- `types.ts` : modèles frontend `Student`, `NewStudent` et interface `StudentsDataSource`.
- `studentsDataSource.ts` : sélection de la source adaptée à l'environnement.
- `demoStudentsDataSource.ts` : données et opérations simulées en mémoire.

## Lancer l'application

Depuis le dossier `frontend` :

```sh
npm install
npm run dev
```

Ouvrir l'adresse locale affichée par Vite, généralement `http://localhost:5173`.

## Vérifications effectuées

- `npm run build` : réussi (TypeScript et build de production).
- `npm audit` : aucune vulnérabilité signalée.
- Test dans le navigateur : les trois élèves apparaissent, le formulaire est visible, un nouvel élève est ajouté après soumission, et deux soumissions rapides ne créent qu'un seul élève.
- Après rechargement, la liste revient aux trois élèves initiaux, conformément au stockage en mémoire.

Ces vérifications navigateur ont été effectuées manuellement ; aucun test automatisé dédié n'est configuré pour ce module.

## Limites et suite nécessaire

Le dépôt ne fournit pas encore de contrat API officiel pour les élèves et inscriptions. Aucune route, structure de requête ou réponse n'a donc été inventée. Le branchement réel nécessitera le contrat validé, puis une implémentation de la source API respectant ce contrat. Tout changement backend reste soumis à l'accord préalable de son responsable.
