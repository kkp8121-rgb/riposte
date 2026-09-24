/* =============================================================================
 * RIPOSTE — tests/touch.mjs
 * 모바일 터치 조작 (docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md §8).
 * 헤드리스 chromium 으로 가로 폰(915×412, 터치)을 흉내 내고 CDP Input.dispatchTouchEvent 로
 * 멀티터치를 보낸다. 게임 상태는 window.__RIPOSTE 훅으로만 읽는다.
 *
 *   node tests/touch.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOTS = join(__dirname, 'shots');

const failures = [];
const errors = [];
const t0 = Date.now();

function check(name, cond, detail = '') {
  if (cond) console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`);
  else { console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`); failures.push(name); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await page.evaluate(fn).catch(() => null);
    if (v) return true;
    await sleep(50);
  }
  console.log(`  ...timeout waiting for ${label} (${timeoutMs}ms)`);
  return false;
}

const state = () => window.__RIPOSTE.getState();
const url = (q) => pathToFileURL(join(ROOT, 'index.html')).href + q;
/* 가로 폰 — 갤럭시 S 계열 20:9 (스펙 §5 기준 화면) */
const PHONE = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

function hookErrors(page) {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
}

/* 손가락 — CDP 는 "지금 닿아 있는 손가락 전부" 를 받는다. target = 버튼 id 또는 {x, y}(화면 CSS px) */
function fingers(page, cdp) {
  const down = new Map();
  const pos = (target) => (typeof target === 'string'
    ? page.evaluate((id) => window.__RIPOSTE.touch.center(id), target)
    : Promise.resolve(target));
  const pts = () => [...down.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id }));
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  return {
    async start(id, target) { down.set(id, await pos(target)); await send('touchStart', pts()); },
    async move(id, target) { down.set(id, await pos(target)); await send('touchMove', pts()); },
    // CDP 는 touchEnd 이벤트에 실린 점만 뗀다 — 남은 손가락 목록으로 짧아진 touchMove 를 보내는 것으로는
    // 빠진 손가락이 떼어지지 않는다(Puppeteer CdpTouchHandle 방식: 뗄 손가락 하나만 touchEnd 에 싣는다).
    async end(id) {
      const released = down.get(id);
      down.delete(id);
      const remaining = pts();
      await send('touchEnd', remaining.length ? [{ x: released.x, y: released.y, id }] : []);
    },
    async cancel() { down.clear(); await send('touchCancel', []); },
    async hold(target, ms) { await this.start(99, target); await sleep(ms); await this.end(99); await sleep(120); },
    async tap(target) { await this.hold(target, 80); },
  };
}

