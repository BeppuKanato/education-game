import { ScenarioSession, type SessionSave } from '../domain/ScenarioSession';
import type { Scenario } from '../domain/schema';

export interface SaveStore { load(): unknown; save(data: SessionSave): void; clear(): void; }
/** Application boundary. Only this class coordinates domain state and persistence. */
export class ScenarioApplicationService {
  private session: ScenarioSession;
  constructor(readonly scenario: Scenario, private readonly store: SaveStore) { this.session = new ScenarioSession(scenario); }
  get current() { return this.session; }
  canResume() { try { ScenarioSession.restore(this.scenario, this.store.load()); return true; } catch { return false; } }
  start(resume: boolean) {
    this.session = resume ? ScenarioSession.restore(this.scenario, this.store.load()) : new ScenarioSession(this.scenario);
    this.persist(); return this.session;
  }
  advanceConversation() { this.session.advanceConversation(); this.persist(); }
  submit(partId: string, targetId: string, evidenceId: string) {
    const result = this.session.judge(partId, targetId, evidenceId); this.persist(); return result;
  }
  continueAfterSuccess() { this.session.finishDebate(); this.persist(); }
  private persist() { this.store.save(this.session.serialize()); }
}
