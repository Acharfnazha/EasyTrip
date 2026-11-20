// The camera check's rules: from the 68 face points that face-api finds, how far the head is
// turned and how big the face is, and whether a movement is done. No camera or library here,
// only numbers, so the rules can be tested with npm test (test/liveness.test.js).
//
// The 68 points (the usual "iBUG 300-W" layout): 0 to 16 go along the jaw, from the face's
// right side (on the LEFT of the camera's image) to its left side; 30 is the tip of the nose.

// The movements, in the order the user does them, with what the page says.
export const STEPS = [
  { id: "straight", say: "Look straight at the camera" },
  { id: "left", say: "Slowly turn your head to your left" },
  { id: "right", say: "Now turn your head to your right" },
  { id: "closer", say: "Look straight again, and move closer" },
];

// How a frame must look for each movement to count.
export const LIMITS = {
  straightYaw: 0.07, // looking straight: the nose within 7% of the face's width from its middle
  turnedYaw: 0.13, // turned: the nose at least 13% of the face's width to one side
  closerGrowth: 1.3, // closer: the face at least 30% wider than when looking straight
  closerYaw: 0.12, // and still looking roughly straight
  minWidth: 0.18, // a face narrower than 18% of the picture is too far to see well
  holdFrames: 3, // the movement must be seen in 3 frames in a row, so one wrong frame isn't enough
};

// The head's turn and size in one frame. points: the 68 points [{x, y}, ...] in the camera's
// own image (not mirrored); imageWidth: the image's width in pixels.
//   yaw:   0 looking straight; above 0 when the head turns to the person's LEFT (their nose
//          moves to the right of the camera's image, because the camera faces them); below 0
//          when it turns to their right.
//   width: the face's width, as a share of the image's width (0.3 = 30%).
export function poseOf(points, imageWidth) {
  const rightJaw = points[0];
  const leftJaw = points[16];
  const nose = points[30];
  const faceWidth = leftJaw.x - rightJaw.x;
  if (!(faceWidth > 0)) return null;
  const middle = (rightJaw.x + leftJaw.x) / 2;
  return { yaw: (nose.x - middle) / faceWidth, width: faceWidth / imageWidth };
}

// Is this frame the movement asked for? baseline is the pose seen when looking straight (the
// "closer" step compares the face's size with it).
export function matches(stepId, pose, baseline) {
  if (!pose) return false;
  switch (stepId) {
    case "straight":
      return Math.abs(pose.yaw) <= LIMITS.straightYaw && pose.width >= LIMITS.minWidth;
    case "left":
      return pose.yaw >= LIMITS.turnedYaw;
    case "right":
      return pose.yaw <= -LIMITS.turnedYaw;
    case "closer":
      return Boolean(baseline) && pose.width >= baseline.width * LIMITS.closerGrowth &&
        Math.abs(pose.yaw) <= LIMITS.closerYaw;
    default:
      return false;
  }
}

// A short hint for the frame, when it doesn't match yet: what to change.
export function hintFor(stepId, pose, baseline) {
  if (!pose) return "We can't see your face. Face the camera, in good light.";
  if (stepId === "straight") {
    if (pose.width < LIMITS.minWidth) return "Come a little closer to the camera.";
    return "Look straight at the camera.";
  }
  if (stepId === "left") return pose.yaw < 0 ? "That's your right. Turn the other way." : "Keep turning to your left.";
  if (stepId === "right") return pose.yaw > 0 ? "That's your left. Turn the other way." : "Keep turning to your right.";
  if (stepId === "closer") {
    if (Math.abs(pose.yaw) > LIMITS.closerYaw) return "Look straight at the camera.";
    return "Move closer, until your face fills more of the frame.";
  }
  return "";
}

// Follows the movements one by one. Feed it every frame's pose; it says which step is current,
// and gives back { done: stepId } on the frame where a movement is finished (that frame's
// photo is the one to keep).
export function createTracker() {
  let index = 0;
  let streak = 0;
  let baseline = null;
  return {
    get step() { return STEPS[index] || null; },
    get finished() { return index >= STEPS.length; },
    get baseline() { return baseline; },
    feed(pose) {
      const step = STEPS[index];
      if (!step) return { finished: true };
      if (matches(step.id, pose, baseline)) {
        streak += 1;
        if (streak >= LIMITS.holdFrames) {
          if (step.id === "straight") baseline = pose;
          index += 1;
          streak = 0;
          return { done: step.id, hint: "" };
        }
        return { hint: "Hold it..." };
      }
      streak = 0;
      return { hint: hintFor(step.id, pose, baseline) };
    },
  };
}
