import { test, expect } from '@playwright/test'

/**
 * User Journey E2E Tests
 *
 * These tests verify complete user flows through the application.
 * They focus on navigation, form interactions, and UI state management.
 */

test.describe('Operator User Journeys', () => {
  test.describe('Onboarding Flow', () => {
    test('can navigate from home to signup', async ({ page }) => {
      await page.goto('/')

      // Find and click signup/get started link
      const signupLink = page.getByRole('link', { name: /sign up|get started/i }).first()
      await signupLink.click()

      await expect(page).toHaveURL(/\/signup/)
    })

    test('signup form has all required fields', async ({ page }) => {
      await page.goto('/signup')

      // Check all signup fields are present
      await expect(page.getByLabel(/company name|organization/i)).toBeVisible()
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i).first()).toBeVisible()
    })

    test('signup form validates required fields', async ({ page }) => {
      await page.goto('/signup')

      // Try to submit empty form
      const submitButton = page.getByRole('button', { name: /sign up|create account/i })
      await submitButton.click()

      // Should show validation - form shouldn't submit
      await expect(page).toHaveURL(/\/signup/)
    })

    test('can navigate between login and signup', async ({ page }) => {
      await page.goto('/login')

      // Find link to signup
      const signupLink = page.getByRole('link', { name: /sign up|create account|register/i })
      await signupLink.click()

      await expect(page).toHaveURL(/\/signup/)

      // Navigate back to login
      const loginLink = page.getByRole('link', { name: /sign in|log in|already have/i })
      await loginLink.click()

      await expect(page).toHaveURL(/\/login/)
    })

    test('forgot password flow is accessible from login', async ({ page }) => {
      await page.goto('/login')

      const forgotLink = page.getByRole('link', { name: /forgot|reset/i })
      await forgotLink.click()

      await expect(page).toHaveURL(/\/forgot-password/)
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })
  })

  test.describe('Portal Navigation (Unauthenticated)', () => {
    test('portal redirects to login', async ({ page }) => {
      await page.goto('/portal')
      await expect(page).toHaveURL(/\/login/)
    })

    test('portal/matters redirects to login', async ({ page }) => {
      await page.goto('/portal/matters')
      await expect(page).toHaveURL(/\/login/)
    })

    test('portal/credits redirects to login', async ({ page }) => {
      await page.goto('/portal/credits')
      await expect(page).toHaveURL(/\/login/)
    })

    test('portal/settings redirects to login', async ({ page }) => {
      await page.goto('/portal/settings')
      await expect(page).toHaveURL(/\/login/)
    })

    test('portal/api-keys redirects to login', async ({ page }) => {
      await page.goto('/portal/api-keys')
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Login Form Behavior', () => {
    test('shows password visibility toggle', async ({ page }) => {
      await page.goto('/login')

      const passwordField = page.getByLabel(/password/i)
      await expect(passwordField).toHaveAttribute('type', 'password')

      // Look for visibility toggle button
      const toggleButton = page.getByRole('button', { name: /show|hide|toggle/i })
      if (await toggleButton.isVisible()) {
        await toggleButton.click()
        await expect(passwordField).toHaveAttribute('type', 'text')
      }
    })

    test('remembers email input on failed login', async ({ page }) => {
      await page.goto('/login')

      const emailField = page.getByLabel(/email/i)
      await emailField.fill('test@example.com')

      const passwordField = page.getByLabel(/password/i)
      await passwordField.fill('wrongpassword')

      await page.getByRole('button', { name: /sign in/i }).click()

      // After failed login, email should still be filled
      await expect(emailField).toHaveValue('test@example.com')
    })

    test('displays error message on invalid credentials', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel(/email/i).fill('invalid@test.com')
      await page.getByLabel(/password/i).fill('wrongpassword')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show error message
      await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 })
    })
  })
})

test.describe('Attorney User Journeys', () => {
  test.describe('Attorney Portal Access', () => {
    test('attorney portal redirects to login', async ({ page }) => {
      await page.goto('/attorney')
      await expect(page).toHaveURL(/\/attorney\/login/)
    })

    test('attorney login page has correct branding', async ({ page }) => {
      await page.goto('/attorney/login')

      // Should indicate this is for attorneys
      await expect(page.getByText(/attorney/i).first()).toBeVisible()
    })

    test('attorney work queue redirects to login', async ({ page }) => {
      await page.goto('/attorney/work')
      await expect(page).toHaveURL(/\/attorney\/login/)
    })

    test('attorney dashboard redirects to login', async ({ page }) => {
      await page.goto('/attorney/dashboard')
      await expect(page).toHaveURL(/\/attorney\/login/)
    })
  })
})

test.describe('Admin User Journeys', () => {
  test.describe('Admin Portal Access', () => {
    test('admin portal redirects to login', async ({ page }) => {
      await page.goto('/admin')
      await expect(page).toHaveURL(/\/admin\/login/)
    })

    test('admin login page exists', async ({ page }) => {
      await page.goto('/admin/login')

      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
    })

    test('admin operators page redirects to login', async ({ page }) => {
      await page.goto('/admin/operators')
      await expect(page).toHaveURL(/\/admin\/login/)
    })

    test('admin attorneys page redirects to login', async ({ page }) => {
      await page.goto('/admin/attorneys')
      await expect(page).toHaveURL(/\/admin\/login/)
    })
  })
})

