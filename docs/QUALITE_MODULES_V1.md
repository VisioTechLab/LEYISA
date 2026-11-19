# Remise en qualité — navigation et modules V1

Suite à la validation explicite de W25 par le responsable projet, la direction sobre du socle est conservée pour l'ensemble de l'application. Cette tranche poursuit le travail sur `fix/v1-quality-recovery`, depuis `e0c49ff3f2bd7f17acec75cfe26629bc1b47e45d`. Les contributions des six membres sont conservées ; aucun remplacement global par l'ancien Desktop.

## Périmètre réalisé

| Module | Changements | Vérification attendue |
| --- | --- | --- |
| Documents W12/W25 | Même lecteur des véritables octets PDF ; recherche serveur par nom/postnom/prénom ou matricule ; matricules dans chaque choix ; dossier conservé entre les deux routes et au rechargement | Cinq PDF réels, égalité aperçu/téléchargement, versions archivées, recherche sans résultat, retour navigateur |
| API bulletins | Refus409 des PDF et émissions sans gabarit adapté ou sans publication de toutes les composantes, y compris accès directs/archives incompatibles | API directe, aucun nouvel enregistrement incompatible, archives conservées, accès d'autrui refusé |
| Navigation | Menu regroupé par modules et filtré par droits ; ouverture explicite sur téléphone ; mémoire limitée à l'utilisateur connecté | Quatre rôles ; bureau1440px, téléphone390/320px ; déconnexion détruit la mémoire |
| Dossiers W08–W11 | Nom complet et matricule ; recherche multi-termes incluant le postnom ; lien de consultation dans la liste ; dossier conservé entre historique et inscription | Création réelle de deux homonymes, recherche, lien portant le bon identifiant, rechargement, nouvelle session |
| Scolarité W03–W05 | Classe/année conservées entre configuration, liste et programme ; maxima présentés par composante, sources séparées | Passage classe→programme→calendrier, contrôles serveur et tableau défilant |
| Enseignement W06–W18 | Contrôles harmonisés, cours et états vides explicites ; évaluation sélectionnée conservée ; matricule dans le libellé de chaque note | Affectations, création d'évaluation, zéro, hors-barème, sauvegarde/rechargement, soumission, rejet/correction |
| Résultats W19–W24 | Contexte conservé ; états d'attente/erreur distincts ; routes détail/rejet/clôture cohérentes ; réponses tardives sans retour forcé ; accès au bulletin du résultat publié | Validation réelle, navigation pendant réponse, confirmation, clôture/publication et PDF du bon dossier |
| Administration/accueils W01/W02/W26/W27 et quatre dashboards | Même typographie, panneaux, formulaires, boutons, tableaux et espacements | Captures et parcours de lecture des quatre rôles ; tests API des permissions existantes |

Aucune règle de calcul, permission, migration ni modèle Prisma n'est modifié. Les23 tables applicatives et la table technique restent présentes avec les six migrations. Le gabarit courant reste DEMO-V1.6. Primaire P1 reste **non pris en charge** : la correction empêche sa production ; elle n'invente pas un modèle ni des pondérations.

## Choix de navigation et sécurité

Les sélections sont gardées en mémoire dans `WorkspaceStateProvider`, monté sous l'utilisateur authentifié et détruit à la déconnexion. Aucun jeton, dossier ou PDF n'est écrit dans localStorage/sessionStorage. Les liens de dossier et de résultat portent uniquement leur identifiant ; l'API refait systématiquement les contrôles d'accès. Une recherche vide ne change pas silencieusement le dossier affiché. Le résultat choisi reste distingué par son matricule, même lorsque les noms sont identiques.

La recherche des bulletins filtre les identités **figées** ; elle ne remplace pas les noms historiques par ceux d'un dossier modifié. L'API retourne au plus500 résultats et l'interface le signale. Une recherche serveur permet de retrouver un nom/matricule au-delà de cette première sélection. Les noms sont recherchés sans distinction de casse ; les accents restent significatifs côté PostgreSQL. La liste des dossiers reste paginée à50 par l'API existante.

