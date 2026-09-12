import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { PoseIcon } from './components/PoseGuide.jsx';
import { createCamera } from './pose.js';
import { createPracticeSoundTrigger } from './audio.js';
import { poses, controlPose } from './poses.js';

const practicePoses = [...poses, controlPose];

const instructions = {
  leftHip: 'Left hand on your left hip — snare.',
  rightHip: 'Right hand on your right hip — hi-hat.',
  leftChest: 'Left hand at your chest or shoulder — bass.',
  rightChest: 'Right hand at your chest or shoulder — crash.',
  doubleHips: 'Both hands down - ...', // change to what it should be
  startStop: 'Starts, pauses, or resumes the rhythm game. No instrument sound.',
};

export function Practice({ audio, onExit }) {
  const video = useRef(null), overlay = useRef(null), heading = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState('loading');
  const [cameraState, setCameraState] = useState({ tracked: false, pose: null });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true, soundsReady = false;
    const playSound = createPracticeSoundTrigger(audio.hit);
    setPhase('loading'); setError('');
    setCameraState({ tracked: false, pose: null });

    function fail(message) {
      if (!active) return;
      soundsReady = false; camera.stop(); audio.stop(); setError(message); setPhase('error');
    }

    const camera = createCamera(video.current, overlay.current, ({ tracked, pose }) => {
      if (!active) return;
      setCameraState(previous => previous.tracked === tracked && previous.pose === pose ? previous : { tracked, pose });
      if (soundsReady) playSound({ tracked, pose }, performance.now());
    }, fail);

    Promise.all([camera.start(), audio.loadHits()]).then(([enabled]) => {
      if (active && enabled) { soundsReady = true; camera.reset(); setPhase('ready'); }
    }).catch(error => fail(error.message));

    function keydown(event) { if (event.key === 'Escape') onExit(); }
    function leavePage() { soundsReady = false; camera.stop(); audio.stop(); }
    function hidden() { if (document.hidden) { leavePage(); onExit(); } }
    document.addEventListener('keydown', keydown);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leavePage);
    return () => {
      active = false; leavePage();
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', leavePage);
    };
  }, [attempt, audio, onExit]);

  useEffect(() => { heading.current?.focus(); }, []);

  const detected = phase === 'ready' && cameraState.tracked ? practicePoses.find(pose => pose.id === cameraState.pose) : null;
  const status = detected ? detected.label : !cameraState.tracked ? 'Step into frame' : cameraState.pose === 'neutral' ? 'Arms down' : 'Try a pose';
  const hint = detected ? instructions[detected.id] : !cameraState.tracked
    ? 'Keep both shoulders, elbows, and hands visible.'
    : 'Try any pose below and hold it briefly.';

  return <main className="practice-page" aria-labelledby="practice-heading">
    <video ref={video} autoPlay muted playsInline className="practice-video" aria-label="Mirrored live camera" />
    <canvas ref={overlay} className="practice-skeleton" aria-hidden="true" />

    <header className="practice-toolbar">
      <Button variant="outline" onClick={onExit}><ArrowLeft data-icon="inline-start" />Back to songs</Button>
      <h1 id="practice-heading" ref={heading} tabIndex={-1}>Practice poses</h1>
      <p><Camera aria-hidden="true" />Mirrored view</p>
    </header>

    {phase === 'loading' ? <div className="practice-message">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Spinner /></EmptyMedia>
          <EmptyTitle>Starting your camera</EmptyTitle>
          <EmptyDescription>Allow camera access when prompted. The pose detector may take a moment to load.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div> : null}

    {phase === 'error' ? <div className="practice-message">
      <Alert variant="destructive">
        <Camera aria-hidden="true" />
        <AlertTitle>Training unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Button onClick={() => setAttempt(value => value + 1)}><RotateCcw data-icon="inline-start" />Retry training</Button>
    </div> : null}

    <section className="practice-feedback" aria-label="Pose feedback">
      {phase === 'ready' ? <div className="practice-detected" role="status" aria-live="polite" aria-atomic="true">
        {detected ? <span className="practice-pose-icon" style={{ backgroundColor: detected.color }}><PoseIcon pose={detected} /></span> : null}
        <div><h2>{status}</h2><p>{hint}</p></div>
      </div> : null}
      <ul className="practice-poses" aria-label="Poses to try">
        {practicePoses.map(pose => <li key={pose.id} data-detected={detected?.id === pose.id} style={{ '--pose-color': pose.color }}>
          <PoseIcon pose={pose} />
          <span>{pose.label}</span>
          {detected?.id === pose.id ? <span className="sr-only">Detected</span> : null}
        </li>)}
      </ul>
      <p className="practice-caption">Hold a pose briefly to play its sound. Change poses to play again; sounds are spaced at least 0.6 seconds apart. Camera video stays on your device.</p>
    </section>
  </main>;
}
