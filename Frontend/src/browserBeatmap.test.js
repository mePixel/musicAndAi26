import test from 'node:test';
import assert from 'node:assert/strict';
import { beatmapToNotes, generateBrowserBeatmap } from './browserBeatmap.js';

function fakeBuffer() {
  const sampleRate = 44100, duration = 12, length = sampleRate * duration;
  const data = new Float32Array(length);
  for (let beat = .5; beat < 11; beat += 1) {
    for (let index = beat * sampleRate; index < beat * sampleRate + 3000; index++) {
      data[index] = Math.sin(2 * Math.PI * 90 * index / sampleRate) * .9;
    }
  }
  return {
    sampleRate,
    duration,
    length,
    numberOfChannels: 1,
    getChannelData() { return data; },
  };
}

function instrumentBuffer() {
  const sampleRate = 44100, duration = 8, length = sampleRate * duration;
  const data = new Float32Array(length);
  const hits = [
    { time:.5, frequency:85, decay:900, instrument:'bass', pose:'leftHand' },
    { time:2, frequency:900, decay:500, instrument:'snare', pose:'leftHip' },
    { time:3.5, frequency:9000, decay:180, instrument:'hiHat', pose:'rightHip' },
    { time:5, frequency:3500, decay:3000, instrument:'crash', pose:'rightHand' },
  ];
  for (const hit of hits) {
    const start = Math.round(hit.time*sampleRate);
    for (let index = 0; index < hit.decay*4 && start+index < data.length; index++) {
        const envelope = Math.exp(-index/hit.decay);
        const frequency = hit.frequency;
        data[start + index] += Math.sin(2 * Math.PI * frequency * index / sampleRate) * envelope * .9;
    }
  }
  return {
    hits,
    buffer: {
      sampleRate,
      duration,
      length,
      numberOfChannels: 1,
      getChannelData() { return data; },
    },
  };
}

function eighthNoteDrumPattern() {
  const sampleRate = 44100, bpm = 110, eighth = 30/bpm, duration = 10;
  const length = Math.ceil(sampleRate*duration), data = new Float32Array(length);
  for (let step = 0, time = .5; time < duration-.5; step++, time += eighth) {
    const frequency = step%2 ? 9000 : step%4 === 2 ? 900 : 85;
    const decay = step%2 ? 180 : step%4 === 2 ? 500 : 900;
    const start = Math.round(time*sampleRate);
    for (let index = 0; index < decay*4 && start+index < data.length; index++) {
      data[start+index] += Math.sin(2*Math.PI*frequency*index/sampleRate)*Math.exp(-index/decay)*.9;
    }
  }
  return {
    sampleRate, duration, length, numberOfChannels:1,
    getChannelData() { return data; },
  };
}

test('browser generator creates deterministic playable pose events', () => {
  const first = generateBrowserBeatmap(fakeBuffer(), { seed: 12 });
  const second = generateBrowserBeatmap(fakeBuffer(), { seed: 12 });

  assert.deepEqual(first, second);
  assert.ok(first.events.length >= 4);
  assert.ok(first.events.every(event => event.time >= .08 && event.time <= 11.7));
  assert.ok(first.events.every(event => first.poses.includes(event.pose)));
  assert.ok(first.events.every(event => event.pose === 'leftHand' && event.instrument === 'bass'));
});

test('browser generator quantizes detected hits onto its declared grid', () => {
  const beatmap = generateBrowserBeatmap(fakeBuffer(), { seed: 5, difficulty: 'hard' });

  assert.ok(beatmap.metadata.bpm >= 110 && beatmap.metadata.bpm <= 130);
  assert.equal(beatmap.metadata.quantized,true);
  assert.equal(beatmap.metadata.gridSubdivision,4);
  assert.ok(beatmap.events.length >= 6);
  assert.ok(beatmap.events[0].time < 1.2);
  for (const event of beatmap.events) {
    const gridPosition = (event.time-beatmap.metadata.gridPhaseSeconds)/beatmap.metadata.gridStepSeconds;
    assert.ok(Math.abs(gridPosition-Math.round(gridPosition)) < .001);
    assert.equal(event.gridIndex,Math.round(gridPosition));
    assert.ok(Math.abs(event.sourceTime-event.time) <= beatmap.metadata.gridStepSeconds/2+.001);
  }
});

