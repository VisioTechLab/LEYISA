# Identité visuelle et vérification de la recette LEYISA — 20 novembre 2026

État conservé avant publication. La version validée a ensuite été publiée avec accord du responsable : voir le [compte rendu de déploiement](DEPLOIEMENT_RECETTE_2026_11_20.md).

## Périmètre autorisé

Travail sur `fix/v1-quality-recovery`, à partir de `c0fda69`. Le responsable a précisé qu’il souhaite l’identité visuelle des 31 wireframes, les espaces courts par rôle, et le lecteur/téléchargement PDF corrigés de la DEMO avec les données réelles LEYISA. Les routes détaillées de la maquette ne sont donc pas réintroduites dans le menu. Les données de la maquette ne constituent ni des fixtures de production ni des règles pédagogiques.

Référence : `LEYISA_31_Wireframes_Corriges_Visualisation.pdf`, 31 pages, et son HTML source fourni. Palette `#344f63`, fond `#f6f8f8`, en-tête transversal de 61px, menu 218px, panneaux 5px, titres 22px, tableaux à en-tête bleu pâle. Le logo de l’établissement est conservé. Le contraste du texte secondaire est renforcé par rapport à la maquette. Les formulaires secondaires restent ouverts à la demande. La mise en page du lecteur PDF conserve ses contrôles existants.

## Changements intégrables

- En-tête commun, fil d’Ariane, identité du rôle actif et repère de vue W01–W27.
- Quatre tableaux de bord : indicateurs réseau, accès rapides et vue d’ensemble tabulaire. Aucun compteur fictif ajouté.
- Typographie, panneaux, tableaux, formulaires, boutons et espacements partagés, adaptation mobile conservée.
- `VITE_LEYISA_CONTEXT=recette` affiche « Recette privée ». Cette variable ne choisit pas la base et n’accorde aucun droit. Le backend Render reste responsable de sa connexion Neon.
- Protections des commits `67af02a` et `ca2d348` reprises : libellé privé configurable, refus de clôture/publication sur une base non locale sans décision explicite. Aucun changement de permissions, de schéma ou de migrations. Le scénario local isolé conserve son parcours complet ; une valeur explicite `false` bloque aussi les écritures locales de résultats.
- Le guide public `MISE_EN_SERVICE_DEMO_V1_5.md` de la branche de recette est préservé. Cette branche n’a été ni réécrite ni remplacée.

## Constat hébergé, en lecture seule

| Élément | Constat vérifié |
| --- | --- |
| Vercel `leyisa-school-recette` | Déploiement `dpl_CChJMs9kHaK8ZLwG21TnhzxvB7nG`, READY, branche `release/leyisa-production-candidate`, SHA `ca2d348a769ce75e8216a04aa4b98e72dbcc20bd` ; protection privée conservée. |
| Render `leyisa-production-api` | Service `srv-dbvqc3mi0phs73aqsin0`, déploiement LIVE au même SHA ; `/health` renvoie200 et `{"status":"ok"}`. Aucun seed/migration au démarrage déclaré. Healthcheck HTTP non configuré dans la fiche du service : le contrôle ci-dessus est manuel. |
| Neon | Projet `gentle-math-59421236`, branche `production-candidate` / `br-old-sea-b9c275au`, base `neondb` :93 élèves,23 classes,108 utilisateurs,6 migrations ; les six empreintes SHA256 correspondent exactement aux fichiers SQL du dépôt, toutes terminées et non annulées. |
| Comptes recette | ADM/SEC/ENS/DIR existent, actifs, possèdent une empreinte de mot de passe et chacun le rôle attendu. Aucun mot de passe modifié. |
| Rôle SQL `leyisa_prod_runtime` | Sans superuser/CREATEDB/CREATEROLE ; pas de CREATE sur `public`, pas de SELECT sur `_prisma_migrations`, pas de DELETE sur `AuditEntry`, aucun objet public possédé. SELECT sur User/Student accordé. L’usage effectif de ce rôle par le processus Render n’est pas établi par ce seul contrôle. |
| Session SEC ouverte par le responsable | `/api/v1/auth/me` confirme SEC ; `/students?pagination=1` renvoie un ancien tableau de50 entrées sans total ; `/students?page=2` renvoie43 autres entrées ; `/school/bootstrap` donne23 classes (22 pour2026–2027,1 pour2025–2026). |
| Écran SEC hébergé |50 lignes affichées, aucune alerte ; accueil indique50 dossiers/51 inscriptions associées/0 bulletin. Les43 autres élèves existent mais cette ancienne interface ne propose pas leur page. |
| Bulletins | API authentifiée :0. Neon :3 snapshots et3 ReportCard, mais0 période publiée. Le filtre `classPeriod.publishedAt != null` explique leur indisponibilité. Aucune publication forcée ni document inventé. |
| Enseignement |11 enseignants,3 affectations,3 évaluations,9 notes ; session ENS contrôlée en API :1 affectation,1 évaluation,3 élèves accessibles. Aucune modification de ces données. |
| Direction |Session DIR confirmée par `/auth/me`,0 soumission en attente et22 contextes classe/période accessibles. |
| Administration |Session ADM confirmée,15 comptes STAFF dans `/users`,23 classes dans le bootstrap et44 événements d’audit lors du contrôle. Le total108 inclut aussi les comptes élèves ; il ne faut pas le comparer au catalogue STAFF. |

Le rapport initial disant « comptes non actifs / backend encore en déploiement » était dépassé. Le problème de visibilité des43 élèves et l’ancien menu sont reproduits sur l’ancienne révision hébergée. La pagination explicite et le total sont déjà corrigés dans `2597128`, présent sur notre branche, absent de la révision de recette. Les contrats restent compatibles avec les consommateurs anciens (tableau sans `pagination=1`).

