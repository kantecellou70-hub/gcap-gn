export function handleSupabaseError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string }
    switch (pgError.code) {
      case '23505': return 'Cet enregistrement existe déjà.'
      case '23503': return 'Référence invalide — enregistrement lié introuvable.'
      case '42501': return 'Permission refusée — vérifiez votre rôle.'
      case 'PGRST116': return 'Enregistrement introuvable.'
      default: return `Erreur base de données : ${pgError.message}`
    }
  }
  if (error instanceof Error) return error.message
  return 'Erreur inconnue. Veuillez réessayer.'
}