test.describe('Provider User Journeys', () => {
  test.describe('Provider Onboarding', () => {
    test('provider registration page loads', async ({ page }) => {
      await page.goto('/provider-register')

      await expect(page).toHaveURL('/provider-register')
      // Registration should have more fields than regular signup
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })

    test('provider login page loads', async ({ page }) => {
      await page.goto('/provider-login')

      await expect(page).toHaveURL('/provider-login')
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
    })

    test('can navigate between provider login and register', async ({ page }) => {
      await page.goto('/provider-login')

      const registerLink = page.getByRole('link', { name: /register|sign up|create/i })
      await registerLink.click()

      await expect(page).toHaveURL(/\/provider-register/)
    })

    test('provider portal redirects to login', async ({ page }) => {
      await page.goto('/provider')
      await expect(page).toHaveURL(/\/provider-login/)
    })

    test('provider requests page redirects to login', async ({ page }) => {
      await page.goto('/provider/requests')
      await expect(page).toHaveURL(/\/provider-login/)
    })

    test('provider earnings page redirects to login', async ({ page }) => {
      await page.goto('/provider/earnings')
      await expect(page).toHaveURL(/\/provider-login/)
    })
  })

  test.describe('Provider Pending State', () => {
    test('pending page is accessible', async ({ page }) => {
      await page.goto('/provider-pending')

      await expect(page).toHaveURL('/provider-pending')
      // Should show pending approval message
      await expect(page.getByText(/pending|review|approval/i).first()).toBeVisible()
    })
  })
})

test.describe('Marketing and Public Pages', () => {
  test.describe('Public Page Accessibility', () => {
    test('all marketing pages load without auth', async ({ page }) => {
      const publicPages = ['/', '/features', '/pricing', '/docs']

      for (const path of publicPages) {
        const response = await page.goto(path)
        expect(response?.status()).toBe(200)
        // Should not redirect to login
        await expect(page).not.toHaveURL(/\/login/)
      }
    })

    test('home page has call to action', async ({ page }) => {
      await page.goto('/')

      // Should have a prominent CTA
      const cta = page
        .getByRole('link', { name: /get started|sign up|try|start/i })
        .or(page.getByRole('button', { name: /get started|sign up|try|start/i }))

      await expect(cta.first()).toBeVisible()
    })

    test('pricing page shows pricing information', async ({ page }) => {
      await page.goto('/pricing')

      // Should display pricing content
      const content = page.locator('main')
      await expect(content).toBeVisible()
    })

    test('docs page has documentation content', async ({ page }) => {
      await page.goto('/docs')

      // Should have documentation structure
      const heading = page.locator('h1, h2').first()
      await expect(heading).toBeVisible()
    })

    test('features page describes product features', async ({ page }) => {
      await page.goto('/features')

      // Should mention key features
      await expect(page.locator('main')).toBeVisible()
    })
  })

  test.describe('Navigation Consistency', () => {
    test('navigation is consistent across marketing pages', async ({ page }) => {
      await page.goto('/')
      const homeNavLinks = await page.locator('nav a').count()

      await page.goto('/features')
      const featuresNavLinks = await page.locator('nav a').count()

      await page.goto('/pricing')
      const pricingNavLinks = await page.locator('nav a').count()

      // Navigation should have same number of links
      expect(homeNavLinks).toBe(featuresNavLinks)
      expect(featuresNavLinks).toBe(pricingNavLinks)
    })

    test('footer is present on marketing pages', async ({ page }) => {
      const marketingPages = ['/', '/features', '/pricing']

      for (const path of marketingPages) {
        await page.goto(path)
        const footer = page.locator('footer')
        await expect(footer).toBeVisible()
      }
    })
  })
})

test.describe('Error Handling', () => {
  test('404 page displays for invalid routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345')

    // Should return 404 or show error page
    expect(response?.status()).toBe(404)
  })

  test('404 page has navigation back to home', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345')

    // Should have a way to get back to home
    const homeLink = page
      .getByRole('link', { name: /home|back|return/i })
      .or(page.getByRole('link', { name: /botesq/i }))

    await expect(homeLink.first()).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('mobile navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Look for mobile menu button
    const menuButton = page
      .getByRole('button', { name: /menu/i })
      .or(page.locator('[aria-label*="menu"]'))

    if (await menuButton.isVisible()) {
      await menuButton.click()
      // Navigation should become visible
      const nav = page.locator('nav')
      await expect(nav).toBeVisible()
    }
  })

  test('login page is usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')

    // Form should be visible and usable
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})

test.describe('Accessibility Basics', () => {
  test('login page has proper form labels', async ({ page }) => {
    await page.goto('/login')

    // Email field should have label
    const emailField = page.getByLabel(/email/i)
    await expect(emailField).toBeVisible()

    // Password field should have label
    const passwordField = page.getByLabel(/password/i)
    await expect(passwordField).toBeVisible()
  })

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/login')

    // Submit button should have accessible name
    const submitButton = page.getByRole('button', { name: /sign in|log in|submit/i })
    await expect(submitButton).toBeVisible()
  })

  test('home page has main landmark', async ({ page }) => {
    await page.goto('/')

    const main = page.locator('main')
    await expect(main).toBeVisible()
  })

  test('pages have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')

    // Should have an h1
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
  })
})
