# Body Beat — hackathon website plan

Status: proposed pivot; no application has been built yet.

## The game

A Guitar Hero-style rhythm game controlled by your body. Pick a song, stand in
front of the webcam, and match incoming pose cues as they reach the hit line.
A hit triggers a short sound, a flash, and points. The backing song keeps
playing through misses.

A song map now means a beat chart: a timeline connecting moments in a track to
poses. Each song has its own chart. This replaces the previous sound library,
button grid, and editable pad maps.

Working assumptions: one player, a laptop webcam, upper-body movements, and
short bundled tracks. Hand positions mean where the hands and arms are relative
to the body; individual finger gestures are outside this MVP.

## What the player sees

- A four-lane note highway. Notes emerge near the top, grow as they fly toward
  the player, and cross a fixed hit line near the bottom.
- Each lane represents a pose. Notes and targets show a simple human pose
  pictogram, label, and distinct color; color alone is not the cue.
- A mirrored webcam panel shows the human player with a light skeleton overlay,
  the detected pose, and a tracking indicator.
- Score, combo, song progress, and brief Perfect / Good / Miss feedback.
- Before play: song selection, Enable camera, pose practice, and Start.
  After play: hits, misses, best combo, and Retry / Choose song.

Use a dark stage, bright readable cues, and small hit bursts. Draw the highway
and flying notes on a 2D canvas with simple perspective math. The visible human
is the webcam player; cue figures can be small SVGs.

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
this during practice.

A pose must remain stable for about 100 ms before it counts. Emit one event
on entry using the song time when the pose is confirmed. Holding it emits no
more events. Confidently recognizing both arms down or another pose rearms it;
an uncertain or dropped frame does not. Avoid jitter-induced hits.

## Play loop and timing

1. Select a song and load its audio, chart, pose model, and runtime assets.
2. Enable the camera. Show framing guidance and practice all four poses with
   immediate sounds and lane highlights. Allow Start when tracking is ready.
3. Give a three-second countdown, then play. Show each note about 2.5 seconds
   before its target time so the player can prepare.
4. Compare each pose-entry event with the closest unjudged note for that pose.
   Within ±150 ms is Perfect (100 points); within ±300 ms is Good (50 points).
   Consume one note, increment combo, flash its lane, and play that pose's short
   hit sound. These are starting values to tune during playtesting.
5. A note more than 300 ms late becomes Miss and resets combo. Unmatched poses
   do nothing; intermediate movements do not incur extra penalties.
6. Show results at the end. Retry resets playback, notes, pose latches, and score.

Use one audio clock for the backing track, note positions, and hit judging.
Calculate position from chart time minus current song time on every animation
frame; do not advance time by accumulating frame deltas. The full track plays
continuously, with quiet hit sounds layered on top.

Provide master volume and Stop / Restart. Lost tracking shows “Step into frame”
and disables pose input; the song continues and overdue notes miss. Stop the
round when the tab becomes hidden. Returning to selection releases the camera.
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

Use Vite, vanilla JavaScript, CSS, Canvas 2D, and Web Audio. Add only
`@mediapipe/tasks-vision` for tracking, using the pretrained Pose Landmarker Lite
model in video mode for one person. Bundle the model and matching WASM assets.
Google's [Pose Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)
documents the package, model loading, video inference, and body landmarks.

Request video only and process it locally, without recording or uploading frames.
Camera access requires browser permission and HTTPS or localhost; see
[MDN's camera API documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
Request access through Enable camera and show a useful message if permission,
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
    main.js             screen controls and round lifecycle
    pose.js             webcam, landmarks, four-pose classification
    game.js             audio clock, note canvas, hit judging, score
    songs.js            song metadata and hand-authored charts
    style.css
  public/
    audio/              tracks and short hit sounds
    models/             pretrained pose model
    wasm/               matching MediaPipe runtime assets
```

Use ordinary functions and a small state object. Leave `Backend/` unused.

## Build order

1. Prove the input: webcam preview, detect one raised hand, trigger one sound.
2. Prove the game: one song, flying notes, audio timing, keyboard hit judging.
3. Connect pose events to judging; add all four poses and practice feedback.
   Tune the timing and thresholds with a human playing.
4. Add the second chart, selection, results, and load/error states. Finish
   styling and document the actual run commands.

## Done means

- A player can enable the camera, practice each pose, choose a song, and finish it.
- Left/right cues match the mirrored presentation and all four poses are usable.
- Correct poses near the beat trigger sounds, visible hits, points, and combo.
- Wrong poses and late inputs cannot score; each note is judged at most once.
- Holding a pose or briefly losing tracking cannot generate repeated hits.
- Notes and audio stay aligned through a full track and after Restart.
- Both songs have playable charts with enough time to change poses.
- Stop silences playback; leaving gameplay releases the camera; Retry starts clean.
- Camera/model/audio errors explain what happened and missing tracking is visible.
- The production build passes. Verify with a real webcam and audible playback
  on the demo laptop; keyboard-only checks are insufficient.

Keep the MVP here: no full dance recognition, finger tracking, custom training,
3D character, multiplayer, chart editor, uploads, automatic song mapping,
accounts, or backend. Add none of these without a scope change.
