# Working instructions for GPT-6 Astra

## Goal and scope

Build a small webcam rhythm game for a hackathon. Flying notes cue body and hand
poses; the player matches them on the beat to trigger hit sounds, visual feedback,
and points. Bundled songs use prepared pose charts, while uploaded songs generate
a chart locally in the browser. Read
[PLAN.md](PLAN.md) for the game behavior and verification status.

The implementation lives in `Frontend/`, with two bundled original tracks and
the pretrained pose model. `Backend/` is unused. The current scope is only the
rhythm game; MIDI and a separate instrument mode were explicitly dropped.

## Keep the build small

- Optimize for a working hackathon demo and code a teammate can understand quickly.
- The user's latest UI redesign request explicitly requires shadcn/ui. Use React
  with JavaScript/JSX, shadcn components, Tailwind CSS, and Vite in `Frontend/`.
  Installing their required dependencies is part of that requested migration.
  This supersedes the original no-UI-framework restriction. Keep Canvas 2D,
  native Web Audio, and the pulled Teachable Machine/TensorFlow pose model for
  the existing game logic.
- Show song selection first; Play opens a focused game screen. Customize shadcn
  for clean, readable controls inspired by sampler hardware: a silver panel,
  orange transport controls, and a dark waveform display. Use real audio waveform
  and pose-chart previews; avoid decorative generated covers and template-like heroes.
- Use ordinary functions, arrays, objects, and a small amount of explicit state.
  A little duplication is fine. Extract code when it makes today's code clearer.
- Build only behavior required by the current task. Do not add future-proofing,
  extension points, generic engines, base classes, service layers, dependency
  injection, schema migrations, or speculative configuration.
- Keep `Backend/` unused for this MVP. Skip accounts, databases, server APIs,
  cloud storage, analytics, generative AI, and deployment infrastructure.
- Use shadcn controls, CSS, and a canvas animation loop. No game engine, 3D avatar
  system, extra state library, or custom machine-learning training.
- Keep uploaded-song generation browser-only with Web Audio and instrument-band
  onset analysis. Do not add Python services, upload endpoints, or a chart editor.
  Keep the four supported poses fixed for the demo.
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
- Use `cd Frontend && npm run dev` for the browser demo, `npm test` for the focused
  Node tests, and `npm run build` for the production build. Run `npm install`
  first; its postinstall step copies the matching MediaPipe WASM assets locally.
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
