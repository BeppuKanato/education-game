import type { ScenarioApplicationService } from '../application/ScenarioApplicationService';
import type { Judgment } from '../domain/ScenarioSession';
import type { GameInput, GameModel, Mode, SoundPort, UIAction, ViewPort } from './ports';

/** Input interpretation and transient UI state. Contains no Phaser/DOM objects or answer rules. */
export class ScenarioPresenter {
  private mode: Mode = 'title';
  private returnMode: Mode = 'title';
  private equipped = 0;
  private evidenceIndex = 0;
  private selection = 0;
  private debateIndex = 0;
  private debateElapsed = 0;
  private revealed = 0;
  private typingElapsed = 0;
  private aim = { x: 890, y: 350 };
  private axis = { x: 0, y: 0 };
  private axisRepeat = 0;
  private feedback?: Judgment;
  private muted = false;
  private notice = '';
  constructor(private app: ScenarioApplicationService, private view: ViewPort, private sound: SoundPort, private storageWarning: () => string = () => '') { this.render(); }
  get diagnostics() {
    return { mode: this.mode, partId: this.app.current.currentPart?.id, lineIndex: this.app.current.currentLineIndex,
      debateIndex: this.debateIndex, equippedId: this.app.current.availableEvidence[this.equipped]?.id,
      aim: { ...this.aim }, resolved: this.app.current.currentResolved, save: this.app.current.serialize() };
  }
  input(input: GameInput) {
    if (input.kind === 'axis') { this.axis = { x: input.x, y: input.y }; return; }
    if (input.kind === 'pointerMove') {
      if (this.mode === 'debate') { this.aim = { x: input.x, y: input.y }; this.view.setAim(input.x, input.y); }
      return;
    }
    this.sound.unlock();
    if (input.kind === 'pointerDown') {
      const action = this.view.hitUI(input.x, input.y);
      if (action) { this.action(action); return; }
      if (this.mode === 'conversation') this.confirm();
      else if (this.mode === 'debate') { this.aim = { x: input.x, y: input.y }; this.fire(); }
      return;
    }
    const b = input.button;
    if (b === 'fullscreen') { this.view.fullscreen(); return; }
    if (b === 'mute') { this.toggleSound(); return; }
    if (b === 'south') { this.confirm(); return; }
    if (b === 'east') { this.back(); return; }
    if (b === 'west') { this.inspect(); return; }
    if (b === 'north' || b === 'menu') { this.pause(); return; }
    if (b === 'lb' || b === 'rb') { if (this.mode === 'debate') this.cycleBullet(b === 'lb' ? -1 : 1); return; }
    const delta = b === 'up' || b === 'left' ? -1 : 1;
    if (this.mode !== 'debate' && this.mode !== 'conversation' && this.mode !== 'feedback') { this.navigate(delta); this.axisRepeat = 240; }
  }
  private action(action: UIAction) {
    switch (action.type) {
      case 'start': case 'replay': this.start(false); break;
      case 'resume': this.start(true); break;
      case 'help': this.returnMode = this.mode; this.mode = 'help'; this.render(); break;
      case 'advance': case 'continue': this.confirm(); break;
      case 'inspect': this.inspect(); break;
      case 'pause': this.pause(); break;
      case 'previous': this.cycleBullet(-1); break;
      case 'next': this.cycleBullet(1); break;
      case 'close': this.back(); break;
      case 'equip': this.confirm(); break;
      case 'selectEvidence': this.evidenceIndex = action.index; this.sound.play('select'); this.render(); break;
      case 'title': this.mode = 'title'; this.selection = 0; this.render(); break;
      case 'sound': this.toggleSound(); break;
      case 'fullscreen': this.view.fullscreen(); break;
    }
  }
  private start(resume: boolean) {
    try { this.app.start(resume); this.equipped = 0; this.feedback = undefined; this.enterPart(); }
    catch { this.notice = 'セーブを読み込めませんでした。「はじめから」で遊べます。'; this.render(); }
  }
  private enterPart() {
    const session = this.app.current;
    this.debateIndex = 0; this.debateElapsed = 0; this.revealed = 0; this.typingElapsed = 0; this.notice = '';
    this.equipped = Math.min(this.equipped, session.availableEvidence.length - 1);
    if (session.complete) { this.mode = 'summary'; this.selection = 0; }
    else if (session.pendingSuccess) { this.feedback = session.pendingSuccess; this.mode = 'feedback'; }
    else this.mode = session.currentPart.kind;
    this.render();
  }
  private confirm() {
    this.sound.play('select');
    if (this.mode === 'title') {
      const actions: UIAction[] = this.app.canResume() ? [{ type: 'resume' }, { type: 'start' }, { type: 'help' }] : [{ type: 'start' }, { type: 'help' }];
      this.action(actions[this.selection] ?? actions[0]);
    } else if (this.mode === 'conversation') {
      const p = this.app.current.currentPart;
      if (p.kind !== 'conversation') return;
      const text = p.lines[this.app.current.currentLineIndex].text;
      if (this.revealed < text.length) { this.revealed = text.length; this.view.setDialogue(text, true); return; }
      this.app.advanceConversation(); this.enterPart();
    } else if (this.mode === 'debate') this.fire();
    else if (this.mode === 'evidence') {
      if (this.returnMode === 'debate') this.equipped = this.evidenceIndex;
      this.mode = this.returnMode; this.render();
    } else if (this.mode === 'feedback' && this.feedback) {
      if (this.feedback.success) { this.app.continueAfterSuccess(); this.feedback = undefined; this.enterPart(); }
      else { this.mode = 'debate'; this.render(); }
    } else if (this.mode === 'pause') {
      if (this.selection === 0) this.back(); else if (this.selection === 1) this.toggleSound(); else this.action({ type: 'title' });
    } else if (this.mode === 'help') this.back();
    else if (this.mode === 'summary') { if (this.selection === 0) this.start(false); else this.action({ type: 'title' }); }
  }
  private fire() {
    const p = this.app.current.currentPart;
    if (p.kind !== 'debate' || this.mode !== 'debate') return;
    const targetId = this.view.hitTarget(this.aim.x, this.aim.y);
    this.sound.play('shot'); this.view.shot(this.aim.x, this.aim.y, !!targetId);
    if (!targetId) return;
    const evidence = this.app.current.availableEvidence[this.equipped];
    if (!evidence) return;
    this.feedback = this.app.submit(p.id, targetId, evidence.id);
    this.sound.play(this.feedback.success ? 'success' : 'failure');
    this.mode = 'feedback'; this.render();
  }
  private inspect() {
    if (!['conversation', 'debate', 'feedback'].includes(this.mode)) return;
    this.returnMode = this.mode; this.evidenceIndex = this.equipped; this.mode = 'evidence'; this.render();
  }
  private pause() {
    if (this.mode === 'pause') { this.back(); return; }
    if (!['conversation', 'debate'].includes(this.mode)) return;
    this.returnMode = this.mode; this.mode = 'pause'; this.selection = 0; this.render();
  }
  private back() {
    if (['evidence', 'pause', 'help'].includes(this.mode)) { this.mode = this.returnMode; this.render(); }
    else if (this.mode === 'debate' || this.mode === 'conversation') this.pause();
  }
  suspend() { if (this.mode === 'conversation' || this.mode === 'debate') this.pause(); this.axis = { x: 0, y: 0 }; }
  private cycleBullet(delta: number) {
    if (this.mode !== 'debate') return;
    const count = this.app.current.availableEvidence.length;
    this.equipped = (this.equipped + delta + count) % count; this.sound.play('select'); this.render();
  }
  private navigate(delta: number) {
    const count = this.mode === 'evidence' ? this.app.current.availableEvidence.length : this.mode === 'title' ? (this.app.canResume() ? 3 : 2) : this.mode === 'pause' ? 3 : this.mode === 'summary' ? 2 : 0;
    if (!count) return;
    if (this.mode === 'evidence') this.evidenceIndex = (this.evidenceIndex + delta + count) % count;
    else this.selection = (this.selection + delta + count) % count;
    this.sound.play('select'); this.render();
  }
  private toggleSound() { this.muted = !this.muted; this.sound.setMuted(this.muted); this.render(); }
  update(delta: number) {
    const dt = Math.min(delta, 80);
    if (this.mode === 'conversation') {
      const p = this.app.current.currentPart;
      if (p.kind !== 'conversation') return;
      const text = p.lines[this.app.current.currentLineIndex].text;
      this.typingElapsed += dt;
      if (this.revealed < text.length && this.typingElapsed >= 20) {
        this.revealed = Math.min(text.length, this.revealed + Math.floor(this.typingElapsed / 20)); this.typingElapsed %= 20;
        this.view.setDialogue(text.slice(0, this.revealed), this.revealed === text.length);
      }
    } else if (this.mode === 'debate') {
      this.aim.x = Math.max(20, Math.min(1580, this.aim.x + this.axis.x * dt * 0.65));
      this.aim.y = Math.max(130, Math.min(660, this.aim.y + this.axis.y * dt * 0.65));
      this.view.setAim(this.aim.x, this.aim.y);
      this.debateElapsed += dt;
      const part = this.app.current.currentPart;
      if (part.kind === 'debate') {
        const current = part.lines[this.debateIndex];
        const length = current.prefix.length + (current.target?.text.length ?? 0) + current.suffix.length;
        if (this.debateElapsed > Math.max(6500, length * 170)) { this.debateElapsed = 0; this.debateIndex = (this.debateIndex + 1) % part.lines.length; this.render(); }
      }
      this.view.animateDebate(this.debateElapsed);
    } else if (['title', 'evidence', 'summary', 'pause'].includes(this.mode)) {
      this.axisRepeat -= dt;
      if ((Math.abs(this.axis.y) > 0.6 || Math.abs(this.axis.x) > 0.6) && this.axisRepeat <= 0) {
        this.navigate((Math.abs(this.axis.y) > 0.6 ? this.axis.y : this.axis.x) > 0 ? 1 : -1); this.axisRepeat = 240;
      }
    }
  }
  private render() {
    const s = this.app.current; const p = s.currentPart;
    const dialogue = p?.kind === 'conversation' ? p.lines[s.currentLineIndex] : undefined;
    const debate = p?.kind === 'debate' ? p : undefined;
    const speaker = debate && this.mode === 'debate' ? debate.lines[this.debateIndex].speaker : dialogue?.speaker;
    const debates = this.app.scenario.parts.filter(p => p.kind === 'debate');
    const model: GameModel = {
      mode: this.mode, scenario: this.app.scenario, progress: s.progress, partTitle: p?.title ?? '今回の結論', partId: p?.id ?? 'complete',
      dialogue, character: this.app.scenario.characters.find(c => c.id === speaker),
      linePosition: p?.kind === 'conversation' ? `${s.currentLineIndex + 1} / ${p.lines.length}` : '',
      debate, debateIndex: this.debateIndex, debateNumber: debate ? debates.findIndex(d => d.id === debate.id) + 1 : s.solvedCount,
      debateCount: debates.length, evidence: s.availableEvidence, equipped: this.equipped, evidenceIndex: this.evidenceIndex,
      canEquip: this.returnMode === 'debate', feedback: this.feedback, selection: this.selection, canResume: this.app.canResume(),
      summary: { solved: s.solvedCount, attempts: s.attemptCount }, muted: this.muted, notice: this.notice || this.storageWarning(),
    };
    this.view.render(model);
    if (this.mode === 'conversation' && dialogue) this.view.setDialogue(dialogue.text.slice(0, this.revealed), this.revealed >= dialogue.text.length);
    if (this.mode === 'debate') { this.view.setAim(this.aim.x, this.aim.y); this.view.animateDebate(this.debateElapsed); }
  }
}
