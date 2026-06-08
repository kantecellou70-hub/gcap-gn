import { authenticator } from 'otplib'
import type { Page } from '@playwright/test'

export async function generateTestTotp(secret: string): Promise<string> {
  if (!secret) throw new Error('Secret TOTP vide — impossible de générer un code')
  return authenticator.generate(secret)
}

export async function fillOtpInput(page: Page, code: string): Promise<void> {
  const digits = code.split('')
  const inputs = page.locator('[data-otp-input]')
  const count  = await inputs.count()

  if (count === 6) {
    for (let i = 0; i < digits.length; i++) {
      await inputs.nth(i).fill(digits[i])
    }
  } else {
    // Fallback : champ OTP unique
    const single = page.getByRole('textbox', { name: /code/i }).first()
    await single.fill(code)
  }
}
