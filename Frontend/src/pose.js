import * as tmPose from "@teachablemachine/pose";

const MODEL_URL = "/models/";

const CLASS_TO_POSE = {
  "Right hand - right hip": "rightHip",
  "Left hand - left hip": "leftHip",
  "Right hand - chest/shoulder": "rightChest",
  "Left hand - chest/shoulder": "leftChest",
  "Double hips": "doubleHips",
  "Start/Stop": "startStop",
};

const MIN_CLASS_CONFIDENCE = 0.65;
const MIN_KEYPOINT_CONFIDENCE = 0.45;
const POSE_HOLD_MS = 100;

const BRIGHTNESS_SAMPLE_SIZE = 16;
const BRIGHTNESS_CENTER_MARGIN = 4; // exclude this margin from each edge as "the player"
const BRIGHTNESS_ON = 150; // median 0-255 luminance to flip to "bright"
const BRIGHTNESS_OFF = 120; // to flip back to "dark" (hysteresis avoids flicker)

function createBrightnessSampler() {
  const canvas = document.createElement("canvas");
  canvas.width = BRIGHTNESS_SAMPLE_SIZE;
  canvas.height = BRIGHTNESS_SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let bright = false;

  return {
    update(video) {
      ctx.drawImage(video, 0, 0, BRIGHTNESS_SAMPLE_SIZE, BRIGHTNESS_SAMPLE_SIZE);

      const { data } = ctx.getImageData(
        0,
        0,
        BRIGHTNESS_SAMPLE_SIZE,
        BRIGHTNESS_SAMPLE_SIZE,
      );

      // Sample the border ring around the centered player (not just the corners,
      // which can land on a single dark object like an outlet or a shadow) and
      // take the median rather than the mean, so a few dark pixels in an
      // otherwise bright room don't outweigh the wall.
      const values = [];

      for (let y = 0; y < BRIGHTNESS_SAMPLE_SIZE; y++) {
        const inCenterRow = y >= BRIGHTNESS_CENTER_MARGIN && y < BRIGHTNESS_SAMPLE_SIZE - BRIGHTNESS_CENTER_MARGIN;

        for (let x = 0; x < BRIGHTNESS_SAMPLE_SIZE; x++) {
          const inCenterCol = x >= BRIGHTNESS_CENTER_MARGIN && x < BRIGHTNESS_SAMPLE_SIZE - BRIGHTNESS_CENTER_MARGIN;
          if (inCenterRow && inCenterCol) continue;

          const i = (y * BRIGHTNESS_SAMPLE_SIZE + x) * 4;
          values.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }
      }

      values.sort((a, b) => a - b);
      const luminance = values[Math.floor(values.length / 2)];

      if (luminance >= BRIGHTNESS_ON) {
        bright = true;
      } else if (luminance <= BRIGHTNESS_OFF) {
        bright = false;
      }

      return bright;
    },
  };
}

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
  const brightness = createBrightnessSampler();

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
      bright: false,
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
              const bright = brightness.update(video);

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

                bright,
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
              bright: brightness.update(video),
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
