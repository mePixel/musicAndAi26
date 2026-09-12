const hitSamples = {
  rightHip: '/audio/hi hat (1).WAV',
  leftHip: '/audio/snare.WAV',
  rightChest: '/audio/ crash.mp3',
  leftChest: '/audio/bass.wav',
  doubleHips: '/audio/bass.wav' // if needed - change
};

export function createPracticeSoundTrigger(play) {
  let lastHit = -Infinity, lastPose = null;
  return ({ tracked, pose }, now) => {
    if (!tracked || !pose) return;
    if (pose === 'startStop') { lastPose = pose; return; }
    if (!Object.hasOwn(hitSamples, pose) || pose === lastPose || now - lastHit < 600) return;
    lastHit = now;
    lastPose = pose;
    play(pose);
  };
}

export function createAudio() {
  let context, master, source = null, startedAt = 0, trackBuffer = null, pausedTime = null;
  let volume = .55, analyser;
  const buffers = new Map(), hits = new Set();

  async function ensure() {
    if (!context) {
      context = new AudioContext(); master = context.createGain();
      master.gain.value = volume; master.connect(context.destination);
    }
    if (context.state !== 'running') await context.resume();
  }

  async function load(url) {
    if (buffers.has(url)) return buffers.get(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error('This audio file could not load. Try again.');
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    buffers.set(url, buffer); return buffer;
  }

  function hit(poseId) {
    if (context?.state !== 'running') return;
    const buffer = buffers.get(hitSamples[poseId]);
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
    for (const sample of hits) sample.stop();
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
      await Promise.all(Object.values(hitSamples).map(url => load(url).catch(() => {
        throw new Error(`The hit sound ${url.split('/').pop().trim()} could not load. Try again.`);
      })));
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
