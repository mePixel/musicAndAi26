import { playablePoses } from './poses.js';

export const GAME_MODES = {
  easy: {
    label: 'Easy',
    description: 'Two hip poses, fewer notes, bigger timing window.',
    minInterval: .9,
    timing: { perfect: .22, good: .45 },
  },
  medium: {
    label: 'Medium',
    description: 'All four poses and all notes, with a slightly bigger timing window.',
    minInterval: 0,
    timing: { perfect: .18, good: .36 },
  },
  hard: {
    label: 'Hard',
    description: 'All four poses with standard timing.',
    minInterval: 0,
    timing: { perfect: .150001, good: .300001 },
  },
};

const EASY_POSES = playablePoses.filter(pose => pose.difficulty <= 1).map(pose => pose.id);

export function timingForMode(mode) {
  return (GAME_MODES[mode] ?? GAME_MODES.hard).timing;
}

export function notesForMode(notes, mode) {
  if (mode === 'hard' || mode === 'medium' || mode === 'normal' || !GAME_MODES[mode]) return notes;
  const selected = [];
  for (const note of [...notes].sort((a,b) => a.time-b.time)) {
    const previous = selected.at(-1);
    if (previous && note.time-previous.time < GAME_MODES[mode].minInterval) continue;
    selected.push(mode === 'easy' ? { ...note, pose:EASY_POSES[selected.length%EASY_POSES.length] } : note);
  }
  return selected;
}
