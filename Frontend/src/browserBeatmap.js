import { playablePoses as poses } from './poses.js';

const DIFFICULTY = {
  easy: { density: .65, fallbackMinInterval: .45, subdivision: 1 },
  medium: { density: .95, fallbackMinInterval: .24, subdivision: 2 },
  hard: { density: 1, fallbackMinInterval: .12, subdivision: 4 },
};
const FIRST_NOTE_TIME = .08;
const PROTECTED_INTRO_SECONDS = 8;

export function generateBrowserBeatmap(buffer, { difficulty = 'medium', seed = 42, stems = null } = {}) {
  const config = DIFFICULTY[difficulty] ?? DIFFICULTY.easy;
  const analysisBuffer = stems?.drums ?? buffer;
  const samples = monoSamples(analysisBuffer);
  const candidates = stems?.drums
    ? drumStemCandidates(samples,analysisBuffer.sampleRate,buffer.duration)
    : poses.flatMap(pose => instrumentCandidates(samples,analysisBuffer.sampleRate,buffer.duration,pose));
  const merged = mergeClose(candidates,.1);
  const grid = estimateGrid(merged,config.subdivision);
  const quantized = grid ? mergeClose(quantizeEvents(merged,grid),grid.step*.45) : merged;
  const selected = chooseByDensity(quantized,config,buffer.duration,grid);
  const events = selected.map((event,id) => ({
    id,
    time:round(event.time,6),
    sourceTime:round(event.sourceTime ?? event.time,6),
    gridIndex:grid ? Math.round((event.time-grid.phase)/grid.step) : null,
    pose:event.pose,
    instrument:event.instrument,
    strength:round(event.strength,3),
  }));
  return {
    version: 1,
    metadata: {
      title: 'Uploaded song',
      duration: round(buffer.duration),
      bpm: round(grid?.bpm ?? estimateBpm(selected),3),
      difficulty,
      seed,
      poseCount: poses.length,
      generatedIn: 'browser',
      timingSource: stems?.drums ? 'separated-drums-stem-onsets' : 'instrument-filter-onsets',
      stemNames: stems ? Object.keys(stems).sort() : [],
      instruments: poses.map(pose => pose.instrument),
      quantized: Boolean(grid),
      gridSubdivision: grid?.subdivision ?? null,
      gridStepSeconds: grid ? round(grid.step,9) : null,
      gridPhaseSeconds: grid ? round(grid.phase,9) : null,
      gridConfidence: grid ? round(grid.confidence,3) : null,
    },
    poses: poses.map(pose => pose.id),
    events,
  };
}

export function beatmapToNotes(beatmap) {
  const poseIds = new Set(poses.map(pose => pose.id));
  return beatmap.events.map(event => {
    const time = Number(event.time);
    if (!Number.isFinite(time) || time < 0) throw new Error('Generated chart has an invalid time.');
    if (!poseIds.has(event.pose)) throw new Error(`Generated chart has unknown pose "${event.pose}".`);
    return { time, pose: event.pose };
  }).sort((a, b) => a.time - b.time);
}

function monoSamples(buffer) {
  const output = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index++) output[index] += data[index] / buffer.numberOfChannels;
  }
  return output;
}

function instrumentCandidates(samples,sampleRate,duration,pose) {
  const filtered = filterInstrument(samples,sampleRate,pose.filter);
  return instrumentCandidatesFromFiltered(filtered,samples,sampleRate,duration,pose);
}

function instrumentCandidatesFromFiltered(filtered,samples,sampleRate,duration,pose) {
  const analysis = analyzeTransients(filtered,sampleRate,pose.filter);
  return buildCandidates(analysis,filtered,samples,sampleRate,duration,pose);
}

