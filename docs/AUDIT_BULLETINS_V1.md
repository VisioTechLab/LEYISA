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
