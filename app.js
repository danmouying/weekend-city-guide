import { randomView, bindRandom, stopRandomAnimation } from "./random-page.js";
import { activities, categories } from "./data.js";
import {
  byId,
  recommend,
  makePlan,
  planSummary,
  encodePlan,
  decodePlan,
} from "./core.js";
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem("weekend-guide-v1") || "{}") || {};
} catch {}
let state = {
  view: "discover",
  category: "全部灵感",
  budget: [0, 50, 100, 200].includes(saved.budget) ? saved.budget : 100,
  weather: saved.weather === "rain" ? "rain" : "sun",
  people: [1, 2, 4, 6].includes(saved.people) ? saved.people : 2,
  period: saved.period === "day" ? "day" : "half",
  query: "",
  meeting:
    saved.meeting && typeof saved.meeting === "object" ? saved.meeting : null,
  plan: Array.isArray(saved.plan) ? decodePlan(saved.plan.join(",")) : [],
  favorites: Array.isArray(saved.favorites)
    ? decodePlan(saved.favorites.join(","))
    : [],
  records: Array.isArray(saved.records)
    ? saved.records.filter((r) => r && typeof r.text === "string").slice(0, 30)
    : [],
  votes: Array.isArray(saved.votes) ? decodePlan(saved.votes.join(",")) : [],
};
if (location.hash === "#random") state.view = "random";
const imported = new URLSearchParams(location.search).get("plan");
if (imported) {
  const q = new URLSearchParams(location.search);
  state.plan = decodePlan(imported);
  state.period = q.get("period") === "day" ? "day" : "half";
  state.people = [1, 2, 4, 6].includes(Number(q.get("people")))
    ? Number(q.get("people"))
    : 2;
  state.view = "plan";
}
function save() {
  try {
    localStorage.setItem(
      "weekend-guide-v1",
      JSON.stringify({
        plan: state.plan,
        favorites: state.favorites,
        records: state.records,
        votes: state.votes,
        meeting: state.meeting,
        budget: state.budget,
        weather: state.weather,
        people: state.people,
        period: state.period,
      }),
    );
    return true;
  } catch {
    toast("浏览器存储空间不足，本次更改未保存。");
    return false;
  }
}
let timer;
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
const icons = ["✳", "↗", "▧", "☕", "◈", "♫", "⌁"];
function card(a) {
  return `<article class="card"><div class="card-image"><img src="${a.image}" alt="${a.category}氛围参考图" loading="lazy"><span class="badge">${a.tag}</span><button class="favorite ${state.favorites.includes(a.id) ? "selected" : ""}" data-favorite="${a.id}" aria-label="${state.favorites.includes(a.id) ? "取消收藏" : "收藏"}：${a.title}" aria-pressed="${state.favorites.includes(a.id)}">♡</button><span class="photo-note">氛围参考图</span></div><div class="card-body"><div class="eyebrow">${a.category}<span>${a.indoor ? "室内" : "户外"} · ${a.distance} km</span></div><button class="card-title" data-detail="${a.id}">${a.title}</button><p>${a.subtitle}</p><div class="card-bottom"><span class="price">${a.cost ? "¥ " + a.cost : "免费"}<small>${a.cost ? " / 人起" : " / 好风景无价"}</small></span><button class="add ${state.plan.includes(a.id) ? "added" : ""}" data-add="${a.id}">${state.plan.includes(a.id) ? "已加入 ✓" : "加入计划 ＋"}</button></div></div></article>`;
}
function discover() {
  const matches = recommend(state);
  return `<section class="intro"><div><div class="kicker"><span></span> YOUR WEEKEND STARTS HERE</div><h1>周末，<span>去生活里逛逛。</span></h1><p>看一场展，吹一阵风。下一站，由你喜欢的事决定。</p></div><div class="weather"><span class="sun">${state.weather === "rain" ? "☂" : "☀"}</span><div><b>${state.weather === "rain" ? "雨天 · 室内也精彩" : "晴天 · 适合出门走走"}</b><small>杭州 · 天气情景演示，可在下方切换</small></div></div></section>
<section class="filters" aria-label="探索偏好"><div class="filter-title"><span>✳</span><div><b>你的周末，你来定</b><small>几次选择，找到合拍的去处</small></div></div><label>出行时间<select id="period"><option value="half" ${state.period === "half" ? "selected" : ""}>周六 · 半日</option><option value="day" ${state.period === "day" ? "selected" : ""}>周六 · 一日</option></select></label><label>人均预算<select id="budget">${[0, 50, 100, 200].map((n) => `<option value="${n}" ${state.budget === n ? "selected" : ""}>${n ? "¥ " + n + " 以内" : "免费活动"}</option>`).join("")}</select></label><label>同行人数<select id="people">${[1, 2, 4, 6].map((n) => `<option value="${n}" ${state.people === n ? "selected" : ""}>${n === 1 ? "一个人" : n + " 人同行"}</option>`).join("")}</select></label><label>天气情景<select id="weather"><option value="sun" ${state.weather === "sun" ? "selected" : ""}>晴天 / 多云</option><option value="rain" ${state.weather === "rain" ? "selected" : ""}>下雨 · 优先室内</option></select></label><button class="primary generate">帮我安排 ↗</button></section>
<div class="workspace"><section class="explore"><div class="section-heading"><div><h2>发现一点新鲜的 <span>EXPLORE</span></h2><p>不用走很远，也能给周末换个样子。</p></div><label class="search"><span>⌕</span><input id="search" placeholder="搜索活动、地点" aria-label="搜索活动、地点" value="${esc(state.query)}"></label></div><div class="categories">${categories.map((c, i) => `<button data-category="${c}" class="${state.category === c ? "active" : ""}" aria-pressed="${state.category === c}">${icons[i]} ${c}</button>`).join("")}</div><div class="result-note"><span>${state.weather === "rain" ? "☂ 已为你筛选适合雨天的室内活动" : "✧ 按你的预算和同行人数推荐"} · ${matches.length} 个灵感</span><span>全部为示例活动</span></div><div class="cards">${matches.length ? matches.map(card).join("") : '<div class="empty"><h3>暂时没有合适的活动</h3><p>试试提高预算，或者切换兴趣与天气。</p><button class="secondary" id="reset">重置筛选</button></div>'}</div></section><aside class="sidebar"><div class="weekend-note"><span class="note-label">A LITTLE REMINDER</span><h2>周末很短，<br>快乐可以<br><em>很具体。</em></h2><p>给自己一点出门的理由。</p><button class="note-random" data-view="random">没有头绪？随机抽一个 ↗</button><span class="note-arrow">↗</span></div><div class="mini-plan"><div><h3>你的出逃清单</h3><span>${state.plan.length} 站</span></div><p>${state.plan.length ? state.plan.map((id) => esc(byId(id).title)).join("<br>") : "把喜欢的活动加进来，<br>拼成属于你的周末。"}</p><button class="secondary" data-view="plan">查看周末计划 ↗</button></div><p class="aside-note">活动费用与路程为示例估算。<br>出发前请核实场地、预约与天气。</p></aside></div>`;
}
let lastView = null;
function render() {
  stopRandomAnimation();
  const viewChanged = lastView !== state.view;
  lastView = state.view;
  document
    .querySelectorAll(".nav")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.view === state.view),
    );
  $("#plan-count").textContent = state.plan.length;
  $("#main").innerHTML =
    state.view === "discover" ? discover() : secondaryView();
  bind();
  bindExtra();
  if (state.view === "random") bindRandom($("#main"), render);
  if (viewChanged) {
    $("#main").classList.remove("view-enter");
    void $("#main").offsetWidth;
    $("#main").classList.add("view-enter");
  }
}
function heading(kicker, title, subtitle) {
  return `<section class="page-heading"><div class="kicker">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></section>`;
}
function secondaryView() {
  if (state.view === "random") return randomView();
  if (state.view === "plan") return planView();
  if (state.view === "team") return teamView();
  return mineView();
}
function planView() {
  const { items, cost, minutes } = planSummary(state.plan);
  let time = state.period === "day" ? 9 * 60 : 14 * 60;
  return (
    heading(
      "A DAY, YOUR WAY",
      "把喜欢的事，排进周末。",
      "路线与花费为示例估算；交通、餐饮等额外支出请另行预留。",
    ) +
    `<div class="plan-layout"><section>${
      items.length
        ? `<div class="timeline">${items
            .map((a, i) => {
              const t =
                String(Math.floor(time / 60)).padStart(2, "0") +
                ":" +
                String(time % 60).padStart(2, "0");
              time += a.duration + 25;
              return `<article class="stop"><div class="stop-time">${t}<span>${i + 1}</span></div><img src="${a.image}" alt="${a.category}氛围参考图"><div class="stop-body"><span class="eyebrow">${a.area} · ${a.indoor ? "室内" : "户外"}</span><h3>${a.title}</h3><p>约 ${a.duration} 分钟 · 人均 ${a.cost ? "¥ " + a.cost : "免费"}</p><div class="stop-actions"><button data-detail="${a.id}">查看详情</button><button data-move="${a.id}" ${i === 0 ? "disabled" : ""}>↑ 提前一站</button><button data-remove="${a.id}">移出计划</button></div></div></article>${i < items.length - 1 ? '<div class="transit">↓ 下一站 · 预留 25 分钟交通（示例）</div>' : ""}`;
            })
            .join("")}</div>`
        : '<div class="empty"><h3>还没有安排，先去发现喜欢的活动。</h3><p>可以手动加入，也可以按偏好自动生成。</p><button class="primary" data-view="discover">发现周末灵感 ↗</button></div>'
    }<button class="secondary" data-view="discover">＋ 继续添加活动</button></section><aside class="summary"><span class="kicker">YOUR WEEKEND PLAN</span><h2>这一趟，刚刚好。</h2><div class="total"><strong>¥ ${cost}</strong><span>活动费用 / 人</span></div><div class="summary-row"><span>行程</span><b>${items.length} 站 · ${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟</b></div><div class="summary-row"><span>${state.people} 人预计活动费</span><b>¥ ${cost * state.people}</b></div>${cost > state.budget ? '<p class="warning">已超过所选人均预算，可移除或更换活动。</p>' : ""}${minutes > (state.period === "day" ? 480 : 240) ? '<p class="warning">行程较长，建议减少站点或改为一日游。</p>' : ""}<p class="soft-note">${items.some((a) => !a.indoor) ? "☂ 雨天备选：可以返回发现页选择下雨情景，重新安排室内活动。" : "☂ 这份计划包含的都是室内活动。"}</p><button class="primary" data-view="team" ${!items.length ? "disabled" : ""}>邀请朋友一起 ↗</button><button class="secondary" id="share-plan" ${!items.length ? "disabled" : ""}>复制计划链接</button><button class="text-button" id="export-plan" ${!items.length ? "disabled" : ""}>下载文字行程 ↓</button></aside></div>`
  );
}
function teamView() {
  const { items, cost } = planSummary(state.plan);
  return (
    heading(
      "BETTER TOGETHER",
      "快乐，当然可以组队。",
      "把计划分享给朋友，一起决定去哪里。",
    ) +
    `<div class="team-banner"><span class="group-symbol">↗</span><div><h2>这周六，一起出发吧。</h2><p>${items.length} 个候选活动 · 人均活动费约 ¥ ${cost} · ${state.people} 人出行</p></div><button class="primary" id="share-plan" ${!items.length ? "disabled" : ""}>分享邀请链接 ↗</button></div><div class="local-notice">组队演示：链接可分享当前行程快照；投票、报名只保存在这台设备，不会与朋友的设备同步。</div><section class="team-grid"><div><h2 class="subheading">想去哪一站？投一票</h2>${items.length ? items.map((a) => `<article class="vote-row"><img src="${a.image}" alt="${a.category}参考图"><div><h3>${a.title}</h3><p>${a.area} · ${a.cost ? "¥ " + a.cost : "免费"}</p></div><button class="${state.votes.includes(a.id) ? "primary" : "secondary"}" data-vote="${a.id}" aria-pressed="${state.votes.includes(a.id)}">${state.votes.includes(a.id) ? "已投票 ✓" : "投一票"}</button></article>`).join("") : '<div class="empty"><p>先加入活动，再发起邀请。</p><button class="secondary" data-view="discover">去发现活动</button></div>'}</div><form class="panel" id="join-form"><h2>记下集合信息</h2><label>你的昵称<input name="name" required maxlength="20" placeholder="怎么称呼你？"></label><label>集合地点<input name="place" required maxlength="60" placeholder="例如：龙翔桥地铁站 B 口"></label><label>集合时间<input name="time" type="datetime-local" required></label><button class="primary" ${!items.length ? "disabled" : ""}>生成报名确认</button><p class="soft-note">仅本机演示，请通过聊天工具与朋友确认。</p><div id="join-result" role="status"></div></form></section>`
  );
}
function mineView() {
  return (
    heading(
      "SMALL MOMENTS, BIG MEMORIES",
      "把周末，存进回忆。",
      "收藏下次想去的地方，也记住这次的小快乐。",
    ) +
    `<div class="stats"><div><strong>${state.favorites.length}</strong><span>收藏的灵感</span></div><div><strong>${state.records.length}</strong><span>周末打卡</span></div><div><strong>${new Set(state.records.map((r) => r.activity)).size}</strong><span>探索过的去处</span></div></div><div class="mine-layout"><section><h2 class="subheading">我的收藏</h2><div class="cards">${state.favorites.length ? state.favorites.map((id) => card(byId(id))).join("") : '<div class="empty"><p>点击活动卡片上的 ♡，收藏下一次出发的灵感。</p><button class="secondary" data-view="discover">去发现活动 ↗</button></div>'}</div><h2 class="subheading spaced">我的打卡</h2>${
      state.records.length
        ? state.records
            .slice()
            .reverse()
            .map(
              (r) =>
                `<article class="record">${r.photo && /^data:image\/(jpeg|png|webp);base64,/.test(r.photo) ? `<img src="${r.photo}" alt="我的出行照片">` : ""}<span class="eyebrow">${esc(r.date || "")} · 实际花费 ¥ ${Number(r.cost) || 0}</span><h3>${esc(byId(r.activity)?.title || "周末出行")}</h3><p>${esc(r.text)}</p><button class="secondary" data-record-share="${esc(r.id)}">分享攻略</button></article>`,
            )
            .join("")
        : '<p class="soft-note">第一段周末回忆，等你来记录。</p>'
    }</section><form class="panel" id="checkin-form"><h2>记录今天的小快乐</h2><label>打卡活动<select name="activity">${activities.map((a) => `<option value="${a.id}">${a.title}</option>`).join("")}</select></label><label>实际花费（元 / 人）<input name="cost" type="number" min="0" max="100000" step="0.01" required placeholder="0"></label><label>照片（可选，最大 2 MB）<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><label>一句话感受<textarea name="text" required maxlength="500" rows="4" placeholder="今天最喜欢的瞬间是什么？"></textarea></label><button class="primary">保存打卡 ↗</button><p class="soft-note">照片与记录仅保存于本机浏览器。分享攻略会打开草稿供你确认。</p></form></div>`
  );
}
function showDialog(html) {
  $("#detail").innerHTML =
    `<button class="dialog-close" aria-label="关闭弹窗">×</button>${html}`;
  $("#detail").showModal();
  $(".dialog-close").onclick = () => $("#detail").close();
}
function detail(id) {
  const a = byId(id);
  showDialog(
    `<img class="detail-image" src="${a.image}" alt="${a.category}氛围参考图"><span class="eyebrow">${a.category} · ${a.indoor ? "室内" : "户外"}</span><h2>${a.title}</h2><p>${a.desc}</p><p>地点：${a.area}<br>时长：约 ${a.duration} 分钟<br>费用：${a.cost ? "人均 ¥ " + a.cost + "（示例估算）" : "免费（示例）"}</p><p class="soft-note">来源：课程演示策划 · 数据版本 2026-09-15。图片为场景示意，非活动现场。</p><a class="secondary" href="https://www.openstreetmap.org/search?query=${encodeURIComponent("杭州 " + a.area)}" target="_blank" rel="noopener noreferrer">查看片区地图 ↗</a>`,
  );
}
async function copyOrShow(text, title = "复制内容") {
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制，可以粘贴分享");
  } catch {
    showDialog(
      `<h2>${title}</h2><p>请手动复制下方内容：</p><textarea class="copy-area" readonly rows="7">${esc(text)}</textarea>`,
    );
  }
}
function sharePlan() {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("plan", encodePlan(state.plan));
  url.searchParams.set("period", state.period);
  url.searchParams.set("people", String(state.people));
  copyOrShow(url.href, "分享计划");
}
function planText() {
  const s = planSummary(state.plan);
  return (
    "周末去哪儿 · 我的杭州周末计划\n" +
    s.items
      .map(
        (a, i) =>
          `${i + 1}. ${a.title}｜${a.area}｜约 ${a.duration} 分钟｜人均 ¥ ${a.cost}`,
      )
      .join("\n") +
    `\n预计活动费：¥ ${s.cost}/人；交通及餐饮另计。\n活动、时间、价格为演示估算，请出发前核实。`
  );
}
function exportPlan() {
  const blob = new Blob([planText()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "我的周末计划.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function compressPhoto(file) {
  if (!file || !file.size) return "";
  if (file.size > 2 * 1024 * 1024) throw new Error("请选择小于 2 MB 的照片。");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("请选择 JPG、PNG 或 WebP 照片。");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.7);
}
function bindExtra() {
  document
    .querySelectorAll("[data-detail]")
    .forEach((b) => (b.onclick = () => detail(b.dataset.detail)));
  document.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        state.plan = state.plan.filter((id) => id !== b.dataset.remove);
        save();
        render();
      }),
  );
  document.querySelectorAll("[data-move]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = state.plan.indexOf(b.dataset.move);
        if (i > 0)
          [state.plan[i - 1], state.plan[i]] = [
            state.plan[i],
            state.plan[i - 1],
          ];
        save();
        render();
      }),
  );
  document.querySelectorAll("[data-vote]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.vote;
        state.votes = state.votes.includes(id)
          ? state.votes.filter((x) => x !== id)
          : [...state.votes, id];
        save();
        render();
      }),
  );
  if ($("#share-plan")) $("#share-plan").onclick = sharePlan;
  if ($("#export-plan")) $("#export-plan").onclick = exportPlan;
  const join = $("#join-form");
  if (join && state.meeting) {
    for (const key of ["name", "place", "time"])
      join.elements[key].value = String(state.meeting[key] || "");
  }
  if (join)
    join.onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(join);
      const name = String(data.get("name")).trim(),
        place = String(data.get("place")).trim();
      if (!name || !place) {
        toast("请填写昵称和集合地点");
        return;
      }
      const info = { name, place, time: String(data.get("time")) };
      state.meeting = info;
      if (!save()) return;
      $("#join-result").textContent =
        `已记录：${name}，${info.time.replace("T", " ")} 在 ${place} 集合。请把信息发给朋友确认。`;
    };
  const checkin = $("#checkin-form");
  if (checkin)
    checkin.onsubmit = async (e) => {
      e.preventDefault();
      const data = new FormData(checkin);
      const text = String(data.get("text")).trim();
      if (!text) {
        toast("写下一点感受，再保存吧");
        return;
      }
      const button = checkin.querySelector("button");
      button.disabled = true;
      try {
        const photo = await compressPhoto(data.get("photo"));
        const previous = state.records.slice();
        state.records.push({
          id: crypto.randomUUID(),
          activity: String(data.get("activity")),
          cost: Number(data.get("cost")),
          text,
          photo,
          date: new Date().toLocaleDateString("zh-CN"),
        });
        state.records = state.records.slice(-30);
        if (!save()) {
          state.records = previous;
          button.disabled = false;
          return;
        }
        render();
        toast("这段周末回忆，保存好了");
      } catch (err) {
        toast(err.message || "照片处理失败，请更换照片");
        button.disabled = false;
      }
    };
  document.querySelectorAll("[data-record-share]").forEach(
    (b) =>
      (b.onclick = () => {
        const r = state.records.find((x) => x.id === b.dataset.recordShare);
        const text = `我的周末攻略｜${byId(r.activity)?.title || "杭州出行"}\n${r.date} · 实际花费 ¥ ${r.cost}/人\n${r.text}\n活动信息仅供参考，出行前请核实。`;
        showDialog(
          `<h2>分享前，检查一下攻略</h2><p class="soft-note">只分享文字，不包含照片。可以编辑后再复制。</p><textarea class="copy-area" id="share-draft" rows="8" maxlength="1500">${esc(text)}</textarea><button class="primary" id="copy-draft">确认并复制攻略</button>`,
        );
        $("#copy-draft").onclick = () => copyOrShow($("#share-draft").value);
      }),
  );
}

