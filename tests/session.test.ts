import { describe, expect, it } from 'vitest';
import raw from '../src/content/scenario.json';
import { validateScenario } from '../src/domain/schema';
import { ScenarioSession } from '../src/domain/ScenarioSession';
import { ScenarioApplicationService, type SaveStore } from '../src/application/ScenarioApplicationService';
const scenario = validateScenario(raw);
function nextDebate(s: ScenarioSession) { while (s.currentPart?.kind === 'conversation') s.advanceConversation(); }
function solve(s: ScenarioSession) {
  const p = s.currentPart;
  if (p.kind !== 'debate') throw Error('not debate');
  const solution = p.solutions[0];
  s.judge(p.id, solution.targetId, solution.evidenceIds[0]); s.finishDebate();
}
function store() { let saved: unknown = null; return { load: () => saved, save: (v: unknown) => { saved = structuredClone(v); }, clear: () => { saved = null; } } satisfies SaveStore; }
describe('scenario progression and evidence', () => {
  it('plays every conversation and all three debates through to the conclusion', () => {
    const s = new ScenarioSession(scenario);
    expect(s.availableEvidence.map(e => e.id)).not.toContain('limit');
    nextDebate(s); expect(s.currentPart.id).toBe('difference'); solve(s);
    nextDebate(s); expect(s.currentPart.id).toBe('response'); expect(s.availableEvidence.map(e => e.id)).toContain('limit'); solve(s);
    nextDebate(s); expect(s.currentPart.id).toBe('absence'); solve(s);
    nextDebate(s); expect(s.complete).toBe(true); expect(s.solvedCount).toBe(3); expect(s.progress).toBe(1);
  });
  it('rejects correct-looking but unavailable evidence, stale targets, and unresolved advancement', () => {
    const s = new ScenarioSession(scenario); nextDebate(s);
    expect(() => s.judge('difference','d5-target','limit')).toThrow();
    expect(() => s.judge('absence','a3-target','experience')).toThrow();
    expect(() => s.finishDebate()).toThrow();
    expect(() => s.advanceConversation()).toThrow();
  });
  it('keeps an incorrect attempt in the same unresolved part and accepts a supported alternative', () => {
    const s = new ScenarioSession(scenario); nextDebate(s);
    expect(s.judge('difference','d1-target','scores').success).toBe(false);
    expect(s.currentResolved).toBe(false); expect(s.currentPart.id).toBe('difference');
    expect(s.judge('difference','d4-target','experience').success).toBe(true);
    expect(() => s.judge('difference','d5-target','experience')).toThrow();
    expect(s.pendingSuccess?.targetId).toBe('d4-target');
  });
});
describe('persistence', () => {
  it('restores a mid-dialogue save and grants evidence exactly when its line is reached', () => {
    const s = new ScenarioSession(scenario); nextDebate(s); solve(s);
    expect(s.availableEvidence.map(e => e.id)).not.toContain('limit');
    s.advanceConversation(); s.advanceConversation(); s.advanceConversation();
    expect(s.availableEvidence.map(e => e.id)).toContain('limit');
    const restored = ScenarioSession.restore(scenario, JSON.parse(JSON.stringify(s.serialize())));
    expect(restored.currentLineIndex).toBe(3); expect(restored.serialize()).toEqual(s.serialize());
  });
  it('preserves success awaiting acknowledgement across a reload', () => {
    const s = new ScenarioSession(scenario); nextDebate(s); s.judge('difference','d5-target','experience');
    const restored = ScenarioSession.restore(scenario,s.serialize());
    expect(restored.pendingSuccess?.success).toBe(true); restored.finishDebate(); expect(restored.currentPart.id).toBe('survey-intro');
  });
  it('rejects incompatible, corrupted and skipped progress', () => {
    const s = new ScenarioSession(scenario).serialize();
    for (const patch of [{ revision: 999 },{ partIndex: 99 },{ lineIndex: 999 },{ partIndex: 2 },{ resolved: ['missing'] },{ version: 0 }]) {
      expect(() => ScenarioSession.restore(scenario,{ ...s,...patch })).toThrow();
    }
  });
  it('saves after each application command and safely detects invalid stored data', () => {
    const st = store(); const app = new ScenarioApplicationService(scenario,st);
    expect(app.canResume()).toBe(false); app.start(false); app.advanceConversation();
    const other = new ScenarioApplicationService(scenario,st); expect(other.canResume()).toBe(true);
    other.start(true); expect(other.current.currentLineIndex).toBe(1);
    st.save({ broken: true }); expect(other.canResume()).toBe(false);
  });
});
describe('content validation', () => {
  it('rejects unreachable evidence and duplicate or missing IDs', () => {
    const broken = structuredClone(raw); broken.parts[1] = { ...broken.parts[1], solutions: [{ targetId:'no-such-target', evidenceIds:['scores'] }] } as typeof broken.parts[number];
    expect(() => validateScenario(broken)).toThrow();
    expect(() => validateScenario({ ...raw, initialEvidence: ['unknown'] })).toThrow();
    expect(() => validateScenario({ ...raw, parts: [raw.parts[0],raw.parts[0]] })).toThrow();
  });
});
