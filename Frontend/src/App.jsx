import { useCallback, useEffect, useState } from 'react';
import { AudioLines, Camera, Check, Keyboard, Play, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel, FieldContent, FieldDescription } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { PoseGuide } from './components/PoseGuide.jsx';
import { PoseDancer } from './components/PoseDancer.jsx';
import { Landscape } from './components/Landscape.jsx';
import { Game } from './Game.jsx';
import { Practice } from './Practice.jsx';
import { createAudio } from './audio.js';
import { songs } from './songs.js';
import { TrackDisplay } from './components/TrackDisplay.jsx';
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

  return <div className="app">
    <Landscape audio={audio} />
    <header className="site-header">
      <div className="header-inner"><span className="wordmark"><AudioLines aria-hidden="true" />bodybeat</span>{screen === 'songs' ? <Instructions /> : null}</div>
    </header>
    {screen === 'songs' ? <main className="song-page record-page">
      <div className="record-stage"><PoseDancer /></div>
      <div className="page-heading">
        <h1>Your body.<br /><span>Your beat.</span></h1>
        <p>Pick a track. Get on your feet.<br />Move to the music.</p>
      </div>
      <div className="sampler">
      <div className="sampler-top">
      <section className="song-library" aria-label="Song selection">
        <div className="library-label"><h2>Tracks</h2><span>{songs.length} songs</span></div>
        <ToggleGroup orientation="vertical" spacing={2} variant="track" size="track" className="w-full" value={[songId]} onValueChange={values => { if (values.length) setSongId(values[0]); }} aria-label="Choose a song">
          {songs.map((track,i) => <ToggleGroupItem key={track.id} value={track.id} className="song-row" aria-label={`Select ${track.title}`}>
            <span className="track-index">{String(i+1).padStart(2,'0')}</span>
            <span className="track-name"><strong>{track.title}</strong><span>{track.bpm} BPM <span aria-hidden="true">·</span> {formatTime(track.duration)}</span></span>
            <span className="track-selected" aria-hidden="true">{songId === track.id ? <Check /> : null}</span>
          </ToggleGroupItem>)}
        </ToggleGroup>
      </section>
      <TrackDisplay song={song} />
      </div>
      <Separator />
      <section className="play-setup" aria-label="Play setup">
        <FieldGroup className="flex-1">
          <Field orientation="horizontal">
            <FieldLabel id="controls-label">Controls</FieldLabel>
            <FieldContent>
              <ToggleGroup spacing={0} variant="outline" value={[input]} onValueChange={values => { if (values.length) setInput(values[0]); }} aria-labelledby="controls-label">
                <ToggleGroupItem value="camera"><Camera data-icon="inline-start" />Camera</ToggleGroupItem><ToggleGroupItem value="keyboard"><Keyboard data-icon="inline-start" />Keyboard</ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>{input === 'camera' ? 'Camera permission is requested when you play.' : 'Press 1–4, or tap the lane buttons.'}</FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
        <Button size="lg" className="play-song" onClick={() => play()} disabled={starting}>
          {starting ? <Spinner data-icon="inline-start" /> : <Play data-icon="inline-start" />}<span>{starting ? 'Starting…' : `Play ${song.title}`}</span>
        </Button>
      </section>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <Separator />
      <section className="learn-poses" aria-labelledby="pose-heading">
        <div className="learn-poses-heading">
          <h2 id="pose-heading">Four poses. One beat.</h2>
          <Button variant="outline" onClick={() => play('practice')} disabled={starting}>
            <Camera data-icon="inline-start" />Practice poses
          </Button>
        </div>
        <PoseGuide />
        <p>Make the pose as its note reaches the line.</p>
      </section>
      </div>
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
