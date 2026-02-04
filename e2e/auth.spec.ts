import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.describe('Operator Auth', () => {
    test('login page loads', async ({ page }) => {
      await page.goto('/login')
      await expect(page).toHaveURL('/login')
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
    })

    test('signup page loads', async ({ page }) => {
      await page.goto('/signup')
      await expect(page).toHaveURL('/signup')
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })

    test('forgot password page loads', async ({ page }) => {
      await page.goto('/forgot-password')
      await expect(page).toHaveURL('/forgot-password')
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })

    test('shows validation error for empty login', async ({ page }) => {
      await page.goto('/login')
      await page.getByRole('button', { name: /sign in/i }).click()
      // Should show validation error (form won't submit with empty fields)
      await expect(page.getByLabel(/email/i)).toBeFocused()
    })

    test('redirects to login when accessing protected route', async ({ page }) => {
      await page.goto('/portal')
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Attorney Auth', () => {
    test('login page loads', async ({ page }) => {
      await page.goto('/attorney/login')
      await expect(page).toHaveURL('/attorney/login')
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })

    test('redirects to login when accessing protected route', async ({ page }) => {
      await page.goto('/attorney')
      await expect(page).toHaveURL(/\/attorney\/login/)
    })
  })

  test.describe('Admin Auth', () => {
    test('login page loads', async ({ page }) => {
      await page.goto('/admin/login')
      await expect(page).toHaveURL('/admin/login')
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })

    test('redirects to login when accessing protected route', async ({ page }) => {
      await page.goto('/admin')
      await expect(page).toHaveURL(/\/admin\/login/)
    })
  })

  test.describe('Provider Auth', () => {
    test('login page loads', async ({ page }) => {
      await page.goto('/provider-login')
      await expect(page).toHaveURL('/provider-login')
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })

    test('registration page loads', async ({ page }) => {
      await page.goto('/provider-register')
      await expect(page).toHaveURL('/provider-register')
    })

    test('redirects to login when accessing protected route', async ({ page }) => {
      await page.goto('/provider')
      await expect(page).toHaveURL(/\/provider-login/)
    })
  })
})
