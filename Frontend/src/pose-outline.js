const MIN_CONFIDENCE = 0.45;

// PoseNet supplies joints, not segmentation: approximate the player's silhouette
// with a torso, head, and rounded limbs, then outline and light their boundary.
export function drawPlayerOutline(ctx, mask, keypoints, color) {
  const point = index => {
    const keypoint = keypoints?.[index];
    return keypoint?.score >= MIN_CONFIDENCE ? keypoint.position : null;
  };
  const left = point(5), right = point(6);
  if (!left || !right || !color) return;

  if (mask.width !== ctx.canvas.width || mask.height !== ctx.canvas.height) {
    mask.width = ctx.canvas.width;
    mask.height = ctx.canvas.height;
  }
  const body = mask.getContext('2d');
  body.clearRect(0, 0, mask.width, mask.height);
  body.fillStyle = color;
  body.strokeStyle = color;
  body.lineCap = 'round';
  body.lineJoin = 'round';
  const width = Math.max(20, Math.hypot(left.x - right.x, left.y - right.y));

  function limb(a, b, thickness) {
    if (!a || !b) return;
    body.lineWidth = thickness;
    body.beginPath();
    body.moveTo(a.x, a.y);
    body.lineTo(b.x, b.y);
    body.stroke();
  }

  const leftHip = point(11), rightHip = point(12);
  if (leftHip && rightHip) {
    body.lineWidth = width * 0.2;
    body.beginPath();
    body.moveTo(left.x, left.y);
    body.lineTo(right.x, right.y);
    body.lineTo(rightHip.x, rightHip.y);
    body.lineTo(leftHip.x, leftHip.y);
    body.closePath();
    body.fill();
    body.stroke();
  }
  limb(left, right, width * 0.25);
  for (const [a, b] of [[5, 7], [7, 9], [6, 8], [8, 10]]) {
    limb(point(a), point(b), width * 0.23);
  }
  for (const [a, b] of [[11, 13], [13, 15], [12, 14], [14, 16]]) {
    limb(point(a), point(b), width * 0.3);
  }
  const nose = point(0);
  if (nose) {
    limb(nose, { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }, width * 0.25);
    body.beginPath();
    body.ellipse(nose.x, nose.y - width * 0.08, width * 0.23, width * 0.3, 0, 0, Math.PI * 2);
    body.fill();
  }

  // Expand the mask, then remove its interior so the webcam stays unobscured.
  const border = Math.max(3, width * 0.025);
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    ctx.drawImage(mask, Math.cos(angle) * border, Math.sin(angle) * border);
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(mask, 0, 0);
  ctx.restore();

  // Blur the colored edge into the silhouette, clipping out any exterior glow.
  // Reuse the mask after outlining; the body's center stays transparent.
  body.save();
  body.globalCompositeOperation = 'source-in';
  body.filter = `blur(${Math.max(5, width * 0.06)}px)`;
  body.drawImage(ctx.canvas, 0, 0);
  body.restore();
  ctx.drawImage(mask, 0, 0);
  ctx.drawImage(mask, 0, 0);
}
