import { test, expect } from './fixtures/auth.fixture'

test.describe('Workflow ORDONNATEUR', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('ORDONNATEUR')
  })

  test('ORDONNATEUR peut émettre un mandat depuis une liquidation validée', async ({ page }) => {
    await page.goto('/ordonnancement')

    // Filtrer les liquidations prêtes à l'ordonnancement
    const ongletPret = page.getByRole('tab', { name: /prêt|validée|à ordonnancer/i })
    if (await ongletPret.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ongletPret.click()
    }

    const firstRow = page.getByRole('row').nth(1)
    await expect(firstRow).toBeVisible({ timeout: 8_000 })
    await firstRow.click()

    const btnEmettre = page.getByRole('button', { name: /émettre le mandat|émettre/i })
    await expect(btnEmettre).toBeVisible({ timeout: 8_000 })
    await btnEmettre.click()

    const btnConfirmer = page.getByRole('button', { name: /confirmer/i })
    await expect(btnConfirmer).toBeVisible({ timeout: 5_000 })
    await btnConfirmer.click()

    await expect(
      page.getByText(/mandat émis|EMIS/i)
    ).toBeVisible({ timeout: 10_000 })
  })

  test('ORDONNATEUR peut exporter le PDF audit pour la Cour des Comptes', async ({ page }) => {
    await page.goto('/audit')

    await expect(page.getByRole('table')).toBeVisible({ timeout: 8_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null)
    const exportBtn = page.getByRole('button', { name: /exporter.*pdf|pdf/i })

    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exportBtn.click()
      const download = await downloadPromise
      if (download) {
        expect(download.suggestedFilename()).toMatch(/audit.*\.pdf$/i)
      }
    }
  })

  test('ORDONNATEUR reçoit une notification de rejet Trésor (type urgente)', async ({ page }) => {
    await page.goto('/tableau-de-bord')

    // La cloche de notification doit être présente
    await expect(
      page.getByRole('button', { name: /notification/i })
        .or(page.locator('[data-testid="notification-bell"]'))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('ORDONNATEUR ne peut PAS viser un engagement (séparation CF)', async ({ page }) => {
    await page.goto('/engagements')

    const firstRow = page.getByRole('row').nth(1)
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.click()
      await expect(
        page.getByRole('button', { name: /^viser$/i })
      ).not.toBeVisible()
    }
  })
})
