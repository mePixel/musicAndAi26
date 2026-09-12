import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { PracticeFeedback } from './components/PracticeFeedback/index.jsx';
import { PoseIcon } from './components/PoseGuide.jsx';
import { createCamera } from './pose.js';
import { poses } from './poses.js';

const instructions = {
  leftUp: 'Left hand above your shoulder, right hand down.',
  rightUp: 'Right hand above your shoulder, left hand down.',
  bothUp: 'Both hands above your shoulders.',
  spread: 'Both arms straight out at shoulder height.',
};

export function Practice({ onExit }) {
  const video = useRef(null), overlay = useRef(null), heading = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState('loading');
  const [cameraState, setCameraState] = useState({ tracked: false, pose: null, bright: false });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setPhase('loading'); setError('');
    setCameraState({ tracked: false, pose: null, bright: false });

    function fail(message) {
      if (!active) return;
      camera.stop(); setError(message); setPhase('error');
    }

    const camera = createCamera(video.current, overlay.current, ({ tracked, pose, bright }) => {
      if (!active) return;
      setCameraState(previous => previous.tracked === tracked && previous.pose === pose && previous.bright === bright ? previous : { tracked, pose, bright });
    }, fail);

    camera.start().then(enabled => {
      if (active && enabled) setPhase('ready');
    }).catch(error => fail(error.message));

    function keydown(event) { if (event.key === 'Escape') onExit(); }
    function leavePage() { camera.stop(); }
    function hidden() { if (document.hidden) { leavePage(); onExit(); } }
    document.addEventListener('keydown', keydown);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leavePage);
    return () => {
      active = false; camera.stop();
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', leavePage);
    };
  }, [attempt, onExit]);

  useEffect(() => { heading.current?.focus(); }, []);

  const detected = phase === 'ready' && cameraState.tracked ? poses.find(pose => pose.id === cameraState.pose) : null;
  const status = detected ? detected.label : !cameraState.tracked ? 'Step into frame' : cameraState.pose === 'neutral' ? 'Arms down' : 'Try a pose';
  const hint = detected ? instructions[detected.id] : !cameraState.tracked
    ? 'Keep both shoulders, elbows, and hands visible.'
    : 'Try any pose below and hold it briefly.';

  return <main className="practice-page" aria-labelledby="practice-heading">
    <video ref={video} autoPlay muted playsInline className="practice-video" aria-label="Mirrored live camera" />
    <canvas ref={overlay} className="practice-skeleton" aria-hidden="true" />
    <h1 id="practice-heading" ref={heading} tabIndex={-1} className="sr-only">Practice poses</h1>

    <div className="practice-stage">
      <Button variant="outline" onClick={onExit} className="practice-back">
        <ArrowLeft data-icon="inline-start" />
        <span className="practice-back-label">Back to songs</span>
      </Button>

      {phase === 'ready' ? <div className="practice-status" data-bright={cameraState.bright} role="status" aria-live="polite" aria-atomic="true">
        {detected ? <span className="practice-status-icon" style={{ backgroundColor: detected.color }}><PoseIcon pose={detected} /></span> : null}
        <div><h2>{status}</h2><p>{hint}</p></div>
      </div> : null}

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
          <AlertTitle>Camera unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => setAttempt(value => value + 1)}><RotateCcw data-icon="inline-start" />Retry camera</Button>
      </div> : null}

      <PracticeFeedback detected={detected} />
    </div>
  </main>;
}
