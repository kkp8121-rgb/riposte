/* =============================================================================
 * RIPOSTE — tests/zone.mjs
 * 지속형 위험 구역(Zone.linger) 단위 검증. 기존 단발 존의 동작이 바뀌지 않는지도 본다.
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!cond) failures.push(name);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?boss=1&story=0&mute=1',
  { waitUntil: 'load' });

/* 단발 존 — linger 없이 만들면 때린 뒤 STRIKE_TIME 안에 죽어야 한다 */
const once = await page.evaluate(() => {
  const C = window.CONFIG;
  const g = window.__RIPOSTE.game;
  const z = new window.Zone({ x: 300, w: 100, delay: 0, damage: 1, tell: 'red', label: 'T' });
  z.update(0.001, g);                       // 낙하
  const struckNow = z.struck;
  z.update(C.ZONE.STRIKE_TIME + 0.01, g);   // 타격 연출 종료
  return { struckNow, dead: z.dead };
});
check('단발 존은 한 번 때리고 사라진다', once.struckNow && once.dead === true,
  JSON.stringify(once));

/* 지속 존 — linger 를 주면 같은 시간이 지나도 살아 있고 다시 때린다 */
const kept = await page.evaluate(() => {
  const C = window.CONFIG;
  const g = window.__RIPOSTE.game;
  const z = new window.Zone({ x: 300, w: 100, delay: 0, damage: 1, tell: 'red',
                              label: 'T', linger: C.ZONE.LINGER_TICK * 2.5 });
  z.update(0.001, g);
  z.update(C.ZONE.STRIKE_TIME + 0.01, g);
  const aliveAfterFirst = !z.dead;
  z.update(C.ZONE.LINGER_TICK + 0.01, g);   // 다음 타격
  const struckAgain = z.struck;
  return { aliveAfterFirst, struckAgain };
});
check('지속 존은 첫 타격 뒤에도 살아 있다', kept.aliveAfterFirst, JSON.stringify(kept));
check('지속 존은 LINGER_TICK 뒤 다시 때린다', kept.struckAgain, JSON.stringify(kept));

await browser.close();
if (failures.length) { console.log(`ZONE FAILED (${failures.length}): ${failures.join(', ')}`); process.exit(1); }
console.log('ZONE PASSED — all checks green');
