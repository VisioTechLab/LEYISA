# Données publiées et espaces utilisateurs — 20 novembre 2026

## Périmètre de l’inspection publiée

Contrôle sans commande de modification de données : outils Neon `search`, `list_branches` et `run_sql` avec des `SELECT` exclusivement, plus consultation des interfaces Render et Vercel. Aucun seed, aucune migration, aucun changement de configuration, aucune publication. Les valeurs de connexion et secrets n’apparaissent pas dans les preuves.

| Maillon | Constat vérifié | Preuve / limite |
| --- | --- | --- |
| Vercel | Projet `leyisa-v1-5-demo`, domaine `leyisa-v1-5-demo.vercel.app`, déploiement `5ZodKxRmTSRNPwsJWpy6GECVk8Sp` | Interface Vercel ; déploiement CLI, pas de dépôt Git connecté affiché. Un push Git ne suffit donc pas à publier ce projet. |
| Relais Vercel | Variables `LEYISA_RENDER_ORIGIN` et `LEYISA_PROXY_SECRET` présentes pour Production/Preview | Valeur de l’origine encore masquée à l’inspection ; ne pas confondre présence et validation de sa valeur effective. |
| Render | Service `leyisa-nestjs`, `srv-dbqss65g1s2s73f9lb7g`, `https://leyisa-nestjs.onrender.com` | Interface du service ; branche `demo/leyisa-v1`, dernier déploiement réussi `7783483d59e5f64f5d7e9e54ecb609a28be4e9a3`. |
| Connexion Render | Base `leyisa_demo`, endpoint pooled `ep-jolly-rain-ba1ki82d`, TLS `verify-full` | Champs DOM lus sans révéler la chaîne : seuls hôte, nom de base et mode TLS ont été extraits. |
| Neon | Projet `LEYISA School Demo V1` / `still-surf-49434461`, branche `demo-v1` / `br-empty-pine-ba6t2yd6` | L’outil Neon `search` relie précisément l’endpoint Render à cette branche. |
| NestJS / Prisma | Client partagé, adaptateur PostgreSQL existant, contrôles RBAC et ABAC dans les services | Code du dépôt et référence publiée connue ; aucune nouvelle instance connectée à Neon n’a été démarrée. Les API authentifiées publiées restent à comparer depuis une session existante. |

Le navigateur accessible affiche encore le formulaire de connexion du domaine publié. L’utilisateur a proposé d’ouvrir une session existante : ne pas la remplacer par une connexion neuve, qui créerait une session et des événements en base. Les chargements de la page de connexion peuvent eux-mêmes déclencher les traces techniques `DENY` du backend existant ; aucune écriture SQL ni action métier n’a été demandée ou exécutée par l’audit.

## Totaux réellement constatés

| Entité | Total |
| --- | ---: |
| Élèves | 23 |
| Enseignants | 58 |
| Classes | 9 |
| Évaluations | 239 |
| Notes | 709 |
| Résultats publiés | 106 |
| Émissions de bulletins (`ReportCard`) | 13 |
| Affectations | 77 |

Un résultat publié n’est pas une émission de bulletin : les 106 résultats et les 13 émissions sont deux quantités différentes. Les documents restent soumis à leur compatibilité de période et à la publication des composantes.

## Pourquoi des données peuvent sembler manquer

1. **Compte enseignant sans affectation — confirmé en SQL.** `ens@demo.leyisa.test` n’a aucune affectation ni évaluation dans cette base. Le compte multirôle générique n’en a pas non plus. L’ABAC doit continuer à les empêcher de voir les évaluations d’autres enseignants. Leur donner artificiellement les 239 évaluations serait une violation du périmètre.
2. **Première période choisie silencieusement — confirmé par le code et les distributions SQL.** La seule soumission `PENDING` est en P2 du secondaire. Ouvrir automatiquement une autre période présente une file vide alors qu’une soumission existe. La correction locale ouvre toutes les périodes et affiche explicitement le filtre.
3. **Première classe et première période de bulletin — confirmé par le code antérieur.** L’ancien lecteur réduisait d’emblée les 106 résultats à un sous-ensemble. Les nouveaux filtres commencent sur toutes les années/classes/périodes ; l’identité du dossier et le vrai PDF restent conservés.
4. **Compteurs de page — confirmé par le code antérieur.** `/students` renvoie 50 lignes par page. Un compteur basé sur la longueur de cette page n’est pas le total des dossiers. L’option additive `pagination=1` fournit le vrai total, avec exactement le même filtre ABAC que les lignes.
5. **Deux bases distinctes — confirmé par la configuration locale et Render.** Le poste local utilise exclusivement PostgreSQL sur loopback et sa base de recette synthétique. Il ne montre pas automatiquement les totaux Neon. La nouvelle barre de session précise « Démo locale » sur localhost.
6. **Rôles multicomptes cumulés — confirmé par le code antérieur.** Le sélecteur ne modifiait que le tableau de bord. Les menus restaient fondés sur l’union des droits ; certains services lisent cette union pour choisir leur périmètre. L’en-tête optionnel de rôle actif restreint désormais le contexte aux rôles réellement attribués, sans changer la matrice.
7. **Réveil Render — risque plausible, non reproduit par une connexion authentifiée publiée.** L’interface Render annonce un réveil possible de 50 secondes ou plus ; le relais existant abandonne à 25 secondes (fonction limitée à 30). Ce cas doit produire une erreur lisible et une reprise, jamais une liste vide. Aucun abonnement ni délai d’hébergement n’a été modifié.

Toutes les classes constatées sur Neon appartiennent à `DEMO-2025-2026`. Deux classes n’ont aucune évaluation ; les résultats sont principalement répartis entre les classes DEMO maternelle, primaire et secondaire. Les totaux globaux ne doivent pas être attendus dans chaque compte enseignant.

## Sources statiques

Les anciens fichiers de maquette et `demoStudentsDataSource.ts` sont conservés pour provenance. Le routeur applicatif utilise les modules réseau ; `studentsDataSource.ts` instancie exclusivement `createApiStudentsDataSource`. Aucun basculement vers des données statiques sur erreur. Le contrôle navigateur vérifie les réponses des API locales authentifiées séparément pour les quatre comptes.

Voir [les preuves sans secrets](preuves-espaces-v1/neon-lecture-seule.json), [les espaces](ESPACES_UTILISATEURS_V1.md) et [le contre-audit](AUDIT_ESPACES_UTILISATEURS_V1.md).
