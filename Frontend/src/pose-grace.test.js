import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound, createCameraPoseGrace, expireNotes } from './game.js';

function setup(notes = [{ time: 3, pose: 'leftHip' }]) {
  const round = createRound(notes);
  return { round, grace: createCameraPoseGrace(round) };
}
const seen = (pose, event = pose) => ({ tracked: true, pose, event });

test('camera grace keeps a matching early pose through a short recognition gap', () => {
  const { round, grace } = setup();
  grace.update(seen('leftHip'), 2.7);
  assert.equal(grace.judge(2.7), null);
  grace.update({ tracked: true, pose: null, event: null }, 2.8);
  grace.update({ tracked: false, pose: null, event: null }, 2.9);
  assert.equal(grace.judge(2.99), null);
  assert.equal(grace.judge(3)?.result, 'Perfect');
  assert.equal(round.score, 100);
  assert.equal(grace.judge(3), null);
});

test('camera grace expires after the hit window without confident detection', () => {
  const { round, grace } = setup();
  grace.update(seen('leftHip'), 2.579);
  assert.equal(grace.judge(2.7), null);
  assert.equal(grace.judge(3), null);
  assert.equal(round.score, 0);
});

test('camera grace refreshes from held detections but one entry scores only once', () => {
  const { round, grace } = setup([{ time: 3, pose: 'leftHip' }, { time: 4, pose: 'leftHip' }]);
  grace.update(seen('leftHip'), 1);
  grace.update(seen('leftHip', null), 2.75);
  assert.ok(grace.judge(3));
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
    assert.equal(grace.judge(3), null);
    assert.equal(round.score, 0);
  }
});

test('camera grace cannot skip the next cue or transfer a held pose to a later cue', () => {
  const { round, grace } = setup([{ time: 3, pose: 'rightHip' }, { time: 3.4, pose: 'leftHip' }]);
  grace.update(seen('leftHip'), 2.9);
  assert.equal(grace.judge(3.1), null);
  expireNotes(round, 3.43);
  grace.update(seen('leftHip', null), 3.44);
  assert.equal(grace.judge(3.45), null);
  assert.equal(round.hits, 0);
});

test('camera grace can accept a fresh entry after an overdue cue', () => {
  const { round, grace } = setup([{ time: 2, pose: 'rightHip' }, { time: 3, pose: 'leftHip' }]);
  grace.update(seen('leftHip'), 2.75);
  expireNotes(round, 2.8);
  assert.ok(grace.judge(3));
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

test('early camera poses wait for the beat and held entries cannot score twice', () => {
  const { round, grace } = setup();
  grace.update(seen('leftHip'), 2);
  grace.update(seen('leftHip', null), 2.8);
  assert.equal(grace.judge(2.8), null);
  assert.equal(round.score, 0);
  assert.equal(grace.judge(3.01)?.result, 'Perfect');
  assert.equal(grace.judge(3.05), null);
});

test('retained visual locks cannot extend scoring grace', () => {
  const { round, grace } = setup();
  grace.update({ ...seen('leftHip'), fresh: true }, 2.5);
  grace.update({ ...seen('leftHip', null), fresh: false }, 2.8);
  assert.equal(grace.judge(3), null);
  assert.equal(round.score, 0);
});

test('a changed pose before the beat cancels the buffered hit', () => {
  const { round, grace } = setup();
  grace.update(seen('leftHip'), 2.8);
  assert.equal(grace.judge(2.8), null);
  grace.update(seen('rightHand'), 2.95);
  assert.equal(grace.judge(3), null);
  assert.equal(round.score, 0);
});

test('late camera entries retain the normal Perfect and Good windows', () => {
  for (const [time, expected] of [[3.1, 'Perfect'], [3.25, 'Good'], [3.421, undefined]]) {
    const { grace } = setup();
    grace.update(seen('leftHip'), time);
    assert.equal(grace.judge(time)?.result, expected);
  }
});

test('every difficulty buffers early poses until the beat and uses its own grace window', () => {
  for (const [mode, window] of [['easy', 1.2], ['medium', .9], ['hard', .42]]) {
    const round = createRound([{ time: 3, pose: 'leftHip' }, { time: 5, pose: 'leftHip' }]);
    const grace = createCameraPoseGrace(round, mode);
    grace.update({ ...seen('leftHip'), fresh: true }, 3 - window + .01);
    assert.equal(grace.judge(2.99), null, mode);
    assert.equal(grace.judge(3)?.result, 'Perfect', mode);
    grace.update({ ...seen('leftHip', null), fresh: true }, 4.99);
    assert.equal(grace.judge(5), null, mode);
    assert.equal(round.hits, 1, mode);
  }
});

test('retained visual locks cannot extend any difficulty’s scoring grace', () => {
  for (const [mode, window] of [['easy', 1.2], ['medium', .9], ['hard', .42]]) {
    const round = createRound([{ time: 3, pose: 'leftHip' }]);
    const grace = createCameraPoseGrace(round, mode);
    grace.update({ ...seen('leftHip'), fresh: true }, 3 - window - .01);
    grace.update({ ...seen('leftHip', null), fresh: false }, 2.99);
    assert.equal(grace.judge(3), null, mode);
    assert.equal(round.score, 0, mode);
  }
});
