export const poses = [
  {
    id: "leftHip",
    label: "Left hand — left hip",
    short: "Left hip",
    color: "#f5d28b",

    arms: [
      [32, 23, 44, 31, 48, 43],
      [32, 23, 20, 31, 18, 25],
    ],
  },

  {
    id: "rightHip",
    label: "Right hand — right hip",
    short: "Right hip",
    color: "#b8d6f4",

    arms: [
      [32, 23, 20, 31, 16, 43],
      [32, 23, 44, 31, 46, 25],
    ],
  },

  {
    id: "leftChest",
    label: "Left hand — chest/shoulder",
    short: "Left chest",
    color: "#f3b4bc",

    arms: [
      [32, 23, 20, 31, 18, 43],
      [32, 23, 44, 31, 39, 25],
    ],
  },

  {
    id: "rightChest",
    label: "Right hand — chest/shoulder",
    short: "Right chest",
    color: "#a2d4ce",

    arms: [
      [32, 23, 20, 31, 25, 25],
      [32, 23, 44, 31, 46, 43],
    ],
  },

  {
    id: "startStop",
    label: "Start / Stop",
    short: "Start / Stop",
    color: "#d7b8f4",

    arms: [
      [32, 23, 20, 31, 18, 43],
      [32, 23, 44, 31, 46, 43],
    ],
  },
];

export function drawPose(ctx, pose, x, y, size, color) {
  ctx.save();

  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 64, size / 64);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3.8;
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
