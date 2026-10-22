import { z } from 'zod';

const dialogue = z.object({
  speaker: z.string(), text: z.string().min(1), grantEvidence: z.array(z.string()).optional(),
});
const target = z.object({ id: z.string(), text: z.string().min(1) });
const debateLine = z.object({
  id: z.string(), speaker: z.string(), prefix: z.string(), target: target.optional(), suffix: z.string().default(''),
});
const solution = z.object({ targetId: z.string(), evidenceIds: z.array(z.string()).min(1) });
export const scenarioSchema = z.object({
  id: z.string(), revision: z.number().int().positive(), title: z.string(), subtitle: z.string(), question: z.string(),
  characters: z.array(z.object({ id: z.string(), name: z.string(), role: z.string(), frame: z.number().int().min(0).max(3), color: z.string() })),
  initialEvidence: z.array(z.string()),
  evidence: z.array(z.object({ id: z.string(), title: z.string(), source: z.string(), short: z.string(), body: z.array(z.string()).min(1) })),
  parts: z.array(z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('conversation'), id: z.string(), title: z.string(), lines: z.array(dialogue).min(1) }),
    z.object({
      kind: z.literal('debate'), id: z.string(), title: z.string(), question: z.string(),
      lines: z.array(debateLine).min(1), solutions: z.array(solution).min(1),
      explanation: z.string(), takeaway: z.string(), hint: z.string(),
    }),
  ])).min(1),
  conclusion: z.string(), confirmed: z.array(z.string()), unknown: z.array(z.string()), takeaways: z.array(z.string()),
});
export type Scenario = z.infer<typeof scenarioSchema>;
export type Part = Scenario['parts'][number];
export type ConversationPart = Extract<Part, { kind: 'conversation' }>;
export type DebatePart = Extract<Part, { kind: 'debate' }>;
export type Evidence = Scenario['evidence'][number];
export type Character = Scenario['characters'][number];
export type Dialogue = ConversationPart['lines'][number];
export type DebateLine = DebatePart['lines'][number];

/** Content validation runs before a session can start; IDs must be globally unambiguous. */
export function validateScenario(input: unknown): Scenario {
  const s = scenarioSchema.parse(input);
  const unique = (ids: string[], name: string) => {
    if (new Set(ids).size !== ids.length) throw new Error(`${name}のIDが重複しています`);
  };
  unique(s.parts.map(p => p.id), 'パート');
  unique(s.characters.map(c => c.id), '登場人物');
  unique(s.evidence.map(e => e.id), '資料');
  const evidence = new Set(s.evidence.map(e => e.id));
  const people = new Set([...s.characters.map(c => c.id), 'player']);
  const available = new Set(s.initialEvidence);
  for (const id of available) if (!evidence.has(id)) throw new Error('初期弾丸が存在しません');
  for (const p of s.parts) {
    for (const line of p.lines) if (!people.has(line.speaker)) throw new Error('発言者が存在しません');
    if (p.kind === 'conversation') {
      for (const l of p.lines) for (const id of l.grantEvidence ?? []) {
        if (!evidence.has(id)) throw new Error('追加弾丸が存在しません');
        available.add(id);
      }
    } else {
      unique(p.lines.map(l => l.id), '発言');
      const targets = p.lines.flatMap(l => l.target ? [l.target.id] : []);
      unique(targets, '指摘箇所');
      for (const sol of p.solutions) {
        if (!targets.includes(sol.targetId)) throw new Error('正解の指摘箇所が存在しません');
        if (sol.evidenceIds.some(id => !available.has(id))) throw new Error('未取得の弾丸でしか解けない問題です');
      }
    }
  }
  return s;
}
