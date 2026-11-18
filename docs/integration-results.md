# Guide d'intégration du module Results (Validation, Calculs & Clôture)

Ce document fournit à l'équipe et à l'intégrateur (Kevin) toutes les instructions et détails techniques nécessaires à l'intégration sécurisée du module **Results** dans le socle collaboratif LEYISA SCHOOL.

---

## 1. Périmètre et responsabilités

- **Responsable** : Melvin (Lead technique, module `results`).
- **Producteur amont** : Joel (Module `evaluations` — saisie et soumission des notes par les enseignants).
- **Consommateur aval** : Jonathan (Module `bulletins` — génération des bulletins PDF à partir des résultats figés).
- **Intégrateur & DBA** : Kevin (Gestion Git, migrations Neon et assemblage).

---

## 2. Changements apportés au dépôt

### 2.1. Base de données & Prisma
- **Fichier schéma** : `backend/prisma/schema.prisma`
  - Ajout du champ `resultMaxScore Decimal @default(20) @db.Decimal(10, 4)` sur le modèle `ClassSubject`.
- **Migration SQL** : `backend/prisma/migrations/20261116000000_add_class_subject_result_maximum/migration.sql`
  ```sql
  ALTER TABLE "ClassSubject"
    ADD COLUMN "resultMaxScore" NUMERIC(10, 4) NOT NULL DEFAULT 20;

  ALTER TABLE "ClassSubject"
    ADD CONSTRAINT "class_subject_result_max_score_positive"
    CHECK ("resultMaxScore" > 0);
  ```

### 2.2. Backend NestJS
- **Module** : `backend/src/modules/results/`
  - `results.module.ts` : Enregistrement du contrôleur et du service.
  - `results.controller.ts` : Exposition des endpoints REST sous le préfixe `/results`.
  - `results.service.ts` : Logique métier transactionnelle, verrouillage (`SELECT FOR UPDATE`), contrôle des rôles et audit.
- **Support de configuration réseau** : `backend/src/main.ts`
  - Prise en charge de la variable `HOST` (`process.env.HOST ?? '0.0.0.0'`) pour permettre le démarrage local sur `127.0.0.1` sous Windows sans conflit réseau.

### 2.3. Frontend React
- **Module** : `frontend/src/features/results/`
  - `ResultsModulePage.tsx` : Interface complète structurée en 4 vues conformes au wireframe V1 :
    1. *Validation des soumissions* (file d'attente globale de la période ouverte, détail, approbation, rejet motivé).
    2. *Prévisualisation des résultats* (calcul des moyennes par matière ramenées au maxima configuré).
    3. *Clôture de la période* (contrôle des prérequis, case de confirmation explicite, scellement).
    4. *Résultats finaux* (affichage du total obtenu / total maximal par élève, lien d'orientation vers les Bulletins).
  - `resultsApi.ts` : Client API typé appelant le backend NestJS.
  - `results.css` : Styles alignés sur la charte et les wireframes LEYISA.

---

## 3. Endpoints API exposés

| Méthode | Route | Rôle requis | Description |
|---|---|---|---|
| `GET` | `/results/bootstrap` | Tous | Initialise le contexte (période ouverte, profil actif). |
| `GET` | `/results/submissions` | Direction | Liste les soumissions `PENDING` de la période. |
| `GET` | `/results/submissions/:id` | Direction | Détail d'une soumission (notes par élève, historique). |
| `POST` | `/results/submissions/:id/approve` | `DIR` | Valide une soumission (interdiction si auteur = validateur). |
| `POST` | `/results/submissions/:id/reject` | `DIR` | Rejette une soumission avec motif textuel obligatoire. |
| `GET` | `/results/class-periods` | Direction | Liste les classes pour la période sélectionnée. |
| `GET` | `/results/class-periods/:id/preview` | Direction | Prévisualise les moyennes par matière (sans moyenne générale). |
| `POST` | `/results/class-periods/:id/close` | `DIR` | Clôture irréversible de la classe-période et génération des `ResultSnapshot`. |
| `GET` | `/results/class-periods/:id/final-results`| Direction | Consulte les résultats figés après clôture. |

---

## 4. Règles métier et contrôles de sécurité

1. **Contrôle d'accès & Séparation des pouvoirs** :
   - Seul un utilisateur avec le rôle `DIR` (Direction) peut approuver ou rejeter des soumissions, et clôturer une période.
   - **Anti-auto-approbation** : Un enseignant disposant également d'un rôle de direction ne peut pas approuver sa propre soumission de notes.
2. **Rejet motivé obligatoire** :
   - L'action `reject` exige un motif non vide. La soumission repasse à l'état `REJECTED`, invitant l'enseignant à corriger et créer une nouvelle soumission.
3. **Calcul de la note par matière** :
   - Formule : $\text{Note} = \frac{\sum \text{Points obtenus}}{\sum \text{Points maxima}} \times \text{Maxima de la matière}$.
4. **Verrouillage irréversible de la clôture** :
   - La clôture est bloquée si :
     - Des soumissions de la classe sont encore `PENDING` ou `REJECTED`.
     - Des matières attendues n'ont pas d'évaluations validées.
     - Des notes sont manquantes pour un élève inscrit.
   - Lors de la clôture, l'état de `ClassPeriod` passe à `CLOSED`, rendant impossible toute modification ultérieure par les enseignants.
   - Les résultats sont figés sous forme de lignes `ResultSnapshot` immuables destinées à Jonathan.
5. **Traçabilité** :
   - Chaque action d'approbation, rejet ou clôture insère une entrée dans la table `AuditEntry`.

---

## 5. Procédure pour Kevin (Déploiement sur Neon)

> [!IMPORTANT]
> Ne jamais exécuter `prisma db push`, `prisma migrate reset` ou `npm run db:seed` sur la branche partagée Neon `dev-resultats`.

1. **Vérification de la migration** :
   La migration `20261116000000_add_class_subject_result_maximum` est idempotente et non destructive (valeur par défaut 20).
2. **Application avec le compte d'administration/migration** :
   ```powershell
   cd backend
   npm run db:migrate
   ```
3. **Vérification de l'état** :
   ```powershell
   npm run db:status
   ```
4. **Validation des droits pour les développeurs** :
   S'assurer que le rôle de lecture/écriture de Melvin et Joel peut bien lire et écrire dans la nouvelle colonne `resultMaxScore`.

---

## 6. Protocole de test du parcours complet (Joel + Melvin)

Sur la branche d'intégration `integration/results-evaluations` :

1. **Saisie par l'enseignant (Joel)** :
   - L'enseignant saisit les notes d'une évaluation pour la 6e A et soumet $\rightarrow$ statut `PENDING`.
2. **Examen par la Direction (Melvin)** :
   - La soumission apparaît dans la file d'attente `/results`.
   - Test du rejet : Saisie d'un motif $\rightarrow$ soumission rejetée. L'enseignant corrige et re-soumet.
   - Test de l'approbation : Validation de la soumission corrigée $\rightarrow$ statut `APPROVED`.
3. **Prévisualisation des résultats** :
   - Vérification des points ramenés au maxima de chaque matière pour tous les élèves.
4. **Clôture** :
   - Validation de toutes les matières attendues de la classe-période.
   - Confirmation de la clôture $\rightarrow$ la classe-période devient `CLOSED`.
   - Tentative de saisie ou modification par l'enseignant $\rightarrow$ désormais interdite et rejetée.
5. **Passage vers les Bulletins** :
   - L'onglet *Résultats finaux* affiche le total obtenu / total maximal par élève.
   - Clic sur "Préparer bulletin" $\rightarrow$ transition fluide vers le module de Jonathan.

