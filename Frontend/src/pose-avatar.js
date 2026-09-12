// Coordinates use the same unmirrored PoseNet frame as the camera overlay.
// Mirror once here to match the mirrored video, independently of pose labels.
export const restingAvatar = {
  head: [32, 11],
  leftShoulder: [25, 23], rightShoulder: [39, 23],
  leftElbow: [21, 32], rightElbow: [43, 32],
  leftWrist: [19, 42], rightWrist: [45, 42],
  leftHip: [28, 41], rightHip: [36, 41],
  leftKnee: [25, 51], rightKnee: [39, 51],
  leftAnkle: [22, 61], rightAnkle: [42, 61],
};

export function mapAvatar(keypoints) {
  const usable = index => {
    const point = keypoints?.[index];
    return point?.score >= .45 && Number.isFinite(point.position?.x) && Number.isFinite(point.position?.y);
  };
  if (!usable(5) || !usable(6)) return null;
  const a = keypoints[5].position, b = keypoints[6].position;
  const span = Math.hypot(a.x - b.x, a.y - b.y);
  if (span < 12) return null;
  const scale = 14 / span, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
  const project = index => [32 - (keypoints[index].position.x - cx) * scale, 23 + (keypoints[index].position.y - cy) * scale];
  const offset = (point, x, y) => [point[0] + x, point[1] + y];
  // Keep each shoulder/elbow/wrist chain together; projection mirrors its x.
  const leftShoulder = project(6), rightShoulder = project(5);
  const leftHip = usable(12) ? project(12) : offset(leftShoulder, 3, 18);
  const rightHip = usable(11) ? project(11) : offset(rightShoulder, -3, 18);
  const leftElbow = usable(8) ? project(8) : offset(leftShoulder, -4, 9);
  const rightElbow = usable(7) ? project(7) : offset(rightShoulder, 4, 9);
  return {
    head: usable(0) ? project(0) : [32, 11], leftShoulder, rightShoulder,
    leftElbow, rightElbow,
    leftWrist: usable(10) && usable(8) ? project(10) : offset(leftElbow, -2, 10),
    rightWrist: usable(9) && usable(7) ? project(9) : offset(rightElbow, 2, 10),
    leftHip, rightHip,
    leftKnee: usable(14) ? project(14) : offset(leftHip, -3, 10),
    rightKnee: usable(13) ? project(13) : offset(rightHip, 3, 10),
    leftAnkle: usable(16) && usable(14) ? project(16) : offset(leftHip, -6, 20),
    rightAnkle: usable(15) && usable(13) ? project(15) : offset(rightHip, 6, 20),
  };
}
