export const resultStatus = (value: string) => ({ OPEN: 'Ouvert', CLOSED: 'Clôturé', PUBLISHED: 'Publié' })[value] ?? value;
export const evaluationStatus = (value: string) => ({ DRAFT: 'Brouillon', SUBMITTED: 'Soumise', REJECTED: 'Rejetée', VALIDATED: 'Validée' })[value] ?? value;
export const periodLabel = (value: string) => value.replaceAll('SECONDAIRE_TECHNIQUE', 'Secondaire technique').replaceAll('PRIMAIRE', 'Primaire').replaceAll('MATERNEL', 'Maternelle');
