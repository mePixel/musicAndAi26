export const poses = [
  {
    id: "leftHip",
    label: "Left hand — left hip",
    short: "Left hip",
    color: "#ffd12e",

    arms: [
      [32, 23, 44, 31, 48, 43],
      [32, 23, 20, 31, 28, 40],
    ],
  },

  {
    id: "rightHip",
    label: "Right hand — right hip",
    short: "Right hip",
    color: "#49b6ff",

    arms: [
      [32, 23, 20, 31, 16, 43],
      [32, 23, 44, 31, 35, 40],
    ],
  },

  {
    id: "leftChest",
    label: "Left hand — chest/shoulder",
    short: "Left chest",
    color: "#ff6f98",

    arms: [
      [32, 23, 20, 31, 30, 30],
      [32, 23, 44, 31, 46, 43],
    ],
  },

  {
    id: "rightChest",
    label: "Right hand — chest/shoulder",
    short: "Right chest",
    color: "#27deb2",

    arms: [
      [32, 23, 20, 31, 18, 43],
      [32, 23, 44, 31, 32, 30],
    ],
  },

  {
    id: "doubleHips",
    label: "Double Hips",
    short: "Hands down",
    color: "#e36414",

    arms: [
      [32, 23, 20, 31, 18, 43],
      [32, 23, 44, 31, 46, 43],
    ]
  }
];

export const controlPose = {
  id: "startStop",
  label: "Start / Pause",
  short: "Start / Pause",
  color: "#b896ff",

  arms: [
    [32, 23, 20, 31, 18, 23],
    [32, 23, 44, 31, 46, 23],
  ],
};

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
