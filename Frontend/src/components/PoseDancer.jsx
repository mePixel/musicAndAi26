import { useEffect, useRef, useState } from 'react';
import { poses, controlPose } from '../poses.js';
import { mapAvatar, restingAvatar } from '../pose-avatar.js';

const sequence = [...poses, controlPose];
// Pose metadata starts at the torso center for small cue icons. The larger
// silhouette needs separate, fixed shoulder anchors at the torso's edges.
const armPoses = sequence.map(pose => [...pose.arms]
  .sort((a, b) => a[2] - b[2])
  .map((arm, side) => [side === 0 ? 25 : 39, 23, ...arm.slice(2)]));

function HeadDetails({ nodeRef, trail = false }) {
  return <g ref={nodeRef} className="avatar-head-details" transform="translate(32 11)">
    <path d="M-3.5 -5 L-4 -8 L-2 -7 L-1.5 -11 L.5 -8 L2 -10 L3 -7 L4 -7.5 L3.5 -5 Z" fill={trail ? 'inherit' : 'var(--pink, #ff279c)'} stroke="none" />
    <g fill="none" stroke={trail ? 'inherit' : '#fffdf0'} strokeWidth=".85">
      <rect x="-5" y="-1.5" width="4.1" height="3.2" rx="1" />
      <rect x=".9" y="-1.5" width="4.1" height="3.2" rx="1" />
      <path d="M-.9 -.5 Q0 -1.3 .9 -.5 M-5 -.8 L-5.8 -1.5 M5 -.8 L5.8 -1.5" />
    </g>
  </g>;
}