Les PDF historiques ne sont ni supprimés ni réécrits. Une archive incompatible ou incomplètement publiée reste enregistrée mais son téléchargement est refusé. Les archives compatibles V1.2–V1.5 restent disponibles ; le contrôle de non-régression compare les octets de l'archive de repêchage V1.5 avant/après émission V1.6 sur la même base locale.

## Défauts rencontrés pendant la recette

- La sélection répétée d'une même période vidait la file sans déclencher de rechargement. Le choix identique est désormais sans effet ; même protection pour une évaluation ou classe-période déjà choisie.
- Une réponse tardive d'approbation/rejet pouvait ramener vers la file après un changement d'écran. Les requêtes et mutations vérifient désormais que la vue est toujours active avant toute navigation ; la soumission décidée reste historisée par le serveur.
- La consultation automatique de résultats d'une période ouverte pouvait afficher une erreur409 peu utile. L'interface explique cet état et mène à la prévisualisation ; elle ne propose pas de résultats figés inexistants.
- Deux défauts du harnais ont été corrigés : filtre Playwright `current` non pris en charge (remplacé par `aria-current`) et attente de la résolution de session avant de changer de compte. Ces premiers essais ne sont pas comptés comme réussis.

## Preuves et limites de la recette

Les captures avant sont dans [preuves-quality-modules/avant](preuves-quality-modules/avant/), les captures après et parcours réels dans [preuves-quality-modules/apres](preuves-quality-modules/apres/). Les31 vues d'origine sont couvertes par les quatre dashboards et W01–W27. Les captures de lecture sont complétées par les états métier W16–W25 joués sur des cours et élèves fictifs, et par les états erreur/attente isolés des tests du lecteur PDF. Les comparaisons avant/après portent sur l'organisation ; les bases de recette sont distinctes, donc les identifiants, dates d'émission et choix par défaut peuvent différer.

Les essais utilisent PostgreSQL18 locale sur127.0.0.1:55433, Node24 et Chromium. Une nouvelle base est migrée et seedée avec les scripts réels, puis les tests tournent avec un rôle runtime sans DDL. Aucun test ni changement n'est exécuté sur Neon ou les déploiements actuels.

Le code vérifié est `d5bb92974c25355695e113c711457b2436057c5c`. Résultats locaux :79 tests backend,39 contrôles DB, une suite complète de25 tests navigateur puis1 cas complémentaire et4 recaptures de modules réussis. Sept PDF contrôlés à220ppp ; cinq téléchargements identiques aux preuves API. Voir [le contre-audit](AUDIT_MODULES_QUALITE_V1.md) et [les31 captures avant/après](preuves-quality-modules/README.md). La CI distante est suivie après le push et sa conclusion figure dans le compte rendu final. Aucun résultat attendu n'est assimilé à une exécution réussie. Les preuves du premier écran approuvé restent dans `preuves-quality-recovery` et ne sont pas remplacées.

## CI et autorisations

Le workflow `.github/workflows/v1.yml` inclut désormais cette branche. Il installe Chromium, démarre les deux serveurs locaux contre PostgreSQL éphémère, lance Playwright après la recette backend et conserve les preuves synthétiques. Les mots de passe aléatoires du seed restent dans un fichier privé hors artefacts. Traces et vidéos de connexion désactivées ; pas de secret de production nécessaire.

La sauvegarde GitHub reste autorisée. La configuration Vercel de cette branche conserve `deploymentEnabled=false` ; Render reste en déploiement automatique désactivé. Aucune fusion, déploiement ou mutation Neon n'est autorisé. Les changements de contrats et de composants communs sont préparés pour revue MOC avec les responsables ; aucune approbation d'un autre développeur n'est inventée.