function drumStemCandidates(samples,sampleRate,duration) {
  const bands = poses.map(pose => ({ pose, samples:filterInstrument(samples,sampleRate,pose.filter) }));
  const detected = bands.flatMap(band => instrumentCandidatesFromFiltered(
    band.samples,samples,sampleRate,duration,band.pose,
  ));
  const clusters = clusterEvents(detected,.09);
  const bandByInstrument = new Map(bands.map(band => [band.pose.instrument,band]));

  return normalizeStrengths(clusters.map(cluster => {
    const centerTime = median(cluster.map(event => event.time));
    const classified = classifyDrumHit(samples,sampleRate,centerTime,bandByInstrument);
    const matching = cluster
      .filter(event => event.instrument === classified.pose.instrument)
      .sort((a,b) => (b.score ?? b.strength)-(a.score ?? a.strength));
    const source = matching[0] ?? [...cluster].sort((a,b) => (b.score ?? b.strength)-(a.score ?? a.strength))[0];
    const strength = Math.max(...cluster.map(event => event.strength));
    return {
      time:source.time,
      strength,
      score:strength*(.5+classified.ratio),
      pose:classified.pose.id,
      instrument:classified.pose.instrument,
    };
  }));
}

function classifyDrumHit(fullSamples,sampleRate,time,bandByInstrument) {
  const center = Math.round(time*sampleRate);
  const window = 2048;
  const start = center-Math.floor(window/8);
  const fullEnergy = blockEnergySafe(fullSamples,start,window) || 1e-8;
  const ratio = instrument => blockEnergySafe(bandByInstrument.get(instrument).samples,start,window)/fullEnergy;
  const ratios = {
    bass:ratio('bass'),
    snare:ratio('snare'),
    hiHat:ratio('hiHat'),
    crash:ratio('crash'),
  };
  const highSamples = bandByInstrument.get('hiHat').samples;
  const highEarly = blockEnergySafe(highSamples,center,2048) || 1e-8;
  // This 70-160 ms tail stays clear of the next eighth note up to 180 BPM.
  const sustain = blockEnergySafe(highSamples,center+3072,4096)/highEarly;
  const byInstrument = instrument => bandByInstrument.get(instrument).pose;
  const crash = byInstrument('crash'), hiHat = byInstrument('hiHat');
  const snare = byInstrument('snare'), bass = byInstrument('bass');

  if (ratios.hiHat >= crash.filter.minClassificationRatio &&
      ratios.crash >= crash.filter.minClassificationRatio &&
      ratios.crash >= ratios.snare*crash.filter.minDominance &&
      sustain >= crash.filter.minSustain) {
    return { pose:crash,ratio:ratios.crash };
  }
  if (ratios.hiHat >= hiHat.filter.minBandRatio &&
      ratios.hiHat >= ratios.snare*hiHat.filter.minDominance) {
    return { pose:hiHat,ratio:ratios.hiHat };
  }
  if (ratios.snare >= snare.filter.minBandRatio &&
      ratios.snare >= ratios.bass*snare.filter.minRelativeToLow) {
    return { pose:snare,ratio:ratios.snare };
  }
  if (ratios.bass >= bass.filter.minClassificationRatio) return { pose:bass,ratio:ratios.bass };

  const fallback = [bass,snare,hiHat].sort((a,b) => ratios[b.instrument]-ratios[a.instrument])[0];
  return { pose:fallback,ratio:ratios[fallback.instrument] };
}

function clusterEvents(events,windowSeconds) {
  const clusters = [];
  for (const event of [...events].sort((a,b) => a.time-b.time)) {
    const cluster = clusters.at(-1);
    if (!cluster || event.time-cluster[0].time > windowSeconds) clusters.push([event]);
    else cluster.push(event);
  }
  return clusters;
}

function median(values) {
  const ordered = [...values].sort((a,b) => a-b);
  const middle = Math.floor(ordered.length/2);
  return ordered.length%2 ? ordered[middle] : (ordered[middle-1]+ordered[middle])/2;
}

