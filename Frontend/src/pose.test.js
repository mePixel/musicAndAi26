import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoseLatch, createPoseRecognizer, trackingHint } from './pose-recognition.js';

const points = () => Array.from({ length: 17 }, () => ({ score: .95 }));
const predictions = (left = .95, right = .01) => [
  { className: 'Right Hand', probability: left },
  { className: 'Left Hand', probability: right },
  { className: 'Default', probability: Math.max(0, 1 - left - right) },
];

function lock(recognizer, keypoints = points()) {
  recognizer.update(predictions(), keypoints, 0);
  recognizer.update(predictions(), keypoints, 60);
  return recognizer.update(predictions(), keypoints, 120);
}

test('stable entry fires once; a brief uncertainty retains feedback without fresh scoring evidence', () => {
  const latch = createPoseLatch();
  assert.equal(latch.update('leftHand', 0).event, null);
  assert.equal(latch.update('leftHand', 99).event, null);
  assert.equal(latch.update('leftHand', 100).event, 'leftHand');
  assert.deepEqual(latch.update(null, 160), { pose: 'leftHand', event: null, fresh: false });
  assert.equal(latch.update('leftHand', 220).event, null);
  assert.equal(latch.update(null, 371).pose, null);
  latch.update('leftHand', 400);
  assert.equal(latch.update('leftHand', 500).event, null);
});

test('one uncertain sample during confirmation does not restart the hold', () => {
  const latch = createPoseLatch();
  latch.update('leftHand', 0);
  latch.update(null, 60);
  assert.equal(latch.update('leftHand', 120).event, 'leftHand');
});

test('slower inference can still confirm consecutive valid samples', () => {
  const recognizer = createPoseRecognizer(), joints = points();
  assert.equal(recognizer.update(predictions(), joints, 0).pose, null);
  assert.equal(recognizer.update(predictions(), joints, 200).event, 'leftHand');
  const held = recognizer.update(predictions(), joints, 400);
  assert.equal(held.pose, 'leftHand'); assert.equal(held.event, null);
  assert.equal(held.fresh, true);
});

test('a transient other pose cannot rearm; a stable different pose and reset can', () => {
  const latch = createPoseLatch();
  latch.update('leftHand', 0); latch.update('leftHand', 100);
  latch.update('default', 160); latch.update('leftHand', 220);
  assert.equal(latch.update('leftHand', 280).event, null);
  latch.update('rightHand', 340);
  assert.equal(latch.update('rightHand', 440).event, 'rightHand');
  latch.update('leftHand', 500);
  assert.equal(latch.update('leftHand', 600).event, 'leftHand');
  latch.reset(); latch.update('leftHand', 700);
  assert.equal(latch.update('leftHand', 800).event, 'leftHand');
});

test('hand cues need their own arm and shoulders, hip cues also need their own hip', () => {
  const joints = points();
  joints[11].score = joints[12].score = 0;
  assert.equal(trackingHint(joints, 'leftHand'), '');
  assert.equal(trackingHint(joints, 'rightHand'), '');
  assert.match(trackingHint(joints, 'leftHip'), /right hip/);
  joints[12].score = .95;
  assert.equal(trackingHint(joints, 'leftHip'), '');
  joints[10].score = 0;
  assert.match(trackingHint(joints, 'leftHand'), /right hand/);
  assert.equal(trackingHint(joints, 'rightHand'), '');
  assert.match(trackingHint(joints, 'default'), /right hand/);
  joints[10].score = .95; joints[8].score = 0;
  assert.match(trackingHint(joints, 'leftHand'), /right elbow/);
  joints[5].score = 0;
  assert.match(trackingHint(joints, 'rightHand'), /shoulders/);
  assert.match(trackingHint(undefined, 'leftHand'), /shoulders/);
});

test('recognition works with hips out of frame but rejects a missing active wrist', () => {
  const joints = points(); joints[11].score = joints[12].score = 0;
  const recognizer = createPoseRecognizer();
  assert.equal(lock(recognizer, joints).event, 'leftHand');
  joints[10].score = 0;
  const retained = recognizer.update(predictions(), joints, 180);
  assert.equal(retained.pose, 'leftHand'); assert.equal(retained.fresh, false);
  assert.match(retained.hint, /right hand/);
  assert.equal(recognizer.update(predictions(), joints, 300).pose, null);
});

test('moderate confidence retains a lock but cannot enter a new pose', () => {
  const recognizer = createPoseRecognizer(), joints = points();
  for (const time of [0, 60, 120, 180]) {
    assert.equal(recognizer.update(predictions(.6, .35), joints, time).pose, null);
  }
  recognizer.reset(); assert.equal(lock(recognizer).pose, 'leftHand');
  for (const time of [180, 240, 300, 360]) {
    const result = recognizer.update(predictions(.55, .4), joints, time);
    assert.equal(result.pose, 'leftHand'); assert.equal(result.fresh, true);
    assert.equal(result.event, null);
  }
});

test('one competing prediction cannot switch a lock; a sustained other pose does', () => {
  const recognizer = createPoseRecognizer(), joints = points();
  lock(recognizer);
  assert.equal(recognizer.update(predictions(.01, .98), joints, 180).event, null);
  assert.equal(recognizer.update(predictions(), joints, 240).pose, 'leftHand');
  const events = [300, 360, 420, 480, 540].map(time =>
    recognizer.update(predictions(.01, .98), joints, time).event).filter(Boolean);
  assert.deepEqual(events, ['rightHand']);
});

test('lost tracking clears a lock and fresh evidence must confirm again after a gap', () => {
  const recognizer = createPoseRecognizer(); lock(recognizer);
  const missing = recognizer.update([], [], 300);
  assert.equal(missing.tracked, false); assert.equal(missing.pose, null);
  assert.equal(recognizer.update(predictions(), points(), 360).pose, null);
  assert.equal(recognizer.update(predictions(), points(), 420).pose, null);
  assert.equal(recognizer.update(predictions(), points(), 480).pose, null);
  const recovered = recognizer.update(predictions(), points(), 540);
  assert.equal(recovered.pose, 'leftHand'); assert.equal(recovered.event, null);
  recognizer.reset(); assert.equal(lock(recognizer).event, 'leftHand');
});
