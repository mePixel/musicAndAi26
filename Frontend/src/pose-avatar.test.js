import test from 'node:test';
import assert from 'node:assert/strict';
import { mapAvatar } from './pose-avatar.js';

function keypoints() {
  const points = Array.from({ length: 17 }, () => ({ score: 0, position: { x: 320, y: 200 } }));
  for (const [i, x, y] of [[0,320,100],[5,240,200],[6,400,200],[7,200,280],[8,440,280],[9,180,350],[10,460,80]]) {
    points[i] = { score: .99, position: { x, y } };
  }
  return points;
}

test('avatar mirrors camera x once and follows individual wrists without a classified pose', () => {
  const avatar = mapAvatar(keypoints());
  assert.deepEqual(avatar.leftShoulder, [25,23]);
  assert.deepEqual(avatar.rightShoulder, [39,23]);
  assert.ok(avatar.leftWrist[0] < avatar.leftShoulder[0]);
  assert.ok(avatar.leftWrist[1] < avatar.leftShoulder[1]);
  assert.ok(avatar.rightWrist[1] > avatar.rightShoulder[1]);
});

test('avatar proportions are independent of camera distance and position', () => {
  const points = keypoints();
  const transformed = points.map(point => ({ ...point, position: { x: point.position.x * 2 + 50, y: point.position.y * 2 + 80 } }));
  assert.deepEqual(mapAvatar(points), mapAvatar(transformed));
});

test('uncertain joints fall back locally while other tracked limbs keep moving', () => {
  const points = keypoints();
  points[10].score = .1;
  const avatar = mapAvatar(points);
  assert.equal(avatar.leftWrist[1], avatar.leftElbow[1] + 10);
  assert.deepEqual(avatar.rightWrist, mapAvatar(keypoints()).rightWrist);
  points[5].score = .1;
  assert.equal(mapAvatar(points), null);
  assert.equal(mapAvatar(null), null);
  points[5].score = .99; points[5].position.x = NaN;
  assert.equal(mapAvatar(points), null);
});
