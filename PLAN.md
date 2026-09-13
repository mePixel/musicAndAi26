# Bodybeat — webcam rhythm game

Merge integration (2026-09-13): the difficulty modes and next-cue preview now
work with smoothed recognition and on-beat camera scoring. Camera grace uses the
selected mode's Good window and only fresh accepted observations refresh it.
Missing-joint guidance takes priority over the next-cue label. Both bundled
charts now use the current hand pose IDs, so they load without fallback warnings.

Verification: all 55 Node tests and the production build pass. Browser checks
with simulated camera predictions and decoded audio passed for Easy, Medium,
and Hard: next-cue preview, missing-hand guidance, early poses scoring on the
beat, pause/resume, restart, and exit. Desktop gameplay and mobile practice were
checked, with no browser errors or warnings. Physical webcam pose comfort and
audible timing were not rechecked during this merge. The existing bundle-size
build warning remains.

Recognition playability update (2026-09-13): class-score smoothing, separate
70% entry / 50% retention thresholds, and 150 ms visual dropout tolerance make
pose feedback steadier. Per-move joint checks replace the global hip requirement,
with specific framing hints. Camera poses prepared early now score on the beat;
only fresh observations refresh the existing 300 ms scoring grace. Mirrored lane
mapping, one-entry/one-note protection, and keyboard timing are preserved.

Verification: 35 Node tests and the production build pass. Playwright with Chrome
at 1440×1000 and 390×844 verified practice feedback, moderate-confidence retention,
hand poses with hips hidden, missing-hand guidance, all four early camera hits
scoring Perfect on their beats, pause/resume, restart, and exit. Simulated model
output ran through the real camera loop, recognizer, and game with decoded audio;
no browser errors or warnings occurred. A separate real-webcam check received
640×480 video and processed model frames without JavaScript errors, but the active
hand was not visible. Physical four-pose comfort and audible timing still need a
human playtest. The existing large-bundle build warning remains.

Only the black game character takes the current instrument pose’s color or the
active keyboard pose’s color. Default, missing/stale detection, and expired
keyboard input restore black. The yellow backdrop, pink and white trails, and
homepage character stay unchanged. Build and desktop/mobile browser checks
pass for four instrument colors, Default staying black, unchanged background and
trails, keyboard input, and color clearing. Physical recognition was not rechecked.

Pose-controlled pausing and resuming are disabled. The Default pose only starts
a camera round from the framing screen. Once the round starts, Pause and Resume
are controlled exclusively by the on-screen buttons, including during countdown.
Build and simulated-camera browser checks pass: poses cannot pause countdown or
playback or resume a paused round; manual buttons and scoring grace still work.
Tests: 21 pass; the existing classifier-import and practice-audio pose-ID failures
remain. Physical camera input and audible timing were not rechecked.

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

Latest charting/audio update: browser-local stem analysis can add a generated
song from drums, bass, other, and vocals stems; hit effects now load from the
pose metadata and use the copied `*_01.wav` samples in `public/audio`. Easy is
now the default, limits charts to the two hip poses, spaces notes far apart,
uses a very forgiving hit window, and shows cues much sooner. Medium keeps all
four lanes but filters dense runs aggressively and uses generous timing so it is
playable for a hackathon demo.

Status: implemented. Scope is the rhythm game and browser-local chart generation.
The production build and focused tests pass. The latest UI uses React and customized shadcn controls,
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
  In Camera mode, make the Default pose once tracking is ready to begin the countdown.
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
| 1 | Left hand at left hip | Trained class: Left hand - left hip |
| 2 | Right hand at right hip | Trained class: Right hand - right hip |
| 3 | Left hand at chest/shoulder | Trained class: Left hand - chest/shoulder |
| 4 | Right hand at chest/shoulder | Trained class: Right hand - chest/shoulder |

The trained model also exposes `startStop` as a control gesture. It is not a
playable lane and must never be assigned by the beatmap generator. Left/right
mean the player's anatomical left/right; mirror preview and cue figures
consistently and confirm this during playtesting.

