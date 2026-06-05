import { useRef } from 'react'
import { Paperclip, Trash2, FileText, Image, File, Upload, Loader2 } from 'lucide-react'
import { useUploadPieceJointe, useSupprimerPieceJointe } from '../hooks/useEngagements'
import type { PieceJointe } from '../types'

const TAILLE_MAX = 10 * 1024 * 1024 // 10 Mo
const TYPES_ACCEPTES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

function iconeType(type: string) {
  if (type === 'application/pdf')          return <FileText size={14} className="text-red-500" />
  if (type.startsWith('image/'))           return <Image size={14} className="text-blue-500" />
  return <File size={14} className="text-slate-400" />
}

function formatTaille(octets: number): string {
  if (octets < 1024)        return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

interface PiecesJointesCardProps {
  engagementId: string
  pieces: PieceJointe[]
  readOnly?: boolean
}

export function PiecesJointesCard({ engagementId, pieces, readOnly = false }: PiecesJointesCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload   = useUploadPieceJointe()
  const suppr    = useSupprimerPieceJointe()

  function handleFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      if (file.size > TAILLE_MAX) {
        alert(`"${file.name}" dépasse la limite de 10 Mo.`)
        continue
      }
      if (!TYPES_ACCEPTES.includes(file.type)) {
        alert(`"${file.name}" — type non accepté (PDF, images, Word, Excel).`)
        continue
      }
      upload.mutate({ engagementId, file, piecesActuelles: pieces })
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Paperclip size={15} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">
          Pièces jointes
          {pieces.length > 0 && (
            <span className="ml-2 rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-medium">
              {pieces.length}
            </span>
          )}
        </h3>
      </div>

      {/* Liste des pièces existantes */}
      {pieces.length > 0 && (
        <ul className="mb-4 space-y-2">
          {pieces.map((p) => (
            <li key={p.url}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                {iconeType(p.type)}
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline truncate max-w-[220px]"
                >
                  {p.nom}
                </a>
                <span className="text-xs text-slate-400 shrink-0">{formatTaille(p.taille)}</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => suppr.mutate({ engagementId, pieceUrl: p.url, piecesActuelles: pieces })}
                  disabled={suppr.isPending}
                  className="shrink-0 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
                  title="Supprimer"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Zone de dépôt */}
      {!readOnly && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-slate-200 p-4 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            {upload.isPending ? (
              <div className="flex items-center justify-center gap-2 text-indigo-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Envoi en cours…</span>
              </div>
            ) : (
              <>
                <Upload size={18} className="mx-auto mb-1 text-slate-400" />
                <p className="text-xs text-slate-500">
                  Glisser-déposer ou <span className="text-indigo-600 font-medium">parcourir</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">PDF, images, Word, Excel — 10 Mo max</p>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </>
      )}

      {readOnly && pieces.length === 0 && (
        <p className="text-xs text-slate-400">Aucune pièce jointe.</p>
      )}
    </div>
  )
}
