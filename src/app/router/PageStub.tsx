import { Construction } from 'lucide-react'

export function PageStub({ titre }: { titre: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <Construction size={40} strokeWidth={1.5} className="mb-3" />
      <p className="text-lg font-medium text-slate-500">{titre}</p>
      <p className="text-sm mt-1">Module en cours de développement</p>
    </div>
  )
}
