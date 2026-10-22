import type { SaveStore } from '../application/ScenarioApplicationService';
import type { SessionSave } from '../domain/ScenarioSession';
export class LocalSaveStore implements SaveStore {
  readonly key = 'education-game:app-evidence:v1';
  warning = '';
  load(): unknown {
    try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : null; }
    catch { this.warning = 'このブラウザではセーブを読み込めません。'; return null; }
  }
  save(data: SessionSave) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); }
    catch { this.warning = '保存できないため、このタブを閉じると進行が失われます。'; }
  }
  clear() { try { localStorage.removeItem(this.key); } catch { /* Play remains available without storage. */ } }
}
