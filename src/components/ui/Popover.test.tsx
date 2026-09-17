// Popover — the Level-2 disclosure's accessibility contract.

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Popover, InfoButton, PopoverText } from './Popover'

function Subject() {
  return (
    <div>
      <Popover label="About the thing" trigger={(p) => <InfoButton what="the thing" {...p} />}>
        <PopoverText>An explanation.</PopoverText>
      </Popover>
      <button type="button">elsewhere</button>
    </div>
  )
}

afterEach(cleanup)

describe('Popover', () => {
  it('is closed by default and the trigger is wired', () => {
    render(<Subject />)
    const t = screen.getByRole('button', { name: 'About the thing' })
    expect(t.getAttribute('aria-expanded')).toBe('false')
    expect(t.getAttribute('aria-haspopup')).toBe('dialog')
    expect(t.getAttribute('aria-controls')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens on click, names the panel, and links it to the trigger', () => {
    render(<Subject />)
    const t = screen.getByRole('button', { name: 'About the thing' })
    fireEvent.click(t)
    const d = screen.getByRole('dialog', { name: 'About the thing' })
    expect(t.getAttribute('aria-expanded')).toBe('true')
    expect(d.id).toBe(t.getAttribute('aria-controls'))
    expect(d.textContent).toContain('An explanation.')
  })

  it('Escape closes it and returns focus to the trigger', () => {
    render(<Subject />)
    const t = screen.getByRole('button', { name: 'About the thing' })
    fireEvent.click(t)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(t)
  })

  it('an outside mousedown closes it', () => {
    render(<Subject />)
    fireEvent.click(screen.getByRole('button', { name: 'About the thing' }))
    fireEvent.mouseDown(screen.getByRole('button', { name: 'elsewhere' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a mousedown inside the panel keeps it open', () => {
    render(<Subject />)
    fireEvent.click(screen.getByRole('button', { name: 'About the thing' }))
    fireEvent.mouseDown(screen.getByText('An explanation.'))
    expect(screen.queryByRole('dialog')).not.toBeNull()
  })
})
