# Bodybeat — webcam rhythm game

Merge integration: the current model uses Left Hand / Right Hand for the upper
corner cues and Default for playback control. The corner renderer, controls, and
300 ms camera grace now use those IDs consistently. Build and browser checks
with simulated camera input pass for all four cues, grace scoring, and Default
playback control. The full suite has 23 passing tests and three existing failures:
the four-entry pose assumption, removed classifier import, and an old chest-pose
ID in the practice-audio test. Real webcam movement was not rechecked for this merge.

Camera scoring now remembers the last confident instrument pose for 0.3 seconds
when it matches the next unjudged cue. Fresh detections refresh that memory, so
an early pose can wait for the normal hit window and survive brief uncertain or
missing tracking. A different recognized pose cancels it; scoring consumes the
entry, so a held pose cannot score another note. Pause/resume clears pending
input, and restart creates fresh memory. Keyboard input is unchanged. The avatar
still follows live joints independently of this scoring grace period.

Seven focused grace-period tests and the production build pass. A browser check
using real decoded audio and simulated camera frames verifies a buffered hit,
stale/wrong-pose rejection, pause clearing, restart, and exit without runtime
errors. Full `npm test`:
24 pass, with the same two baseline failures described below. Physical timing
and recognition comfort still need a human playtest.

The game now centers the homepage character with four diagonal cue paths. Chest
cues arrive from the upper corners; hip cues arrive from the lower corners, with
rings beside the character marking the beat. The character mirrors live camera
joints, including movements without a named pose, and rests on lost/stale input.
Keyboard pose controls also animate it briefly. In gameplay, reduced motion
suppresses decorative trails and bursts while keeping direct player movement.
Audio timing and scoring rules are unchanged. The instructions describe the new corner targets.

Verification for this change (2026-09-13): production build passes. Browser checks
at 1440×1000 and 390×844 verify the character, incoming cues, timed keyboard
scoring, repeated-hit protection, pause/resume, restart, exit, and no horizontal
overflow or JavaScript errors. Simulated camera frames through the real avatar
mapper verify raw wrist movement, Start / Pause game entry, tracking loss, reduced
motion, and camera cleanup. The new cue-position test passes. Full `npm test`:
17 pass; the same two baseline failures remain (removed `classifyPose` import and
a test expecting four entries in the now-five-entry pose metadata). A brief
real-webcam check received 640×480 video with no runtime errors, but was still loading the
model when stopped; physical full-body movement and audible timing still need
a human playtest.

The poster character now mirrors live PoseNet joint positions when its camera is
enabled, with smoothed, mirrored arms, head, torso, and visible legs. This does not
depend on recognizing one of the five named poses. Uncertain joints return to a
resting position; lost/stale tracking clears the live pose, and camera-off restores
the demo. Motion pause and reduced-motion preferences still apply. Three focused
mapping tests and simulated browser checks pass for mirroring, distance/position
normalization, uncertain joints, live wrist movement, pause/resume, loss of input,
and camera-off cleanup. Physical full-body matching still needs a human playtest.

Main-screen poster redesign: yellow/pink street-poster composition, transparent
drummer photograph, self-hosted display fonts, real track waveforms, and a circular
Play control. Idle motion follows selected BPM. “Make the poster move” explicitly
enables a mirrored camera preview; shoulder positions move the artwork and confirmed
poses trigger stamps and directional reactions. Keyboard selection, leaving the
screen, and hiding the tab release the camera. Motion can be paused and respects
reduced-motion preferences. The game and practice retain their existing behavior.
Production build and desktop/mobile browser checks pass (1440×1000, 390×844):
song/input selection, keyboard game entry/return, instructions, no overflow or
runtime errors. Simulated recognition verifies all five pose reactions, lost-input
clearing, motion controls, camera denial, and cleanup on Keyboard selection.
Live camera remained in its loading/permission state and was stopped; physical
pose reactions and audible timing still need a playtest. Tests: 14 pass, with the
pre-existing removed `classifyPose` import failure in `pose.test.js` unchanged.