async function openPhone(browser, q) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  hookErrors(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(url(q), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  return { ctx, page, f: fingers(page, cdp), cdp };
}

/* ---- T-detect: 판별 ------------------------------------------------------- */
async function tDetect(browser) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  hookErrors(page);
  await page.goto(url('?mute=1'), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  const d = await page.evaluate(() => {
    const T = window.__RIPOSTE.touch;
    return [T.detect(undefined, true), T.detect(undefined, false), T.detect('1', false), T.detect('0', true)];
  });
  check('T-detect: detect() — coarse on · fine off · ?touch=1 forces on · ?touch=0 forces off',
    d.join() === 'true,false,true,false', JSON.stringify(d));
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (coarse) {
    const s = await page.evaluate(state);
    check('T-detect: phone emulation (pointer: coarse) turns touch mode on without ?touch', s.touch.on === true, JSON.stringify(s.touch));
    check('T-detect: buttons are visible from boot on a phone', s.touch.visible === true);
  } else {
    console.log('  NOTE  this emulation does not report pointer: coarse — boot detection is covered by detect() above');
  }
  await ctx.close();
}

/* ---- T-desktop: PC 에서는 절대 안 켜진다 ---------------------------------- */
async function tDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  hookErrors(page);
  await page.goto(url('?mute=1'), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  const s0 = await page.evaluate(state);
  check('T-desktop: PC (no touch) — touch mode off', s0.touch.on === false, JSON.stringify(s0.touch));
  await page.mouse.click(480, 270);
  await sleep(150);
  const s1 = await page.evaluate(state);
  check('T-desktop: clicking the canvas does not turn it on', s1.touch.on === false, JSON.stringify(s1.touch));
  await page.close();
}

/* ---- T-scenes: 모든 scene 에 세트가 있고, 버튼은 기존 액션만 누른다 -------- */
async function tScenes(browser) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  hookErrors(page);
  await page.goto(url('?mute=1'), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  const src = readFileSync(join(ROOT, 'js', 'game.js'), 'utf8');
  const scenes = [...src.matchAll(/case '([A-Z]+)':\s*this\.step/g)].map((m) => m[1]);
  const T = await page.evaluate(() => {
    const t = window.__RIPOSTE.CONFIG.TOUCH;
    return { sets: t.SETS, buttons: t.BUTTONS };
  });
  const missing = scenes.filter((s) => !T.sets[s]);
  check('T-scenes: every scene in js/game.js has a touch button set', scenes.length >= 11 && missing.length === 0,
    `(scenes ${scenes.length}, missing [${missing}])`);
  const VERBS = ['left', 'right', 'parry', 'riposte', 'dash', 'confirm', 'back', 'restart', 'up', 'down', 'newgame'];
  const bad = [];
  for (const [scene, ids] of Object.entries(T.sets)) {
    for (const id of ids) {
      const b = T.buttons[id];
      if (!b) bad.push(`${scene}:${id}?`);
      else if (!b.special && !VERBS.includes(b.action)) bad.push(`${id}->${b.action}`);
    }
  }
  check('T-scenes: every button exists and presses an existing action (no new verbs)', bad.length === 0, bad.join(' '));
  await page.close();
}

/* ---- T-multi · T-slide · RF4 · T-hold: 전투 -------------------------------- */
async function tFight(browser) {
  const { ctx, page, f } = await openPhone(browser, '?boss=1&story=0&mute=1&touch=1');
  const inFight = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT');
  check('fight: ?boss=1 reaches FIGHT on the phone', inFight);
  const s0 = await page.evaluate(state);
  const want = await page.evaluate(() => window.__RIPOSTE.CONFIG.TOUCH.SETS.FIGHT.join());
  check('fight: FIGHT shows the fight button set', s0.touch.set.join() === want, s0.touch.set.join());

  // T-multi — 오른쪽을 쥔 채 PARRY 를 누른다
  await f.start(1, 'right');
  await sleep(250);
  await f.start(2, 'parry');
  await waitFor(page, () => window.__RIPOSTE.getState().stamina < 100, 1000, 'parry fired');
  const sMid = await page.evaluate(state);
  await f.end(2);
  await sleep(150);
  const sHold = await page.evaluate(state);
  await f.end(1);
  await sleep(100);
  const sUp = await page.evaluate(state);
  check('T-multi: holding RIGHT moves the player right', sHold.playerX > s0.playerX + 10,
    `(${s0.playerX.toFixed(1)} -> ${sHold.playerX.toFixed(1)})`);
  check('T-multi: PARRY tapped while RIGHT is held fires a parry (stamina spent)', sMid.stamina < s0.stamina,
    `(stamina ${s0.stamina} -> ${sMid.stamina})`);
  check('T-multi: RIGHT stays held while the other finger lifts', sHold.touch.held.join() === 'right', sHold.touch.held.join());
  check('T-multi: all fingers up -> nothing held', sUp.touch.held.length === 0, sUp.touch.held.join());

  // T-slide — ◀ 에서 ▶ 로 미끄러뜨린다
  await f.start(1, 'left');
  await sleep(80);
  const a = await page.evaluate(state);
  await f.move(1, 'right');
  await sleep(80);
  const b = await page.evaluate(state);
  await f.end(1);
  await sleep(80);
  check('T-slide: a finger on LEFT holds left', a.touch.held.join() === 'left', a.touch.held.join());
  check('T-slide: sliding onto RIGHT switches to right', b.touch.held.join() === 'right', b.touch.held.join());

  // RF4 — 키보드와 터치가 같은 액션을 쥔다: 손가락을 떼도 키보드 이동은 계속된다
  await page.keyboard.down('ArrowRight');
  await f.tap('right');
  const xa = (await page.evaluate(state)).playerX;
  await sleep(200);
  const xb = (await page.evaluate(state)).playerX;
  await page.keyboard.up('ArrowRight');
  check('RF4: lifting a finger from RIGHT does not cut the keyboard\'s held RIGHT', xb > xa + 5,
    `(${xa.toFixed(1)} -> ${xb.toFixed(1)})`);

  // T-hold — 전투 중 RETRY·TITLE 은 꾹 눌러야 한다
  await f.hold('title', 150);
  check('T-hold: a short tap on TITLE (hold button) does nothing', (await page.evaluate(state)).scene === 'FIGHT');
  const tries0 = (await page.evaluate(state)).tries;
  await f.hold('retry', 800);                   // 0.5초에 발동 — hold() 는 뗀 뒤 120ms 더 기다린다
  const tries1 = (await page.evaluate(state)).tries;
  check('T-hold: holding RETRY restarts the boss', tries1 === tries0 + 1, `(tries ${tries0} -> ${tries1})`);
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT again');
  await f.hold('title', 800);
  const home = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'TITLE', 3000, 'TITLE');
  check('T-hold: holding TITLE returns to the title', home);
  await ctx.close();
}

