import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activateModal } from '../lib/modalA11y.ts';

/** Petit adaptateur DOM pour le cycle de focus ; recette navigateur en complément. */
function fixture(native = false) {
  const listeners = new Set<(event: KeyboardEvent) => void>();
  const doc = {
    activeElement: null as FakeElement | null,
    defaultView: { getComputedStyle: (el: FakeElement) => ({ visibility: el.visibility }) },
    addEventListener(_type: string, fn: (event: KeyboardEvent) => void) { listeners.add(fn); },
    removeEventListener(_type: string, fn: (event: KeyboardEvent) => void) { listeners.delete(fn); },
  };
  class FakeElement {
    ownerDocument = doc;
    tagName = 'BUTTON';
    tabIndex = 0;
    isConnected = true;
    disabled = false;
    hidden = false;
    visibility = 'visible';
    open = false;
    opens = 0;
    closes = 0;
    children: FakeElement[] = [];
    attrs = new Map<string, string>();
    getAttribute(key: string) { return this.attrs.get(key) ?? null; }
    setAttribute(key: string, value: string) { this.attrs.set(key, value); }
    removeAttribute(key: string) { this.attrs.delete(key); }
    querySelectorAll() { return this.children; }
    matches() { return this.disabled; }
    closest() { return this.hidden ? this : null; }
    getClientRects() { return this.hidden ? [] : [{}]; }
    contains(el: FakeElement | null) { return el === this || this.children.includes(el!); }
    focus() { doc.activeElement = this; }
    showModal() { this.open = true; this.opens++; }
    close() { this.open = false; this.closes++; }
  }
  const previous = new FakeElement(); previous.focus();
  const container = new FakeElement(); container.tagName = native ? 'DIALOG' : 'DIV';
  const first = new FakeElement(); const last = new FakeElement(); container.children = [first, last];
  let closed = 0;
  const start = () => activateModal(container as unknown as HTMLElement, () => { closed++; });
  const key = (key: string, shiftKey = false, alreadyPrevented = false) => {
    const event = { key, shiftKey, defaultPrevented: alreadyPrevented, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    for (const listener of listeners) listener(event as KeyboardEvent);
    return event;
  };
  return { doc, previous, container, first, last, start, key, listeners, closed: () => closed };
}

test('modale : focus initial, Tab, Shift+Tab, Échap et retour au déclencheur', () => {
  const f = fixture(); const cleanup = f.start();
  assert.equal(f.doc.activeElement, f.first);
  assert.equal(f.key('Tab', true).defaultPrevented, true);
  assert.equal(f.doc.activeElement, f.last);
  f.key('Tab'); assert.equal(f.doc.activeElement, f.first);
  f.key('Escape'); assert.equal(f.closed(), 1);
  cleanup(); assert.equal(f.doc.activeElement, f.previous); assert.equal(f.listeners.size, 0);
});
test('modale : ignore les contrôles masqués, désactivés ou hors tabulation', () => {
  const f = fixture(); f.first.disabled = true;
  const cleanup = f.start(); assert.equal(f.doc.activeElement, f.last); cleanup();
  f.first.disabled = false; f.first.hidden = true;
  const cleanup2 = f.start(); assert.equal(f.doc.activeElement, f.last); cleanup2();
  f.first.hidden = false; f.first.visibility = 'hidden';
  const cleanup3 = f.start(); assert.equal(f.doc.activeElement, f.last); cleanup3();
  f.first.visibility = 'visible'; f.first.tabIndex = -1;
  const cleanup4 = f.start(); assert.equal(f.doc.activeElement, f.last); cleanup4();
});
test('modale : aucun contrôle, focus sur le conteneur et sortie par Échap', () => {
  const f = fixture(); f.container.children = [];
  const cleanup = f.start(); assert.equal(f.doc.activeElement, f.container);
  assert.equal(f.key('Tab').defaultPrevented, true);
  f.key('Escape'); assert.equal(f.closed(), 1); cleanup();
  assert.equal(f.container.getAttribute('tabindex'), null);
});
test('modale : ne capture pas le clavier d’un autre dialogue ni un événement déjà traité', () => {
  const f = fixture(); const cleanup = f.start();
  f.key('Escape', false, true); assert.equal(f.closed(), 0);
  f.previous.focus(); f.key('Escape'); assert.equal(f.closed(), 0); cleanup();
});
test('modale native : ouverture/fermeture possédées par ce cycle uniquement', () => {
  const f = fixture(true); const cleanup = f.start();
  assert.equal(f.container.open, true); assert.equal(f.container.opens, 1);
  cleanup(); assert.equal(f.container.open, false); assert.equal(f.container.closes, 1);
  f.container.open = true;
  const cleanup2 = f.start(); cleanup2();
  assert.equal(f.container.open, true); assert.equal(f.container.closes, 1);
});
test('modale : ne tente pas de remettre le focus sur un déclencheur supprimé', () => {
  const f = fixture(); const cleanup = f.start(); f.previous.isConnected = false;
  cleanup(); assert.notEqual(f.doc.activeElement, f.previous);
});
