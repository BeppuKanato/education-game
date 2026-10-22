import type { GameModel } from '../presentation/ports';
import { C, UI } from './UI';
export class ConversationView {
  private body?: Phaser.GameObjects.Text;
  private next?: Phaser.GameObjects.Text;
  render(ui: UI, m: GameModel) {
    ui.rect(48, 617, 1504, 227, C.navy, 0.97, 18, 0x567e87);
    ui.rect(72, 590, 210, 49, 0x226b69, 1, 9, C.teal);
    ui.text(94, 595, m.character?.name ?? 'あなた', 27, C.white, undefined, '700');
    ui.text(305, 596, m.character?.role ?? '記録確認担当', 19, '#e0e8e8');
    ui.text(1414, 630, m.linePosition, 18, C.muted);
    this.body = ui.text(94, 668, '', 29, C.white, 1370);
    this.next = ui.text(1460, 786, '▼', 24, C.tealText);
    ui.text(62, 858, 'Enter / A：次へ　　X：資料　　P / Esc：メニュー', 20, '#d2e0e6');
    ui.button(1290, 851, 260, 42, '次へ  ↵', { type: 'advance' }, false, false, 19);
  }
  update(text: string, complete: boolean) { this.body?.setText(text); this.next?.setVisible(complete); }
}