/* ---- RF1~RF3: 쥔 채 화면 전환·취소·포커스 잃음 ---------------------------- */
async function tRelease(browser) {
  const { ctx, page, f } = await openPhone(browser, '?boss=1&story=0&mute=1&touch=1');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT');

  await f.start(1, 'left');
  await sleep(80);
  await f.cancel();
  await sleep(80);
  check('RF2: pointercancel releases the held action', (await page.evaluate(state)).touch.held.length === 0);

  await f.start(1, 'left');
  await sleep(80);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await sleep(80);
  check('RF3: window blur releases the held action', (await page.evaluate(state)).touch.held.length === 0);
  await f.end(1);
  await sleep(80);
  check('RF3: lifting the finger after blur leaves nothing held', (await page.evaluate(state)).touch.held.length === 0);

  await f.start(1, 'right');
  await sleep(100);
  await page.evaluate(() => window.__RIPOSTE.game.goTitle());
  await sleep(150);
  const s = await page.evaluate(state);
  check('RF1: a scene change while a finger holds RIGHT releases it', s.scene === 'TITLE' && s.touch.held.length === 0,
    `(scene ${s.scene}, held [${s.touch.held}])`);
  const c = await page.evaluate(() => window.__RIPOSTE.touch.center('right'));
  await f.move(1, { x: c.x + 1, y: c.y });
  await sleep(150);
  const s2 = await page.evaluate(state);
  check('RF1: after the screen change, moving the still-held finger presses nothing',
    s2.touch.held.length === 0 && s2.scene === 'TITLE' && s2.menuIndex === 0,
    `(scene ${s2.scene}, held [${s2.touch.held}], menuIndex ${s2.menuIndex})`);
  await f.end(1);
  await ctx.close();
}

/* ---- T-portrait: 세로면 게임이 멈추고, 쥔 버튼이 풀린다 (RF5) ------------ */
async function tPortrait(browser) {
  const { ctx, page, f, cdp } = await openPhone(browser, '?boss=1&story=0&mute=1&touch=1');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT');
  await f.start(1, 'right');
  await sleep(100);
  // 실제 폰 회전은 창이 아니라 화면 지표(screen metrics)가 바뀐다 — 그리고 이미 첫 터치가 헤드리스 창을
  // 전체 화면으로 바꿔 놓았을 수 있어, 그 상태에서 page.setViewportSize(창 크기)는 거부된다.
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2, mobile: true });
  await sleep(200);
  const s1 = await page.evaluate(state);
  await sleep(400);
  const s2 = await page.evaluate(state);
  // page.screenshot() 는 원시 CDP device-metrics override 를 되돌린다 — 세로 화면 캡처는 Page.captureScreenshot 을 쓴다
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOTS, 'touch-rotate.png'), Buffer.from(shot.data, 'base64'));
  check('T-portrait: portrait blocks the game', s1.touch.blocked === true, JSON.stringify(s1.touch));
  check('RF5: rotating to portrait releases the held RIGHT', s1.touch.held.length === 0, s1.touch.held.join());
  check('T-portrait: game time does not advance while portrait', s2.time === s1.time, `(${s1.time} -> ${s2.time})`);
  await f.end(1);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 915, height: 412, deviceScaleFactor: 2, mobile: true });
  await sleep(300);
  const s3 = await page.evaluate(state);
  check('T-portrait: back to landscape resumes', s3.touch.blocked === false && s3.time > s2.time, `(${s2.time} -> ${s3.time})`);
  await ctx.close();
}

