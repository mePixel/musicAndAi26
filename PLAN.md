# Sound maps — hackathon website plan

Status: proposed MVP; no application has been built yet.

## The idea

A browser soundboard: choose a sound map, then click, tap, or press number keys
to play its sounds. Switch maps to reuse the same buttons for another collection.

Working assumption: a map is a named set of button assignments. The shared sound
library can be larger than any map. A sound can appear in several maps or remain
unassigned everywhere. Removing an assignment never removes the sound itself.

## One screen

- **Top bar:** map selector, New map, Rename, and Edit map.
- **Main area:** nine large pads in a 3 × 3 grid, numbered 1–9 from left to right.
  Each shows its sound name and a brief visual response when triggered.
- **Sound library:** all bundled sounds, each with a Preview button. Indicate
  which are assigned in the active map and which are available to assign.
- **Playback controls:** master volume and Stop all.

On narrow screens, put the library below the pads. Use readable labels, visible
keyboard focus, and real buttons. Keep styling to a clear pad grid, strong
contrast, and one accent color; no decorative animation system.

## Interactions

1. Start with three editable presets, such as Drums, Percussion, and Effects,
   backed by a small bundled library of roughly 12 short samples. Leave empty
   pads in at least one preset and some library sounds unassigned in every map.
2. In normal mode, a pad or its number key plays its assigned sample once.
   Different hits can overlap, including repeated hits on the same pad.
   Empty pads do nothing and display “Unassigned.”
3. Enable Edit map, select a pad, then choose a sound from the library to assign
   or replace it. Clear removes that pad's assignment. Preview only auditions
   the sound. Number shortcuts are inactive in edit mode and while typing in a
   field; holding a key does not repeatedly trigger audio.
4. New map creates a named map with nine empty pads. Rename edits its label.
   Changes affect only that map and save automatically in this browser.
5. Switching maps stops current playback and replaces all nine assignments.
   Stop all stops pad playback and library previews. Volume applies to both.
6. Reload restores maps, the active map, and volume from local storage. If saving
   is unavailable, keep the current session usable and show a short message.

## Small implementation

Use Vite's vanilla JavaScript setup, ordinary CSS, and native Web Audio in
`Frontend/`. Vite supplies development and production build commands; keep its
default configuration. See the [Vite guide](https://vite.dev/guide/).
Leave the existing `Backend/` scaffold alone.

```text
Frontend/
  index.html            page structure
  package.json          dev, build, preview scripts; Vite dev dependency
  src/
    main.js             UI, keyboard events, map edits, local storage
    audio.js            sample loading, play, stop all, master volume
    data.js             sound catalog and preset maps
    style.css           layout and interaction states
  public/sounds/        small bundled audio files
```

Keep one sound catalog and one saved state object. A map needs no separate
collection table: its nonempty slots define its collection.

```js
const sounds = [
  { id: 'kick', name: 'Kick', url: '/sounds/kick.wav' },
  { id: 'clap', name: 'Clap', url: '/sounds/clap.wav' },
];

const state = {
  activeMapId: 'drums',
  volume: 0.7,
  maps: [
    {
      id: 'drums',
      name: 'Drums',
      slots: ['kick', 'clap', null, null, null, null, null, null, null],
    },
  ],
};
```

Pad positions and number keys are fixed; slot values are sound IDs or `null`.
Save this state as JSON under one local-storage key. Audio buffers, currently
playing sources, and temporary UI selections stay in memory.

Use one audio context and one master gain node. Create or resume the context
from a user interaction; decode the short samples into reusable buffers and
show loading or unavailable states until each sample can play. These choices
follow [MDN's Web Audio guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
Create a fresh source for each hit and track playing sources for Stop all.
Avoid delayed playback from a previous map when loading completes.

## Build order

1. Make one bundled sample play from one button in the browser.
2. Add the nine pads, keyboard input, preset map switching, volume, and Stop all.
3. Add library previews, editing assignments, new/renamed maps, and local saving.
4. Style the screen, check the demo flow, and document the actual run commands.

## Done means

- A teammate can install dependencies and run the app with the README commands.
- Each preset plays real audio; the same pad plays different sounds across maps.
- At least one sound remains in the library without being assigned to a pad.
- Preview, assign, replace, and clear work; editing one map leaves others intact.
- New and renamed maps and their assignments survive a reload.
- Empty pads stay silent; typing and held keys do not cause unintended playback.
- Rapid hits overlap; Stop all, volume, and stopping on map switch work audibly.
- A failed sample shows a useful state while other samples remain playable.
- The layout works on a laptop and a narrow viewport, and the build passes.

## Scope boundary

The MVP uses bundled samples and local saving. Skip uploads, recording, AI sound
generation, looping, sequencing, BPM sync, effects, waveforms, drag-and-drop,
accounts, sharing, and server storage. Add none of these unless the user changes
the scope. Do not build hooks or placeholder abstractions for them.
