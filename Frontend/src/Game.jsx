import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Keyboard, Pause, Play, RotateCcw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { poses, controlPose } from './poses.js';
import { createCamera } from './pose.js';
import { createRound, createStage, createCameraPoseGrace, expireNotes, judge } from './game.js';
import { PoseDancer } from './components/PoseDancer.jsx';
import { formatTime } from '@/lib/utils';

const initialHud = { score:0, combo:0, elapsed:0, countdown:3, judgement:'', hits:0, misses:0, bestCombo:0 };

export function Game({ song, input, audio, onExit, onUseKeyboard }) {
  const canvas = useRef(null), video = useRef(null), overlay = useRef(null), trigger = useRef(() => {});
  const transport = useRef(() => {});
  const cameraFrame = useRef(null), keyboardFrame = useRef(null);
  const [attempt,setAttempt] = useState(0);
  const [phase,setPhase] = useState('loading');
  const [hud,setHud] = useState(initialHud);
  const [cameraState,setCameraState] = useState({ enabled:false, tracked:false, pose:null });
  const [error,setError] = useState('');
  const resultHeading = useRef(null);

  useEffect(() => {
    let active = true, frame, status = 'loading', buffer = null, cameraReady = input === 'keyboard';
    let tracked = false, duration = song.duration, round = createRound(song.notes), judgement = '', feedbackUntil = 0, lastHud = 0;
    const stage = createStage(canvas.current);
    const cameraGrace = createCameraPoseGrace(round);
    setHud(initialHud); setError(''); setPhase('loading');
    cameraFrame.current = null; keyboardFrame.current = null;
    setCameraState({ enabled:false, tracked:false, pose:null });

    function fail(message) {
      if (!active) return;
      cameraFrame.current = null; keyboardFrame.current = null;
      status = 'error'; audio.stop(); camera.stop(); setPhase('error'); setError(message);
      setCameraState({ enabled:false, tracked:false, pose:null });
    }

    function begin() {
      if (!active || !buffer || !cameraReady || (input === 'camera' && !tracked) || !['loading','framing'].includes(status)) return;
      audio.startTrack(buffer); status = 'playing'; setPhase('playing');
    }

    function togglePlayback() {
      if (!active) return;
      cameraGrace.clear();
      if (status === 'framing') { begin(); return; }
      if (status === 'playing') {
        audio.pause(); status = 'paused'; setPhase('paused');
        setHud(previous => ({ ...previous, elapsed: Math.max(0, audio.songTime()), judgement: '' }));
      } else if (status === 'paused') {
        audio.resume(); status = 'playing'; setPhase('playing');
        judgement = ''; feedbackUntil = 0;
      }
    }
    transport.current = togglePlayback;

    function showHit(poseId, note) {
      stage.flash(poses.findIndex(pose => pose.id === poseId), Boolean(note));
      if (note) { audio.hit(poseId); judgement = note.result; feedbackUntil = performance.now()+500; }
    }

    function hit(poseId) {
      if (!active || status !== 'playing') return;
      if (input === 'keyboard') keyboardFrame.current = { pose: poseId, time: performance.now() };
      const time = audio.songTime();
      if (time < 0) return;
      const index = poses.findIndex(pose => pose.id === poseId);
      if (index < 0) return;
      expireNotes(round,time);
      const note = judge(round,poseId,time);
      showHit(poseId, note);
    }
    trigger.current = hit;

    const camera = createCamera(video.current,overlay.current,data => {
      if (!active) return;
      tracked = data.tracked;
      cameraFrame.current = data.tracked ? { keypoints: data.keypoints, pose: data.pose, time: performance.now() } : null;
      setCameraState(previous => previous.tracked === data.tracked && previous.pose === data.pose && previous.hint === data.hint ? previous : { ...previous, tracked:data.tracked, pose:data.pose, hint:data.hint });
      if (input !== 'camera') return;
      if (status === 'framing' && data.tracked && data.pose === controlPose.id) begin();
      if (status === 'playing') cameraGrace.update(data, audio.songTime());
    },fail);

    async function prepare() {
      try {
        await audio.ensure();
        if (!active) return;
        const [loaded,enabled] = await Promise.all([
          audio.load(song.audioUrl),
          input === 'camera' ? camera.start() : Promise.resolve(false),
          audio.loadHits(),
        ]);
        if (!active) return;
        buffer = loaded; duration = buffer.duration; cameraReady = input === 'keyboard' || enabled;
        setCameraState(previous => ({ ...previous, enabled }));
        status = 'framing'; setPhase('framing'); camera.reset();
        if (input === 'keyboard') begin();
      } catch (error) { fail(error.message || 'The track could not start. Please try again.'); }
    }
    prepare();

    function draw(now) {
      if (!active) return;
      let time = status === 'paused' ? audio.songTime() : 0;
      if (status === 'playing') {
        time = audio.songTime();
        if (!audio.running) { fail('Audio was interrupted. Restart the track to continue.'); }
        else if (time >= duration) {
          expireNotes(round,duration+1); audio.stop(); status = 'finished'; setPhase('finished'); camera.stop();
          cameraFrame.current = null; keyboardFrame.current = null;
          setCameraState({ enabled:false, tracked:false, pose:null });
          setHud({ ...round, elapsed:duration, countdown:0, judgement:'' });
        } else {
          if (expireNotes(round,time)) { judgement = 'Miss'; feedbackUntil = now+500; }
          if (input === 'camera') {
            const note = cameraGrace.judge(time);
            if (note) showHit(note.pose, note);
          }
          if (now-lastHud >= 80) {
            setHud({ score:round.score, combo:round.combo, elapsed:Math.max(0,time), countdown:Math.max(0,Math.ceil(-time)), judgement:now < feedbackUntil ? judgement : '' });
            lastHud = now;
          }
        }
      }
      const hasRound = status === 'playing' || status === 'paused';
      stage.draw(time,hasRound ? round.notes : []);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);

    function keydown(event) {
      if (event.key === 'Escape') { onExit(); return; }
      if (input !== 'keyboard' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable="true"],[role="slider"]')) return;
      const index = Number(event.key)-1;
      if (Number.isInteger(index) && index >= 0 && index < 4) { event.preventDefault(); hit(poses[index].id); }
    }
    function leavePage() { audio.stop(); camera.stop(); }
    function hidden() { if (document.hidden) { leavePage(); onExit(); } }
    document.addEventListener('keydown',keydown);
    document.addEventListener('visibilitychange',hidden);
    window.addEventListener('pagehide',leavePage);
    return () => {
      active = false; cancelAnimationFrame(frame); trigger.current = () => {}; transport.current = () => {};
      audio.stop(); camera.stop(); cameraFrame.current = null; keyboardFrame.current = null;
      document.removeEventListener('keydown',keydown);
      document.removeEventListener('visibilitychange',hidden);
      window.removeEventListener('pagehide',leavePage);
    };
  },[song,input,audio,attempt,onExit]);

  useEffect(() => { if (phase === 'finished') resultHeading.current?.focus(); },[phase]);

  const waiting = phase === 'loading' || phase === 'framing';
  const detected = cameraState.pose === controlPose.id ? controlPose : poses.find(pose => pose.id === cameraState.pose);
  return <main className="game-page">
    <div className="game-topbar">
    <nav className="game-toolbar" aria-label="Game controls">
      <Button variant="outline" onClick={onExit}><ArrowLeft data-icon="inline-start" /><span>Back to songs</span></Button>
      <div className="playing-title"><h1>{song.title}</h1><p>{song.bpm} BPM</p></div>
      <div className="inline-actions">
        {phase === 'playing' || phase === 'paused' ? <Button variant="outline" onClick={() => transport.current()}>
          {phase === 'paused' ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}{phase === 'paused' ? 'Resume' : 'Pause'}
        </Button> : null}
        <Button variant="outline" onClick={() => setAttempt(value => value+1)} disabled={waiting}><RotateCcw data-icon="inline-start" /><span>Restart</span></Button>
      </div>
    </nav>
    <div className="score-strip" aria-label="Round score">
      <div><span>Score</span><strong id="score">{hud.score.toLocaleString()}</strong></div>
      <div><span>Combo</span><strong id="combo">{hud.combo}×</strong></div>
      <div className="time-readout"><span className="sr-only">Song time</span><strong><span id="elapsed">{formatTime(hud.elapsed)}</span> <span className="duration">/ {formatTime(song.duration)}</span></strong></div>
    </div>
    </div>
    <div className="game-columns" data-input={input}>
      <section className="highway-panel rhythm-stage" aria-label="Corner pose game">
        <div className="canvas-wrap">
          <div className="game-character">
            <PoseDancer gameplay key={attempt} live={input === 'camera'} cameraFrame={cameraFrame} keyboardFrame={input === 'keyboard' ? keyboardFrame : undefined} paused={phase === 'finished' || phase === 'error'} />
          </div>
          <canvas ref={canvas} aria-label="Hand cues fly from the upper corners; hip cues from the lower corners. Match the pose as its cue enters the ring beside your character." />
          <p className="stage-instruction">Match the pose<br /><strong>when it meets the ring.</strong></p>
          <div className="corner-controls" aria-label="Pose targets">
            {poses.slice(0,4).map((pose,i) => <div key={pose.id} data-corner={pose.id} style={{ '--cue-color': pose.color }}>
              <Button variant="outline" aria-label={`Play ${pose.label}`} disabled={input !== 'keyboard' || phase !== 'playing'} onClick={() => trigger.current(pose.id)}><kbd>{i+1}</kbd>{pose.short}</Button>
            </div>)}
          </div>
          {phase === 'playing' && hud.countdown === 0 ? <p className="character-status" role="status">{input === 'camera' ? cameraState.hint || (cameraState.tracked ? detected?.short ?? 'Following your movement' : 'Step into frame') : 'Use keys 1–4 or tap a corner'}</p> : null}
          {waiting ? <div className="stage-overlay" role="status">
            {phase === 'loading' ? <Spinner /> : <Camera aria-hidden="true" />}
            <h2>{phase === 'loading' ? input === 'camera' ? 'Opening your camera' : 'Loading your track' : cameraState.tracked ? 'Ready to start' : 'Step into frame'}</h2>
            <p>{phase === 'loading' && input === 'camera' ? 'Allow camera access in your browser to continue.' : phase === 'framing' ? cameraState.hint || `Keep your shoulders and hands visible, then make the ${controlPose.label} pose to begin.` : 'Your song is almost ready.'}</p>
            {input === 'camera' ? <Button variant="outline" onClick={onUseKeyboard}>Use keyboard instead</Button> : null}
          </div> : null}
          {phase === 'playing' && hud.countdown > 0 ? <div className="stage-overlay countdown" role="status"><p>Get ready</p><strong>{hud.countdown}</strong></div> : null}
          {phase === 'paused' ? <div className="stage-overlay" role="status"><Pause aria-hidden="true" /><h2>Paused</h2><p>Press Resume to continue from this beat.</p></div> : null}
          {phase === 'playing' && hud.judgement ? <div key={`${hud.hits}-${hud.judgement}`} className="judgement" role="status" data-kind={hud.judgement}>{hud.judgement}</div> : null}
          {phase === 'error' ? <div className="stage-overlay">
            <Alert variant="destructive"><AlertTitle>Couldn’t start the game</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            <div className="inline-actions"><Button onClick={() => setAttempt(value => value+1)}>Try again</Button>{input === 'camera' ? <Button variant="outline" onClick={onUseKeyboard}>Use keyboard</Button> : null}</div>
          </div> : null}
          {phase === 'finished' ? <section className="stage-overlay results" aria-labelledby="result-heading">
            <p>{song.title}</p><h2 id="result-heading" ref={resultHeading} tabIndex={-1}>Track complete</h2>
            <strong className="result-score">{hud.score.toLocaleString()}</strong><p>points</p>
            <dl><div><dt>Hits</dt><dd>{hud.hits}</dd></div><div><dt>Misses</dt><dd>{hud.misses}</dd></div><div><dt>Best combo</dt><dd>{hud.bestCombo}×</dd></div></dl>
            <div className="inline-actions"><Button onClick={() => setAttempt(value => value+1)}>Play again</Button><Button variant="outline" onClick={onExit}>Choose song</Button></div>
          </section> : null}
        </div>
      </section>
      <aside className="camera-panel" aria-label={input === 'camera' ? 'Camera preview' : 'Keyboard controls'}>
        <div className="camera-heading"><h2>{input === 'camera' ? 'Camera' : 'Keyboard'}</h2>{input === 'camera' ? <span role="status">{cameraState.enabled ? cameraState.tracked ? 'Tracking' : 'Not in frame' : phase === 'finished' ? 'Off' : phase === 'error' ? 'Unavailable' : 'Connecting'}</span> : null}</div>
        <div className="camera-preview" data-enabled={cameraState.enabled}>
          <video ref={video} autoPlay playsInline muted aria-label="Mirrored webcam preview" />
          <canvas ref={overlay} aria-hidden="true" />
          {!cameraState.enabled ? <Empty><EmptyHeader><EmptyMedia variant="icon">{input === 'camera' ? <Camera /> : <Keyboard />}</EmptyMedia><EmptyTitle>{input === 'camera' ? phase === 'finished' ? 'Camera off' : 'Camera preview' : 'Use keys 1–4'}</EmptyTitle><EmptyDescription>{input === 'camera' ? 'Your video appears here.' : 'Press a key as its cue reaches its ring. You can tap the buttons, too.'}</EmptyDescription></EmptyHeader></Empty> : null}
          {cameraState.enabled ? <span className="detected-pose">{cameraState.tracked ? detected?.label ?? 'Ready' : 'Step into frame'}</span> : null}
        </div>
        <p>{input === 'camera' ? cameraState.hint || `Prepare a pose early and hold it through the beat. The ${controlPose.label} pose starts the round; use the buttons to pause and resume.` : 'Left hip · Right hip · Left hand · Right hand'}</p>
      </aside>
    </div>
    <div className="game-progress"><Progress id="progress" value={Math.min(hud.elapsed/song.duration*100,100)} aria-label="Song progress" /><Button variant="outline" onClick={onExit}><Square data-icon="inline-start" />Stop</Button></div>
  </main>;
}
