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

/**
 * A dialog with a text box and optional quick-pick chips. Resolves with the typed text, or null if cancelled.
 * askText({ title, lines, placeholder, chips, maxLength, disabled })
 */
export function askText({ title, lines = [], placeholder = '', chips = [], maxLength = 160, disabled = false }) {
  return new Promise(resolve => {
    $('mTitle').textContent = title;
    const done = v => { $('modal').hidden = true; resolve(v); };
    const input = Object.assign(document.createElement('input'), { type: 'text', maxLength, placeholder, className: 'askinput', autocomplete: 'off', disabled });
    input.setAttribute('enterkeyhint', 'send');
    const row = document.createElement('div');
    row.className = 'askchips';
    if (!disabled) for (const text of chips) {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: text });
      b.addEventListener('click', () => done(text));
      row.append(b);
    }
    $('mBody').replaceChildren(...lines.map(t => Object.assign(document.createElement('p'), { textContent: t })), input, row);
    const send = Object.assign(document.createElement('button'), { textContent: 'Ask', disabled });
    send.addEventListener('click', () => { const v = input.value.trim(); if (v.length >= 2) done(v); });
    const cancel = Object.assign(document.createElement('button'), { textContent: 'Cancel', className: 'secondary' });
    cancel.addEventListener('click', () => done(null));
    $('mBtns').replaceChildren(send, cancel);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send.click(); });
    $('modal').hidden = false;
    if (!disabled) input.focus();
  });
}