function bind() {
  $(".brand").onclick = (e) => {
    e.preventDefault();
    state.view = "discover";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  document.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        state.view = b.dataset.view;
        history.replaceState(
          null,
          "",
          location.pathname + (state.view === "random" ? "#random" : ""),
        );
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }),
  );
  document.querySelectorAll("[data-category]").forEach(
    (b) =>
      (b.onclick = () => {
        state.category = b.dataset.category;
        render();
      }),
  );
  for (const key of ["budget", "period", "people", "weather"]) {
    const el = $("#" + key);
    if (el)
      el.onchange = () => {
        state[key] = ["budget", "people"].includes(key)
          ? Number(el.value)
          : el.value;
        save();
        render();
      };
  }
  const search = $("#search");
  if (search)
    search.oninput = () => {
      const p = search.selectionStart;
      state.query = search.value;
      render();
      $("#search").focus();
      $("#search").setSelectionRange(p, p);
    };
  document.querySelectorAll("[data-add]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.add;
        if (state.plan.includes(id)) {
          toast("这个活动已经在计划里了");
          return;
        }
        state.plan.push(id);
        const stored = save();
        render();
        if (stored) toast("已加入周末计划");
      }),
  );
  document.querySelectorAll("[data-favorite]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.favorite;
        state.favorites = state.favorites.includes(id)
          ? state.favorites.filter((x) => x !== id)
          : [...state.favorites, id];
        save();
        render();
      }),
  );
  document.querySelectorAll(".generate").forEach(
    (b) =>
      (b.onclick = () => {
        state.plan = makePlan(state);
        save();
        state.view = "plan";
        render();
      }),
  );
  if ($("#reset"))
    $("#reset").onclick = () => {
      Object.assign(state, {
        budget: 100,
        people: 2,
        weather: "sun",
        category: "全部灵感",
        query: "",
      });
      render();
    };
}
if (navigator.modelContext?.registerTool) {
  try {
    navigator.modelContext.registerTool({
      name: "filter_weekend_activities",
      description: "按兴趣、天气、人均预算筛选杭州示例活动并更新发现页。",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string", enum: categories },
          weather: { type: "string", enum: ["sun", "rain"] },
          budget: { type: "number", enum: [0, 50, 100, 200] },
        },
      },
      execute: async (args) => {
        if (categories.includes(args.category)) state.category = args.category;
        if (["sun", "rain"].includes(args.weather))
          state.weather = args.weather;
        if ([0, 50, 100, 200].includes(args.budget)) state.budget = args.budget;
        state.view = "discover";
        render();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                recommend(state).map((a) => ({
                  id: a.id,
                  title: a.title,
                  cost: a.cost,
                })),
              ),
            },
          ],
        };
      },
    });
  } catch {}
}
render();
