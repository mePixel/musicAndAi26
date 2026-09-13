import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound, judge, expireNotes } from './game.js';
import { notesForMode } from './difficulty.js';
import { songs } from './songs.js';
import { playablePoses as poses, controlPose } from './poses.js';

const chart = [{ time: 3, pose: 'leftHip' }, { time: 4.25, pose: 'rightHip' }];

test('the starting pose is never an instrument cue or chart note', () => {
  const instruments = poses.filter(pose => pose.id !== controlPose.id);
  assert.equal(instruments.length, 4);
  for (const song of songs) {
    assert(song.notes.every(note => instruments.some(pose => pose.id === note.pose)));
  }
});

test('timing boundaries award Perfect, Good, or no hit', () => {
  for (const [offset,expected] of [[-.421,null],[-.42,'Good'],[-.2,'Perfect'],[0,'Perfect'],[.2,'Perfect'],[.42,'Good'],[.421,null]]) {
    assert.equal(judge(createRound(chart),'leftHip',3+offset)?.result ?? null,expected);
  }
});
test('easy mode widens timing windows', () => {
  assert.equal(judge(createRound(chart),'leftHip',3.5)?.result ?? null,null);
  assert.equal(judge(createRound(chart),'leftHip',3.7,'easy')?.result ?? null,'Good');
  assert.equal(judge(createRound(chart),'leftHip',3.59,'easy')?.result ?? null,'Perfect');
});
test('medium mode spaces out notes while keeping all four poses available', () => {
  const denseChart = [
    { time:3, pose:'leftHand' },
    { time:3.2, pose:'rightHand' },
    { time:3.4, pose:'rightHip' },
    { time:4.1, pose:'leftHip' },
    { time:5.05, pose:'rightHand' },
    { time:5.65, pose:'rightHip' },
  ];
  assert.deepEqual(notesForMode(denseChart,'medium'),[
    { time:3, pose:'leftHand' },
    { time:5.05, pose:'rightHand' },
  ]);
  assert.equal(judge(createRound(chart),'leftHip',3.5)?.result ?? null,null);
  assert.equal(judge(createRound(chart),'leftHip',3.5,'medium')?.result ?? null,'Good');
  assert.equal(judge(createRound(chart),'leftHip',3.44,'medium')?.result ?? null,'Perfect');
});
test('easy mode reduces charts to alternating hip poses with more breathing room', () => {
  const hardChart = [
    { time:3, pose:'leftHand' },
    { time:3.4, pose:'rightHand' },
    { time:4, pose:'rightHip' },
    { time:5.2, pose:'leftHand' },
    { time:6.6, pose:'rightHand' },
    { time:8.9, pose:'leftHand' },
  ];
  assert.deepEqual(notesForMode(hardChart,'easy'),[
    { time:3, pose:'leftHip' },
    { time:6.6, pose:'rightHip' },
  ]);
});
test('a wrong pose and a held/repeated event cannot consume a note twice', () => {
  const round = createRound(chart);
  assert.equal(judge(round,'rightHip',3),null);
  assert.ok(judge(round,'leftHip',3));
  assert.equal(judge(round,'leftHip',3.1),null);
  assert.equal(round.score,100); assert.equal(round.hits,1);
});
test('overdue notes miss once, reset combo, and cannot be hit afterward', () => {
  const round = createRound(chart);
  judge(round,'leftHip',3);
  assert.equal(expireNotes(round,4.66),false);
  assert.equal(expireNotes(round,4.68),true);
  assert.equal(round.combo,0); assert.equal(round.bestCombo,1);
  assert.equal(round.misses,1); assert.equal(expireNotes(round,20),false);
  assert.equal(judge(round,'rightHip',4.25),null);
});
test('new rounds do not mutate song charts or retain previous results', () => {
  const first = createRound(chart); judge(first,'leftHip',3);
  const retry = createRound(chart);
  assert.equal(retry.score,0); assert.equal(retry.notes[0].result,null);
  assert.equal(chart[0].result,undefined);
});
test('both authored charts give a player time to move and finish before the audio ends', () => {
  const authoredSongs = songs.filter(song => !song.stemUrls && !song.generated);
  assert.equal(authoredSongs.length,2);
  for (const song of authoredSongs) {
    assert.ok(song.notes[0].time >= 3);
    for (let i=1;i<song.notes.length;i++) {
      assert.ok(song.notes[i].time-song.notes[i-1].time >= 1);
      assert.notEqual(song.notes[i].pose,song.notes[i-1].pose);
    }
    assert.ok(song.notes.at(-1).time + .3 < song.duration);
  }
});

test('corner cues converge on their targets exactly at the audio beat on every viewport', async () => {
  const { cueCorners, cuePosition } = await import('./game.js');
  assert.deepEqual(Object.keys(cueCorners).sort(), poses.filter(pose => pose.id !== controlPose.id).map(pose => pose.id).sort());
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);
  for (const [width, height] of [[1200, 660], [354, 440]]) {
    for (const [pose, [side, level]] of Object.entries(cueCorners)) {
      const incoming = cuePosition(pose, 4.5, width, height);
      assert.equal(incoming.x, incoming.origin.x);
      assert.equal(incoming.y, incoming.origin.y);
      assert.equal(Math.sign(incoming.x - width / 2), side);
      assert.equal(Math.sign(incoming.y - height / 2), level);
      const onBeat = cuePosition(pose, 0, width, height);
      close(onBeat.x, onBeat.target.x);
      close(onBeat.y, onBeat.target.y);
      const halfway = cuePosition(pose, 2.25, width, height);
      close(halfway.x, (incoming.x + onBeat.x) / 2);
      close(halfway.y, (incoming.y + onBeat.y) / 2);
      const late = cuePosition(pose, -.3, width, height);
      assert.ok(Math.abs(late.x - width/2) < Math.abs(onBeat.x - width/2));
    }
  }
});
