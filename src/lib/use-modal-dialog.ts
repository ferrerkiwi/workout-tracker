'use client'

import { useEffect, useRef } from 'react'

/** Native modality makes the page inert; explicit Tab wrapping keeps focus on controls. */
export function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!dialog.open) dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus()
    function containFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      const targets = Array.from(dialog!.querySelectorAll<HTMLElement>('a[href],button,input,textarea,select,[tabindex]'))
        .filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0)
      const first = targets[0]
      const last = targets[targets.length - 1]
      if (!first) { event.preventDefault(); return }
      if (!dialog!.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus()
      }
    }
    dialog.addEventListener('keydown', containFocus)
    const viewport = window.visualViewport
    function resize() {
      dialog!.style.setProperty('--visible-height', `${viewport?.height ?? window.innerHeight}px`)
      dialog!.style.setProperty('--visible-top', `${viewport?.offsetTop ?? 0}px`)
    }
    resize()
    viewport?.addEventListener('resize', resize)
    viewport?.addEventListener('scroll', resize)
    window.addEventListener('resize', resize)
    return () => {
      dialog.removeEventListener('keydown', containFocus)
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', resize)
      window.removeEventListener('resize', resize)
      dialog.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  return ref
}
