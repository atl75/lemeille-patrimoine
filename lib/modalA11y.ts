const FOCUSABLE = 'a[href], button, textarea, input, select, [tabindex]';

/** Cycle de focus partagé, testable sans monter React. Retourne le nettoyage. */
export function activateModal(container: HTMLElement, onClose: () => void): () => void {
  const doc = container.ownerDocument;
  const previous = doc.activeElement as HTMLElement | null;
  const originalTabIndex = container.getAttribute('tabindex');
  const native = container.tagName === 'DIALOG' ? container as HTMLDialogElement : null;
  const openedHere = native && !native.open;
  if (openedHere) native.showModal();
  const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el =>
    el.tabIndex >= 0 && !el.matches(':disabled') && !el.closest('[hidden], [inert], [aria-hidden="true"]') &&
    el.getClientRects().length > 0 && doc.defaultView?.getComputedStyle(el).visibility !== 'hidden');
  const first = focusable()[0];
  if (first) first.focus({ preventScroll: true });
  else { container.tabIndex = -1; container.focus({ preventScroll: true }); }

  const onKeyDown = (event: KeyboardEvent) => {
    // Une fenêtre native au premier plan garde la main sur les panneaux en arrière-plan.
    if (event.defaultPrevented || !container.contains(doc.activeElement)) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); onClose();
    } else if (event.key === 'Tab') {
      const items = focusable();
      const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); container.focus({ preventScroll: true }); }
      else if (event.shiftKey && (doc.activeElement === first || doc.activeElement === container)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (doc.activeElement === last || doc.activeElement === container)) {
        event.preventDefault(); first.focus();
      }
    }
  };
  doc.addEventListener('keydown', onKeyDown);
  return () => {
    doc.removeEventListener('keydown', onKeyDown);
    if (openedHere && native.open) native.close();
    if (originalTabIndex === null) container.removeAttribute('tabindex');
    else container.setAttribute('tabindex', originalTabIndex);
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  };
}
