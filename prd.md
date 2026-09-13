# Product Requirements Document

## Music-to-Pose Beatmap Generation Pipeline

### 1. Overview

Build a pipeline that takes an audio file as input and automatically generates a time-synchronized beatmap for a rhythm game.

The game is conceptually similar to Guitar Hero, except that notes correspond to **body poses/gestures** rather than instrument buttons.

The pipeline must:

1. Load a song.
2. Analyze its rhythmic structure.
3. Detect musically relevant timestamps.
4. Select which timestamps should become playable events.
5. Assign poses/gestures to those events.
6. Export the resulting beatmap in a standardized JSON format.

The number and types of available poses must **not be hardcoded into the beat-generation algorithm**. They must come from one globally defined configuration/set so that changing the available poses automatically changes beatmap generation.

This PRD covers only the **beatmap-generation pipeline**.

It does NOT cover:

* webcam input
* pose recognition
* scoring
* UI
* note rendering
* Spotify playback
* multiplayer
* player profiles

---

# 2. Goal

Given:

```text
song.mp3
```

and a globally defined pose set such as:

```python
AVAILABLE_POSES = [
    "LEFT_HIT",
    "RIGHT_HIT",
    "HANDS_UP",
    "CLAP",
]
```

the system should automatically produce:

```json
{
  "metadata": {
    "duration": 213.4,
    "bpm": 128.0,
    "poseCount": 4
  },
  "events": [
    {
      "time": 1.406,
      "pose": "LEFT_HIT"
    },
    {
      "time": 1.875,
      "pose": "RIGHT_HIT"
    },
    {
      "time": 2.344,
      "pose": "CLAP"
    }
  ]
}
```

The timestamps should be derived from the music.

Pose assignment can initially be procedural/pseudo-random, but must obey basic rules to produce playable sequences.

---

# 3. Core Design Principle

The system must clearly separate:

```text
MUSIC ANALYSIS
      ↓
Musical Events
      ↓
EVENT SELECTION
      ↓
Playable Events
      ↓
POSE ASSIGNMENT
      ↓
Beatmap
```

These components must not be tightly coupled.

For example, the music-analysis module must not know that a `"CLAP"` pose exists.

Likewise, the pose generator should not need to understand how BPM detection works.

---

# 4. Proposed Technology

Initial implementation:

* Python 3.11+
* librosa
* NumPy
* SoundFile or another librosa-compatible audio backend

Optional later dependencies:

* scipy
* madmom
* Essentia
* Demucs

Do **not** introduce source separation or ML models for the first implementation unless required.

The MVP should first establish whether conventional audio analysis produces sufficiently good rhythm maps.

---

# 5. Global Pose Configuration

There must be exactly one canonical source defining the poses available to beatmap generation.

Example:

```python
AVAILABLE_POSES = [
    "LEFT_HIT",
    "RIGHT_HIT",
    "HANDS_UP",
    "CLAP",
]
```

The beatmap generator must derive:

```python
pose_count = len(AVAILABLE_POSES)
```

No code such as:

```python
random.randint(0, 3)
```

or:

```python
if pose_id < 4:
```

should exist.

Instead:

```python
random.choice(AVAILABLE_POSES)
```

or equivalent configuration-driven logic must be used.

Adding:

```python
AVAILABLE_POSES.append("LEFT_SWIPE")
```

must therefore require **no modification to the beatmap generation algorithm**.

---

# 6. Pose Data Model

Prefer a structured definition over plain strings so that additional metadata can be introduced later.

Example:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Pose:
    id: str
    difficulty: int = 1
    weight: float = 1.0


AVAILABLE_POSES = [
    Pose("LEFT_HIT"),
    Pose("RIGHT_HIT"),
    Pose("HANDS_UP"),
    Pose("CLAP"),
]
```

This allows future configuration such as:

```python
Pose(
    id="CROSS_ARMS",
    difficulty=3,
    weight=0.5,
)
```

without changing the fundamental architecture.

---

# 7. Audio Input

The generator must initially support at least:

```text
.mp3
.wav
```

Function/API example:

```python
generate_beatmap(
    audio_path="song.mp3"
)
```

The pipeline should load:

```python
audio
sample_rate
duration
```

Audio should preferably be converted to mono for analysis.

---

# 8. Stage 1 — Audio Analysis

Analyze the input song and extract:

* duration
* estimated BPM/tempo
* beat timestamps
* onset timestamps
* onset strength
* RMS/energy

Example intermediate representation:

```python
AudioAnalysis(
    duration=213.4,
    bpm=128.0,
    beats=[0.47, 0.94, 1.41, ...],
    onsets=[0.23, 0.47, 0.71, ...],
    onset_strength=[...],
    energy=[...],
)
```

Use librosa initially.

Possible functions include:

```python
librosa.beat.beat_track()
librosa.onset.onset_detect()
librosa.onset.onset_strength()
librosa.feature.rms()
```

The exact implementation may change, but downstream components must receive a stable representation.

---

# 9. Stage 2 — Candidate Event Generation

Beat timestamps alone may produce boring patterns.

Onset timestamps alone may produce too many/noisy events.

The pipeline should therefore create a combined set of candidate musical events from:

```text
beats
+
strong onsets
```

Each candidate should contain information such as:

```python
MusicalEvent(
    time=12.482,
    strength=0.82,
    is_beat=True,
    is_onset=True,
)
```

Possible structure:

```python
@dataclass
class MusicalEvent:
    time: float
    strength: float
    is_beat: bool
    is_onset: bool
