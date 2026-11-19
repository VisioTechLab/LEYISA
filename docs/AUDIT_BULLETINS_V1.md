# Conformité documentaire des bulletins V1

## AUDIT_MODULE — 8a508812a0d3005c6e309adfc7af4d1a82235145

Quatre PDFs ont été téléchargés depuis l’API locale sur PostgreSQL isolé, avec les instantanés fictifs publiés. Les sorties ont été rasterisées à 175 ppp et confrontées aux six captures. La carte actuelle est en paysage et les bulletins chiffrés en portrait. Les bordures et les proportions ont été inspectées sur les images.

| Élément de référence | Source | Présence à la révision initiale | Écart visible | Correction | Preuve attendue |
| --- | --- | --- | --- | --- | --- |
| En-tête et identité maternels | MATERNEL_01, partie haute | Titre et champs partiels | En-tête aligné à gauche, lignes d’identité sans cadres | En-tête centré, titre et identité encadrés | Comparatif A4 paysage |
| Dix attitudes et six périodes | MATERNEL_01/02, grille ; bulletins.module.ts L105–115 | Attitudes et valeurs, 18 colonnes | N° absent, intitulé répété trois fois par période, libellés et colonnes comprimés | Numéro, période fusionnée, QTE/QLT/COUL, ordre du modèle | Carte complète, valeurs et périodes vides vérifiées |
| Observation et signatures maternelles | MATERNEL_02, partie basse ; L127–130 | Libellés épars | Absence de cadres et de zones de signature | Observation par période et quatre zones bordées | Comparatif de la partie basse |
| Identité et titre primaire | PRIMAIRE_01, partie haute | Identité partielle | Grille administrative absente, intitulé différent | Cinq lignes de grille et titre du modèle | Comparatif A4 portrait |
| Branches, périodes et synthèse primaire | PRIMAIRE_02, grille ; L117–125 | Branches, T1/T2/T3 et TG | N° et Mention absents, aucun Total /100, synthèse hors tableau | Sept colonnes et trois lignes de synthèse fusionnées, T1/T2/T3 publiés | Programme représentatif, comparaison avec instantanés |
| Décision, observations et signatures primaires | PRIMAIRE_03, partie basse ; L127–130 | Décision générique | Choix, observations séparées et trois cadres absents | Choix liés à une décision humaine, cadres et lignes dédiés | Comparatif et cas sans décision |
| Identité et grille secondaire | BULLETIN_SECONDAIRE, partie haute ; L117–125 | Champs partiels, grille plate | N° ID et zones administratives absents, semestres et sous-en-têtes absents, TG sans volet repêchage | Bandeau, deux zones d’identité, super-en-têtes et volet repêchage | Comparatif A4 portrait |
| Maxima, synthèses et délibération secondaire | BULLETIN_SECONDAIRE, centre et bas ; L117–130, captures de pondération, CSV, programmes, calendrier, délibération | Total, rang, décision en texte | Pas de groupes MAXIMA, pas de synthèses par colonne, pas de pied administratif, seconde session mélangée | Groupes tirés des maxima figés, synthèses publiées, volet de session séparé, cadres de pied | CTEB 20 branches, groupes distincts, résultat annuel et deuxième session |
| Contrôle de publication et conservation | Section 13, matrices V1, docs/DECISIONS_V1.md, docs/AUDIT_RELEASE_V1.md | Accès au résultat publié, PDF généré à la demande | Composantes incorporées sans contrôle de publication propre, lecture ambiguë des anciennes versions | Résolution des sources figées et contrôle de leur publication, version de rendu isolée | Tests de refus, comparaison historique octet par octet |
| W12 et W25 | Wireframes W12 (p. 16) et W25 (p. 29) | Téléchargement et génération | Le PDF imprimé et l’aperçu web répondent à deux usages distincts | Préserver les parcours W12/W25 et les permissions qui leur sont associées | Parcours de téléchargement réel |

Les captures de pondération des différents niveaux et options et le calendrier déterminent les entrées du moteur de résultats. La structure des formulaires provient des six images pédagogiques. Les signatures, sceaux, armoiries et identifiants visibles dans les références ne sont pas des données du formulaire de démonstration.

## Journal des corrections

| Lot | État vérifié |
| --- | --- |
| Audit préalable | Branche créée depuis le SHA d’intégration vérifié. Matrice publiée dans le commit `b852c6f`. |
| Formulaires et versions | Commit `86130b5` publié. Builds réussis. Sur une restauration locale de PostgreSQL, trois PDF archivés V1.3 ont été comparés aux octets téléchargés à la révision initiale. Quatre formulaires V1.4 ont été téléchargés via NestJS. |
| Recette élargie | 79 tests réussis, 39 contrôles PostgreSQL réussis et six migrations rejouées sur une base locale vide. Les coordonnées et valeurs de huit documents ont été contrôlées et chaque page rasterisée à 200 ppp. W12 et W25 ont téléchargé le PDF V1.4 dans Chromium depuis le frontend local. |

## FIX_APPROVED — Modifications et règles de lecture

- V1.4 produit les formulaires de démonstration. Chaque émission enregistre sa version et sa date. Les éditions V1.2 et V1.3 enregistrées restent accessibles avec le paramètre `templateVersion`. Les fichiers de l’ancienne recette et les lignes historiques sont conservés.
- Les composantes sont lues par identifiant d’instantané figé, pour le même élève, la même classe et la même année. Une composante doit être publiée pour afficher son contenu. Une synthèse qui dépend d’une composante indisponible reste vide. Un PDF partiel est consultable si le résultat principal est publié. L’émission définitive exige que ses dépendances soient publiées.
- Les chiffres imprimés sont des valeurs stockées. Les lignes MAXIMA regroupent les vecteurs de maxima publiés. Les signatures, sceaux, dates, identifiants administratifs et autres valeurs variables restent vides si le dossier ne les renseigne pas.
- En deuxième session, la grille principale reprend le résultat annuel original. Seules les matières autorisées reçoivent une note dans le volet de repêchage. La note correspond à l’E2 de remplacement du profil fictif. La synthèse de deuxième session est affichée à droite. Chaque session conserve sa propre décision.

