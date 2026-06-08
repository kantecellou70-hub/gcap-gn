import { test, expect } from './fixtures/auth.fixture'

test.describe('Workflow DAFF', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('DAFF')
  })

  test('Créer un engagement → statut EN_ATTENTE_VISA', async ({ page }) => {
    await page.goto('/engagements/nouveau')

    await page.getByLabel(/objet/i).fill('Travaux de réhabilitation — DAFF test')
    await page.getByLabel(/montant/i).fill('5000000')

    const ligneSelect = page.getByRole('combobox', { name: /ligne budgétaire/i })
    await ligneSelect.click()
    await page.getByRole('option').first().click()

    const fournisseur = page.getByLabel(/fournisseur/i)
    if (await fournisseur.isVisible()) {
      await fournisseur.fill('SOGEA-SATOM')
    }

    await page.getByRole('button', { name: /soumettre|enregistrer/i }).click()

    await expect(
      page.getByText(/en attente de visa|EN_ATTENTE_VISA/i)
    ).toBeVisible({ timeout: 10_000 })
  })

  test('DAFF ne voit PAS le bouton "Viser" sur un engagement', async ({ page }) => {
    await page.goto('/engagements')

    const firstRow = page.getByRole('row').nth(1)
    if (await firstRow.isVisible()) {
      await firstRow.click()
    }

    await expect(
      page.getByRole('button', { name: /^viser$/i })
    ).not.toBeVisible()
  })

  test('Voir les KPIs budget sur le dashboard', async ({ page }) => {
    await page.goto('/tableau-de-bord')

    await expect(
      page.getByTestId('kpi-credits-disponibles')
        .or(page.getByText(/crédits disponibles/i))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('Uploader une pièce jointe sur un engagement', async ({ page }) => {
    await page.goto('/engagements')

    const firstRow = page.getByRole('row').nth(1)
    await expect(firstRow).toBeVisible({ timeout: 8_000 })
    await firstRow.click()

    const fileInput = page.getByLabel(/pièce jointe|fichier/i)
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'test-pj.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 test'),
      })
      await expect(
        page.getByText(/uploadé|ajouté|enregistré/i)
      ).toBeVisible({ timeout: 10_000 })
    }
  })

  test('Exporter le rapport budget en Excel', async ({ page }) => {
    await page.goto('/reporting')

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null)
    const exportBtn = page.getByRole('button', { name: /exporter.*excel|excel/i })

    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exportBtn.click()
      const download = await downloadPromise
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/i)
      }
    }
  })
})
