# Sources — Configuration scolaire et bulletins

Références de démonstration pour Jonathan. Leur ajout ne valide pas les propositions métier ou les choix techniques encore ouverts.

## Sources à utiliser

- [Configuration scolaire](../wireframes/02_Configuration_scolaire.png) : vue principale du module school.
- [Bulletins scolaires](../wireframes/08_Bulletins_scolaires.png) : sélection, aperçu et téléchargement.
- [Ready-to-Code V2](<LEYISA_Ready_to_Code_V2 (1).pdf>) : exigences et critères de vérification.
- [UML V4](<Leyisa_School_V1_UML_V4 (1).pdf>) : modèle métier et relations.

Les huit PNG illustrent le parcours complet, de la connexion au bulletin.

## Tâches de Jonathan

| Fonctionnalité | Ready-to-Code |
|---|---|
| US-004 : année scolaire | Page 10 |
| US-005 : périodes | Page 10 |
| US-006 : classes annuelles | Page 10 |
| US-007 : matières | Page 10 |
| US-008 : programme de classe | Page 11 |
| Bulletins | Pages 15 et 25 |

Lire aussi C02 / SchoolContext (p. 19), les routes proposées (p. 20), les contraintes de données (p. 22), les permissions (p. 23) et les décisions ouvertes (p. 27). Le modèle de scolarité est en UML p. 3 et celui des bulletins en p. 5.

## Limites et coordination

La maquette de configuration ne détaille pas tous les formulaires de création ou modification ni les états vides, chargements et erreurs. Les compléter à partir des fiches US. Les rôles affichés ne remplacent pas les permissions serveur validées. Les bulletins doivent utiliser les résultats figés, sans recalcul, et porter DÉMONSTRATION - NON OFFICIEL.

Consulter [les contrats](../contrats-api.md), [les règles métier](../regles-metier.md), [l’architecture](../architecture.md), [les responsabilités](../equipe.md) et [le skill de Jonathan](../../.agents/skills/leyisa-jonathan/SKILL.md).

Les contrats API du socle restent à définir. Les routes et règles proposées dans les PDF doivent être adoptées et consignées avec les responsables concernés. Confirmer la stack avec Melvin. Jonathan fournit la configuration à Franck et Kevin ; Melvin fournit les résultats figés pour les bulletins.

## Provenance

Huit images du dossier local Docs_Bengise/Image_wireframe et les deux PDF fournis par Kevin, copiés sans modification. Intégrité des copies vérifiée par SHA-256. Ajout documentaire uniquement ; aucun test applicatif exécuté.
