# Reprise qualité — premier écran soumis à validation

Demande du responsable projet : récupérer le travail Desktop, conserver la dernière logique métier, corriger les défauts et présenter un écran fonctionnel avant de généraliser le design. Branche `fix/v1-quality-recovery`, issue de `origin/demo/leyisa-v1` résolue à `7783483d59e5f64f5d7e9e54ecb609a28be4e9a3`. Les autorisations de correction et sauvegarde GitHub sont explicites ; aucune fusion ni mise en ligne n'est autorisée à ce stade.

## Récupération et références

- Dossier Desktop d'origine `LEYISA-integration-v1` conservé avec ses modifications. Les196 fichiers sources ont été copiés et comparés par SHA256 dans un worktree de sauvegarde distinct.
- Sauvegarde GitHub `backup/leyisa-v1-desktop-20261119`, commit `e87dcfa00251df872e5f0e689885b5d5fa6c5ac1`, push et SHA distant vérifiés. Les commits attribués aux développeurs restent ses ancêtres.
- ZIP conservé dans Documents, empreinte `e2491ec6087618e9116a8f5406437ab23a56c3070b3698f663224878d3f14d5f`, archive et manifeste internes vérifiés. Les anciennes captures ont été récupérées sans modifier le ZIP.
- Références distantes vérifiées : socle `85a3d6f`, intégration Cloud `8a50881`, démo et correction bulletins `7783483`. Aucune branche existante remplacée.
- Kit original :43 empreintes vérifiées. Prompt maître et manifeste déjà lus intégralement dans cette conversation ; référentiel Senior Code Auditor réactivé et ressources relues. Les31 wireframes rendus ont été réexaminés, W25 p29 en détail ; matrices RBAC/ABAC/SoD/RACI/MOC et contrats consultés. Aucun référentiel indispensable manquant.
- La conversation établit la préférence pour notre direction initiale. Elle ne fournit pas d'approbation individuelle explicite pour chacun des31 écrans : aucune approbation graphique supplémentaire n'est inventée.

## Comparaison et stratégie retenue

| Domaine | Ancien Desktop | V1.5 distante | Choix de reprise |
|---|---|---|---|
| Graphisme | Logo, palette bleu ardoise/gris clair, navigation latérale, panneaux et formulaires du socle | Même base graphique ; ajout de grilles/tableaux et cadre de connexion différent | Conserver les fondations ; reprendre proportions, hiérarchie et choix du bulletin depuis W25 plutôt que copier des fichiers en bloc |
| Données |23 modèles Prisma et six migrations | Schéma et migrations identiques | Aucun changement de schéma ; vérifier sur PostgreSQL locale |
| Métier et sécurité | Sessions/CSRF, cycles, notes, décisions, résultats figés | Filtrage des inscriptions ENS durci, confirmations, contrôles de publication, relais hébergement | Garder la V1.5 comme base ; conserver les ajouts utiles des six auteurs |
| Bulletins | PDF simples et aperçu HTML séparé | Formulaires versionnés V1.2–V1.5, sources publiées, PDF distinct de l'HTML | Afficher les octets du vrai PDF, conserver les versions ; corriger les données manquantes avec une nouvelle version |

Le nouvel écran est uniquement W25 (`#bulletin`). Le catalogue W12 et les autres écrans restent à reprendre après validation humaine. La largeur du panneau de sélection est réduite pour donner de la place au vrai A4 ; c'est un écart intentionnel aux proportions illustratives du wireframe, à approuver. Palette, logo et shell restent ceux du socle. Aucun élément décoratif ou compteur fictif ajouté.

## Défauts confirmés et corrections

