import { test as base, type Page } from '@playwright/test'
import { generateTestTotp, fillOtpInput } from '../helpers/totp'

// Comptes de test configurés via variables d'environnement (.env.local)
// PLAYWRIGHT_DAFF_EMAIL / PLAYWRIGHT_DAFF_PASSWORD
// PLAYWRIGHT_CF_EMAIL / PLAYWRIGHT_CF_PASSWORD
// PLAYWRIGHT_ORDONNATEUR_EMAIL / PLAYWRIGHT_ORDONNATEUR_PASSWORD
// PLAYWRIGHT_SAFF_EMAIL / PLAYWRIGHT_SAFF_PASSWORD
// PLAYWRIGHT_AUDITEUR_EMAIL / PLAYWRIGHT_AUDITEUR_PASSWORD
// PLAYWRIGHT_TOTP_SECRET_ORDONNATEUR / PLAYWRIGHT_TOTP_SECRET_CF

export type TestRole = 'DAFF' | 'CF' | 'ORDONNATEUR' | 'SAFF' | 'AUDITEUR'

interface AuthFixtures {
  loginAs: (role: TestRole) => Promise<void>
}

export const test = base.extend<AuthFixtures>({
  loginAs: async ({ page }: { page: Page }, use: (fn: (role: TestRole) => Promise<void>) => Promise<void>) => {
    const loginAs = async (role: TestRole) => {
      const email    = process.env[`PLAYWRIGHT_${role}_EMAIL`]    ?? ''
      const password = process.env[`PLAYWRIGHT_${role}_PASSWORD`] ?? ''

      if (!email || !password) {
        throw new Error(
          `Variables manquantes : PLAYWRIGHT_${role}_EMAIL et PLAYWRIGHT_${role}_PASSWORD`
        )
      }

      await page.goto('/login')
      await page.getByLabel(/email/i).fill(email)
      await page.getByLabel(/mot de passe/i).fill(password)
      await page.getByRole('button', { name: /connexion/i }).click()

      // Attendre dashboard ou challenge MFA
      await page.waitForURL(/\/(tableau-de-bord|dashboard|mfa)/, { timeout: 15_000 })

      // Gérer MFA si présent (ORDONNATEUR, CF)
      if (page.url().includes('/mfa')) {
        const secret = process.env[`PLAYWRIGHT_TOTP_SECRET_${role}`]
        if (!secret) {
          throw new Error(`PLAYWRIGHT_TOTP_SECRET_${role} non défini — requis pour les rôles MFA`)
        }
        const code = await generateTestTotp(secret)
        await fillOtpInput(page, code)
        await page.getByRole('button', { name: /vérifier/i }).click()
        await page.waitForURL(/\/(tableau-de-bord|dashboard)/, { timeout: 10_000 })
      }
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture API, not a React hook
    await use(loginAs)
  },
})

export { expect } from '@playwright/test'
