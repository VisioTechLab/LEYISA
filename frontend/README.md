# LEYISA SCHOOL — Frontend

## Démarrer en développement

```sh
npm install
npm run dev
```

Créer la version de production avec `npm run build`.

## Module Élèves et inscriptions

En développement, le module utilise une source de démonstration en mémoire. Il affiche trois élèves fictifs en 6e A, permet de rechercher dans la liste et de créer puis inscrire un nouvel élève avec son nom, postnom, prénom, date de naissance et sexe. Les ajouts simulés disparaissent au rechargement. La source fictive n’est chargée que lorsque Vite est en mode développement (`import.meta.env.DEV`).

En production, le mode fictif est désactivé et le module n’affiche aucune donnée d’exemple. Le mode API reste à intégrer après ajout et validation du contrat officiel dans `docs/contrats-api.md`; aucune route ni structure de requête/réponse n’est supposée ici.
