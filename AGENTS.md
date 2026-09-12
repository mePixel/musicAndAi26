# Working instructions for GPT-6 Astra

## Goal and scope

Build a small webcam rhythm game for a hackathon. Flying notes cue body and hand
poses; the player matches them on the beat to trigger hit sounds, visual feedback,
and points. Each song has a hand-authored timeline of pose cues. Read
[PLAN.md](PLAN.md) for the proposed behavior and build order.

The current repository contains only README scaffolding in `Frontend/` and
`Backend/`. There is no application, package manifest, or test runner yet.
The initial task is planning and documentation; implement when the user asks.
Update this paragraph when implementation changes that state.

## Keep the build small

- Optimize for a working hackathon demo and code a teammate can understand quickly.
- Use plain JavaScript, HTML, CSS, Canvas 2D, native Web Audio, and Vite in
  `Frontend/`. Use `@mediapipe/tasks-vision` with a pretrained Pose Landmarker
  model for webcam tracking. That is the one planned runtime dependency.
- Use ordinary functions, arrays, objects, and a small amount of explicit state.
  A little duplication is fine. Extract code when it makes today's code clearer.
- Build only behavior required by the current task. Do not add future-proofing,
  extension points, generic engines, base classes, service layers, dependency
  injection, schema migrations, or speculative configuration.
- Keep `Backend/` unused for this MVP. Skip accounts, databases, server APIs,
  cloud storage, analytics, generative AI, and deployment infrastructure.
- Use native controls, CSS, and a canvas animation loop. No game engine, 3D avatar
  system, UI framework, state library, or custom machine-learning training.
- Hand-author short song charts as data. No automatic chart generation, song
  imports, or chart editor. Keep the four supported poses fixed for the demo.
- Use the song's audio clock for note movement and hit timing. One pose entry
  can consume at most one note; holding a pose must not repeatedly score.
- Handle errors a player can encounter: camera denied, tracking lost, or audio
  and model assets failing to load. Avoid elaborate recovery systems.

## How to work

- Follow the user's current request. For a planning request, produce a concrete
  plan; for an implementation request, carry the feature through to verification.
- Resolve small, reversible ambiguities with a reasonable assumption and continue.
  Ask only when missing information materially blocks correct work.
- Inspect the relevant files and current diff first. Preserve unrelated changes.
- Keep the next steps brief. First prove one pose and one timed note work;
  then complete a playable song before adding more content.
- Work as one agent by default. Use subagents only when the user requests them.
- Apply skills proportionately to this hackathon. Where higher-priority
  instructions permit, the user's explicit scope takes precedence over generic
  skill recommendations. Do not turn recommendations into approval gates.
- Give short updates at meaningful milestones. Finish with what changed, what
  was checked, and any actual limitation. Avoid lengthy recaps or hypothetical risks.

## Verification and completion

- For documentation changes, check the diff, links, and consistency; no app tests.
- Once implemented, use `cd Frontend && npm run dev` for the browser demo and
  `cd Frontend && npm run build` for the production build. These are planned
  commands, not commands available in the initial scaffold.
- Exercise the affected user journey and the relevant acceptance checks in
  `PLAN.md`. Check audible timing and real webcam pose input. Keyboard input can
  verify the game loop but cannot establish that body tracking works.
- Add a focused automated test only for meaningful, non-obvious logic or a bug
  that warrants one. Do not install a test framework just to test trivial changes.
- After the relevant checks pass, stop testing unless new evidence warrants more.
  Do not add coverage targets, broad browser matrices, or repeated review loops.
- Never claim a command, interaction, or listening check passed unless it was
  actually performed. Clearly distinguish planned work from implemented behavior.

## Guidance basis

Reviewed on 2026-09-12 against OpenAI's
[GPT-6 Astra prompting guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices).
The instructions above make autonomy, scope, writing style, delegation, and
verification explicit for this project. The game uses local pose estimation;
it does not require GPT Astra or an OpenAI API connection at runtime.

This root-level `AGENTS.md` follows
[Codex's project instruction convention](https://learn.chatgpt.com/docs/agent-configuration/agents-md#how-codex-discovers-guidance).
