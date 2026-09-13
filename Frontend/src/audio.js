import { gestureById, playablePoses } from './poses.js';

export function createPracticeSoundTrigger(play) {
  let lastHit = -Infinity, lastPose = null;
  return ({ tracked, pose }, now) => {
    if (!tracked || !pose) return;
    if (pose === 'default') { lastPose = pose; return; }
    if (!gestureById.get(pose)?.playable || pose === lastPose || now - lastHit < 600) return;
    lastHit = now;
    lastPose = pose;
    play(pose);
  };
}

export function createAudio() {
  let context, master, source = null, startedAt = 0, trackBuffer = null, pausedTime = null;
  let hitLoadPromise = null;
  let volume = .55, analyser;
  const buffers = new Map(), hitBuffers = new Map(), hits = new Set();

  async function ensure() {
    if (!context) {
      context = new AudioContext(); master = context.createGain();
      master.gain.value = volume; master.connect(context.destination);
    }
    if (context.state !== 'running') await context.resume();
  }

  async function load(url) {
    await ensure();
    if (buffers.has(url)) return buffers.get(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error('This audio file could not load. Try again.');
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    buffers.set(url, buffer); return buffer;
  }

  function hit(poseId) {
    if (context?.state !== 'running') return;
    const gesture = gestureById.get(poseId), buffer = hitBuffers.get(gesture?.instrument);
    if (!buffer) return;
    const sample = context.createBufferSource(), gain = context.createGain();
    sample.buffer = buffer; gain.gain.value = .65;
    sample.connect(gain); gain.connect(master); hits.add(sample);
    sample.onended = () => { hits.delete(sample); sample.disconnect(); gain.disconnect(); };
    sample.start();
  }

  function stopTrack() {
    if (source) { source.stop(); source.disconnect(); source = null; }
  }

  function stopHits() {
    for (const sample of hits) { try { sample.stop(); } catch {} }
    hits.clear();
  }

  return {
    ensure, hit, load,
    getAnalyser() {
      if (!context) return null;
      if (!analyser) {
        analyser = context.createAnalyser(); analyser.fftSize = 256;
        analyser.smoothingTimeConstant = .8; master.connect(analyser);
      }
      return analyser;
    },
    async loadHits() {
      await ensure();
      if (!hitLoadPromise) {
        hitLoadPromise = Promise.all(playablePoses.map(async gesture => {
          const buffer = await load(gesture.sampleUrl).catch(() => {
            throw new Error(`The hit sound ${gesture.sampleUrl.split('/').pop().trim()} could not load. Try again.`);
          });
          hitBuffers.set(gesture.instrument, buffer);
        }));
      }
      await hitLoadPromise;
    },
    async decode(arrayBuffer) {
      await ensure();
      return context.decodeAudioData(arrayBuffer.slice(0));
    },
    mix(stemBuffers) {
      if (!stemBuffers.length) throw new Error('No audio stems were provided.');
      const sampleRate = stemBuffers[0].sampleRate;
      const channels = Math.max(...stemBuffers.map(buffer => buffer.numberOfChannels));
      const length = Math.max(...stemBuffers.map(buffer => buffer.length));
      if (stemBuffers.some(buffer => buffer.sampleRate !== sampleRate)) {
        throw new Error('The separated stems must use the same sample rate.');
      }
      const mixed = context.createBuffer(channels,length,sampleRate);
      let peak = 0;
      for (let channel = 0; channel < channels; channel++) {
        const output = mixed.getChannelData(channel);
        for (const stem of stemBuffers) {
          const input = stem.getChannelData(Math.min(channel,stem.numberOfChannels-1));
          for (let index = 0; index < input.length; index++) {
            output[index] += input[index];
            peak = Math.max(peak,Math.abs(output[index]));
          }
        }
      }
      if (peak > .99) {
        const gain = .99/peak;
        for (let channel = 0; channel < channels; channel++) {
          const output = mixed.getChannelData(channel);
          for (let index = 0; index < output.length; index++) output[index] *= gain;
        }
      }
      return mixed;
    },
    startTrack(buffer) {
      stopTrack(); stopHits(); trackBuffer = buffer; pausedTime = null;
      source = context.createBufferSource(); source.buffer = buffer; source.connect(master);
      startedAt = context.currentTime + 3; source.start(startedAt);
    },
    pause() {
      if (!source || pausedTime !== null) return;
      pausedTime = context.currentTime - startedAt;
      stopTrack(); stopHits();
    },
    resume() {
      if (pausedTime === null || !trackBuffer) return;
      source = context.createBufferSource(); source.buffer = trackBuffer; source.connect(master);
      startedAt = context.currentTime - pausedTime;
      source.start(context.currentTime + Math.max(0, -pausedTime), Math.max(0, pausedTime));
      pausedTime = null;
    },
    songTime: () => pausedTime ?? (context ? context.currentTime - startedAt : -3),
    setVolume(value) { volume = value; if (master) master.gain.setTargetAtTime(value, context.currentTime, .02); },
    stop() {
      stopTrack(); stopHits(); trackBuffer = null; pausedTime = null;
    },
    get running() { return context?.state === 'running'; },
  };
}