```

Events occurring very close together should be merged.

Example:

```text
beat:  12.480
onset: 12.493
```

should become one event around:

```text
12.48
```

rather than two separate player actions.

The merge tolerance should be configurable.

Example:

```python
EVENT_MERGE_WINDOW_MS = 50
```

---

# 10. Stage 3 — Event Filtering

Not every detected event should become a gameplay action.

The system should filter candidate events based on:

* event strength
* minimum time between events
* song tempo
* configured difficulty

For the first implementation, define:

```python
MIN_EVENT_INTERVAL_MS = 250
```

or a tempo-relative equivalent.

The generator must never create obviously impossible sequences such as:

```text
1.000
1.030
1.080
1.120
```

for full-body gestures.

---

# 11. Difficulty

The architecture should support:

```python
EASY
MEDIUM
HARD
```

even if the initial implementation uses only one difficulty.

Difficulty primarily controls event density.

Conceptually:

```text
EASY
↓
major beats / strongest events

MEDIUM
↓
beats + selected onsets

HARD
↓
beats + strong onsets + subdivisions
```

Example configuration:

```python
DIFFICULTIES = {
    "easy": {
        "density": 0.35,
        "min_interval_ms": 500,
    },
    "medium": {
        "density": 0.60,
        "min_interval_ms": 300,
    },
    "hard": {
        "density": 0.90,
        "min_interval_ms": 180,
    },
}
```

Do not hardcode these values throughout the application.

---

# 12. Stage 4 — Pose Assignment

Once playable timestamps have been selected, assign a pose to every event.

Input:

```text
1.20
1.72
2.18
2.65
3.10
```

Possible output:

```text
1.20 LEFT_HIT
1.72 RIGHT_HIT
2.18 CLAP
2.65 LEFT_HIT
3.10 HANDS_UP
```

The available poses must always come from:

```python
AVAILABLE_POSES
```

---

# 13. Pose Assignment Rules

Pose assignment should be pseudo-random but constrained.

The MVP must support the following rules.

### Avoid excessive repetition

Bad:

```text
CLAP
CLAP
CLAP
CLAP
CLAP
```

Acceptable:

```text
LEFT_HIT
RIGHT_HIT
CLAP
LEFT_HIT
HANDS_UP
```

Default:

```python
MAX_CONSECUTIVE_SAME_POSE = 2
```

### Avoid impossible transitions

The architecture should support defining pose-transition restrictions.

Example:

```python
FORBIDDEN_TRANSITIONS = {
    "HANDS_UP": {"HANDS_DOWN"},
}
```

This can initially be empty.

The important requirement is that pose assignment can later incorporate physical constraints without rewriting the audio-analysis pipeline.

### Weighted randomness

Every pose should eventually support a probability weight.

Example:

```python
Pose("LEFT_HIT", weight=1.0)
Pose("RIGHT_HIT", weight=1.0)
Pose("HANDS_UP", weight=0.6)
Pose("CLAP", weight=0.8)
```

The generator should therefore prefer common/simple gestures while still occasionally selecting more interesting gestures.

---

# 14. Deterministic Generation

Generation must optionally support a random seed.

Example:

```python
generate_beatmap(
    audio_path="song.mp3",
    seed=42,
)
```

Running this twice:

```python
seed=42
```

must generate the same pose sequence for the same musical events/configuration.

This is important for debugging and reproducible gameplay.

---

# 15. Beatmap Output Format

Use JSON.

Proposed schema:

```json
{
  "version": 1,
  "metadata": {
    "title": "Unknown",
    "duration": 213.42,
    "bpm": 128.0,
    "difficulty": "medium",
    "seed": 42,
    "poseCount": 4
  },
  "poses": [
    "LEFT_HIT",
    "RIGHT_HIT",
    "HANDS_UP",
    "CLAP"
  ],
  "events": [
    {
      "id": 0,
      "time": 1.406,
      "pose": "LEFT_HIT",
      "strength": 0.87
    },
    {
      "id": 1,
      "time": 1.875,
      "pose": "RIGHT_HIT",
      "strength": 0.74
    }
  ]
}
```

All timestamps should be expressed in **seconds from the beginning of the audio**.

Use floating-point timestamps rather than formatted strings.

---

# 16. Suggested Project Structure

```text
beatmap_generator/
│
├── config/
│   ├── poses.py
│   └── difficulty.py
│
├── audio/
│   ├── loader.py
│   └── analyzer.py
│
├── generation/
│   ├── candidates.py
│   ├── event_filter.py
│   ├── pose_assignment.py
│   └── generator.py
│
├── models/
│   ├── audio_analysis.py
│   ├── musical_event.py
│   ├── pose.py
│   └── beatmap.py
│
├── export/
│   └── json_exporter.py
│
├── tests/
│
└── main.py
```

---

# 17. Public API

The primary interface should be simple.

Example:

```python
beatmap = generate_beatmap(
    audio_path="songs/test.mp3",
    difficulty="medium",
    seed=42,
)
```

Optional export:

```python
beatmap.save("output/test.beatmap.json")
```

Alternatively:

```python
generate_beatmap(
    audio_path="songs/test.mp3",
    output_path="output/test.json",
    difficulty="medium",
    seed=42,
)
```

Keep the analysis and export functionality independently callable for debugging.

---

# 18. CLI

Provide a minimal CLI for development.

Example:

```bash
python -m beatmap_generator \
    song.mp3 \
    --difficulty medium \
    --seed 42 \
    --output beatmap.json
