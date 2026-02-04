/**
 * Provider Integration Framework
 *
 * This module provides the abstraction layer for routing legal service requests
 * to appropriate providers - either the internal BotEsq AI or external third-party providers.
 */

export * from './types'
export { internalProvider } from './internal-provider'
export { ExternalProviderAdapter } from './external-adapter'
export { routingService } from './routing-service'
