import type { GameModel } from '../presentation/ports';
import { C, UI } from './UI';

export class TitleView {
  render(ui: UI, m: GameModel) {
    ui.rect(0, 0, 725, 900, C.navy, 0.94, 0);
    ui.text(82, 104, 'EVIDENCE / LAB DISCUSSION', 20, C.tealText);
    ui.text(74, 148, '論拠', 118, C.white, undefined, '700');
    ui.line(84, 311, 590, 311, C.teal, 0.8);
    ui.text(83, 345, 'そのアプリ、\n本当に効果あり？', 43, C.white, 600, '700');
    ui.text(85, 495, '発言の矛盾を、根拠で撃ち抜く。', 24, '#bacdd2');
    ui.badge(83, 558, 'CASE 01', C.gold, 118);
    ui.text(219, 561, '研究室ディベート', 20, '#d4dee2');
    const buttons = m.canResume
      ? [['続きから', 'resume'], ['はじめから', 'start'], ['遊び方', 'help']] as const
      : [['議論をはじめる', 'start'], ['遊び方', 'help']] as const;
    buttons.forEach(([label, type], i) => ui.button(83, 630 + i * 65, 510, 53, label, { type }, m.selection === i, false, 24));
    ui.text(83, 853, '↑↓ 選択  /  Enter・A 決定  /  F 全画面', 17, C.muted);
    ui.rect(835, 111, 667, 112, C.navy, 0.8, 16);
    ui.text(866, 132, '「効果がある」と言う、その前に。', 28, C.white, 610, '700');
    ui.text(866, 179, '資料を読み、発言を見抜く。3つの論点を解こう。', 19, '#ccdcdf');
    ui.text(1010, 856, '1人用  /  目安 8–12分  /  自動セーブ', 18, '#e6efed');
  }
}
export class EvidenceView {
  render(ui: UI, m: GameModel) {
    ui.rect(95, 134, 1410, 670, C.paper, 0.99, 20, 0x70888d);
    ui.rect(95, 134, 1410, 85, C.navy, 1, 18);
    ui.text(132, 151, '弾丸・資料', 32, C.white, undefined, '700');
    ui.text(1120, 162, 'Ⅱ  議論停止中', 22, C.tealText);
    m.evidence.forEach((e, i) => ui.button(125, 251 + i * 108, 450, 88,
      `${String(i + 1).padStart(2, '0')}  ${e.title}${m.equipped === i ? '  ●' : ''}`,
      { type: 'selectEvidence', index: i }, i === m.evidenceIndex, true, 24));
    ui.line(605, 245, 605, 704, 0x8aa5a8, 0.5);
    const e = m.evidence[m.evidenceIndex];
    if (e) {
      ui.text(640, 247, e.title, 34, C.ink, 790, '700');
      ui.text(642, 310, e.source, 19, '#547478', 780);
      let y = 365;
      e.body.forEach(line => { const t = ui.text(643, y, '・' + line, 25, C.ink, 755); y += t.height + 17; });
    }
    ui.text(132, 745, '↑↓ / 方向キー：選択', 21, '#526c73');
    ui.button(711, 730, 370, 53, m.canEquip ? 'Enter / A  この弾丸を装備' : 'Enter / A  閉じる', { type: 'equip' }, true, false, 20);
    ui.button(1100, 730, 367, 53, 'Esc / B  元の画面へ', { type: 'close' }, false, false, 20);
  }
}
export class FeedbackView {
  render(ui: UI, m: GameModel) {
    const f = m.feedback!; const accent = f.success ? C.teal : C.gold;
    ui.rect(230, 179, 1140, 620, C.paper, 0.99, 20, accent);
    ui.rect(590, 148, 420, 78, f.success ? 0x226b69 : 0x996622, 1, 12, accent);
    const heading = ui.text(800, 187, f.success ? '指摘成立' : '指摘不成立', 42, C.white, undefined, '700'); heading.setOrigin(0.5);
    ui.text(269, 251, '指摘した発言', 19, '#6b7271');
    ui.text(820, 251, '使用した弾丸', 19, '#6b7271');
    ui.rect(267, 293, 520, 96, 0xece7da, 1, 10);
    ui.rect(813, 293, 520, 96, 0xe0eeea, 1, 10);
    ui.text(289, 307, f.statement, 25, C.ink, 470, '700');
    ui.text(836, 312, f.evidenceTitle, 27, C.ink, 470, '700');
    ui.text(270, 427, f.explanation, 28, C.ink, 1060);
    ui.rect(267, 603, 1066, 91, f.success ? 0xe0eeea : 0xf5e6c8, 1, 10);
    ui.text(291, 619, f.takeaway, 25, C.ink, 1010, '700');
    ui.button(270, 723, 705, 53, f.success ? 'Enter / A  会話へ進む' : 'Enter / A  議論に戻る', { type: 'continue' }, true, false, 24);
    ui.button(995, 723, 338, 53, 'X  資料を確認', { type: 'inspect' }, false, false, 22);
  }
}
export class SummaryView {
  render(ui: UI, m: GameModel) {
    ui.rect(66, 147, 1468, 677, C.paper, 0.99, 20);
    ui.text(109, 166, '今回の結論', 31, C.ink, undefined, '700');
    ui.badge(1325, 170, `解決 ${m.summary.solved} / ${m.debateCount}`, C.teal, 151);
    ui.rect(102, 231, 1396, 90, 0xf4e8ca, 1, 12);
    ui.text(130, 248, m.scenario.conclusion, 32, C.ink, 1335, '700');
    ui.text(111, 349, '確認できたこと', 27, '#226b69', undefined, '700');
    ui.text(859, 349, 'まだ分からないこと', 27, '#966720', undefined, '700');
    ui.line(800, 350, 800, 593, 0x9db2ad, 0.5);
    let y = 402;
    m.scenario.confirmed.forEach(line => { const t = ui.text(111, y, '・' + line, 24, C.ink, 650); y += t.height + 16; });
    y = 402;
    m.scenario.unknown.forEach(line => { const t = ui.text(859, y, '・' + line, 24, C.ink, 610); y += t.height + 24; });
    ui.rect(103, 633, 1394, 77, 0xe1eeea, 1, 10);
    ui.text(130, 649, '「分からない」は、「ない」とは違う。', 30, '#226b69', 1310, '700');
    ui.button(596, 746, 430, 57, 'もう一度遊ぶ', { type: 'replay' }, m.selection === 0, false, 25);
    ui.button(1052, 746, 430, 57, 'タイトルへ戻る', { type: 'title' }, m.selection === 1, false, 25);
    ui.text(111, 756, '← → 選択  /  Enter・A 決定', 19, '#526c73');
    ui.text(82, 856, 'このシナリオは、研究上の一般的な論点を組み合わせた架空のケースです。', 18, '#d7e4e6');
  }
}
export class MenuView {
  render(ui: UI, m: GameModel) {
    ui.rect(414, 199, 772, 525, C.navy, 0.99, 20, 0x527c80);
    ui.text(800, 232, 'Ⅱ  一時停止', 35, C.white, undefined, '700').setOrigin(0.5, 0);
    ui.text(800, 300, '進行は自動で保存されています。', 23, C.muted).setOrigin(0.5, 0);
    const options = [ ['議論に戻る', 'close'], [m.muted ? '効果音：OFF → ON' : '効果音：ON → OFF', 'sound'], ['タイトルへ戻る', 'title'] ] as const;
    options.forEach(([label,type],i) => ui.button(477, 371 + i * 86, 646, 65, label, { type }, m.selection === i, false, 26));
    ui.text(800, 668, '↑↓ 選択  /  Enter・A 決定  /  Esc・B 戻る', 18, C.muted).setOrigin(0.5, 0);
  }
}
export class HelpView {
  render(ui: UI) {
    ui.rect(151, 144, 1298, 656, C.navy, 0.99, 20, 0x527c80);
    ui.text(201, 174, '議論の進め方', 38, C.white, undefined, '700');
    ui.text(202, 243, '怪しい発言を見つけたら、根拠の弾丸を選んで撃ち込もう。', 27, C.tealText, 1170);
    const rows = [
      ['会話を進める / 指摘を撃つ', 'Enter・Space / A / 画面クリック'],
      ['照準を動かす', 'マウス / 方向キー・WASD / 左スティック'],
      ['弾丸を切り替える', 'Q・E / LB・RB / 画面の ‹ ›'],
      ['弾丸・資料を確認する', 'X / Xボタン / 資料ボタン'],
      ['一時停止 / 戻る', 'P・Esc / Y・B / 一時停止ボタン'],
      ['全画面 / 効果音切替', 'F / M / 画面右上のボタン'],
    ];
    rows.forEach(([name,key],i) => {
      ui.text(205, 318 + i * 52, name, 23, C.white);
      ui.text(695, 318 + i * 52, key, 21, '#bcd0d6');
      ui.line(205, 364 + i * 52, 1380, 364 + i * 52, 0x47626b, 0.4);
    });
    ui.text(204, 654, '色のついた言葉が、すべて間違いとは限りません。資料はいつでも確認できます。', 20, '#c9d9dd', 1180);
    ui.button(201, 719, 1190, 56, 'Enter / A / Esc  戻る', { type: 'close' }, true, false, 24);
  }
}
