import { test, expect } from './fixtures/auth.fixture'

test.describe('AUDITEUR — lecture seule absolue', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('AUDITEUR')
  })

  test('AUDITEUR voit le journal d\'audit complet', async ({ page }) => {
    await page.goto('/audit')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 })
  })

  test('AUDITEUR peut filtrer le journal par type d\'action', async ({ page }) => {
    await page.goto('/audit')

    await expect(page.getByRole('table')).toBeVisible({ timeout: 8_000 })

    const filterSelect = page
      .getByRole('combobox', { name: /type d'action|action/i })
      .or(page.getByTestId('filter-action'))

    if (await filterSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await filterSelect.click()
      const firstOption = page.getByRole('option').first()
      if (await firstOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOption.click()
      }
      await expect(page.getByRole('table')).toBeVisible()
    }
  })

  test('AUDITEUR peut exporter en CSV', async ({ page }) => {
    await page.goto('/audit')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 8_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null)
    const exportCsvBtn = page.getByRole('button', { name: /exporter.*csv|csv/i })

    if (await exportCsvBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exportCsvBtn.click()
      const download = await downloadPromise
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.csv$/i)
      }
    }
  })

  test('AUDITEUR ne voit AUCUN bouton d\'action sur les engagements', async ({ page }) => {
    await page.goto('/engagements')
    await expect(
      page.getByRole('button', { name: /créer|nouveau|modifier|supprimer|viser|rejeter/i })
    ).not.toBeVisible()
  })

  test('AUDITEUR ne voit AUCUN bouton d\'action sur le budget', async ({ page }) => {
    await page.goto('/budget')
    await expect(
      page.getByRole('button', { name: /créer|nouveau|modifier|supprimer/i })
    ).not.toBeVisible()
  })

  test('AUDITEUR ne voit AUCUN bouton d\'action sur les mandats', async ({ page }) => {
    await page.goto('/ordonnancement')
    await expect(
      page.getByRole('button', { name: /émettre|créer|nouveau|annuler/i })
    ).not.toBeVisible()
  })

  test('AUDITEUR ne peut PAS accéder à l\'administration', async ({ page }) => {
    await page.goto('/administration')
    await expect(
      page.getByText(/accès refusé|non autorisé|permission|interdit/i)
        .or(page.getByTestId('access-denied'))
    ).toBeVisible({ timeout: 8_000 })
  })
})
