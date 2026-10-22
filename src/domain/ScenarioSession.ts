import { z } from 'zod';
import type { DebatePart, Evidence, Scenario } from './schema';

const attemptSchema = z.object({ partId: z.string(), targetId: z.string(), evidenceId: z.string(), success: z.boolean() });
export const saveSchema = z.object({
  version: z.literal(1), scenarioId: z.string(), revision: z.number().int(),
  partIndex: z.number().int().nonnegative(), lineIndex: z.number().int().nonnegative(),
  resolved: z.array(z.string()), attempts: z.array(attemptSchema).max(10000),
});
export type SessionSave = z.infer<typeof saveSchema>;
export type Judgment = z.infer<typeof attemptSchema> & { statement: string; evidenceTitle: string; explanation: string; takeaway: string };

export class ScenarioSession {
  private partIndex = 0;
  private lineIndex = 0;
  private resolved = new Set<string>();
  private attempts: SessionSave['attempts'] = [];
  constructor(readonly scenario: Scenario) {}
  get currentPart() { return this.scenario.parts[this.partIndex]; }
  get currentLineIndex() { return this.lineIndex; }
  get complete() { return this.partIndex === this.scenario.parts.length; }
  get progress() { return this.partIndex / this.scenario.parts.length; }
  get solvedCount() { return this.resolved.size; }
  get attemptCount() { return this.attempts.length; }
  get currentResolved() { return this.currentPart ? this.resolved.has(this.currentPart.id) : false; }
  get availableEvidence(): Evidence[] {
    const ids = new Set(this.scenario.initialEvidence);
    for (let i = 0; i <= Math.min(this.partIndex, this.scenario.parts.length - 1); i++) {
      const part = this.scenario.parts[i];
      if (part.kind !== 'conversation') continue;
      const end = i < this.partIndex || this.complete ? part.lines.length - 1 : this.lineIndex;
      part.lines.slice(0, end + 1).forEach(l => l.grantEvidence?.forEach(id => ids.add(id)));
    }
    return this.scenario.evidence.filter(e => ids.has(e.id));
  }
  advanceConversation() {
    const part = this.currentPart;
    if (!part || part.kind !== 'conversation') throw new Error('会話パートではありません');
    if (this.lineIndex + 1 < part.lines.length) this.lineIndex++;
    else { this.partIndex++; this.lineIndex = 0; }
  }
  private matches(part: DebatePart, targetId: string, evidenceId: string) {
    return part.solutions.some(s => s.targetId === targetId && s.evidenceIds.includes(evidenceId));
  }
  judge(partId: string, targetId: string, evidenceId: string): Judgment {
    const part = this.currentPart;
    if (!part || part.kind !== 'debate' || part.id !== partId || this.currentResolved) throw new Error('現在の未解決パートではありません');
    const target = part.lines.find(l => l.target?.id === targetId)?.target;
    const evidence = this.availableEvidence.find(e => e.id === evidenceId);
    if (!target || !evidence) throw new Error('指摘箇所または弾丸が無効です');
    const success = this.matches(part, targetId, evidenceId);
    const attempt = { partId, targetId, evidenceId, success };
    this.attempts.push(attempt);
    if (this.attempts.length > 10000) this.attempts.splice(this.attempts.findIndex(a => !a.success), 1);
    if (success) this.resolved.add(partId);
    return this.describeJudgment(attempt);
  }
  describeJudgment(attempt: SessionSave['attempts'][number]): Judgment {
    const part = this.scenario.parts.find(p => p.id === attempt.partId);
    if (!part || part.kind !== 'debate') throw new Error('議論が存在しません');
    const statement = part.lines.find(l => l.target?.id === attempt.targetId)?.target?.text ?? '';
    const evidenceTitle = this.scenario.evidence.find(e => e.id === attempt.evidenceId)?.title ?? '';
    return { ...attempt, statement, evidenceTitle,
      explanation: attempt.success ? part.explanation : 'この発言と弾丸の組み合わせでは、反論は成立しません。資料の事実が、その主張を否定する根拠になるかを確かめてみましょう。',
      takeaway: attempt.success ? part.takeaway : part.hint };
  }
  get pendingSuccess(): Judgment | undefined {
    if (!this.currentResolved) return;
    const last = this.attempts.findLast(a => a.partId === this.currentPart?.id && a.success);
    return last ? this.describeJudgment(last) : undefined;
  }
  finishDebate() {
    if (this.currentPart?.kind !== 'debate' || !this.currentResolved) throw new Error('指摘が成立していません');
    this.partIndex++; this.lineIndex = 0;
  }
  serialize(): SessionSave {
    return { version: 1, scenarioId: this.scenario.id, revision: this.scenario.revision, partIndex: this.partIndex,
      lineIndex: this.lineIndex, resolved: [...this.resolved], attempts: this.attempts.map(a => ({ ...a })) };
  }
  static restore(scenario: Scenario, raw: unknown): ScenarioSession {
    const s = saveSchema.parse(raw);
    if (s.scenarioId !== scenario.id || s.revision !== scenario.revision || s.partIndex > scenario.parts.length) throw new Error('セーブのバージョンが一致しません');
    const part = scenario.parts[s.partIndex];
    if (part?.kind === 'conversation' ? s.lineIndex >= part.lines.length : s.lineIndex !== 0) throw new Error('会話位置が無効です');
    const session = new ScenarioSession(scenario);
    session.partIndex = s.partIndex; session.lineIndex = s.lineIndex;
    for (const id of s.resolved) {
      const index = scenario.parts.findIndex(p => p.id === id && p.kind === 'debate');
      if (index < 0 || index > s.partIndex) throw new Error('解決済みパートが無効です');
    }
    for (const prior of scenario.parts.slice(0, s.partIndex)) {
      if (prior.kind === 'debate' && !s.resolved.includes(prior.id)) throw new Error('未解決パートを飛ばしています');
    }
    for (const a of s.attempts) {
      const p = scenario.parts.find(p => p.id === a.partId);
      if (!p || p.kind !== 'debate' || !p.lines.some(l => l.target?.id === a.targetId) || !scenario.evidence.some(e => e.id === a.evidenceId)
        || session.matches(p, a.targetId, a.evidenceId) !== a.success) throw new Error('指摘履歴が無効です');
    }
    if (s.resolved.some(id => !s.attempts.some(a => a.partId === id && a.success))) throw new Error('成立の履歴がありません');
    session.resolved = new Set(s.resolved); session.attempts = s.attempts;
    return session;
  }
}
