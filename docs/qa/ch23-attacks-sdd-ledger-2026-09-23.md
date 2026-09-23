# SDD ledger — plan: docs/superpowers/plans/2026-09-23-riposte-ch23-attacks.md

Spec: docs/superpowers/specs/2026-09-23-riposte-ch23-attacks-design.md (binding authority)
Branch: feat/ch23-attacks · start HEAD bc2fa52 · merge-base main beb2164
Execution: subagent-driven (user choice 2026-09-23). Commits: per-task LOCAL commits approved by user 2026-09-23; push forbidden.

## Rulings
- Ruling: per-task local commits on feat/ch23-attacks without per-commit confirmation — user answered "태스크마다 로컬 커밋" (2026-09-23) — cost if wrong: commits can be squashed/reset locally, nothing pushed.
- Ruling: Task 0 is folded into Task 1's dispatch (tiny, no own test cycle); Task 0 Step 1 verified by controller: `git diff 8ef09be HEAD --stat -- js/ index.html` is empty → baseline doc/qa/balance-2026-09-19.md §1-3 valid — cost if wrong: G3 compares against a stale baseline.
- Ruling: balance doc file name = docs/qa/balance-2026-09-23.md (plan says 2026-09-2x = execution date) — cost if wrong: rename only.
- Ruling: browser test suites run ONLY by the active implementer (tasks are sequential); reviewers must not launch browsers (they read reports) — enforces "측정은 직렬" — cost if wrong: none.
- Ruling: models — implementers sonnet (multi-file edits in large files + headless runs); Task 16 balance implementer opus (judgment); task reviewers sonnet; final review opus.

## Pre-flight scan (plan self-consistency)
| Pair / task | Produces → consumes | Finding |
|---|---|---|
| T1 ↔ T2 | T1 judge conditionally loads js/motions.js (exists from T2); T2 Step 12 runs `--only=vesper` | consistent |
| T2 ↔ T3–T6 | MOTIONS fields, a.spawns, resolveRemoteHit, spawn*, getState arrays, __T harness | names match across tasks |
| T3 ↔ T4 (game.js onPerfectParry) | T3 edits stagger line (+parryHolds), keeps `if (projectile) projectile.reflect();`; T4 replaces that line | anchors compatible if applied in order |
| T4 ↔ T5 (game.js stepWorld) | T4 edits pendingShots loop (null make); T5 adds blockByPillars after b.update and after updateMotionWorld (T2) | compatible |
| T5 ↔ T6 (render.js) | T5 adds drawHazards; T6 inserts drawMark/drawEcho after drawHazards and calls in drawWorld | compatible |
| T2 ↔ T6 (boss.js onActiveStart) | T2 head `if (M.melee) this.testMelee(a)`; T6 inserts echo before the LAST testMelee | anchor disambiguated in plan |
| T2 ↔ T7 | getState beams/pillars/marks/echoes + currentAttack.remote | consistent |
| T1 ↔ T15 | stanceCounterOk requires guard.stance.counter==='retort' and no pattern calls retort | T15 tables satisfy |
| T12 ↔ T5 | SENTINEL onPickPattern reads game.zones | consistent |
| T11 ↔ tests/state.mjs | T11 changes hand seeding to boss's own steals | consistent with T11 MIRROR_MAP |
| T14 | removes RANGE/onPickPattern; new patterns untagged | consistent |
| T1 self | expected reuse counts L3 C4 B3 A9 S2 T4 H4 AD4 (hand-computed) | ok |
| T2 self | test harness + code; volley test uses pre-existing projectile path | ok |
| T3 self | tests call resolveRiposteHit/resolveProjectileHitBoss directly; stance sound via RAudio.guard | ok |
| T4 self | tests orbPassBoss/orbWallBreak/pincerRetreat match turnBoomerang/backShot code | ok |
| T5 self | cellWidth used by motions.pillarSpots and onPillarRise | ok |
| T6 self | markDelay measured in each(); ko test sets koT=999 | ok |
| T7 self | forceDir latch; new arrays empty → identical | ok |
| T8–T15 | "모든 패턴에 금 ≥1" rule; boomerang back gold counts | ok |

