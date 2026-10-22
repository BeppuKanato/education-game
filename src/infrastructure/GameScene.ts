import Phaser from 'phaser';
import scenarioData from '../content/scenario.json';
import { validateScenario } from '../domain/schema';
import { ScenarioApplicationService } from '../application/ScenarioApplicationService';
import { ScenarioPresenter } from '../presentation/ScenarioPresenter';
import { GameView } from '../views/GameView';
import { InputManager } from './InputManager';
import { LocalSaveStore } from './LocalSaveStore';
import { SoundPlayer } from './SoundPlayer';

export class GameScene extends Phaser.Scene {
  private presenter?: ScenarioPresenter;
  private inputAdapter?: InputManager;
  constructor() { super('learning-game'); }
  preload() {
    this.load.image('lab', '/assets/lab-room.png');
    this.load.image('researchers', '/assets/researchers.png');
    const bar = this.add.rectangle(800, 450, 0, 4, 0x58cfbd);
    this.load.on('progress', (progress: number) => bar.width = progress * 600);
    this.load.once('complete', () => bar.destroy());
  }
  create() {
    const texture = this.textures.get('researchers');
    // Original atlas is retained unchanged. Frames reference native image regions.
    const regions = [[0,480],[480,430],[910,430],[1340,434]];
    ['haruno','mizuki','kuroda','saeki'].forEach((id,i) => texture.add(id, 0, regions[i][0],0,regions[i][1],887));
    const scenario = validateScenario(scenarioData);
    const save = new LocalSaveStore();
    const app = new ScenarioApplicationService(scenario,save);
    const view = new GameView(this,scenario.characters);
    const sound = new SoundPlayer();
    this.presenter = new ScenarioPresenter(app,view,sound,() => save.warning);
    this.inputAdapter = new InputManager(this.game.canvas,e => this.presenter?.input(e));
    const suspend = () => { if (document.hidden) this.presenter?.suspend(); };
    const blur = () => this.presenter?.suspend();
    document.addEventListener('visibilitychange',suspend); window.addEventListener('blur',blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputAdapter?.destroy(); document.removeEventListener('visibilitychange',suspend); window.removeEventListener('blur',blur);
    });
    document.getElementById('loading')?.remove();
    if (import.meta.env.DEV) {
      Object.defineProperty(window, '__educationGame', { configurable: true, get: () => ({ ...this.presenter?.diagnostics, target: view.targetBounds }) });
    }
  }
  update(_time: number,delta: number) { this.inputAdapter?.update(); this.presenter?.update(delta); }
}
