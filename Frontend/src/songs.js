import { playablePoses as poses } from './poses.js';
import feelGoodBeatmap from './feel-good-inc.json' with { type: 'json' };
import { beatmapToNotes } from './browserBeatmap.js';

// Authored in seconds against the bundled original recordings.
const originalSongs = [
  { id: 'first-groove', title: 'First Groove', bpm: 96, duration: 40, mood: 'Warm bass. Easy moves.',
    color: '#d9ff70', audioUrl: '/audio/first-groove.mp3', beatmapUrl: '/beatmaps/first-groove.generated.json',
    notes: [[3.75,0],[5,1],[6.25,2],[7.5,3],[10,0],[11.25,2],[12.5,1],[13.75,3],
      [15,0],[16.25,1],[17.5,3],[18.75,2],[21.25,1],[22.5,0],[23.75,2],[25,3],
      [26.25,1],[27.5,2],[28.75,0],[30,3],[32.5,0],[33.75,1],[35,2],[36.25,3],[37.5,2]] },
  { id: 'disco-circuit', title: 'Disco Circuit', bpm: 120, duration: 36, mood: 'A little faster. A little funkier.',
    color: '#bea7ff', audioUrl: '/audio/disco-circuit.mp3', beatmapUrl: '/beatmaps/disco-circuit.generated.json',
    notes: [[3,0],[4,1],[5,3],[6,2],[7,0],[8,3],[9,1],[10,2],
      [12,3],[13,0],[14,2],[15,1],[16,0],[17,3],[18,2],[19,1],
      [21,0],[22,1],[23,2],[24,3],[25,2],[26,0],[27,3],[28,1],
      [30,2],[31,3],[32,0],[33,1],[34,2]] },
].map(song => ({ ...song, notes: song.notes.map(([time, index]) => ({ time, pose: poses[index].id })) }));

// Prepared from the supplied stems with the same chart generator as uploads.
export const songs = [...originalSongs, {
  id: 'feel-good-inc',
  title: 'Gorillaz — Feel Good Inc.',
  bpm: feelGoodBeatmap.metadata.bpm,
  duration: feelGoodBeatmap.metadata.duration,
  mood: 'Minimal Sounds version · drumless backing.',
  color: '#8bd6c2',
  audioUrl: '/audio/feel-good-inc-backing.wav',
  notes: beatmapToNotes(feelGoodBeatmap),
  generated: true,
}];
