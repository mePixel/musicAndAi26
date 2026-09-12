import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from './audio.js';

test('pause freezes the audio clock and resume preserves countdown and track offset', async t => {
  const original = globalThis.AudioContext;
  let context;
  globalThis.AudioContext = class {
    constructor() { context = this; this.currentTime = 10; this.state = 'running'; this.sources = []; }
    createGain() { return { gain: {}, connect() {} }; }
    createBufferSource() {
      const source = { start(...args) { this.startArgs = args; }, stop() { this.stopped = true; }, connect() {}, disconnect() {} };
      this.sources.push(source); return source;
    }
  };
  t.after(() => { if (original) globalThis.AudioContext = original; else delete globalThis.AudioContext; });
  const audio = createAudio(), buffer = {};
  await audio.ensure(); audio.startTrack(buffer);
  assert.equal(audio.songTime(), -3);
  context.currentTime = 11; audio.pause();
  assert.equal(context.sources[0].stopped, true);
  context.currentTime = 20;
  assert.equal(audio.songTime(), -2);
  audio.resume();
  assert.deepEqual(context.sources[1].startArgs, [22, 0]);
  context.currentTime = 25;
  assert.equal(audio.songTime(), 3);
  audio.pause(); context.currentTime = 80;
  assert.equal(audio.songTime(), 3);
  audio.resume();
  assert.deepEqual(context.sources[2].startArgs, [80, 3]);
  assert.equal(context.sources[2].buffer, buffer);
  context.currentTime = 81;
  assert.equal(audio.songTime(), 4);
  audio.pause(); audio.stop(); audio.resume();
  assert.equal(context.sources.length, 3, 'Stop must prevent resuming an old round');
  audio.startTrack(buffer);
  assert.equal(audio.songTime(), -3, 'Restart begins a fresh countdown');
});
