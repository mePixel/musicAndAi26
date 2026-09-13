const CLASS_TO_POSE = {
  // Preserve the model's mirrored lane mapping (also used by the avatar).
  'Right Hand': 'leftHand', 'Left Hand': 'rightHand',
  'Right Hip': 'leftHip', 'Left Hip': 'rightHip', Default: 'default',
};
const HOLD_MS = 100;
const DROPOUT_MS = 150;
const ENTER_CONFIDENCE = .7;
const KEEP_CONFIDENCE = .5;

function relativeWrist(keypoints, pose) {
  if (!pose || pose === 'default' || trackingHint(keypoints, pose)) return null;
  const right = pose.startsWith('left'); // mirrored screen direction
  const [a, b, wrist, origin] = [5, 6, right ? 10 : 9,
    pose.endsWith('Hip') ? right ? 12 : 11 : right ? 6 : 5]
    .map(index => keypoints?.[index]?.position);
  if (![a, b, wrist, origin].every(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))) return null;
  const width = Math.hypot(a.x - b.x, a.y - b.y);
  return width > 0 ? [(wrist.x - origin.x) / width, (wrist.y - origin.y) / width] : null;
}

export function trackingHint(keypoints, pose) {
  const visible = index => keypoints?.[index]?.score >= .45;
  if (!visible(5) || !visible(6)) return 'Step into frame so both shoulders are visible.';
  const sides = pose === 'default' ? ['left', 'right']
    : pose?.startsWith('left') ? ['right'] : pose?.startsWith('right') ? ['left'] : [];
  for (const side of sides) {
    const left = side === 'left';
    if (!visible(left ? 9 : 10)) return `Keep your ${side} hand in view.`;
    if (!visible(left ? 7 : 8)) return `Keep your ${side} elbow in view.`;
    if (pose?.endsWith('Hip') && !visible(left ? 11 : 12)) {
      return `Move back so your ${side} hip is visible.`;
    }
  }
  return '';
}

export function createPoseLatch() {
  let candidate = null, since = 0, candidateSeen = -Infinity;
  let locked = null, lastSeen = -Infinity, entered = null;
  return {
    update(pose, now) {
      if (now - lastSeen > DROPOUT_MS) locked = null;
      // Sparse but consecutive valid samples still confirm on slower webcams.
      if (!pose && now - candidateSeen > DROPOUT_MS) candidate = null;
      if (pose) {
        if (pose !== candidate) { candidate = pose; since = now; }
        candidateSeen = now;
      }
      let event = null;
      if (pose && pose === candidate && now - since >= HOLD_MS) {
        locked = pose;
        if (pose !== entered) event = pose;
        entered = pose;
      }
      if (pose && pose === locked) lastSeen = now;
      if (now - lastSeen > DROPOUT_MS) locked = null;
      // A retained visual lock is not a new observation for scoring grace.
      return { pose: locked, event, fresh: Boolean(locked && pose === locked) };
    },
    reset() {
      candidate = locked = entered = null;
      since = 0; candidateSeen = lastSeen = -Infinity;
    },
  };
}

export function createPoseRecognizer() {
  const latch = createPoseLatch();
  let scores = {}, lastEvaluation = -Infinity, locked = null;
  let entry = null, releaseSince = null, released = false;
  return {
    update(predictions, keypoints, now) {
      const elapsed = now - lastEvaluation;
      if (elapsed > DROPOUT_MS) scores = {};
      lastEvaluation = now;
      const alpha = 1 - Math.exp(-elapsed / 60);
      const raw = Object.fromEntries((predictions ?? [])
        .filter(p => CLASS_TO_POSE[p.className])
        .map(p => [CLASS_TO_POSE[p.className], p.probability]));
      for (const id of Object.values(CLASS_TO_POSE)) {
        scores[id] = scores[id] === undefined ? raw[id] ?? 0
          : scores[id] + alpha * ((raw[id] ?? 0) - scores[id]);
      }
      const best = Object.keys(scores).reduce((a, b) => scores[a] >= scores[b] ? a : b);
      let detected = scores[best] >= ENTER_CONFIDENCE ? best
        : locked && scores[locked] >= KEEP_CONFIDENCE ? locked : null;
      const tracked = !trackingHint(keypoints, null);
      const hint = trackingHint(keypoints, detected ?? best);
      // Smoothed scores cannot turn missing joints or old evidence into a hit.
      if (hint || (raw[detected] ?? 0) < KEEP_CONFIDENCE) detected = null;

      // Repeating a move needs a visible release and return, not another model
      // class. Measure against the body so stepping sideways cannot rearm it.
      const wrist = entry && relativeWrist(keypoints, entry.pose);
      if (!wrist) releaseSince = null;
      if (wrist) {
        const distance = Math.hypot(wrist[0] - entry.wrist[0], wrist[1] - entry.wrist[1]);
        if (distance >= .3) {
          if (releaseSince === null) releaseSince = now;
          if (now - releaseSince >= 60) released = true;
          // A classifier that stays on the same label while the hand moves
          // away must not confirm or refresh that pose until the hand returns.
          if (detected === entry.pose) detected = null;
        } else {
          releaseSince = null;
          if (released && distance <= .15 && detected === entry.pose) {
            latch.reset(); locked = null; entry = null; released = false;
          } else if (released && detected === entry.pose) detected = null;
        }
      }
      const result = latch.update(detected, now);
      locked = result.pose;
      if (result.event) {
        const wrist = relativeWrist(keypoints, result.event);
        entry = wrist ? { pose: result.event, wrist } : null;
        releaseSince = null; released = false;
      }
      return { ...result, tracked, hint };
    },
    reset() {
      latch.reset(); scores = {}; lastEvaluation = -Infinity; locked = null;
      entry = null; releaseSince = null; released = false;
    },
  };
}
