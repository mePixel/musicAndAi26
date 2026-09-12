import { poses } from '../poses.js';

export function PoseIcon({ pose }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="32" cy="11" r="5" />
    <path d="M32 21 V40 M32 40 L22 58 M32 40 L42 58" />
    {pose.arms.map(([x,y,ex,ey,wx,wy],i) => <path key={i} d={`M${x} ${y} L${ex} ${ey} L${wx} ${wy}`} />)}
  </svg>;
}

export function PoseGuide() {
  return <div className="pose-guide">
    {poses.map((pose,i) => <div key={pose.id} style={{ '--pose-color': pose.color }}>
      <PoseIcon pose={pose} />
      <span>{pose.short}</span><kbd>{i+1}</kbd>
    </div>)}
  </div>;
}
