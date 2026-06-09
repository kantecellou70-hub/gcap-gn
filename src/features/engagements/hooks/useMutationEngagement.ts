import toast from 'react-hot-toast'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus'
import { saveBrouillon, addToSyncQueue } from '@/shared/lib/indexedDb'
import { createEngagement } from '../api/engagements-api'
import type { EngagementInput } from '../types'

export interface CreateEngagementResult {
  id: string
  isOffline: boolean
}

export function useCreateEngagementWithOffline() {
  const { tenantId } = useTenant()
  const { profil } = useAuth()
  const { isOnline } = useNetworkStatus()

  async function mutate(
    input: EngagementInput,
    statut: 'BROUILLON' | 'EN_ATTENTE_VISA' = 'EN_ATTENTE_VISA',
  ): Promise<CreateEngagementResult> {
    if (isOnline) {
      const data = await createEngagement(input, tenantId!, profil!.id, statut)
      toast.success(
        statut === 'EN_ATTENTE_VISA'
          ? 'Engagement soumis au Contrôleur Financier.'
          : 'Engagement enregistré en brouillon.',
      )
      return { id: data.id, isOffline: false }
    }

    // Mode offline — sauvegarder en local uniquement
    const localId = crypto.randomUUID()
    const now = new Date().toISOString()

    await saveBrouillon({
      id: localId,
      tenant_id: tenantId!,
      user_id: profil!.id,
      objet: input.objet,
      montant_engage: input.montantEngage,
      fournisseur_nom: input.fournisseur,
      ligne_budgetaire_id: input.ligneBudgetaireId,
      exercice_id: input.exerciceId,
      description: input.observations,
      created_at: now,
      updated_at: now,
      is_draft: true,
    })

    await addToSyncQueue({
      type: 'CREATE_ENGAGEMENT',
      payload: {
        local_id: localId,
        tenant_id: tenantId!,
        objet: input.objet,
        montant_engage: input.montantEngage,
        fournisseur: input.fournisseur,
        ligne_budgetaire_id: input.ligneBudgetaireId,
        exercice_id: input.exerciceId,
        reference_marche: input.referenceMarche,
        reference_bon_cmd: input.referenceBonCmd,
        date_echeance: input.dateEcheance,
        observations: input.observations,
        metadata: {},
      },
      tenant_id: tenantId!,
      user_id: profil!.id,
      created_at: now,
    })

    toast.success('Engagement sauvegardé localement. Il sera synchronisé au retour de la connexion.')
    return { id: localId, isOffline: true }
  }

  return { mutate, isOnline }
}
