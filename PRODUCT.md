# Bodybeat

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

First-time hackathon visitors trying a single-player rhythm game on a laptop
with a webcam. The main screen should help them understand the interaction,
choose a track, and start quickly. Confirmed during Impeccable init.

## Product Purpose

Turn upper-body poses into a playable rhythm game: match a flying cue on the
beat to trigger an instrument sound, feedback, and points. Success is a visitor
starting and completing a short song with understandable controls and timing.

## Operating Context

Choose one of two bundled tracks, choose Camera or Keyboard, then press Play
to enter a focused game screen. Camera mode requests permission and uses a
Start / Pause gesture to begin the countdown. Keyboard mode begins automatically
after loading. Practice poses offers camera-based rehearsal without a song or
score. Returning to song selection preserves the track and input choice.

## Capabilities and Constraints

- React with JavaScript/JSX, Vite, Tailwind CSS, and customized shadcn/ui in
  `Frontend/`; Canvas 2D and native Web Audio support gameplay.
- Local webcam pose estimation; no recording or uploading camera frames.
- Four fixed instrument lanes: left hip, right hip, left chest, right chest.
  Start / Pause is a separate control gesture, not a scoring lane.
- Hand-authored song charts, real audio waveform and pose-chart previews,
  score, combo, timing feedback, practice, volume, and round controls.
- One pose entry can consume at most one note. Holding a pose cannot repeatedly
  score. The song audio clock governs timing and note movement.
- Camera, model, and audio failures need understandable feedback. Keyboard
  mode remains an alternative input for the rhythm game.
- Keep the hackathon implementation small. No accounts, backend, imports,
  chart editor, automatic chart generation, multiplayer, or instrument mode.
- Preserve existing gameplay and in-progress changes during main-screen work.

## Brand Commitments

The product name is Bodybeat. Project instructions establish sampler-hardware
inspiration: a silver panel, orange transport controls, and a dark waveform
display. Use actual track and chart content rather than generated covers or a
generic promotional hero. Specific layout decisions belong to later design work.

User-confirmed character: playful and exciting, encouraging the player to get
up and move. The current interface has not yet been redesigned to fully express
this direction.

## Evidence on Hand

- `Frontend/src/songs.js`: First Groove (96 BPM, 40 seconds) and Disco Circuit
  (120 BPM, 36 seconds), with authored charts and bundled original recordings.
- `Frontend/src/poses.js`: current instrument-pose metadata and cue drawings.
- `Frontend/src/components/TrackDisplay.jsx`: actual waveform and chart preview.
- `PLAN.md`: game behavior, scope, and historical verification reports. Its
  opening update supersedes older pose descriptions further down the document.

## Product Principles

- Make the first playable round easy to reach without prior instruction.
- Teach movement through clear cues and optional hands-on practice.
- Keep timing and feedback tied to the music.
- Prefer a reliable, understandable demo over additional features.

## Open Decisions

The replacement main-screen composition has not yet been implemented or
visually verified. No product-specific accessibility standard has been agreed;
preserve semantic controls, keyboard access, readable labels, and non-color cues.