/* ---- T-hide: 키보드가 오면 버튼을 숨기고, 다음 터치에 다시 보인다 -------- */
async function tHide(browser) {
  const { ctx, page, f } = await openPhone(browser, '?boss=1&story=0&mute=1&touch=1');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT');
  await page.screenshot({ path: join(SHOTS, 'touch-fight.png') });
  check('T-hide: buttons visible in touch mode', (await page.evaluate(state)).touch.visible === true);
  await page.keyboard.press('ArrowUp');
  await sleep(80);
  check('T-hide: a keyboard key hides the buttons', (await page.evaluate(state)).touch.visible === false);
  await f.tap({ x: 457, y: 150 });
  check('T-hide: the next touch shows them again', (await page.evaluate(state)).touch.visible === true);
  await ctx.close();
}

/* ---- T-draw: 폰에서는 버튼이 그려지고, 터치 모드가 꺼지면 안 그려진다 ----- */
async function tDraw(browser) {
  const px = async (q) => {
    const { ctx, page } = await openPhone(browser, q);
    await sleep(700);
    const v = await page.evaluate(() => {
      const c = window.__RIPOSTE.touch.center('ok');
      const cv = document.getElementById('game');
      const k = cv.width / window.innerWidth;
      const d = cv.getContext('2d').getImageData(Math.round(c.x * k), Math.round(c.y * k) + 14, 1, 1).data;
      return [d[0], d[1], d[2]];
    });
    if (q.includes('touch=1')) await page.screenshot({ path: join(SHOTS, 'touch-title.png') });
    await ctx.close();
    return v;
  };
  const on = await px('?mute=1&touch=1');
  const off = await px('?mute=1&touch=0');
  // OK 버튼 자리(오른쪽 레터박스 여백, 라벨 아래 14px) — 꺼져 있으면 여백 색 #04050a 그대로다
  check('T-draw: touch mode off draws nothing at the OK spot', off.join() === '4,5,10', off.join());
  check('T-draw: touch mode on draws the OK button there', on.join() !== off.join(), `(on ${on} / off ${off})`);
}

/* 캔버스에 그려진 글자를 모은다 — 글자 간격(spacing) 문구는 한 글자씩 그려지므로 이어 붙이면 원문이 된다 */
async function drawnText(page) {
  await page.evaluate(() => {
    if (!window.__spy) {
      const orig = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (s, x, y, w) {
        if (window.__drawn) window.__drawn.push(String(s));
        return w === undefined ? orig.call(this, s, x, y) : orig.call(this, s, x, y, w);
      };
      window.__spy = true;
    }
    window.__drawn = [];
  });
  await sleep(150);
  return page.evaluate(() => window.__drawn.join(''));
}

async function titleIndex(page, id) {
  return page.evaluate((want) => window.__RIPOSTE.game.titleItems().map((i) => i.id).indexOf(want), id);
}

/* ---- T-options: 옵션 — KEY BINDINGS 숨김, ◀ ▶ 로 값 변경 ------------------ */
async function tOptions(browser) {
  const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1');
  await sleep(300);
  const idx = await titleIndex(page, 'options');
  for (let i = 0; i < idx; i++) await f.tap('mDown');
  await f.tap('ok');
  check('T-options: ▼ + OK on the title opens OPTIONS',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'OPTIONS', 3000, 'OPTIONS'), `(index ${idx})`);
  const rows = await page.evaluate(() => window.__RIPOSTE.game.optionRows().map((r) => r.id));
  check('T-options: KEY BINDINGS is hidden in touch mode', rows.length > 0 && !rows.includes('keys'), rows.join());
  const v0 = (await page.evaluate(state)).settings.volume;
  await f.tap('mLeft');
  const v1 = (await page.evaluate(state)).settings.volume;
  check('T-options: ◀ changes the selected row (volume)', v1 !== v0, `(${v0} -> ${v1})`);
  await f.tap('back');
  check('T-options: BACK returns to the title',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'TITLE', 2000, 'TITLE'));
  await ctx.close();
}

/* ---- T-bossselect: ?dev=1 은 전 보스를 연다 — ▼ OK 로 두 번째 보스 ---------- */
async function tBossSelect(browser) {
  const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1&dev=1&story=0');
  await sleep(300);
  const idx = await titleIndex(page, 'bosses');
  for (let i = 0; i < idx; i++) await f.tap('mDown');
  await f.tap('ok');
  check('T-bossselect: the title opens BOSS SELECT',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'BOSSSELECT', 3000, 'BOSSSELECT'), `(index ${idx})`);
  await f.tap('mDown');
  await f.tap('ok');
  const ok = await waitFor(page, () => {
    const s = window.__RIPOSTE.getState();
    return (s.scene === 'INTRO' || s.scene === 'FIGHT') && s.bossId === 2;
  }, 4000, 'boss 2');
  check('T-bossselect: ▼ + OK starts the second boss', ok);
  await ctx.close();
}

