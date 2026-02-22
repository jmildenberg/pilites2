import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './ToastContext'

function ErrorTrigger() {
  const { toastError } = useToast()
  return <button onClick={() => toastError('something went wrong')}>trigger error</button>
}

function SuccessTrigger() {
  const { toastSuccess } = useToast()
  return <button onClick={() => toastSuccess('saved!')}>trigger success</button>
}

describe('ToastProvider', () => {
  it('shows an error toast when toastError is called', async () => {
    render(
      <ToastProvider>
        <ErrorTrigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'trigger error' }))
    expect(await screen.findByText('something went wrong')).toBeInTheDocument()
  })

  it('shows a success toast when toastSuccess is called', async () => {
    render(
      <ToastProvider>
        <SuccessTrigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'trigger success' }))
    expect(await screen.findByText('saved!')).toBeInTheDocument()
  })

  it('applies toast-error class for error toasts', async () => {
    const { container } = render(
      <ToastProvider>
        <ErrorTrigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'trigger error' }))
    await screen.findByText('something went wrong')
    expect(container.querySelector('.toast-error')).toBeInTheDocument()
  })

  it('applies toast-success class for success toasts', async () => {
    const { container } = render(
      <ToastProvider>
        <SuccessTrigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'trigger success' }))
    await screen.findByText('saved!')
    expect(container.querySelector('.toast-success')).toBeInTheDocument()
  })

  it('dismisses a toast when the × button is clicked', async () => {
    render(
      <ToastProvider>
        <ErrorTrigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'trigger error' }))
    const msg = await screen.findByText('something went wrong')
    expect(msg).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '×' }))
    expect(screen.queryByText('something went wrong')).not.toBeInTheDocument()
  })

  it('shows multiple toasts simultaneously', async () => {
    render(
      <ToastProvider>
        <ErrorTrigger />
        <SuccessTrigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'trigger error' }))
    fireEvent.click(screen.getByRole('button', { name: 'trigger success' }))

    expect(await screen.findByText('something went wrong')).toBeInTheDocument()
    expect(await screen.findByText('saved!')).toBeInTheDocument()
  })

  it('throws when useToast is used outside ToastProvider', () => {
    // Suppress the React error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ErrorTrigger />)).toThrow(
      'useToast must be used within ToastProvider',
    )
    consoleSpy.mockRestore()
  })
})

describe('ToastProvider auto-dismiss', () => {
  it('removes a toast after 5 seconds', () => {
    vi.useFakeTimers()

    render(
      <ToastProvider>
        <ErrorTrigger />
      </ToastProvider>,
    )

    // Trigger the toast — fireEvent wraps in act, so state updates flush synchronously
    fireEvent.click(screen.getByRole('button', { name: 'trigger error' }))
    expect(screen.getByText('something went wrong')).toBeInTheDocument()

    // Advance past the auto-dismiss timeout
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.queryByText('something went wrong')).not.toBeInTheDocument()

    vi.useRealTimers()
  })
})