Recognition feedback: gameplay and practice now outline the player's head, torso,
and visible limbs in the confirmed move's color (including Start / Pause).
The colored edge also casts a soft inner glow, clipped to the body and fading
to a transparent center so the camera image stays visible. Build and simulated
browser checks verify the inward fade, move color, transparent center/exterior,
all five recognition colors, clearing, and desktop/mobile camera views.
The outline approximates the body from PoseNet joints; it is not pixel-level
segmentation. It follows the existing 100 ms confirmation, remains while the pose
is recognized, and clears on uncertain input, lost tracking, or camera shutdown.
Build and browser checks pass for all five colors, color replacement, transparent
interiors, lost/uncertain clearing, mirrored gameplay, and desktop/mobile practice
using simulated model output. A live webcam check produced landmarks without JS
errors, but both arms were not tracked, so physical pose/outline alignment remains
to be playtested. `npm test`: 14 pass; the existing `pose.test.js` still fails by
importing the removed `classifyPose` export.

Latest palette update: brighter orange transport controls, saturated yellow/blue/pink/teal
pose colors shared by the demo, guide, chart, and game notes, plus a lime waveform
on a deep violet display. Build, contrast checks, and design detector pass. Browser
checks at 1280×720 and 390×844 covered track/input selection, keyboard game entry,
and return to songs with no console errors. Webcam and audible timing were not
retested for this color-only change.

Main-screen bolder pass: larger headline and waveform, full-color pose pads with
a single staggered entrance, and a larger Play control. Scoped to song selection.
Production build and design detector pass. In-app browser checks at 1440×900
and 390×844 covered layout, track/input selection, keyboard game entry, return
to songs, and instructions. No browser errors observed. Camera input and audible
timing were not re-tested for this visual-only change.

Latest playback update: the four instrument lanes are left hip (snare), right hip
(hi-hat), left chest (bass), and right chest (crash). The model's `Start/Stop`
class is a separate Start / Pause control, with no note, score, or instrument
sound. In Camera mode it starts the countdown, pauses, or resumes the round;
Keyboard mode starts automatically. Pause freezes the song clock and notes,
including during the countdown, and leaves the camera active for resuming.
Holding the gesture does not repeat; show an instrument pose to rearm it.
Controls have a one-second cooldown; a control held through the cooldown acts
once it expires, without needing another pose-entry event.
Pause/Resume buttons provide the same control. Browser checks with simulated
pose input and real decoded audio verified these transitions, timing, scoring,
restart, and exit. Fourteen focused tests and the build pass; the older pose test
file still imports the removed `classifyPose` export. Physical gesture control
and audible pause/resume timing still need a human playtest.

Status: implemented. Scope is the rhythm game only. The production build and
nine focused tests pass. The latest UI uses React and customized shadcn controls,
with a separate song-selection page and focused game screen. Browser checks
cover keyboard scoring, song selection, results, restart, the instructions dialog,
desktop/mobile layouts, and the camera loading/framing state. Before the redesign, a live camera round
showed the mirrored skeleton, pose recognition, and scoring through completion.
The human playtest confirmed that the music feels in sync and all four poses
trigger reliably. MediaPipe emitted internal OpenGL/projection warnings during
camera use; no JavaScript errors were observed.

Practice mode is implemented. Browser checks at 1440×900, 390×844, and 844×390
verified the mirrored camera/skeleton layout, all four pose labels with simulated
landmarks through the real classifier, neutral/lost tracking, camera and model
errors, retry, navigation, and camera cleanup including pending permission.
The bundled MediaPipe model also loaded and processed simulated camera frames.
The real webcam feed, skeleton, and framing guidance were also checked in the
in-app browser. The nine focused tests and production build pass. A human still
needs to try all four physical poses in the new practice screen.

## The game

A Guitar Hero-style rhythm game controlled by your body. Pick a song, stand in
front of the webcam, and match incoming pose cues as they reach the rings beside
the central character.
A hit triggers a short sound, a flash, and points. The backing song keeps
playing through misses.

A song map now means a beat chart: a timeline connecting moments in a track to
poses. Each song has its own chart. This replaces the previous sound library,
button grid, and editable pad maps.

Working assumptions: one player, a laptop webcam, upper-body movements, and
short bundled tracks. Hand positions mean where the hands and arms are relative
to the body; individual finger gestures are outside this MVP.

## What the player sees

- The homepage character stands in the middle and mirrors the player’s live
  joints. Keyboard inputs briefly animate the corresponding pose.
