import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Operator session
const SESSION_COOKIE_NAME = 'operator_session'
const PROTECTED_ROUTES = ['/portal']
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password']

// Provider session
const PROVIDER_SESSION_COOKIE_NAME = 'provider_session'
const PROVIDER_PROTECTED_ROUTES = ['/provider']
const PROVIDER_AUTH_ROUTES = [
  '/provider-login',
  '/provider-register',
  '/provider-forgot-password',
  '/provider-pending',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const operatorSession = request.cookies.get(SESSION_COOKIE_NAME)
  const providerSession = request.cookies.get(PROVIDER_SESSION_COOKIE_NAME)

  // Provider auth routes (check first to avoid matching /provider prefix)
  const isProviderAuthRoute = PROVIDER_AUTH_ROUTES.some((route) => pathname.startsWith(route))
  // Allow access to provider-pending even when logged in
  if (isProviderAuthRoute && pathname !== '/provider-pending' && providerSession) {
    return NextResponse.redirect(new URL('/provider', request.url))
  }

  // Provider route protection (only check if not an auth route)
  const isProviderProtectedRoute =
    !isProviderAuthRoute && PROVIDER_PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  if (isProviderProtectedRoute && !providerSession) {
    const loginUrl = new URL('/provider-login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Operator route protection
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  if (isProtectedRoute && !operatorSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Operator auth route redirect (if already logged in)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route)
  if (isAuthRoute && operatorSession) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
