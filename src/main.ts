import Phaser from 'phaser';
import { GameScene } from './infrastructure/GameScene';
import './style.css';

async function boot() {
  await document.fonts.load('500 28px "Noto Sans JP"');
  await document.fonts.ready;
  new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: 1600, height: 900,
    backgroundColor: '#101e2c', antialias: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'game' },
    scene: [GameScene], render: { roundPixels: false, powerPreference: 'high-performance' },
    input: { activePointers: 3 },
    audio: { noAudio: true },
  });
}
void boot().catch(error => {
  console.error('ゲームの起動に失敗しました',error);
  const root = document.getElementById('loading');
  if (root) root.textContent = '読み込みに失敗しました。ネットワークを確認してページを再読み込みしてください。';
});
