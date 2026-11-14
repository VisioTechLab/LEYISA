# Élèves et inscriptions

L’écran existant utilise maintenant l’API NestJS par défaut. Il charge les élèves et les classes/années existantes, puis envoie la création du dossier et de l’inscription dans une seule requête.

## API utilisée

- `GET /students` : liste des élèves avec leur inscription la plus récente.
- `GET /students/registration-options` : années scolaires et classes existantes, avec leurs IDs.
- `POST /students` : crée l’élève et l’inscription dans une transaction.

Les trois routes exigent un jeton Bearer correspondant à une session staff active. La règle provisoire du guard accepte les rôles `ADM` et `SEC`. Le frontend lit le jeton dans `sessionStorage` sous `leyisa.sessionToken`; définir `VITE_SESSION_STORAGE_KEY` si le module auth utilise une autre clé.

En développement, Vite relaie `/api` vers NestJS sur `http://localhost:3000`. Pour un déploiement, définir `VITE_STUDENTS_API_URL` vers le préfixe API servi par le reverse proxy.

Le mode fictif est désactivé par défaut. Pour le développement UI seulement, le sélectionner explicitement avec `VITE_STUDENTS_DEMO=true`; il n’est pas inclus dans un build de production.

## Champs stockés

Le formulaire envoie les champs présents dans le schéma existant : nom, prénom, matricule, date de naissance, classe et année scolaire. Le schéma ne stocke ni postnom ni sexe; ces champs ne sont pas envoyés. Aucune table ni migration n’est ajoutée.
