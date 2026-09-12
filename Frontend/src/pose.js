import * as tmPose from "@teachablemachine/pose";

const MODEL_URL = "/models/";

const CLASS_TO_POSE = {
  "Right hand - right hip": "rightHip",
  "Left hand - left hip": "leftHip",
  "Right hand - chest/shoulder": "rightChest",
  "Left hand - chest/shoulder": "leftChest",
  "Start/Stop": "startStop",
};

const MIN_CLASS_CONFIDENCE = 0.65;
const MIN_KEYPOINT_CONFIDENCE = 0.45;
const POSE_HOLD_MS = 100;

export function createPoseLatch() {
  let candidate = null;
  let since = 0;
  let entered = null;

  return {
    update(pose, now) {
      if (pose !== candidate) {
        candidate = pose;
        since = now;
      }

      if (!pose || now - since < POSE_HOLD_MS) {
        return {
          pose: null,
          event: null,
        };
      }

      const event = pose !== entered ? pose : null;

      entered = pose;

      return {
        pose,
        event,
      };
    },

    reset() {
      candidate = null;
      entered = null;
      since = 0;
    },
  };
}

function getBestPrediction(predictions) {
  if (!predictions?.length) {
    return null;
  }

  let best = predictions[0];

  for (const prediction of predictions) {
    if (prediction.probability > best.probability) {
      best = prediction;
    }
  }

  return best;
}

function getTracked(keypoints) {
  if (!keypoints?.length) {
    return false;
  }

  const required = [
    "leftShoulder",
    "rightShoulder",
    "leftElbow",
    "rightElbow",
    "leftWrist",
    "rightWrist",
  ];

  const indexes = {
    leftShoulder: 5,
    rightShoulder: 6,
    leftElbow: 7,
    rightElbow: 8,
    leftWrist: 9,
    rightWrist: 10,
  };

  return required.every((name) => {
    const point = keypoints[indexes[name]];
    return point && point.score >= MIN_KEYPOINT_CONFIDENCE;
  });
}

function drawPoseOverlay(ctx, canvas, pose) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!pose?.keypoints) {
    return;
  }

  const keypoints = pose.keypoints;

  const connections = [
    [5, 6], // shoulders
    [5, 7], // left upper arm
    [7, 9], // left forearm
    [6, 8], // right upper arm
    [8, 10], // right forearm

    [5, 11], // left torso
    [6, 12], // right torso
    [11, 12], // hips
  ];

  ctx.strokeStyle = "#d9ff70";
  ctx.fillStyle = "#d9ff70";
  ctx.lineWidth = 3;

  for (const [a, b] of connections) {
    const first = keypoints[a];
    const second = keypoints[b];

    if (
      !first ||
      !second ||
      first.score < MIN_KEYPOINT_CONFIDENCE ||
      second.score < MIN_KEYPOINT_CONFIDENCE
    ) {
      continue;
    }

    ctx.beginPath();

    ctx.moveTo(first.position.x, first.position.y);

    ctx.lineTo(second.position.x, second.position.y);

    ctx.stroke();
  }

  for (const point of keypoints) {
    if (!point || point.score < MIN_KEYPOINT_CONFIDENCE) {
      continue;
    }

    ctx.beginPath();

    ctx.arc(point.position.x, point.position.y, 5, 0, Math.PI * 2);

    ctx.fill();
  }
}

export function createCamera(video, overlay, onFrame, onError) {
  let stream = null;
  let model = null;
  let frame = 0;
  let generation = 0;

  const latch = createPoseLatch();
  const ctx = overlay.getContext("2d");

  function clear() {
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }

  function stop() {
    generation++;

    cancelAnimationFrame(frame);

    stream?.getTracks().forEach((track) => {
      track.stop();
    });

    stream = null;

    video.pause();
    video.srcObject = null;

    model = null;

    clear();

    latch.reset();

    onFrame({
      tracked: false,
      pose: null,
      event: null,
    });
  }

  return {
    stop,

    reset() {
      latch.reset();
    },

    async start() {
      stop();

      const ownGeneration = generation;

      let openedStream = null;
      let openedModel = null;

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access needs HTTPS or localhost in a supported browser.",
          );
        }

        // MARK: webcam start
        openedStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 640,
            },

            height: {
              ideal: 480,
            },

            facingMode: "user",
          },

          audio: false,
        });

        if (ownGeneration !== generation) {
          openedStream.getTracks().forEach((track) => track.stop());

          return false;
        }

        stream = openedStream;

        video.srcObject = stream;

        await video.play();

        // MARK: loading model

        openedModel = await tmPose.load(
          `${MODEL_URL}model.json`,
          `${MODEL_URL}metadata.json`,
        );

        if (ownGeneration !== generation) {
          return false;
        }

        model = openedModel;

        // PoseNet reads these attributes to scale keypoints back onto the video.
        video.width = overlay.width = video.videoWidth;
        video.height = overlay.height = video.videoHeight;

        // MARK: prediction loop

        let lastVideoTime = -1;
        let lastEvaluation = -Infinity;
        let lastNewFrame = performance.now();

        async function tick(now) {
          if (ownGeneration !== generation) {
            return;
          }

          if (
            video.readyState >= 2 &&
            video.currentTime !== lastVideoTime &&
            now - lastEvaluation >= 60
          ) {
            lastVideoTime = video.currentTime;
            lastEvaluation = now;
            lastNewFrame = now;

            try {
              const { pose, posenetOutput } = await model.estimatePose(video); // webcam

              const tracked = getTracked(pose?.keypoints);

              clear();

              if (pose) {
                drawPoseOverlay(ctx, overlay, pose);
              }

              let detectedPose = null;

              if (tracked) {
                const predictions = await model.predict(posenetOutput); // actual output / classes

                const best = getBestPrediction(predictions);

                if (best && best.probability >= MIN_CLASS_CONFIDENCE) {
                  detectedPose = CLASS_TO_POSE[best.className] ?? null;
                }
              }

              const latched = latch.update(detectedPose, now);

              onFrame({
                tracked,

                pose: latched.pose,

                event: latched.event,
              });
            } catch (error) {
              console.error("Teachable Machine prediction error:", error);

              stop();

              onError("Tracking stopped. Retry the camera to continue.");

              return;
            }
          } else if (now - lastNewFrame > 500) {
            clear();

            const latched = latch.update(null, now);

            onFrame({
              tracked: false,
              pose: latched.pose,
              event: latched.event,
            });
          }

          frame = requestAnimationFrame(tick);
        }

        frame = requestAnimationFrame(tick);

        // MARK: stop camera

        const videoTrack = stream.getVideoTracks()[0];

        if (videoTrack) {
          videoTrack.onended = () => {
            stop();

            onError("Camera disconnected. Reconnect it and try again.");
          };
        }

        return true;
      } catch (error) {
        openedStream?.getTracks().forEach((track) => track.stop());

        if (ownGeneration !== generation) {
          return false;
        }

        stop();

        let message =
          "Camera or pose model could not load. Check your model files and try again.";

        if (error.name === "NotAllowedError") {
          message =
            "Camera permission was denied. Allow camera access in your browser and try again.";
        } else if (error.name === "NotFoundError") {
          message = "No camera found. Connect a webcam and try again.";
        } else if (error.name === "NotReadableError") {
          message =
            "The camera is busy. Close other camera apps and try again.";
        } else if (error.message) {
          message = error.message;
        }

        console.error("Camera/model error:", error);

        throw new Error(message);
      }
    },
  };
}
