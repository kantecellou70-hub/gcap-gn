export const zodMessages = {
  required: 'Ce champ est obligatoire',
  email: 'Adresse email invalide',
  positive: 'Le montant doit être supérieur à 0',
  integer: 'Le montant doit être un nombre entier (GNF)',
  montantMax: 'Le montant dépasse les crédits disponibles sur cette ligne',
  datePassee: "La date doit être dans l'exercice budgétaire en cours",
  minLength: (min: number) => `Ce champ doit comporter au moins ${min} caractères`,
  maxLength: (max: number) => `Ce champ ne peut pas dépasser ${max} caractères`,
  url: 'URL invalide',
} as const
