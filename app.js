(() => {
  const S = window.SITE, ISLANDS = window.ISLANDS;
  const $ = (s, r = document) => r.querySelector(s);
  const gradeName = { 7: "七年級", 8: "八年級", 9: "九年級" };
  const termLabel = (g, t) => ({ 7: "七", 8: "八", 9: "九" }[g]) + (t === 1 ? "上" : "下");
  const state = { grade: 0, q: "", view: "map", island: null, tab: "標準" };
  const byId = Object.fromEntries(ISLANDS.map(i => [i.id, i]));

  const grades = (i) => [...new Set(i.sequence.map(s => s.grade))].sort();
  const hours = (i) => i.sequence.reduce((a, s) => a + s.hours, 0);
  const haystack = (i) => JSON.stringify(i).toLowerCase();
  const matches = (i) =>
    (!state.grade || grades(i).includes(state.grade)) &&
    (!state.q || haystack(i).includes(state.q.toLowerCase()));

  /* ---------- header ---------- */
  $("#siteTitle").textContent = S.title;
  $("#siteSub").textContent = S.subtitle;
  const gc = $("#gradeChips");
  [[0, "全部"], [7, "七年級"], [8, "八年級"], [9, "九年級"]].forEach(([g, label]) => {
    const b = document.createElement("button");
    b.className = "chip" + (g === 0 ? " active" : "");
    b.textContent = label;
    b.dataset.grade = g;
    b.onclick = () => setGradeFilter(g);
    gc.appendChild(b);
  });
  function setGradeFilter(g) {
    state.grade = g;
    [...gc.children].forEach(c => c.classList.toggle("active", +c.dataset.grade === g));
    refresh();
    document.dispatchEvent(new CustomEvent("ii:gradefilter", { detail: { grade: g } }));
  }
  window.setGradeFilter = setGradeFilter;
  $("#viewChips").onclick = (e) => {
    const v = e.target.dataset.view; if (!v) return;
    state.view = v;
    [...$("#viewChips").children].forEach(c => c.classList.toggle("active", c.dataset.view === v));
    document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === "view" + v[0].toUpperCase() + v.slice(1)));
  };

  /* ---------- map ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function blob(r, seed, n = 9) {
    const rand = rng(seed * 9973 + 7), pts = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, rr = r * (0.78 + rand() * 0.38);
      pts.push([Math.cos(a) * rr * 1.15, Math.sin(a) * rr * 0.82]);
    }
    let d = "";
    for (let k = 0; k < n; k++) {
      const p0 = pts[(k - 1 + n) % n], p1 = pts[k], p2 = pts[(k + 1) % n], p3 = pts[(k + 2) % n];
      if (k === 0) d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + "Z";
  }
  const svg = $("#map");
  function buildMap() {
    // waves
    for (let y = 40; y < 900; y += 55) {
      const d = Array.from({ length: 13 }, (_, k) => `${k ? "T" : "M"}${k * 100},${y + (k % 2 ? 12 : -12)}`).join(" ");
      el("path", { d, class: "wave", "stroke-dasharray": "40 20", style: `animation-delay:${-y / 40}s` }, svg);
    }
    // route
    const pts = S.route.map(id => byId[id].pos);
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const nx = -(b.y - a.y) * 0.15, ny = (b.x - a.x) * 0.15;
      d += ` Q${mx + nx},${my + ny} ${b.x},${b.y}`;
    }
    el("path", { d, class: "route", id: "routePath" }, svg);
    // islands
    ISLANDS.forEach((isl, idx) => {
      const g = el("g", { class: "island", transform: `translate(${isl.pos.x},${isl.pos.y})`, tabindex: 0, role: "button", "aria-label": isl.name, "data-id": isl.id }, svg);
      el("ellipse", { class: "shadow", cx: 6, cy: isl.pos.r * 0.8, rx: isl.pos.r * 1.2, ry: isl.pos.r * 0.22 }, g);
      const bob = el("g", { class: "bob", style: `animation-delay:${-idx * 0.7}s` }, g);
      const shoreG = el("g", { transform: "scale(1.14)" }, bob);
      el("path", { d: blob(isl.pos.r, idx + 1), class: "shore" }, shoreG);
      el("path", { d: blob(isl.pos.r, idx + 1), class: "land", fill: isl.color }, bob);
      const hill = el("g", { transform: "scale(.6) translate(0,-8)" }, bob);
      el("path", { d: blob(isl.pos.r, idx + 11, 7), fill: "rgba(0,0,0,.18)" }, hill);
      el("text", { class: "emoji", x: 0, y: -4 }, bob).textContent = isl.emoji;
      const ly = isl.pos.r * 0.82 + 14, w = Math.max(185, isl.name.length * 24 + 48);
      el("rect", { class: "label-bg", x: -w / 2, y: ly, width: w, height: 52, rx: 14 }, g);
      el("text", { class: "label", x: 0, y: ly + 24 }, g).textContent = isl.name;
      el("text", { class: "sub", x: 0, y: ly + 43, "data-sub-id": isl.id }, g).textContent = isl.tag;
      // grade dots
      grades(isl).forEach((gr, k, arr) => {
        const cx = (k - (arr.length - 1) / 2) * 26;
        el("circle", { class: "gdot", cx, cy: -isl.pos.r * 0.82 - 4, r: 11, fill: "#fff" }, g);
        el("text", { class: "gtxt", x: cx, y: -isl.pos.r * 0.82 - 3.5 }, g).textContent = gr;
      });
      g.addEventListener("click", () => openIsland(isl.id));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openIsland(isl.id); } });
    });
  }
  $("#routeToggle").onchange = (e) => { $("#routePath").style.display = e.target.checked ? "" : "none"; };

  /* ---------- list & term views ---------- */
  const isMicroLabDone = (id) => {
    if (window.IslandMicroLabs && typeof window.IslandMicroLabs.isLabCompleted === "function") {
      return window.IslandMicroLabs.isLabCompleted(id);
    }
    if (window.AvatarSystem && typeof window.AvatarSystem.isMicroLabCompleted === "function") {
      return window.AvatarSystem.isMicroLabCompleted(id);
    }
    return false;
  };
  let microLabsLoadPromise = null;
  let microLabMountSeq = 0;

  function loadIslandMicroLabs() {
    if (window.IslandMicroLabs && typeof window.IslandMicroLabs.mount === "function") {
      return Promise.resolve(window.IslandMicroLabs);
    }
    if (!microLabsLoadPromise) {
      microLabsLoadPromise = import("./js/islandMicroLabs.js").then(() => window.IslandMicroLabs);
    }
    return microLabsLoadPromise;
  }

  async function mountMicroLabLazy(mountEl, islandId) {
    if (!mountEl) return;
    const seq = ++microLabMountSeq;
    if (window.IslandMicroLabs && typeof window.IslandMicroLabs.mount === "function") {
      window.IslandMicroLabs.mount(mountEl, islandId);
      return;
    }
    const islName = byId[islandId] ? byId[islandId].name : "";
    mountEl.innerHTML = `<div class="mlab-loading-card">⏳ 正在載入「${esc(islName)}」微實作實驗室…</div>`;
    try {
      const mod = await loadIslandMicroLabs();
      const curMount = $("#islandMicroLabMount");
      if (
        seq !== microLabMountSeq ||
        !state.island ||
        state.island.id !== islandId ||
        state.tab !== "延伸" ||
        state.unit ||
        !curMount
      ) {
        return;
      }
      if (mod && typeof mod.mount === "function") {
        mod.mount(curMount, islandId);
      }
    } catch (err) {
      microLabsLoadPromise = null;
      const curMount = $("#islandMicroLabMount");
      if (
        seq !== microLabMountSeq ||
        !state.island ||
        state.island.id !== islandId ||
        state.tab !== "延伸" ||
        state.unit ||
        !curMount
      ) {
        return;
      }
      console.error("[app] 動態載入微實作實驗室失敗:", err);
      curMount.innerHTML = `<div class="mlab-loading-card is-error">
        <p>⚠️ 微實作實驗室模組載入失敗，請檢查網路連線後重試。</p>
        <button type="button" class="btn-doc" id="mlabRetryLoadBtn">🔄 重新載入</button>
      </div>`;
      const retryBtn = curMount.querySelector("#mlabRetryLoadBtn");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => {
          void mountMicroLabLazy($("#islandMicroLabMount"), islandId);
        });
      }
    }
  }
  const getProgressState = () => (window.Store && window.Store.profile ? window.Store.events() : []);
  const getCompletion = (id) => {
    if (typeof window.calculateIslandCompletion === "function") {
      return window.calculateIslandCompletion(id, getProgressState());
    }
    const isl = byId[id];
    const uLen = isl && Array.isArray(isl.sequence) ? isl.sequence.length : 0;
    return { islandId: id, totalUnits: uLen, totalStages: uLen * 3, passedStages: 0, percentage: 0, unitDetails: [] };
  };

  function buildCards() {
    const box = $("#cards"); box.innerHTML = "";
    ISLANDS.forEach(i => {
      const b = document.createElement("button");
      const labDone = isMicroLabDone(i.id);
      const comp = getCompletion(i.id);
      b.className = "card" + (matches(i) ? "" : " dim"); b.style.setProperty("--c", i.color);
      b.innerHTML = `<div class="card-head-row"><h3>${i.emoji} ${i.name}</h3><div class="card-head-badges"><span class="card-comp-pill">${comp.percentage}%（${comp.passedStages}/${comp.totalStages} 關）</span>${labDone ? `<span class="mlab-card-badge">🔬 微實作已通關</span>` : ""}</div></div><p>${i.tagline}</p>
        <div class="card-comp-bar" aria-hidden="true"><i style="width:${comp.percentage}%"></i></div>
        <p class="meta">${i.tag} · ${grades(i).map(g => gradeName[g]).join("、")} · 建議 ${hours(i)} 節 · ${i.sequence.length} 個單元</p>`;
      b.onclick = () => openIsland(i.id);
      box.appendChild(b);
    });
  }
  function buildTerms() {
    const box = $("#termBoard"); box.innerHTML = "";
    S.terms.forEach(t => {
      const col = document.createElement("div");
      col.className = "term-col" + (state.grade && state.grade !== t.grade ? " dim" : "");
      const units = [];
      ISLANDS.forEach(i => i.sequence.forEach(s => { if (s.grade === t.grade && s.term === t.term) units.push({ i, s }); }));
      const total = units.reduce((a, u) => a + u.s.hours, 0);
      col.innerHTML = `<h3>${t.label}<small>${units.length} 單元 · ${total} 節</small></h3>`;
      units.forEach(({ i, s }) => {
        const b = document.createElement("button");
        b.className = "unit"; b.style.setProperty("--c", i.color);
        if (state.q && !JSON.stringify(s).toLowerCase().includes(state.q.toLowerCase()) && !i.name.includes(state.q)) b.style.opacity = .3;
        b.innerHTML = `<b>${i.emoji} ${s.unit}</b><span>${i.name} · ${s.hours} 節</span>`;
        b.onclick = () => openIsland(i.id, "順序");
        col.appendChild(b);
      });
      box.appendChild(col);
    });
  }
  function refresh() {
    document.querySelectorAll(".island").forEach(g => {
      const isl = byId[g.dataset.id];
      g.classList.toggle("dim", !matches(isl));
      if (isl) {
        const subEl = g.querySelector(`.sub[data-sub-id="${isl.id}"]`);
        if (subEl) {
          const comp = getCompletion(isl.id);
          subEl.textContent = `${isl.tag} · ${comp.percentage}% (${comp.passedStages}/${comp.totalStages})`;
        }
      }
    });
    buildCards(); buildTerms();
    if (state.island) {
      syncDrawerBadges(state.island);
      syncDrawerCompletion(state.island);
      renderTab();
    }
  }

  /* ---------- drawer ---------- */
  const TABS = ["標準", "架構", "順序", "目標", "評量", "延伸"];
  const TAB_LABEL = { 標準: "課綱對應", 架構: "課程架構", 順序: "課程內容", 目標: "課程目標", 評量: "評量方式", 延伸: "延伸探索" };
  const drawer = $("#drawer"), backdrop = $("#backdrop");
  if (drawer) {
    drawer.setAttribute("data-scrollable", "true");
    const stopDrawerScrollLeak = (e) => { e.stopPropagation(); };
    drawer.addEventListener("wheel", stopDrawerScrollLeak, { passive: true });
    drawer.addEventListener("touchmove", stopDrawerScrollLeak, { passive: true });
  }
  const tabBodyEl = $("#tabBody");
  if (tabBodyEl) tabBodyEl.setAttribute("data-scrollable", "true");

  function syncDrawerBadges(i) {
    if (!i) return;
    const done = isMicroLabDone(i.id);
    const extTab = document.querySelector('.tab[data-t="延伸"]');
    if (extTab) {
      extTab.innerHTML = done
        ? `${TAB_LABEL["延伸"]} <span class="mlab-tab-badge" title="微實作實驗室已通關 (+20 ⭐)">✔</span>`
        : TAB_LABEL["延伸"];
    }
    const badgeRow = $("#drawerHead .d-badges");
    if (badgeRow) {
      let mb = badgeRow.querySelector(".mlab-head-badge");
      if (done && !mb) {
        mb = document.createElement("span");
        mb.className = "badge mlab-head-badge";
        mb.textContent = "🔬 微實作大師";
        badgeRow.appendChild(mb);
      } else if (!done && mb) {
        mb.remove();
      }
    }
  }

  function syncDrawerCompletion(i) {
    if (!i) return;
    const compEl = $("#drawerCompletion");
    if (!compEl) return;
    const comp = getCompletion(i.id);
    compEl.innerHTML = `<div class="d-comp-row"><span>🎯 測驗完成度</span><b>${comp.percentage}%（${comp.passedStages} / ${comp.totalStages} 關）</b></div>
      <div class="d-comp-track" aria-hidden="true"><i style="width:${comp.percentage}%"></i></div>`;
  }

  function openIsland(id, tab = "標準", unitKey = null) {
    const i = byId[id]; if (!i) return;
    state.island = i; state.tab = tab; state.unit = null; state.usub = "learn";
    if (window.Store && typeof window.Store.setActiveIslandId === "function") {
      window.Store.setActiveIslandId(i.id);
    }
    drawer.style.setProperty("--c", i.color);
    $("#drawerHead").innerHTML = `<div class="d-head" style="--c:${i.color}">
      <div class="big">${i.emoji}</div><h2>${i.name}</h2>
      <p>${i.tagline}</p>
      <p class="d-badges" style="margin-top:8px"><span class="badge">${i.tag}</span><span class="badge">${grades(i).map(g => gradeName[g]).join("、")}</span><span class="badge">建議 ${hours(i)} 節</span>${i.extra ? '<span class="badge">延伸</span>' : ""}</p>
      <div class="d-completion" id="drawerCompletion"></div></div>`;
    const tabs = $("#tabs"); tabs.innerHTML = "";
    TABS.forEach(t => {
      const b = document.createElement("button"); b.className = "tab"; b.dataset.t = t; b.textContent = TAB_LABEL[t];
      b.setAttribute("role", "tab");
      b.onclick = () => { state.tab = t; state.unit = null; renderTab(); }; tabs.appendChild(b);
    });
    syncDrawerBadges(i);
    syncDrawerCompletion(i);
    renderTab();
    drawer.classList.add("open"); backdrop.classList.add("show"); drawer.setAttribute("aria-hidden", "false");
    history.replaceState(null, "", "#" + id);
    if (unitKey) setTimeout(() => {
      const st = $("#tabBody").querySelector(`.step[data-key="${unitKey}"]`);
      if (!st) return;
      st.scrollIntoView({ behavior: "smooth", block: "center" });
      st.classList.add("hl"); setTimeout(() => st.classList.remove("hl"), 3200);
    }, 380);
  }
  window.openIsland = openIsland;
  function closeDrawer() {
    microLabMountSeq++;
    if (window.IslandMicroLabs && typeof window.IslandMicroLabs.unmount === "function") {
      window.IslandMicroLabs.unmount();
    }
    drawer.classList.remove("open", "is-lab-wide"); backdrop.classList.remove("show"); drawer.setAttribute("aria-hidden", "true");
    state.island = null; history.replaceState(null, "", location.pathname + location.search);
  }
  $("#closeBtn").onclick = closeDrawer; backdrop.onclick = closeDrawer;
  document.addEventListener("keydown", e => {
    if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(e)) return;
    if (e.key === "Escape" && drawer.classList.contains("open") && !document.querySelector(".modal-wrap.show")) {
      closeDrawer();
    }
  });

  const R = {
    標準(i) {
      const grp = (type, title) => {
        const xs = i.standards.filter(s => s.type === type); if (!xs.length) return "";
        return `<h3>${title}</h3>` + xs.map(s => `<div class="std"><code>${s.code}</code><div><span class="t">${s.type}</span><div>${s.text}${s.check ? ' <span class="warn">⚠ 待核校</span>' : ""}</div></div></div>`).join("");
      };
      return grp("延伸", "說明") + grp("內容", "學習內容") + grp("表現", "學習表現");
    },
    架構(i) {
      return i.structure.map((g, k) => `<div class="group"><h4>${k + 1}. ${g.title}</h4><ul>${g.items.map(x => `<li>${x}</li>`).join("")}</ul></div>`).join("");
    },
    順序(i) {
      const comp = getCompletion(i.id);
      const detailById = Object.fromEntries((comp.unitDetails || []).map(u => [u.unitId, u]));
      const seq = i.sequence.map((s, idx) => ({ ...s, key: `${i.id}-${idx + 1}` }))
        .sort((a, b) => a.grade * 10 + a.term - (b.grade * 10 + b.term));
      return `<p style="color:var(--muted);margin-top:0">共 ${seq.length} 個單元（${comp.totalStages} 個難度關卡）、建議 ${hours(i)} 節 · 測驗完成度 <b>${comp.percentage}%</b>（${comp.passedStages} / ${comp.totalStages} 關）${state.grade ? ` · 已標示 ${gradeName[state.grade]}` : ""}。</p>` +
        seq.map((s, k) => {
          const uc = (window.CONTENT && window.CONTENT[s.key]) || {};
          const hasLesson = !!uc.lesson;
          const hasWs = !!uc.worksheet;
          const quiz = window.Quiz && Quiz.hasQuiz(s.key);
          const best = quiz && window.Store ? Store.quizEvents(s.key).reduce((m, e) => Math.max(m, e.score), -1) : -1;
          const ud = detailById[s.key];
          const passedDiffs = ud && ud.passedDiffs ? ud.passedDiffs : {};
          const diffNames = [["easy", "易"], ["medium", "中"], ["hard", "難"]];
          const unitStagePills = quiz ? diffNames.map(([d, label]) =>
            `<span class="pill${passedDiffs[d] ? " is-pass" : ""}">${label}${passedDiffs[d] ? " ✔" : ""}</span>`
          ).join("") : "";
          return `<div class="step${state.grade && state.grade !== s.grade ? " dim" : ""}" data-key="${s.key}">
          <span class="when">${termLabel(s.grade, s.term)} · 單元 ${k + 1} · ${s.hours} 節</span>
          <b>${s.unit}</b><p>📚 ${s.topics}</p><p>🎯 活動:${s.activity}</p>
          <div class="unit-actions">
            ${hasLesson ? `<button class="btn-doc" type="button" data-lesson="${s.key}">📖 教案綱要</button>` : ""}
            ${hasWs ? `<button class="btn-doc" type="button" data-ws="${s.key}">📋 學習單</button>` : ""}
            ${quiz ? `<button class="btn-quiz" type="button" data-quiz="${s.key}">📝 單元測驗</button>${best >= 0 ? `<span class="pill">最佳 ${best} 分</span>` : ""}${unitStagePills}` : ""}
            ${uc.study ? `<button class="btn-unit" type="button" data-unit="${s.key}">📚 單元學習頁</button>` : ""}
          </div></div>`;
        }).join("");
    },
    目標(i) { return `<ol class="obj">${i.objectives.map(o => `<li>${o}</li>`).join("")}</ol>`; },
    評量(i) {
      const head = (i.assessment || []).map(a => `<div class="assess"><span class="k">${a.kind}</span> <b>${a.method}</b><div style="font-size:.88rem;color:var(--muted);margin-top:4px">${a.detail}</div></div>`).join("");
      const rub = i.rubric ? `<h3>表現任務評分規準(參考)</h3><table class="rubric"><tr><th>向度</th><th>表現優良</th><th>基本達成</th><th>待加強</th></tr>${i.rubric.map(r => `<tr><td>${r.c}</td><td>${r.a}</td><td>${r.b}</td><td>${r.t}</td></tr>`).join("")}</table>` : "";
      return head + rub;
    },
    延伸(i) {
      return `<div id="islandMicroLabMount" class="mlab-mount" data-scrollable="true"></div>` +
        `<h3 class="mlab-ext-heading">📚 延伸學習資源</h3>` +
        i.extension.map(x => `<div class="ext"><span class="ty">${x.type}</span><div><b>${x.title}</b><p>${x.desc}</p></div></div>`).join("");
    }
  };
  /* ---------- 單元詳細頁（三頁籤：學習內容 / 教案與學習單 / 單元挑戰） ---------- */
  const USUBS = [["learn", "📖 學習內容"], ["plan", "📝 教案與學習單"], ["quiz", "🎯 單元挑戰"]];
  function renderUnit(i) {
    const key = state.unit, n = +key.split("-")[1];
    const s = i.sequence[n - 1], uc = (window.CONTENT && window.CONTENT[key]) || {};
    const bar = `<div class="ubar"><button type="button" class="link" data-uback="1">← 返回課程內容</button>
        <div class="ubar-title"><span class="when">${termLabel(s.grade, s.term)} · 單元 ${n} · ${s.hours} 節</span><b>${esc(s.unit)}</b></div></div>
      <div class="utabs" role="tablist">${USUBS.map(([k, label]) => `<button type="button" role="tab" class="utab${state.usub === k ? " active" : ""}" data-usub="${k}" aria-selected="${state.usub === k}">${label}</button>`).join("")}</div>`;
    let content = "";
    if (state.usub === "learn") {
      content = uc.study ? `<div class="study">${uc.study.html}</div>` : `<p class="study-lead">此單元的自學教材建置中。</p>`;
    } else if (state.usub === "plan") {
      const L = uc.lesson, W = uc.worksheet;
      content = (L ? `<section class="plan-card"><h3>📖 教案綱要</h3><p>${esc(L.overview)}</p>
          <ol class="obj">${(L.objectives || []).map(o => `<li>${esc(o)}</li>`).join("")}</ol>
          <p class="plan-flow">${(L.flow || []).map(f => `<span class="pill">${esc(f.phase.split(":")[0])} · ${f.min} 分</span>`).join(" ")}</p>
          <div class="unit-actions"><button class="btn-doc" type="button" data-lesson="${key}">📖 查看完整教案</button>
          <button class="btn-doc btn-print" type="button" data-print="lesson" data-key="${key}">🖨️ 預覽與另存 A4 PDF</button></div></section>` : "") +
        (W ? `<section class="plan-card"><h3>📋 課堂實作學習單</h3><p><b>${esc(W.title)}</b></p><p>${esc(W.intro)}</p>
          <p class="plan-flow">${(W.sections || []).map(sc => `<span class="pill">${esc(sc.title)}(${(sc.items || []).length} 題)</span>`).join(" ")}</p>
          <div class="unit-actions"><button class="btn-doc" type="button" data-ws="${key}">📋 查看學習單</button>
          <button class="btn-doc btn-print" type="button" data-print="ws" data-key="${key}">🖨️ 預覽與另存 A4 PDF</button></div></section>` : "");
    } else {
      const Q = uc.quiz, lv = Q && Q.levels;
      const hist = window.Store && Store.profile ? Store.quizEvents(key) : [];
      const badges = window.Store && Store.profile ? Store.badges().filter(b => b.unit === key).map(b => b.type) : [];
      content = Q ? `<p class="study-lead">選擇難度挑戰!任何難度達 <b>${Q.passScore}</b> 分即算通過本單元,島嶼建築會跟著升級;「中」可得銀色羅盤徽章、「難」可得金色大師徽章。</p>
        ${lv ? `<div class="diff-cards diff-static">${["easy", "medium", "hard"].filter(d => lv[d]).map(d => {
          const mine = hist.filter(e => e.difficulty === d), best = mine.length ? Math.max(...mine.map(e => e.score)) : null;
          const got = lv[d].badge && badges.includes(lv[d].badge);
          return `<div class="diff-card d-${d}"><span class="dc-ico">${lv[d].icon}</span><span class="dc-lv">${Quiz.DIFF_NAME[d]}</span><b>${lv[d].label}</b>
            <span class="dc-desc">${esc(lv[d].desc)}</span><span class="dc-meta">${lv[d].questions.length} 題</span>
            ${lv[d].badge ? `<span class="dc-badge${got ? " got" : ""}">${Quiz.BADGES[lv[d].badge].icon} ${Quiz.BADGES[lv[d].badge].name}${got ? " ✔" : ""}</span>` : `<span class="dc-badge none">入門無徽章</span>`}
            <span class="dc-best">${best === null ? "尚未挑戰" : `最佳 ${best} 分`}</span></div>`;
        }).join("")}</div>` : ""}
        <button class="btn-primary" type="button" data-quiz="${key}">🎯 進入測驗</button>` : `<p class="study-lead">此單元尚無測驗。</p>`;
    }
    return bar + `<div class="ubody">${content}</div>`;
  }

  function renderTab() {
    const i = state.island; if (!i) return;
    microLabMountSeq++;
    if (window.IslandMicroLabs && typeof window.IslandMicroLabs.unmount === "function") {
      window.IslandMicroLabs.unmount();
    }
    drawer.classList.toggle("is-lab-wide", state.tab === "延伸" && !state.unit);
    document.querySelectorAll(".tab").forEach(b => { const on = b.dataset.t === state.tab; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
    $("#tabBody").innerHTML = state.unit && state.tab === "順序" ? renderUnit(i) : R[state.tab](i); $("#tabBody").scrollTop = 0;
    if (state.tab === "延伸" && !state.unit) {
      void mountMicroLabLazy($("#islandMicroLabMount"), i.id);
    }
  }

  const syncLabUiBadges = () => {
    buildCards();
    if (state.island) {
      syncDrawerBadges(state.island);
      syncDrawerCompletion(state.island);
    }
  };
  document.addEventListener("ii:microlab-updated", syncLabUiBadges);
  document.addEventListener("ii:avatar-changed", syncLabUiBadges);
  document.addEventListener("ii:login", () => {
    refresh();
  });
  document.addEventListener("ii:logout", () => {
    refresh();
  });

  /* ---------- 教案綱要 / 學習單彈窗 ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TYPE_LABEL = { short: "簡答", fill: "填空", table: "表格整理", draw: "繪圖/設計", reflect: "反思" };
  const docWrap = document.createElement("div");
  docWrap.id = "docModal"; docWrap.className = "modal-wrap";
  docWrap.innerHTML = `<div class="modal doc-modal" role="dialog" aria-modal="true"><button class="close" id="docClose" aria-label="關閉">✕</button><div id="docBody"></div></div>`;
  document.body.appendChild(docWrap);
  const docBody = docWrap.querySelector("#docBody");
  const closeDoc = () => docWrap.classList.remove("show");
  docWrap.querySelector("#docClose").onclick = closeDoc;
  docWrap.addEventListener("click", (e) => { if (e.target === docWrap) closeDoc(); });
  document.addEventListener("keydown", (e) => {
    if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(e)) return;
    if (e.key === "Escape" && docWrap.classList.contains("show")) closeDoc();
  });

  function unitMeta(key) {
    const [iid, n] = key.split("-");
    const isl = byId[iid];
    const s = isl && isl.sequence[+n - 1];
    const uc = window.CONTENT && window.CONTENT[key];
    return isl && s && uc ? { isl, s, uc } : null;
  }

  function openDoc(key, mode) {
    const info = unitMeta(key); if (!info) return;
    const { isl, s, uc } = info;
    const headHtml = `<div class="q-head" style="--c:${isl.color}">
      <span class="badge">${isl.emoji} ${esc(isl.name)}</span>
      <span class="badge">${termLabel(s.grade, s.term)} · ${s.hours} 節(${s.hours * 45} 分鐘)</span>
      <h2>${esc(s.unit)} · ${mode === "lesson" ? "📖 教案綱要" : "📋 課堂實作學習單"}</h2>
    </div>`;

    if (mode === "lesson" && uc.lesson) {
      const L = uc.lesson;
      const totalMin = (L.flow || []).reduce((a, f) => a + (f.min || 0), 0);
      docBody.innerHTML = headHtml + `<div class="q-pad doc-pad">
        <div class="doc-sec">
          <h3>📌 教學概述與對應課綱</h3>
          <p>${esc(L.overview)}</p>
          <div>${(L.standards || []).map(c => `<code class="doc-code">${esc(c)}</code>`).join(" ")}</div>
        </div>
        <div class="doc-sec">
          <h3>🎯 單元學習目標</h3>
          <ol class="doc-list">${(L.objectives || []).map(o => `<li>${esc(o)}</li>`).join("")}</ol>
        </div>
        <div class="doc-sec">
          <h3>🧰 課前準備</h3>
          <ul class="doc-list">${(L.prep || []).map(p => `<li>${esc(p)}</li>`).join("")}</ul>
        </div>
        <div class="doc-sec">
          <h3>⏱️ 建議教學流程（共 ${totalMin} 分鐘）</h3>
          <div class="doc-table-wrap">
            <table class="rubric flow-table">
              <tr><th style="width:22%">階段</th><th style="width:10%">時間</th><th style="width:34%">教師教學活動</th><th style="width:34%">學生學習活動</th></tr>
              ${(L.flow || []).map(f => `<tr><td><b>${esc(f.phase)}</b></td><td style="text-align:center">${esc(f.min)} 分</td><td>${esc(f.teacher)}</td><td>${esc(f.student)}</td></tr>`).join("")}
            </table>
          </div>
        </div>
        <div class="doc-grid">
          <div class="assess"><span class="k" style="--c:${isl.color}">差異化教學</span><div class="doc-meta">${esc(L.differentiation)}</div></div>
          <div class="assess"><span class="k" style="--c:${isl.color}">評量重點</span><div class="doc-meta">${esc(L.assessmentFocus)}</div></div>
          <div class="assess"><span class="k" style="--c:${isl.color}">課後延伸</span><div class="doc-meta">${esc(L.extension)}</div></div>
        </div>
      </div>`;
    } else if (mode === "ws" && uc.worksheet) {
      const W = uc.worksheet;
      let qIdx = 0;
      docBody.innerHTML = headHtml + `<div class="q-pad doc-pad" id="wsWrap">
        <div class="ws-bar">
          <p class="ws-intro"><b>${esc(W.title)}</b><br>${esc(W.intro)}</p>
          <button type="button" class="btn-toggle-ans" id="toggleAnsBtn">👁️ 顯示教師參考答案</button>
        </div>
        ${(W.sections || []).map(sec => `<div class="doc-sec">
          <h3>${esc(sec.title)}</h3>
          ${(sec.items || []).map(it => {
            qIdx++;
            return `<div class="ws-item">
              <div class="ws-q"><span class="qn">${qIdx}</span> <span class="lv">${esc(TYPE_LABEL[it.type] || it.type)}</span> ${esc(it.q).replace(/\n/g, "<br>")}</div>
              ${it.hint ? `<div class="ws-hint">💡 提示：${esc(it.hint)}</div>` : ""}
              ${it.answer ? `<div class="ws-ans">✅ <b>教師參考答案：</b>${esc(it.answer).replace(/\n/g, "<br>")}</div>` : ""}
            </div>`;
          }).join("")}
        </div>`).join("")}
      </div>`;
      const wsWrap = docBody.querySelector("#wsWrap");
      const toggleBtn = docBody.querySelector("#toggleAnsBtn");
      toggleBtn.onclick = () => {
        const on = wsWrap.classList.toggle("show-ans");
        toggleBtn.textContent = on ? "🙈 隱藏教師參考答案" : "👁️ 顯示教師參考答案";
        toggleBtn.classList.toggle("active", on);
      };
    }
    docWrap.classList.add("show");
    const hd = docBody.querySelector(".q-head");
    if (hd) {
      hd.insertAdjacentHTML("beforeend", `<div class="unit-actions"><button class="btn-doc btn-print" type="button" data-print="${mode === "lesson" ? "lesson" : "ws"}" data-key="${key}">🖨️ 預覽與另存 A4 PDF</button></div>`);
      hd.querySelector("[data-print]").onclick = (ev) => { ev.stopPropagation(); if (window.Print) Print.open(key, mode === "lesson" ? "lesson" : "ws"); };
    }
  }

  $("#tabBody").addEventListener("click", (e) => {
    const uBtn = e.target.closest("[data-unit]");
    if (uBtn) { state.unit = uBtn.dataset.unit; state.usub = "learn"; renderTab(); return; }
    if (e.target.closest("[data-uback]")) { state.unit = null; renderTab(); return; }
    const sBtn = e.target.closest("[data-usub]");
    if (sBtn) { state.usub = sBtn.dataset.usub; renderTab(); return; }
    const pBtn = e.target.closest("[data-print]");
    if (pBtn) { if (window.Print) Print.open(pBtn.dataset.key, pBtn.dataset.print); return; }
    const qBtn = e.target.closest("[data-quiz]");
    if (qBtn) { Quiz.open(qBtn.dataset.quiz); return; }
    const lBtn = e.target.closest("[data-lesson]");
    if (lBtn) { openDoc(lBtn.dataset.lesson, "lesson"); return; }
    const wBtn = e.target.closest("[data-ws]");
    if (wBtn) { openDoc(wBtn.dataset.ws, "ws"); return; }
  });
  // 測驗完成後即時更新島嶼進度、卡片百分比與「課程內容」單元狀態
  document.addEventListener("ii:quizdone", () => { refresh(); });

  /* ---------- 搜尋即時提示選單 (Auto-complete) ---------- */
  const searchInput = $("#search");
  const clearSearchBtn = $("#clearSearchBtn");
  const searchCapsule = searchInput.closest(".search-capsule");
  const syncClearSearchBtn = () => {
    if (clearSearchBtn) clearSearchBtn.hidden = !searchInput.value;
  };
  syncClearSearchBtn();
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      state.q = "";
      syncClearSearchBtn();
      hideSuggest();
      refresh();
      searchInput.focus();
    });
  }
  const sugBox = document.createElement("ul");
  sugBox.id = "searchSuggest"; sugBox.className = "search-suggest"; sugBox.setAttribute("role", "listbox");
  searchCapsule.appendChild(sugBox);
  const gradeText = (gs) => gs.map(g => gradeName[g]).join("、");
  const SEARCH_INDEX = [];
  ISLANDS.forEach(i => {
    const gs = i.grade || grades(i), gt = gradeText(gs);
    SEARCH_INDEX.push({ rank: 1, label: i.name, extra: `${i.tag} ${i.tagline}`, island: i, gt, tab: "標準", kind: "島嶼" });
    i.sequence.forEach((s, k) => SEARCH_INDEX.push({
      rank: 0, label: s.unit, extra: `${s.topics} ${s.activity}`, island: i, key: `${i.id}-${k + 1}`,
      gt: gradeName[s.grade], tab: "順序", kind: "單元"
    }));
    i.standards.forEach(st => SEARCH_INDEX.push({ rank: 2, label: `${st.code} ${st.text.slice(0, 18)}`, extra: `${st.code} ${st.text}`, island: i, gt, tab: "標準", kind: "課綱" }));
  });
  let sugItems = [], sugActive = -1;
  const hideSuggest = () => { sugBox.classList.remove("show"); sugActive = -1; };
  function renderSuggest() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return hideSuggest();
    sugItems = SEARCH_INDEX.filter(e => (e.label + " " + e.extra + " " + e.island.name).toLowerCase().includes(q))
      .sort((a, b) => (a.label.toLowerCase().includes(q) ? 0 : 3) + a.rank - ((b.label.toLowerCase().includes(q) ? 0 : 3) + b.rank))
      .slice(0, 6);
    if (!sugItems.length) {
      sugBox.innerHTML = `<li class="sg-empty">找不到相關主題 🏝️</li>`; sugBox.classList.add("show"); sugActive = -1; return;
    }
    sugBox.innerHTML = sugItems.map((e, n) => `<li class="sg-item" role="option" data-n="${n}" style="--c:${e.island.color}">
      <span class="sg-main">${esc(e.label)}</span>
      <span class="sg-tag">${e.island.emoji} ${esc(e.island.name)} · ${esc(e.gt)}</span></li>`).join("");
    sugBox.classList.add("show"); sugActive = -1;
  }
  function pickSuggest(e) {
    searchInput.value = e.label; state.q = e.label;
    syncClearSearchBtn();
    hideSuggest(); refresh();
    const g3 = window.__island3D;
    if (state.grade && !(e.island.grade || grades(e.island)).includes(state.grade)) setGradeFilter(0);
    if (g3 && typeof g3.focusIsland === "function" && state.view === "map") g3.focusIsland(e.island.id, e.tab, e.key || null);
    else openIsland(e.island.id, e.tab, e.key || null);
  }
  searchInput.addEventListener("input", () => { state.q = searchInput.value.trim(); syncClearSearchBtn(); refresh(); renderSuggest(); });
  searchInput.addEventListener("keyup", (ev) => { if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(ev.key)) renderSuggest(); });
  searchInput.addEventListener("focus", renderSuggest);
  searchInput.addEventListener("keydown", (ev) => {
    const els = sugBox.querySelectorAll(".sg-item");
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      if (!els.length) return; ev.preventDefault();
      sugActive = (sugActive + (ev.key === "ArrowDown" ? 1 : -1) + els.length) % els.length;
      els.forEach((n, k) => n.classList.toggle("active", k === sugActive));
    } else if (ev.key === "Enter") {
      const e = sugItems[sugActive >= 0 ? sugActive : 0];
      if (e && sugBox.classList.contains("show")) { ev.preventDefault(); pickSuggest(e); }
    } else if (ev.key === "Escape") hideSuggest();
  });
  sugBox.addEventListener("mousedown", (ev) => ev.preventDefault());
  sugBox.addEventListener("click", (ev) => {
    const li = ev.target.closest(".sg-item"); if (li) pickSuggest(sugItems[+li.dataset.n]);
  });
  document.addEventListener("pointerdown", (ev) => {
    if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(ev)) return;
    if (!searchCapsule.contains(ev.target)) hideSuggest();
  });

  buildMap(); refresh();
  const h = location.hash.slice(1); if (byId[h]) openIsland(h);

  /* ---------- 手機版 (< 768px) HUD 精簡與折疊面板控制 ---------- */
  const hudLeft = $(".hud-left");
  const brandBar = $(".brand-bar");
  const sceneControls = $(".scene-controls");
  const filterBar = $(".filter-bar");
  const hudUserRow = $(".hud-user-row");
  const userChip = $("#userChip");
  const audioToggleBtn = $("#audioToggleBtn");
  const resultBtn = $("#resultBtn");
  const leaderboardBtn = $("#leaderboardBtn");
  const mobileTopActions = $(".mobile-top-actions");
  const mobileToolsToggleBtn = $("#mobileToolsToggleBtn");
  const mobileToolsPanel = $("#mobileToolsPanel");
  const mobileUserActions = $(".mobile-user-actions");
  const viewChips = $("#viewChips");

  if (
    hudLeft && brandBar && sceneControls && filterBar && hudUserRow &&
    userChip && audioToggleBtn && resultBtn && leaderboardBtn &&
    mobileTopActions && mobileToolsToggleBtn && mobileToolsPanel && mobileUserActions
  ) {
    const mobileMql = window.matchMedia("(max-width: 767px)");
    const setMobileToolsOpen = (open) => {
      mobileToolsPanel.hidden = !open;
      mobileToolsToggleBtn.setAttribute("aria-expanded", String(open));
      mobileToolsToggleBtn.classList.toggle("is-open", open);
    };
    const syncMobileHudLayout = (isMobile) => {
      const citadelHudBtn = $("#citadelHudBtn");
      if (isMobile) {
        mobileTopActions.insertBefore(leaderboardBtn, mobileToolsToggleBtn);
        mobileToolsPanel.insertBefore(sceneControls, mobileUserActions);
        mobileToolsPanel.insertBefore(filterBar, mobileUserActions);
        mobileUserActions.append(userChip, audioToggleBtn, resultBtn);
        if (citadelHudBtn) mobileUserActions.appendChild(citadelHudBtn);
      } else {
        brandBar.appendChild(sceneControls);
        hudLeft.appendChild(filterBar);
        hudUserRow.append(userChip, audioToggleBtn, resultBtn, leaderboardBtn);
        if (citadelHudBtn && viewChips) viewChips.appendChild(citadelHudBtn);
      }
      setMobileToolsOpen(false);
    };

    syncMobileHudLayout(mobileMql.matches);
    mobileMql.addEventListener("change", (ev) => syncMobileHudLayout(ev.matches));

    mobileToolsToggleBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setMobileToolsOpen(mobileToolsPanel.hidden);
    });
    mobileToolsPanel.addEventListener("click", (ev) => {
      if (ev.target.closest("#citadelHudBtn") && mobileMql.matches) {
        setMobileToolsOpen(false);
      }
    });
    document.addEventListener("ii:gradefilter", () => {
      if (mobileMql.matches) setMobileToolsOpen(false);
    });
    searchInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && mobileMql.matches) setMobileToolsOpen(false);
    });
    sugBox.addEventListener("click", (ev) => {
      if (ev.target.closest(".sg-item") && mobileMql.matches) setMobileToolsOpen(false);
    });
    document.addEventListener("pointerdown", (ev) => {
      if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(ev)) return;
      if (
        mobileMql.matches &&
        !mobileToolsPanel.hidden &&
        !mobileToolsPanel.contains(ev.target) &&
        !mobileToolsToggleBtn.contains(ev.target)
      ) {
        setMobileToolsOpen(false);
      }
    });
  }
})();