test('browser generator maps isolated instrument bands to their gestures', () => {
  const { buffer, hits } = instrumentBuffer();
  const beatmap = generateBrowserBeatmap(buffer, { seed: 9, difficulty: 'hard' });

  assert.equal(beatmap.metadata.timingSource, 'instrument-filter-onsets');
  assert.equal(beatmap.events.length,hits.length);
  for (let index = 0; index < hits.length; index++) {
    assert.equal(beatmap.events[index].instrument,hits[index].instrument);
    assert.equal(beatmap.events[index].pose,hits[index].pose);
    assert.ok(Math.abs(beatmap.events[index].time-hits[index].time) < .06,
      `event ${index} was ${beatmap.events[index].time}, expected ${hits[index].time}`);
  }
});

test('browser generator uses an explicitly separated drums stem', () => {
  const { buffer: drums } = instrumentBuffer();
  const silent = fakeBuffer();
  const beatmap = generateBrowserBeatmap(silent, { difficulty:'hard', stems:{ drums, bass:silent, other:silent, vocals:silent } });

  assert.equal(beatmap.metadata.timingSource,'separated-drums-stem-onsets');
  assert.deepEqual(beatmap.metadata.stemNames,['bass','drums','other','vocals']);
  assert.ok(beatmap.events.length >= 4);
});

test('medium charts preserve 110 BPM eighth-note cymbal offbeats', () => {
  const drums = eighthNoteDrumPattern();
  const beatmap = generateBrowserBeatmap(drums,{ difficulty:'medium', stems:{ drums } });
  const hiHats = beatmap.events.filter(event => event.instrument === 'hiHat');

  assert.ok(beatmap.metadata.bpm >= 108 && beatmap.metadata.bpm <= 112);
  assert.ok(beatmap.metadata.gridConfidence > .7);
  assert.ok(hiHats.length >= 8,`expected offbeat hi-hats, received ${hiHats.length}`);
  assert.ok(beatmap.events.length >= 20);
});

test('whole-track grid search ignores irregular onset gaps', () => {
  const drums = eighthNoteDrumPattern();
  const data = drums.getChannelData(0);
  for (const time of [1.13,4.07,7.71]) {
    const start = Math.round(time*drums.sampleRate);
    for (let index = 0; index < 300; index++) data[start+index] += Math.sin(index*.9)*.35;
  }
  const beatmap = generateBrowserBeatmap(drums,{ difficulty:'medium', stems:{ drums } });

  assert.ok(Math.abs(beatmap.metadata.bpm-110) < 1);
  assert.ok(beatmap.metadata.gridConfidence > .65);
  assert.ok(beatmap.events.every(event => Number.isInteger(event.gridIndex)));
});

test('drum-stem classifier resolves kick, snare, and short cymbal hits', () => {
  const drums = eighthNoteDrumPattern();
  const beatmap = generateBrowserBeatmap(drums,{ difficulty:'medium', stems:{ drums } });
  const opening = beatmap.events.slice(0,8).map(event => event.instrument);

  assert.deepEqual(opening,['bass','hiHat','snare','hiHat','bass','hiHat','snare','hiHat']);
});

test('browser generator does not invent a metronome when onsets are absent', () => {
  const sampleRate = 44100, duration = 6, length = sampleRate * duration;
  const data = new Float32Array(length);
  const beatmap = generateBrowserBeatmap({
    sampleRate, duration, length, numberOfChannels: 1,
    getChannelData() { return data; },
  });

  assert.deepEqual(beatmap.events, []);
});

test('browser beatmap output converts to sorted frontend notes', () => {
  const notes = beatmapToNotes({
    events: [
      { time: 4, pose: 'rightHip' },
      { time: 3, pose: 'leftHip' },
    ],
  });

  assert.deepEqual(notes, [{ time: 3, pose: 'leftHip' }, { time: 4, pose: 'rightHip' }]);
});
