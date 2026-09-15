import { activities } from "./data.js";
export const byId = (id) => activities.find((a) => a.id === id);
export function recommend({
  category = "全部灵感",
  budget = 100,
  weather = "sun",
  people = 2,
  query = "",
} = {}) {
  return activities.filter(
    (a) =>
      (category === "全部灵感" || a.category === category) &&
      a.cost <= budget &&
      (weather !== "rain" || a.indoor) &&
      a.capacity >= people &&
      `${a.title}${a.subtitle}${a.area}`.includes(query.trim()),
  );
}
export function makePlan(filters) {
  const pool = recommend(filters);
  let remaining = Number(filters.budget),
    minutes = 0;
  const limit = filters.period === "day" ? 480 : 240;
  const selected = [];
  for (const a of pool) {
    const travel = selected.length ? 25 : 0;
    if (a.cost <= remaining && minutes + travel + a.duration <= limit) {
      selected.push(a.id);
      remaining -= a.cost;
      minutes += travel + a.duration;
    }
  }
  return selected;
}
export function planSummary(ids) {
  const items = [...new Set(ids)].map(byId).filter(Boolean);
  return {
    items,
    cost: items.reduce((sum, a) => sum + a.cost, 0),
    minutes:
      items.reduce((sum, a) => sum + a.duration, 0) +
      Math.max(0, items.length - 1) * 25,
  };
}
export function encodePlan(ids) {
  return ids.filter((id) => byId(id)).join(",");
}
export function decodePlan(value) {
  return [...new Set(String(value).split(","))]
    .filter((id) => byId(id))
    .slice(0, 6);
}
