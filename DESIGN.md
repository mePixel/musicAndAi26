---
name: Bodybeat
description: A playful webcam rhythm console that invites you to move.
colors:
  background: "#dde1df"
  foreground: "#222923"
  card: "#f7f8f4"
  card-foreground: "#222923"
  popover: "#f7f8f4"
  popover-foreground: "#222923"
  primary: "#c34626"
  primary-foreground: "#ffffff"
  secondary: "#e0e4e0"
  secondary-foreground: "#222923"
  muted: "#d4d9d4"
  muted-foreground: "#59635b"
  accent: "#f7f8f4"
  accent-foreground: "#222923"
  destructive: "#b12e23"
  border: "#b9c0b9"
  input: "#a4ada4"
  ring: "#c34626"
  stage: "#18221e"
  panel: "#edf0ea"
  display: "#202d27"
  display-text: "#e4ede1"
  display-muted: "#b2c3b6"
  display-line: "#4c6053"
  waveform: "#c9d7b7"
  pose-left-hip: "#f5d28b"
  pose-right-hip: "#b8d6f4"
  pose-left-chest: "#f3b4bc"
  pose-right-chest: "#a2d4ce"
typography:
  headline:
    fontFamily: "Geist Variable, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(40px, 5.5vw, 80px)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-.04em"
  body:
    fontFamily: "Geist Variable, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    lineHeight: 1.5
  track-title:
    fontSize: "19px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-.025em"
  readout:
    fontFamily: "ui-monospace, monospace"
    fontSize: "25px"
rounded:
  control: ".3rem"
  dialog: "calc(.3rem + 2px)"
  sampler: "14px"
  display: "6px"
  pose-pad: "5px"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  large: "24px"
  sampler: "26px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  sampler-panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.sampler}"
    padding: "26px"
  track-display:
    backgroundColor: "{colors.display}"
    textColor: "{colors.display-text}"
    rounded: "{rounded.display}"
    padding: "22px 24px 18px"
---

# Design System: Bodybeat

## Overview

**Creative North Star: "The Rhythm Console"**

Bodybeat should feel playful and exciting: a rhythm console that invites the player to get up and move. This is the user-confirmed creative intent, paired with the established silver sampler, orange transport controls, and dark display.

The implementation currently expresses that identity through compact controls, softly lifted panels, pastel pose cues, and readable instrument-style numbers. The main screen now amplifies that identity with a larger headline, stronger waveform presence, full-color pose pads, and one staggered entrance across the four poses.

**Key Characteristics:**
- Silver console surfaces with burnt-orange action accents.
- Dark, recessed waveform and gameplay displays.
- Pastel pose colors paired with figures and text.
- Compact Geist typography with monospaced timing readouts.

This is a source-code snapshot of the current interface, documented on 2026-09-12.
The normative values above come from [the stylesheet](Frontend/src/style.css),
[shadcn controls](Frontend/src/components/ui/), and [pose metadata](Frontend/src/poses.js).
The main-screen bolder pass was inspected in the in-app browser at desktop and phone sizes.

## Colors

### Primary

Burnt orange (`primary`) gives Play, selected track numbers, the volume range,
and focus treatment their shared action identity. White `primary-foreground`
provides the button label contrast. Error red (`destructive`) remains semantic.

### Neutral

Silver-grey `background`, pale silver `panel`, and warm off-white `card` and
`popover` form the light console. Deep charcoal-green `foreground` anchors
labels; sage-grey `muted-foreground` supports metadata. `border` and `input`
distinguish dividers and interactive outlines.

The green-black `display` is recessed within the console. `stage` provides the
related darker gameplay field; `display-text`, `display-muted`, and
`display-line` support legible content on these dark surfaces. The waveform
uses a pale sage signal color.

### Pose cues

The four role-specific accents are honey (left hip), powder blue (right hip),
rose (left chest), and seafoam (right chest). These describe the existing
colors, rather than introducing a new palette. Song-page pose pads and practice highlights use the full pose color.

## Typography

Geist Variable is the shared heading and body family, with system sans-serif
fallbacks. The interface uses compact, moderately heavy headings and quiet
metadata; there is no separate decorative display face.

