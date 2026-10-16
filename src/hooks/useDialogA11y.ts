import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibility helpers for modal dialogs.
 *
 * - Closes the dialog when Escape is pressed
 * - Moves focus into the dialog on open and traps Tab within it
 * - Restores focus to the previously focused element on close
 *
 * Pass `enabled=false` while the dialog is not rendered/open.
 *
 * Usage: `const ref = useDialogA11y(onClose, open); ... <div role="dialog" ref={ref}>`
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(onClose: () => void, enabled = true) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;

    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];

    const focusables = getFocusable();
    const first = focusables[0];
    if (first) {
      first.focus();
    } else {
      node?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) return;

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === firstItem || active === node)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [enabled]);

  return ref;
}

export default useDialogA11y;
