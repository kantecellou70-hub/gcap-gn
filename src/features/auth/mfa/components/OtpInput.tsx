import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react'
import { cn } from '@/shared/lib/utils'

interface OtpInputProps {
  length?: number
  onComplete: (code: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
}

export function OtpInput({ length = 6, onComplete, disabled = false, error = false, autoFocus = false }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  function getValue(): string {
    return inputsRef.current.map((el) => el?.value ?? '').join('')
  }

  function focusAt(index: number) {
    const el = inputsRef.current[index]
    if (el) {
      el.focus()
      el.select()
    }
  }

  function handleChange(index: number) {
    const el = inputsRef.current[index]
    if (!el) return
    const val = el.value.replace(/\D/g, '')
    el.value = val.slice(-1)

    if (val && index < length - 1) {
      focusAt(index + 1)
    }

    const full = getValue()
    if (full.length === length) {
      onComplete(full)
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const el = inputsRef.current[index]
      if (el?.value) {
        el.value = ''
      } else if (index > 0) {
        const prev = inputsRef.current[index - 1]
        if (prev) {
          prev.value = ''
          focusAt(index - 1)
        }
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) focusAt(index - 1)
    if (e.key === 'ArrowRight' && index < length - 1) focusAt(index + 1)
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    pasted.split('').forEach((char, i) => {
      const el = inputsRef.current[i]
      if (el) el.value = char
    })
    const nextEmpty = pasted.length < length ? pasted.length : length - 1
    focusAt(nextEmpty)
    if (pasted.length === length) {
      onComplete(pasted)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={() => handleChange(i)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            'w-10 h-12 rounded-lg border text-center text-lg font-mono font-semibold text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
          )}
        />
      ))}
    </div>
  )
}
