---
target: Bodybeat main screen
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-09-12T20-46-57Z
slug: frontend-src-app-jsx
---
# Bodybeat main-screen critique

Two independent assessments; source: Frontend/src/App.jsx; live browser: http://127.0.0.1:5173/ at 1280×720. Operate surface, judged against playful, exciting physical participation.

## Design specificity

The sampler identity is specific to Bodybeat: real waveform, authored chart, orange transport, and corresponding pose colors. It remains more successful at communicating music selection than inviting physical movement. The last bolder pass amplified size and color without solving that hierarchy.

Deterministic scans of App.jsx and components returned zero findings. No browser warnings/errors. A clean scan does not establish usability.

## Heuristic score

| Heuristic | Score / 4 | Reason |
|---|---:|---|
| System status | 3 | Clear selected track/input and startup state |
| Real-world match | 3 | Familiar transport; undefined control gesture |
| User control | 3 | Reversible selection and optional practice |
| Consistency | 3 | Coherent palette and controls |
| Error prevention | 3 | Safe defaults and disabled startup actions |
| Recognition over recall | 2 | Required Start / Pause motion not illustrated |
| Efficiency | 3 | Direct Play path and keyboard alternative |
| Minimalist design | 3 | Useful grouping, misplaced emphasis |
| Error recovery | 3 | Retry guidance; source-reviewed, not induced |
| Help | 2 | Available instructions omit essential gesture definition |
| Total | 28/40 | Good usability foundation |

## What works

- Prominent Play names the selected song.
- Real waveform and chart make the interface musically credible.
- Pose pads pair color, figure, label, and keyboard number.

## Priority issues

1. **P1 — Show the Start / Pause gesture.** PoseGuide.jsx renders only the four instrument poses while directing players to an undefined fifth gesture. Add the existing control-pose illustration and plain physical instructions, visibly separate from scoring lanes. Suggested command: impeccable clarify.
2. **P2 — Bring movement into the first viewport.** At 1280×720, Play is around y635–699 and Practice begins around y746; all four body figures require scrolling. The entrance animation can finish unseen. Reduce header/display vertical space and bring pose guidance beside the selection/transport. Suggested command: impeccable layout.
3. **P2 — Make chart information readable.** Lane labels are 9px in 45px of width; Right chest wraps. Notes are 4×5px. Enlarge labels and markers or simplify the preview until it communicates rather than merely decorating. Suggested command: impeccable polish.

## Cognitive load and emotional journey

Choices are manageable: two tracks, two input modes, four instrument poses. No decision has more than four options. Recognition fails around the missing control gesture. Musical credibility arrives first; physical playfulness arrives after scrolling; uncertainty returns when starting requires an unseen gesture. Demonstrating the first movement matters more than adding effects.

## Persona red flags

- First-time visitor: cannot infer the Start / Pause motion.
- Low-vision visitor: small chart labels undermine otherwise readable headings and pose labels.
- Hackathon walk-up player: may initially mistake the screen for a music player.

## Minor observations

How to play is 28px high; input toggles are 32px. These are smaller than the 44px touch heuristic, not an automatic WCAG failure. Keyboard hints appear in camera mode without contextual explanation. PRODUCT.md contains earlier statements about the pending redesign; context refresh is separate work.

## Questions to consider

Could a visitor understand their first movement before reading Choose a song? Which should lead the next pass: explaining that motion, or making it visible on arrival?
