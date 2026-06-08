import type { AuditFiltres } from '../types'

interface Props {
  filtres: AuditFiltres
  onChange: (f: AuditFiltres) => void
  onReset: () => void
  users: { id: string; email: string }[]
  actions: string[]
}

const TABLES_DISPONIBLES = [
  { value: 'engagements_depenses',  label: 'Engagements' },
  { value: 'liquidations',          label: 'Liquidations' },
  { value: 'mandats_paiement',      label: 'Mandats de paiement' },
  { value: 'recettes',              label: 'Recettes' },
  { value: 'lignes_budgetaires',    label: 'Lignes budgétaires' },
  { value: 'user_profiles',         label: 'Utilisateurs' },
  { value: 'exercices_budgetaires', label: 'Exercices budgétaires' },
]

const INPUT_CLS = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

export function AuditFiltersBar({ filtres, onChange, onReset, users, actions }: Props) {
  const hasActive = !!(filtres.search || filtres.action || filtres.tableName ||
                       filtres.userId || filtres.dateDebut || filtres.dateFin)

  function set(partial: Partial<AuditFiltres>) {
    onChange({ ...filtres, ...partial, page: 1 })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
      {/* Ligne 1 */}
      <div className="flex flex-wrap gap-3">
        <input
          value={filtres.search ?? ''}
          onChange={(e) => set({ search: e.target.value || undefined })}
          placeholder="Rechercher action, email, ID…"
          className={`flex-1 min-w-[200px] ${INPUT_CLS}`}
        />

        {actions.length > 0 && (
          <select
            aria-label="Filtrer par action"
            value={filtres.action ?? ''}
            onChange={(e) => set({ action: e.target.value || undefined })}
            className={INPUT_CLS}
          >
            <option value="">Toutes les actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}

        <select
          aria-label="Filtrer par table"
          value={filtres.tableName ?? ''}
          onChange={(e) => set({ tableName: e.target.value || undefined })}
          className={INPUT_CLS}
        >
          <option value="">Toutes les tables</option>
          {TABLES_DISPONIBLES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {users.length > 0 && (
          <select
            aria-label="Filtrer par utilisateur"
            value={filtres.userId ?? ''}
            onChange={(e) => set({ userId: e.target.value || undefined })}
            className={INPUT_CLS}
          >
            <option value="">Tous les utilisateurs</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
        )}
      </div>

      {/* Ligne 2 : dates + reset */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-xs text-slate-500 font-medium">Période :</label>
        <input
          type="date"
          value={filtres.dateDebut ?? ''}
          onChange={(e) => set({ dateDebut: e.target.value || undefined })}
          aria-label="Date de début"
          className={INPUT_CLS}
        />
        <span className="text-slate-400 text-sm">→</span>
        <input
          type="date"
          value={filtres.dateFin ?? ''}
          min={filtres.dateDebut ?? undefined}
          onChange={(e) => set({ dateFin: e.target.value || undefined })}
          aria-label="Date de fin"
          className={INPUT_CLS}
        />
        {hasActive && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Effacer filtres
          </button>
        )}
      </div>
    </div>
  )
}
