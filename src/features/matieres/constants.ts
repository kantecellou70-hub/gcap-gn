import type { EtatBien, CategorieBien } from './types'

export const ETAT_BIEN_LABELS: Record<EtatBien, string> = {
  BON:          'Bon état',
  ACCEPTABLE:   'Acceptable',
  MEDIOCRE:     'Médiocre',
  HORS_SERVICE: 'Hors service',
  REFORME:      'Réformé',
}

export const ETAT_BIEN_COLORS: Record<EtatBien, string> = {
  BON:          'bg-green-100 text-green-700',
  ACCEPTABLE:   'bg-blue-100 text-blue-700',
  MEDIOCRE:     'bg-amber-100 text-amber-700',
  HORS_SERVICE: 'bg-red-100 text-red-700',
  REFORME:      'bg-slate-100 text-slate-500',
}

export const CATEGORIE_LABELS: Record<CategorieBien, string> = {
  MOBILIER:           'Mobilier',
  INFORMATIQUE:       'Informatique',
  VEHICULE:           'Véhicule',
  EQUIPEMENT_BUREAU:  'Équipement bureau',
  MATERIEL_TECHNIQUE: 'Matériel technique',
  IMMEUBLE:           'Immeuble',
  AUTRE:              'Autre',
}

export const CATEGORIE_COLORS: Record<CategorieBien, string> = {
  MOBILIER:           'bg-orange-100 text-orange-700',
  INFORMATIQUE:       'bg-blue-100 text-blue-700',
  VEHICULE:           'bg-indigo-100 text-indigo-700',
  EQUIPEMENT_BUREAU:  'bg-teal-100 text-teal-700',
  MATERIEL_TECHNIQUE: 'bg-purple-100 text-purple-700',
  IMMEUBLE:           'bg-slate-100 text-slate-700',
  AUTRE:              'bg-gray-100 text-gray-600',
}

export const CATEGORIES_OPTIONS: { value: CategorieBien; label: string }[] = [
  { value: 'MOBILIER',           label: 'Mobilier' },
  { value: 'INFORMATIQUE',       label: 'Informatique' },
  { value: 'VEHICULE',           label: 'Véhicule' },
  { value: 'EQUIPEMENT_BUREAU',  label: 'Équipement bureau' },
  { value: 'MATERIEL_TECHNIQUE', label: 'Matériel technique' },
  { value: 'IMMEUBLE',           label: 'Immeuble' },
  { value: 'AUTRE',              label: 'Autre' },
]

export const ETATS_OPTIONS: { value: EtatBien; label: string }[] = [
  { value: 'BON',          label: 'Bon état' },
  { value: 'ACCEPTABLE',   label: 'Acceptable' },
  { value: 'MEDIOCRE',     label: 'Médiocre' },
  { value: 'HORS_SERVICE', label: 'Hors service' },
  { value: 'REFORME',      label: 'Réformé' },
]

export const ROLES_MATIERES_GERER  = ['SUPER_ADMIN', 'ADMIN_MINISTERE', 'COMPTABLE_MATIERES']
export const ROLES_MATIERES_VALIDER = ['SUPER_ADMIN', 'ADMIN_MINISTERE']
