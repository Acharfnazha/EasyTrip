// Tests of the camera check's rules (public/js/liveness-pose.mjs) on made-up face points: no
// camera and no browser needed. Run them with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { poseOf, matches, createTracker, STEPS, LIMITS } from "../public/js/liveness-pose.mjs";

// 68 points of a face: the jaw from x = center - half to center + half, and the nose tip moved
// by noseShift (a share of the face's width) from the middle. Only points 0, 16 and 30 matter.
function face(center, half, noseShift) {
  const points = Array.from({ length: 68 }, () => ({ x: center, y: 200 }));
  points[0] = { x: center - half, y: 200 };
  points[16] = { x: center + half, y: 200 };
  points[30] = { x: center + noseShift * 2 * half, y: 210 };
  return points;
}
const IMAGE = 640;

test("a straight face has no turn, and its width is a share of the picture", () => {
  const pose = poseOf(face(320, 80, 0), IMAGE);
  assert.equal(pose.yaw, 0);
  assert.equal(pose.width, 160 / 640);
});

test("turning to the person's left moves the nose right in the camera's picture", () => {
  assert.ok(poseOf(face(320, 80, 0.2), IMAGE).yaw > 0);
  assert.ok(matches("left", poseOf(face(320, 80, 0.2), IMAGE)));
  assert.ok(!matches("right", poseOf(face(320, 80, 0.2), IMAGE)));
  assert.ok(matches("right", poseOf(face(320, 80, -0.2), IMAGE)));
});

test("a small turn is neither straight nor turned", () => {
  const pose = poseOf(face(320, 80, 0.1), IMAGE);
  assert.ok(!matches("straight", pose));
  assert.ok(!matches("left", pose));
});

test("a face too far away doesn't count as looking straight", () => {
  assert.ok(!matches("straight", poseOf(face(320, 40, 0), IMAGE))); // 80px of 640 = 12.5%
});

test("closer needs a face 30% wider than when looking straight, still facing the camera", () => {
  const baseline = poseOf(face(320, 80, 0), IMAGE);
  assert.ok(!matches("closer", poseOf(face(320, 90, 0), IMAGE), baseline));
  assert.ok(matches("closer", poseOf(face(320, 110, 0), IMAGE), baseline));
  assert.ok(!matches("closer", poseOf(face(320, 110, 0.2), IMAGE), baseline));
});

test("the tracker needs each movement held for a few frames, in order", () => {
  const tracker = createTracker();
  const straight = poseOf(face(320, 80, 0), IMAGE);
  const left = poseOf(face(320, 80, 0.2), IMAGE);
  const right = poseOf(face(320, 80, -0.2), IMAGE);
  const closer = poseOf(face(320, 110, 0), IMAGE);
  const done = [];
  const feed = (pose, times) => { for (let i = 0; i < times; i++) { const r = tracker.feed(pose); if (r.done) done.push(r.done); } };

  feed(left, 5); // turning first does nothing: the first step is to look straight
  assert.deepEqual(done, []);
  feed(straight, LIMITS.holdFrames - 1);
  feed(null, 1); // a frame without a face starts the count again
  feed(straight, LIMITS.holdFrames - 1);
  assert.deepEqual(done, []);
  feed(straight, 1);
  feed(left, LIMITS.holdFrames);
  feed(right, LIMITS.holdFrames);
  feed(closer, LIMITS.holdFrames);
  assert.deepEqual(done, STEPS.map((step) => step.id));
  assert.ok(tracker.finished);
});

test("a photo that doesn't move can't finish the check", () => {
  // A printed photo held up to the camera always gives the same pose.
  const tracker = createTracker();
  const still = poseOf(face(320, 80, 0), IMAGE);
  for (let i = 0; i < 200; i++) tracker.feed(still);
  assert.equal(tracker.step.id, "left");
  assert.ok(!tracker.finished);
});
