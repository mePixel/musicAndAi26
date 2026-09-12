# Bodybeat

A small Guitar Hero-style game played with your body. Match four webcam poses
to flying notes, keep a combo, and play through two original short tracks.
Keyboard and touch controls are available too.

## Run it

```sh
cd Frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).
Use a current Node.js release. The install step copies MediaPipe's matching
WASM files into `public/wasm`; the pose model, font, and music are already bundled.

```sh
npm test        # focused pose and rhythm-judging tests, using Node's test runner
npm run build  # static site in Frontend/dist
npm run preview
```

## Play

1. Enable the camera and grant camera permission. Step back far enough for both
   arms to fit. Practice left hand up, right hand up, both hands up, and arms out.
2. Choose **First Groove** (96 BPM, 40 seconds) or **Disco Circuit** (120 BPM,
   36 seconds), then press **Let's play**.
3. Make the matching pose when its note reaches the target. Perfect earns 100
   points and Good earns 50. Misses reset the combo, but the track keeps playing.

The preview is mirrored: your anatomical left is the left lane. Enter each pose
deliberately; holding it doesn't score repeatedly. Keep your wrists visible.
Tracking loss shows a framing prompt while the track continues.

For a quick try without a webcam, choose **Keyboard** and press **1–4**, or tap
the lane controls. **Escape** or **Stop** ends the round. **Restart track** starts
with a fresh score and countdown. Switching away from the tab stops a round.

Camera access needs HTTPS or localhost and a browser with WebAssembly/WebGL
support. Chrome or Edge on a laptop is the intended demo setup. Camera frames
are processed locally; there are no uploads, accounts, or backend calls.

## Small codebase

- `Frontend/src/main.js`: interface, input, countdown, and round lifecycle.
- `Frontend/src/pose.js`: camera, MediaPipe, four-pose rules, and stable-entry latch.
- `Frontend/src/game.js`: hit windows, score, misses, and canvas note highway.
- `Frontend/src/audio.js`: audio clock, music playback, and short hit sounds.
- `Frontend/src/poses.js` and `songs.js`: pose icons and hand-authored charts.

The stack is vanilla JavaScript, CSS, Canvas 2D, Web Audio, Vite, and one runtime
dependency: MediaPipe Tasks Vision. `Backend/` is unused. No MIDI controller is
included; this version is just the rhythm game.

The initial windows are ±150 ms for Perfect and ±300 ms for Good. A pose must
settle for 100 ms before it triggers. These values can be tuned in `game.js` and
`pose.js` after trying the demo camera and speakers.

## Assets

Both tracks are original synthesized arrangements created for this project,
without sampled recordings. `Frontend/scripts/make-tracks.py` reproduces them
with Python, NumPy, and ffmpeg; those tools are only needed to regenerate audio.
Regular installation and playback use the existing MP3 files.

- [MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker):
  Google pretrained Lite pose model and Tasks Vision runtime.
- [Space Grotesk](https://github.com/floriankarsten/space-grotesk):
  bundled font under the SIL Open Font License, included in `Frontend/public/FONT-LICENSE.txt`.

See [PLAN.md](PLAN.md) for the game design and [AGENTS.md](AGENTS.md) for the
hackathon scope and agent instructions.
