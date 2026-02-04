import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('loads successfully', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('displays main heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('has navigation links', async ({ page }) => {
    await page.goto('/')
    // Check that at least one link is present
    const links = page.locator('nav a')
    await expect(links.first()).toBeVisible()
  })
})
