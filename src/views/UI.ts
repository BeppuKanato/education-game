import Phaser from 'phaser';
import type { UIAction } from '../presentation/ports';
export const C = { navy: 0x101e2c, ink: '#182b3d', paper: 0xf9f6ef, teal: 0x58cfbd, tealText: '#58cfbd', gold: 0xe8b763, white: '#ffffff', muted: '#aabdc8' };
export const FONT = '"Noto Sans JP", sans-serif';
export type Hit = { rect: Phaser.Geom.Rectangle; action: UIAction };
/** Drawing primitives. No input interpretation or game rules. */
export class UI {
  hits: Hit[] = [];
  constructor(readonly scene: Phaser.Scene, readonly root: Phaser.GameObjects.Container) {}
  rect(x: number, y: number, w: number, h: number, color = C.navy, alpha = 1, radius = 14, stroke?: number) {
    const g = this.scene.add.graphics();
    g.fillStyle(color, alpha); g.fillRoundedRect(x, y, w, h, radius);
    if (stroke !== undefined) { g.lineStyle(1.5, stroke, 0.65); g.strokeRoundedRect(x, y, w, h, radius); }
    this.root.add(g); return g;
  }
  text(x: number, y: number, value: string, size = 26, color = C.white, width?: number, weight = '400') {
    const t = this.scene.add.text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight === '700' ? 'bold' : '', color,
      lineSpacing: Math.round(size * 0.36), padding: { x: 2, y: 4 }, wordWrap: width ? { width, useAdvancedWrap: true } : undefined });
    this.root.add(t); return t;
  }
  line(x1: number, y1: number, x2: number, y2: number, color = C.teal, alpha = 1) {
    const g = this.scene.add.graphics(); g.lineStyle(1, color, alpha); g.lineBetween(x1, y1, x2, y2); this.root.add(g); return g;
  }
  button(x: number, y: number, w: number, h: number, label: string, action: UIAction, selected = false, light = false, fontSize = 23) {
    this.rect(x, y, w, h, selected ? 0x226b69 : light ? 0xe8e8e0 : C.navy, 0.97, 12, selected ? C.teal : 0x566d7b);
    if (selected) this.rect(x + 1, y + 13, 4, h - 26, C.teal, 1, 2);
    const t = this.text(x + w / 2, y + h / 2, label, fontSize, light && !selected ? C.ink : C.white, w - 18, selected ? '700' : '400'); t.setOrigin(0.5);
    this.hits.push({ rect: new Phaser.Geom.Rectangle(x, y, w, h), action });
  }
  badge(x: number, y: number, label: string, color = C.teal, width = 150) {
    this.rect(x, y, width, 38, color, 0.18, 5, color); this.text(x + 12, y + 3, label, 18, color === C.gold ? '#f6d99b' : C.tealText);
  }
}