/* ---- T-story: 대사 — OK 진행 · PARRY 로 줄 완성·선택지 · SKIP · OK 꾹 ------- */
async function tStory(browser) {
  {
    const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1');
    await sleep(300);
    await f.tap('ok');                          // NEW RUN — 대화가 켜져 있으니 STORY 로 간다
    check('T-story: OK on the title starts a run into STORY',
      await waitFor(page, () => window.__RIPOSTE.getState().scene === 'STORY', 4000, 'STORY'));
    const line0 = (await page.evaluate(state)).story.line;
    await f.tap('cParry');                      // 타자기 즉시 완성
    await f.tap('ok');                          // 다음 줄
    const line1 = (await page.evaluate(state)).story.line;
    check('T-story: PARRY completes the line, OK advances', line1 === line0 + 1, `(${line0} -> ${line1})`);
    let s = await page.evaluate(state);
    for (let i = 0; i < 20 && s.story && s.story.choice !== 'pending'; i++) {
      await f.tap('cParry');
      await f.tap('ok');
      s = await page.evaluate(state);
    }
    check('T-story: the VESPER choice is reached with OK', !!s.story && s.story.choice === 'pending', JSON.stringify(s.story));
    const txt = await drawnText(page);
    check('T-text: the choice labels name the buttons on a phone', txt.includes('[PARRY]') && txt.includes('[RIPOSTE]') && !txt.includes('[K]'));
    await f.tap('cParry');                      // [K] 아직. — ok:true -> reply
    s = await page.evaluate(state);
    check('T-story: PARRY picks the [K] answer', !!s.story && s.story.choice === 'reply', JSON.stringify(s.story));
    await ctx.close();
  }
  {
    const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1');
    await sleep(300);
    await f.tap('ok');
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'STORY', 4000, 'STORY');
    await f.tap('skip');
    check('T-story: SKIP leaves the story',
      await waitFor(page, () => window.__RIPOSTE.getState().scene !== 'STORY', 2000, 'leave STORY'));
    await ctx.close();
  }
  {
    const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1');
    await sleep(300);
    await f.tap('ok');
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'STORY', 4000, 'STORY');
    await f.hold('ok', 1000);
    check('T-story: holding OK skips the story (existing HOLD ENTER rule)',
      await waitFor(page, () => window.__RIPOSTE.getState().scene !== 'STORY', 2000, 'leave STORY'));
    await ctx.close();
  }
}

/* ---- T-flow: 타이틀 → 전투 → 패배 → RETRY → TITLE(꾹) ---------------------- */
async function tFlow(browser) {
  const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1&story=0');
  await sleep(300);
  const t0txt = await drawnText(page);
  check('T-text: phone title wording names the buttons',
    t0txt.includes('HOLD NEW') && t0txt.includes('LEFT  RIGHT') && !t0txt.includes('K  /  Z'));
  await f.tap('ok');
  check('T-flow: title OK -> FIGHT', await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 5000, 'FIGHT'));
  const ftxt = await drawnText(page);
  check('T-text: phone fight tutorial names the PARRY button, not the K key',
    ftxt.includes('PARRY  —  THE GOLD FLASH') && !ftxt.includes('K  —  PARRY'));
  const tries0 = (await page.evaluate(state)).tries;
  await page.evaluate(() => window.__RIPOSTE.setTimeScale(4));
  check('T-flow: a passive fight ends in DEFEAT',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'DEFEAT', 30000, 'DEFEAT'));
  await f.tap('dRetry');
  check('F3: a tap right after the fight ends is ignored', (await page.evaluate(state)).scene === 'DEFEAT');
  const graceMs = (await page.evaluate(() => window.__RIPOSTE.CONFIG.TOUCH.GRACE)) * 1000 + 100;
  await sleep(graceMs);
  await page.evaluate(() => window.__RIPOSTE.setTimeScale(1));
  await sleep(150);
  const sd = await page.evaluate(state);
  check('T-flow: DEFEAT shows RETRY / TITLE buttons', sd.touch.set.join() === 'dRetry,dTitle', sd.touch.set.join());
  const dtxt = await drawnText(page);
  check('T-text: phone DEFEAT says TAP RETRY and names buttons, not keys',
    dtxt.includes('TAP RETRY') && !dtxt.includes('R  —  RETRY') && !dtxt.includes('press K') && !dtxt.includes('with SPACE'));
  await f.tap('dRetry');
  check('T-flow: RETRY restarts the boss', await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT again'));
  const tries1 = (await page.evaluate(state)).tries;
  check('T-flow: tries went up by one', tries1 === tries0 + 1, `(${tries0} -> ${tries1})`);
  await f.hold('title', 800);
  check('T-flow: holding TITLE returns to the title',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'TITLE', 3000, 'TITLE'));
  await ctx.close();
}

