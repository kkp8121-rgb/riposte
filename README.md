# RIPOSTE

### You have no sword. Parry perfectly, and their attack becomes yours.

**▶ Play in your browser: https://kkp8121-rgb.github.io/riposte/**

A keyboard-only, side-view 1:1 boss-rush parry duel. You start with **zero attacks**. Every
weapon in your hands was taken out of someone else's — a perfect parry doesn't just deflect
a strike, it *steals* it. Four bosses, four stolen movesets, one mirror waiting at the end
that gives all of it back.

![Title screen](docs/media/title.png)

| A perfect parry steals the attack | The mirror turns your own hand on you |
|---|---|
| ![Perfect parry](docs/media/perfect-parry.png) | ![Mirror phase 2](docs/media/mirror-phase2.png) |

---

## Controls

| Key | Action |
|---|---|
| `←` `→` / `A` `D` | Move |
| **`K`** / `Z` | **Parry** — answer the **gold** flash |
| **`J`** / `X` | **Riposte** — spend a stolen attack |
| **`Space`** / `L` / `C` / `Shift` | **Dash** — i-frames; the only answer to **red** |
| `Enter` | Confirm / start / next |
| `R` | Retry current boss |
| `M` | Mute |
| `Esc` | Back to title |

Two colors, two verbs. **Gold = parry. Red = dash.** That's the whole language.

---

## How it plays

1. **Read the flash.** Every attack telegraphs with a burst at the weapon tip and an audio
   cue. The time from flash to impact is *constant per attack* — you learn a rhythm, not a
   reaction test.
2. **Parry on the beat.** A press opens a 0.18 s **perfect** window, then a 0.34 s **block**
   window. Perfect = no damage, the boss flinches, and the attack lands in your **hand**
   (3 slots, FIFO). Projectiles get reflected straight back. Block = safe but empty-handed.
   Whiff and you're wide open for 0.4 s.
3. **Riposte.** `J` spends the front slot. `lunge` stabs, `slash` sweeps, `shot` fires,
   `slam` crushes. Hit a boss **during its wind-up** and you interrupt it for **×1.5**.
4. **Keep the streak.** Three perfect parries in a row and every riposte deals **×2**. The
   streak only resets when *you* take damage — so the fantasy holds: flawless is lethal.
5. **Phase II.** At 50 % HP every boss roars, speeds up its wind-ups, and unlocks new
   patterns.

Rank per boss: **S** = no hits *and* under par · **A** = ≤1 hit *or* under par ·
**B** = ≤3 hits · **C** = otherwise.

---

## The bosses

| # | Boss | | What it teaches | What you take |
|---|---|---|---|---|
| 1 | **VESPER** | *The Duelist* | The parry itself. Opens slowly, flashes unmistakably. | `THRUST` `SLASH` |
| 2 | **SERAPH** | *The Archer* | Reading projectiles and reflecting them. Keeps its distance. | `ARROW` `KICK` |
| 3 | **GRAVEN** | *The Bulwark* | Armor — only an **empowered** riposte interrupts it. Dash *into* the charge. | `SLAM` `SHOCKWAVE` |
| 4 | **MIRROR** | *Your Reflection* | Patience. It feints, and in Phase II it replays **your own hand** back at you. | everything |

---

## Tech notes

- **Vanilla JavaScript + Canvas 2D.** No framework, no build step, no bundler.
- **Zero external assets.** No CDN, no web fonts, no image or audio files. Every sound is
  synthesised live in WebAudio; every character is a vector silhouette with procedural
  animation (breathing bob, movement lean, weapon-arc glow, dash after-images).
- Classic `<script>` tags, so it runs straight off `file://` *and* from a GitHub Pages
  sub-path. All paths are relative.
- Logical resolution 960×540, letterboxed to the window with device-pixel-ratio scaling.
  Fixed-step simulation at 1/120 s with an accumulator; rendering on `requestAnimationFrame`.
- Deterministic: boss pattern selection is the only consumer of RNG, and it's seeded.
- Constants live in tables — `js/config.js` globally, `js/bosses/*.js` per boss. No magic
  numbers in the logic.

### URL parameters

| Param | Effect |
|---|---|
| `?boss=1..4` | Jump straight to a boss |
| `?seed=N` | Seed the pattern RNG |
| `?mute=1` | Start muted |
| `?nofx=1` | Disable particles, rings, after-images and text pops. **Hit-stop, screen shake and slow-motion stay on** — they are part of the timing, not decoration, so judgement is identical with or without it |
| `?speed=0.5` | Time scale |

A run started with `?boss=N` never writes to your saved progress.

### Run it locally

```
open index.html
```

That's it — double-click the file. No server needed.

### Tests

```
node tests/smoke.mjs        # headless boot, title -> fight, 60s idle -> defeat, 0 page errors
node tests/bot.mjs --all    # a reactive bot beats all four bosses; a passive bot loses
node tests/state.mjs        # boss definition tables stay byte-identical across a whole fight
node tests/audio-smoke.mjs  # one keypress -> AudioContext running; every sound path callable
node tools/shots.mjs        # re-capture the README screenshots into docs/media/
```

All of them use `playwright-core` with the bundled Chromium and drive the game through the
debug hook `window.__RIPOSTE`. Test screenshots land in `tests/shots/`.

---

## Credits

Built for a game jam. Design, code, audio synthesis and art direction are all in this repo —
`docs/superpowers/specs/2026-09-09-riposte-design.md` is the full design document.

*Nothing is given. Everything is taken.*
