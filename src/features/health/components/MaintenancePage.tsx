// Composant 100 % statique — AUCUN appel Supabase ni API.
// Peut s'afficher même si Supabase est totalement indisponible.
// Contrôlé par VITE_MAINTENANCE_MODE=true et VITE_MAINTENANCE_END_TIME.

const APP_NAME    = import.meta.env.VITE_APP_NAME    ?? 'GCAP-GN'
const END_TIME    = import.meta.env.VITE_MAINTENANCE_END_TIME ?? ''
const SUPPORT_EMAIL = 'support@lynxa.tech'

function parseEndTime(raw: string): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('fr-GN', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(d)
}

// Bandeau tricolore guinéen (rouge - jaune - vert)
function GuineanFlag() {
  return (
    <div className="flex h-1.5 w-24 overflow-hidden rounded-full" aria-hidden="true">
      <div className="flex-1 bg-red-600" />
      <div className="flex-1 bg-yellow-400" />
      <div className="flex-1 bg-green-600" />
    </div>
  )
}

export function MaintenancePage() {
  const endTime = parseEndTime(END_TIME)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {/* Logo / identité */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white select-none">G</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{APP_NAME}</h1>
            <p className="text-sm text-slate-500">Gestion Comptable Administrative Publique</p>
          </div>
          <GuineanFlag />
        </div>

        {/* Message principal */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm mb-6">
          {/* Icône maintenance */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.653-4.655m5.8-4.273.48-.486a2.418 2.418 0 0 0 0-3.417l-1.53-1.53a2.418 2.418 0 0 0-3.417 0l-.486.48"
              />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Maintenance en cours
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            L'application est temporairement indisponible pour des opérations
            de maintenance. Vos données sont en sécurité.
          </p>

          {endTime && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm">
              <p className="text-indigo-700 font-medium">Reprise estimée</p>
              <p className="text-indigo-600 mt-0.5">{endTime}</p>
            </div>
          )}
        </div>

        {/* Contact support */}
        <div className="text-sm text-slate-500">
          <p>
            Pour toute urgence, contactez&nbsp;:&nbsp;
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-indigo-600 hover:underline font-medium"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-slate-400">
          LYNXA SARL — Conakry, République de Guinée
        </p>
      </div>
    </div>
  )
}
