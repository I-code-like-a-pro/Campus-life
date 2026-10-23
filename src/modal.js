const $ = id => document.getElementById(id);

/**
 * Shows a dialog and resolves with the `value` of the button the player taps.
 * showModal({ title, lines: ['text', ...], buttons: [{ label, value, secondary? }] })
 */
export function showModal({ title, lines = [], buttons }) {
  return new Promise(resolve => {
    $('mTitle').textContent = title;
    $('mBody').replaceChildren(...lines.map(t => {
      const p = document.createElement('p');
      p.textContent = t;
      return p;
    }));
    $('mBtns').replaceChildren(...buttons.map(b => {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      if (b.secondary) btn.className = 'secondary';
      btn.addEventListener('click', () => { $('modal').hidden = true; resolve(b.value); });
      return btn;
    }));
    $('modal').hidden = false;
  });
}
