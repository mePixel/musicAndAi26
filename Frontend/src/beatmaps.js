import { playablePoses as poses } from './poses.js';

const poseIds = new Set(poses.map(pose => pose.id));

export function normalizeGeneratedBeatmap(beatmap) {
  if (!beatmap || !Array.isArray(beatmap.events)) {
    throw new Error('Generated beatmap has no events.');
  }

  const notes = beatmap.events.map(event => {
    const time = Number(event.time);
    if (!Number.isFinite(time) || time < 0) {
      throw new Error('Generated beatmap contains an invalid timestamp.');
    }
    if (!poseIds.has(event.pose)) {
      throw new Error(`Generated beatmap references unknown pose "${event.pose}".`);
    }
    return { time, pose: event.pose };
  }).sort((a, b) => a.time - b.time);

  for (let index = 1; index < notes.length; index++) {
    if (notes[index].time === notes[index - 1].time && notes[index].pose === notes[index - 1].pose) {
      throw new Error('Generated beatmap contains duplicate notes.');
    }
  }

  return notes;
}

export async function loadSongNotes(song, fetchBeatmap = fetch) {
  if (!song.beatmapUrl) return { notes: song.notes, source: 'authored' };

  try {
    const response = await fetchBeatmap(song.beatmapUrl);
    if (!response.ok) throw new Error(`Could not load ${song.beatmapUrl}.`);
    return { notes: normalizeGeneratedBeatmap(await response.json()), source: 'generated' };
  } catch (error) {
    return { notes: song.notes, source: 'authored', error };
  }
}