| ID | Nature / impact | Preuve | Traitement de cette tranche |
|---|---|---|---|
| Q01 | Aperçu différent du téléchargement — confirmé statiquement et visuellement | Ancien `WorkspacePages.tsx` reconstruit noms, matières et totaux en HTML ; le lien appelle un PDF versionné séparé | W25 lit une fois le PDF authentifié et le rend avec PDF.js. Télécharger réutilise exactement le même Blob. Cinq modèles comparés octet pour octet |
| Q02 | Primaire P1 sans notes de la période — élevé pour ce document | `primary-bulletin.ts` lit uniquement T1/T2/T3 ; une racine P1 publiée n'a aucune de ces composantes | Contrat expose `documentPeriodSupported` ; W25 explique l'incompatibilité et ne propose pas ce PDF. Choix d'un trimestre publié ou de l'année. Le gabarit primaire P1 et le catalogue historique restent à traiter, sans modifier les anciennes émissions |
| Q03 | Notes et total de repêchage absents du PDF — élevé | Le gabarit V1.5 utilise la première session et ne lit jamais `retakeScores`. Ancien contrôle Python exige même des cellules vides à droite tout en ne contrôlant40 que dans JSON | Gabarit DEMO-V1.6 ajoute un bloc explicite deuxième session : cours autorisés40/40, total40/1520, pourcentage déjà figé. Aucun calcul ajouté au PDF. Moteur V1.5 conservé sous `v15/`, archive restituable avec ses octets antérieurs |
| Q04 | Données comprimées et sélection ambiguë — impact ergonomique confirmé | Sélecteur unique élève/classe/période, panneau de document étroit | Sélection année/classe/période/élève, informations de dossier séparées, lecteur avec zoom et pagination, version archivée explicite |

L'API `GET /bulletins` ajoute année, postnom, matricule et cycle issus de l'identité figée, sans élargir RBAC/ABAC. `GET /bulletins/:id` ajoute `publicationComplete` et `documentPeriodSupported`. Ajouts rétrocompatibles, à revoir selon MOC M02 avec Melvin et Jonathan. Permissions, sessions, calculs,23 modèles et six migrations inchangés. Le gabarit V1.6 est une version documentaire de cette branche, pas un déploiement de l'application.

## Recette et preuves

PostgreSQL18.6 locale sur loopback55433, bases séparées `leyisa_quality_recovery` (démonstration) et `leyisa_quality_verification` (suite finale). Compte runtime limité, identités fictives, Node24.22.3, Chrome local. Les journaux de cette tranche sont dans [preuves-quality-recovery](preuves-quality-recovery/).

Commandes : `npm run build` dans backend/frontend, `npm run lint` frontend ; `LEYISA_V1_TESTS=1 node --test test/*.test.mjs` backend sur base neuve migrée/seedée ; `npm run db:verify` ; `npm run test:e2e` frontend avec variables de recette ; `backend/scripts/verify-bulletin-pdfs.py` sur les PDF du workflow. Les journaux finaux font foi pour les nombres et résultats, pas les chiffres des rapports Cloud antérieurs.

Variables frontend : `LEYISA_E2E_CREDENTIALS` fichier privé du seed ; `LEYISA_E2E_ORIGIN=http://127.0.0.1:5176` ; `LEYISA_E2E_PAGINATED` PDF long produit par la suite backend. Les tests refusent une origine distante et ne conservent ni trace réseau ni vidéo de connexion. Les refus403, conflit409, liste vide et attente sont injectés uniquement dans les tests de présentation ; les cinq téléchargements principaux et l'émission utilisent la vraie API locale.

Le contrôle PDF examine valeurs et positions, zéros, N/A, identités, rubriques, périodes, publication et pagination. Les cinq PDF téléchargés en Chrome sont comparés à ceux du contrôle spatial. L'ancien PDF de repêchage V1.5 est conservé comme preuve du défaut et de l'archive, pas présenté comme un document corrigé.

## Préparation de revue

La source Vercel de cette branche désactive son propre déclenchement Git (`git.deploymentEnabled[fix/v1-quality-recovery]=false`), pour sauvegarder les commits sans lancer une mise en ligne. [Référence Vercel](https://vercel.com/docs/project-configuration/git-configuration). Render reste en déploiement automatique désactivé. Aucune API de déploiement ni connexion Neon utilisée. Les règles des autres branches ne sont pas changées.

Après validation de W25 : reprendre W12 avec le même lecteur, puis les tableaux élèves/notes/résultats et la navigation par petites tranches ; comparer chaque écran avec son wireframe et tester les données longues, les permissions et mobile. Le cas primaire P1 nécessite un choix explicite de présentation avant généralisation ; aucune règle pédagogique ne doit être inventée.

Verdict borné : écran W25 démontrable localement, validation graphique du responsable projet en attente. La qualité des31 écrans, le déploiement en ligne et l'exploitation réelle ne sont pas déclarés validés par cette tranche.
