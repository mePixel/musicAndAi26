import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound, createCameraPoseGrace, expireNotes } from './game.js';

function setup(notes = [{ time: 3, pose: 'leftHip' }]) {
  const round = createRound(notes);
  return { round, grace: createCameraPoseGrace(round) };
}
const seen = (pose, event = pose) => ({ tracked: true, pose, event });

test('camera grace keeps a matching early pose through a 300 ms recognition gap', () => {
  const { round, grace } = setup();
  grace.update(seen('leftHip'), 2.4);
  assert.equal(grace.judge(2.4), null);
  grace.update({ tracked: true, pose: null, event: null }, 2.6);
  grace.update({ tracked: false, pose: null, event: null }, 2.65);
  assert.equal(grace.judge(2.7)?.result, 'Good');
  assert.equal(round.score, 50);
  assert.equal(grace.judge(3), null);
});

test('camera grace expires after 300 ms without confident detection', () => {
  const { round, grace } = setup();
  grace.update(seen('leftHip'), 2.399);
  assert.equal(grace.judge(2.7), null);
  assert.equal(grace.judge(3), null);
  assert.equal(round.score, 0);
});

test('camera grace refreshes from held detections but one entry scores only once', () => {
  const { round, grace } = setup([{ time: 3, pose: 'leftHip' }, { time: 4, pose: 'leftHip' }]);
  grace.update(seen('leftHip'), 1);
  grace.update(seen('leftHip', null), 2.65);
  assert.ok(grace.judge(2.7));
  grace.update(seen('leftHip', null), 3.9);
  assert.equal(grace.judge(4), null);
  assert.equal(round.hits, 1);
  grace.update(seen('rightHip'), 4.01);
  grace.update(seen('leftHip'), 4.02);
  assert.ok(grace.judge(4.02));
  assert.equal(round.hits, 2);
});

test('camera grace cancels on a different pose, including a playback or neutral pose', () => {
  for (const pose of ['rightHip', 'default']) {
    const { round, grace } = setup();
    grace.update(seen('leftHip'), 2.5);
    grace.update(seen(pose), 2.6);
    assert.equal(grace.judge(2.7), null);
    assert.equal(round.score, 0);
  }
});

test('camera grace cannot skip the next cue or transfer a held pose to a later cue', () => {
  const { round, grace } = setup([{ time: 3, pose: 'rightHip' }, { time: 3.4, pose: 'leftHip' }]);
  grace.update(seen('leftHip'), 2.9);
  assert.equal(grace.judge(3.1), null);
  expireNotes(round, 3.31);
  grace.update(seen('leftHip', null), 3.35);
  assert.equal(grace.judge(3.4), null);
  assert.equal(round.hits, 0);
});

test('camera grace can accept a fresh entry after an overdue cue', () => {
  const { round, grace } = setup([{ time: 2, pose: 'rightHip' }, { time: 3, pose: 'leftHip' }]);
  grace.update(seen('leftHip'), 2.5);
  expireNotes(round, 2.7);
  assert.ok(grace.judge(2.7));
  assert.equal(round.misses, 1);
  assert.equal(round.hits, 1);
});

test('camera grace clears pending input on pause and fresh rounds retain nothing', () => {
  const { round, grace } = setup();
  grace.update(seen('leftHip'), 2.5);
  grace.clear();
  grace.update(seen('leftHip', null), 2.7);
  assert.equal(grace.judge(2.7), null);
  assert.equal(createCameraPoseGrace(round).judge(3), null);
  grace.update(seen('rightHip'), 2.8);
  grace.update(seen('leftHip'), 3);
  assert.equal(grace.judge(3)?.result, 'Perfect');
});
