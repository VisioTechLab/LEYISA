# Démonstration client — état vérifié le 20 novembre 2026

Le scénario joint par le responsable est une proposition de présentation. Il ne constitue pas une autorisation de créer des dossiers, changer des notes, prendre des décisions scolaires, fusionner des PR ou déployer.

## Version publiée et données

- Recette privée : https://leyisa-school-recette.vercel.app/ ; Vercel READY et Render live au commit `8029c90a83fd00850f68cfb76ea6f08f9a13d0c1`.
- Les PR [11](https://github.com/VisioTechLab/LEYISA/pull/11) et [12](https://github.com/VisioTechLab/LEYISA/pull/12) sont ouvertes, non fusionnées. Leurs nouveautés ne doivent pas être annoncées comme publiées.
- Lecture seule de `LEYISA / production-candidate / neondb` : 153 élèves, 42 classes, 127 contextes publiés et 1 410 résultats publiés. Ces chiffres remplacent les constats antérieurs de 93 élèves/23 classes pour cette vérification ; ils ne prouvent pas que tous les dossiers correspondent à des personnes réelles.
- L'exemple synthétique prévu dans le scénario possède trois inscriptions sur trois années et 23 résultats publiés. L'API authentifiée renvoie bien les 23 bulletins. Un détail contrôlé indique `publicationComplete=true`, `documentPeriodSupported=true`, modèle `DEMO-V1.7`.
- L'ouverture du lecteur et le téléchargement du PDF n'ont pas été répétés pendant cette vérification. Un indicateur de compatibilité n'est pas une preuve de téléchargement réussi.
- Les soumissions présentes sont approuvées (1 229) ou rejetée (1). Aucune n'est en attente : la démonstration d'une nouvelle décision demande une préparation explicite du scénario.

Les mots de passe fournis ne sont ni copiés dans ce rapport ni versionnés. Les comptes de recette ne sont pas présumés valables sur la DEMO indépendante.

## Séquences présentables et limites

| Séquence | État |
| --- | --- |
| Présenter les espaces ADM/SEC/ENS/DIR | Déjà vérifiés lors de la recette précédente ; pas de nouvelle connexion aux quatre comptes pendant ce contrôle |
| Recherche, dossier et inscriptions historiques | Exemple historique confirmé côté base ; à répéter dans l'interface avant la réunion |
| Saisie, soumission, rejet, correction, approbation | Fonctionnalités existantes et tests locaux ; parcours manipulable hébergé à préparer et répéter, sans toucher aux vraies notes |
| Bulletin historique déjà publié | Disponible et compatible selon l'API ; lecteur et téléchargement à répéter |
| Nouvelle clôture/publication sur de vrais dossiers | Pas déclarée prête ; règles et maxima primaire non entièrement confirmés |

Les classes 6e A/B/C/D correspondent au primaire selon la réponse explicite du responsable. La grille numérique primaire manque dans les références examinées : les captures de présentation avec « Total /100 » ne fixent pas les maxima de chaque matière/période. Les grilles CTEB et humanités ne doivent pas être appliquées au primaire. Aucun profil arbitraire ni horloge simulée n'est introduit.

## Corrections locales en attente d'intégration

Branche `fix/v1-quality-recovery`, sans fusion ni redéploiement :

- Une page HTML de réveil Render renvoyée avec HTTP200 devient une erreur JSON503 avec possibilité de réessayer ; elle ne représente plus une session absente ou une liste vide. Les réponses JSON, PDF et204 sont conservées.
- Le client refuse les succès API non JSON et vérifie le jeton CSRF avant envoi d'une mutation.
- Des totaux absents d'un ancien snapshot sont renvoyés comme inconnus, affichés « — ». Les vrais zéros sont conservés. Une ancienne moyenne explicitement stockée sur20 reste lisible sans inventer de total ni recalculer le résultat figé.

Vérifications exécutées : builds frontend/backend et lint frontend réussis ; huit tests backend ciblés réussis sans accès DB ; les 14 tests Playwright de `workspaces.spec.ts` réussissent sur application locale et identités fictives, dont les trois nouveaux contrôles ciblés. Contrôle de livraison et `git diff --check` réussis. Le premier lancement du test historique échouait à cause du motif d'interception de test, qui ne couvrait pas les sous-chemins ; corrigé puis relancé avec succès.

Aucune donnée métier partagée, migration, règle pédagogique, session de compte hébergé ou configuration de déploiement n'a été modifiée dans ce contrôle. Les changements locaux ne constituent pas une validation complète des trois parcours hébergés.
