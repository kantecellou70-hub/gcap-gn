import { test, expect } from '@playwright/test'

test.describe('Authentification', () => {
  test('Login avec email/password valide → dashboard', async ({ page }) => {
    const email    = process.env.PLAYWRIGHT_DAFF_EMAIL    ?? ''
    const password = process.env.PLAYWRIGHT_DAFF_PASSWORD ?? ''

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/mot de passe/i).fill(password)
    await page.getByRole('button', { name: /connexion/i }).click()

    await page.waitForURL(/\/(tableau-de-bord|dashboard)/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/(tableau-de-bord|dashboard)/)
  })

  test('Login avec mauvais password → message d\'erreur visible', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('inexistant@mefb.gov.gn')
    await page.getByLabel(/mot de passe/i).fill('mauvais-mot-de-passe-xyz')
    await page.getByRole('button', { name: /connexion/i }).click()

    await expect(
      page.getByText(/mot de passe incorrect|email ou mot de passe|identifiants invalides/i)
    ).toBeVisible({ timeout: 8_000 })
  })

  test('Accès direct à /budget sans login → redirection /login', async ({ page }) => {
    await page.goto('/budget')
    await page.waitForURL(/\/login/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('Accès direct à /engagements sans login → redirection /login', async ({ page }) => {
    await page.goto('/engagements')
    await page.waitForURL(/\/login/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('?reason=timeout → bandeau avertissement visible sur LoginPage', async ({ page }) => {
    await page.goto('/login?reason=timeout')
    await expect(
      page.getByText(/session expirée|déconnecté|inactivité/i)
    ).toBeVisible({ timeout: 5_000 })
  })

  test('Déconnexion redirige vers /login', async ({ page }) => {
    const email    = process.env.PLAYWRIGHT_DAFF_EMAIL    ?? ''
    const password = process.env.PLAYWRIGHT_DAFF_PASSWORD ?? ''

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/mot de passe/i).fill(password)
    await page.getByRole('button', { name: /connexion/i }).click()
    await page.waitForURL(/\/(tableau-de-bord|dashboard)/, { timeout: 15_000 })

    await page.getByRole('button', { name: /déconnexion|se déconnecter/i }).click()
    await page.waitForURL(/\/login/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
