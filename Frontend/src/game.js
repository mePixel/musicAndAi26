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

export function expireNotes(round, time) {
  let expired = false;
  for (const note of round.notes) {
    if (!note.result && time - note.time > .300001) {
      note.result = 'Miss'; round.misses++; round.combo = 0; expired = true;
    }
  }
  return expired;
}

export function createHighway(canvas) {
  const ctx = canvas.getContext('2d');
  const flashes = poses.map(() => -Infinity);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0;

  function draw(time, notes, running) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (width !== rect.width || height !== rect.height) {
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0,0,width,height);
    const top = 12, line = height - 42, bottom = height;
    const topLeft = width * .35, topWidth = width * .3, left = width * .055, roadWidth = width * .89;
    const xAt = (fraction, progress) => topLeft + fraction*topWidth + (left + fraction*roadWidth - topLeft - fraction*topWidth)*progress;
    ctx.strokeStyle = '#343c36'; ctx.lineWidth = 1;
    for (let lane = 0; lane <= 4; lane++) {
      ctx.beginPath(); ctx.moveTo(xAt(lane/4,0),top); ctx.lineTo(xAt(lane/4,1.14),bottom+20); ctx.stroke();
    }
    // Faint time markers make speed readable without adding a second clock.
    for (let n = 0; n < 5; n++) {
      const p = ((n/5 + (running ? Math.max(time,0)*.18 : 0))%1);
      ctx.strokeStyle = `rgba(242,243,237,${.025 + .045*p})`;
      const y = top + (line-top)*p;
      ctx.beginPath(); ctx.moveTo(xAt(0,p),y); ctx.lineTo(xAt(1,p),y); ctx.stroke();
    }
    ctx.strokeStyle = '#829083'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left,line); ctx.lineTo(left+roadWidth,line); ctx.stroke();

    for (const note of notes) {
      if (note.result === 'Perfect' || note.result === 'Good') continue;
      const delta = note.time - time;
      if (delta > 2.5 || delta < -.3) continue;
      const index = poses.findIndex(pose => pose.id === note.pose), pose = poses[index];
      const p = 1 - delta/2.5, eased = p*p;
      const y = top + (line-top)*eased, x = xAt((index+.5)/4,eased);
      const size = 21 + 33*p, noteWidth = Math.min(roadWidth/4*.65, size*1.7);
      ctx.save(); ctx.globalAlpha = note.result === 'Miss' ? .25 : Math.min(1,p*3);
      ctx.fillStyle = pose.color; ctx.beginPath(); ctx.roundRect(x-noteWidth/2,y-size/2,noteWidth,size,8); ctx.fill();
      ctx.shadowBlur = 0; drawPose(ctx,pose,x,y,size*.85,'#141711'); ctx.restore();
    }

    for (let i = 0; i < 4; i++) {
      const pose = poses[i], x = xAt((i+.5)/4,1), padWidth = roadWidth/4*.81;
      const flash = Math.max(0,1-(performance.now()-flashes[i])/300);
      ctx.fillStyle = flash ? pose.color : '#252d27'; ctx.strokeStyle = '#829083';
      ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x-padWidth/2,line-24,padWidth,48,6); ctx.fill(); ctx.stroke();
      drawPose(ctx,pose,x,line,36,flash ? '#141711' : '#e1e9df');
      if (flash && !reducedMotion) {
        ctx.strokeStyle = pose.color; ctx.globalAlpha = flash*.6; ctx.beginPath();
        ctx.roundRect(x-padWidth/2-6*(1-flash),line-24-6*(1-flash),padWidth+12*(1-flash),48+12*(1-flash),8); ctx.stroke(); ctx.globalAlpha=1;
      }
    }
  }

  return { draw, flash(index) { flashes[index] = performance.now(); } };
}
