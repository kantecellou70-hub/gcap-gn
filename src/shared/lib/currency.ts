// formatGNF est défini dans utils.ts — importer depuis là
export { formatGNF } from './utils'

export function parseGNF(value: string): number {
  return parseInt(value.replace(/\D/g, ''), 10) || 0
}
