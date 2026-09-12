# Working instructions for GPT-6 Astra

## Goal and scope

Build a small, enjoyable soundboard for a hackathon. Sounds live in a library;
each sound map assigns a selection of them to nine buttons. Only one map is
active at a time. Read [PLAN.md](PLAN.md) for the proposed behavior and build order.

The current repository contains only README scaffolding in `Frontend/` and
`Backend/`. There is no application, package manifest, or test runner yet.
The initial task is planning and documentation; implement when the user asks.
Update this paragraph when implementation changes that state.

## Keep the build small

- Optimize for a working hackathon demo and code a teammate can understand quickly.
- Use plain JavaScript, HTML, CSS, native Web Audio, and Vite in `Frontend/`.
  Vite is the only planned development dependency; no runtime packages are needed.
- Use ordinary functions, arrays, objects, and a small amount of explicit state.
  A little duplication is fine. Extract code when it makes today's code clearer.
- Build only behavior required by the current task. Do not add future-proofing,
  extension points, generic engines, base classes, service layers, dependency
  injection, schema migrations, or speculative configuration.
- Keep `Backend/` unused for this MVP. Skip accounts, databases, APIs, routing,
  cloud storage, analytics, AI integration, and deployment infrastructure.
- Prefer native controls and CSS over adding UI, state, animation, or audio libraries.
- Handle errors a demo user can encounter: audio blocked, a sample failing to
  load, or local saving unavailable. Avoid elaborate recovery systems.

## How to work

- Follow the user's current request. For a planning request, produce a concrete
  plan; for an implementation request, carry the feature through to verification.
- Resolve small, reversible ambiguities with a reasonable assumption and continue.
  Ask only when missing information materially blocks correct work.
- Inspect the relevant files and current diff first. Preserve unrelated changes.
- Keep the next steps brief. Work in small, usable increments rather than
  scaffolding architecture before anything can play a sound.
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
  `PLAN.md`. For audio changes, check audible playback as well as UI state.
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
verification explicit for this project. They configure agent behavior; the
soundboard itself does not require a model or an OpenAI API connection.

This root-level `AGENTS.md` follows
[Codex's project instruction convention](https://learn.chatgpt.com/docs/agent-configuration/agents-md#how-codex-discovers-guidance).
