# Publication de la recette privée — 20 novembre 2026

Publication autorisée par le responsable après présentation du rendu et du commit `e3bd877` (« vas y ! »). Ce compte rendu complète l’[audit avant publication](IDENTITE_WIREFRAMES_ET_RECETTE_LEYISA.md).

## Révision et services

- Révision applicative commune : `abc8b1cec3a878610ccff83d48b35f3dd9825962`.
- Intégration de l’historique `release/leyisa-production-candidate` dans `fix/v1-quality-recovery` par fusion, puis avance rapide de la branche de recette. Les deux conflits App/results conservent le code validé qui reprend déjà les protections de `67af02a` et `ca2d348`. Comparaison après fusion : aucun changement hors documentation par rapport à `e3bd877`.
- Frontend : [leyisa-school-recette.vercel.app](https://leyisa-school-recette.vercel.app/), projet `prj_aRQM755BRIYExBAeA1YAfg4LAnB5`, déploiement `dpl_8GmSSveZMrFeQDEcxmLP6BLfUQCi`, **READY**, domaine principal affecté, aucune erreur d’alias.
- Backend : `leyisa-production-api`, service `srv-dbvqc3mi0phs73aqsin0`, déploiement `dep-dc0380dg1s2s73e1sfsg`, **LIVE**. Déploiement manuel du SHA exact, avant la publication du frontend. Contrôle `/health` : HTTP200, `{"status":"ok"}`.

## Configuration conservée ou corrigée

- Vercel suivait `main` : le suivi de production du seul projet de recette est désormais `release/leyisa-production-candidate`. Réglage relu après rechargement de la page d’administration.
- Node24 aligné sur les moteurs et tests du dépôt.
- `VITE_LEYISA_CONTEXT=recette` ajouté uniquement au projet de recette (Production/Preview). Aucun secret exporté ou changé ; aucune modification du relais Render ni de son DATABASE_URL.
- Protection Vercel Authentication **All Deployments** maintenue. Une requête sans session suit la redirection vers `vercel.com/login` ; son code final200 correspond à cette page de connexion, pas à une ouverture publique de l’application.
- Accès direct à `/api/v1/auth/csrf` sur le domaine Render : HTTP403 sans le relais autorisé. `/health` reste volontairement public et ne renvoie qu’un statut.
- Auto-déploiement Render conservé désactivé. Aucun changement de plan ou de capacité.
- Clôture/publication sur base partagée toujours bloquées par défaut tant que les règles pédagogiques ne sont pas validées.

## Tests et contrôles

[GitHub Actions — validation du commit exact](https://github.com/VisioTechLab/LEYISA/actions/runs/44730039014) : application et sauvegarde/restauration Git réussies. **87 tests backend réussis,0 ignoré,0 échec ;37 tests Playwright réussis**. Builds, lint, vérifications PDF/A4 et contrôles de livraison inclus. Les migrations et seeds de cette CI concernent exclusivement son PostgreSQL éphémère, jamais Neon.

Après publication, la session ADM existante est reconnue sans réinitialisation. Le nouveau rendu est chargé depuis le domaine principal : menu Accueil / Comptes utilisateurs / Configuration scolaire / Classes et programmes / Audit ; pas de sélecteur de rôle pour ce compte monorôle ; libellé « Recette privée ». Les indicateurs renvoient2 années,23 classes et15 comptes STAFF, sans alerte.

La session SEC est confirmée par `/auth/me`. L’API publiée renvoie maintenant le contrat paginé : total93, page1, pageSize50,50 lignes. Dans le navigateur, passage effectif à la page2 :43 lignes sur93, bouton Suivant désactivé,0 alerte. Recherche par un matricule existant :1 dossier ; effacement de la recherche : retour à50 sur93 en page1. Menu exclusif Accueil / Élèves / Inscriptions / Bulletins. L’écran Bulletins confirme « Aucun bulletin publié »,0 alerte. Aucun nom ou matricule réel n’est conservé dans ces preuves.

Une attente de contrôle utilisait un ancien nom de classe CSS du pied de tableau et a expiré ; la lecture du DOM réel a ensuite confirmé43 lignes et « page2 ». Cette erreur de harnais ne constitue pas une panne de pagination.

La session ENS publiée est confirmée par `/auth/me` :1 cours affecté,1 évaluation rattachée à cette affectation,3 élèves accessibles via le contrat paginé. Menu exclusif Accueil / Mes classes et cours / Mes évaluations / Mes soumissions ; pas de sélecteur de rôle. Les trois modules s’ouvrent avec1 ligne chacun et0 alerte. L’accueil affiche1 cours,1 évaluation et0 correction. L’onglet précédemment en SEC affichait déjà le nouvel espace ENS avant toute navigation de contrôle : le changement de compte entre onglets est bien répercuté.

La session DIR publiée est confirmée par `/auth/me` :0 soumission en attente,22 contextes classe/période. Menu exclusif Accueil / Enseignants et affectations / Validation des notes / Résultats / Bulletins ; pas de sélecteur de rôle. Ouverture réelle des quatre modules sans alerte :11 enseignants, file de validation vide,15 lignes de résultats en première page, écran de bulletins vide cohérent avec0 période publiée. Les22 classes comptées dans l’accueil Direction correspondent aux classes disposant d’un contexte de résultats ; le catalogue scolaire comporte23 classes au total.

**Les quatre comptes sont donc vérifiés après publication**, en sessions successives ouvertes par le responsable. Les API authentifiées et les menus correspondent à leurs responsabilités. Aucune approbation, correction de note, clôture, publication ou émission de bulletin n’a été exécutée pendant cette recette. Les37 parcours Playwright de la CI restent une validation complémentaire sur données synthétiques, distincte de ces contrôles hébergés.

## Données et périmètres préservés

Lecture seule après déploiement sur Neon `gentle-math-59421236` / `production-candidate` / `neondb` : **93 élèves,23 classes,3 évaluations,9 notes,0 période publiée,6 migrations**. Compteurs scolaires inchangés. Aucune migration, aucun seed, aucune réinitialisation de mot de passe ni modification de donnée scolaire sur Neon pendant cette publication.

Le lecteur et le téléchargement PDF restent ceux de la version validée. Aucun bulletin réel n’est actuellement accessible faute de période publiée. Aucun document fictif n’a été ajouté à la base LEYISA pour remplir cet écran.

Périmètres intacts, vérifiés après publication :

- `main` : `7bd4e48cbef4beb4109e54e441431bc41542783d`.
- `demo/leyisa-v1` : `7783483d59e5f64f5d7e9e54ecb609a28be4e9a3`.
- Frontend DEMO : `dpl_FKhHshwNqQPfT9HRkBjLgMtBUamm`.
- Backend DEMO : `dep-dbvpbh17lnhs73bo1l30`, toujours au SHA `c0fda69`.

## Sauvegarde et retour

Le bundle de la révision publiée a été créé et vérifié localement : `LEYISA-quality-evidence/LEYISA-recette-abc8b1c.bundle`. La CI conserve également son bundle et la preuve de restauration. Les captures publiques et journaux de tests utilisent uniquement des données synthétiques.

Révision précédente disponible : `ca2d348a769ce75e8216a04aa4b98e72dbcc20bd`, frontend `dpl_CChJMs9kHaK8ZLwG21TnhzxvB7nG`, backend `dep-dbvqcjmjbj6c73bokia0`. Un éventuel retour doit porter sur les deux services de recette compatibles avec le schéma actuel ; aucune restauration de données n’a été exécutée.
