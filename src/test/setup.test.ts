import { describe, it, expect } from 'vitest'

describe('GCAP-GN — Setup', () => {
  it('environnement de test opérationnel', () => {
    expect(true).toBe(true)
  })

  it('cn utility disponible', async () => {
    const { cn } = await import('@/shared/lib/utils')
    expect(cn('foo', 'bar')).toBe('foo bar')
    const condition = false
    expect(cn('foo', condition && 'bar')).toBe('foo')
  })
})
