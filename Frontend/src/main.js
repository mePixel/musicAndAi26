import './style.css';
import { poses, poseSvg } from './poses.js';
import { songs } from './songs.js';
import { createAudio } from './audio.js';
import { createCamera } from './pose.js';
import { createRound, judge, expireNotes, createHighway } from './game.js';

const $ = id => document.getElementById(id);
const text = (id, value) => { if ($(id).textContent !== String(value)) $(id).textContent = value; };
const formatTime = seconds => `${Math.floor(Math.max(0, seconds)/60)}:${String(Math.floor(Math.max(0,seconds)%60)).padStart(2,'0')}`;
const audio = createAudio(), highway = createHighway($('highway'));
let song = songs[0], round = createRound(song.notes), phase = 'idle', input = 'camera';
let cameraEnabled = false, cameraLoading = false, tracked = false, loadGeneration = 0, cameraRequest = 0;
let songDuration = song.duration, feedbackUntil = 0, practicePose = null;
const flashes = poses.map(() => 0);

$('lane-labels').innerHTML = poses.map((pose,i) => `<button class="lane-control" data-pose="${pose.id}" style="--pose-color:${pose.color}" aria-label="Play ${pose.label}"><span>${pose.short}</span><kbd>${i+1}</kbd></button>`).join('');
$('pose-guide').innerHTML = poses.map(pose => `<div style="--pose-color:${pose.color}">${poseSvg(pose)}<span>${pose.label}</span></div>`).join('');
$('track-list').innerHTML = songs.map(track => `<button class="track-row" data-song="${track.id}" aria-label="Select ${track.title}" aria-pressed="${track.id===song.id}" style="--song-color:${track.color}"><span class="track-disc" aria-hidden="true"></span><span class="track-info"><strong>${track.title}</strong><small>${track.bpm} BPM · ${formatTime(track.duration)}</small></span><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 2 4 4-4 4"/></svg></button>`).join('');
const laneButtons = [...document.querySelectorAll('.lane-control')];
const trackButtons = [...document.querySelectorAll('.track-row')];

function showError(message) { $('error').textContent = message; $('error').hidden = !message; }
function syncScore() { text('score',String(round.score).padStart(5,'0')); $('combo').innerHTML = `${round.combo}<small>×</small>`; }

function syncControls() {
  const busy = phase === 'loading', playing = phase === 'playing';
  document.body.classList.toggle('in-round',phase !== 'idle');
  $('play').disabled = busy || (!playing && input === 'camera' && (!cameraEnabled || !tracked));
  $('play').querySelector('span').textContent = busy ? 'Loading track…' : playing ? 'Restart track' : phase === 'finished' ? 'Play again' : 'Let’s play';
  $('stop').disabled = phase === 'idle';
  $('camera-button').disabled = cameraLoading;
  $('camera-button').querySelector('span').textContent = cameraLoading ? 'Loading camera…' : cameraEnabled ? 'Turn camera off' : 'Enable camera';
  $('input-camera').setAttribute('aria-pressed',input === 'camera');
  $('input-keyboard').setAttribute('aria-pressed',input === 'keyboard');
  $('input-camera').disabled = playing || busy;
  $('input-keyboard').disabled = playing || busy;
  trackButtons.forEach(button => { button.disabled = playing || busy; button.setAttribute('aria-pressed',button.dataset.song === song.id); });
  text('play-hint', playing ? 'Match the pose when notes reach the line.' : busy ? 'Getting the music ready.'
    : cameraLoading ? 'Check your browser’s camera permission prompt, or switch to Keyboard.'
    : input === 'camera' && !cameraEnabled ? 'Enable your camera or choose Keyboard.'
    : input === 'camera' && !tracked ? 'Step back until your arms are visible.' : 'Match the pose when notes reach the line.');
  $('camera-box').classList.toggle('has-camera',cameraEnabled);
  $('camera-box').classList.toggle('keyboard-mode',input === 'keyboard');
  $('detected-pose').hidden = !cameraEnabled;
  $('camera-status').classList.toggle('ready',input === 'keyboard' || (cameraEnabled && tracked));
  text('camera-status', input === 'keyboard' ? 'Keys 1–4' : cameraLoading ? 'Loading…' : cameraEnabled ? tracked ? 'Tracking' : 'Find your frame' : 'Camera off');
  text('camera-title',input === 'keyboard' ? 'You’ve got the keys' : 'Step into the frame');
  text('camera-copy',input === 'keyboard' ? 'Press 1, 2, 3, or 4 as the notes land. You can tap the lane controls, too.' : 'Keep your hands and shoulders visible.');
  text('input-hint',input === 'keyboard' ? 'Try keys 1–4 before you play.' : 'Raise a hand to try a pose.');
}

