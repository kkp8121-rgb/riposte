// GitHub Pages 배포 검증: 실제 Pages URL을 헤드리스로 열어 404·pageerror·모듈 로딩·오디오 초기화·씬 진입을 확인한다.
// 실행: node tools/check-pages.mjs [url]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL_BASE = process.argv[2] || 'https://kkp8121-rgb.github.io/riposte/';
const OUT = path.join(HERE, '..', 'tests', 'shots');
mkdirSync(OUT, { recursive: true });

const problems = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => problems.push(`[pageerror] ${e.message}`));
page.on('console', m => { if (m.type() === 'error') problems.push(`[console.error] ${m.text()}`); });
page.on('response', r => { if (r.status() >= 400) problems.push(`[http ${r.status()}] ${r.url()}`); });
page.on('requestfailed', r => problems.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

// story=0: 2026-09-17 이후 빌드는 TITLE→STORY→FIGHT 라 대화를 건너뛰어야 Enter 한 번에 FIGHT 로 간다
const resp = await page.goto(URL_BASE + '?mute=1&seed=3&story=0', { waitUntil: 'load', timeout: 60000 });
console.log('HTTP', resp?.status(), resp?.url());
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, 'pages-title.png') });
const hook = await page.evaluate(() => !!(window.__RIPOSTE && window.__RIPOSTE.getState));
console.log('debug hook present:', hook);
if (!hook) problems.push('window.__RIPOSTE.getState missing');
await page.keyboard.press('Enter');
await page.waitForTimeout(2500);
const st = await page.evaluate(() => window.__RIPOSTE?.getState?.());
console.log('scene after Enter:', st?.scene, 'boss:', st?.bossId);
if (!st || st.scene !== 'FIGHT') problems.push(`expected FIGHT scene, got ${st?.scene}`);
await page.screenshot({ path: path.join(OUT, 'pages-fight.png') });
const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
console.log('scripts loaded:', scripts.length);
// 신선도 검사 — 배포본의 보스 수가 로컬 CHAPTERS 총합과 같아야 한다.
// 2026-09-19: Pages 가 9/16 빌드를 계속 서비스하는데 이 도구는 "사이트가 뜬다"만 봐서 하루 종일
// 못 잡았다. 보스 수가 다르면 낡은 빌드다.
const liveBosses = await page.evaluate(() => window.BOSSES ? window.BOSSES.length : -1);
const localBosses = (await import('node:fs')).readFileSync(path.join(HERE, '..', 'index.html'), 'utf8')
  .match(/src="js\/bosses\/[^"]+"/g)?.length ?? -1;
console.log('bosses live/local:', liveBosses, '/', localBosses);
if (liveBosses !== localBosses) problems.push(`stale deploy: live has ${liveBosses} bosses, local has ${localBosses}`);
await browser.close();
if (problems.length) { console.log('PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
console.log('PAGES OK');
