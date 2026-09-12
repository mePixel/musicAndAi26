import { poses } from '../poses.js';
import { formatTime } from '@/lib/utils';
// RMS amplitude sampled from the two bundled recordings, not decorative bars.
import waveforms from '../waveforms.json';

export function TrackDisplay({ song }) {
  return <section className="track-display" aria-label={`${song.title} track preview`}>
    <div className="display-heading"><h2>{song.title}</h2><span>{song.bpm}<small>BPM</small></span></div>
    <p>{song.mood}</p>
    <div className="record-preview">
    <div className="waveform" key={song.id}>
      <svg viewBox="0 0 600 100" preserveAspectRatio="none" role="img" aria-label={`Audio waveform for ${song.title}`}>
        <path d="M0 50H600" className="waveform-center" />
        {waveforms[song.id].map((amplitude,i) => <rect key={i} x={i*5+1} y={50-Math.max(2,amplitude*46)} width="3" height={Math.max(4,amplitude*92)} />)}
      </svg>
      <div className="waveform-times"><span>0:00</span><span>{formatTime(song.duration/2)}</span><span>{formatTime(song.duration)}</span></div>
    </div>
    </div>
    <div className="display-chart" aria-label={`${song.notes.length} pose notes across four lanes`}>
      {poses.map(pose => <div className="display-lane" key={pose.id}>
        <span>{pose.short}</span><div>{song.notes.filter(note => note.pose === pose.id).map(note => <i key={note.time} style={{ left: `${note.time/song.duration*100}%`, backgroundColor: pose.color }} />)}</div>
      </div>)}
    </div>
  </section>;
}