function feedback(kind) {
  text('judgement',kind); $('judgement').dataset.kind = kind;
  feedbackUntil = performance.now() + 550;
}

function pulse(index) {
  flashes[index] = performance.now()+180; highway.flash(index);
}

function trigger(poseId) {
  const index = poses.findIndex(pose => pose.id === poseId);
  if (index < 0 || phase === 'loading') return;
  pulse(index);
  if (phase === 'playing') {
    const time = audio.songTime();
    if (time < 0) return;
    const missed = expireNotes(round,time);
    const note = judge(round,poseId,time);
    if (note) { audio.hit(index); feedback(note.result); }
    else if (missed) feedback('Miss');
    syncScore();
  } else {
    audio.hit(index);
  }
}

const camera = createCamera($('camera-video'),$('camera-overlay'), data => {
  const wasTracked = tracked; tracked = data.tracked;
  practicePose = data.pose;
  if (wasTracked !== tracked) syncControls();
  const pose = poses.find(pose => pose.id === data.pose);
  text('detected-pose', !data.tracked ? 'Step into frame' : pose?.label ?? 'Ready — make a move');
  if (input === 'camera' && data.event) trigger(data.event);
}, message => {
  cameraEnabled = false; cameraLoading = false;
  if (phase !== 'idle') stopRound();
  showError(message); syncControls();
});

function readyMessage(title, copy) {
  $('stage-message').hidden = false; $('stage-message').classList.remove('counting');
  text('stage-kicker','Find your rhythm'); text('countdown',title); text('stage-copy',copy);
}

function stopRound() {
  loadGeneration++; audio.stop(); phase = 'idle'; camera.reset();
  round = createRound(song.notes); practicePose = null; feedbackUntil = 0;
  $('results').hidden = true; $('progress').value = 0; text('elapsed','0:00');
  $('stage-message').hidden = true;
  syncScore(); syncControls();
}

function disableCamera() {
  cameraRequest++;
  cameraEnabled = false; cameraLoading = false; camera.stop();
  syncControls();
}

async function enableCamera() {
  const request = ++cameraRequest;
  showError(''); cameraLoading = true; input = 'camera'; syncControls();
  try {
    await audio.ensure();
    if (request !== cameraRequest) return;
    const enabled = await camera.start();
    if (request === cameraRequest) cameraEnabled = enabled;
  } catch (error) { if (request === cameraRequest) { showError(error.message); cameraEnabled = false; } }
  finally { if (request === cameraRequest) { cameraLoading = false; syncControls(); } }
}

async function startRound() {
  if (phase === 'loading' || (input === 'camera' && (!cameraEnabled || !tracked))) return;
  audio.stop(); camera.reset(); showError(''); phase = 'loading';
  $('results').hidden = true; feedbackUntil = 0; syncControls();
  readyMessage('Loading your track…','A little music, then a little movement.');
  const generation = ++loadGeneration;
  try {
    await audio.ensure();
    const buffer = await audio.load(song.audioUrl);
    if (generation !== loadGeneration) return;
    if (input === 'camera' && (!cameraEnabled || !tracked)) { stopRound(); return; }
    songDuration = buffer.duration; round = createRound(song.notes); syncScore();
    $('progress').max = songDuration; audio.startTrack(buffer); phase = 'playing';
    $('stage-message').hidden = false; $('stage-message').classList.add('counting');
    text('stage-kicker','Get ready'); text('stage-copy','Find your stance. Feel the beat.');
    syncControls();
    window.scrollTo({ top:0, behavior:'instant' });
  } catch (error) {
    if (generation !== loadGeneration) return;
    stopRound(); showError(error.message || 'Audio could not start. Click play to retry.');
  }
}

function finishRound() {
  expireNotes(round,songDuration+1); audio.stop(); phase = 'finished'; syncScore();
  $('stage-message').hidden = true; $('results').hidden = false; feedbackUntil = 0;
  text('result-heading',round.hits ? 'Nice moves.' : 'Keep the beat.');
  text('result-subtitle',round.hits === round.notes.length ? 'Every note. All you. A perfect run.' : round.hits ? 'One track down. Another groove to find.' : 'Try Keyboard to learn the timing, then jump back in.');
  text('result-score',round.score.toLocaleString()); text('result-hits',round.hits); text('result-misses',round.misses);
  text('result-combo',`${round.bestCombo}×`); syncControls(); $('result-heading').focus({ preventScroll:true });
}

