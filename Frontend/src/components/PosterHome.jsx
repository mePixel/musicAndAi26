import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Camera, CameraOff, Check, Keyboard, Pause, Play, Upload, Volume2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { createCamera } from '../pose.js';
import { playablePoses as poses, controlPose } from '../poses.js';
import { GAME_MODES } from '../difficulty.js';
import waveforms from '../waveforms.json';
import { formatTime } from '@/lib/utils';
import { PoseDancer } from './PoseDancer.jsx';
import './poster.css';

export function PosterHome({ song, tracks, onSong, input, onInput, mode, onMode, onUpload, uploading, onPlay, onPractice, starting, error, instructions, volume, onVolume }) {
  const root = useRef(null), video = useRef(null), overlay = useRef(null), uploadInput = useRef(null);
  const cameraFrame = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraPhase, setCameraPhase] = useState('off');
  const [cameraError, setCameraError] = useState('');
  const [recognition, setRecognition] = useState({ tracked: false, pose: null });
  const [motion, setMotion] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setMotion(!preference.matches);
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    if (!cameraOn) return;
    let active = true, lastX = 0, lastY = 0, lastBurst = null;
    setCameraPhase('loading'); setCameraError('');
    function fail(message) {
      if (!active) return;
      camera.stop(); setCameraPhase('error'); setCameraError(message);
    }
    const camera = createCamera(video.current, overlay.current, frame => {
      if (!active) return;
      cameraFrame.current = { keypoints: frame.keypoints, time: performance.now() };
      setRecognition(previous => previous.tracked === frame.tracked && previous.pose === frame.pose ? previous : { tracked: frame.tracked, pose: frame.pose });
      const shoulders = frame.keypoints?.slice(5, 7);
      let x = 0, y = 0;
      if (frame.tracked && shoulders?.every(point => point.score >= .45)) {
        x = Math.max(-1, Math.min(1, 1 - (shoulders[0].position.x + shoulders[1].position.x) / video.current.width));
        y = Math.max(-1, Math.min(1, (shoulders[0].position.y + shoulders[1].position.y) / video.current.height - .8));
      }
      lastX += (x * 24 - lastX) * .3;
      lastY += (y * 12 - lastY) * .3;
      root.current.style.setProperty('--body-x', `${lastX.toFixed(1)}px`);
      root.current.style.setProperty('--body-y', `${lastY.toFixed(1)}px`);
      root.current.dataset.pose = frame.pose || '';
      if (frame.event && frame.event !== lastBurst) {
        root.current.dataset.burst = root.current.dataset.burst === 'a' ? 'b' : 'a';
        lastBurst = frame.event;
      }
      if (!frame.tracked) lastBurst = null;
    }, fail);
    camera.start().then(enabled => { if (active && enabled) setCameraPhase('ready'); }).catch(error => fail(error.message));
    const hidden = () => { if (document.hidden) setCameraOn(false); };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      active = false; camera.stop();
      cameraFrame.current = null;
      document.removeEventListener('visibilitychange', hidden);
      root.current?.style.setProperty('--body-x', '0px');
      root.current?.style.setProperty('--body-y', '0px');
      if (root.current) { root.current.dataset.pose = ''; delete root.current.dataset.burst; }
    };
  }, [cameraOn]);

  function toggleCamera() {
    if (cameraOn) { setCameraOn(false); setCameraPhase('off'); }
    else { onInput('camera'); setCameraOn(true); }
  }
  const move = [...poses, controlPose].find(pose => pose.id === recognition.pose);
  const status = cameraPhase === 'loading' ? 'Warming up the camera…' : recognition.tracked ? (move ? `${move.short} — got it!` : 'You’re in. Try a pose!') : 'Step back. Show both arms.';

  return <div ref={root} className="poster-home" data-motion={motion ? 'on' : 'off'} style={{ '--beat': `${60 / song.bpm}s` }}>
    <header className="poster-header">
      <a href="#" className="poster-brand" aria-label="Bodybeat home">bodybeat<Zap aria-hidden="true" /></a>
      <nav aria-label="Main navigation"><Button variant="ghost" onClick={onPractice} disabled={starting}>Practice</Button>{instructions}</nav>
    </header>
    <main>
      <section className="poster-stage" aria-label="Move to the music">
        <h1 className="poster-title"><span>MOVE.</span><span>MAKE</span><span>SOME NOISE.</span></h1>
        <div className="poster-art" aria-hidden="true">
          <PoseDancer paused={!motion} live={cameraOn} cameraFrame={cameraFrame} />
        </div>
        <p className="poster-scribble scribble-top">Your body.<br />Your instrument.</p>
        <div className="poster-controls">
          <ToggleGroup value={[input]} onValueChange={values => { if (values.length) { onInput(values[0]); if (values[0] === 'keyboard') { setCameraOn(false); setCameraPhase('off'); } } }} aria-label="Game controls">
            <ToggleGroupItem value="camera"><Camera />Camera</ToggleGroupItem><ToggleGroupItem value="keyboard"><Keyboard />Keyboard</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup value={[mode]} onValueChange={values => { if (values.length) onMode(values[0]); }} aria-label="Game mode">
            {Object.entries(GAME_MODES).map(([id,config]) => <ToggleGroupItem key={id} value={id}>{config.label}</ToggleGroupItem>)}
          </ToggleGroup>
          <p>{GAME_MODES[mode]?.description ?? (input === 'keyboard' ? 'Your keys. Your beat. Press 1–4.' : 'Four poses. A whole lot of rhythm.')}</p>
        </div>
        <div className="poster-play-area">
          <Button className="poster-play" onClick={onPlay} disabled={starting} aria-label={`Play ${song.title}`}><Play aria-hidden="true" /><span>{starting ? 'One sec…' : <>LET’S<br />PLAY</>}</span><ArrowUpRight aria-hidden="true" /></Button>
          <span className="poster-play-caption">{song.title} · {song.bpm} BPM</span>
        </div>
        <div className={`poster-camera ${cameraOn ? 'camera-is-on' : ''}`}>
          {cameraOn && <div className="poster-camera-preview"><video ref={video} muted playsInline aria-label="Mirrored camera preview" /><canvas ref={overlay} aria-hidden="true" /></div>}
          <div className="poster-camera-copy">
            <Button variant="ghost" onClick={toggleCamera}>{cameraOn ? <CameraOff /> : <Camera />}{cameraOn ? 'Turn camera off' : 'Make the poster move'}</Button>
            <p role="status">{cameraOn ? (cameraPhase === 'error' ? cameraError : status) : 'Enable camera. Move. Watch it react.'}</p>
          </div>
        </div>
        <div className="pose-stamp" aria-hidden="true">{move?.short || 'FEEL THE BEAT!'}</div>
      </section>
      <section className="poster-tracks" aria-label="Choose a song">
        <ToggleGroup value={[song.id]} onValueChange={values => { if (values.length) onSong(values[0]); }} aria-label="Choose a song">
          {tracks.map((track, index) => {
            const waveform = waveforms[track.id] ?? waveforms['first-groove'] ?? [];
            return <ToggleGroupItem className="poster-track" key={track.id} value={track.id} aria-label={`Select ${track.title}`}>
            <span className="poster-track-number">0{index + 1}</span>
            <span className="poster-track-info"><strong>{track.title}</strong><span>{track.bpm} BPM · {formatTime(track.duration)}</span><small>{song.id === track.id ? <><Check /> SELECTED</> : 'PICK YOUR BEAT'} </small></span>
            <svg className="poster-wave" viewBox="0 0 240 70" preserveAspectRatio="none" role="img" aria-label={`${track.title} audio waveform`}>{waveform.filter((_,i) => i % 3 === 0).map((amplitude,i) => <rect key={i} x={i * 6} y={35 - Math.max(2, amplitude * 30)} width="3" height={Math.max(4, amplitude * 60)} rx="1" />)}</svg>
            <ArrowUpRight className="track-arrow" aria-hidden="true" />
          </ToggleGroupItem>;
          })}
        </ToggleGroup>
        <div className="poster-upload">
          <input ref={uploadInput} type="file" accept="audio/*" multiple webkitdirectory="" directory="" onChange={onUpload} hidden />
          <Button variant="ghost" onClick={() => uploadInput.current?.click()} disabled={uploading || starting}>
            <Upload />{uploading ? 'Analyzing stems...' : 'Upload stem folder'}
          </Button>
          <p>Use a folder with drums, bass, other, and vocals stems. Nothing uploads.</p>
        </div>
      </section>
      {error && <p className="poster-error" role="alert">{error}</p>}
    </main>
    <footer className="poster-footer"><p>STAND UP / PLAY / FEEL GOOD</p><div className="poster-utilities"><Button variant="ghost" onClick={() => setMotion(value => !value)} aria-pressed={!motion}>{motion ? <Pause /> : <Play />}{motion ? 'Pause motion' : 'Resume motion'}</Button><Volume2 aria-hidden="true" /><Slider aria-label="Volume" value={[volume]} max={100} step={1} onValueChange={value => onVolume(Array.isArray(value) ? value[0] : value)} /></div><span>Camera stays on your device.</span></footer>
  </div>;
}
