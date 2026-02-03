import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('displays the BotEsq heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('BotEsq')
  })

  test('displays the tagline', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Licensed legal services for AI agents')).toBeVisible()
  })

  test('has proper page title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
  })
})