```

Expected output:

```text
Analyzing song.mp3...

Duration:        03:32
Detected BPM:    128.1
Beats detected:  452
Onsets detected: 817

Generating medium beatmap...
Playable events: 326
Available poses:  4

Beatmap written to beatmap.json
```

---

# 19. Debug Visualization

This is highly recommended for the hackathon.

Provide a development/debug function that visualizes:

```text
audio waveform
+
detected beats
+
detected onsets
+
selected gameplay events
```

For example:

```text
waveform ─╱╲──╱╲╱╲────╱╲──╱╲────

beats     |   |   |   |   |   |

onsets      | ||    |   || | |

selected    X       X   X    X
```

This will make tuning the generator significantly easier than judging generated JSON manually.

---

# 20. Validation

The generator must validate its output before export.

Check:

```text
All events have timestamps >= 0.
All events occur before song duration.
Events are chronologically sorted.
Every pose exists in AVAILABLE_POSES.
Minimum event interval is respected.
No prohibited pose transitions occur.
Pose repetition limit is respected.
No duplicate events exist.
```

Invalid beatmaps should raise a descriptive error during development.

---

# 21. Testing Requirements

Unit tests should cover at least:

### Pose configuration

Adding/removing poses automatically changes the possible generated poses.

### Deterministic generation

```text
same song/events + same seed
→ same pose sequence
```

### Repetition protection

Generated charts must respect:

```python
MAX_CONSECUTIVE_SAME_POSE
```

### Event spacing

No generated events violate the configured minimum interval.

### Valid pose references

Every event must reference a currently configured pose.

### Chronological ordering

```python
events[n].time <= events[n + 1].time
```

### Empty/invalid audio

The system should fail gracefully with useful errors.

---

# 22. Performance Requirements

This is a hackathon proof of concept, so optimization is secondary.

However:

* beatmap generation should not require real-time processing
* analysis should work on normal consumer laptops
* a typical 3–5 minute song should ideally be processed within seconds rather than minutes
* avoid heavyweight ML models for the MVP

Caching analysis results is optional.

---

# 23. MVP Acceptance Criteria

The MVP is complete when the following workflow works:

```bash
python -m beatmap_generator song.mp3 --difficulty medium --seed 42
```

and produces a valid JSON beatmap.

For a normal song, the output must contain:

```text
✓ detected BPM
✓ beat timestamps
✓ onset information
✓ filtered gameplay timestamps
✓ pose assigned to every event
✓ chronologically sorted events
✓ JSON output
```

Given:

```python
AVAILABLE_POSES = [
    "LEFT_HIT",
    "RIGHT_HIT",
    "CLAP",
    "HANDS_UP",
]
```

only those four poses may occur.

Changing this to:

```python
AVAILABLE_POSES = [
    "LEFT_HIT",
    "RIGHT_HIT",
    "CLAP",
    "HANDS_UP",
    "LEFT_SWIPE",
    "RIGHT_SWIPE",
]
```

must automatically allow all six poses **without modifying the beat-generation algorithm**.

---

# 24. Implementation Priority

Implement in this order:

**Phase 1 — Audio analysis**

```text
audio → BPM + beats + onsets
```

**Phase 2 — Musical events**

```text
beats + onsets → normalized candidate events
```

**Phase 3 — Gameplay filtering**

```text
candidate events → playable timestamps
```

**Phase 4 — Pose assignment**

```text
timestamps + AVAILABLE_POSES → generated pattern
```

**Phase 5 — Export**

```text
generated pattern → beatmap.json
```

**Phase 6 — Debugging**

```text
waveform + event visualization
```

Do not implement webcam recognition, game rendering, Spotify integration, or scoring until this pipeline works reliably.

---

# 25. Future Extensions

The architecture should make the following possible without redesigning the entire pipeline:

* Spotify track association
* automatic song section detection
* chorus/verse-aware difficulty
* Demucs stem separation
* drum-specific onset detection
* ML-generated charts
* AI-based difficulty balancing
* gesture difficulty metadata
* gesture transition costs
* simultaneous gestures
* hold gestures
* swipe/directional gestures
* beat subdivisions
* adaptive difficulty
* manually edited beatmaps
* beatmap caching
* multiple generated charts per song

The immediate objective, however, is:

> **Given an audio file and a globally configured set of poses, automatically generate a reproducible, musically synchronized and playable sequence of pose events.**
