// Virtual joystick (touch/mouse) + keyboard. `read()` returns a vector with length <= 1.
export function createInput() {
  const keys = {};
  const stick = { x: 0, y: 0 };
  const pad = document.getElementById('pad');
  const knob = document.getElementById('knob');
  let padId = null;

  window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  function padMove(e) {
    const r = pad.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / R);
    dx = dx / len * k; dy = dy / len * k;
    stick.x = dx; stick.y = dy;
    knob.style.transform = `translate(${dx * R * 0.6}px,${dy * R * 0.6}px)`;
  }
  function padEnd(e) {
    if (e.pointerId !== padId) return;
    padId = null; stick.x = stick.y = 0; knob.style.transform = '';
  }
  pad.addEventListener('pointerdown', e => {
    padId = e.pointerId; pad.setPointerCapture(e.pointerId); padMove(e);
    document.getElementById('hint').style.opacity = 0;
  });
  pad.addEventListener('pointermove', e => { if (e.pointerId === padId) padMove(e); });
  pad.addEventListener('pointerup', padEnd);
  pad.addEventListener('pointercancel', padEnd);

  return {
    read() {
      let x = stick.x, y = stick.y;
      if (keys['a'] || keys['arrowleft'])  x -= 1;
      if (keys['d'] || keys['arrowright']) x += 1;
      if (keys['w'] || keys['arrowup'])    y -= 1;
      if (keys['s'] || keys['arrowdown'])  y += 1;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x, y, len: Math.min(1, len) };
    }
  };
}
