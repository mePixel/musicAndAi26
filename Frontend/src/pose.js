// MediaPipe's left/right are anatomical; only the preview is mirrored.
export function classifyPose(landmarks, aspect = 4 / 3) {
  if (!landmarks || ![11, 12, 13, 14, 15, 16].every(i => {
    const p = landmarks[i];
    return p && p.visibility >= .65 && p.x > .01 && p.x < .99 && p.y > .01 && p.y < .99;
  })) return null;
  const [ls, rs, le, re, lw, rw] = [11, 12, 13, 14, 15, 16].map(i => landmarks[i]);
  const width = Math.hypot((ls.x - rs.x) * aspect, ls.y - rs.y);
  if (width < .08) return null;
  const leftUp = lw.y < ls.y - width * .25, rightUp = rw.y < rs.y - width * .25;
  const leftDown = lw.y > ls.y + width * .45, rightDown = rw.y > rs.y + width * .45;
  if (leftUp && rightUp) return 'bothUp';
  if (leftUp && rightDown) return 'leftUp';
  if (rightUp && leftDown) return 'rightUp';
  const spread = [[ls, le, lw], [rs, re, rw]].every(([shoulder, elbow, wrist]) =>
    Math.abs(wrist.y - shoulder.y) < width * .23 &&
    Math.abs(elbow.y - shoulder.y) < width * .25 &&
    Math.abs(wrist.x - shoulder.x) * aspect > width * .7);
  if (spread && lw.x > ls.x && rw.x < rs.x) return 'spread';
  if (leftDown && rightDown) return 'neutral';
  return null;
}

export function createPoseLatch() {
  let candidate = null, since = 0, entered = null;
  return {
    update(pose, now) {
      if (pose !== candidate) { candidate = pose; since = now; }
      if (!pose || now - since < 100) return { pose: null, event: null };
      const event = pose !== entered && pose !== 'neutral' ? pose : null;
      entered = pose;
      return { pose, event };
    },
    reset() { candidate = null; entered = null; since = 0; },
  };
}

export function createCamera(video, overlay, onFrame, onError) {
  let stream = null, model = null, frame = 0, generation = 0;
  const latch = createPoseLatch(), ctx = overlay.getContext('2d');
  const connections = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24]];

  function clear() { ctx.clearRect(0, 0, overlay.width, overlay.height); }

  function stop() {
    generation++; cancelAnimationFrame(frame);
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    model?.close(); model = null; video.srcObject = null;
    clear(); latch.reset();
    onFrame({ tracked: false, pose: null, event: null });
  }

  return {
    stop,
    reset: () => latch.reset(),
    async start() {
      stop(); const ownGeneration = generation;
      let openedStream, openedModel;
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost in a supported browser.');
        openedStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false,
        });
        if (ownGeneration !== generation) { openedStream.getTracks().forEach(track => track.stop()); return false; }
        stream = openedStream; video.srcObject = stream; await video.play();
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        if (ownGeneration !== generation) return false;
        const files = await FilesetResolver.forVisionTasks('/wasm');
        const options = {
          baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate: 'GPU' },
          runningMode: 'VIDEO', numPoses: 1,
          minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6,
        };
        try { openedModel = await PoseLandmarker.createFromOptions(files, options); }
        catch { options.baseOptions.delegate = 'CPU'; openedModel = await PoseLandmarker.createFromOptions(files, options); }
        if (ownGeneration !== generation) { openedModel.close(); return false; }
        model = openedModel;
        overlay.width = video.videoWidth; overlay.height = video.videoHeight;
        let lastVideoTime = -1, lastEvaluation = -Infinity, lastNewFrame = performance.now();

        function tick(now) {
          if (ownGeneration !== generation) return;
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastEvaluation >= 60) {
            lastVideoTime = video.currentTime; lastEvaluation = now; lastNewFrame = now;
            try {
              const landmarks = model.detectForVideo(video, now).landmarks[0];
              const tracked = !!landmarks && [11,12,13,14,15,16].every(i => {
                const p = landmarks[i];
                return p?.visibility >= .65 && p.x > .01 && p.x < .99 && p.y > .01 && p.y < .99;
              });
              clear();
              if (landmarks) {
                ctx.strokeStyle = '#d9ff70'; ctx.fillStyle = '#d9ff70'; ctx.lineWidth = 3;
                for (const [a,b] of connections) {
                  if (landmarks[a].visibility < .65 || landmarks[b].visibility < .65) continue;
                  ctx.beginPath(); ctx.moveTo(landmarks[a].x * overlay.width, landmarks[a].y * overlay.height);
                  ctx.lineTo(landmarks[b].x * overlay.width, landmarks[b].y * overlay.height); ctx.stroke();
                }
                for (const i of [11,12,13,14,15,16]) {
                  if (landmarks[i].visibility < .65) continue;
                  ctx.beginPath(); ctx.arc(landmarks[i].x * overlay.width, landmarks[i].y * overlay.height, 5, 0, Math.PI*2); ctx.fill();
                }
              }
              onFrame({ tracked, ...latch.update(classifyPose(landmarks, video.videoWidth/video.videoHeight), now) });
            } catch {
              stop(); onError('Tracking stopped. Enable the camera again to retry.'); return;
            }
          } else if (now - lastNewFrame > 500) {
            clear(); onFrame({ tracked: false, ...latch.update(null, now) });
          }
          frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
        stream.getVideoTracks()[0].onended = () => { stop(); onError('Camera disconnected. Enable the camera to reconnect.'); };
        return true;
      } catch (error) {
        openedStream?.getTracks().forEach(track => track.stop());
        if (ownGeneration !== generation) return false;
        stop();
        const message = error.name === 'NotAllowedError' ? 'Camera permission was denied. Allow it in your browser, or try Keyboard.'
          : error.name === 'NotFoundError' ? 'No camera found. Connect a webcam or try Keyboard.'
          : error.name === 'NotReadableError' ? 'The camera is busy. Close other camera apps and try again.'
          : 'Camera or pose model could not load. Try again, or switch to Keyboard.';
        throw new Error(message);
      }
    },
  };
}