/* ---- T-text (PC): 데스크톱 문구는 키보드 문구 그대로, KEY BINDINGS 도 있다 --- */
async function tTextDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  hookErrors(page);
  await page.goto(url('?mute=1'), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  await sleep(300);
  const txt = await drawnText(page);
  check('T-text: PC title keeps keyboard wording',
    txt.includes('N  NEW GAME') && txt.includes('K  /  Z') && txt.includes('ENTER  SELECT') && !txt.includes('HOLD NEW'));
  const rows = await page.evaluate(() => window.__RIPOSTE.game.optionRows().map((r) => r.id));
  check('T-text: PC options still list KEY BINDINGS', rows.includes('keys'), rows.join());
  await page.close();
}

/* ---- F1: 화면이 바뀔 때까지 쥔 손가락은 새 화면의 버튼을 누르지 않는다 ---- */
async function tHoldAcross(browser) {
  const { ctx, page, f } = await openPhone(browser, '?boss=1&story=0&mute=1&touch=1');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT');
  await f.start(1, 'title');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'TITLE', 3000, 'TITLE');
  const c = await page.evaluate(() => window.__RIPOSTE.touch.center('title'));
  await f.move(1, { x: c.x + 1, y: c.y });
  await sleep(900);
  const s = await page.evaluate(state);
  check('F1: holding TITLE through the screen change never fires NEW GAME', s.scene === 'TITLE', s.scene);
  await f.end(1);
  await ctx.close();
}

/* ---- F2: 전체 화면·가로 고정은 손가락을 뗄 때만 요청한다 (터치의 사용자 동작은 pointerup) ---- */
async function tFullscreen(browser) {
  const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1');
  await sleep(300);
  await page.evaluate(() => {
    window.__fs = 0;
    document.documentElement.requestFullscreen = function () { window.__fs++; return Promise.resolve(); };
  });
  await f.start(1, { x: 457, y: 150 });
  await sleep(80);
  check('F2: fullscreen is not requested on finger-down', (await page.evaluate(() => window.__fs)) === 0);
  await f.end(1);
  await sleep(80);
  check('F2: the first finger-up requests fullscreen once', (await page.evaluate(() => window.__fs)) === 1);

  await f.start(1, 'full');
  await sleep(80);
  check('F2: FULL requests nothing on finger-down either', (await page.evaluate(() => window.__fs)) === 1);
  await f.end(1);
  await sleep(80);
  check('F2: FULL requests fullscreen when the finger lifts', (await page.evaluate(() => window.__fs)) === 2);

  await f.tap({ x: 457, y: 150 });
  check('F2: later taps on empty space do not re-request', (await page.evaluate(() => window.__fs)) === 2);
  await ctx.close();
}

/* ---- 새 검사 함수는 이 줄 위에 추가한다 ---- */

function finish() {
  check('zero page/console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (failures.length) {
    console.log(`\nTOUCH FAILED — ${failures.length} check(s): ${failures.join(', ')}  [${secs}s]`);
    process.exit(1);
  }
  console.log(`\nTOUCH PASSED — all checks green  [${secs}s]`);
}

(async () => {
  console.log('RIPOSTE touch test');
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await tDetect(browser);
    await tDesktop(browser);
    await tScenes(browser);
    await tFight(browser);
    await tRelease(browser);
    await tPortrait(browser);
    await tHide(browser);
    await tDraw(browser);
    await tOptions(browser);
    await tBossSelect(browser);
    await tStory(browser);
    await tFlow(browser);
    await tTextDesktop(browser);
    await tHoldAcross(browser);
    await tFullscreen(browser);
    // ---- 새 검사 호출은 이 줄 위에 추가한다 ----
  } finally {
    await browser.close();
  }
  finish();
})();