- Four diagonal paths bring cues toward rings beside the character: left/right
  chest from the upper left/right corners, left/right hip from the lower
  left/right corners. Cues reach their rings at their authored audio timestamps.
- Notes and targets show a pose pictogram and distinct color, with labeled
  corner controls; color alone is not the cue.
- A mirrored webcam panel shows the human player with a light skeleton overlay,
  the detected pose, and a tracking indicator.
- Score, combo, song progress, and brief Perfect / Good / Miss feedback.
- First page: song selection, Camera / Keyboard, a short pose guide, and Play.
- Play opens the game, loads the selected song, and requests the camera if used.
  In Camera mode, make Start / Pause once tracking is ready to begin the countdown.
  Results offer Retry / Choose song.
- Practice poses opens a full-viewport mirrored camera with a skeleton overlay,
  the detected stance, and a guide that highlights the matching pose. Practice
  always uses the camera, independently of the game input choice, with no song,
  countdown, or scoring. The complete camera frame stays visible without cropping.
  Arms down and missing tracking have their own feedback. Retry handles camera
  or model errors; Back to songs, Escape, and hiding the tab release the camera.

Use the homepage’s yellow, pink, cream, and dark poster palette with shadcn
controls. Draw diagonal paths and flying cues on Canvas 2D; reuse the homepage’s
SVG character with smoothed, mirrored joint tracking. Keep the webcam preview
available beside the game. Missing tracking clears the character’s live pose.

## Four poses

| Lane | Pose | Initial recognition rule |
| --- | --- | --- |
| 1 | Left hand up | Left wrist above its shoulder; right hand lowered |
| 2 | Right hand up | Right wrist above its shoulder; left hand lowered |
| 3 | Both hands up | Both wrists above their shoulders |
| 4 | Arms spread | Both arms extended outward around shoulder height |

Use shoulders, elbows, and wrists, with distances relative to shoulder width.
Leave a clear margin between raised, spread, and lowered positions. Treat
intermediate positions as no pose; check Both hands up before single-hand poses.
Tune simple thresholds on the demo laptop. Left/right mean the player's
anatomical left/right; mirror preview and cue figures consistently and confirm
this during playtesting.

A pose must remain stable for about 100 ms before it counts. Emit one event
on entry using the song time when the pose is confirmed. Holding it emits no
more events. In the game, retain an unconsumed entry for the next matching cue
while confident detections continue and for 300 ms afterward. Judge it once the
normal hit window opens; a different pose cancels the pending entry. Confidently recognizing both arms down or another pose rearms it;
an uncertain or dropped frame does not. Avoid jitter-induced hits.

## Play loop and timing

1. Select a song and input mode, then press Play to open the game screen.
2. Load audio and, for Camera mode, the pose model and webcam. Show framing
   guidance; in Camera mode, begin the countdown on the Start / Pause gesture
   once both arms are tracked.
3. Give a three-second countdown, then play. Show each note about 2.5 seconds
   before its target time so the player can prepare.
4. Compare each pose-entry event with the closest unjudged note for that pose.
   Within ±150 ms is Perfect (100 points); within ±300 ms is Good (50 points).
   Consume one note, increment combo, flash its target ring, and play that pose's short
   hit sound. These are starting values to tune during playtesting.
5. A note more than 300 ms late becomes Miss and resets combo. Unmatched poses
   do nothing; intermediate movements do not incur extra penalties.
6. Show results at the end. Retry resets playback, notes, pose latches, and score.

Use one audio clock for the backing track, note positions, and hit judging.
Calculate position from chart time minus current song time on every animation
frame; do not advance time by accumulating frame deltas. The full track plays
continuously, with quiet hit sounds layered on top.

Provide master volume and Pause / Resume / Stop / Restart / Back to songs. Lost tracking shows “Step into frame”
and disables new pose input; an already-matching pending entry retains its
300 ms grace period. The song continues and overdue notes miss. Stop the
round when the tab becomes hidden. Returning to selection and finishing a track
release the camera.
Keys 1–4 provide a simple keyboard test mode through the same judging function;
ignore held-key repeats and typing in fields.

## Songs and maps

Ship two tracks of roughly 30–60 seconds with manually timed charts. Use original
or freely usable bundled audio and retain required attribution. No music account,
beat detection, or Guitar Hero file import is needed.

