import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders the title', () => {
    render(<Modal title="My Title" onClose={() => {}}>content</Modal>)
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })

  it('renders children in the modal body', () => {
    render(<Modal title="T" onClose={() => {}}>hello world</Modal>)
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('calls onClose when the × button is clicked', () => {
    const onClose = vi.fn()
    render(<Modal title="T" onClose={onClose}>x</Modal>)
    fireEvent.click(screen.getByRole('button', { name: '×' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<Modal title="T" onClose={onClose}>x</Modal>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when clicking the overlay backdrop', () => {
    const onClose = vi.fn()
    const { container } = render(<Modal title="T" onClose={onClose}>x</Modal>)
    const overlay = container.querySelector('.modal-overlay')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when clicking inside the modal', () => {
    const onClose = vi.fn()
    render(<Modal title="T" onClose={onClose}>click me</Modal>)
    fireEvent.click(screen.getByText('click me'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders footer when provided', () => {
    render(
      <Modal title="T" onClose={() => {}} footer={<button>Save</button>}>
        body
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('does not render a footer section when footer is omitted', () => {
    const { container } = render(<Modal title="T" onClose={() => {}}>body</Modal>)
    expect(container.querySelector('.modal-footer')).not.toBeInTheDocument()
  })

  it('applies modal-lg class when size="lg"', () => {
    const { container } = render(
      <Modal title="T" onClose={() => {}} size="lg">body</Modal>,
    )
    expect(container.querySelector('.modal-lg')).toBeInTheDocument()
  })

  it('does not apply modal-lg class with default size', () => {
    const { container } = render(<Modal title="T" onClose={() => {}}>body</Modal>)
    expect(container.querySelector('.modal-lg')).not.toBeInTheDocument()
  })

  it('cleans up the keydown listener on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(<Modal title="T" onClose={onClose}>x</Modal>)
    unmount()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
