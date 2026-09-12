import { poses, drawPose } from './poses.js';

export function createRound(notes) {
  return { notes: notes.map(note => ({ ...note, result: null })), score: 0, combo: 0, bestCombo: 0, hits: 0, misses: 0 };
}

export function judge(round, pose, time) {
  const note = round.notes.filter(note => !note.result && note.pose === pose && Math.abs(note.time - time) <= .300001)
    .sort((a,b) => Math.abs(a.time-time) - Math.abs(b.time-time))[0];
  if (!note) return null;
  note.result = Math.abs(note.time - time) <= .150001 ? 'Perfect' : 'Good';
  round.score += note.result === 'Perfect' ? 100 : 50;
  round.hits++; round.combo++; round.bestCombo = Math.max(round.combo, round.bestCombo);
  return note;
}

// One camera pose entry can wait for the next cue. Confidence gaps get 300 ms
// of grace, but a different pose or a consumed entry cannot claim another cue.
export function createCameraPoseGrace(round) {
  let entered = null, pending = null, lastSeen = -Infinity;
  return {
    update({ tracked, pose, event }, time) {
      if (!tracked || !pose || time < 0) return;
      if (pose !== entered || event === pose) {
        entered = pose;
        const next = round.notes.find(note => !note.result && time - note.time <= .300001);
        pending = cueCorners[pose] && next?.pose === pose ? next : null;
      }
      if (pending) lastSeen = time;
    },
    judge(time) {
      if (!pending || time < 0 || time - lastSeen > .300001) return null;
      if (pending !== round.notes.find(note => !note.result)) {
        pending = null;
        return null;
      }
      const note = judge(round, pending.pose, time);
      if (note) pending = null;
      return note;
    },
    clear() { pending = null; lastSeen = -Infinity; },
  };
}

export function expireNotes(round, time) {
  let expired = false;
  for (const note of round.notes) {
    if (!note.result && time - note.time > .300001) {
      note.result = 'Miss'; round.misses++; round.combo = 0; expired = true;
    }
  }
  return expired;
}

// Left/right are screen directions, matching the mirrored player preview.
export const cueCorners = {
  leftHip: [-1, 1], rightHip: [1, 1],
  leftHand: [-1, -1], rightHand: [1, -1],
};

export function cuePosition(poseId, secondsUntilBeat, width, height) {
  const [side, level] = cueCorners[poseId];
  const origin = { x: width * (.5 + side * .42), y: height * (.5 + level * .36) };
  const target = { x: width * (.5 + side * .21), y: height * (.5 + level * .17) };
  const progress = 1 - secondsUntilBeat / 2.5;
  return {
    origin, target,
    x: origin.x + (target.x - origin.x) * progress,
    y: origin.y + (target.y - origin.y) * progress,
  };
}

export function createStage(canvas) {
  const ctx = canvas.getContext('2d');
  const flashes = poses.map(() => -Infinity);
  const hits = poses.map(() => -Infinity);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0;

  function draw(time, notes) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (width !== rect.width || height !== rect.height) {
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0,0,width,height);
    const size = Math.min(72, width * .105, height * .15);
    const now = performance.now();
    for (let i = 0; i < 4; i++) {
      const pose = poses[i];
      const { origin, target } = cuePosition(pose.id, 0, width, height);
      const flash = Math.max(0, 1 - (now - flashes[i]) / 300);
      const glow = Math.max(0, 1 - (now - hits[i]) / 650);
      ctx.save();
      ctx.strokeStyle = pose.color; ctx.lineWidth = 1.5; ctx.globalAlpha = .35;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(target.x, target.y); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = flash || glow ? pose.color : '#242020';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(target.x, target.y, size * .62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      drawPose(ctx, pose, target.x, target.y, size * .8, flash || glow ? '#11100f' : '#8c8176');
      if (glow && !reducedMotion) {
        ctx.globalAlpha = glow; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(target.x, target.y, size * .62 + (1-glow)*32, 0, Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    }
    for (const note of notes) {
      if (note.result === 'Perfect' || note.result === 'Good' || !cueCorners[note.pose]) continue;
      const delta = note.time - time;
      if (delta > 2.5 || delta < -.3) continue;
      const pose = poses.find(pose => pose.id === note.pose);
      const { x, y } = cuePosition(note.pose, delta, width, height);
      ctx.save(); ctx.globalAlpha = delta < 0 ? Math.max(.25, 1 + delta * 2) : 1;
      ctx.fillStyle = pose.color; ctx.strokeStyle = '#11100f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x-size/2, y-size/2, size, size, size*.18); ctx.fill(); ctx.stroke();
      drawPose(ctx, pose, x, y, size*.9, '#11100f');
      ctx.restore();
    }
  }

  return { draw, flash(index, scored = false) {
    flashes[index] = performance.now();
    if (scored) hits[index] = flashes[index];
  } };
}
