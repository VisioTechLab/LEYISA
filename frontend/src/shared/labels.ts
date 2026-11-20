export const resultStatus = (value: string) => ({ OPEN: 'Ouvert', CLOSED: 'Clôturé', PUBLISHED: 'Publié' })[value] ?? value;
export const evaluationStatus = (value: string) => ({ DRAFT: 'Brouillon', SUBMITTED: 'Soumise', REJECTED: 'Rejetée', VALIDATED: 'Validée' })[value] ?? value;
export const periodLabel = (value: string) => value.replaceAll('SECONDAIRE_TECHNIQUE', 'Secondaire technique').replaceAll('PRIMAIRE', 'Primaire').replaceAll('MATERNEL', 'Maternelle');

// Présentation uniquement : les identités et les pièces archivées restent intactes.
export function archiveStaffLabel(value: string): string {
  return value.replace(/\bRecette historique synthétique\b/giu,'Recette historique');
}
export function archivePupilName(matricule: string | undefined, lastName?: string, postName?: string | null, firstName?: string): string {
  const marker=!!matricule && /^REC-HIST-\d{3}$/.test(matricule) && postName?.toLocaleUpperCase('fr')==='SYNTHÉTIQUE';
  return [lastName,marker?undefined:postName,firstName].filter(Boolean).join(' ');
}
