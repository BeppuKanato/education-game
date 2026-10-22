import { describe, expect, it } from 'vitest';
import raw from '../src/content/scenario.json';
import { validateScenario } from '../src/domain/schema';
import { ScenarioApplicationService } from '../src/application/ScenarioApplicationService';
import { ScenarioPresenter } from '../src/presentation/ScenarioPresenter';
import type { GameModel, SoundPort, ViewPort } from '../src/presentation/ports';
import type { SessionSave } from '../src/domain/ScenarioSession';
class View implements ViewPort {
  model!: GameModel; text = ''; target: string | undefined;
  render(m: GameModel) { this.model = m; }
  setDialogue(t: string) { this.text = t; }
  setAim() {} animateDebate() {} hitUI() { return undefined; }
  hitTarget() { return this.target; } shot() {} fullscreen() {}
}
const audio: SoundPort = { unlock() {}, play() {}, setMuted() {} };
function setup() {
  let saved: SessionSave | undefined;
  const app = new ScenarioApplicationService(validateScenario(raw), { load: () => saved, save: v => { saved = v; }, clear() {} });
  const v = new View(); const p = new ScenarioPresenter(app,v,audio);
  const button = (button: 'south' | 'east' | 'west' | 'north' | 'rb' | 'down') => p.input({ kind:'button',button });
  return { app,v,p,button };
}
describe('presentation modes', () => {
  it('uses first confirm to reveal text and second confirm to advance domain progress', () => {
    const { app,v,button } = setup(); button('south'); expect(v.model.mode).toBe('conversation');
    button('south'); expect(v.text).toBe(app.current.currentPart.kind === 'conversation' ? app.current.currentPart.lines[0].text : '');
    expect(app.current.currentLineIndex).toBe(0); button('south'); expect(app.current.currentLineIndex).toBe(1);
  });
  it('opening and closing evidence preserves dialogue position and typing progress', () => {
    const { app,v,p,button } = setup(); button('south'); p.update(80);
    const priorText = v.text; button('west'); expect(v.model.mode).toBe('evidence');
    p.update(80); button('east'); expect(v.model.mode).toBe('conversation');
    expect(v.text).toBe(priorText); expect(app.current.currentLineIndex).toBe(0);
  });
  it('freezes debate playback in overlays and interprets fire and retry separately', () => {
    const { app,v,p,button } = setup(); button('south');
    while (v.model.mode === 'conversation') { button('south'); }
    expect(v.model.mode).toBe('debate'); const before = p.diagnostics.debateIndex;
    button('west'); for (let i=0;i<200;i++) p.update(80);
    expect(p.diagnostics.debateIndex).toBe(before); button('east');
    v.target = 'd1-target'; button('south'); expect(v.model.mode).toBe('feedback');
    expect(app.current.currentResolved).toBe(false); button('south'); expect(v.model.mode).toBe('debate');
    button('rb'); v.target = 'd5-target'; button('south'); expect(v.model.feedback?.success).toBe(true);
    button('south'); expect(v.model.mode).toBe('conversation'); expect(app.current.currentPart.id).toBe('survey-intro');
  });
  it('pauses on suspend and ignores firing until the pause is closed', () => {
    const { app,v,p,button } = setup(); button('south'); p.suspend(); expect(v.model.mode).toBe('pause');
    const before = app.current.serialize(); for(let i=0;i<100;i++)p.update(80);
    expect(app.current.serialize()).toEqual(before); button('east'); expect(v.model.mode).toBe('conversation');
  });
});
