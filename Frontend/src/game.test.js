import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound, createPlaybackGestureTrigger, judge, expireNotes } from './game.js';
import { songs } from './songs.js';
import { poses, controlPose } from './poses.js';

const chart = [{ time: 3, pose: 'leftUp' }, { time: 4.25, pose: 'rightUp' }];

test('playback accepts a recognized control pose without needing a new entry event', () => {
  let toggles = 0;
  const trigger = createPlaybackGestureTrigger(() => toggles++);
  trigger({ tracked: true, pose: 'startStop', event: null }, 100);
  trigger({ tracked: true, pose: 'startStop', event: null }, 2000);
  assert.equal(toggles, 1, 'holding the control must toggle only once');
});

test('a control pose held through cooldown toggles after it expires', () => {
  let toggles = 0;
  const trigger = createPlaybackGestureTrigger(() => toggles++);
  trigger({ tracked: true, pose: 'startStop' }, 100);
  trigger({ tracked: true, pose: 'leftHip' }, 300);
  trigger({ tracked: true, pose: 'startStop', event: 'startStop' }, 500);
  assert.equal(toggles, 1);
  trigger({ tracked: true, pose: 'startStop', event: null }, 1100);
  trigger({ tracked: true, pose: 'startStop', event: null }, 3000);
  assert.equal(toggles, 2);
});

test('tracking flicker cannot rearm playback; abandoned controls are not queued', () => {
  let toggles = 0;
  const trigger = createPlaybackGestureTrigger(() => toggles++);
  trigger({ tracked: true, pose: 'startStop' }, 100);
  trigger({ tracked: false, pose: null }, 200);
  trigger({ tracked: true, pose: null }, 250);
  trigger({ tracked: true, pose: 'startStop' }, 1500);
  assert.equal(toggles, 1);
  trigger({ tracked: true, pose: 'leftHip' }, 1600);
  trigger({ tracked: true, pose: 'startStop' }, 1700);
  trigger({ tracked: true, pose: 'rightHip' }, 1800);
  trigger({ tracked: true, pose: 'startStop' }, 1900);
  trigger({ tracked: false, pose: null }, 3000);
  trigger({ tracked: true, pose: 'rightHip' }, 3100);
  assert.equal(toggles, 2);
});

test('Start / Pause is a control, never an instrument lane or chart note', () => {
  assert.equal(poses.length, 4);
  assert.equal(controlPose.id, 'startStop');
  assert.equal(poses.some(pose => pose.id === controlPose.id), false);
  for (const song of songs) {
    assert(song.notes.every(note => poses.some(pose => pose.id === note.pose)));
  }
});

test('timing boundaries award Perfect, Good, or no hit', () => {
  for (const [offset,expected] of [[-.301,null],[-.3,'Good'],[-.15,'Perfect'],[0,'Perfect'],[.15,'Perfect'],[.3,'Good'],[.301,null]]) {
    assert.equal(judge(createRound(chart),'leftUp',3+offset)?.result ?? null,expected);
  }
});
test('a wrong pose and a held/repeated event cannot consume a note twice', () => {
  const round = createRound(chart);
  assert.equal(judge(round,'rightUp',3),null);
  assert.ok(judge(round,'leftUp',3));
  assert.equal(judge(round,'leftUp',3.1),null);
  assert.equal(round.score,100); assert.equal(round.hits,1);
});
test('overdue notes miss once, reset combo, and cannot be hit afterward', () => {
  const round = createRound(chart);
  judge(round,'leftUp',3);
  assert.equal(expireNotes(round,4.55),false);
  assert.equal(expireNotes(round,4.56),true);
  assert.equal(round.combo,0); assert.equal(round.bestCombo,1);
  assert.equal(round.misses,1); assert.equal(expireNotes(round,20),false);
  assert.equal(judge(round,'rightUp',4.25),null);
});
test('new rounds do not mutate song charts or retain previous results', () => {
  const first = createRound(chart); judge(first,'leftUp',3);
  const retry = createRound(chart);
  assert.equal(retry.score,0); assert.equal(retry.notes[0].result,null);
  assert.equal(chart[0].result,undefined);
});
test('both authored charts give a player time to move and finish before the audio ends', () => {
  assert.equal(songs.length,2);
  for (const song of songs) {
    assert.ok(song.notes[0].time >= 3);
    for (let i=1;i<song.notes.length;i++) {
      assert.ok(song.notes[i].time-song.notes[i-1].time >= 1);
      assert.notEqual(song.notes[i].pose,song.notes[i-1].pose);
    }
    assert.ok(song.notes.at(-1).time + .3 < song.duration);
  }
});
