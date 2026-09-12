import { useCallback, useEffect, useState } from 'react';
import { Camera, Circle, CircleDot, Play, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel, FieldContent, FieldDescription } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { PoseGuide } from './components/PoseGuide.jsx';
import { Game } from './Game.jsx';
import { createAudio } from './audio.js';
import { songs } from './songs.js';
import { formatTime } from '@/lib/utils';

function Instructions() {
  return <Dialog>
    <DialogTrigger render={<Button variant="outline" size="sm" />}>How to play</DialogTrigger>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>How to play</DialogTitle>
        <DialogDescription>Match each pose when its note reaches the hit line.</DialogDescription>
      </DialogHeader>
      <PoseGuide />
      <ol className="instructions">
        <li><strong>Choose a song.</strong> Pick Camera or Keyboard, then press Play.</li>
        <li><strong>Get in frame.</strong> Keep both shoulders, elbows, and hands visible. The preview is mirrored: your left is the left lane.</li>
        <li><strong>Move on the beat.</strong> Enter the pose as the note lands. Holding it won’t score again.</li>
      </ol>
      <p className="muted-copy">Perfect earns 100 points; Good earns 50. Misses reset the combo. In Keyboard mode, press 1–4 or tap the lane buttons. Escape returns to your songs.</p>
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
    document.title = screen === 'songs' ? 'Bodybeat — Choose a song' : `${song.title} — Bodybeat`;
  },[screen,song.title]);

  async function play() {
    setStarting(true); setError('');
    try {
      await audio.ensure();
      setScreen('game'); window.scrollTo(0,0);
    } catch { setError('Sound could not start. Please try Play again.'); }
    finally { setStarting(false); }
  }

  return <div className="app">
    <header className="site-header">
      <div className="header-inner"><span className="wordmark">Bodybeat</span>{screen === 'songs' ? <Instructions /> : null}</div>
    </header>
    {screen === 'songs' ? <main className="song-page">
      <div className="page-heading">
        <h1>Choose a song</h1>
        <p>Pick a track. Match the poses on the beat.</p>
      </div>
      <section aria-label="Song selection">
        <div className="track-head" aria-hidden="true"><span>#</span><span>Track</span><span>Tempo</span><span>Length</span></div>
        <ToggleGroup orientation="vertical" spacing={1} variant="track" size="track" className="w-full" value={[songId]} onValueChange={values => { if (values.length) setSongId(values[0]); }} aria-label="Choose a song">
          {songs.map((track,i) => <ToggleGroupItem key={track.id} value={track.id} className="song-row" aria-label={`Select ${track.title}`}>
            <span className="track-index">{songId === track.id ? <CircleDot /> : <Circle />}<span>{String(i+1).padStart(2,'0')}</span></span>
            <span className="track-name"><strong>{track.title}</strong><span>{track.mood}</span></span>
            <span className="track-tempo">{track.bpm}<span> BPM</span></span><span className="track-length">{formatTime(track.duration)}</span>
          </ToggleGroupItem>)}
        </ToggleGroup>
      </section>
      <Separator />
      <section className="play-setup" aria-label="Play setup">
        <FieldGroup className="flex-1">
          <Field orientation="horizontal">
            <FieldLabel id="controls-label">Controls</FieldLabel>
            <FieldContent>
              <ToggleGroup spacing={0} variant="outline" value={[input]} onValueChange={values => { if (values.length) setInput(values[0]); }} aria-labelledby="controls-label">
                <ToggleGroupItem value="camera">Camera</ToggleGroupItem><ToggleGroupItem value="keyboard">Keyboard</ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>{input === 'camera' ? 'Camera permission is requested when you play.' : 'Press 1–4, or tap the lane buttons.'}</FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
        <Button size="lg" className="play-song" onClick={play} disabled={starting}>
          {starting ? <Spinner data-icon="inline-start" /> : <Play data-icon="inline-start" />}<span>{starting ? 'Starting…' : `Play ${song.title}`}</span>
        </Button>
      </section>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <Separator />
      <section className="learn-poses" aria-labelledby="pose-heading">
        <h2 id="pose-heading">Four poses. One beat.</h2>
        <PoseGuide />
        <p>Make the pose as its note reaches the line.</p>
      </section>
    </main> : <Game key={`${song.id}-${input}`} song={song} input={input} audio={audio} onExit={exitGame} onUseKeyboard={useKeyboard} />}
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
