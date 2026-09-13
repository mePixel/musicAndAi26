import { useCallback, useEffect, useState } from 'react';
import { Camera, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { PoseGuide } from './components/PoseGuide.jsx';
import { PosterHome } from './components/PosterHome.jsx';
import { BrandHeader } from './components/BrandHeader.jsx';
import { Game } from './Game.jsx';
import { Practice } from './Practice.jsx';
import { createAudio } from './audio.js';
import { songs } from './songs.js';
import { beatmapToNotes, generateBrowserBeatmap } from './browserBeatmap.js';

const REQUIRED_STEMS = ['drums','bass','other','vocals'];

function stemName(file) {
  return REQUIRED_STEMS.find(name => new RegExp(`_${name}\\.[^.]+$`,'i').test(file.name));
}

function titleFromStem(file) {
  return file.name.replace(/_(drums|bass|other|vocals)\.[^.]+$/i,'') || 'Uploaded stems';
}

function Instructions() {
  return <Dialog>
    <DialogTrigger render={<Button variant="outline" size="sm" />}>How to play</DialogTrigger>
    <DialogContent className="game-instructions sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>How to play</DialogTitle>
        <DialogDescription>Match each pose when its cue reaches a ring beside your character.</DialogDescription>
      </DialogHeader>
      <PoseGuide />
      <ol className="instructions">
        <li><strong>Choose a song.</strong> Pick Camera or Keyboard, then press Play.</li>
        <li><strong>Get in frame.</strong> Keep both shoulders, elbows, and hands visible. Your character mirrors your movement. Hand cues arrive from the upper corners; hip cues from the lower corners.</li>
        <li><strong>Move on the beat.</strong> Enter the pose as the note lands. Holding it won’t score again.</li>
      </ol>
      <p className="muted-copy">Perfect earns 100 points; Good earns 50. Misses reset the combo. In Keyboard mode, press 1–4 or tap the corner buttons. Escape returns to your songs.</p>
      <DialogFooter><DialogClose render={<Button />}>Got it</DialogClose></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function App() {
  const [audio] = useState(createAudio);
  const [tracks,setTracks] = useState(() => [...songs]);
  const [songId,setSongId] = useState(songs[0].id);
  const [input,setInput] = useState('camera');
  const [mode,setMode] = useState('easy');
  const [screen,setScreen] = useState('songs');
  const [volume,setVolume] = useState(55);
  const [starting,setStarting] = useState(false);
  const [uploading,setUploading] = useState(false);
  const [error,setError] = useState('');
  const song = tracks.find(track => track.id === songId) ?? tracks[0];
  const exitGame = useCallback(() => { setScreen('songs'); window.scrollTo(0,0); },[]);
  const useKeyboard = useCallback(() => setInput('keyboard'),[]);
  useEffect(() => {
    document.title = screen === 'songs' ? 'Bodybeat — Choose a song' : screen === 'practice' ? 'Practice — Bodybeat' : `${song.title} — Bodybeat`;
  },[screen,song.title]);

  async function play(nextScreen = 'game') {
    setStarting(true); setError('');
    try {
      await audio.ensure();
      setScreen(nextScreen); window.scrollTo(0,0);
    } catch { setError('Sound could not start. Please try again.'); }
    finally { setStarting(false); }
  }

  async function uploadStemFolder(event) {
    const files = [...(event.target.files ?? [])];
    if (!files.length) return;
    setUploading(true); setError('');
    try {
      await audio.ensure();
      const stemFiles = new Map();
      for (const file of files) {
        const name = stemName(file);
        if (name && !stemFiles.has(name)) stemFiles.set(name,file);
      }
      const missing = REQUIRED_STEMS.filter(name => !stemFiles.has(name));
      if (missing.length) throw new Error(`This folder is missing: ${missing.map(name => `${name}.wav`).join(', ')}.`);
      const decodedEntries = await Promise.all(REQUIRED_STEMS.map(async name => [name,await audio.decode(await stemFiles.get(name).arrayBuffer())]));
      const stems = Object.fromEntries(decodedEntries);
      const durationSpread = Math.max(...decodedEntries.map(([,stem]) => stem.duration))-Math.min(...decodedEntries.map(([,stem]) => stem.duration));
      if (durationSpread > .1) throw new Error('The separated stems do not have matching durations.');
      const buffer = audio.mix(decodedEntries.filter(([name]) => name !== 'drums').map(([,stem]) => stem));
      if (buffer.duration < 5) throw new Error('Choose a song that is at least five seconds long.');
      const beatmap = generateBrowserBeatmap(buffer, { difficulty:'medium', seed:42, stems });
      const notes = beatmapToNotes(beatmap);
      if (notes.length < 4) throw new Error('Not enough drum-like impacts were found. Try a track with clearer percussion.');
      const drumsFile = stemFiles.get('drums');
      const uploaded = {
        id:`upload-${Date.now()}`,
        title:titleFromStem(drumsFile),
        bpm:beatmap.metadata.bpm,
        duration:buffer.duration,
        mood:'Drumless backing with poses generated from the separated drums.',
        color:'#8bd6c2',
        buffer,
        notes,
        generated:true,
      };
      setTracks([...songs,uploaded]); setSongId(uploaded.id);
    } catch (uploadError) {
      setError(uploadError.message || 'This song could not be analyzed.');
    } finally {
      event.target.value = ''; setUploading(false);
    }
  }

  if (screen === 'practice') return <Practice audio={audio} onExit={exitGame} />;

  if (screen === 'songs') return <PosterHome song={song} tracks={tracks} onSong={setSongId} input={input} onInput={setInput}
    mode={mode} onMode={setMode} onUpload={uploadStemFolder} uploading={uploading}
    onPlay={() => play()} onPractice={() => play('practice')} starting={starting} error={error}
    instructions={<Instructions />} volume={volume}
    onVolume={next => { setVolume(next); audio.setVolume(next / 100); }} />;

  return <div className="app">
    <BrandHeader><span className="session-label">Your body. Your instrument.</span></BrandHeader>
    <Game key={`${song.id}-${input}-${mode}`} song={song} input={input} mode={mode} audio={audio} onExit={exitGame} onUseKeyboard={useKeyboard} />
    <footer className="site-footer">
      <div className="footer-inner">
        <p><Camera aria-hidden="true" />Camera video stays on your device.</p>
        <FieldGroup className="volume-field">
          <Field orientation="horizontal">
            <FieldLabel id="volume-label"><Volume2 aria-hidden="true" /><span className="sr-only">Volume</span></FieldLabel>
            <Slider aria-labelledby="volume-label" value={[volume]} max={100} step={1} onValueChange={value => { const next = Array.isArray(value) ? value[0] : value; setVolume(next); audio.setVolume(next/100); }} />
            <output className="volume-value">{volume}%</output>
          </Field>
        </FieldGroup>
      </div>
    </footer>
  </div>;
}