The current Teachable Machine / PoseNet classifier uses a short (60 ms time
constant) average of class scores. Enter at 70% confidence after about 100 ms of
confirmation; retain a confirmed pose down to 50%. Brief uncertain samples can
keep the visible lock for 150 ms without rearming the same pose. A different
confirmed pose rearms it; lost tracking alone does not. Reset clears all history.
Keep the existing mirrored model-class-to-lane mapping.

Both shoulders must be tracked. Each instrument cue additionally requires its
active elbow and wrist; a hip cue also requires that side's hip. Default needs
both arms, but no hips. Missing joints produce specific framing guidance in
practice and gameplay. Model joint names are anatomical; lane names follow the
existing mirrored screen directions.

In Camera mode, an unconsumed pose entry can wait for the next matching cue.
Prepare early and hold through the beat: it scores at or after the cue timestamp,
never at the early edge of the hit window. Only fresh accepted detections refresh
the mode's scoring grace (Easy 1.2 s, Medium 900 ms, Hard 420 ms); a retained
visual lock does not extend it. A different
confirmed pose cancels the pending entry. Each entry still consumes at most one
note. Keyboard timing is unchanged.

## Play loop and timing

1. Select a song and input mode, then press Play to open the game screen.
2. Load audio and, for Camera mode, the pose model and webcam. Show framing
   guidance; in Camera mode, begin the countdown on the Default pose
   once both arms are tracked.
3. Give a three-second countdown, then play. Show each note about 2.5 seconds
   before its target time so the player can prepare.
4. Camera entries wait for the next matching cue and score when its beat arrives
   while fresh detection or its mode-specific grace remains valid. Perfect earns
   100 points and Good earns 50. Perfect / Good windows are 600 / 1200 ms in
   Easy, 450 / 900 ms in Medium, and 200 / 420 ms in Hard. Keyboard events use
   the closest unjudged matching note, with these windows on either side of the
   beat. Camera entries prepared early wait until the beat.
   Consume one note, increment combo, flash its target ring, and play that pose's short
   hit sound. These are starting values to tune during playtesting.
5. A note later than the mode's Good window becomes Miss and resets combo. Unmatched poses
   do nothing; intermediate movements do not incur extra penalties.
6. Show results at the end. Retry resets playback, notes, pose latches, and score.

Use one audio clock for the backing track, note positions, and hit judging.
Calculate position from chart time minus current song time on every animation
frame; do not advance time by accumulating frame deltas. The full track plays
continuously, with quiet hit sounds layered on top.

Provide master volume and Pause / Resume / Stop / Restart / Back to songs. Lost tracking shows “Step into frame”
and disables new pose input; an already-matching pending entry retains its
mode-specific grace period. The song continues and overdue notes miss. Stop the
round when the tab becomes hidden. Returning to selection and finishing a track
release the camera.
Keys 1–4 provide a simple keyboard test mode through the same judging function;
ignore held-key repeats and typing in fields.

## Songs and maps

Ship two tracks of roughly 30–60 seconds with prepared charts. Use original or
freely usable bundled audio and retain required attribution. No music account or
Guitar Hero file import is needed. Players may also select a local audio file;
that file is decoded and analyzed entirely in the browser.

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

### Browser-local song generation

For the current implementation, the song-selection page accepts a manually
separated stem folder. Recognize four files by their filename suffixes:
`_drums`, `_bass`, `_other`, and `_vocals`. Decode the aligned stems in the
browser, mix only bass, other, and vocals for playback, and use the isolated
drums stem only for beatmap analysis. Triggered pose samples replace the omitted
drum layer instead of doubling it. Nothing is uploaded or persisted. Automated browser-side stem
separation remains a later enhancement.

