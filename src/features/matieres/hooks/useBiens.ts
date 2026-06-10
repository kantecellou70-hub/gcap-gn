import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTenant, NATIONAL_TENANT_ID } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import {
  fetchBiens,
  fetchBien,
  creerBien,
  modifierBien,
  reformerBien,
  fetchBiensParCategorie,
} from '../api/biens.api'
import { syncDepuisSicom, syncBien } from '../api/sicom.api'
import type { BienFiltres, BienInput } from '../types'

const INVALIDS = ['biens']

export function useBiens(filtres: BienFiltres = {}) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey:  ['biens', tenantId, filtres],
    queryFn:   () => fetchBiens(filtres, tenantId!),
    enabled:   !!tenantId && tenantId !== NATIONAL_TENANT_ID,
    staleTime: 60_000,
  })
}

export function useBien(id: string) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['bien', id, tenantId],
    queryFn:  () => fetchBien(id, tenantId!),
    enabled:  !!tenantId && tenantId !== NATIONAL_TENANT_ID && !!id,
  })
}

export function useBiensParCategorie() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey:  ['biens-categories', tenantId],
    queryFn:   () => fetchBiensParCategorie(tenantId!),
    enabled:   !!tenantId && tenantId !== NATIONAL_TENANT_ID,
    staleTime: 60_000,
  })
}

export function useCreerBien() {
  const { tenantId } = useTenant()
  const { profil }   = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BienInput) => creerBien(input, tenantId!, profil!.id),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['biens-categories'] })
      toast.success('Bien enregistré dans l\'inventaire.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Erreur : ${msg}`)
    },
  })
}

export function useModifierBien() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BienInput> }) =>
      modifierBien(id, tenantId!, input),
    onSuccess: (bien) => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['bien', bien.id] })
      toast.success('Bien modifié.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Erreur : ${msg}`)
    },
  })
}

export function useReformerBien() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, observations }: { id: string; observations: string }) =>
      reformerBien(id, tenantId!, observations),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['biens-categories'] })
      toast.success('Bien réformé — retiré de l\'inventaire actif.')
    },
    onError: () => toast.error('Impossible de réformer ce bien.'),
  })
}

export function useSyncSicom() {
  const { tenant, tenantId } = useTenant()
  const { profil }           = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => syncDepuisSicom(tenantId!, tenant!.code, profil!.id),
    onSuccess: (result) => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['biens-categories'] })
      const msg = `${result.synchronises} bien${result.synchronises > 1 ? 's' : ''} synchronisé${result.synchronises > 1 ? 's' : ''}, ${result.crees} créé${result.crees > 1 ? 's' : ''}`
      if (result.erreurs.length > 0) {
        toast.error(`Sync partielle — ${msg}. ${result.erreurs.length} erreur(s).`)
      } else {
        toast.success(`SICOM — ${msg}.`)
      }
    },
    onError: () => toast.error('Erreur de synchronisation SICOM.'),
  })
}

export function useSyncBien() {
  const { tenantId } = useTenant()
  const { profil }   = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bienId: string) => syncBien(bienId, tenantId!, profil!.id),
    onSuccess: (_data, bienId) => {
      qc.invalidateQueries({ queryKey: ['bien', bienId] })
      toast.success('Bien synchronisé avec SICOM.')
    },
    onError: () => toast.error('Erreur de synchronisation SICOM.'),
  })
}