function filterInstrument(samples,sampleRate,filter) {
  if (filter.type === 'lowpass') {
    return applyTwice(samples,value => biquad(value,sampleRate,filter.highHz,'lowpass'));
  }
  if (filter.type === 'highpass') {
    return applyTwice(samples,value => biquad(value,sampleRate,filter.lowHz,'highpass'));
  }
  const aboveLow = applyTwice(samples,value => biquad(value,sampleRate,filter.lowHz,'highpass'));
  return applyTwice(aboveLow,value => biquad(value,sampleRate,filter.highHz,'lowpass'));
}

function applyTwice(samples,filter) {
  return filter(filter(samples));
}

function biquad(samples,sampleRate,cutoff,type) {
  const omega = 2 * Math.PI * cutoff / sampleRate;
  const cosine = Math.cos(omega), alpha = Math.sin(omega) / (2 * Math.SQRT1_2);
  const a0 = 1 + alpha;
  const highpass = type === 'highpass';
  const b0 = (1 + (highpass ? cosine : -cosine)) / 2 / a0;
  const b1 = (highpass ? -(1 + cosine) : 1 - cosine) / a0;
  const b2 = b0;
  const a1 = -2 * cosine / a0;
  const a2 = (1 - alpha) / a0;
  const output = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let index = 0; index < samples.length; index++) {
    const x0 = samples[index];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    output[index] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return output;
}

function analyzeTransients(samples,sampleRate,filter) {
  const frame = filter.frame, hop = filter.hop;
  const energy = [];
  for (let start = 0; start + frame < samples.length; start += hop) {
    let sum = 0;
    for (let index = start; index < start + frame; index++) {
      const sample = samples[index];
      sum += sample * sample;
    }
    energy.push(Math.log1p(80 * Math.sqrt(sum / frame)));
  }
  const novelty = energy.map((value, index) => {
    if (!index) return 0;
    const earlier = energy[Math.max(0, index - 3)];
    return Math.max(0, value - earlier);
  });
  return { energy, novelty, hopSeconds: hop / sampleRate, frameSeconds: frame / sampleRate };
}

function buildCandidates(analysis,filteredSamples,fullSamples,sampleRate,duration,pose) {
  const noveltySorted = [...analysis.novelty].sort((a, b) => a - b);
  const energySorted = [...analysis.energy].sort((a, b) => a - b);
  const noveltyFloor = noveltySorted[Math.floor(noveltySorted.length * .58)] ?? 0;
  const energyFloor = energySorted[Math.floor(energySorted.length * .18)] ?? 0;
  const radius = Math.max(4, Math.round(.35 / analysis.hopSeconds));
  const sums = prefixSums(analysis.novelty);
  const squareSums = prefixSums(analysis.novelty.map(value => value * value));
  const candidates = [];
  for (let index = 2; index < analysis.novelty.length - 2; index++) {
    const start = Math.max(0, index - radius), end = Math.min(analysis.novelty.length, index + radius + 1);
    const count = end - start;
    const mean = (sums[end] - sums[start]) / count;
    const variance = Math.max(0, (squareSums[end] - squareSums[start]) / count - mean * mean);
    const novelty = analysis.novelty[index];
    const threshold = Math.max(noveltyFloor * .55, mean + Math.sqrt(variance) * .7);
    if (novelty <= threshold || analysis.energy[index] < energyFloor) continue;
    if (novelty < analysis.novelty[index - 1] || novelty < analysis.novelty[index + 1]) continue;
    const approximateTime = index * analysis.hopSeconds + analysis.frameSeconds / 2;
    const centerSample = Math.round(approximateTime * sampleRate);
    const bandRatio = bandEnergyRatio(filteredSamples,fullSamples,centerSample,Math.max(2048,pose.filter.frame));
    if (bandRatio < pose.filter.minBandRatio) continue;
    const time = refineOnsetTime(filteredSamples,sampleRate,approximateTime);
    if (time >= FIRST_NOTE_TIME && time <= duration - .3) {
      candidates.push({ time, strength:novelty, score:novelty*(.5+bandRatio), pose:pose.id, instrument:pose.instrument });
    }
  }
  return normalizeStrengths(mergeClose(candidates,.11));
}

