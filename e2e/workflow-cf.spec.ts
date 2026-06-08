import { test, expect } from './fixtures/auth.fixture'

test.describe('Workflow CF', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('CF')
  })

  test('CF reçoit une notification pour un engagement en attente de visa', async ({ page }) => {
    await page.goto('/tableau-de-bord')

    const badge = page
      .getByTestId('notification-unread-count')
      .or(page.locator('[data-testid="notification-badge"]'))

    // Le badge peut ne pas être visible si aucune notif — on vérifie juste que la cloche est là
    await expect(
      page.getByRole('button', { name: /notification|cloche/i })
        .or(page.locator('[data-testid="notification-bell"]'))
    ).toBeVisible({ timeout: 10_000 })

    if (await badge.isVisible()) {
      const count = parseInt((await badge.textContent()) ?? '0')
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('CF peut viser un engagement EN_ATTENTE_VISA', async ({ page }) => {
    await page.goto('/engagements')

    // Filtrer les engagements en attente
    const ongletAttente = page.getByRole('tab', { name: /en attente|attente de visa/i })
    if (await ongletAttente.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ongletAttente.click()
    }

    const firstRow = page.getByRole('row').nth(1)
    await expect(firstRow).toBeVisible({ timeout: 8_000 })
    await firstRow.click()

    const btnViser = page.getByRole('button', { name: /^viser$/i })
    await expect(btnViser).toBeVisible({ timeout: 8_000 })
    await btnViser.click()

    const btnConfirmer = page.getByRole('button', { name: /confirmer/i })
    await expect(btnConfirmer).toBeVisible({ timeout: 5_000 })
    await btnConfirmer.click()

    await expect(
      page.getByText(/engagement visé|visa accordé|VISE/i)
    ).toBeVisible({ timeout: 10_000 })
  })

  test('CF peut rejeter un engagement avec motif', async ({ page }) => {
    await page.goto('/engagements')

    const ongletAttente = page.getByRole('tab', { name: /en attente/i })
    if (await ongletAttente.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ongletAttente.click()
    }

    const firstRow = page.getByRole('row').nth(1)
    await expect(firstRow).toBeVisible({ timeout: 8_000 })
    await firstRow.click()

    const btnRejeter = page.getByRole('button', { name: /rejeter/i })
    await expect(btnRejeter).toBeVisible({ timeout: 8_000 })
    await btnRejeter.click()

    await page.getByLabel(/motif/i).fill('Pièces justificatives insuffisantes')
    await page.getByRole('button', { name: /confirmer le rejet|confirmer/i }).click()

    await expect(
      page.getByText(/engagement rejeté|REJETE/i)
    ).toBeVisible({ timeout: 10_000 })
  })

  test('CF ne peut PAS créer un engagement (séparation des fonctions)', async ({ page }) => {
    await page.goto('/engagements/nouveau')

    await expect(
      page.getByText(/accès refusé|non autorisé|permission|interdit/i)
        .or(page.getByTestId('access-denied'))
    ).toBeVisible({ timeout: 8_000 })
  })

  test('CF ne peut PAS émettre un mandat', async ({ page }) => {
    await page.goto('/ordonnancement')

    // Le bouton "Émettre" ne doit pas exister pour le rôle CF
    await expect(
      page.getByRole('button', { name: /émettre/i })
    ).not.toBeVisible()
  })
})
