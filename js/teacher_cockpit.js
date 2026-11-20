/* 教師戰情室（Teacher Cockpit）：隱藏入口 + GAS 密碼驗證 + 課堂抓漏雷達 + 3D 舞台遙控 + 高頻錯題投影 */
(() => {
  const SESSION_KEY = "ii:teacher_cockpit_pwd";
  const DIFF_LABELS = { easy: "易", medium: "中", hard: "難", single: "標準" };
  const LETTERS = "ABCDE";

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  }[c]));

  function maskName(name) {
    const chars = Array.from(String(name || "").trim());
    if (chars.length === 0) return "匿名";
    if (chars.length <= 2) return `${chars[0]}○`;
    if (chars.length === 3) return `${chars[0]}○${chars[2]}`;
    return `${chars[0]}○${chars.slice(2).join("")}`;
  }

  function getGasUrl() {
    if (window.Store && typeof window.Store.getLeaderboardUrl === "function") {
      const u = window.Store.getLeaderboardUrl();
      if (u) return u;
    }
    const cfg = window.APP_CONFIG && window.APP_CONFIG.LEADERBOARD_URL;
    return typeof cfg === "string" ? cfg.trim() : "";
  }

  function resolveUnitMeta(unitId) {
    const idStr = String(unitId || "").trim();
    const parts = idStr.split("-");
    const islandId = parts[0] || "";
    const unitNum = Number(parts[1]) || 0;
    const islands = Array.isArray(window.ISLANDS) ? window.ISLANDS : [];
    const isl = islands.find((i) => i.id === islandId);
    const seqItem = isl && Array.isArray(isl.sequence) ? isl.sequence[unitNum - 1] : null;
    const contentUnit = window.CONTENT && window.CONTENT[idStr];
    return {
      islandEmoji: isl ? isl.emoji : "🏝️",
      islandName: isl ? isl.name : islandId || "未知島嶼",
      unitName: (contentUnit && contentUnit.unit) || (seqItem && seqItem.unit) || idStr
    };
  }

  function resolveQuestion(questionKey) {
    const parts = String(questionKey || "").split("::");
    const unitId = parts[0] || "";
    const difficulty = parts[1] || "single";
    const questionIndex = Number(parts[2]);
    const unitContent = window.CONTENT && window.CONTENT[unitId];
    const quiz = unitContent && unitContent.quiz;
    let qList = [];
    if (quiz) {
      if (quiz.levels && quiz.levels[difficulty] && Array.isArray(quiz.levels[difficulty].questions)) {
        qList = quiz.levels[difficulty].questions;
      } else if (Array.isArray(quiz.questions)) {
        qList = quiz.questions;
      }
    }
    const qObj = Number.isInteger(questionIndex) && questionIndex >= 0 ? qList[questionIndex] || null : null;
    return {
      questionKey,
      unitId,
      difficulty,
      questionIndex,
      meta: resolveUnitMeta(unitId),
      question: qObj
    };
  }

  /* ---- 輕量抽籤音效（Web Audio API，靜音或瀏覽器不支援時自動略過） ---- */
  let audioCtx = null;
  function playTone(freq, duration = 0.06, type = "sine", vol = 0.08) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {}
  }
  function playLuckyWinSound() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => playTone(f, 0.24, "triangle", 0.11), idx * 75);
    });
  }

  /* ---- 狀態 ---- */
  let state = {
    data: { roster: [], students: [], wrongLogs: [], config: null },
    teacherPassword: "",
    selectedClass: "",
    isPrivacyMode: true,
    activeTab: "radar", // "radar" | "wrong" | "dispatch"
    activeStage: null,
    isMinimized: false,
    luckyRunning: false,
    luckyResult: null,
    luckyOnlineOnly: true,
    dispatchDraft: null,
    dispatchDirty: false,
    dispatchSaving: false,
    dispatchStatus: { text: "", kind: "", showReauth: false },
    pendingReauthOnly: false
  };
  let luckyTimer = null;

  function setTeacherPassword(pwd) {
    state.teacherPassword = String(pwd || "");
    try {
      if (state.teacherPassword) sessionStorage.setItem(SESSION_KEY, state.teacherPassword);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  function getTeacherPassword() {
    if (state.teacherPassword) return state.teacherPassword;
    let stored = "";
    try { stored = sessionStorage.getItem(SESSION_KEY) || ""; } catch {}
    if (stored) state.teacherPassword = stored;
    return state.teacherPassword;
  }

  function clearTeacherPassword() {
    state.teacherPassword = "";
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }

  function isFormFieldTarget(el) {
    if (typeof window.isFormInputTarget === "function") return window.isFormInputTarget(el);
    const tag = el && el.tagName ? el.tagName.toUpperCase() : "";
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(el && el.isContentEditable);
  }

  function createDraftFromConfig(cfg) {
    const src = (cfg && typeof cfg === "object") ? cfg : {};
    return {
      announcement: String(src.announcement || ""),
      targetIsland: String(src.targetIsland || ""),
      taskLinkTitle: String(src.taskLinkTitle || ""),
      taskLinkUrl: String(src.taskLinkUrl || "")
    };
  }

  function notifyCockpitToggle() {
    document.dispatchEvent(new CustomEvent("ii:cockpit-toggle"));
  }

  /* ---- DOM 建置：密碼驗證視窗 ---- */
  const authWrap = document.createElement("div");
  authWrap.id = "tcAuthModal";
  authWrap.className = "modal-wrap tc-auth-wrap";
  authWrap.innerHTML = `
    <form class="modal tc-auth-modal" id="tcAuthForm" novalidate>
      <button type="button" class="close" id="tcAuthClose" aria-label="關閉">✕</button>
      <div class="tc-auth-head">
        <span class="tc-auth-ico">🧑‍🏫</span>
        <h2>教師戰情室登入</h2>
        <p>請輸入教師驗證密碼以連線試算表並載入班級即時數據</p>
      </div>
      <label class="tc-auth-field">
        <span>教師密碼</span>
        <input id="tcPasswordInput" type="password" autocomplete="current-password" placeholder="請輸入教師密碼" required />
      </label>
      <p class="err" id="tcAuthErr" role="alert"></p>
      <button type="submit" class="btn-primary tc-auth-submit" id="tcAuthSubmit">🔓 驗證並開啟戰情室</button>
    </form>
  `;
  document.body.appendChild(authWrap);

  /* ---- DOM 建置：全螢幕戰情室工作台 ---- */
  const cockpitWrap = document.createElement("div");
  cockpitWrap.id = "tcCockpit";
  cockpitWrap.className = "tc-cockpit";
  cockpitWrap.setAttribute("role", "dialog");
  cockpitWrap.setAttribute("aria-modal", "true");
  cockpitWrap.setAttribute("aria-label", "教師戰情室");
  cockpitWrap.innerHTML = `
    <div class="tc-shell">
      <header class="tc-topbar">
        <div class="tc-top-left">
          <div class="tc-brand">
            <span class="tc-brand-ico">🧑‍🏫</span>
            <div>
              <strong>教師戰情室</strong>
              <small>Teacher Cockpit</small>
            </div>
          </div>
          <label class="tc-class-picker">
            <span>班級</span>
            <select id="tcClassSelect" aria-label="選擇班級"></select>
          </label>
          <button type="button" id="tcPrivacyBtn" class="tc-pill-btn active" aria-pressed="true">👁️ 投影隱私模式</button>
        </div>

        <div class="tc-stage-remote" role="group" aria-label="3D 舞台遙控列">
          <span class="tc-remote-label">🎬 3D 舞台遙控</span>
          <button type="button" class="tc-stage-btn" data-stage="0">0/3 施工</button>
          <button type="button" class="tc-stage-btn" data-stage="1">1/3 基礎</button>
          <button type="button" class="tc-stage-btn" data-stage="2">2/3 擴建</button>
          <button type="button" class="tc-stage-btn" data-stage="3">3/3 竣工</button>
          <button type="button" class="tc-stage-btn tc-stage-gold" data-stage="4">👑 終極慶典</button>
        </div>

        <div class="tc-top-right">
          <button type="button" id="tcRefreshBtn" class="tc-icon-btn" title="重新載入雲端數據">🔄 同步</button>
          <button type="button" id="tcCloseBtn" class="tc-icon-btn tc-close-btn" aria-label="關閉戰情室">✕ 關閉</button>
        </div>
      </header>

      <nav class="tc-tabs" role="tablist">
        <button type="button" class="tc-tab active" data-tab="radar" role="tab" aria-selected="true">📋 課堂即時進度、抓漏雷達與幸運抽籤</button>
        <button type="button" class="tc-tab" data-tab="wrong" role="tab" aria-selected="false">🎯 班級高頻錯題診斷 Top 3 ＋ 一鍵投影講解</button>
        <button type="button" class="tc-tab" data-tab="dispatch" role="tab" aria-selected="false">📢 雲端任務派發</button>
      </nav>

      <div class="tc-global-status" id="tcGlobalStatus" role="status" aria-live="polite" hidden></div>
      <main class="tc-main" id="tcMainBody"></main>
    </div>
  `;
  document.body.appendChild(cockpitWrap);

  function setGlobalStatus(text = "", kind = "") {
    const el = cockpitWrap.querySelector("#tcGlobalStatus");
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = "";
      el.className = "tc-global-status";
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.className = `tc-global-status${kind ? ` ${kind}` : ""}`;
  }

  /* ---- DOM 建置：右下角懸浮返回膠囊 ---- */
  const restorePill = document.createElement("button");
  restorePill.id = "tcRestorePill";
  restorePill.type = "button";
  restorePill.className = "tc-restore-pill";
  restorePill.innerHTML = `🧑‍🏫 返回戰情室`;
  document.body.appendChild(restorePill);

  /* ---- DOM 建置：超大字體題目投影檢討視窗 ---- */
  const projWrap = document.createElement("div");
  projWrap.id = "tcProjectorModal";
  projWrap.className = "tc-projector-wrap";
  projWrap.setAttribute("role", "dialog");
  projWrap.setAttribute("aria-modal", "true");
  projWrap.innerHTML = `<div class="tc-projector-card" id="tcProjectorCard"></div>`;
  document.body.appendChild(projWrap);

  /* ---- API 驗證與資料取得 ---- */
  async function parseJsonResponse(res) {
    if (!res.ok) throw new Error(`伺服器回應 ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("伺服器回傳非 JSON 格式回應，請檢查 GAS 部署權限與網址");
    }
  }

  async function fetchTeacherDashboard(password) {
    const url = getGasUrl();
    if (!url) throw new Error("尚未設定 GAS_LEADERBOARD_URL");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "teacher_dashboard", password })
    });
    return await parseJsonResponse(res);
  }

  function applyDashboardData(json, { preserveDispatchDraft = false } = {}) {
    state.data = {
      roster: Array.isArray(json.roster) ? json.roster : [],
      students: Array.isArray(json.students) ? json.students : [],
      wrongLogs: Array.isArray(json.wrongLogs) ? json.wrongLogs : [],
      config: (json.config && typeof json.config === "object") ? json.config : null
    };
    if (state.data.config && window.CloudConfig && typeof window.CloudConfig.set === "function") {
      window.CloudConfig.set(state.data.config);
    }
    if (!preserveDispatchDraft || !state.dispatchDraft || !state.dispatchDirty) {
      const baseCfg = state.data.config
        || (window.CloudConfig && typeof window.CloudConfig.get === "function" ? window.CloudConfig.get() : null)
        || {};
      state.dispatchDraft = createDraftFromConfig(baseCfg);
      state.dispatchDirty = false;
    }
    state.dispatchStatus = { text: "", kind: "", showReauth: false };
    const classes = getAllClasses();
    if (!state.selectedClass || !classes.includes(state.selectedClass)) {
      state.selectedClass = classes[0] || "";
    }
    state.luckyResult = null;
  }

  async function saveCloudConfig(password, config) {
    const url = getGasUrl();
    if (!url) throw new Error("尚未設定 GAS_LEADERBOARD_URL");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save_config", password, config })
    });
    return await parseJsonResponse(res);
  }

  function getAllClasses() {
    const set = new Set();
    const add = (cls) => {
      const c = String(cls || "").trim();
      if (c) set.add(c);
    };
    state.data.roster.forEach((r) => add(r.className || r.cls));
    state.data.students.forEach((s) => add(s.className || s.cls));
    state.data.wrongLogs.forEach((w) => add(w.className || w.cls));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hant", { numeric: true }));
  }

  function displayName(rawName, fallbackSeat) {
    const n = String(rawName || "").trim();
    if (!n) return fallbackSeat ? `${fallbackSeat}號同學` : "未登錄姓名";
    return state.isPrivacyMode ? maskName(n) : n;
  }

  /* ---- 渲染頂部控制列 ---- */
  function renderTopBar() {
    const sel = cockpitWrap.querySelector("#tcClassSelect");
    const classes = getAllClasses();
    if (classes.length === 0) {
      sel.innerHTML = `<option value="">（尚無班級資料）</option>`;
    } else {
      sel.innerHTML = classes.map((c) => `<option value="${esc(c)}"${c === state.selectedClass ? " selected" : ""}>${esc(c)} 班</option>`).join("");
    }

    const privBtn = cockpitWrap.querySelector("#tcPrivacyBtn");
    privBtn.classList.toggle("active", state.isPrivacyMode);
    privBtn.setAttribute("aria-pressed", String(state.isPrivacyMode));
    privBtn.innerHTML = state.isPrivacyMode ? "👁️ 投影隱私模式" : "🔓 教師實名模式";

    cockpitWrap.querySelectorAll(".tc-stage-btn").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.stage) === state.activeStage);
    });

    cockpitWrap.querySelectorAll(".tc-tab").forEach((tab) => {
      const isAct = tab.dataset.tab === state.activeTab;
      tab.classList.toggle("active", isAct);
      tab.setAttribute("aria-selected", String(isAct));
    });
  }

  /* ---- 計算目前班級的名冊與戰況 ---- */
  function getClassSnapshot() {
    const cls = state.selectedClass;
    const classStudents = state.data.students
      .filter((s) => String(s.className || s.cls || "").trim() === cls)
      .map((s) => ({
        ...s,
        seatNum: Number(s.seat) || 0,
        totalScore: Number(s.totalScore) || 0,
        crownCount: Number(s.crownCount) || 0
      }))
      .sort((a, b) => (b.totalScore - a.totalScore) || (b.crownCount - a.crownCount) || (a.seatNum - b.seatNum));

    const onlineSeatMap = new Map();
    classStudents.forEach((s) => {
      if (s.seatNum > 0) onlineSeatMap.set(s.seatNum, s);
    });

    const rawRoster = state.data.roster
      .filter((r) => String(r.className || r.cls || "").trim() === cls)
      .map((r) => ({ seatNum: Number(r.seat) || 0, name: String(r.name || "").trim() }))
      .filter((r) => r.seatNum > 0)
      .sort((a, b) => a.seatNum - b.seatNum);

    let hasOfficialRoster = rawRoster.length > 0;
    let expectedRoster = rawRoster;
    let inferredMax = 30;

    if (!hasOfficialRoster && cls) {
      const maxOnline = classStudents.reduce((m, s) => Math.max(m, s.seatNum), 0);
      inferredMax = Math.max(30, maxOnline);
      expectedRoster = [];
      for (let i = 1; i <= inferredMax; i++) {
        const online = onlineSeatMap.get(i);
        expectedRoster.push({ seatNum: i, name: online ? online.name : "" });
      }
    }

    const missing = expectedRoster.filter((r) => !onlineSeatMap.has(r.seatNum));
    const expectedCount = expectedRoster.length;
    const completedCount = expectedRoster.filter((r) => onlineSeatMap.has(r.seatNum)).length;
    const rate = expectedCount > 0 ? Math.round((completedCount / expectedCount) * 100) : 0;

    return {
      cls,
      hasOfficialRoster,
      inferredMax,
      expectedRoster,
      classStudents,
      missing,
      expectedCount,
      completedCount,
      rate
    };
  }

  /* ---- 渲染分頁一：進度、抓漏雷達與幸運抽籤 ---- */
  function renderRadarTab(body) {
    const snap = getClassSnapshot();
    if (!snap.cls) {
      body.innerHTML = `<div class="tc-empty">📭 目前試算表尚無任何班級或學生資料。</div>`;
      return;
    }

    const rosterTip = snap.hasOfficialRoster
      ? ""
      : `<div class="tc-info-banner">💡 試算表尚未建立 <b>${esc(snap.cls)}</b> 班的 <code>Roster</code> 名冊，目前暫以 1～${snap.inferredMax} 號自動推算；您可於試算表建立 <code>Roster</code> 分頁並填入「班級、座號、姓名」啟用精準點名。</div>`;

    const missingBadges = snap.missing.length === 0
      ? `<div class="tc-all-done">🎉 本班全員皆已上傳測驗紀錄！</div>`
      : `<div class="tc-missing-wall">${snap.missing.map((m) => {
          const seatTxt = String(m.seatNum).padStart(2, "0");
          const nameTxt = m.name ? displayName(m.name, m.seatNum) : "";
          return `<span class="tc-missing-badge"><b>${seatTxt}號</b>${nameTxt ? ` ${esc(nameTxt)}` : ""}</span>`;
        }).join("")}</div>`;

    const leaderboardRows = snap.classStudents.length === 0
      ? `<div class="tc-empty-sm">尚無學生上傳測驗紀錄</div>`
      : `<div class="tc-lb-list">${snap.classStudents.map((s, idx) => {
          const rank = idx + 1;
          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
          return `<div class="tc-lb-row${rank <= 3 ? ` top-${rank}` : ""}">
            <span class="tc-lb-rank">${medal}</span>
            <span class="tc-lb-seat">${String(s.seatNum).padStart(2, "0")}號</span>
            <span class="tc-lb-name">${esc(displayName(s.name, s.seatNum))}</span>
            <span class="tc-lb-crowns" title="滿分皇冠數">👑 ×${s.crownCount}</span>
            <span class="tc-lb-score">${s.totalScore.toLocaleString()} <small>分</small></span>
          </div>`;
        }).join("")}</div>`;

    const luckyDisplay = state.luckyResult
      ? `<div class="tc-lucky-winner${state.luckyRunning ? " spinning" : " landed"}">
          <span class="tc-lucky-seat">${String(state.luckyResult.seatNum).padStart(2, "0")} 號</span>
          <span class="tc-lucky-name">${esc(displayName(state.luckyResult.name, state.luckyResult.seatNum))}</span>
        </div>`
      : `<div class="tc-lucky-placeholder">點擊下方按鈕，抽出本堂課的幸運領航員！</div>`;

    body.innerHTML = `
      ${rosterTip}
      <div class="tc-kpi-row">
        <div class="tc-kpi-card">
          <span class="tc-kpi-lbl">應到人數</span>
          <strong class="tc-kpi-val">${snap.expectedCount}<small>人</small></strong>
        </div>
        <div class="tc-kpi-card ok">
          <span class="tc-kpi-lbl">已完成測驗人數</span>
          <strong class="tc-kpi-val">${snap.completedCount}<small>人</small></strong>
        </div>
        <div class="tc-kpi-card accent">
          <span class="tc-kpi-lbl">班級完成率</span>
          <strong class="tc-kpi-val">${snap.rate}<small>%</small></strong>
        </div>
      </div>

      <div class="tc-grid-2">
        <section class="tc-panel tc-radar-panel">
          <div class="tc-panel-head">
            <h3>🚨 未完成座號抓漏雷達 <span class="tc-count-pill">${snap.missing.length} 人未交</span></h3>
            <small>尚未出現在成績紀錄中的座號</small>
          </div>
          ${missingBadges}

          <div class="tc-lucky-box">
            <div class="tc-panel-head">
              <h3>🎲 課堂幸運領航員抽籤器</h3>
              <label class="tc-check-label">
                <input type="checkbox" id="tcLuckyOnlineOnly" ${state.luckyOnlineOnly ? "checked" : ""} />
                僅從已上線學生中抽取
              </label>
            </div>
            <div class="tc-lucky-stage" id="tcLuckyStage">${luckyDisplay}</div>
            <p class="tc-inline-status" id="tcLuckyStatus" role="status" aria-live="polite" hidden></p>
            <button type="button" id="tcLuckyBtn" class="btn-primary tc-lucky-btn" ${state.luckyRunning ? "disabled" : ""}>
              ${state.luckyRunning ? "🎰 輪盤轉動中…" : "🎲 隨機抽籤"}
            </button>
          </div>
        </section>

        <section class="tc-panel tc-lb-panel">
          <div class="tc-panel-head">
            <h3>🏅 ${esc(snap.cls)} 班即時戰況榜</h3>
            <small>共 ${snap.classStudents.length} 位已上線</small>
          </div>
          ${leaderboardRows}
        </section>
      </div>
    `;
  }

  function startLuckyDraw(snap) {
    if (state.luckyRunning) return;
    const statusEl = cockpitWrap.querySelector("#tcLuckyStatus");
    if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = "";
    }
    const pool = state.luckyOnlineOnly
      ? snap.classStudents.map((s) => ({ seatNum: s.seatNum, name: s.name }))
      : snap.expectedRoster.map((r) => ({ seatNum: r.seatNum, name: r.name }));

    if (pool.length === 0) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.className = "tc-inline-status err";
        statusEl.textContent = state.luckyOnlineOnly
          ? "⚠️ 目前該班尚無已上線學生，請取消勾選「僅從已上線學生中抽取」或等待學生作答上傳。"
          : "⚠️ 目前沒有可抽取的名單。";
      }
      return;
    }

    state.luckyRunning = true;
    const btn = cockpitWrap.querySelector("#tcLuckyBtn");
    const stage = cockpitWrap.querySelector("#tcLuckyStage");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "🎰 輪盤轉動中…";
    }

    const startTime = Date.now();
    const durationMs = 1500;
    let tickCount = 0;

    if (luckyTimer) clearInterval(luckyTimer);
    luckyTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      state.luckyResult = pick;
      if (stage) {
        stage.innerHTML = `<div class="tc-lucky-winner spinning">
          <span class="tc-lucky-seat">${String(pick.seatNum).padStart(2, "0")} 號</span>
          <span class="tc-lucky-name">${esc(displayName(pick.name, pick.seatNum))}</span>
        </div>`;
      }
      playTone(440 + (tickCount % 6) * 55, 0.045, "triangle", 0.06);
      tickCount++;

      if (elapsed >= durationMs) {
        clearInterval(luckyTimer);
        luckyTimer = null;
        const winner = pool[Math.floor(Math.random() * pool.length)];
        state.luckyResult = winner;
        state.luckyRunning = false;
        if (stage) {
          stage.innerHTML = `<div class="tc-lucky-winner landed">
            <span class="tc-lucky-badge">🎉 幸運領航員</span>
            <span class="tc-lucky-seat">${String(winner.seatNum).padStart(2, "0")} 號</span>
            <span class="tc-lucky-name">${esc(displayName(winner.name, winner.seatNum))}</span>
          </div>`;
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = "🎲 隨機抽籤";
        }
        playLuckyWinSound();
      }
    }, 70);
  }

  /* ---- 渲染分頁二：班級高頻錯題診斷 Top 3 ---- */
  function renderWrongTab(body) {
    const cls = state.selectedClass;
    if (!cls) {
      body.innerHTML = `<div class="tc-empty">📭 請先選擇班級。</div>`;
      return;
    }
    const counts = new Map();
    state.data.wrongLogs.forEach((w) => {
      if (String(w.className || w.cls || "").trim() !== cls) return;
      const qKey = String(w.questionKey || "").trim();
      if (!qKey) return;
      counts.set(qKey, (counts.get(qKey) || 0) + 1);
    });

    const top3 = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (top3.length === 0) {
      body.innerHTML = `<div class="tc-empty">✨ ${esc(cls)} 班目前尚無錯題紀錄！學生交卷若有答錯題目，系統將自動彙整至此處。</div>`;
      return;
    }

    body.innerHTML = `
      <div class="tc-wrong-intro">
        <h3>🎯 ${esc(cls)} 班高頻錯題診斷 Top ${top3.length}</h3>
        <p>點擊「📺 一鍵投影該題」即可開啟教室大螢幕專用超大字體講解視窗，預設隱藏答案方便全班舉手搶答！</p>
      </div>
      <div class="tc-wrong-grid">
        ${top3.map(([qKey, count], idx) => {
          const info = resolveQuestion(qKey);
          const diffLabel = DIFF_LABELS[info.difficulty] || info.difficulty || "標準";
          const stem = info.question ? info.question.q : `題目索引：${qKey}（本地題庫未找到對應題目）`;
          return `<article class="tc-wrong-card rank-${idx + 1}">
            <div class="tc-wrong-top">
              <span class="tc-rank-badge">🔥 錯題 #${idx + 1}</span>
              <span class="tc-wrong-count">累計答錯 <b>${count}</b> 人次</span>
            </div>
            <div class="tc-wrong-meta">
              <span class="tc-unit-tag">${esc(info.meta.islandEmoji)} ${esc(info.meta.islandName)} · ${esc(info.meta.unitName)}</span>
              <span class="tc-diff-tag d-${esc(info.difficulty)}">難度：${esc(diffLabel)}</span>
            </div>
            <p class="tc-wrong-stem">${esc(stem)}</p>
            <button type="button" class="btn-primary tc-project-btn" data-qkey="${esc(qKey)}" data-count="${count}">📺 一鍵投影該題</button>
          </article>`;
        }).join("")}
      </div>
    `;
  }

  /* ---- 超大字體題目檢討投影視窗 ---- */
  function openProjectorModal(qKey, wrongCount) {
    const info = resolveQuestion(qKey);
    const q = info.question;
    const diffLabel = DIFF_LABELS[info.difficulty] || info.difficulty || "標準";
    let revealed = false;

    const card = projWrap.querySelector("#tcProjectorCard");

    const isAnswerIndex = (idx) => {
      if (!q) return false;
      if (q.type === "single") return q.answer === idx;
      if (q.type === "multi") return Array.isArray(q.answer) && q.answer.includes(idx);
      return false;
    };

    const formatCorrectAnswerText = () => {
      if (!q) return "—";
      if (q.type === "single") return `${LETTERS[q.answer]}. ${q.options[q.answer]}`;
      if (q.type === "multi") return q.answer.map((i) => `${LETTERS[i]}. ${q.options[i]}`).join("、");
      if (q.type === "tf") return q.answer ? "○ 正確" : "✕ 錯誤";
      if (q.type === "fill") return Array.isArray(q.answer) ? q.answer[0] : String(q.answer || "");
      return "";
    };

    const renderProjector = () => {
      let optionsHtml = "";
      if (!q) {
        optionsHtml = `<div class="tc-proj-missing">⚠ 無法在本地題庫找到此題（<code>${esc(qKey)}</code>）</div>`;
      } else if (q.type === "single" || q.type === "multi") {
        optionsHtml = `<div class="tc-proj-opts">
          ${q.options.map((opt, idx) => {
            const isAns = revealed && isAnswerIndex(idx);
            return `<div class="tc-proj-opt${isAns ? " correct" : ""}">
              <span class="tc-proj-letter">${LETTERS[idx]}</span>
              <span class="tc-proj-opt-txt">${esc(opt)}</span>
              ${isAns ? `<span class="tc-proj-ans-pill">✔ 正確答案</span>` : ""}
            </div>`;
          }).join("")}
        </div>`;
      } else if (q.type === "tf") {
        optionsHtml = `<div class="tc-proj-opts tf">
          <div class="tc-proj-opt${revealed && q.answer === true ? " correct" : ""}">
            <span class="tc-proj-letter">○</span>
            <span class="tc-proj-opt-txt">正確</span>
            ${revealed && q.answer === true ? `<span class="tc-proj-ans-pill">✔ 正確答案</span>` : ""}
          </div>
          <div class="tc-proj-opt${revealed && q.answer === false ? " correct" : ""}">
            <span class="tc-proj-letter">✕</span>
            <span class="tc-proj-opt-txt">錯誤</span>
            ${revealed && q.answer === false ? `<span class="tc-proj-ans-pill">✔ 正確答案</span>` : ""}
          </div>
        </div>`;
      } else if (q.type === "fill") {
        optionsHtml = `<div class="tc-proj-fill">填空題：請同學舉手口頭作答</div>`;
      }

      card.innerHTML = `
        <div class="tc-proj-head">
          <div class="tc-proj-badges">
            <span class="tc-proj-badge">${esc(info.meta.islandEmoji)} ${esc(info.meta.islandName)} · ${esc(info.meta.unitName)}</span>
            <span class="tc-proj-badge diff">難度：${esc(diffLabel)}</span>
            <span class="tc-proj-badge warn">🔥 累計答錯 ${wrongCount} 人次</span>
          </div>
          <button type="button" id="tcProjClose" class="tc-proj-close" aria-label="關閉投影視窗">✕ 關閉投影</button>
        </div>

        <div class="tc-proj-body">
          <h2 class="tc-proj-question">${q ? esc(q.q).replace(/\n/g, "<br>") : esc(qKey)}</h2>
          ${optionsHtml}

          <div class="tc-proj-explain${revealed ? " show" : ""}" ${revealed ? "" : "hidden"}>
            <div class="tc-proj-ans-line">✅ 正確答案：<strong>${esc(formatCorrectAnswerText())}</strong></div>
            ${q && q.explain ? `<div class="tc-proj-exp-line">💡 解析：${esc(q.explain)}</div>` : ""}
          </div>
        </div>

        <div class="tc-proj-foot">
          <button type="button" id="tcProjRevealBtn" class="btn-primary tc-proj-reveal-btn">
            ${revealed ? "🙈 隱藏正確答案與解析" : "💡 揭曉正確答案與解析"}
          </button>
        </div>
      `;

      card.querySelector("#tcProjClose").onclick = closeProjectorModal;
      card.querySelector("#tcProjRevealBtn").onclick = () => {
        revealed = !revealed;
        renderProjector();
      };
    };

    renderProjector();
    projWrap.hidden = false;
    projWrap.classList.remove("hidden", "pointer-events-none");
    projWrap.classList.add("show");
    notifyCockpitToggle();
  }

  function closeProjectorModal() {
    projWrap.classList.remove("show");
    projWrap.classList.add("hidden", "pointer-events-none");
    projWrap.hidden = true;
    notifyCockpitToggle();
  }

  /* ---- 渲染分頁三：📢 雲端任務派發 ---- */
  function getDispatchElements() {
    return {
      form: cockpitWrap.querySelector("#tcDispatchForm"),
      statusEl: cockpitWrap.querySelector("#tcDispatchStatus"),
      saveBtn: cockpitWrap.querySelector("#tcDispatchSubmit"),
      clearBtn: cockpitWrap.querySelector("#tcDispatchClear"),
      announcementEl: cockpitWrap.querySelector("#tcCfgAnnouncement"),
      targetIslandEl: cockpitWrap.querySelector("#tcCfgTargetIsland"),
      linkTitleEl: cockpitWrap.querySelector("#tcCfgLinkTitle"),
      linkUrlEl: cockpitWrap.querySelector("#tcCfgLinkUrl")
    };
  }

  function renderDispatchStatus(statusEl) {
    if (!statusEl) return;
    const { text, kind, showReauth } = state.dispatchStatus || {};
    if (!text) {
      statusEl.textContent = "";
      statusEl.className = "tc-df-status";
      return;
    }
    statusEl.className = `tc-df-status${kind ? ` ${kind}` : ""}`;
    if (showReauth) {
      statusEl.innerHTML = `${esc(text)} <button type="button" id="tcDispatchReauth" class="tc-inline-reauth-btn">🔑 重新登入</button>`;
    } else {
      statusEl.textContent = text;
    }
  }

  function setDispatchStatus(text = "", kind = "", showReauth = false) {
    state.dispatchStatus = { text, kind, showReauth: !!showReauth };
    const { statusEl } = getDispatchElements();
    renderDispatchStatus(statusEl);
  }

  function syncDispatchDraftFromDom() {
    const { announcementEl, targetIslandEl, linkTitleEl, linkUrlEl } = getDispatchElements();
    if (!announcementEl && !targetIslandEl && !linkTitleEl && !linkUrlEl) return;
    state.dispatchDirty = true;
    state.dispatchDraft = {
      announcement: announcementEl ? announcementEl.value : "",
      targetIsland: targetIslandEl ? targetIslandEl.value : "",
      taskLinkTitle: linkTitleEl ? linkTitleEl.value : "",
      taskLinkUrl: linkUrlEl ? linkUrlEl.value : ""
    };
  }

  function handleDispatchClear() {
    if (state.dispatchSaving) return;
    const { announcementEl, targetIslandEl, linkTitleEl, linkUrlEl } = getDispatchElements();
    if (announcementEl) announcementEl.value = "";
    if (targetIslandEl) {
      targetIslandEl.value = "";
      targetIslandEl.selectedIndex = 0;
    }
    if (linkTitleEl) linkTitleEl.value = "";
    if (linkUrlEl) linkUrlEl.value = "";

    state.dispatchDirty = true;
    state.dispatchDraft = createDraftFromConfig(null);
    setDispatchStatus("🧹 已清空表單欄位（請點擊「發布至全校海島」以同步清除雲端與學生端公告）", "warn");
  }

  async function handleDispatchPublish() {
    if (state.dispatchSaving) return;
    const { saveBtn, announcementEl, targetIslandEl, linkTitleEl, linkUrlEl } = getDispatchElements();
    const pwd = getTeacherPassword();
    if (!pwd) {
      setDispatchStatus("⚠️ 教師驗證已逾時，請重新登入戰情室", "err", true);
      return;
    }

    const nextConfig = {
      announcement: (announcementEl ? announcementEl.value : "").trim(),
      targetIsland: (targetIslandEl ? targetIslandEl.value : "").trim(),
      taskLinkTitle: (linkTitleEl ? linkTitleEl.value : "").trim(),
      taskLinkUrl: (linkUrlEl ? linkUrlEl.value : "").trim()
    };

    state.dispatchSaving = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "⏳ 發布同步中...";
    }
    setDispatchStatus("", "");

    try {
      const res = await saveCloudConfig(pwd, nextConfig);
      if (res && res.status === "ok") {
        const saved = createDraftFromConfig(res.config || nextConfig);
        state.data.config = saved;
        state.dispatchDraft = createDraftFromConfig(saved);
        state.dispatchDirty = false;

        if (announcementEl) announcementEl.value = saved.announcement;
        if (targetIslandEl) targetIslandEl.value = saved.targetIsland;
        if (linkTitleEl) linkTitleEl.value = saved.taskLinkTitle;
        if (linkUrlEl) linkUrlEl.value = saved.taskLinkUrl;

        if (window.CloudConfig && typeof window.CloudConfig.set === "function") {
          window.CloudConfig.set(saved);
        } else {
          document.dispatchEvent(new CustomEvent("ii:config-updated", { detail: { ...saved } }));
        }
        if (window.__island3D && typeof window.__island3D.setTargetIslandHighlight === "function") {
          window.__island3D.setTargetIslandHighlight(saved.targetIsland);
        }

        setDispatchStatus("✅ 已成功發布至全校海島！", "ok");
      } else if (res && res.status === "unauthorized") {
        clearTeacherPassword();
        setDispatchStatus("⚠️ 教師驗證已逾時，請重新登入戰情室", "err", true);
      } else {
        const reason = (res && (res.message || res.error)) || "伺服器未回傳成功狀態，請稍後再試";
        setDispatchStatus(`❌ 發布失敗：${reason}`, "err");
      }
    } catch (err) {
      setDispatchStatus(`❌ 連線失敗：${(err && err.message) || "請檢查網路連線或 GAS 部署"}`, "err");
    } finally {
      state.dispatchSaving = false;
      const { saveBtn: currentSaveBtn } = getDispatchElements();
      if (currentSaveBtn) {
        currentSaveBtn.disabled = false;
        currentSaveBtn.textContent = "💾 發布至全校海島";
      }
    }
  }

  function renderDispatchTab(body) {
    if (!state.dispatchDraft) {
      const fallbackCfg = state.data.config
        || (window.CloudConfig && typeof window.CloudConfig.get === "function" ? window.CloudConfig.get() : null)
        || {};
      state.dispatchDraft = createDraftFromConfig(fallbackCfg);
    }
    const cfg = state.dispatchDraft;
    const islands = Array.isArray(window.ISLANDS) ? window.ISLANDS : [];

    body.innerHTML = `
      <section class="tc-panel tc-dispatch-panel">
        <div class="tc-panel-head">
          <h3>📢 雲端動態公告與任務派發設定</h3>
          <small>發布後全校學生重整或載入網頁即自動同步（亦可直接於試算表 <code>Config</code> 分頁編輯）</small>
        </div>
        <form id="tcDispatchForm" class="tc-dispatch-form" novalidate>
          <label class="tc-df-field">
            <span>📣 今日公告文字</span>
            <textarea id="tcCfgAnnouncement" rows="3" placeholder="例如：今天請大家先完成「電腦探險島」挑戰，下課前要交卷喔！">${esc(cfg.announcement || "")}</textarea>
          </label>
          <div class="tc-df-row2">
            <label class="tc-df-field">
              <span>🎯 指定高亮島嶼（3D 場景金色標記）</span>
              <select id="tcCfgTargetIsland">
                <option value="">（無指定）</option>
                ${islands.map((isl) => `<option value="${esc(isl.id)}"${cfg.targetIsland === isl.id ? " selected" : ""}>${esc(isl.emoji)} ${esc(isl.name)} (${esc(isl.id)})</option>`).join("")}
              </select>
            </label>
            <label class="tc-df-field">
              <span>🔘 延伸任務按鈕名稱</span>
              <input id="tcCfgLinkTitle" type="text" maxlength="40" value="${esc(cfg.taskLinkTitle || "")}" placeholder="預設：前往任務連結" />
            </label>
          </div>
          <label class="tc-df-field">
            <span>🔗 任務網址</span>
            <input id="tcCfgLinkUrl" type="url" value="${esc(cfg.taskLinkUrl || "")}" placeholder="https://..." />
          </label>
          <div class="tc-df-actions">
            <button type="submit" id="tcDispatchSubmit" class="btn-primary tc-df-save-btn"${state.dispatchSaving ? " disabled" : ""}>
              ${state.dispatchSaving ? "⏳ 發布同步中..." : "💾 發布至全校海島"}
            </button>
            <button type="button" id="tcDispatchClear" class="tc-icon-btn">🧹 清空表單</button>
          </div>
          <p class="tc-df-status" id="tcDispatchStatus" role="status" aria-live="polite"></p>
        </form>
      </section>
    `;

    const { statusEl, announcementEl, targetIslandEl, linkTitleEl, linkUrlEl } = getDispatchElements();
    [announcementEl, targetIslandEl, linkTitleEl, linkUrlEl].filter(Boolean).forEach((fieldEl) => {
      fieldEl.disabled = false;
      fieldEl.readOnly = false;
      fieldEl.removeAttribute("disabled");
      fieldEl.removeAttribute("readonly");
    });
    renderDispatchStatus(statusEl);
  }

  function renderMainBody() {
    renderTopBar();
    const body = cockpitWrap.querySelector("#tcMainBody");
    if (state.activeTab === "radar") renderRadarTab(body);
    else if (state.activeTab === "wrong") renderWrongTab(body);
    else renderDispatchTab(body);
  }

  /* ---- 開啟 / 關閉 / 縮小戰情室 ---- */
  function closeAuthModal() {
    authWrap.classList.remove("show");
    authWrap.classList.add("hidden", "pointer-events-none");
    authWrap.hidden = true;
    notifyCockpitToggle();
  }

  function showCockpitWorkspace() {
    // 教師成功登入後，自動隱藏並略過學生登入遮罩視窗
    if (window.Auth && typeof window.Auth.hide === "function") {
      window.Auth.hide();
    }
    const loginModal = document.getElementById("loginModal");
    if (loginModal) {
      loginModal.classList.remove("show");
      loginModal.classList.add("hidden", "pointer-events-none");
      loginModal.hidden = true;
    }

    closeAuthModal();
    state.isMinimized = false;
    restorePill.classList.remove("show");
    cockpitWrap.hidden = false;
    cockpitWrap.classList.remove("hidden", "pointer-events-none");
    cockpitWrap.classList.add("show");
    renderMainBody();
    notifyCockpitToggle();
  }

  function minimizeFor3DStage(stageNum) {
    state.activeStage = stageNum;
    if (typeof window.previewAllStage === "function") {
      window.previewAllStage(stageNum);
    }
    state.isMinimized = true;
    cockpitWrap.classList.remove("show");
    cockpitWrap.classList.add("pointer-events-none");
    restorePill.classList.add("show");
    notifyCockpitToggle();
  }

  function closeCockpit() {
    if (luckyTimer) {
      clearInterval(luckyTimer);
      luckyTimer = null;
      state.luckyRunning = false;
    }
    cockpitWrap.classList.remove("show");
    cockpitWrap.classList.add("pointer-events-none");
    restorePill.classList.remove("show");
    closeProjectorModal();
    if (state.activeStage !== null && typeof window.previewAllStage === "function") {
      window.previewAllStage("auto");
      state.activeStage = null;
    }
    notifyCockpitToggle();
  }

  function openAuthModal(prefillErr = "", { preserveDispatchDraft = false } = {}) {
    state.pendingReauthOnly = !!preserveDispatchDraft;
    const errEl = authWrap.querySelector("#tcAuthErr");
    const input = authWrap.querySelector("#tcPasswordInput");
    errEl.textContent = prefillErr;
    input.value = "";
    authWrap.hidden = false;
    authWrap.classList.remove("hidden", "pointer-events-none");
    authWrap.classList.add("show");
    notifyCockpitToggle();
    setTimeout(() => input.focus(), 60);
  }

  async function openTeacherCockpit() {
    const savedPwd = getTeacherPassword();
    if (savedPwd) {
      try {
        const res = await fetchTeacherDashboard(savedPwd);
        if (res && res.status === "ok") {
          setTeacherPassword(savedPwd);
          applyDashboardData(res);
          showCockpitWorkspace();
          return;
        }
        if (res && res.status === "unauthorized") {
          clearTeacherPassword();
          openAuthModal("密碼已變更，請重新輸入教師密碼");
          return;
        }
      } catch {
        // 若網路暫時失敗，改顯示登入視窗讓老師重試
      }
    }
    openAuthModal();
  }

  async function handleRefreshClick() {
    const btn = cockpitWrap.querySelector("#tcRefreshBtn");
    const pwd = getTeacherPassword();
    if (!pwd) {
      setGlobalStatus("⚠️ 教師驗證已逾時，請重新登入戰情室", "err");
      openAuthModal("教師驗證已逾時，請重新登入");
      return;
    }
    setGlobalStatus("");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ 同步中…";
    }
    try {
      const res = await fetchTeacherDashboard(pwd);
      if (res && res.status === "ok") {
        applyDashboardData(res);
        renderMainBody();
        setGlobalStatus("✅ 已同步雲端最新班級與設定資料", "ok");
        setTimeout(() => setGlobalStatus(""), 3200);
      } else if (res && res.status === "unauthorized") {
        clearTeacherPassword();
        closeCockpit();
        openAuthModal("密碼錯誤，請重新驗證");
      } else {
        setGlobalStatus(`❌ 同步失敗：${(res && res.message) || "請稍後再試"}`, "err");
      }
    } catch (err) {
      setGlobalStatus(`❌ 同步失敗：${(err && err.message) || "請檢查網路或 GAS 部署"}`, "err");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "🔄 同步";
      }
    }
  }

  /* ---- 事件綁定（外層容器事件委派） ---- */
  const stopBubble = (e) => { e.stopPropagation(); };
  [cockpitWrap, authWrap, projWrap].forEach((container) => {
    container.addEventListener("click", stopBubble);
    container.addEventListener("pointerdown", stopBubble);
    container.addEventListener("mousedown", stopBubble);
    container.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !isFormFieldTarget(e.target)) {
        if (container === projWrap && projWrap.classList.contains("show")) closeProjectorModal();
        else if (container === authWrap && authWrap.classList.contains("show")) closeAuthModal();
        else if (container === cockpitWrap && cockpitWrap.classList.contains("show")) closeCockpit();
      }
      e.stopPropagation();
    });
    container.addEventListener("keyup", stopBubble);
  });

  authWrap.querySelector("#tcAuthClose").onclick = closeAuthModal;
  authWrap.addEventListener("click", (e) => { if (e.target === authWrap) closeAuthModal(); });
  authWrap.querySelector("#tcAuthForm").onsubmit = async (e) => {
    e.preventDefault();
    const input = authWrap.querySelector("#tcPasswordInput");
    const errEl = authWrap.querySelector("#tcAuthErr");
    const submitBtn = authWrap.querySelector("#tcAuthSubmit");
    const pwd = input.value;
    if (!pwd) {
      errEl.textContent = "請輸入教師密碼";
      input.focus();
      return;
    }
    errEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ 驗證中…";
    try {
      const res = await fetchTeacherDashboard(pwd);
      if (res && res.status === "ok") {
        setTeacherPassword(pwd);
        const preserveDraft = state.pendingReauthOnly;
        state.pendingReauthOnly = false;
        closeAuthModal();
        applyDashboardData(res, { preserveDispatchDraft: preserveDraft });
        showCockpitWorkspace();
      } else if (res && res.status === "unauthorized") {
        errEl.textContent = "密碼錯誤";
        input.select();
      } else {
        errEl.textContent = (res && res.message) || "驗證失敗，請稍後再試";
      }
    } catch (err) {
      errEl.textContent = `連線失敗：${err.message || "請檢查網路或 GAS 部署"}`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "🔓 驗證並開啟戰情室";
    }
  };

  cockpitWrap.addEventListener("click", (e) => {
    const target = e.target;
    if (!target || typeof target.closest !== "function") return;

    if (target.closest("#tcDispatchClear")) {
      e.preventDefault();
      handleDispatchClear();
      return;
    }
    if (target.closest("#tcDispatchSubmit")) {
      e.preventDefault();
      handleDispatchPublish();
      return;
    }
    if (target.closest("#tcDispatchReauth")) {
      e.preventDefault();
      openAuthModal("請重新驗證教師密碼", { preserveDispatchDraft: true });
      return;
    }
    if (target.closest("#tcLuckyBtn")) {
      e.preventDefault();
      startLuckyDraw(getClassSnapshot());
      return;
    }
    const projBtn = target.closest(".tc-project-btn");
    if (projBtn) {
      openProjectorModal(projBtn.dataset.qkey, Number(projBtn.dataset.count) || 0);
      return;
    }
    if (target.closest("#tcPrivacyBtn")) {
      state.isPrivacyMode = !state.isPrivacyMode;
      renderMainBody();
      return;
    }
    const stageBtn = target.closest(".tc-stage-btn");
    if (stageBtn) {
      minimizeFor3DStage(Number(stageBtn.dataset.stage));
      return;
    }
    const tabBtn = target.closest(".tc-tab");
    if (tabBtn) {
      state.activeTab = tabBtn.dataset.tab;
      renderMainBody();
      return;
    }
    if (target.closest("#tcRefreshBtn")) {
      handleRefreshClick();
      return;
    }
    if (target.closest("#tcCloseBtn")) {
      closeCockpit();
    }
  });

  cockpitWrap.addEventListener("submit", (e) => {
    if (e.target && e.target.id === "tcDispatchForm") {
      e.preventDefault();
      handleDispatchPublish();
    }
  });

  cockpitWrap.addEventListener("input", (e) => {
    const id = e.target && e.target.id;
    if (id === "tcCfgAnnouncement" || id === "tcCfgTargetIsland" || id === "tcCfgLinkTitle" || id === "tcCfgLinkUrl") {
      syncDispatchDraftFromDom();
    }
  });

  cockpitWrap.addEventListener("change", (e) => {
    const target = e.target;
    if (!target) return;
    if (target.id === "tcClassSelect") {
      state.selectedClass = target.value;
      state.luckyResult = null;
      renderMainBody();
      return;
    }
    if (target.id === "tcLuckyOnlineOnly") {
      state.luckyOnlineOnly = !!target.checked;
      return;
    }
    if (target.id === "tcCfgAnnouncement" || target.id === "tcCfgTargetIsland" || target.id === "tcCfgLinkTitle" || target.id === "tcCfgLinkUrl") {
      syncDispatchDraftFromDom();
    }
  });

  restorePill.onclick = showCockpitWorkspace;
  projWrap.addEventListener("click", (e) => { if (e.target === projWrap) closeProjectorModal(); });

  document.addEventListener("keydown", (e) => {
    if (isFormFieldTarget(e.target)) return;
    if (e.key === "Escape") {
      if (projWrap.classList.contains("show")) closeProjectorModal();
      else if (authWrap.classList.contains("show")) closeAuthModal();
      else if (cockpitWrap.classList.contains("show")) closeCockpit();
    }
  });

  /* ---- 隱藏觸發入口 1：3 秒內連續點擊左上角標題 5 下 ---- */
  let titleClicks = [];
  const brandEl = document.querySelector(".brand") || document.getElementById("siteTitle");
  if (brandEl) {
    brandEl.style.cursor = "pointer";
    brandEl.addEventListener("click", () => {
      const now = Date.now();
      titleClicks = titleClicks.filter((t) => now - t <= 3000);
      titleClicks.push(now);
      if (titleClicks.length >= 5) {
        titleClicks = [];
        openTeacherCockpit();
      }
    });
  }

  /* ---- 隱藏觸發入口 2：網址列 ?teacher=1 ---- */
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("teacher") === "1") {
      setTimeout(() => openTeacherCockpit(), 120);
    }
  } catch {}

  window.TeacherCockpit = { open: openTeacherCockpit, close: closeCockpit };
})();
