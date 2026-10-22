import Phaser from 'phaser';
import type { GameModel, UIAction, ViewPort } from '../presentation/ports';
import { UI, C } from './UI';
import { StageView } from './StageView';
import { ConversationView } from './ConversationView';
import { DebateView } from './DebateView';
import { EvidenceView, FeedbackView, HelpView, MenuView, SummaryView, TitleView } from './OverlayViews';
import type { Character } from '../domain/schema';

/** Phaser adapter. Receives display data, draws objects, reports UI geometry only. */
export class GameView implements ViewPort {
  private root?: Phaser.GameObjects.Container;
  private ui?: UI;
  private stage: StageView;
  private conversation = new ConversationView();
  private debate: DebateView;
  private currentMode = '';
  private activeId?: string;
  constructor(private scene: Phaser.Scene, characters: Character[]) { this.stage = new StageView(scene, characters); this.debate = new DebateView(scene); }
  render(m: GameModel) {
    this.root?.destroy(true); this.root = this.scene.add.container(0, 0);
    this.ui = new UI(this.scene, this.root); const ui = this.ui;
    this.debate.disable();
    const overlay = ['evidence','feedback','pause','help','summary'].includes(m.mode);
    if (m.character) this.activeId = m.character.id;
    this.stage.show(this.activeId, m.mode === 'title', overlay);
    if (m.mode !== 'title') {
      ui.rect(0, 0, 1600, 108, C.navy, 0.96, 0);
      ui.text(47, 23, '論拠', 38, C.white, undefined, '700');
      ui.line(161, 23, 161, 82, C.teal, 0.7);
      ui.text(192, 19, m.scenario.title, 29, C.white, 1000, '700');
      ui.text(195, 65, m.mode === 'summary' ? '結論・振り返り' : m.partTitle, 18, C.muted);
      ui.rect(0, 105, 1600 * m.progress, 3, C.teal, 1, 0);
    }
    switch (m.mode) {
      case 'title': new TitleView().render(ui,m); break;
      case 'conversation': this.conversation.render(ui,m); break;
      case 'debate': this.debate.render(ui,m); break;
      case 'evidence': new EvidenceView().render(ui,m); break;
      case 'feedback': new FeedbackView().render(ui,m); break;
      case 'pause': new MenuView().render(ui,m); break;
      case 'help': new HelpView().render(ui); break;
      case 'summary': new SummaryView().render(ui,m); break;
    }
    ui.button(1423, 21, 57, 48, m.muted ? '♪×' : '♪', { type: 'sound' }, false, false, 20);
    ui.button(1494, 21, 58, 48, '全画面', { type: 'fullscreen' }, false, false, 13);
    if (m.notice) { ui.rect(260, 114, 1080, 45, 0x6d4c23, 0.98, 8); ui.text(280, 120, m.notice, 20, '#fff4d1', 1040); }
    this.currentMode = m.mode;
    const canvas = this.scene.game.canvas;
    canvas.dataset.mode = m.mode; canvas.dataset.part = m.partId;
    canvas.style.cursor = m.mode === 'debate' ? 'none' : 'pointer';
    const status = document.getElementById('accessible-status');
    if (status) status.textContent = m.mode === 'conversation' ? `${m.character?.name ?? 'あなた'}：${m.dialogue?.text}`
      : m.mode === 'debate' ? `${m.debate?.question}。装備：${m.evidence[m.equipped]?.title}`
      : m.mode === 'feedback' ? `${m.feedback?.success ? '指摘成立' : '指摘不成立'}。${m.feedback?.explanation}`
      : m.mode === 'summary' ? m.scenario.conclusion : m.mode === 'evidence' ? m.evidence[m.evidenceIndex]?.body.join('。') ?? '' : '論拠：学習ディベートゲーム';
  }
  setDialogue(text: string, complete: boolean) { if (this.currentMode === 'conversation') this.conversation.update(text, complete); }
  setAim(x: number, y: number) { this.debate.moveAim(x, y); }
  animateDebate(elapsed: number) { this.debate.animate(elapsed); }
  hitUI(x: number, y: number): UIAction | undefined { return this.ui?.hits.findLast(h => h.rect.contains(x,y))?.action; }
  hitTarget(x: number, y: number) { return this.debate.hit(x, y); }
  get targetBounds() { return this.debate.bounds; }
  shot(x: number, y: number, hit: boolean) {
    const ring = this.scene.add.circle(x,y,12,hit ? C.teal : C.gold,0.6).setStrokeStyle(3,0xffffff).setDepth(100);
    this.scene.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
    if (hit) this.scene.cameras.main.shake(100,0.003);
  }
  fullscreen() {
    if (this.scene.scale.isFullscreen) this.scene.scale.stopFullscreen(); else this.scene.scale.startFullscreen();
  }
}
