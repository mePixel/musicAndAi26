# Bodybeat

A small Guitar Hero-style game played with your body. Match four webcam poses
to flying notes, keep a combo, and play through two original short tracks plus
the supplied Minimal Sounds version of Gorillaz’s Feel Good Inc.
Keyboard and touch controls are available too.

## Run it

```sh
git lfs pull
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

## Upload a song

Choose **Upload song** on the song-selection page and select a local audio file.
The browser decodes it with Web Audio and generates pose timings through separate
bass, snare, hi-hat, and crash filters. Audio stays in the tab; there is no
upload, backend, or Python step. Detected instrument onsets are quantized to a
song-derived beat grid before they become playable notes.

## Play

1. Choose **First Groove**, **Disco Circuit**, or upload a local song on the
   song-selection page. Choose Camera or Keyboard.
2. Press **Play** to open the game. In Camera mode, allow camera access and step
   back until your shoulders and hands fit. Tracking starts the countdown.
3. Make the matching pose when its note reaches the target. Perfect earns 100
   points and Good earns 50. Misses reset the combo, but the track keeps playing.

The preview is mirrored: your anatomical left is the left lane. Enter each pose
deliberately; holding it doesn't score repeatedly. Keep your wrists visible.
Tracking loss shows a framing prompt while the track continues.

For a quick try without a webcam, choose **Keyboard** and press **1–4**, or tap
the lane controls. **Escape**, **Stop**, and **Back to songs** end the round and
return to selection. **Restart** starts with a fresh score and countdown.
Switching away from the tab stops a round. The camera is released at the end of
a track and whenever you leave the game.

Camera access needs HTTPS or localhost and a browser with WebAssembly/WebGL
support. Chrome or Edge on a laptop is the intended demo setup. Camera frames
are processed locally; there are no uploads, accounts, or backend calls.

## Small codebase

- `Frontend/src/App.jsx`: song selection, input choice, instructions, and volume.
- `Frontend/src/Game.jsx`: game screen, countdown, input, and round lifecycle.
- `Frontend/src/components/ui/`: customized shadcn components from its official CLI.
- `Frontend/src/pose.js`: camera, trained pose classification, and stable-entry latch.
- `Frontend/src/game.js`: hit windows, score, misses, and canvas note highway.
- `Frontend/src/audio.js`: audio clock, music playback, local decoding, and hit sounds.
- `Frontend/src/browserBeatmap.js`: browser-only instrument filtering and chart generation.
- `Frontend/src/beatmaps.js`: generated-chart loading and validation.
- `Frontend/src/poses.js` and `songs.js`: pose icons and bundled track metadata.

The UI uses React with JavaScript, shadcn/ui (Base UI primitives), Tailwind CSS,
and Vite. The game stays in small Canvas 2D, Web Audio, and local pose-model modules.
`Backend/` is unused; this version is the rhythm game plus browser-local song generation.

The initial windows are ±150 ms for Perfect and ±300 ms for Good. A pose must
settle for 100 ms before it triggers. These values can be tuned in `game.js` and
`pose.js` after trying the demo camera and speakers.

## Assets

First Groove and Disco Circuit are original synthesized arrangements created for this project,
without sampled recordings. `Frontend/scripts/make-tracks.py` reproduces them
with Python, NumPy, and ffmpeg; those tools are only needed to regenerate audio.
Regular installation and playback use the existing MP3 files.

Feel Good Inc. is also built in. Its backing WAV combines the supplied bass,
other, and vocals stems, with the drums removed. The chart in
`Frontend/src/feel-good-inc.json` was prepared from the drums stem using the
same `generateBrowserBeatmap` function and Medium settings as manual stem
uploads. All three game difficulty modes work with it. No upload or analysis is
needed to play this bundled song. WAV assets use Git LFS.

- [MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker):
  Google pretrained Lite pose model and Tasks Vision runtime.
- [Geist](https://github.com/vercel/geist-font): bundled locally through
  `@fontsource-variable/geist`, under the SIL Open Font License.

See [PLAN.md](PLAN.md) for the game design and [AGENTS.md](AGENTS.md) for the
hackathon scope and agent instructions.