## Progress
Task 0: complete (folded into Task 1 dispatch; commit 16a6759 draft docs/qa/balance-2026-09-23.md)
Task 1: complete (commits bc2fa52..a713a6c, review clean)
- Ruling (T2): chapter-1~3 bot baseline for "unchanged" checks = docs/qa/balance-2026-09-19.md §5-B values for HOLLOW/ADAMANT (the §1 table predates 수정 1; current code reflects §5-B) and §1 for the rest — cost if wrong: a stale comparison could mask/flag a regression on bosses 11–12 only.
Task 2: complete (commits a713a6c..d1a2ab8, review clean)
Task 2: minor (deferred): getState beams/pillars/marks/echoes mappers unexercised until Tasks 5–7 (reviewer ⚠️) — check in Task 7 bot runs
Task 3: complete (commits d1a2ab8..204736e, review clean)
Task 3: minor (deferred): literal 6 (body gap) in motions.pull duplicates boss.js lunge clamp literal; 0.08 active fallback duplicated from boss.js — candidates for a shared constant
Task 3: minor (deferred): pullGap test weak (initial gap 50 vs threshold 40)
Task 4: complete (commits 204736e..d37c0d0, review clean)
Task 4: minor (deferred): spec §3.3 names pincer field `backR`; code uses `y`/`r`/`shape` — fix spec text in Task 17
Task 4: minor (deferred): orbWallBreak/pincerRetreat pass vacuously pre-implementation (real post-impl)
Task 5: complete (commits d37c0d0..9877710, review clean)
Task 5: minor (deferred): onPillarRise ko guard covers only damage — FX/sound/push still run during KO (sibling onBeamTouch returns early)
Task 5: minor (deferred): onPillarRise toLeft flip can pick invalid side only if pillar.w+28 > 840 (unreachable)
- Ruling: dispatch prompts now state commit authorization explicitly (Task 5 implementer refused to commit citing the global rule until told) — cost if wrong: none.
- Ruling: user asked for fun QA (2026-09-23) and chose "보스 재작성 뒤 풀 QA" → added plan Task 16.5 (tools/funqa.mjs metrics + headless captures + persona panel via Workflow with adversarial verify); results feed Task 17 playtest checklist — cost if wrong: extra task time only.
Plan edit committed (Task 16.5 fun QA) as separate docs commit after cd9b71a.
Task 6: note — implementer report claims BASTION uses kind:'pillar' (false: bastion.js still kind:'zone' until Task 10); BASTION run-to-run spread 21–39s is its documented bimodality (handover), all VICTORY.
- Ruling (T6 review Important #1, plan-mandated hook): echo spawns once per attack (guard a.hitsDone === 0) — spec §3.10 describes one ghost per struck attack; design's CHORUS canon has no volley so impact today is nil, guard prevents future misuse — cost if wrong: a future volley+echo design would need per-swing echoes explicitly.
Task 6: minor (parked): Echo.windup recomputed via boss.windupMult() at spawn instead of reusing the original — Ruling: keep; spec says ghost tell→hit = original windup × multiplier (per-flash constant, correct for feint too); only diverges if phase changes between the original windup start and its strike — cost if wrong: rare timing drift on a P2 transition.
Task 6: fix round 1/5 (1 addressed, 0 open — echo once per attack; commits cd9b71a..798366c)
Task 6: complete (commits 9877710..798366c, review clean after fix round 1)
- Ruling: boss tasks batched by chapter — Tasks 8–11 (chapter 2) in one dispatch, Tasks 12–15 (chapter 3) in another; one commit PER BOSS inside the batch; judge --only and bot --boss=N (perfect + skilled, seed 7) per boss; tests/state.mjs once at the end of each batch (it runs all 12 fights) — same-shape data edits with complete tables in the briefs; per-boss commits keep review/revert granularity — cost if wrong: a failing boss mid-batch delays the rest of that batch.
Task 7: complete (commits 798366c..82c0b39, review clean)
Task 7: minor (deferred): bot forceDir latch not cleared on scene change (inert today: fresh page per boss, tick guards FIGHT, KO axis=0)
Tasks 8–11 batch: DONE_WITH_CONCERNS (commits 82c0b39..84ad93d: c63a9b7 LANTERN, 235ce13 CHORUS, aadaee8 BASTION, 84ad93d AVARICE). CHORUS/BASTION/AVARICE perfect VICTORY; LANTERN perfect DEFEAT (ORB outbound).
- Ruling (T8 concern): LANTERN loss = bot dashes AWAY from red projectile (axis 0 → away from boss) and walks back into the still-red outbound orb; grammar is red = dash THROUGH. Fix bot for boomerang outbound only: getState projectiles gain boomerang/returning flags (field addition), bot red-projectile threat gets dir toward the projectile when boomerang && !returning — chapter-1 bot behaviour unchanged (G3). Not a boss-design change — cost if wrong: humans may also dash away; playtest checklist should ask about it.
Task 8: minor (deferred): the bot dashes AWAY from all non-boomerang red projectiles too (general bot weakness, pre-existing; SERAPH/TEMPEST pass because the bot usually holds toward-boss) — not changed to keep G3 baseline.
Task 8: complete (commits c63a9b7 + bot fix b216c9c, review clean)
Task 9: complete (commit 235ce13, review clean)
Task 10: complete (commit aadaee8, review clean)
Task 11: complete (commit 84ad93d, review clean)
Tasks 8–11: minor (deferred, Task 16): LANTERN P2 orb2 volley costs perfect bot 2 hits/run; CHORUS skilled DEFEAT at seed 7 (REFRAIN P2 hits)
Tasks 12–15 batch: DONE (commits b216c9c..65c5c0d: 6436b59 SENTINEL, e0df9b4 TEMPEST, 558e16a HOLLOW, 65c5c0d ADAMANT). Full judge exit 0; mash b12 loss; state/motions PASS. Perfect seed7: SENTINEL 0h, TEMPEST 0h, HOLLOW 1h, ADAMANT 3h (all VICTORY).
- Ruling (engine bug found in T14/T15): scheduled volley shots (game.pendingShots) survive boss stagger/phase-2 roar, so the rest of an interrupted volley fires with no attack state — at point-blank when the player rushes a stagger window (ADAMANT wall-break loop). Fix engine-wide as a separate Task 15.1: cancel the interrupted attack's pending scheduled shots in cancelAttackSpawns (same principle as zones: "보스를 끊었는데 결과가 그대로 온다" = tell/result mismatch). This changes chapter-1 SERAPH/GRAVEN? (only SERAPH triple/volley bosses) behaviour when interrupted mid-volley — accepted deviation from "chapter 1 unchanged"; G3 still checked by bot win/loss in Task 16 — cost if wrong: SERAPH triple becomes slightly easier to interrupt; revertable single commit.
Tasks 12–15: minor (deferred, Task 16): ADAMANT far-shards-close-guard — bot approaches during the 2-shot volley so shot 2 arrives at 64–82px (bot heuristic; consider move:'far' placement)
- Ruling (T13 review Important, plan-mandated conditional "SQUALL 에 몰리면 gap 을 늘린다"): NOT applied now — the user decided TEMPEST pincer starts sequential with gap 0.45 (spec §7-5), the evidence is a single seed-7 skilled run (3 hits, still VICTORY rank A), and the batch rule said skilled results are recorded for Task 16's 3-seed vote. Task 16 must evaluate SQUALL concentration across seeds 7/11/23 and apply the gap lever there if it holds — cost if wrong: one extra balance iteration.
Task 12: complete (commit 6436b59, review clean)
Task 13: complete (commit e0df9b4; review Important ruled → Task 16)
Task 14: complete (commit 558e16a, review clean)
Task 15: complete (commit 65c5c0d, review clean; engine bug → Task 15.1)
Tasks 12–15: minor (deferred, Task 17 docs): inline "스펙 §2.x" comments in sentinel/tempest/hollow still cite the old chapter-3 spec sections
Tasks 12–15: minor (deferred, Task 16): report cites DASH_COOLDOWN 0.58 (actual C.DASH.COOLDOWN 0.55; 0.58 is bot TUNE.DASH_COOLDOWN)
- User instruction 2026-09-23 "산출물을 자동으로 켜지마": every dispatch/workflow prompt must say — never open outputs (files, images, HTML, headed browsers); headless only; report paths. Sent to the running Task 15.1 implementer. Saved as memory never-auto-open-outputs.
Task 15.1: complete (commits db72392..c699b0f, review clean) — perfect seed7 HOLLOW hits 1→0, ADAMANT 3→1
Task 16: DONE_WITH_CONCERNS (commit eb67b29 — LANTERN P2 move:'far' before orb/orb2; CHORUS hp 300→250; par LANTERN 50, CHORUS 35, HOLLOW 60, ADAMANT 52; BASTION numbers held). G3 ✅ 36/36 cells; perfect s7 11/12 (BASTION), hard 11/12 (BASTION); skilled/average/mash/judge/state ✅.
- Ruling (T16 deflect): BASTION deflect re-launches hand shots fired near the boss from ~28px of the player (15/15), random (chance) so not rhythm-predictable → truly unreactable. Engine fix Task 16.1: skip deflect when return time to the player's catch range < C.BOSS.DEFLECT_MIN_REACT (0.40), checked before the rng draw. BASTION-only mechanic → chapter 1 unaffected. Then resume Task 16 to re-measure BASTION — cost if wrong: BASTION deflects less often at close range (easier); re-balance covers it.
- Ruling (T16 ADAMANT point-blank 2nd shard when pinned at the wall): NOT an engine fix — volley follow-ups come at a fixed, known interval after a telegraphed first shot (human can parry on rhythm, like a melee volley); failure is the bot's "react only to already-approaching projectiles" limit. Recorded as a playtest item — cost if wrong: humans also find it unfair → playtest reveals, revisit.
Task 16: minor (deferred → playtest): LANTERN flicker→orb patterns can fire point-blank orbs right after flicker (telegraphed by windup; red outbound = dash through).
Task 16.1: complete (commits 895aeaf..6f8585a, review clean)
Task 16.1: minor (deferred): guard also applies to rally deflects of reflected boss projectiles (only favours the player; add a one-line note in tryDeflect comment in Task 17); test config override without try/finally (file convention)
Task 16 (after 16.1): DONE_WITH_CONCERNS (commit 51f606f doc). G3 ✅ 36/36; perfect 12/12 all seeds; hard 12/12; mash 0/36; judge/state ✅; skilled ✅ (LANTERN s7 flip = noise, 4/5 on repeat); average ⚠️ BASTION wins 3/3.
- Ruling (T16 BASTION average target): proceed without further BASTION changes; escalate to the user as a design decision. Cause: after the fair-deflect guard, deflect needs ~268–317px distance but pillars pull fights to ~135px, so BASTION's identity mechanic never appears in bot play (0 deflects / 21 runs). Allowed levers (patterns, gap, hp) failed; salvo numbers are outside spec §6. Options for the user: (a) redesign deflect as "catch → telegraphed throw-back" (fair at any range, keeps identity; engine work), (b) salvo damage/speed numbers, (c) leave to human playtest — cost if wrong: BASTION ships easier than intended until decided.
Task 16: review Approved with 1 Important (LANTERN skilled G4 resolved with mixed-methodology runs) + 1 Minor (par delta notes) → fix round 1 dispatched: 2× --all s7 + 2× --all s11 skilled at HEAD, majority over same-HEAD --all only.
Task 16: fix round 1/5 (2 addressed, 0 open — LANTERN skilled by same-HEAD --all majority 2/3; par delta notes; commit f08f112)
Task 16: complete (commits c699b0f..f08f112 excl. 16.1, review clean after fix round 1; BASTION average target escalated to user)
Task 16: minor (deferred → playtest/user): LANTERN skilled on the threshold (s7 loses 1 of 3 runs)
Task 16.5 (Steps 1,2,4-metrics): DONE (commit 1b97d9d tools/funqa.mjs + JSON + doc). 0 unreactable / 0 trap deaths in 72 fights; flags: BASTION no skill discrimination; one-card death concentration >60% on LANTERN/HOLLOW/CHORUS/TEMPEST/SENTINEL; ADAMANT dead time 21–29%; BASTION pillar warning strip dim (capture). Average rerun partially killed by memory pressure → targeted rerun merged (documented). 5/20 captures missing, CHORUS captures missed the moment.
Task 16.5 review: Approved with 1 Important (unmatchedHits never surfaced in console/byBoss/doc; 0 in this run) + Minors (capture count 15 vs 17; null-label burst matching limitation undocumented). Fix round 1 queued AFTER the persona-panel workflow finishes (it edits the same doc) — code change only for future runs + doc note "unmatched = 0 in all 72 runs"; no rerun.
- User goal 2026-09-24: "병렬 진행으로 좀 더 빨리" → Ruling: remaining work split into disjoint-file parallel lanes: A tools/funqa.mjs fix (no doc) · B spec docs (2026-09-09 design §3.5–3.12/§3/§7 + new spec status/backR) · C README.md + CLAUDE.md · D code minors (boss inline §refs, tryDeflect comment, onPillarRise KO guard) — only D may run browser tests now; E full gate run (serial) after D; F handover + playtest checklist + funqa doc fixes after the persona workflow; then final review. Commits: each lane commits only its own paths, retry on .git/index.lock — cost if wrong: occasional commit retry.
Task 16.5: fix round 1/5 lane A (commit d66e06a: unmatchedHitCount surfaced in console/byBoss/print + limitation comment; doc note pending lane F) — re-review batched with lane reviews
Task 16.5 Step 3: persona panel workflow wf_e29642eb-fe2 done — 5 personas, 29 risks, 13 survived / 16 refuted (2-skeptic majority); section written into docs/qa/funqa-2026-09-23.md (uncommitted → lane F commits); playtest items → funqa-playtest-items.md.
- Ruling: panel side-findings (unverified) → lane D2 after D: (1) TEMPEST pincer back shot spawned at a clamped position (back to wall) arrives early, compressing gap and possibly < MIN_WINDUP travel — fix by constant-time back travel (speed from actual spawn distance); (2) CHORUS canon-cross-canon: echo and second canon hits may land 0.06–0.13s apart (inside parry lock) — measure headless, fix by composition (wait) if confirmed — cost if wrong: two small follow-up commits.
Lane C: done (commit 8108bc2 README/CLAUDE.md, 33 lines)
Lane B: done (commit 6f3bca4 specs §3.5–3.12, rule (d), §2.2 exceptions, §7/§8, redesign spec status/backR/§7 items 7–8)
Lane D: done (commit 62913f3 — boss inline §refs, tryDeflect comment, onPillarRise KO early-return + test via direct onPillarRise call)
Lane F: done (commit ca82a83 — funqa Step 3 committed + doc fixes; docs/qa/playtest-ch23-attacks.md: LAN4 CHO4 BAS5 AVA3 SEN3 TEM3 HOL3 ADA5 + common G8)
Lane F review: Approved (no Critical/Important). minor (deferred → final fix wave): 5 intro questions in playtest checklist pack two alternatives under one 예/아니오 column (LAN#1 :15, CHO#1 :26, BAS#1 :37, TEM#1 :71, ADA#1 :91)
Lanes A–D review: Approved. Important (non-blocking, queued for the single final fix wave after D2): onPillarRise KO branch records pl.side so blockByPillars (no ko guard) still silently pushes/pins the player during KO — fix: do not record side during KO (pillar does not block during KO) + test through stepWorld.
Lane D2: done — 40f07ba pincer back-shot constant travel time (gap 0.225→0.45 near wall); 1afd39e CHORUS P1 canon-cross-canon {wait:0.45} (echo→2nd strike gaps -0.083..0.200 → 0.367..0.650)
Lane D2 review: Approved, no findings (wait 0.45 derives exactly MIN_VOLLEY_GAP 0.35 gap, windup-mult invariant; backShot reuses nominal-travel formula).
Final fix wave: done (979c502 KO pillar side not recorded + stepWorld test RED x281/side1 → GREEN x250/side0; 2fbbbc3 checklist 5 intro questions single yes/no)
Final review (opus): With fixes — no Critical. Rulings:
- Ruling (FR-I1 stance punishes ripostes committed before the stance): FIX — punish only if riposte started at/after stance windup start; otherwise ordinary non-counter hit — cost if wrong: none (fairness).
- Ruling (FR-I2 BASTION G4/identity): user decision before merge (not fixed) — cost: BASTION easier until decided.
- Ruling (FR-I3 four visuals never screenshotted: stance ring, score pips, echo ghost, risen pillar/cage): FIX — headless captures via motions harness into tests/shots + controller views them.
- Ruling (FR-m1 reflected shot during stance counts as COUNTER): FIX with I1 (counter=false while stanceOpen).
- Ruling (FR-m2 pincer 20px dead band): FIX (canBegin subtracts PINCER_SPAWN_PAD; spec §3.3 text).
- Ruling (FR-m3 spec contradictions: §3.6 canon wait, §line172 cancel mechanism, redesign §2.3 "방패를 든 자세"): FIX docs.
- Ruling (FR-m4 cosmetic tell bursts/sounds during KO): PARK — cosmetic only, damage blocked — cost: a stray sound during victory slowmo.
- Ruling (FR-m5 duplicated literals 6 / 0.08 / HALF_W+10): PARK as follow-up — touching boss.js chapter-1 lines for a constant rename is risk without behaviour gain now — cost: future drift.
- Ruling (FR-m6 adamant.js:93 stale comment): FIX.
- Ruling (FR-m7 CHORUS P2 overlaps): add checklist row for canon-cross-refrain2 echo between call pips; scissor+echo tracked by CHO-4.
- Ruling (FR-m8 judge allows reusing an earlier ch2+ motion as the 1 reuse): FIX — reused signature must be a chapter-1 signature (current data complies).
- Ruling (FR-m9 checklist gaps LANTERN dash-away, TEMPEST cornered squall): FIX docs.
- Ruling (FR-m10 funqa default output not git-ignored): FIX (default under tests/out/).
Final gate (4bdb1cc, HEAD 2fbbbc3): 10/10 suites ✅; perfect 12/12 ×3 ✅; skilled ✅; average ✅ except BASTION 0/3 (open, user); mash 0/36 ✅; hard 12/12 ✅; G3 ⚠️ 11/12 — MIRROR skilled s11 D→V (chapter-1 code untouched; machine load) → recheck requested in the fix wave; TEMPEST skilled s7 D→V also rechecked.
Final fix wave: done (542b0b3 docs E·G·H; ba10561 code A–C·F with tests). Verified: motions 76/76, state, judge, smoke PASS; perfect s7/s11/s23 12/12; mash s7 0/12; MIRROR skilled s11 = D and TEMPEST skilled s7 = D on recheck (gate flips were noise). Controller viewed 4 screenshots (stance ring, score pips, echo ghost, cage): all legible; minor — 3rd unlit score pip low contrast near the gold burst.
Final fix re-review: A,B,C,E,F,G,H ADDRESSED; D NOT ADDRESSED (spec wording only) → Ruling: fix immediately despite "no second fix wave" (user rule: fix resolvable gaps now; 3-line tool change, no runtime effect) — commit 5140231, verified: --check PASS; injected ch2-motion reuse → VIOLATION.
Final review: clean. Remaining for the user: BASTION G4/identity decision; human playtest (docs/qa/playtest-ch23-attacks.md); main merge/push. Parked: FR-m4 KO cosmetic sounds, FR-m5 duplicated literals, 3rd unlit score pip contrast.