Song-page track titles are 24px (20px below 760px); pose figures are 80px
(64px below 760px). The frontmatter records the page headline, base track title, body, and BPM
readout. The wordmark uses 27px / 750 with -.04em tracking; the display title
uses 27px / 550. Labels generally range from 11px to 14px. Timing and keyboard
hints use monospace; numeric metadata uses tabular numerals. Gameplay reserves
80px for the countdown and 48px for the result score.

## Layout

The application fills at least the viewport height. Header and footer content
cap at 1200px; the song page caps at 1136px with 32px desktop side gutters.
The sampler pairs a track list with a wider display (0.8fr / 1.4fr, 28px gap),
then a divided transport row. Four pose pads sit below. These are observations
of the existing main screen, not a required composition for its replacement.

At 1050px the sampler padding and gaps tighten. At 760px the header and gutters
shrink, pose pads become two columns, and gameplay becomes one column.
The 641–760px range deliberately retains a two-column sampler and horizontal
transport. At 640px and below, the sampler stacks and the chart lanes hide;
the waveform remains. At 390px, padding and labels tighten again.

Gameplay caps at 1280px and pairs its flexible highway with a 260px camera
panel on desktop. Practice uses a full-viewport, uncropped mirrored camera
with overlaid controls and pose feedback; short-landscape rules reduce its
chrome. Preserve these surface-specific distinctions.

## Elevation & Depth

Depth is structural: the pale sampler is lifted while its dark display is
recessed. Most other grouping relies on borders and tonal changes.

- Sampler: `0 12px 32px #17221b16, inset 0 1px 0 #ffffff`.
- Display: `inset 0 2px 5px #0005`.
- Primary buttons use the existing small Tailwind shadow, removed while pressed.
- Dialogs use a fine ring with a lightly dimmed, blurred backdrop.

## Shapes

Controls share the compact base radius. The sampler has the broadest corners,
while displays and pose pads use tighter corners. One-pixel borders define
controls and separators. Volume tracks and thumbs are rounded; the rest of
the interface primarily uses rectangular instrument-like forms.

## Components

### Buttons and navigation

Orange primary buttons provide the main action; outlined and ghost buttons
support instructions and navigation. Standard buttons are 40px high, the main-screen
Play button is 64px, and small buttons are 28px. A 3px translucent orange focus
ring and border identify keyboard focus. Primary hover reduces background
opacity to 90%; press moves eligible buttons down 1px. Disabled buttons have
50% opacity and suppress pointer interaction.

The header is a wordmark and contextual action, not a multi-page navigation
bar. Gameplay and practice use explicit return controls.

### Track selection and input mode

Track rows are large single-selection toggles with a number, title, metadata,
and selected checkmark. Selection changes the surface to off-white and the
border to foreground; the number becomes orange. Camera / Keyboard uses an
outlined segmented toggle whose selected state is dark with light text.

### Waveform display and pose guide

The display renders sampled RMS audio data and a four-lane preview of authored
notes. Its waveform fades from 65% opacity to full opacity over 180ms on track
change; it is not a live playback visualizer. The pose guide combines rounded
stroke figures, short labels, pastel pads, and numbered keyboard hints.

### Volume and dialogs

The volume slider has a 4px muted track, orange range, and 12px white thumb
with an orange border and focus/hover ring. The instructions dialog uses an
off-white surface, compact padding, and a separated footer; entry and exit
use the existing 100ms fade/scale treatment. There is no text-entry form in
the current selection workflow.

### Motion and feedback

The song-page pose pads enter once in sequence over 600ms each, staggered
by 120ms, moving upward 12px and fading from .65 to 1. Other UI motion consists
of state transitions, the waveform fade, and dialog transitions. CSS animations and transitions are disabled under
`prefers-reduced-motion: reduce`; this does not itself stop Canvas gameplay.
Future expression should support the user-confirmed invitation to move, while
keeping track choice, instructions, and Play clear. No idle pulsing, animated
pose demonstration, or beat-reactive menu has been implemented in this snapshot.

## Do's and Don'ts

- Do make the experience feel playful, exciting, and inviting to physical movement.
- Do retain real audio waveforms and authored pose-chart content.
- Do pair pose color with a figure, label, or keyboard cue.
- Do preserve visible keyboard focus and reduced-motion treatment.
- Don't describe planned animation as implemented behavior.
- Don't replace track data with decorative generated covers or a generic promotional hero.
- Don't confuse the four instrument lanes with the separate Start / Pause gesture.
