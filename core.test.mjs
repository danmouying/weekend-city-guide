import test from "node:test";
import assert from "node:assert/strict";
import {
  recommend,
  makePlan,
  planSummary,
  decodePlan,
  encodePlan,
} from "./core.js";
test("rain excludes every outdoor activity", () => {
  const result = recommend({ weather: "rain" });
  assert.ok(result.length > 0);
  assert.ok(result.every((a) => a.indoor));
});
test("a free indoor search produces an honest empty state", () =>
  assert.equal(recommend({ weather: "rain", budget: 0 }).length, 0));
test("category, capacity and keyword all constrain results", () => {
  assert.equal(recommend({ category: "美食咖啡", people: 6 }).length, 0);
  assert.deepEqual(
    recommend({ query: "西湖" }).map((a) => a.id),
    ["lake"],
  );
});
test("generated plans respect total budget and available time across preference combinations", () => {
  for (const budget of [0, 50, 100, 200])
    for (const people of [1, 2, 4, 6])
      for (const period of ["half", "day"])
        for (const weather of ["sun", "rain"]) {
          const f = { budget, people, period, weather };
          const summary = planSummary(makePlan(f));
          assert.ok(summary.cost <= budget);
          assert.ok(summary.minutes <= (period === "day" ? 480 : 240));
          assert.ok(
            summary.items.every(
              (a) => a.capacity >= people && (weather !== "rain" || a.indoor),
            ),
          );
        }
});
test("sharing ignores unknown and duplicate activity ids", () => {
  assert.deepEqual(decodePlan("lake,<script>,lake,coffee"), ["lake", "coffee"]);
  assert.deepEqual(decodePlan(encodePlan(["gallery", "coffee"])), [
    "gallery",
    "coffee",
  ]);
});
test("summary includes transfer time and does not double charge duplicates", () => {
  assert.deepEqual(
    planSummary(["gallery", "coffee", "gallery", "bad"]).cost,
    65,
  );
  assert.equal(planSummary(["gallery", "coffee"]).minutes, 175);
  assert.equal(planSummary([]).minutes, 0);
});

import {
  randomActivities,
  partyModes,
  poolFor,
  drawActivity,
} from "./random-data.js";
import { activities } from "./data.js";
test("there are exactly 50 unique entertainment ideas split 18 / 16 / 16", () => {
  assert.equal(randomActivities.length, 50);
  assert.equal(new Set(randomActivities.map((a) => a.id)).size, 50);
  assert.equal(new Set(randomActivities.map((a) => a.title)).size, 50);
  assert.deepEqual(
    Object.keys(partyModes).map((k) => poolFor(k).length),
    [18, 16, 16],
  );
});
test("every possible draw index stays inside the selected participant pool", () => {
  for (const party of Object.keys(partyModes)) {
    const pool = poolFor(party);
    const observed = new Set();
    for (let i = 0; i < pool.length; i++) {
      const picked = drawActivity(party, null, () => (i + 0.5) / pool.length);
      assert.equal(picked.party, party);
      observed.add(picked.id);
    }
    assert.equal(observed.size, pool.length);
  }
});
test("solo activities cannot enter pair or group draws, including after a pool change", () => {
  for (const solo of poolFor("solo"))
    for (const party of ["pair", "group"]) {
      for (const value of [0, 0.25, 0.5, 0.75, 0.999999])
        assert.equal(drawActivity(party, solo.id, () => value).party, party);
    }
});
test("the immediate previous result is excluded for every member of every pool", () => {
  for (const a of randomActivities)
    for (let i = 0; i < 50; i++)
      assert.notEqual(drawActivity(a.party, a.id, () => i / 50).id, a.id);
});
test("invalid pools and invalid entropy fail instead of falling back to the full pool", () => {
  for (const party of ["", null, "all", "__proto__"])
    assert.throws(() => drawActivity(party), RangeError);
  for (const value of [-1, 1, NaN, Infinity])
    assert.throws(() => drawActivity("solo", null, () => value), RangeError);
});
test("each discovery activity uses a distinct theme photo", () =>
  assert.equal(
    new Set(activities.map((a) => a.image)).size,
    activities.length,
  ));