export function PoseDancer({ paused = false, live = false, cameraFrame }) {
  const [index, setIndex] = useState(0);
  const armNodes = useRef([]);
  const body = useRef(null);
  const trailNodes = useRef([]);
  const head = useRef(null), torso = useRef(null), legs = useRef(null);
  const headDetails = useRef(null);
  const joints = useRef(structuredClone(restingAvatar));
  const elapsed = useRef(0);
  useEffect(() => {
    if (live) return;
    head.current.setAttribute('cx', '32'); head.current.setAttribute('cy', '11');
    headDetails.current.setAttribute('transform', 'translate(32 11)');
    torso.current.setAttribute('d', 'M25 23 Q32 19 39 23 L37 41 Q32 45 27 41 Z');
    legs.current.setAttribute('d', 'M29 40 L26 49 L22 61 M35 40 L38 49 L42 61');
    joints.current = structuredClone(restingAvatar);
  }, [live]);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frameId, last = null, shown = -1;
    const history = [];
    function updateTrails(now) {
      history.push({ time: now, transform: body.current.getAttribute('transform'),
        head: [head.current.getAttribute('cx'), head.current.getAttribute('cy')],
        paths: [torso.current, legs.current, ...armNodes.current].map(node => node.getAttribute('d')) });
      while (history.length > 1 && history[1].time < now - 220) history.shift();
      trailNodes.current.forEach((group, index) => {
        const delay = index === 0 ? 160 : 80;
        const sample = history.findLast(entry => entry.time <= now - delay) || history[0];
        group.setAttribute('transform', sample.transform);
        group.children[0].setAttribute('cx', sample.head[0]);
        group.children[0].setAttribute('cy', sample.head[1]);
        sample.paths.forEach((path, i) => group.children[i + 1].setAttribute('d', path));
        group.children[5].setAttribute('transform', `translate(${sample.head[0]} ${sample.head[1]})`);
      });
    }
    function tick(now) {
      const delta = last === null ? 16 : Math.min(now - last, 50);
      if (last !== null) elapsed.current += Math.min(now - last, 50);
      last = now;
      if (live) {
        const frame = cameraFrame?.current;
        const target = frame && now - frame.time < 500 ? mapAvatar(frame.keypoints) || restingAvatar : restingAvatar;
        const blend = 1 - Math.exp(-delta / 65);
        for (const key of Object.keys(target)) joints.current[key] = joints.current[key].map((v, axis) => v + (target[key][axis] - v) * blend);
        const p = joints.current;
        head.current.setAttribute('cx', p.head[0]); head.current.setAttribute('cy', p.head[1]);
        headDetails.current.setAttribute('transform', `translate(${p.head[0]} ${p.head[1]})`);
        torso.current.setAttribute('d', `M${p.leftShoulder} Q${(p.leftShoulder[0]+p.rightShoulder[0])/2} ${(p.leftShoulder[1]+p.rightShoulder[1])/2-3} ${p.rightShoulder} L${p.rightHip} Q${(p.leftHip[0]+p.rightHip[0])/2} ${(p.leftHip[1]+p.rightHip[1])/2+2} ${p.leftHip} Z`);
        legs.current.setAttribute('d', `M${p.leftHip} L${p.leftKnee} L${p.leftAnkle} M${p.rightHip} L${p.rightKnee} L${p.rightAnkle}`);
        armNodes.current[0].setAttribute('d', `M${p.leftShoulder} L${p.leftElbow} L${p.leftWrist}`);
        armNodes.current[1].setAttribute('d', `M${p.rightShoulder} L${p.rightElbow} L${p.rightWrist}`);
        body.current.setAttribute('transform', 'translate(8 0)');
        updateTrails(now);
        frameId = requestAnimationFrame(tick);
        return;
      }
      const cycle = elapsed.current / 700;
      const current = Math.floor(cycle) % sequence.length;
      const next = (current + 1) % sequence.length;
      // Hold each recognizable pose, then ease through the next movement.
      const progress = Math.max(0, Math.min(1, ((cycle % 1) - .35) / .65));
      const ease = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      armNodes.current.forEach((node, arm) => {
        const values = armPoses[current][arm].map((value, axis) => value + (armPoses[next][arm][axis] - value) * ease);
        const [sx, sy, ex, ey, wx, wy] = values;
        node.setAttribute('d', `M${sx} ${sy} L${ex} ${ey} L${wx} ${wy}`);
      });
      const sway = Math.sin(elapsed.current / 325) * 1.1;
      const lift = Math.sin(elapsed.current / 162.5) * .35;
      body.current.setAttribute('transform', `translate(8 ${lift}) rotate(${sway} 32 59)`);
      const label = progress > .5 ? next : current;
      if (label !== shown) { shown = label; setIndex(label); }
      updateTrails(now);
      frameId = requestAnimationFrame(tick);
    }
    function update() {
      cancelAnimationFrame(frameId);
      last = null;
      history.length = 0;
      updateTrails(performance.now());
      if (!paused && !preference.matches && !document.hidden) frameId = requestAnimationFrame(tick);
    }
    update();
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      cancelAnimationFrame(frameId);
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [paused, live, cameraFrame]);
  const pose = sequence[index];
  // Keep each arm on the same side while interpolating between poses.
  const arms = armPoses[0];
  return <section className="pose-dancer" aria-label={live ? 'Character mirroring your camera movements' : 'Animated demonstration of the game poses'}>
    <svg viewBox="0 0 80 76" role="img" aria-label={live ? 'Your movement' : pose.label}>
      {['white', 'pink'].map((color, index) => <g key={color} className={`avatar-trail avatar-trail-${color}`} transform={`translate(${index === 0 ? 8 : 4} 0)`} aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
        <g ref={node => { trailNodes.current[index] = node; }} transform="translate(8 0)">
          <circle cx="32" cy="11" r="6" stroke="none" />
          <path d="M25 23 Q32 19 39 23 L37 41 Q32 45 27 41 Z" strokeWidth="3" />
          <path d="M29 40 L26 49 L22 61 M35 40 L38 49 L42 61" fill="none" strokeWidth="7" />
          {arms.map(([sx,sy,ex,ey,wx,wy],arm) => <path key={arm} d={`M${sx} ${sy} L${ex} ${ey} L${wx} ${wy}`} fill="none" strokeWidth="5.5" />)}
          <HeadDetails trail />
        </g>
      </g>)}
      <g ref={body} transform="translate(8 0)" fill="#202039" stroke="#202039" strokeLinecap="round" strokeLinejoin="round">
        <circle ref={head} cx="32" cy="11" r="6" stroke="none" />
        <path ref={torso} d="M25 23 Q32 19 39 23 L37 41 Q32 45 27 41 Z" strokeWidth="3" />
        <path ref={legs} d="M29 40 L26 49 L22 61 M35 40 L38 49 L42 61" fill="none" strokeWidth="7" />
        {arms.map(([sx,sy,ex,ey,wx,wy],i) => {
          const path = `M${sx} ${sy} L${ex} ${ey} L${wx} ${wy}`;
          return <path key={i} ref={node => { armNodes.current[i] = node; }} d={path} className="dancer-arm" fill="none" strokeWidth="5.5" />;
        })}
        <HeadDetails nodeRef={headDetails} />
      </g>
    </svg>
  </section>;
}
