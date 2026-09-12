export function createAudio() {
  let context, master, source = null, startedAt = 0;
  let volume = .55;
  const buffers = new Map(), hits = new Set();

  async function ensure() {
    if (!context) {
      context = new AudioContext(); master = context.createGain();
      master.gain.value = volume; master.connect(context.destination);
    }
    if (context.state !== 'running') await context.resume();
  }

  function hit(index) {
    if (context?.state !== 'running') return;
    const oscillator = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime([523.25, 659.25, 783.99, 1046.5][index], now);
    gain.gain.setValueAtTime(.12, now); gain.gain.exponentialRampToValueAtTime(.001, now + .14);
    oscillator.connect(gain); gain.connect(master); hits.add(oscillator);
    oscillator.onended = () => { hits.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(); oscillator.stop(now + .15);
  }

  function stopTrack() {
    if (source) { source.stop(); source.disconnect(); source = null; }
  }

  return {
    ensure, hit,
    async load(url) {
      if (buffers.has(url)) return buffers.get(url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('This track could not load. Try selecting it again.');
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      buffers.set(url, buffer); return buffer;
    },
    startTrack(buffer) {
      stopTrack();
      source = context.createBufferSource(); source.buffer = buffer; source.connect(master);
      startedAt = context.currentTime + 3; source.start(startedAt);
    },
    songTime: () => context ? context.currentTime - startedAt : -3,
    setVolume(value) { volume = value; if (master) master.gain.setTargetAtTime(value, context.currentTime, .02); },
    stop() {
      stopTrack();
      for (const oscillator of hits) oscillator.stop();
      hits.clear();
    },
    get running() { return context?.state === 'running'; },
  };
}
