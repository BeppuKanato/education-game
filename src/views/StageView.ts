import Phaser from 'phaser';
import type { Character } from '../domain/schema';
export class StageView {
  private actors = new Map<string, Phaser.GameObjects.Image>();
  private backdrop: Phaser.GameObjects.Image;
  private dim: Phaser.GameObjects.Rectangle;
  constructor(private scene: Phaser.Scene, characters: Character[]) {
    this.backdrop = scene.add.image(800, 450, 'lab').setDisplaySize(1600, 900).setDepth(-20);
    this.dim = scene.add.rectangle(800, 450, 1600, 900, 0x0d2030, 0.16).setDepth(-10);
    for (const c of characters) {
      this.actors.set(c.id, scene.add.image(0, 810, 'researchers', c.id).setOrigin(0.5, 1).setDepth(-15));
    }
  }
  show(activeId?: string, title = false, overlay = false) {
    this.backdrop.setAlpha(1); this.dim.setAlpha(overlay ? 0.5 : title ? 0.36 : 0.16);
    let i = 0;
    for (const [id, actor] of this.actors) {
      const active = id === activeId;
      const desiredHeight = title ? 590 : active ? 700 : 600;
      const x = title ? 790 + i * 205 : 225 + i * 385;
      actor.setPosition(x, title ? 898 : 825).setScale(desiredHeight / actor.frame.height).setAlpha(1);
      actor.setTint(active || title ? 0xffffff : 0x9caab5);
      i++;
    }
  }
  pulse(id: string) {
    const actor = this.actors.get(id); if (!actor) return;
    this.scene.tweens.add({ targets: actor, alpha: 1, duration: 180 });
  }
}
