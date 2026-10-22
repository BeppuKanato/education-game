import Phaser from 'phaser';
import type { GameModel } from '../presentation/ports';
import { C, UI } from './UI';
export class DebateView {
  private speech?: Phaser.GameObjects.Container;
  private target?: Phaser.GameObjects.Text;
  private targetId?: string;
  private reticle?: Phaser.GameObjects.Graphics;
  private active = false;
  constructor(private scene: Phaser.Scene) {}
  render(ui: UI, m: GameModel) {
    this.active = true; this.target = undefined; this.targetId = undefined;
    const part = m.debate!; const line = part.lines[m.debateIndex];
    const speaker = m.scenario.characters.find(c => c.id === line.speaker);
    ui.badge(62, 126, `論点 ${m.debateNumber} / ${m.debateCount}`, C.gold, 152);
    ui.text(238, 126, part.title, 24, C.white);
    this.speech = this.scene.add.container(0, 0); ui.root.add(this.speech);
    const speechUI = new UI(this.scene, this.speech);
    speechUI.rect(402, 226, 1138, 295, C.paper, 0.98, 20, 0x9bacb2);
    speechUI.rect(430, 204, 185, 44, 0x226b69, 1, 7);
    speechUI.text(451, 207, speaker?.name ?? '', 23, C.white, undefined, '700');
    speechUI.text(450, 263, line.prefix, 28, C.ink, 1000);
    if (line.target) {
      const measure = this.scene.add.text(0, 0, line.target.text, { fontFamily: '"Noto Sans JP", sans-serif', fontSize: '38px', fontStyle: 'bold' });
      const w = Math.min(1020, measure.width + 30); measure.destroy();
      speechUI.rect(447, 327, w, 66, C.gold, 0.55, 8);
      this.target = speechUI.text(458, 330, line.target.text, 38, '#3d2e13', 1010, '700'); this.targetId = line.target.id;
      speechUI.text(451, 422, line.suffix, 28, C.ink, 1000);
    }
    const previous = part.lines[(m.debateIndex - 1 + part.lines.length) % part.lines.length];
    ui.rect(475, 547, 960, 49, C.paper, 0.67, 10);
    ui.text(494, 552, previous.prefix + (previous.target?.text ?? '') + previous.suffix, 20, '#53646c', 900);
    ui.text(1402, 604, `${m.debateIndex + 1} / ${part.lines.length}　↻`, 18, '#e3edef');
    ui.rect(0, 686, 1600, 214, C.navy, 0.98, 0);
    ui.line(0, 687, 1600, 687);
    ui.text(49, 704, '根拠の弾丸', 20, C.tealText);
    ui.text(1400, 705, '議論は繰り返します', 15, C.muted).setOrigin(1, 0);
    ui.button(45, 749, 65, 76, '‹', { type: 'previous' }, false, false, 35);
    const evidence = m.evidence[m.equipped];
    ui.rect(129, 745, 1100, 86, 0x1e3d49, 1, 12, C.teal);
    ui.text(154, 755, evidence?.title ?? '', 28, C.white, undefined, '700');
    ui.text(155, 795, evidence?.short ?? '', 19, '#b9d3d8');
    ui.button(1246, 749, 65, 76, '›', { type: 'next' }, false, false, 35);
    ui.button(1333, 749, 220, 76, 'X  資料', { type: 'inspect' }, false, false, 25);
    ui.text(48, 853, 'マウス / スティック：照準　　クリック / Enter / A：発射　　Q・E / LB・RB：弾丸切替', 19, '#d1e0e4');
    ui.button(1373, 846, 180, 40, 'P  一時停止', { type: 'pause' }, false, false, 17);
    this.reticle = this.scene.add.graphics();
    this.reticle.lineStyle(3, C.teal, 1); this.reticle.strokeCircle(0, 0, 22);
    this.reticle.lineStyle(1, 0xffffff, 1); this.reticle.strokeCircle(0, 0, 26);
    this.reticle.lineStyle(3, 0xffffff, 1);
    for (const [a,b,c,d] of [[-38,0,-15,0],[15,0,38,0],[0,-38,0,-15],[0,15,0,38]]) this.reticle.lineBetween(a,b,c,d);
    ui.root.add(this.reticle);
  }
  disable() { this.active = false; this.target = undefined; this.targetId = undefined; }
  moveAim(x: number, y: number) { if (this.active) this.reticle?.setPosition(x, y); }
  animate(elapsed: number) { if (this.active) this.speech?.setX(Math.sin(elapsed / 1300) * 24); }
  hit(x: number, y: number) { return this.active && this.target?.getBounds().contains(x, y) ? this.targetId : undefined; }
  get bounds() { const r = this.active ? this.target?.getBounds() : undefined; return r ? { x: r.centerX, y: r.centerY, id: this.targetId } : undefined; }
}