$('camera-button').addEventListener('click',() => {
  if (cameraEnabled) { stopRound(); disableCamera(); }
  else enableCamera();
});

function setInput(value) {
  if (phase === 'playing' || phase === 'loading') return;
  stopRound(); disableCamera(); input = value; showError(''); syncControls();
}
$('input-camera').addEventListener('click',() => setInput('camera'));
$('input-keyboard').addEventListener('click',() => setInput('keyboard'));
trackButtons.forEach(button => button.addEventListener('click',() => {
  stopRound(); song = songs.find(song => song.id === button.dataset.song); round = createRound(song.notes);
  songDuration = song.duration; text('song-title',song.title);
  $('song-meta').innerHTML = `${song.bpm} BPM <span>·</span> ${song.duration} SEC`;
  document.querySelector('.record').style.setProperty('--lime',song.color);
  text('duration',formatTime(song.duration)); $('progress').max = song.duration;
  showError(''); syncControls();
}));
$('play').addEventListener('click',startRound); $('retry').addEventListener('click',startRound);
$('stop').addEventListener('click',() => stopRound());
$('choose-song').addEventListener('click',() => {
  stopRound(); disableCamera(); trackButtons[0].focus();
});

async function manualTrigger(poseId) {
  if (input !== 'keyboard' || $('help-dialog').open) return;
  // A running game already has its audio context; keep hit judging synchronous.
  if (phase === 'playing') { trigger(poseId); return; }
  const generation = loadGeneration;
  try { await audio.ensure(); if (generation === loadGeneration && input === 'keyboard') trigger(poseId); }
  catch { showError('Sound could not start. Try clicking a lane control.'); }
}
laneButtons.forEach(button => button.addEventListener('click',() => manualTrigger(button.dataset.pose)));
document.addEventListener('keydown',event => {
  if ($('help-dialog').open) return;
  if (event.key === 'Escape') { stopRound(); return; }
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,select,textarea,[contenteditable="true"]')) return;
  const index = Number(event.key)-1;
  if (input === 'keyboard' && Number.isInteger(index) && index >= 0 && index < 4) {
    event.preventDefault(); manualTrigger(poses[index].id);
  }
});
$('volume').addEventListener('input',event => {
  audio.setVolume(Number(event.target.value)/100); text('volume-value',`${event.target.value}%`);
});
$('how-button').addEventListener('click',() => { if (phase === 'playing' || phase === 'loading') stopRound(); $('help-dialog').showModal(); });
$('close-help').addEventListener('click',() => $('help-dialog').close());
$('got-it').addEventListener('click',() => $('help-dialog').close());
$('help-dialog').addEventListener('click',event => { if (event.target === $('help-dialog')) {
  const rect = $('help-dialog').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('help-dialog').close();
} });
document.addEventListener('visibilitychange',() => {
  if (document.hidden) { if (phase === 'playing' || phase === 'loading') stopRound(); audio.stop(); }
});
window.addEventListener('pagehide',() => { loadGeneration++; audio.stop(); camera.stop(); });

const preview = [[.27,0],[1.0,2],[1.65,3],[2.0,1]].map(([time,index]) => ({time,pose:poses[index].id}));
function animate(now) {
  let time = 0;
  if (phase === 'playing') {
    time = audio.songTime();
    if (!audio.running) { stopRound(); showError('Audio was interrupted. Press play to restart.'); }
    else {
      if (time < 0) { text('countdown',Math.ceil(-time)); $('stage-message').hidden = false; }
      else $('stage-message').hidden = true;
      if (expireNotes(round,time)) { syncScore(); feedback('Miss'); }
      $('progress').value = Math.max(0,time); text('elapsed',formatTime(Math.min(time,songDuration)));
      if (time >= songDuration) finishRound();
    }
  }
  highway.draw(time,phase === 'playing' ? round.notes : phase === 'idle' ? preview : [],phase === 'playing');
  $('judgement').classList.toggle('visible',now < feedbackUntil);
  laneButtons.forEach((button,i) => button.classList.toggle('active',now < flashes[i] || (input === 'camera' && practicePose === poses[i].id)));
  requestAnimationFrame(animate);
}
syncControls(); requestAnimationFrame(animate);
