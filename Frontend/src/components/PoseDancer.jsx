import { useEffect, useRef, useState } from 'react';
import { poses, controlPose } from '../poses.js';

const sequence = [...poses, controlPose];
// Pose metadata starts at the torso center for small cue icons. The larger
// silhouette needs separate, fixed shoulder anchors at the torso's edges.
const armPoses = sequence.map(pose => [...pose.arms]
  .sort((a, b) => a[2] - b[2])
  .map((arm, side) => [side === 0 ? 25 : 39, 23, ...arm.slice(2)]));

export function PoseDancer() {
  const [index, setIndex] = useState(0);
  const armNodes = useRef([]);
  const body = useRef(null);
  const elapsed = useRef(0);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame, last = null, shown = -1;
    function tick(now) {
      if (last !== null) elapsed.current += Math.min(now - last, 50);
      last = now;
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
      frame = requestAnimationFrame(tick);
    }
    function update() {
      cancelAnimationFrame(frame);
      last = null;
      if (!preference.matches && !document.hidden) frame = requestAnimationFrame(tick);
    }
    update();
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const pose = sequence[index];
  // Keep each arm on the same side while interpolating between poses.
  const arms = armPoses[0];
  return <section className="pose-dancer" aria-label="Animated demonstration of the game poses">
    <svg viewBox="0 0 80 76" role="img" aria-label={pose.label}>
      <g ref={body} transform="translate(8 0)" fill="#202039" stroke="#202039" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="11" r="6" stroke="none" />
        <path d="M25 23 Q32 19 39 23 L37 41 Q32 45 27 41 Z" strokeWidth="3" />
        <path d="M29 40 L26 49 L22 61 M35 40 L38 49 L42 61" fill="none" strokeWidth="7" />
        {arms.map(([sx,sy,ex,ey,wx,wy],i) => {
          const path = `M${sx} ${sy} L${ex} ${ey} L${wx} ${wy}`;
          return <path key={i} ref={node => { armNodes.current[i] = node; }} d={path} className="dancer-arm" fill="none" strokeWidth="5.5" />;
        })}
      </g>
    </svg>
  </section>;
}