Les compteurs et années reçus par la session correspondent à la branche LEYISA auditée et diffèrent de ceux de la DEMO. Cette concordance ne remplace pas une inspection ciblée du DATABASE_URL de Render : aucune URL secrète n’a été exportée.

## Changement de session entre onglets

Défaut confirmé sur la révision hébergée : des onglets ouverts successivement sur SEC/ENS/ADM conservaient leurs anciens menus, alors que `/auth/me` identifiait DIR dans tous les onglets, car le cookie était partagé. Les quatre rôles ont ensuite été vérifiés séquentiellement avec la coopération du responsable.

Correctif : notification `BroadcastChannel` sans identifiant ni jeton après connexion/déconnexion, relecture serveur, actualisation au retour dans la fenêtre, abandon des réponses périmées et de l’espace du compte précédent. Une reprise de fenêtre avec le même utilisateur ne démonte pas le dossier/PDF sélectionné. Le test multi-onglets vérifie déconnexion, nouveau menu ENS et session serveur correspondante. Les contrôles RBAC/ABAC restent côté backend.

## Vérifications réellement exécutées

- Build backend Prisma/TypeScript réussi, sans migration.
- Build frontend TypeScript/Vite réussi, dont un build avec `VITE_LEYISA_CONTEXT=recette` ; lint réussi.
-57 tests backend ciblés,0 échec,0 ignoré : accès, rôle actif, proxy, CSRF, élèves, calculs existants, PDF et deux tests du verrou de livraison.
-36 tests Playwright réussis dans la suite complète : quatre comptes locaux distincts, multirôle,31 vues, tailles390/320px, sélection conservée, pagination, réponses tardives, rejet/correction, clôture/publication sur base locale fictive et cinq modèles PDF. Comparaison des octets aperçu/téléchargement, archive et PDF multipage comprises.
-31 captures réelles actualisées,0 erreur JavaScript,0 débordement de page dans le rapport de capture. Inspection des31 vues en quatre planches puis vues individuelles. Le tableau de bord a été corrigé après un débordement interne de son tableau.
- Après le dernier durcissement du masquage pendant une relecture de session, quatre tests ciblés passent également (W12, multirôle, changement de compte, serveur indisponible après changement). Cela couvre37 cas distincts ; le dernier test ne fait pas partie du journal de suite complète36.
- Le premier lancement Playwright avait33 succès et2 erreurs de harnais : PDF long absent et identifiants techniques manquants dans le fichier local reconstitué après redémarrage. Ces prérequis ont été rétablis ; la suite complète suivante passe35/35.

Captures et journaux : [preuves](preuves-identite-wireframes/README.md). Données synthétiques locales exclusivement dans Git. Les compteurs locaux évoluent avec les tests et ne représentent pas les93 élèves réels.

## Contre-audit Senior Code Auditor

Modes `FIX_APPROVED` et `VERIFY_FIX`. Pas de certification générale ni de validation pédagogique implicite.

| Domaine | Couverture et limite |
| --- | --- |
| Métier | Parcours local complet et protections de recette contrôlés ; publication réelle suspendue, règles officielles toujours à valider. |
| Architecture | Thème et en-tête partagés ; appels API existants conservés ; aucun nouveau framework ni source statique. |
| Frontend |31 vues, navigation par rôle, mobile et erreurs vérifiés ; références visuelles appliquées à l’identité, pas aux données fictives du PDF. |
| Backend |57 tests ciblés ; nouveau verrou partagé testé avant toute transaction ; autorisations existantes conservées. |
| Données | Agrégats Neon et droits SQL en SELECT uniquement ; aucune migration/seed/write scolaire sur Neon. |
| Sécurité | Aucun secret ou nom d’élève réel dans les preuves publiques. Fichier privé d’identifiants exclu de Git. Protection Vercel maintenue. Le navigateur a refusé l’ouverture du fichier local par URL ; la session SEC a ensuite été ouverte par le responsable, sans contournement. |
| Tests |Suite complète36 tests Playwright, puis4 tests ciblés après durcissement, et57 tests backend sur environnement local isolé ; aucune suite d’écriture exécutée contre la recette hébergée. |
| DevOps |Deux SHA hébergés cohérents et santé backend vérifiée ; CI Playwright déjà intégrée. Aucun nouveau déploiement déclenché. Révision hébergée à faire avancer seulement après validation. |

**Verdict local : validé sous réserves**, pour la reprise visuelle et les régressions couvertes. **Recette hébergée : vérification insuffisante pour une livraison scolaire**, puisque le code corrigé n’est pas déployé, les quatre comptes ont été contrôlés mais aucun bulletin réel publié n’est disponible. L’absence de résultat publié est un état métier confirmé, pas une raison d’inventer des notes ou de désactiver les protections.

## Mise à disposition après validation

Présenter les captures avant publication. Conserver `main`, la DEMO et toutes les migrations. Après accord du responsable : intégrer la révision de travail dans la branche dédiée de recette en préservant ses changements ; construire Vercel avec `VITE_LEYISA_CONTEXT=recette` ; déployer le même SHA sur les deux services de recette. Conserver le refus de clôture/publication et les protections d’accès. Aucun changement de DATABASE_URL, aucun seed, aucune migration ni réinitialisation de compte n’est nécessaire pour le correctif visuel et de pagination. Refaire ensuite le contrôle authentifié des quatre rôles et des pages50+43 avant de conclure.
