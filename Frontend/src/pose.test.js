import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPose, createPoseLatch } from './pose.js';

function landmarks(left = 'down', right = 'down') {
  const points = Array.from({length:33},() => ({x:.5,y:.5,visibility:1}));
  points[11] = {x:.6,y:.4,visibility:1}; points[12] = {x:.4,y:.4,visibility:1};
  points[13] = {x:.7,y:.45,visibility:1}; points[14] = {x:.3,y:.45,visibility:1};
  points[15] = {x:left==='spread'?.85:.65,y:left==='up'?.15:left==='spread'?.4:.7,visibility:1};
  points[16] = {x:right==='spread'?.15:.35,y:right==='up'?.15:right==='spread'?.4:.7,visibility:1};
  return points;
}
test('anatomical left/right, both up, spread, and neutral are distinct', () => {
  assert.equal(classifyPose(landmarks('up')),'leftUp');
  assert.equal(classifyPose(landmarks('down','up')),'rightUp');
  assert.equal(classifyPose(landmarks('up','up')),'bothUp');
  assert.equal(classifyPose(landmarks('spread','spread')),'spread');
  assert.equal(classifyPose(landmarks()),'neutral');
});
test('missing or hidden wrists never become a valid pose', () => {
  assert.equal(classifyPose(undefined),null);
  const points=landmarks('up'); points[15].visibility=.2;
  assert.equal(classifyPose(points),null);
  points[15].visibility=1; points[15].x=1.1;
  assert.equal(classifyPose(points),null);
});
test('stable entry fires once; uncertain frames do not rearm the same pose', () => {
  const latch=createPoseLatch();
  assert.equal(latch.update('leftUp',0).event,null);
  assert.equal(latch.update('leftUp',99).event,null);
  assert.equal(latch.update('leftUp',100).event,'leftUp');
  assert.equal(latch.update('leftUp',200).event,null);
  assert.equal(latch.update(null,300).pose,null);
  latch.update('leftUp',400);
  assert.equal(latch.update('leftUp',500).event,null);
  latch.update('neutral',600); latch.update('neutral',700);
  latch.update('leftUp',800);
  assert.equal(latch.update('leftUp',900).event,'leftUp');
});
test('a short neutral glitch does not rearm; a new stable pose does', () => {
  const latch=createPoseLatch();
  latch.update('bothUp',0); latch.update('bothUp',100);
  latch.update('neutral',200); latch.update('bothUp',220);
  assert.equal(latch.update('bothUp',350).event,null);
  latch.update('rightUp',400);
  assert.equal(latch.update('rightUp',500).event,'rightUp');
  latch.reset(); latch.update('rightUp',600);
  assert.equal(latch.update('rightUp',700).event,'rightUp');
});
