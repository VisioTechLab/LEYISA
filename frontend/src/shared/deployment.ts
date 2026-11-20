// Contexte d'affichage uniquement : ne donne aucun droit et ne choisit aucune base.
// La connexion Neon appartient exclusivement au backend Render.
export const isPrivateRecipe = import.meta.env.VITE_LEYISA_CONTEXT === 'recette';
export const deploymentLabel = isPrivateRecipe ? 'Recette privée' : 'DEMO-V1';
