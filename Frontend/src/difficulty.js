import { playablePoses } from './poses.js';

export const GAME_MODES = {
  easy: {
    label: 'Easy',
    description: 'Two hip poses, sparse cues, and a very forgiving hit window.',
    minInterval: 2.4,
    timing: { perfect: .6, good: 1.2 },
  },
  medium: {
    label: 'Medium',
    description: 'All four poses at a playable demo pace with generous timing.',
    minInterval: 1.5,
    timing: { perfect: .45, good: .9 },
  },
  hard: {
    label: 'Hard',
    description: 'All four poses with tighter timing and full charts.',
    minInterval: 0,
    timing: { perfect: .200001, good: .420001 },
  },
};

const EASY_POSES = playablePoses.filter(pose => pose.difficulty <= 1).map(pose => pose.id);

export function timingForMode(mode) {
  return (GAME_MODES[mode] ?? GAME_MODES.hard).timing;
}

export function notesForMode(notes, mode) {
  if (mode === 'hard' || mode === 'normal' || !GAME_MODES[mode]) return notes;
  const selected = [];
  for (const note of [...notes].sort((a,b) => a.time-b.time)) {
    const previous = selected.at(-1);
    if (previous && note.time-previous.time < GAME_MODES[mode].minInterval) continue;
    selected.push(mode === 'easy' ? { ...note, pose:EASY_POSES[selected.length%EASY_POSES.length] } : note);
  }
  return selected;
}