Analyze the drums stem with four cascaded biquad configurations: kick/bass drum
uses a low-pass, snare a mid-band pass, hi-hat an upper high-pass, and crash a
high-mid band. Build one shared onset timeline, then classify each hit from its
low/mid/high energy balance. Distinguish crash from hi-hat with a 70-160 ms
high-frequency decay window that ends before the next possible eighth-note hit.
Require each candidate to have a meaningful band-to-full-spectrum energy ratio.

`POSSIBLE_GESTURES` in `poses.js` is the top-level source for every gesture, its gameplay
status, drum instrument, sample, and analysis filter. The required mapping is:

| Gesture | Instrument |
| --- | --- |
| Left hip | Snare |
| Right hip | Hi-hat |
| Left chest | Kick / bass drum |
| Right chest | Crash |
| Start/stop | Control only; no chart instrument |

An instrument onset maps directly to its configured gesture. Pose assignment is
not random, and the start/stop control must never appear as a chart note.

Estimate tempo with a whole-track BPM search scored against the shared onset
timeline, refine the winning BPM, then estimate phase for the requested grid.
Quantize every playable event before filtering. Easy uses quarter notes, medium eighth notes, and hard
sixteenth notes. Keep the original detected timestamp as `sourceTime` and include
the BPM, subdivision, high-precision step and phase, and each event's integer
`gridIndex` for tuning and exact long-track reconstruction. Do not invent
periodic fallback notes when detection is weak. Reject a track with a useful
message when fewer than four drum-like impacts are found.

Derive event spacing from the estimated grid rather than a fixed number of
seconds. This preserves eighth-note hi-hats at common tempos such as the roughly
110 BPM kick/hat/snare/hat pattern in the separated calibration track.

Validate pose IDs and keep events sorted. The decoded buffer, generated notes,
and derived waveform remain in tab memory; nothing is sent to a server or persisted.

## Small implementation

Use Vite, React with JavaScript, customized shadcn/ui, Tailwind CSS, Canvas 2D,
and Web Audio. Use the bundled Teachable Machine pose model with TensorFlow.js
for one-person camera classification. Keep its model, metadata, and weights local.

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
    browserBeatmap.js   browser-only instrument-onset chart generation
    beatmaps.js         generated-chart loading and validation
    poses.js            pose metadata and cue pictograms
    songs.js            song metadata and hand-authored charts
    style.css
  public/
    audio/              two original tracks
    models/             pretrained Teachable Machine pose model
    wasm/               retained local MediaPipe runtime assets
```

Use ordinary functions and a small state object. Leave `Backend/` unused.

## Implemented flow

1. The first page presents both songs, input choice, instructions, and Play.
2. Play mounts the game and loads audio and any camera resources. Camera mode
   waits for the Default pose; Keyboard mode starts its three-second countdown
   once loading finishes.
3. Pose entries or keys feed the same timing and scoring functions. Canvas
   animation uses the audio clock; React updates the surrounding controls.
4. Results show hits, misses, and best combo. Retry creates a fresh round;
   Back to songs and Stop release resources and return to selection.
5. Upload stem folder decodes four local separated files, rebuilds a drumless
   backing track, derives a waveform and drum-stem onset chart, adds it to the in-memory
   track list, and uses the same game screen and clock.

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
- A local four-file stem folder can be decoded and charted without Python, a
  backend, or a network upload.
- Generated timings are quantized to the declared beat grid and are never replaced
  by an arbitrary metronome fallback when detection is weak.
- Stop silences playback; leaving gameplay releases the camera; Retry starts clean.
- Camera/model/audio errors explain what happened and missing tracking is visible.
- Practice opens from the pose guide, recognizes all four poses, clears stale
  feedback when tracking is lost, and releases the camera when leaving. Returning
  to songs preserves the selected track and game input mode.
- The production build passes. Verify with a real webcam and audible playback
  on the demo laptop; keyboard-only checks are insufficient.

Keep the MVP here: no full dance recognition, finger tracking, custom training,
3D character, multiplayer, chart editor, server uploads, accounts, or backend.
Add none of these without a scope change.