function bandEnergyRatio(filteredSamples,fullSamples,center,length) {
  const start = Math.max(0, Math.min(fullSamples.length - length, center - Math.floor(length / 2)));
  const fullEnergy = blockEnergy(fullSamples, start, length);
  if (fullEnergy < 1e-6) return 0;
  return blockEnergy(filteredSamples,start,length)/fullEnergy;
}

function prefixSums(values) {
  const output = new Float64Array(values.length + 1);
  for (let index = 0; index < values.length; index++) output[index + 1] = output[index] + values[index];
  return output;
}

function refineOnsetTime(samples, sampleRate, approximateTime) {
  const block = 128;
  const center = Math.round(approximateTime * sampleRate);
  const searchStart = Math.max(block, center - 1024);
  const searchEnd = Math.min(samples.length - block, center + 512);
  let previousEnergy = blockEnergy(samples, searchStart - block, block);
  let bestSample = center, bestRise = -Infinity;
  for (let start = searchStart; start <= searchEnd; start += block) {
    const energy = blockEnergy(samples, start, block);
    const rise = energy - previousEnergy;
    if (rise > bestRise) { bestRise = rise; bestSample = start; }
    previousEnergy = energy;
  }
  return bestSample / sampleRate;
}

function blockEnergy(samples, start, length) {
  let sum = 0;
  for (let index = start; index < start + length; index++) sum += samples[index] * samples[index];
  return Math.sqrt(sum / length);
}

function blockEnergySafe(samples,start,length) {
  const safeStart = Math.max(0,Math.min(samples.length-length,start));
  return blockEnergy(samples,safeStart,Math.min(length,samples.length));
}

function normalizeStrengths(events) {
  const strengths = events.map(event => event.strength).sort((a, b) => a - b);
  const scale = strengths[Math.floor(strengths.length * .95)] || strengths.at(-1) || 1;
  return events.map(event => {
    const strength = Math.min(1,event.strength/scale);
    return { ...event, strength, score:(event.score ?? event.strength)/scale };
  });
}

function mergeClose(events, windowSeconds) {
  const merged = [];
  for (const event of events.sort((a, b) => a.time - b.time)) {
    const previous = merged.at(-1);
    if (!previous || event.time - previous.time > windowSeconds) merged.push(event);
    else if ((event.score ?? event.strength) > (previous.score ?? previous.strength)) merged[merged.length - 1] = event;
  }
  return merged;
}

function estimateGrid(events,subdivision) {
  const ordered = [...events].sort((a,b) => a.time-b.time);
  if (ordered.length < 3) return null;
  const tempoHint = gapTempoHint(ordered);
  let bestTempo = { bpm:0,score:-Infinity,phase:0,distance:Infinity };
  for (let bpm = 70; bpm <= 180; bpm += .25) {
    const candidate = scoreTempo(ordered,bpm);
    bestTempo = preferTempo(bestTempo,{ bpm, ...candidate, distance:Math.abs(bpm-tempoHint) });
  }
  const coarseBpm = bestTempo.bpm;
  for (let bpm = coarseBpm-.3; bpm <= coarseBpm+.3; bpm += .01) {
    const candidate = scoreTempo(ordered,bpm);
    bestTempo = preferTempo(bestTempo,{ bpm, ...candidate, distance:Math.abs(bpm-tempoHint) });
  }
  const beatInterval = 60/bestTempo.bpm;
  const step = beatInterval/subdivision;
  const phase = bestGridPhase(ordered,step).phase;
  return {
    beatInterval,
    bpm:bestTempo.bpm,
    subdivision,
    step,
    phase,
    confidence:bestTempo.score,
  };
}

