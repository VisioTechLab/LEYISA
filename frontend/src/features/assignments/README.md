# Enseignants et affectations — premier écran

Responsable : Kevin. Écran basé sur le wireframe « 03, Enseignants et affectations » de LEYISA SCHOOL V1.

Le composant `AssignmentsPage` présente deux enseignants fictifs, deux matières et une classe `6e A`. L'ajout est **simulé uniquement en mémoire** ; une matière déjà affectée à cette classe ne peut pas être ajoutée une deuxième fois dans cette démonstration.

- Fichiers : `AssignmentsPage.tsx` et `assignments.css`.
- Aucun backend, base de données, modèle partagé ou module d'un autre membre modifié.
- À intégrer dans le routeur React **après coordination** avec le responsable du frontend commun. Import : `import { AssignmentsPage } from './features/assignments/AssignmentsPage';` (adapter le chemin).
- Cette interface ne fournit pas de contrôle d'accès effectif. Les véritables permissions devront être validées et appliquées côté backend.
- Les classes, les matières et les enseignants proviendront ultérieurement des contrats officiels de Jonathan et Sidonie.
- Sans `package.json` ni framework installé dans la branche GitHub observée, le build et les tests navigateur de ce composant ne peuvent pas être exécutés ici.
