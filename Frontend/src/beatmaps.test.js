import test from 'node:test';
import assert from 'node:assert/strict';
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
