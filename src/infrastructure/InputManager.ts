import type { Button, GameInput } from '../presentation/ports';
const KEYS: Record<string, Button> = {
  Enter: 'south', Space: 'south', Escape: 'east', Backspace: 'east', KeyX: 'west', KeyP: 'north',
  KeyQ: 'lb', KeyE: 'rb', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', KeyF: 'fullscreen', KeyM: 'mute',
};
const PAD: Record<number, Button> = { 0: 'south', 1: 'east', 2: 'west', 3: 'north', 4: 'lb', 5: 'rb', 9: 'menu', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
/** Hardware adapter: no knowledge of dialogue, shots, menus, or the current game mode. */
export class InputManager {
  private held = new Set<string>();
  private padHeld = new Set<number>();
  private cleanups: (() => void)[] = [];
  private lastAxis = { x: 0, y: 0 };
  constructor(canvas: HTMLCanvasElement, private emit: (input: GameInput) => void) {
    const on = <K extends keyof WindowEventMap>(type: K, fn: (event: WindowEventMap[K]) => void) => {
      window.addEventListener(type, fn); this.cleanups.push(() => window.removeEventListener(type, fn));
    };
    on('keydown', e => {
      if (!KEYS[e.code]) return;
      e.preventDefault(); this.held.add(e.code);
      if (!e.repeat) this.emit({ kind: 'button', button: KEYS[e.code] });
    });
    on('keyup', e => { this.held.delete(e.code); });
    on('blur', () => this.reset());
    const point = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * 1600 / r.width, y: (e.clientY - r.top) * 900 / r.height };
    };
    const move = (e: PointerEvent) => this.emit({ kind: 'pointerMove', ...point(e) });
    const down = (e: PointerEvent) => { e.preventDefault(); canvas.focus(); this.emit({ kind: 'pointerDown', ...point(e) }); };
    canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerdown', down);
    this.cleanups.push(() => { canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', down); });
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '論拠。Enterで決定、Xで資料、Pで一時停止。');
  }
  update() {
    let x = Number(this.held.has('ArrowRight') || this.held.has('KeyD')) - Number(this.held.has('ArrowLeft') || this.held.has('KeyA'));
    let y = Number(this.held.has('ArrowDown') || this.held.has('KeyS')) - Number(this.held.has('ArrowUp') || this.held.has('KeyW'));
    let pads: (Gamepad | null)[] = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch { /* Gamepads can be unavailable in embedded browsers. */ }
    const pad = pads.find(p => p?.connected);
    const pressed = new Set<number>();
    if (pad) {
      for (const [raw, button] of Object.entries(PAD)) {
        const index = Number(raw);
        if (pad.buttons[index]?.pressed) {
          pressed.add(index);
          if (!this.padHeld.has(index)) this.emit({ kind: 'button', button });
        }
      }
      const deadzone = (v: number) => Math.abs(v) < 0.2 ? 0 : Math.sign(v) * (Math.abs(v) - 0.2) / 0.8;
      x += deadzone(pad.axes[0] ?? 0); y += deadzone(pad.axes[1] ?? 0);
      x += Number(pressed.has(15)) - Number(pressed.has(14)); y += Number(pressed.has(13)) - Number(pressed.has(12));
    }
    this.padHeld = pressed;
    x = Math.max(-1, Math.min(1, x)); y = Math.max(-1, Math.min(1, y));
    // Emit neutral too, so a released stick never keeps the cursor moving.
    if (x !== this.lastAxis.x || y !== this.lastAxis.y) { this.lastAxis = { x, y }; this.emit({ kind: 'axis', x, y }); }
  }
  reset() { this.held.clear(); this.padHeld.clear(); this.lastAxis = { x: 0, y: 0 }; this.emit({ kind: 'axis', x: 0, y: 0 }); }
  destroy() { this.cleanups.forEach(fn => fn()); this.reset(); }
}
