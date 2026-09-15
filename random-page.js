import {
  partyModes,
  randomActivities,
  poolFor,
  drawActivity,
} from "./random-data.js";

const model = { party: null, result: null, history: [], spinning: false };
let timeout, interval;
let mountedRoot = null;
let generation = 0;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export function stopRandomAnimation() {
  clearTimeout(timeout);
  clearInterval(interval);
  generation++;
  model.spinning = false;
  mountedRoot = null;
}

function resultMarkup(activity) {
  if (!activity)
    return `<div class="draw-placeholder"><span class="draw-symbol" aria-hidden="true">✳</span><span class="kicker">LET CHANCE MAKE A PLAN</span><h2>下一站，还没想好？</h2><p>先选一起出发的人数，<br>剩下的一点犹豫，交给随机。</p></div>`;
  return `<article class="draw-result"><div class="result-top"><span class="kicker">YOUR NEXT LITTLE ADVENTURE</span><span class="result-party">${partyModes[activity.party].people}</span></div><span class="activity-icon" role="img" aria-label="${activity.title}主题图标">${activity.icon}</span><p class="result-category">${activity.category}</p><h2>${activity.title}</h2><div class="draw-meta"><span>¥ ${activity.budget} / 人</span><span>${activity.duration}</span></div><p class="result-description">${activity.description}</p><a class="secondary" href="https://www.openstreetmap.org/search?query=${encodeURIComponent("杭州 " + activity.search)}" target="_blank" rel="noopener noreferrer">查找相关场地 ↗</a></article>`;
}

export function randomView() {
  const pool = model.party ? poolFor(model.party) : [];
  return `<section class="random-heading"><div class="kicker">A LITTLE CHANCE. A NEW WEEKEND.</div><h1>不知道去哪，<span>就抽一个。</span></h1><p>50 个娱乐灵感。先选人数，再让今天发生一点新鲜的事。</p></section>
  <div class="random-layout"><section class="random-controls"><div class="step-label"><span>01</span> 今天和谁一起？</div><div class="party-options" role="group" aria-label="游玩人数">${Object.entries(
    partyModes,
  )
    .map(
      ([key, mode]) =>
        `<button class="party-option ${model.party === key ? "chosen" : ""}" data-party="${key}" aria-pressed="${model.party === key}"><span class="party-icon" aria-hidden="true">${mode.icon}</span><span><span class="party-title">${mode.label}</span><small>${mode.subtitle}</small></span><span class="pool-badge">${poolFor(key).length} 项</span></button>`,
    )
    .join(
      "",
    )}</div><p class="pool-rule">三个人数池独立抽取。一个人的项目不会出现在两个人或多人的结果中。</p><div class="draw-control"><div class="step-label"><span>02</span> 给周末一点意外</div><button class="primary draw-button" id="draw-button" ${!model.party ? "disabled" : ""}>${model.result ? "再抽一个" : "抽取我的周末"} <span aria-hidden="true">↗</span></button><p id="draw-hint">${model.party ? `从「${partyModes[model.party].label}」${pool.length} 项中随机抽取，连续两次不重复` : "选择游玩人数后即可开始"}</p></div><div class="random-art"><span>MAKE ROOM<br>FOR THE UNEXPECTED.</span><small>给意料之外，留一点位置。</small></div></section>
  <section class="draw-stage" aria-label="随机抽取结果"><div class="stage-index"><span>WEEKEND LOTTERY</span><span>${model.party ? `${pool.length} IDEAS / ${partyModes[model.party].label}` : "50 IDEAS / 3 POOLS"}</span></div><div id="draw-result" aria-live="polite" aria-atomic="true">${resultMarkup(model.result)}</div><div id="draw-status" class="draw-status" role="status"></div><p class="draw-disclaimer">娱乐灵感与预算为策划参考，请核实场地开放、价格及人数要求。</p></section></div>
  <section class="draw-history"><div class="section-heading"><h2>刚刚的灵感</h2><p>本次浏览的最近 6 次抽取</p></div><div class="history-items">${model.history.length ? model.history.map((a) => `<button data-history="${a.id}" class="history-item"><span aria-hidden="true">${a.icon}</span><span>${a.title}<small>${partyModes[a.party].label}</small></span></button>`).join("") : '<p class="soft-note">喜欢的灵感不用急着选，抽过的结果会留在这里。</p>'}</div></section>
  <details class="pool-details"><summary>查看${model.party ? "「" + partyModes[model.party].label + "」" + pool.length + " 个" : "全部 50 个"}项目 <span>＋</span></summary><div class="pool-list">${(model.party
    ? [[model.party, partyModes[model.party]]]
    : Object.entries(partyModes)
  )
    .map(
      ([key, mode]) =>
        `<section><h3>${mode.label} · ${poolFor(key).length} 项</h3><ul>${poolFor(
          key,
        )
          .map(
            (a) =>
              `<li><span aria-hidden="true">${a.icon}</span>${a.title}</li>`,
          )
          .join("")}</ul></section>`,
    )
    .join("")}</div></details>`;
}

export function bindRandom(root, rerender) {
  mountedRoot = root;
  root.querySelectorAll("[data-party]").forEach(
    (button) =>
      (button.onclick = () => {
        stopRandomAnimation();
        model.party = button.dataset.party;
        model.result = null;
        // Never carry a result/history from one participant pool into another.
        model.history = [];
        rerender();
      }),
  );
  root.querySelectorAll("[data-history]").forEach(
    (button) =>
      (button.onclick = () => {
        if (model.spinning) return;
        model.result =
          randomActivities.find(
            (a) => a.id === button.dataset.history && a.party === model.party,
          ) || null;
        rerender();
      }),
  );
  const button = root.querySelector("#draw-button");
  button.onclick = () => {
    if (!model.party || model.spinning) return;
    const selected = drawActivity(model.party, model.result?.id);
    const pool = poolFor(model.party);
    const token = ++generation;
    model.spinning = true;
    button.disabled = true;
    button.textContent = "正在寻找周末灵感…";
    const stage = root.querySelector("#draw-result");
    stage.setAttribute("aria-busy", "true");
    root.querySelector("#draw-status").textContent = "正在从所选人数池抽取";
    stage.innerHTML = `<div class="draw-placeholder drawing"><span class="draw-symbol" aria-hidden="true">✳</span><h2 id="rolling-name" aria-hidden="true">一点新的可能…</h2><p>只在「${partyModes[model.party].label}」池中寻找</p></div>`;
    let index = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced)
      interval = setInterval(() => {
        const label = root.querySelector("#rolling-name");
        if (label) label.textContent = pool[index++ % pool.length].title;
      }, 140);
    timeout = setTimeout(
      () => {
        clearInterval(interval);
        if (token !== generation || mountedRoot !== root) return;
        model.spinning = false;
        model.result = selected;
        model.history = [
          selected,
          ...model.history.filter((a) => a.id !== selected.id),
        ].slice(0, 6);
        rerender();
        root.querySelector("#draw-status").textContent =
          `抽中了：${selected.title}，适合${partyModes[selected.party].people}`;
        root.querySelector("#draw-button").focus({ preventScroll: true });
        if (matchMedia("(max-width: 760px)").matches) root.querySelector("#draw-result").scrollIntoView({behavior: reduced ? "auto" : "smooth", block: "center"});
      },
      reduced ? 40 : 1150,
    );
  };
}