function preferTempo(current,candidate) {
  if (candidate.score > current.score+.002) return candidate;
  if (Math.abs(candidate.score-current.score) <= .002 && candidate.distance < current.distance) return candidate;
  return current;
}

function gapTempoHint(events) {
  const gaps = [];
  for (let index = 1; index < events.length; index++) {
    const gap = events[index].time-events[index-1].time;
    if (gap >= .18 && gap <= 2) gaps.push(gap);
  }
  if (!gaps.length) return 120;
  gaps.sort((a,b) => a-b);
  let interval = gaps[Math.floor(gaps.length/2)];
  while (interval < .34) interval *= 2;
  while (interval > .75) interval /= 2;
  return 60/interval;
}

function scoreTempo(events,bpm) {
  // Estimate tempo against an eighth-note pulse regardless of chart difficulty.
  // This lets sparse kick/snare anchors and offbeat cymbals vote on one grid.
  const pulseStep = 30/bpm;
  return bestGridPhase(events,pulseStep);
}

function bestGridPhase(events,step) {
  const representatives = [...events]
    .sort((a,b) => (b.score ?? b.strength)-(a.score ?? a.strength))
    .slice(0,32);
  const phases = [...new Set(representatives.map(event => round(positiveModulo(event.time,step),6)))];
  const totalWeight = events.reduce((sum,event) => sum+(event.score ?? event.strength),0) || 1;
  let best = { phase:phases[0] ?? 0,score:0 };
  for (const phase of phases) {
    let score = 0;
    for (const event of events) {
      const distance = distanceToGrid(event.time,step,phase);
      const normalized = distance/(step*.12);
      score += (event.score ?? event.strength)*Math.exp(-.5*normalized*normalized);
    }
    score /= totalWeight;
    if (score > best.score) best = { phase,score };
  }
  return best;
}

function quantizeEvents(events,grid) {
  return events.map(event => ({
    ...event,
    sourceTime:event.time,
    time:grid.phase+Math.round((event.time-grid.phase)/grid.step)*grid.step,
  })).filter(event => event.time >= FIRST_NOTE_TIME);
}

function distanceToGrid(time,step,phase) {
  const offset = positiveModulo(time-phase+step/2,step)-step/2;
  return Math.abs(offset);
}

function positiveModulo(value,divisor) {
  return ((value%divisor)+divisor)%divisor;
}

function chooseByDensity(events, config, duration, grid) {
  const target = Math.max(4, Math.ceil(events.length * config.density));
  // Quantized adjacent slots must remain eligible at every tempo. A fixed
  // seconds-based gap dropped 110 BPM eighth-note hi-hats in medium mode.
  const minInterval = grid ? grid.step*.8 : config.fallbackMinInterval;
  const selected = [];
  const add = event => {
    if (event.time < FIRST_NOTE_TIME || event.time > duration - .3) return false;
    if (!selected.every(existing => Math.abs(existing.time - event.time) >= minInterval)) return false;
    selected.push(event);
    return true;
  };

  for (const event of events.filter(event => event.time <= PROTECTED_INTRO_SECONDS).sort((a, b) => a.time - b.time)) {
    add(event);
  }

  for (const event of [...events].sort((a,b) => (b.score ?? b.strength)-(a.score ?? a.strength) || a.time-b.time)) {
    if (selected.length >= target) break;
    add(event);
  }
  return selected.sort((a, b) => a.time - b.time);
}

function estimateBpm(events) {
  const gaps = [];
  for (let index = 1; index < events.length; index++) {
    const gap = events[index].time - events[index - 1].time;
    if (gap >= .3 && gap <= 2) gaps.push(gap);
  }
  if (!gaps.length) return 0;
  gaps.sort((a, b) => a - b);
  let bpm = 60 / gaps[Math.floor(gaps.length / 2)];
  while (bpm < 80) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return bpm;
}

function round(value, places = 3) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
