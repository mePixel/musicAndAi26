import { useRef, useState } from 'react';
import { GripHorizontal } from 'lucide-react';
import './index.css';
import { PoseIcon } from '../PoseGuide.jsx';
import { playablePoses as poses } from '../../poses.js';

const EDGE_ZONE = 0.25;

function nearestDock(centerX) {
  const width = window.innerWidth;
  if (centerX < width * EDGE_ZONE) return 'left';
  if (centerX > width * (1 - EDGE_ZONE)) return 'right';
  return 'bottom';
}

export function PracticeFeedback({ detected }) {
  const panelRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const stageRect = useRef(null);
  const [dock, setDock] = useState('bottom');
  const [dragPos, setDragPos] = useState(null);
  const [previewDock, setPreviewDock] = useState('bottom');
  const dragging = dragPos !== null;

  function onPointerDown(event) {
    const panel = panelRef.current;
    const rect = panel.getBoundingClientRect();
    stageRect.current = panel.parentElement.getBoundingClientRect();
    dragOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setPreviewDock(dock);
    setDragPos({ x: rect.left - stageRect.current.left, y: rect.top - stageRect.current.top });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragging) return;
    const stage = stageRect.current;
    const panel = panelRef.current;
    const viewportX = event.clientX - dragOffset.current.x;
    const viewportY = event.clientY - dragOffset.current.y;

    // Clamp to the stage, which excludes the header, so dragging can never cover it.
    const maxX = Math.max(stage.width - (panel?.offsetWidth ?? 0), 0);
    const maxY = Math.max(stage.height - (panel?.offsetHeight ?? 0), 0);
    const x = Math.min(Math.max(viewportX - stage.left, 0), maxX);
    const y = Math.min(Math.max(viewportY - stage.top, 0), maxY);

    setDragPos({ x, y });
    setPreviewDock(nearestDock(viewportX + (panel?.offsetWidth ?? 0) / 2));
  }

  function onPointerUp() {
    if (!dragging) return;
    setDock(previewDock);
    setDragPos(null);
  }

  return <>
    {dragging ? <div className="dock-zones" aria-hidden="true">
      <div className="dock-zone dock-zone-left" data-active={previewDock === 'left'} />
      <div className="dock-zone dock-zone-right" data-active={previewDock === 'right'} />
      <div className="dock-zone dock-zone-bottom" data-active={previewDock === 'bottom'} />
    </div> : null}

    <section
      ref={panelRef}
      className="practice-feedback"
      data-dock={dock}
      data-dragging={dragging}
      aria-label="Pose feedback"
      style={dragging ? { left: dragPos.x, top: dragPos.y } : undefined}
    >
      <div
        className="practice-feedback-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Drag to move this panel to the left, right, or bottom edge"
        role="button"
        tabIndex={-1}
      >
        <GripHorizontal aria-hidden="true" />
      </div>

      <ul className="practice-poses" aria-label="Poses to try">
        {poses.map(pose => <li key={pose.id} data-detected={detected?.id === pose.id} style={{ '--pose-color': pose.color }}>
          <PoseIcon pose={pose} />
          <span title={pose.label}>{pose.short}</span>
          {detected?.id === pose.id ? <span className="sr-only">Detected</span> : null}
        </li>)}
      </ul>
    </section>
  </>;
}