## VERIFY_FIX — Livrables et vérifications

| PDF | Données contrôlées | Comparaison |
| --- | --- | --- |
| [Maternel](preuves-bulletins/BULLETIN_MATERNEL_DEMO-V1.pdf) | 10 attitudes, 6 périodes, 180 cellules d’appréciation, 4 cadres de signature | [En-tête](preuves-bulletins/01-maternel-entete.jpg) · [Grille et pied](preuves-bulletins/02-maternel-pied.jpg) |
| [Primaire](preuves-bulletins/BULLETIN_PRIMAIRE_DEMO-V1.pdf) | Programme fictif de dix branches, trimestres 60/80 par branche, 1 800/2 400, 75 %, rang 1 et décision de passage issue de la délibération | [Identité](preuves-bulletins/03-primaire-entete.jpg) · [Branches et synthèse](preuves-bulletins/04-primaire-tableau.jpg) · [Décisions et signatures](preuves-bulletins/05-primaire-pied.jpg) |
| [Secondaire CTEB](preuves-bulletins/BULLETIN_SECONDAIRE_DEMO-V1.pdf) | 20 branches, 5 groupes de maxima P1, 0/400, périodes hors P1 vides | [Secondaire CTEB](preuves-bulletins/06-secondaire-cteb.jpg) |
| [Secondaire annuel](preuves-bulletins/BULLETIN_SECONDAIRE_ANNUEL_DEMO-V1.pdf) | Dix branches fictives, quatre groupes de maxima, composantes annuelles, 1 140/1 520 et 75 % | [Secondaire annuel](preuves-bulletins/07-secondaire-annuel.jpg) |
| [Repêchage](preuves-bulletins/BULLETIN_REPECHAGE_DEMO-V1.pdf) | Première session 0/1 520, deuxième session 40/1 520. Une branche autorisée. Première session préservée | [Repêchage](preuves-bulletins/08-repechage.jpg) |

Les comparatifs reposent sur les mêmes instantanés fictifs pour les deux versions de LEYISA. La version précédente est reproduite avec le moteur V1.3 conservé. Les marques et identifiants des captures transmises ont été masqués. Les pages A4 ont été inspectées à l’écran à partir des rendus à 200 ppp. Une impression sur papier reste à valider avec l’établissement. [Empreintes des fichiers](preuves-bulletins/SHA256SUMS.txt).

- 79 tests et 39 contrôles réussis sur PostgreSQL 18 local. Six migrations rejouées. Compte applicatif sans DDL, refus API 401/403/404, refus 409 pour l’émission d’un résultat incomplet, première session immuable et téléchargement historique vérifiés.
- Huit documents contrôlés par extraction spatiale, avec inspection visuelle des modèles de référence. Cas de 48 matières longues avec accents, plusieurs groupes et répétition des en-têtes. Le zéro, la valeur absente et la matière non applicable ont été testés.
- Les comptes Secrétariat et Direction ont téléchargé le PDF courant dans Chromium. [W12](preuves-bulletins/W12.png) · [W25](preuves-bulletins/W25.png) · [Résultats navigateur](preuves-bulletins/navigateurs.json).
- GitHub Actions produit les instantanés fictifs de preuve, les rendus de chaque page et le bundle Git complet. Le workflow vérifie la restauration et exécute `git fsck`.

## AUDIT_RELEASE — Verdict et écarts à soumettre à l’établissement

| Domaine | Verdict | Écarts et validation attendue |
| --- | --- | --- |
| Conformité graphique | Grilles, titres, signatures et regroupements présents. Fidélité soumise à validation humaine. | Comparer les marges, typographies, proportions et bordures sur papier A4. Au secondaire, l’identité est répartie en lignes bordées et le N° permanent figure dans une zone textuelle. Le choix de passage figure dans le cadre inférieur. Le modèle source le rappelle aussi dans un encadré latéral. Le PDF ajoute une cellule NOTE au volet de repêchage et affiche une synthèse latérale de deuxième session. La carte maternelle fusionne une zone d’observation par période et utilise la désignation administrative générique faute d’identité d’inspection. |
| Exactitude des données | Vérifiée sur les jeux locaux fictifs, chiffres lus dans les instantanés. | Pour le CTEB, seule P1 est attestée. L’exemple annuel et le repêchage utilisent un programme fictif distinct. Le pourcentage de deuxième session conserve la précision stockée et peut occuper plusieurs lignes. |
| Règles pédagogiques | Profil de démonstration explicite. | Faire valider QTE/QLT/COUL et leur légende, l’interprétation des trois périodes du primaire, la normalisation de Total /100, les mentions, les règles d’ajournement, d’échec et de réorientation, les maxima manquants et la politique de repêchage. Les rubriques sans source validée restent vides. |
| Sécurité documentaire | Contrôles locaux d’accès, de publication et d’archivage réussis. | DEMO-V1 figure sur chaque page. L’établissement devra valider les champs d’identification, signatures, cachets et modalités de remise des documents avant usage réel. |
| Démonstration | Apte en local sous réserves. | Examiner les comparatifs et accepter les écarts avant fusion. |
| Exploitation réelle | Validation requise. | Validation pédagogique et administrative des formulaires, épreuve papier et recette hébergée restent ouvertes. |
