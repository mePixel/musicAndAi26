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
  const [songId,setSongId] = useState(songs[0].id);
  const [input,setInput] = useState('camera');
  const [screen,setScreen] = useState('songs');
  const [volume,setVolume] = useState(55);
  const [starting,setStarting] = useState(false);
  const [error,setError] = useState('');
  const song = songs.find(track => track.id === songId);
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

  if (screen === 'practice') return <Practice audio={audio} onExit={exitGame} />;

  if (screen === 'songs') return <PosterHome song={song} onSong={setSongId} input={input} onInput={setInput}
    onPlay={() => play()} onPractice={() => play('practice')} starting={starting} error={error}
    instructions={<Instructions />} volume={volume}
    onVolume={next => { setVolume(next); audio.setVolume(next / 100); }} />;

  return <div className="app">
    <BrandHeader><span className="session-label">Your body. Your instrument.</span></BrandHeader>
    <Game key={`${song.id}-${input}`} song={song} input={input} audio={audio} onExit={exitGame} onUseKeyboard={useKeyboard} />
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
