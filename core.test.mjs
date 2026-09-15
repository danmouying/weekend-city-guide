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
