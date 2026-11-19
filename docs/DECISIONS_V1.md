# Décisions de finalisation V1

Version locale 19/11/2026. Autorité : demande du responsable projet et prompt maître du kit, §§0–20. Les décisions d'implémentation restent proposées à la revue MOC des propriétaires ; aucune approbation ministérielle ou des six membres n'est présumée. Sources originales hors dépôt : `../LEYISA_CODEX_V1/references/`. Les empreintes du kit ont été vérifiées (43/43).

| ID | Statut / source | Valeur, périmètre et exemple | Responsable / version |
|---|---|---|---|
| D01 | CONFIRME_PROJET, prompt §§1,13 | Marque exacte `DEMO-V1` pour nouveaux documents. Les anciennes migrations et documents restent historiques. | Responsable projet, V1 |
| D02 | CONFIRME_PROJET, matrices 14/11 feuilles droits/CRUD/C01 | ADM comptes/config/audit ; DIR enseignants/affectations/validation/résultats ; SEC dossiers/inscriptions/bulletins ; ENS seulement affecté. Pas d'auto-décision ENS+DIR. | Propriétaires des modules, V1 |
| D03 | CONFIRME_PROJET, C01 + prompt §5 | Cookie opaque 8h, hash SHA256 serveur, Argon2id, CSRF/Origin, limitation persistante. Ancien scrypt vérifié puis rehashé, jamais écrasé sans preuve. | Sidonie, implémentation locale V1 |
| D04 | REFERENCE_A_VERIFIER, calendrier PDF pp2–7 et CSV | Trois calendriers indépendants. Année 01/09/2026–02/07/2027. Événements sans notes. Chevauchements examens/périodes admis ; périodes ordinaires d'un cycle non chevauchantes. | Jonathan / école, source 26/06/2026 |
| D05 | DEMO_PROPOSE, prompt §§7,15 | Calendrier source transposé à 2025–2026 pour clôtures locales réellement passées. Code `DEMO-2025-2026`. Horloge système conservée. | QA, seed V1 |
| D06 | REFERENCE_A_VERIFIER, pondérations captures CTEB et CSV | 7e et 8e : 20 lignes, P1 maximum400 chacune. Français70/50 ; zoologie10/20 ; géographie20/30. Aucune extrapolation E1/E2/annuelle. | Jonathan/Melvin + école, transcription fournie |
| D07 | REFERENCE_A_VERIFIER, OPTIONS_RDC.csv, PROGRAMMES_PAR_NIVEAU.txt | 50 codes chaînes conservés ; catalogue de guides n'est pas une grille par niveau. 274 lignes de pondération conservées côté serveur. Commerciale partielle, groupements à confirmer. | École, source du kit |
| D08 | DEMO_PROPOSE, prompt §11 | `DEMO-V1.PERIOD_TOTAL_V1.2` : somme des scores / somme des barèmes, normalisée au maximum configuré. 15/20+30/40 =>30/40 ; 10/10+0/30=>10/40. Decimal, zéro distinct du vide. | Melvin, V1.2 |
| D09 | DEMO_PROPOSE, prompt §11.2 | Sommes des composants figés : secondaire S1=P1+P2+E1, S2=P3+P4+E2, annuel S1+S2 ; primaire Ti=P(2i−1)+P(2i)+Ei, annuel T1+T2+T3. Maxima de chaque composant explicites. | Melvin, V1.2 |
| D10 | DEMO_PROPOSE, modèles MATERNEL_01/02 + prompt §13 | Dix attitudes exactes, six périodes QTE/QLT/COUL. D1/D2/D3 sont des codes fictifs sans sémantique officielle. Aucune moyenne ni rang. | École pour légende ; QA V1 |
| D11 | DEMO_PROPOSE, prompt §12 | Profil typé/versionné par année/cycle/niveau/option. Proposition ADMIS si seuil50% et zéro échec, sinon A_VERIFIER. Décision humaine motivée avant publication annuelle. Aucun ajout automatique de points. | ADM configuration / DIR décision, V1 |
| D12 | REFERENCE_A_VERIFIER, six captures Les Ovations2024–2025 | Règlement d'un autre établissement conservé comme référence ; seuils et ambiguïtés non généralisés. Tolérance80→5 est une exception documentée, pas4. Aucun transfert ou péréquation automatique. | École/conseil, non activé |
| D13 | DEMO_PROPOSE, prompt §12 | `REPLACE_E2_DEMO` seulement sur profil explicite : cours autorisés par décision, workflow validation séparé, normalisation à E2, nouveau résultat deuxième session, première session immuable. Aucun plafond officiel déduit. | Melvin/DIR, V1 |
| D14 | CONFIRME_PROJET, prompt §§5,8 | ELEVE désactivé par défaut. ABAC propre bulletin implémenté et testé au service. Session élève non ouverte : contraintes STAFF historiques conservées ; activation nécessite décision et migration contrôlée. | Responsable projet/Sidonie, à autoriser |
| D15 | DEMO_PROPOSE, prompt §§3,14,17 | Routes ajoutées et migrations additives locales ; revue MOC avant fusion/Neon. Pas de migration au démarrage. Runtime sans DDL et audit append-only. | Lead + propriétaires, V1 |
| D16 | CONFIRME_PROJET, prompt §4 | Charte/logo/sidebar et parcours31 écrans conservés ; droits des matrices priment sur anciennes illustrations ADM W06/W07. Comparaison détaillée dans CONFORMITE_WIREFRAMES_V1.md. | Responsable projet, V1 |

Points à confirmer pour exploitation : politique officielle des maxima/groupes/sous-matières par niveau et option, portée annuelle des tableaux, légende maternelle, critères et compensation de délibération, conduite/application, signatures habilitées, validation du calendrier par l'école, activation des options et des comptes élèves. Aucun critère financier ou sanction automatique n'est implémenté.

L'absence de maximum bloque la clôture. `null` explicite signifie non applicable, jamais zéro. Un programme utilisé est protégé ; une nouvelle configuration doit viser une classe/version prospective. Les profils restent DEMO_PROPOSE ; l'interface n'active aucune prétendue règle officielle.
