import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTenant } from '@/app/contexts/TenantContext'
import {
  fetchAuditLogs,
  fetchAuditUsers,
  fetchAuditActions,
  fetchAuditForExport,
} from '../api/audit-api'
import { exportAuditCsv, exportAuditPdf } from '../lib/auditExport'
import type { AuditFiltres } from '../types'

const EMPTY_FILTRES: AuditFiltres = {}

export function useAuditLog(filtres: AuditFiltres = EMPTY_FILTRES) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey:  ['audit-log', tenantId, filtres],
    queryFn:   () => fetchAuditLogs(filtres, tenantId!),
    enabled:   !!tenantId,
    staleTime: 60_000,
  })
}

export function useAuditUsers() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey:  ['audit-users', tenantId],
    queryFn:   () => fetchAuditUsers(tenantId!),
    enabled:   !!tenantId,
    staleTime: 300_000,
  })
}

export function useAuditActions() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey:  ['audit-actions', tenantId],
    queryFn:   () => fetchAuditActions(tenantId!),
    enabled:   !!tenantId,
    staleTime: 300_000,
  })
}

export function useAuditExport(filtres: AuditFiltres) {
  const { tenantId, tenant } = useTenant()
  const [isExporting, setIsExporting] = useState(false)
  const [pdfWarning, setPdfWarning] = useState(false)

  const exportCsv = useCallback(async () => {
    if (!tenantId) return
    setIsExporting(true)
    try {
      const entries = await fetchAuditForExport(tenantId, filtres)
      await exportAuditCsv(entries, tenant?.nom ?? tenantId)
    } catch (err) {
      console.error('[audit] export CSV échoué:', err)
    } finally {
      setIsExporting(false)
    }
  }, [tenantId, tenant, filtres])

  const exportPdf = useCallback(async () => {
    if (!tenantId) return
    setIsExporting(true)
    setPdfWarning(false)
    try {
      const entries = await fetchAuditForExport(tenantId, filtres)
      const { truncated } = await exportAuditPdf(entries, tenant?.nom ?? tenantId, filtres)
      if (truncated) setPdfWarning(true)
    } catch (err) {
      console.error('[audit] export PDF échoué:', err)
    } finally {
      setIsExporting(false)
    }
  }, [tenantId, tenant, filtres])

  return { exportCsv, exportPdf, isExporting, pdfWarning, clearPdfWarning: () => setPdfWarning(false) }
}
