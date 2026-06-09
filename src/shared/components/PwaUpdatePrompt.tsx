import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const [show, setShow] = useState(false)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      setShow(true)
    },
  })

  useEffect(() => {
    if (needRefresh) setShow(true)
  }, [needRefresh])

  if (!show) return null

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex items-center justify-between bg-indigo-900 px-4 py-2 text-xs text-white"
      style={{ minHeight: 36 }}
    >
      <span>Une mise à jour est disponible</span>
      <div className="flex items-center gap-3 ml-4">
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded bg-white px-3 py-1 text-xs font-semibold text-indigo-900 hover:bg-indigo-50"
        >
          Mettre à jour
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="text-indigo-200 hover:text-white"
          aria-label="Ignorer"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