Beginner charts have notes at least one second apart, the first note at three
seconds or later, no simultaneous notes, and no consecutive identical poses.
Make one full song playable before adding the second.

```js
const songs = [
  {
    id: 'first-groove',
    title: 'First Groove',
    audioUrl: '/audio/first-groove.mp3',
    notes: [
      { time: 3.0, pose: 'leftUp' },
      { time: 4.5, pose: 'rightUp' },
      { time: 6.0, pose: 'bothUp' },
      { time: 7.5, pose: 'spread' },
    ],
  },
];
```

Times are seconds from audio start. Keep charts sorted and note results in
session memory. Four fixed pose-to-lane and pose-to-sound assignments are enough.
No database or persistent score storage is required.

## Small implementation

Use Vite, React with JavaScript, customized shadcn/ui, Tailwind CSS, Canvas 2D,
and Web Audio. Use `@mediapipe/tasks-vision` for tracking, with the pretrained Pose Landmarker Lite
model in video mode for one person. Bundle the model and matching WASM assets.
Google's [Pose Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)
documents the package, model loading, video inference, and body landmarks.

Request video only and process it locally, without recording or uploading frames.
Camera access requires browser permission and HTTPS or localhost; see
[MDN's camera API documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
Request access when the player presses Play in Camera mode or Practice poses and show a useful message if permission,
hardware, or asset loading prevents play.

Start at a modest camera resolution and about 15–20 pose evaluations per second,
using each video frame at most once. Animate notes with `requestAnimationFrame`.
Inference is synchronous and can block the main thread. Measure on the demo
laptop; add one inference worker only if visible stutter requires it, following
[Google's threading guidance](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js#run_the_task).
No worker framework or performance infrastructure up front.

```text
Frontend/
  index.html
  package.json          Vite scripts and the pose-tracking dependency
  src/
    main.jsx            React entry point
    App.jsx             song-selection page and shared controls
    Game.jsx            game screen and round lifecycle
    Practice.jsx        full-viewport camera and live pose feedback
    components/ui/      shadcn source components
    pose.js             webcam, landmarks, four-pose classification
    game.js             corner cue canvas, hit judging, score
    audio.js            audio clock, track playback, synthesized hit sounds
    poses.js            pose metadata and cue pictograms
    songs.js            song metadata and hand-authored charts
    style.css
  public/
    audio/              two original tracks
    models/             pretrained pose model
    wasm/               matching MediaPipe runtime assets
```

Use ordinary functions and a small state object. Leave `Backend/` unused.

## Implemented flow

1. The first page presents both songs, input choice, instructions, and Play.
2. Play mounts the game and loads audio and any camera resources. Camera mode
   waits for Start / Pause; Keyboard mode starts its three-second countdown
   once loading finishes.
3. Pose entries or keys feed the same timing and scoring functions. Canvas
   animation uses the audio clock; React updates the surrounding controls.
4. Results show hits, misses, and best combo. Retry creates a fresh round;
   Back to songs and Stop release resources and return to selection.

## Done means

- A player can choose a song and input mode, press Play, and finish the track.
- Left/right cues match the mirrored presentation and all four poses are usable.
- The homepage character stays centered, follows live joints without waiting for
  pose classification, and returns to rest when tracking is lost or stale.
- Chest cues arrive from upper corners and hip cues from lower corners; all four
  reach their target rings on the audio beat, including after pause/resume.
- Correct poses near the beat trigger sounds, visible hits, points, and combo.
- Wrong poses and late inputs cannot score; each note is judged at most once.
- Holding a pose or briefly losing tracking cannot generate repeated hits.
- Notes and audio stay aligned through a full track and after Restart.
- Both songs have playable charts with enough time to change poses.
- Stop silences playback; leaving gameplay releases the camera; Retry starts clean.
- Camera/model/audio errors explain what happened and missing tracking is visible.
- Practice opens from the pose guide, recognizes all four poses, clears stale
  feedback when tracking is lost, and releases the camera when leaving. Returning
  to songs preserves the selected track and game input mode.
- The production build passes. Verify with a real webcam and audible playback
  on the demo laptop; keyboard-only checks are insufficient.

Keep the MVP here: no full dance recognition, finger tracking, custom training,
3D character, multiplayer, chart editor, uploads, automatic song mapping,
accounts, or backend. Add none of these without a scope change.
