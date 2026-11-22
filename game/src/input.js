// Keyboard and mouse input: WASD / arrow keys steer, mouse click sets a move
// target, 1/2/3 spend tools, E cracks the vault, M mutes, R restarts, Enter starts.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    click: null, // { x, y } in canvas pixels, consumed by the game loop
    pressed: new Set(), // keys pressed since the last poll, consumed once
  };

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) state.pressed.add(codeOf(event));
    keys.add(codeOf(event));
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(codeOf(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.click = {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  });

  return state;
}

/** Unit movement vector from held keys (0,0 when none). */
export function keyDirection(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const len = Math.hypot(x, y);
    x /= len;
    y /= len;
  }
  return { x, y };
}

/** True once for a key pressed since the last call (consumes it). */
export function wasPressed(input, code) {
  if (!input.pressed.has(code)) return false;
  input.pressed.delete(code);
  return true;
}
