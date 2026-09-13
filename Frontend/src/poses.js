export const POSSIBLE_GESTURES = [
  {
    id: "leftHip",
    label: "Left Hip",
    short: "Left hip",
    color: "#ffd12e",
    difficulty: 1,
    weight: 1,
    playable: true,
    instrument: "snare",
    sampleUrl: "/audio/snare_01.wav",
    filter: { type: "bandpass", lowHz: 180, highHz: 2500, frame: 1024, hop: 256, minBandRatio: 0.12, minRelativeToLow: 0.48 },

    arms: [
      [32, 23, 44, 31, 48, 43],
      [32, 23, 20, 31, 28, 40],
    ],
  },

  {
    id: "rightHip",
    label: "Right hip",
    short: "Right hip",
    color: "#49b6ff",
    difficulty: 1,
    weight: 1,
    playable: true,
    instrument: "hiHat",
    sampleUrl: "/audio/hihat_01.wav",
    filter: { type: "highpass", lowHz: 5000, frame: 512, hop: 128, minBandRatio: 0.1, minDominance: 1.25, maxSustain: 0.18 },

    arms: [
      [32, 23, 20, 31, 16, 43],
      [32, 23, 44, 31, 35, 40],
    ],
  },

  {
    id: "leftHand",
    label: "Left Hand",
    short: "Left Hand",
    color: "#ff6f98",
    difficulty: 2,
    weight: 0.8,
    playable: true,
    instrument: "bass",
    sampleUrl: "/audio/kick_01.wav",
    filter: { type: "lowpass", highHz: 180, frame: 1024, hop: 256, minBandRatio: 0.08, minClassificationRatio: 0.3 },

    arms: [
      [32, 23, 20, 31, 30, 30],
      [32, 23, 44, 31, 46, 43],
    ],
  },

  {
    id: "rightHand",
    label: "Right Hand",
    short: "Right Hand",
    color: "#27deb2",
    difficulty: 2,
    weight: 0.8,
    playable: true,
    instrument: "crash",
    sampleUrl: "/audio/crash_01.wav",
    filter: { type: "bandpass", lowHz: 2500, highHz: 8000, frame: 2048, hop: 256, minBandRatio: 0.1, minClassificationRatio: 0.28, minDominance: 1.1, minSustain: 0.18 },

    arms: [
      [32, 23, 20, 31, 18, 43],
      [32, 23, 44, 31, 32, 30],
    ],
  },

  {
    id: "default",
    label: "Default",
    short: "Default",
    color: "#e36414",
    difficulty: 1,
    weight: 0,
    playable: false,
    instrument: null,
    sampleUrl: null,
    filter: null,

    arms: [
      [32, 23, 20, 31, 18, 43],
      [32, 23, 44, 31, 46, 43],
    ],
  },
];

export const controlPose = {
  id: "default",
  label: "Default",
  short: "Default",
  color: "#e36414",
  playable: false,
  instrument: null,
  sampleUrl: null,
  filter: null,

  arms: [
    [32, 23, 20, 31, 18, 43],
    [32, 23, 44, 31, 46, 43],
  ],
};

export const poses = POSSIBLE_GESTURES;
export const playablePoses = POSSIBLE_GESTURES.filter(pose => pose.playable);
export const gestureById = new Map(POSSIBLE_GESTURES.map(gesture => [gesture.id,gesture]));
export const GESTURES = POSSIBLE_GESTURES;

export function drawPose(ctx, pose, x, y, size, color) {
  ctx.save();

  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 64, size / 64);

  ctx.strokeStyle = color;
  ctx.lineWidth = 5.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // head
  ctx.beginPath();
  ctx.arc(32, 11, 5, 0, Math.PI * 2);
  ctx.stroke();

  // body
  ctx.beginPath();
  ctx.moveTo(32, 21);
  ctx.lineTo(32, 40);

  ctx.moveTo(32, 40);
  ctx.lineTo(22, 58);

  ctx.moveTo(32, 40);
  ctx.lineTo(42, 58);

  // arms
  for (const [sx, sy, ex, ey, wx, wy] of pose.arms) {
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.lineTo(wx, wy);
  }

  ctx.stroke();
  ctx.restore();
}
