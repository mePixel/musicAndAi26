export const poses = [
  { id: 'leftUp', label: 'Left hand up', short: 'Left up', color: '#d9ff70',
    arms: [[32, 23, 18, 25, 13, 6], [32, 23, 44, 31, 46, 43]] },
  { id: 'rightUp', label: 'Right hand up', short: 'Right up', color: '#bea7ff',
    arms: [[32, 23, 20, 31, 18, 43], [32, 23, 46, 25, 51, 6]] },
  { id: 'bothUp', label: 'Both hands up', short: 'Both up', color: '#ffb792',
    arms: [[32, 23, 20, 18, 12, 5], [32, 23, 44, 18, 52, 5]] },
  { id: 'spread', label: 'Arms spread', short: 'Arms out', color: '#87dfee',
    arms: [[32, 23, 18, 23, 3, 23], [32, 23, 46, 23, 61, 23]] },
];

export function poseSvg(pose) {
  const arms = pose.arms.map(([x, y, ex, ey, wx, wy]) => `<path d="M${x} ${y} L${ex} ${ey} L${wx} ${wy}"/>`).join('');
  return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="32" cy="11" r="5"/><path d="M32 21 V40 M32 40 L22 58 M32 40 L42 58"/>${arms}</svg>`;
}

export function drawPose(ctx, pose, x, y, size, color) {
  ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 64, size / 64);
  ctx.strokeStyle = color; ctx.lineWidth = 3.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.arc(32, 11, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(32, 21); ctx.lineTo(32, 40); ctx.lineTo(22, 58);
  ctx.moveTo(32, 40); ctx.lineTo(42, 58);
  for (const [sx, sy, ex, ey, wx, wy] of pose.arms) {
    ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy);
  }
  ctx.stroke(); ctx.restore();
}
