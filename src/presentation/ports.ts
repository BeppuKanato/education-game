import type { Character, DebatePart, Dialogue, Evidence, Scenario } from '../domain/schema';
import type { Judgment } from '../domain/ScenarioSession';
export type Mode = 'title' | 'conversation' | 'debate' | 'evidence' | 'feedback' | 'pause' | 'help' | 'summary';
export type Button = 'south' | 'east' | 'west' | 'north' | 'lb' | 'rb' | 'up' | 'down' | 'left' | 'right' | 'menu' | 'fullscreen' | 'mute';
export type GameInput =
  | { kind: 'button'; button: Button }
  | { kind: 'axis'; x: number; y: number }
  | { kind: 'pointerMove'; x: number; y: number }
  | { kind: 'pointerDown'; x: number; y: number };
export type UIAction = { type: 'start' | 'resume' | 'help' | 'advance' | 'inspect' | 'pause' | 'previous' | 'next' | 'close' | 'equip' | 'continue' | 'title' | 'replay' | 'sound' | 'fullscreen' }
  | { type: 'selectEvidence'; index: number };
export interface GameModel {
  mode: Mode; scenario: Scenario; progress: number; partTitle: string; partId: string;
  dialogue?: Dialogue; character?: Character; linePosition: string;
  debate?: DebatePart; debateIndex: number; debateNumber: number; debateCount: number;
  evidence: Evidence[]; equipped: number; evidenceIndex: number; canEquip: boolean;
  feedback?: Judgment; selection: number; canResume: boolean;
  summary: { solved: number; attempts: number }; muted: boolean; notice: string;
}
export interface ViewPort {
  render(model: GameModel): void;
  setDialogue(text: string, complete: boolean): void;
  setAim(x: number, y: number): void;
  animateDebate(elapsed: number): void;
  hitUI(x: number, y: number): UIAction | undefined;
  hitTarget(x: number, y: number): string | undefined;
  shot(x: number, y: number, hit: boolean): void;
  fullscreen(): void;
}
export interface SoundPort { unlock(): void; play(kind: 'select' | 'shot' | 'success' | 'failure'): void; setMuted(value: boolean): void; }
