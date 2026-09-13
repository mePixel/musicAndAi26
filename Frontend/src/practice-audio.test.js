import test from 'node:test';
import assert from 'node:assert/strict';
import { createPracticeSoundTrigger } from './audio.js';
import { createPoseLatch } from './pose.js';

test('training plays once per held pose, without rearming after tracking flicker', () => {
  const played = [], latch = createPoseLatch();
  const trigger = createPracticeSoundTrigger(pose => played.push(pose));
  function frame(pose, now) {
    trigger({ tracked: pose !== null, ...latch.update(pose, now) }, now);
  }
  frame('leftHip', 0); frame('leftHip', 99);
  assert.deepEqual(played, []);
  frame('leftHip', 100); frame('leftHip', 1000);
  frame(null, 1100); frame('leftHip', 1200); frame('leftHip', 1400);
  assert.deepEqual(played, ['leftHip']);
  frame('rightHip', 1500); frame('rightHip', 1600);
  assert.deepEqual(played, ['leftHip', 'rightHip']);
});

test('a left-hip pose entered during cooldown plays once when the cooldown ends', () => {
  const played = [], trigger = createPracticeSoundTrigger(pose => played.push(pose));
  trigger({ tracked: true, pose: 'rightHip' }, 100);
  trigger({ tracked: true, pose: 'leftHip' }, 250);
  trigger({ tracked: true, pose: 'leftHip' }, 699);
  assert.deepEqual(played, ['rightHip']);
  trigger({ tracked: true, pose: 'leftHip' }, 700);
  trigger({ tracked: true, pose: 'leftHip' }, 1700);
  assert.deepEqual(played, ['rightHip', 'leftHip']);
});

test('only the currently held pose plays after cooldown, never an abandoned pose', () => {
  const played = [], trigger = createPracticeSoundTrigger(pose => played.push(pose));
  trigger({ tracked: true, pose: 'rightHip' }, 100);
  trigger({ tracked: true, pose: 'leftHip' }, 250);
  trigger({ tracked: false, pose: null }, 700);
  trigger({ tracked: true, pose: 'rightHip' }, 900);
  assert.deepEqual(played, ['rightHip']);
  trigger({ tracked: true, pose: 'rightHand' }, 1000);
  assert.deepEqual(played, ['rightHip', 'rightHand']);
});

test('missing tracking and silent poses do not consume the training cooldown', () => {
  const played = [], trigger = createPracticeSoundTrigger(pose => played.push(pose));
  trigger({ tracked: false, pose: 'leftHip' }, 0);
  trigger({ tracked: true, pose: 'default' }, 10);
  trigger({ tracked: true, pose: 'rightHip' }, 20);
  assert.deepEqual(played, ['rightHip']);
  trigger({ tracked: true, pose: 'default' }, 1000);
  trigger({ tracked: true, pose: 'rightHip' }, 1100);
  assert.deepEqual(played, ['rightHip', 'rightHip']);
});
