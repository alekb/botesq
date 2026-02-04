import { vi } from 'vitest'

// Set required environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NODE_ENV = 'test'

// Mock process.exit to prevent tests from exiting
vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
  throw new Error(`process.exit unexpectedly called with "${code}"`)
}) as () => never)
