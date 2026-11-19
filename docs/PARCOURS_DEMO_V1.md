# Parcours de démonstration V1

Tous les noms sont fictifs. Marque DEMO-V1, maxima et décisions de démonstration explicitement proposés. Aucun accès élève activé et aucune décision réglementaire certifiée.

## Environnement local vérifié

Recette sur integration/leyisa-v1-cloud, Node 24.22.1 et PostgreSQL 18.7 sur le port local 55432. Le backend écoute sur 53100 et Vite sur 5173. Suivre le [README](../README.md) pour préparer une base neuve.

Les identifiants aléatoires des comptes adm, sec, dir, ens-demo-live-1 et ens-demo-live-2 sont écrits dans le fichier privé désigné par LEYISA_DEMO_CREDENTIALS_FILE. Les identifiants restent hors du dépôt et des preuves.

Démarrage du backend (depuis backend, avec runtime local déjà attribué) :

```bash
export LEYISA_DB_MODE=local
export DATABASE_URL=postgresql://leyisa_v1_app@127.0.0.1:55432/leyisa_v1_release
HOST=127.0.0.1 PORT=53100 APP_ORIGINS=http://127.0.0.1:5173 npm start
```

Frontend : `LEYISA_API_TARGET=http://127.0.0.1:53100 npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Ouvrir l'interface et utiliser Connexion. Les sessions sont vérifiées par `/auth/me` à chaque rechargement, les rôles proposés sont ceux réellement attribués.

## Scénario à rejouer par rôle

La dernière recette Chromium a ouvert les quatre accueils, consulté la configuration et les affectations, créé un dossier et son inscription puis vérifié le refus du doublon. Elle a enchaîné saisie, rejet, correction, approbation, prévisualisation, clôture, publication et téléchargement. Les tests API et PostgreSQL vérifient les créations de configuration, le cycle des comptes et les conflits d’affectation. Après redémarrage du backend, les données relues et le PDF ont des empreintes identiques. [Parcours exécuté](preuves/browser.json)

Pour une nouvelle présentation, utiliser la classe **DEMO-LIVE — Classe ouverte pour le parcours en direct** de l'année **DEMO-2025-2026**, restée disponible après les tests automatiques. Avant de l'utiliser, confirmer qu'elle est toujours OPEN. Le calendrier démo passé autorise une vraie clôture sans changer l'horloge.

1. ADM : vérifier identité, année et calendrier par cycle ; voir Classes puis Programme (sources/maxima20 pour chacun des deux cours en P1). Montrer Comptes : création STAFF inactive et activation distincte ; droits du compte courant protégés. Pour une configuration nouvelle, créer d'abord année/période/classe/catalogue/programme, avant évaluations.
2. DIR : Fiche enseignant puis Affectations ; lien vers un compte ENS actif, dates comprises dans l'année et fin exclusive. Les cours DEMO-LIVE sont préaffectés à deux enseignants distincts ; une nouvelle affectation en conflit est refusée409. Pas de doublon à recréer.
3. SEC : Nouveau dossier, matricule unique, nom/postnom/prénom/sexe/naissance et champs facultatifs ; Enregistrer le dossier. Inscription annuelle, chercher matricule, sélectionner l'élève puis DEMO-LIVE2025–2026. Recharger Historique pour vérifier persistance.
4. ENS `ens-demo-live-1` : Mes cours→Créer une évaluation, P1, TRAVAIL_JOURNALIER,20, date2025-09-02. Saisir chaque inscrit (zéro accepté, vide distinct,21 refusé), Enregistrer puis recharger. Soumettre→page de confirmation explicite→Confirmer. La version envoyée devient lecture seule.
5. DIR : choisir P1 de DEMO2025–2026, Actualiser la file, Ouvrir ; rejeter avec motif. ENS ouvre Corrections, retrouve motif et historique, corrige puis resoumet. DIR actualise et accepte. Refaire l'évaluation complète du deuxième cours avec `ens-demo-live-2` ; ne pas approuver une soumission de son propre compte multi-rôle.
6. DIR : Prévisualiser, choisir DEMO-LIVE/P1, Vérifier. Toutes les matières et tous les inscrits doivent être complets ; sinon liste des blocages, pas de clôture forcée. Continuer vers clôture→case de confirmation→Confirmer. Les résultats sont CLOSED ; ils ne sont pas encore visibles au secrétariat.
7. DIR : publier par l'action distincte. SEC : Bulletins→sélectionner élève/classe/P1→Générer→Télécharger PDF. Recharger l'interface et redémarrer le backend : inscriptions, notes, statuts et document restent disponibles. ADM : consulter audit et filtres.

## Trois cycles et calculs déjà exécutés

| Exemple publié | Valeur vérifiée | Présentation |
|---|---|---|
| Secondaire annuel, élève fictif | 240/320=75%, deux branches ; chacune P1=15/20,P2=15/20,E1=30/40,S1=60/80, idem S2, TG120/160 | PDF secondaire, neuf colonnes et décision humaine distincte |
| Primaire annuel, élève fictif | 360/480=75%, deux branches ; T1/T2/T3=60/80 chacune, TG180/240 | PDF primaire, trois synthèses explicites DEMO |
| Maternel annuel | Dix attitudes, six périodes QTE/QLT/COUL ; D1/D2/D3 fictifs | Carte sans moyenne ni classement |
| Repêchage secondaire DEMO | Nouveau résultat40/320 après remplacement E2 autorisé ; première session de l'élève faible0/320 inchangée | PDF deuxième session séparé, décisions motivées |

Autres tests discriminants :15/20+30/40=>30/40 ;10/10+0/30=>10/40 ; semestre66/80 ; primaire annuel avec maxima inégaux280/350. Ces profils ne sont pas transférables à une école sans validation.

CTEB7/8 :20 lignes et400 en P1, autres maxima non attestés laissés inconnus, clôture annuelle bloquée. Maternel : légende officielle à confirmer. Les Ovations : règle de compensation ambiguë, aucune péréquation automatique. Ne pas présenter la démo comme homologuée.

Pour reproduire toute la recette automatisée : nouvelle base loopback, migrations, seed explicite, accès runtime, LEYISA_V1_TESTS=1 ; commandes et preuves dans TESTS_V1.md. Ne pas relancer les tests sur les résultats déjà publiés de la présentation.
