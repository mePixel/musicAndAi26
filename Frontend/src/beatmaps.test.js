import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { songs } from './songs.js';
import { loadSongNotes, normalizeGeneratedBeatmap } from './beatmaps.js';

test('normalizes generated beatmap events into frontend notes', () => {
  const notes = normalizeGeneratedBeatmap({
    events: [
      { time: 4.5, pose: 'rightHip', strength: 0.8 },
      { time: 3, pose: 'leftHip', strength: 1 },
    ],
  });

  assert.deepEqual(notes, [
    { time: 3, pose: 'leftHip' },
    { time: 4.5, pose: 'rightHip' },
  ]);
});

test('rejects generated beatmaps with unknown poses', () => {
  assert.throws(
    () => normalizeGeneratedBeatmap({ events: [{ time: 3, pose: 'spin' }] }),
    /unknown pose/,
  );
});

test('loads generated song notes and falls back to authored notes on failure', async () => {
  const song = {
    beatmapUrl: '/beatmaps/demo.json',
    notes: [{ time: 3, pose: 'leftHip' }],
  };
  const generated = await loadSongNotes(song, async () => ({
    ok: true,
    async json() { return { events: [{ time: 4, pose: 'rightHip' }] }; },
  }));
  const fallback = await loadSongNotes(song, async () => ({ ok: false }));

  assert.equal(generated.source, 'generated');
  assert.deepEqual(generated.notes, [{ time: 4, pose: 'rightHip' }]);
  assert.equal(fallback.source, 'authored');
  assert.deepEqual(fallback.notes, song.notes);
  assert.ok(fallback.error);
});

<<<<<<< HEAD
test('both bundled generated charts load with current playable pose IDs', async () => {
  for (const song of songs.filter(song => song.beatmapUrl)) {
=======
test('bundled generated charts load with current playable pose IDs', async () => {
  const generatedSongs = songs.filter(song => song.beatmapUrl);
  assert.ok(generatedSongs.length > 0);
  for (const song of generatedSongs) {
>>>>>>> origin/add-pasted-songs
    const beatmap = JSON.parse(await readFile(new URL(`../public${song.beatmapUrl}`, import.meta.url), 'utf8'));
    const result = await loadSongNotes(song, async () => ({ ok: true, json: async () => beatmap }));
    assert.equal(result.source, 'generated', song.id);
    assert.equal(result.error, undefined, song.id);
    assert.equal(result.notes.length, beatmap.events.length, song.id);
    assert.ok(result.notes.length > 0, song.id);
  }
});

test('Feel Good Inc. is bundled with playable cues and a matching full-length WAV', async () => {
  const song = songs.find(song => song.id === 'feel-good-inc');
  assert.ok(song.generated);
  assert.ok(song.notes.length > 4);
  assert.ok(song.notes.every(note => note.time >= 0 && note.time < song.duration));
  assert.ok(song.notes.every((note, index) => index === 0 || note.time >= song.notes[index - 1].time));
  const wav = await readFile(new URL(`../public${song.audioUrl}`, import.meta.url));
  assert.equal(wav.toString('ascii',0,4),'RIFF');
  assert.equal(wav.toString('ascii',8,12),'WAVE');
  // Prepared PCM WAV: its data length and byte rate must match the chart duration.
  const duration = wav.readUInt32LE(40) / wav.readUInt32LE(28);
  assert.ok(Math.abs(duration - song.duration) < .01);
});
