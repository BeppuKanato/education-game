import { test, expect, type Page } from '@playwright/test';
type Diagnostics = { mode: string; partId: string; lineIndex: number; debateIndex: number; equippedId: string; target?: { x: number; y: number; id: string }; save: { partIndex: number } };
async function state(page: Page): Promise<Diagnostics> {
  return page.evaluate(() => (window as unknown as { __educationGame: Diagnostics }).__educationGame);
}
async function press(page: Page,key: string) { await page.keyboard.press(key); await page.waitForTimeout(65); }
async function throughConversation(page: Page) {
  for (let i=0;i<100;i++) {
    if ((await state(page)).mode !== 'conversation') return;
    await press(page,'Enter');
  }
  throw new Error('conversation did not end');
}
async function fireAt(page: Page,id: string) {
  await page.waitForFunction(targetId => (window as unknown as {__educationGame: Diagnostics}).__educationGame?.target?.id === targetId,id,{timeout:45000});
  const target = (await state(page)).target!;
  await page.mouse.click(target.x,target.y);
  await expect(page.locator('canvas')).toHaveAttribute('data-mode','feedback');
}
test('complete scenario: incorrect match, evidence, pause, three solutions, summary and replay', async ({page}) => {
  const errors: string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-mode','title');
  await page.screenshot({path:'test-results/title.png'});
  await press(page,'Enter'); await throughConversation(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-mode','debate');
  await page.screenshot({path:'test-results/debate.png'});
  const before=(await state(page)).debateIndex;
  await press(page,'KeyP'); await expect(page.locator('canvas')).toHaveAttribute('data-mode','pause');
  await page.waitForTimeout(300); expect((await state(page)).debateIndex).toBe(before); await press(page,'Escape');
  await fireAt(page,'d1-target'); await expect(page.locator('#accessible-status')).toContainText('指摘不成立');
  await press(page,'KeyX'); await expect(page.locator('canvas')).toHaveAttribute('data-mode','evidence');
  await page.screenshot({path:'test-results/evidence.png'});
  await press(page,'Escape'); await expect(page.locator('canvas')).toHaveAttribute('data-mode','feedback');
  await press(page,'Enter'); await press(page,'KeyE'); expect((await state(page)).equippedId).toBe('experience');
  await fireAt(page,'d4-target'); await expect(page.locator('#accessible-status')).toContainText('指摘成立');
  await page.screenshot({path:'test-results/success.png'});
  // A successful shot awaiting acknowledgement survives a real reload.
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-mode','title');
  await press(page,'Enter'); await expect(page.locator('canvas')).toHaveAttribute('data-mode','feedback');
  await press(page,'Enter'); await throughConversation(page);
  expect((await state(page)).partId).toBe('response');
  await press(page,'KeyE'); await press(page,'KeyE'); expect((await state(page)).equippedId).toBe('survey');
  await fireAt(page,'s4-target'); await press(page,'Enter'); await throughConversation(page);
  expect((await state(page)).partId).toBe('absence');
  await press(page,'KeyE'); expect((await state(page)).equippedId).toBe('limit');
  await fireAt(page,'a3-target'); await press(page,'Enter'); await throughConversation(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-mode','summary');
  await page.screenshot({path:'test-results/summary.png'});
  await press(page,'Enter'); await expect(page.locator('canvas')).toHaveAttribute('data-mode','conversation');
  expect((await state(page)).partId).toBe('intro'); expect(errors).toEqual([]);
});
test('corrupt save, click controls, resize and keyboard evidence navigation', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('education-game:app-evidence:v1','{"broken":true}'));
  await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-mode','title');
  await page.mouse.click(300,654); await expect(page.locator('canvas')).toHaveAttribute('data-mode','conversation');
  await press(page,'KeyX'); await press(page,'ArrowDown');
  await page.waitForTimeout(100); expect((await state(page)).mode).toBe('evidence');
  await page.setViewportSize({width:1024,height:768}); await page.screenshot({path:'test-results/resized.png'});
  await press(page,'Escape'); await expect(page.locator('canvas')).toHaveAttribute('data-mode','conversation');
});
test('standard gamepad maps buttons, ignores held confirm, and controls evidence navigation', async ({page}) => {
  await page.addInitScript(()=> {
    const pad = { connected:true, axes:[0,0], buttons:Array.from({length:16},()=>({pressed:false,touched:false,value:0})), mapping:'standard', index:0, id:'Test standard gamepad', timestamp:0 };
    Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});
    Object.defineProperty(window,'testPad',{value:pad});
  });
  const padButton = async(index:number,pressed:boolean) => {
    await page.evaluate(({index,pressed})=>{
      const p=(window as unknown as {testPad:{buttons:{pressed:boolean;value:number}[]}}).testPad;
      p.buttons[index].pressed=pressed;p.buttons[index].value=pressed?1:0;
    },{index,pressed});
    await page.waitForTimeout(180);
  };
  await page.goto('/');await expect(page.locator('canvas')).toHaveAttribute('data-mode','title');
  await padButton(0,true);await expect(page.locator('canvas')).toHaveAttribute('data-mode','conversation');
  await page.waitForTimeout(500);expect((await state(page)).lineIndex).toBe(0);await padButton(0,false);
  await padButton(2,true);await padButton(2,false);await expect(page.locator('canvas')).toHaveAttribute('data-mode','evidence');
  await padButton(13,true);await padButton(13,false);await expect(page.locator('#accessible-status')).toContainText('全員、このテーマを授業');
  await padButton(1,true);await padButton(1,false);await expect(page.locator('canvas')).toHaveAttribute('data-mode','conversation');
});
