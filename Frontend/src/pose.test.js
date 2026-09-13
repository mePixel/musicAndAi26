import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoseLatch } from './pose.js';
import { controlPose, playablePoses } from './poses.js';

test('the model control pose is not a playable chart lane', () => {
  assert.deepEqual(playablePoses.map(pose => pose.id), [
    'leftHip', 'rightHip', 'leftHand', 'rightHand',
  ]);
  assert.equal(controlPose.playable,false);
  assert.deepEqual(playablePoses.map(pose => [pose.id,pose.instrument]),[
    ['leftHip','snare'],
    ['rightHip','hiHat'],
    ['leftHand','bass'],
    ['rightHand','crash'],
  ]);
});

test('stable entry fires once; uncertain frames do not rearm the same pose', () => {
  const latch=createPoseLatch();
  assert.equal(latch.update('leftHip',0).event,null);
  assert.equal(latch.update('leftHip',99).event,null);
  assert.equal(latch.update('leftHip',100).event,'leftHip');
  assert.equal(latch.update('leftHip',200).event,null);
  assert.equal(latch.update(null,300).pose,null);
  latch.update('leftHip',400);
  assert.equal(latch.update('leftHip',500).event,null);
  latch.update('rightHip',600); latch.update('rightHip',700);
  latch.update('leftHip',800);
  assert.equal(latch.update('leftHip',900).event,'leftHip');
});

test('a short missing-frame glitch does not rearm; a new stable pose does', () => {
  const latch=createPoseLatch();
  latch.update('leftHand',0); latch.update('leftHand',100);
  latch.update(null,200); latch.update('leftHand',220);
  assert.equal(latch.update('leftHand',350).event,null);
  latch.update('rightHand',400);
  assert.equal(latch.update('rightHand',500).event,'rightHand');
  latch.reset(); latch.update('rightHand',600);
  assert.equal(latch.update('rightHand',700).event,'rightHand');
});
