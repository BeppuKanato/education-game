import type { SoundPort } from '../presentation/ports';
/** Short original synthesized UI sounds. No third-party audio or network dependency. */
export class SoundPlayer implements SoundPort {
  private context?: AudioContext;
  private muted = false;
  unlock() {
    try { this.context ??= new AudioContext(); if (this.context.state === 'suspended') void this.context.resume().catch(() => {}); } catch { /* Audio is optional. */ }
  }
  setMuted(value: boolean) { this.muted = value; }
  play(kind: 'select' | 'shot' | 'success' | 'failure') {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    const notes = { select: [600], shot: [1000, 420], success: [520, 660, 790], failure: [270, 210] }[kind];
    notes.forEach((frequency, index) => {
      const c = this.context!; const osc = c.createOscillator(); const gain = c.createGain();
      const start = c.currentTime + index * 0.075; osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.055, start + 0.008); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
      osc.connect(gain); gain.connect(c.destination); osc.start(start); osc.stop(start + 0.15);
    });
  }
}
