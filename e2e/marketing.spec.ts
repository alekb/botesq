import { test, expect } from '@playwright/test'

test.describe('Marketing Pages', () => {
  test.describe('Home Page', () => {
    test('loads successfully', async ({ page }) => {
      const response = await page.goto('/')
      expect(response?.status()).toBe(200)
    })

    test('displays hero section', async ({ page }) => {
      await page.goto('/')
      // Check for main heading
      await expect(page.locator('h1').first()).toBeVisible()
    })

    test('displays navigation', async ({ page }) => {
      await page.goto('/')
      // Check nav exists with links
      const nav = page.locator('nav')
      await expect(nav.first()).toBeVisible()
    })
  })

  test.describe('Features Page', () => {
    test('loads successfully', async ({ page }) => {
      await page.goto('/features')
      await expect(page).toHaveURL('/features')
    })

    test('displays feature categories', async ({ page }) => {
      await page.goto('/features')
      await expect(page.getByText('Legal Q&A')).toBeVisible()
    })
  })

  test.describe('Pricing Page', () => {
    test('loads successfully', async ({ page }) => {
      const response = await page.goto('/pricing')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveURL('/pricing')
    })

    test('displays pricing content', async ({ page }) => {
      await page.goto('/pricing')
      // Check page has content
      const main = page.locator('main')
      await expect(main).toBeVisible()
    })
  })

  test.describe('Docs Page', () => {
    test('loads successfully', async ({ page }) => {
      const response = await page.goto('/docs')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveURL('/docs')
    })

    test('displays documentation content', async ({ page }) => {
      await page.goto('/docs')
      // Check page has content (heading or body text)
      const heading = page.locator('h1, h2').first()
      await expect(heading).toBeVisible()
    })
  })
})
