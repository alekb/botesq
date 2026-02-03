import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from '../app/page'

describe('Home page', () => {
  it('renders the heading', () => {
    render(<Home />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('BotEsq')
  })

  it('renders the tagline', () => {
    render(<Home />)
    const tagline = screen.getByText(/licensed legal services for ai agents/i)
    expect(tagline).toBeInTheDocument()
  })

  it('has proper styling classes', () => {
    render(<Home />)
    const main = document.querySelector('main')
    expect(main).toHaveClass('flex', 'min-h-screen')
  })
})
