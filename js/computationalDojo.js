/* ==========================================================================
 * 天穹試煉浮島左殿：🧠 運算思維互動道場（4 大高難度演算法盤面）
 * --------------------------------------------------------------------------
 * - 純前端 SVG / DOM 狀態機實作（零 PointLight、零原生 alert/confirm/prompt、無襯線體）
 * - 關卡 1 (dojo:fsm)      ：有限狀態機金庫（FSM & Guarded Transitions）
 * - 關卡 2 (dojo:dag)      ：多約束 DAG 排程賽（Topological Sort & 2-CPU Limit）
 * - 關卡 3 (dojo:bitwise)  ：位元遮罩邏輯逆向工程（Bitwise & Logic Circuit）
 * - 關卡 4 (dojo:recursion)：遞迴回溯與堆疊剪枝（Recursion Call Stack & Pruning）
 * - 每關通關發放 +30 ⭐ 探索星幣，4 關全通關解鎖稱號「演算法宗師」
 * ========================================================================== */
(() => {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const DOJO_LEVELS = [
    { id: "dojo:fsm", short: "FSM 金庫", title: "有限狀態機金庫", icon: "🔐", badge: "FSM & Guarded Transitions", coins: 30 },
    { id: "dojo:dag", short: "DAG 排程", title: "多約束 DAG 排程賽", icon: "⚡", badge: "Topological Sort & 2-CPU", coins: 30 },
    { id: "dojo:bitwise", short: "位元逆向", title: "位元遮罩邏輯逆向工程", icon: "🔌", badge: "Bitwise & Logic Circuit", coins: 30 },
    { id: "dojo:recursion", short: "遞迴剪枝", title: "遞迴回溯與堆疊剪枝", icon: "🌲", badge: "Call Stack & Pruning", coins: 30 }
  ];

  const demoCompleted = new Set();

  function hasActiveTeacherSession() {
    try {
      for (const key of ["ii_teacher_session", "island_teacher_session"]) {
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.password) continue;
        const exp = Number(parsed.expiresAt);
        if (Number.isFinite(exp) && exp > 0 && Date.now() > exp) continue;
        return true;
      }
    } catch {}
    return false;
  }

  function isTeacherDemoMode() {
    if (window.Store?.profile) return false;
    const unlockFlag = Boolean(
      window.CloudConfig?.isCitadelTempUnlocked?.() ||
      window.CloudConfig?.get?.()?.unlockCitadel
    );
    return hasActiveTeacherSession() || unlockFlag;
  }

  function getDemoTokens() {
    return Array.from(demoCompleted);
  }

  function getTokens() {
    if (isTeacherDemoMode()) {
      return getDemoTokens();
    }
    if (window.Store && typeof window.Store.getCitadelTokens === "function") {
      const list = window.Store.getCitadelTokens();
      return Array.isArray(list) ? list : [];
    }
    if (window.AvatarSystem && typeof window.AvatarSystem.getState === "function") {
      const list = window.AvatarSystem.getState()?.citadelTokens;
      return Array.isArray(list) ? list : [];
    }
    return [];
  }

  function isCompleted(token) {
    if (isTeacherDemoMode()) {
      return demoCompleted.has(token);
    }
    return getTokens().includes(token);
  }

  function notify(msg, type = "info", ms = 3200) {
    if (window.AvatarSystem && typeof window.AvatarSystem.toast === "function") {
      window.AvatarSystem.toast(msg, type, ms);
    }
  }

  function isAvatarLocked() {
    return Boolean(window.AvatarSystem?.isAvatarLocked?.());
  }

  function isTokenRewarded(token) {
    return Boolean(window.AvatarSystem?.isCitadelTokenRewarded?.(token));
  }

  function completeDojoLevel(token, label, onUpdate) {
    const demoMode = isTeacherDemoMode();
    const wasAll = DOJO_LEVELS.every((lv) => isCompleted(lv.id));
    let res = { ok: true, isNew: false, gained: 0, demo: demoMode };

    if (demoMode) {
      const isNew = !demoCompleted.has(token);
      demoCompleted.add(token);
      res = { ok: true, demo: true, isNew, gained: 0 };
      const nowAll = DOJO_LEVELS.every((lv) => isCompleted(lv.id));
      notify(`🎉 【教師演示】通過「${label}」！演示成功（不寫入學生星幣與雲端成績）`, "ok", 3600);
      if (typeof window.confetti === "function") {
        try {
          window.confetti({ particleCount: 70, spread: 70, origin: { y: 0.56 }, colors: ["#38bdf8", "#ffd166", "#34d399", "#a78bfa"] });
        } catch {}
      }
      if (!wasAll && nowAll) {
        setTimeout(() => {
          notify("⚡ 【教師演示】運算思維道場 4 關全通關！（課堂演示模式，未寫入雲端）", "ok", 4600);
          if (typeof window.confetti === "function") {
            try {
              window.confetti({ particleCount: 110, spread: 95, origin: { y: 0.5 }, colors: ["#ffd166", "#38bdf8", "#c084fc"] });
            } catch {}
          }
        }, 450);
      }
      if (typeof onUpdate === "function") onUpdate(res);
      return res;
    }

    if (window.Store && typeof window.Store.recordCitadelToken === "function") {
      res = window.Store.recordCitadelToken(token) || res;
    } else if (window.AvatarSystem && typeof window.AvatarSystem.grantCitadelToken === "function") {
      res = window.AvatarSystem.grantCitadelToken(token) || res;
    }
    const nowAll = DOJO_LEVELS.every((lv) => isCompleted(lv.id));
    if (res && res.gained > 0) {
      notify(`🎉 通過「${label}」！獲得 +${res.gained} ⭐ 探索星幣！`, "coin", 3600);
      if (typeof window.confetti === "function") {
        try {
          window.confetti({ particleCount: 70, spread: 70, origin: { y: 0.56 }, colors: ["#38bdf8", "#ffd166", "#34d399", "#a78bfa"] });
        } catch {}
      }
    } else if (res && res.isNew && res.lockedRequired) {
      notify(`🎉 通過「${label}」！已記錄進度（🔒 尚未鎖定專屬角色，星幣維持 0）`, "info", 3800);
    }
    if (!wasAll && nowAll) {
      setTimeout(() => {
        notify("⚡ 運算思維道場 4 關制霸！解鎖終局稱號【演算法宗師】！", "ok", 4600);
        if (typeof window.confetti === "function") {
          try {
            window.confetti({ particleCount: 110, spread: 95, origin: { y: 0.5 }, colors: ["#ffd166", "#38bdf8", "#c084fc"] });
          } catch {}
        }
      }, 450);
    }
    if (typeof onUpdate === "function") onUpdate(res);
    return res;
  }

  /* ========================================================================
   * 關卡 1：有限狀態機金庫 (FSM & Guarded Transitions)
   * ======================================================================== */
  const FSM_NODES = {
    S0: { id: "S0", label: "S0 起始", x: 75, y: 155, role: "start" },
    S1: { id: "S1", label: "S1 樞紐", x: 220, y: 155, role: "mid" },
    S2: { id: "S2", label: "S2 旗標X", x: 220, y: 55, role: "flagX" },
    S4: { id: "S4", label: "S4 旗標Y", x: 375, y: 55, role: "flagY" },
    S3: { id: "S3", label: "S3 閘門", x: 375, y: 155, role: "gate" },
    S5: { id: "S5", label: "S5 解鎖", x: 525, y: 110, role: "goal" },
    S_ALARM: { id: "S_ALARM", label: "S_ALARM", x: 375, y: 265, role: "alarm" }
  };

  function stepFsm(state, input) {
    const { node, flagX, flagY, steps } = state;
    if (node === "S_ALARM" || node === "S5" || steps >= 6) return null;
    let nextNode = "S_ALARM";
    let nextX = flagX;
    let nextY = flagY;
    let note = "";

    if (node === "S0") {
      if (input === "A") { nextNode = "S1"; note = "S0 ─A→ S1 進入控制樞紐"; }
      else if (input === "B") { nextNode = "S3"; note = "S0 ─B→ S3 捷徑未取旗標"; }
      else { nextNode = "S_ALARM"; note = "S0 ─C→ S_ALARM 誤觸防盜警報！"; }
    } else if (node === "S1") {
      if (input === "A") { nextNode = "S3"; note = "S1 ─A→ S3 直接前往閘門"; }
      else if (input === "B") { nextNode = "S2"; nextX = true; note = "S1 ─B→ S2 觸發 Flag_X = true！"; }
      else {
        if (flagX) { nextNode = "S4"; nextY = true; note = "S1 ─C [Flag_X]→ S4 觸發 Flag_Y = true！"; }
        else { nextNode = "S_ALARM"; note = "S1 ─C [需 Flag_X]→ 守衛失敗，觸發 S_ALARM！"; }
      }
    } else if (node === "S2") {
      if (input === "C") { nextNode = "S1"; note = "S2 ─C→ S1 帶回 Flag_X 回到樞紐"; }
      else if (input === "B") { nextNode = "S3"; note = "S2 ─B→ S3（尚缺 Flag_Y）"; }
      else { nextNode = "S_ALARM"; note = "S2 ─A→ S_ALARM 觸發警報死鎖！"; }
    } else if (node === "S4") {
      if (input === "A") { nextNode = "S3"; note = "S4 ─A→ S3 雙旗標齊備抵達閘門"; }
      else if (input === "C") { nextNode = "S1"; note = "S4 ─C→ S1 返回樞紐"; }
      else { nextNode = "S_ALARM"; note = "S4 ─B→ S_ALARM 誤觸警報！"; }
    } else if (node === "S3") {
      if (input === "A") { nextNode = "S1"; note = "S3 ─A→ S1 退回控制樞紐"; }
      else if (input === "B") {
        if (flagX && flagY) { nextNode = "S5"; note = "S3 ─B [Flag_X && Flag_Y]→ S5 金庫解鎖成功！"; }
        else { nextNode = "S_ALARM"; note = "S3 ─B [需 Flag_X && Flag_Y]→ 權限不足，S_ALARM！"; }
      } else {
        nextNode = "S_ALARM"; note = "S3 ─C→ S_ALARM 指令無效！";
      }
    }

    return {
      node: nextNode,
      flagX: nextX,
      flagY: nextY,
      steps: steps + 1,
      lastEdge: `${node}->${nextNode}:${input}`,
      note
    };
  }

  function mountFsmLevel(ctx) {
    const history = [{ node: "S0", flagX: false, flagY: false, steps: 0, lastEdge: "", note: "初始待命於 S0，Flag_X = false、Flag_Y = false。" }];
    let solvedNotified = false;

    const edges = [
      { from: "S0", to: "S1", label: "A", path: "M 102 155 L 188 155" },
      { from: "S0", to: "S3", label: "B", path: "M 96 175 Q 225 224 348 175", curveLabel: [225, 212] },
      { from: "S0", to: "S_ALARM", label: "C", path: "M 92 180 Q 170 265 340 268", curveLabel: [175, 250] },
      { from: "S1", to: "S2", label: "B (X=T)", path: "M 205 130 Q 192 92 205 80", curveLabel: [176, 105] },
      { from: "S2", to: "S1", label: "C", path: "M 235 80 Q 248 106 235 130", curveLabel: [255, 105] },
      { from: "S1", to: "S4", label: "C [Flag_X]", path: "M 244 139 L 348 72", guard: true },
      { from: "S1", to: "S3", label: "A", path: "M 248 148 L 344 148" },
      { from: "S3", to: "S1", label: "A", path: "M 344 166 L 248 166" },
      { from: "S2", to: "S3", label: "B", path: "M 245 72 L 352 136" },
      { from: "S4", to: "S3", label: "A", path: "M 375 82 L 375 126" },
      { from: "S3", to: "S5", label: "B [X&&Y]", path: "M 402 146 L 494 118", guard: true },
      { from: "S3", to: "S_ALARM", label: "C / !Guard", path: "M 375 184 L 375 236", alarm: true }
    ];

    const render = () => {
      const cur = history[history.length - 1];
      const won = cur.node === "S5" && cur.steps <= 6;
      const dead = cur.node === "S_ALARM";
      const outOfSteps = cur.steps >= 6 && !won && !dead;

      if (won && !solvedNotified) {
        solvedNotified = true;
        ctx.pass();
      }

      const edgeSvg = edges.map((e) => {
        const active = cur.lastEdge.startsWith(`${e.from}->${e.to}:`);
        const stroke = active ? "#38bdf8" : (e.alarm ? "rgba(248,113,113,0.45)" : (e.guard ? "rgba(251,191,36,0.7)" : "rgba(148,163,184,0.55)"));
        const marker = active ? "url(#fsm-arrow-active)" : (e.alarm ? "url(#fsm-arrow-alarm)" : (e.guard ? "url(#fsm-arrow-guard)" : "url(#fsm-arrow)"));
        const lx = e.curveLabel ? e.curveLabel[0] : (FSM_NODES[e.from].x + FSM_NODES[e.to].x) / 2;
        const ly = e.curveLabel ? e.curveLabel[1] : (FSM_NODES[e.from].y + FSM_NODES[e.to].y) / 2 - 7;
        return `
          <path d="${e.path}" fill="none" stroke="${stroke}" stroke-width="${active ? 3.2 : 1.9}" stroke-dasharray="${e.guard ? "5 3" : "none"}" marker-end="${marker}" />
          <text x="${lx}" y="${ly}" text-anchor="middle" fill="${active ? "#7dd3fc" : (e.guard ? "#fde68a" : "#cbd5e1")}" font-size="10.5" font-weight="700">${esc(e.label)}</text>
        `;
      }).join("");

      const nodeSvg = Object.values(FSM_NODES).map((n) => {
        const isCur = cur.node === n.id;
        let fill = "#1e293b";
        let stroke = "#64748b";
        if (n.role === "goal") { fill = isCur ? "#065f46" : "#0f2e2b"; stroke = "#34d399"; }
        else if (n.role === "alarm") { fill = isCur ? "#7f1d1d" : "#2b161b"; stroke = "#f87171"; }
        else if (n.role === "flagX" || n.role === "flagY") { fill = (n.role === "flagX" ? cur.flagX : cur.flagY) ? "#1e3a8a" : "#1e293b"; stroke = "#fbbf24"; }
        if (isCur) stroke = n.role === "alarm" ? "#fca5a5" : "#38bdf8";

        return `
          <g class="dojo-fsm-node ${isCur ? "is-cur" : ""}">
            ${isCur ? `<circle cx="${n.x}" cy="${n.y}" r="31" fill="none" stroke="${stroke}" stroke-width="2.2" opacity="0.7" />` : ""}
            <circle cx="${n.x}" cy="${n.y}" r="25" fill="${fill}" stroke="${stroke}" stroke-width="${isCur ? 3 : 2}" />
            <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" fill="#f8fafc" font-size="11.5" font-weight="800">${esc(n.id)}</text>
            <text x="${n.x}" y="${n.y + 39}" text-anchor="middle" fill="#94a3b8" font-size="10">${esc(n.label.replace(n.id, "").trim() || n.id)}</text>
          </g>
        `;
      }).join("");

      ctx.body.innerHTML = `
        <div class="dojo-stage-shell">
          <div class="dojo-brief">
            <b>🎯 通關條件：</b>從 <code>S0</code> 出發，在<b>恰好 6 步內</b>解鎖進入 <code>S5</code> 且不觸發警報。關鍵轉移邊設有條件守衛：必須先取得 <code>Flag_X</code> 才能進入 <code>S4</code> 開啟 <code>Flag_Y</code>！
          </div>
          <div class="dojo-fsm-hud">
            <div class="dojo-lamp ${cur.flagX ? "is-on" : ""}"><span>Flag_X</span><b>${cur.flagX ? "TRUE" : "FALSE"}</b></div>
            <div class="dojo-lamp ${cur.flagY ? "is-on" : ""}"><span>Flag_Y</span><b>${cur.flagY ? "TRUE" : "FALSE"}</b></div>
            <div class="dojo-meter ${cur.steps === 6 && won ? "is-ok" : (dead || outOfSteps ? "is-bad" : "")}">
              步數：<b>${cur.steps}</b> / 6 步
            </div>
            <div class="dojo-meter">目前狀態：<b>${esc(cur.node)}</b></div>
          </div>
          <div class="dojo-svg-wrap">
            <svg viewBox="0 0 600 315" class="dojo-svg" role="img" aria-label="有限狀態機狀態轉移圖">
              <defs>
                <marker id="fsm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" /></marker>
                <marker id="fsm-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" /></marker>
                <marker id="fsm-arrow-guard" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" /></marker>
                <marker id="fsm-arrow-alarm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#f87171" /></marker>
              </defs>
              ${edgeSvg}
              ${nodeSvg}
            </svg>
          </div>
          <div class="dojo-feedback ${won ? "is-ok" : (dead || outOfSteps ? "is-bad" : "")}">
            ${won ? "✅ 成功以恰好 6 步解除雙旗標守衛並開啟 S5 金庫！" : (outOfSteps ? "⚠️ 已達 6 步上限卻尚未抵達 S5！請點擊「單步悔棋」或「重置」。" : esc(cur.note))}
          </div>
          <div class="dojo-ctrl-row">
            <button type="button" class="dojo-btn is-cmd" data-cmd="A" ${won || dead || outOfSteps ? "disabled" : ""}>指令 A</button>
            <button type="button" class="dojo-btn is-cmd" data-cmd="B" ${won || dead || outOfSteps ? "disabled" : ""}>指令 B</button>
            <button type="button" class="dojo-btn is-cmd" data-cmd="C" ${won || dead || outOfSteps ? "disabled" : ""}>指令 C</button>
            <button type="button" class="dojo-btn is-ghost" id="fsmUndo" ${history.length <= 1 ? "disabled" : ""}>↩ 單步悔棋</button>
            <button type="button" class="dojo-btn is-ghost" id="fsmReset">🔄 重置</button>
          </div>
          <div class="dojo-trace">
            <b>轉移歷程：</b>${history.map((h, i) => i === 0 ? "<code>S0</code>" : ` → <code>${esc(h.node)}</code>`).join("")}
          </div>
        </div>
      `;

      ctx.body.querySelectorAll("[data-cmd]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const next = stepFsm(history[history.length - 1], btn.dataset.cmd);
          if (next) {
            history.push(next);
            render();
          }
        });
      });
      ctx.body.querySelector("#fsmUndo").addEventListener("click", () => {
        if (history.length > 1) {
          history.pop();
          render();
        }
      });
      ctx.body.querySelector("#fsmReset").addEventListener("click", () => {
        history.splice(1);
        render();
      });
    };

    render();
  }

  /* ========================================================================
   * 關卡 2：多約束 DAG 排程賽 (Topological Sort & 2-CPU Limit)
   * ======================================================================== */
  const DAG_TASKS = [
    { id: "T1", name: "基礎映像建置", dur: 2, deps: [], x: 65, y: 120 },
    { id: "T2", name: "主資料庫遷移", dur: 4, deps: ["T1"], x: 190, y: 48 },
    { id: "T3", name: "CDN 資源編譯", dur: 1, deps: ["T1"], x: 190, y: 120 },
    { id: "T4", name: "日誌管線啟動", dur: 2, deps: ["T1"], x: 190, y: 192 },
    { id: "T5", name: "微服務核心部署", dur: 3, deps: ["T2"], x: 330, y: 48 },
    { id: "T6", name: "安全憑證簽發", dur: 3, deps: ["T3"], x: 330, y: 145 },
    { id: "T7", name: "整合壓測校驗", dur: 1, deps: ["T4", "T5"], x: 455, y: 86 },
    { id: "T8", name: "藍綠切換上線", dur: 2, deps: ["T6", "T7"], x: 555, y: 120 }
  ];
  const DAG_MAP = Object.fromEntries(DAG_TASKS.map((t) => [t.id, t]));

  function mountDagLevel(ctx) {
    // schedule item: { id, core: 1|2, start, end }
    let schedule = [];
    let greedyHint = "";
    let solvedNotified = false;

    const getScheduledMap = () => Object.fromEntries(schedule.map((s) => [s.id, s]));
    const getCoreEnd = (core) => schedule.filter((s) => s.core === core).reduce((m, s) => Math.max(m, s.end), 0);
    const getMakespan = () => schedule.reduce((m, s) => Math.max(m, s.end), 0);

    const scheduleTask = (taskId, core) => {
      const task = DAG_MAP[taskId];
      const map = getScheduledMap();
      if (!task || map[taskId]) return;
      if (!task.deps.every((d) => Boolean(map[d]))) return;
      const depsEnd = task.deps.reduce((m, d) => Math.max(m, map[d].end), 0);
      const start = Math.max(getCoreEnd(core), depsEnd);
      schedule.push({ id: taskId, core, start, end: start + task.dur });
      greedyHint = "";
    };

    const unscheduleCascade = (taskId) => {
      const toRemove = new Set([taskId]);
      let changed = true;
      while (changed) {
        changed = false;
        DAG_TASKS.forEach((t) => {
          if (!toRemove.has(t.id) && t.deps.some((d) => toRemove.has(d))) {
            toRemove.add(t.id);
            changed = true;
          }
        });
      }
      schedule = schedule.filter((s) => !toRemove.has(s.id));
      greedyHint = "";
    };

    const runSjfTrap = () => {
      schedule = [];
      const done = {};
      const coreFree = { 1: 0, 2: 0 };
      const remaining = new Set(DAG_TASKS.map((t) => t.id));
      let tNow = 0;
      while (remaining.size > 0 && tNow < 50) {
        [1, 2].forEach((c) => {
          if (coreFree[c] <= tNow) {
            // mark finished
            schedule.forEach((s) => { if (s.end <= tNow) done[s.id] = s.end; });
          }
        });
        schedule.forEach((s) => { if (s.end <= tNow) done[s.id] = s.end; });
        const freeCores = [1, 2].filter((c) => coreFree[c] <= tNow);
        if (freeCores.length > 0) {
          const ready = DAG_TASKS
            .filter((tk) => remaining.has(tk.id) && tk.deps.every((d) => done[d] !== undefined))
            .sort((a, b) => a.dur - b.dur || a.id.localeCompare(b.id));
          freeCores.forEach((c) => {
            if (ready.length === 0) return;
            const pick = ready.shift();
            remaining.delete(pick.id);
            schedule.push({ id: pick.id, core: c, start: tNow, end: tNow + pick.dur });
            coreFree[c] = tNow + pick.dur;
          });
        }
        const nextTimes = [coreFree[1], coreFree[2]].filter((ft) => ft > tNow);
        if (nextTimes.length === 0) break;
        tNow = Math.min(...nextTimes);
      }
      greedyHint = "⚠️ 短任務優先貪婪法 (SJF) 把短的 T3(1m)、T4(2m) 先塞滿雙核，導致關鍵路徑 T2(4m)→T5(3m)→T7(1m)→T8(2m) 被推遲，總完工時間高達 14 分鐘超時！";
    };

    const render = () => {
      const sMap = getScheduledMap();
      const makespan = getMakespan();
      const allDone = schedule.length === DAG_TASKS.length;
      const won = allDone && makespan <= 12;

      if (won && !solvedNotified) {
        solvedNotified = true;
        ctx.pass();
      }

      const dagEdges = [];
      DAG_TASKS.forEach((t) => {
        t.deps.forEach((d) => {
          const src = DAG_MAP[d];
          const bothDone = Boolean(sMap[d] && sMap[t.id]);
          dagEdges.push(`<line x1="${src.x + 22}" y1="${src.y}" x2="${t.x - 24}" y2="${t.y}" stroke="${bothDone ? "#34d399" : "rgba(148,163,184,0.5)"}" stroke-width="${bothDone ? 2.4 : 1.6}" marker-end="url(#dag-arr)" />`);
        });
      });

      const dagNodes = DAG_TASKS.map((t) => {
        const sc = sMap[t.id];
        const ready = !sc && t.deps.every((d) => Boolean(sMap[d]));
        const fill = sc ? "#065f46" : (ready ? "#1e3a8a" : "#1e293b");
        const stroke = sc ? "#34d399" : (ready ? "#38bdf8" : "#64748b");
        return `
          <g>
            <rect x="${t.x - 24}" y="${t.y - 18}" width="48" height="36" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2" />
            <text x="${t.x}" y="${t.y - 2}" text-anchor="middle" fill="#f8fafc" font-size="11" font-weight="900">${t.id}</text>
            <text x="${t.x}" y="${t.y + 11}" text-anchor="middle" fill="#fde68a" font-size="9.5" font-weight="700">${t.dur}m</text>
          </g>
        `;
      }).join("");

      const maxScale = Math.max(14, makespan);
      const renderTrack = (core) => {
        const items = schedule.filter((s) => s.core === core);
        return items.map((s) => {
          const tk = DAG_MAP[s.id];
          const left = (s.start / maxScale) * 100;
          const width = ((s.end - s.start) / maxScale) * 100;
          return `<button type="button" class="dojo-gantt-block" data-unsched="${s.id}" style="left:${left}%;width:${width}%" title="點擊移除 ${s.id} 及其後續依賴">
            <b>${s.id}</b><small>${s.start}~${s.end}m</small>
          </button>`;
        }).join("");
      };

      const taskCards = DAG_TASKS.map((t) => {
        const sc = sMap[t.id];
        const ready = !sc && t.deps.every((d) => Boolean(sMap[d]));
        return `
          <div class="dojo-dag-card ${sc ? "is-done" : (ready ? "is-ready" : "is-locked")}">
            <div class="dojo-dag-top">
              <b>${t.id} · ${esc(t.name)}</b>
              <span class="dojo-pill">${t.dur} 分</span>
            </div>
            <div class="dojo-dag-deps">前置：${t.deps.length ? t.deps.join(", ") : "無"}</div>
            <div class="dojo-dag-actions">
              ${sc
                ? `<button type="button" class="dojo-mini-btn warn" data-unsched="${t.id}">✔ Core ${sc.core} (${sc.start}-${sc.end}m) · 取消</button>`
                : `<button type="button" class="dojo-mini-btn" data-add="${t.id}" data-core="1" ${ready ? "" : "disabled"}>+ Core 1</button>
                   <button type="button" class="dojo-mini-btn" data-add="${t.id}" data-core="2" ${ready ? "" : "disabled"}>+ Core 2</button>`
              }
            </div>
          </div>
        `;
      }).join("");

      ctx.body.innerHTML = `
        <div class="dojo-stage-shell">
          <div class="dojo-brief">
            <b>🎯 通關條件：</b>遵守所有前置依賴箭頭且同時最多雙核並行（Core 1 / Core 2），將 8 項部署任務在<b>總時間 &le; 12 分鐘</b>內全部排程完成！提示：別被「短任務優先」騙了，找出最長的<b>關鍵路徑 (Critical Path)</b>！
          </div>
          <div class="dojo-fsm-hud">
            <div class="dojo-meter ${won ? "is-ok" : (allDone ? "is-bad" : "")}">總完工時間：<b>${makespan}</b> / 12 分鐘</div>
            <div class="dojo-meter">已排程：<b>${schedule.length}</b> / 8 任務</div>
            <button type="button" class="dojo-btn is-ghost" id="dagSjfTrap">🤖 試看 SJF 貪婪陷阱</button>
            <button type="button" class="dojo-btn is-ghost" id="dagUndo" ${schedule.length ? "" : "disabled"}>↩ 退回上一步</button>
            <button type="button" class="dojo-btn is-ghost" id="dagReset">🔄 重置排程</button>
          </div>
          <div class="dojo-svg-wrap">
            <svg viewBox="0 0 615 240" class="dojo-svg" role="img" aria-label="8 任務有向無環依賴圖">
              <defs>
                <marker id="dag-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" /></marker>
              </defs>
              ${dagEdges.join("")}
              ${dagNodes}
            </svg>
          </div>
          <div class="dojo-gantt">
            <div class="dojo-gantt-row">
              <span class="dojo-gantt-lbl">Core 1</span>
              <div class="dojo-gantt-track">
                <div class="dojo-gantt-limit" style="left:${(12 / maxScale) * 100}%" title="12 分鐘上限線"><span>12m</span></div>
                ${renderTrack(1)}
              </div>
            </div>
            <div class="dojo-gantt-row">
              <span class="dojo-gantt-lbl">Core 2</span>
              <div class="dojo-gantt-track">
                <div class="dojo-gantt-limit" style="left:${(12 / maxScale) * 100}%"></div>
                ${renderTrack(2)}
              </div>
            </div>
          </div>
          ${greedyHint ? `<div class="dojo-feedback is-bad">${esc(greedyHint)}</div>` : ""}
          ${allDone ? `<div class="dojo-feedback ${won ? "is-ok" : "is-bad"}">${won ? "✅ 關鍵路徑排程完美！雙核總完工時間 " + makespan + " 分鐘達標！" : "❌ 目前完工時間 " + makespan + " 分鐘超過 12 分鐘上限！請讓 T2→T5→T7→T8 關鍵路徑優先執行。"}</div>` : ""}
          <div class="dojo-dag-grid">${taskCards}</div>
        </div>
      `;

      ctx.body.querySelectorAll("[data-add]").forEach((btn) => {
        btn.addEventListener("click", () => {
          scheduleTask(btn.dataset.add, Number(btn.dataset.core));
          render();
        });
      });
      ctx.body.querySelectorAll("[data-unsched]").forEach((btn) => {
        btn.addEventListener("click", () => {
          unscheduleCascade(btn.dataset.unsched);
          render();
        });
      });
      ctx.body.querySelector("#dagSjfTrap").addEventListener("click", () => { runSjfTrap(); render(); });
      ctx.body.querySelector("#dagUndo").addEventListener("click", () => { schedule.pop(); greedyHint = ""; render(); });
      ctx.body.querySelector("#dagReset").addEventListener("click", () => { schedule = []; greedyHint = ""; render(); });
    };

    render();
  }

  /* ========================================================================
   * 關卡 3：位元遮罩邏輯逆向工程 (Bitwise & Logic Circuit)
   * ======================================================================== */
  const TARGET_INPUT = 0b11001010;  // 11001010
  const TARGET_OUTPUT = 0b10110100; // 10110100
  const SECRET_MASK1 = 0b01100111;
  const SECRET_MASK2 = 0b11110100;

  const rol2 = (byte) => (((byte & 0xff) << 2) | ((byte & 0xff) >>> 6)) & 0xff;
  const toBits = (byte) => (byte & 0xff).toString(2).padStart(8, "0");

  function evalCircuit(inputByte, mask1, mask2) {
    const step1 = (inputByte ^ mask1) & 0xff;
    const step2 = rol2(step1);
    const step3 = (step2 & mask2) & 0xff;
    return { input: inputByte & 0xff, afterXor: step1, afterRol: step2, output: step3 };
  }

  function mountBitwiseLevel(ctx) {
    let probeInput = 0b00000000;
    let userMask1 = 0b00000000;
    let userMask2 = 0b11111111;
    let probesLeft = 3;
    let probeLogs = [];
    let lastTrace = null;
    let verifyFeedback = "";
    let verifyOk = false;
    let solvedNotified = false;

    const renderBitStripSvg = (x, y, title, byteVal, accent) => {
      const bits = toBits(byteVal);
      return `
        <g>
          <text x="${x + 74}" y="${y - 8}" text-anchor="middle" fill="#cbd5e1" font-size="10.5" font-weight="800">${esc(title)} (${bits})</text>
          ${[...bits].map((b, i) => {
            const on = b === "1";
            return `<rect x="${x + i * 18.5}" y="${y}" width="16" height="22" rx="4" fill="${on ? accent : "#1e293b"}" stroke="${on ? "#fff" : "#475569"}" stroke-width="1.2" />
                    <text x="${x + i * 18.5 + 8}" y="${y + 15}" text-anchor="middle" fill="${on ? "#0f172a" : "#64748b"}" font-size="11" font-weight="900">${b}</text>`;
          }).join("")}
        </g>
      `;
    };

    const renderSwitchRow = (role, val) => {
      const bits = toBits(val);
      return [...bits].map((b, i) => {
        const bitPos = 7 - i;
        return `<button type="button" class="dojo-bit-btn ${b === "1" ? "is-on" : ""}" data-role="${role}" data-bit="${bitPos}" aria-pressed="${b === "1"}">${b}<small>b${bitPos}</small></button>`;
      }).join("");
    };

    const render = () => {
      if (verifyOk && !solvedNotified) {
        solvedNotified = true;
        ctx.pass();
      }
      const trace = lastTrace || { input: 0, afterXor: 0, afterRol: 0, output: 0, mode: "idle" };
      const modeLabel = trace.mode === "probe" ? "🔍 參考晶片探針量測波形" : (trace.mode === "verify" ? "🧪 自設開關目標輸出波形" : "⏸️ 等待發送探針或燒錄驗證");

      ctx.body.innerHTML = `
        <div class="dojo-stage-shell">
          <div class="dojo-brief">
            <b>🎯 通關條件：</b>最多可發送 <b>3 次</b>自訂 8-bit 探針至參考加密電路，觀察各級線路亮滅，推導出 <code>Mask1</code> 與 <code>Mask2</code> 位元開關，使目標輸入 <code>11001010</code> 通過 <code>XOR Mask1 → ROL 2 → AND Mask2</code> 後精準輸出 <code>10110100</code>！
          </div>
          <div class="dojo-fsm-hud">
            <div class="dojo-meter">目標輸入：<code>11001010</code></div>
            <div class="dojo-meter">目標輸出：<code>10110100</code></div>
            <div class="dojo-meter ${probesLeft === 0 ? "is-bad" : ""}">探針剩餘：<b>${probesLeft}</b> / 3 次</div>
            <button type="button" class="dojo-btn is-ghost" id="bitReset">🔄 重置探針與開關</button>
          </div>
          <div class="dojo-svg-wrap">
            <svg viewBox="0 0 640 245" class="dojo-svg" role="img" aria-label="8-bit 三級邏輯電路圖">
              <text x="320" y="18" text-anchor="middle" fill="#7dd3fc" font-size="11.5" font-weight="800">${esc(modeLabel)}</text>
              ${renderBitStripSvg(20, 44, "① 輸入 Byte", trace.input, "#38bdf8")}
              <path d="M 176 55 L 228 55" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#bit-arr)" />
              <rect x="234" y="34" width="120" height="42" rx="8" fill="#1e293b" stroke="#fbbf24" stroke-width="2" />
              <text x="294" y="53" text-anchor="middle" fill="#fde68a" font-size="11.5" font-weight="900">XOR Mask1</text>
              <text x="294" y="68" text-anchor="middle" fill="#94a3b8" font-size="9.5">${trace.mode === "probe" ? "(未知內部遮罩)" : toBits(userMask1)}</text>
              <path d="M 358 55 L 435 55" stroke="#fbbf24" stroke-width="2.5" marker-end="url(#bit-arr)" />
              ${renderBitStripSvg(445, 44, "② XOR 後線路", trace.afterXor, "#fbbf24")}

              <path d="M 518 72 L 518 112 L 100 112 L 100 132" fill="none" stroke="#a78bfa" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#bit-arr)" />

              ${renderBitStripSvg(20, 148, "③ ROL 2 左旋後", trace.afterRol, "#c084fc")}
              <path d="M 176 159 L 228 159" stroke="#c084fc" stroke-width="2.5" marker-end="url(#bit-arr)" />
              <rect x="234" y="138" width="120" height="42" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="2" />
              <text x="294" y="157" text-anchor="middle" fill="#6ee7b7" font-size="11.5" font-weight="900">AND Mask2</text>
              <text x="294" y="172" text-anchor="middle" fill="#94a3b8" font-size="9.5">${trace.mode === "probe" ? "(未知內部遮罩)" : toBits(userMask2)}</text>
              <path d="M 358 159 L 435 159" stroke="#34d399" stroke-width="2.5" marker-end="url(#bit-arr)" />
              ${renderBitStripSvg(445, 148, "④ 輸出 Byte", trace.output, "#34d399")}

              <rect x="175" y="196" width="290" height="36" rx="10" fill="rgba(15,23,42,0.85)" stroke="#334155" />
              <text x="320" y="218" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="700">ROL 2 規則：最高 2 位元 (b7,b6) 循環移至最低位 (b1,b0)</text>
              <defs>
                <marker id="bit-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" /></marker>
              </defs>
            </svg>
          </div>

          <div class="dojo-bit-panels">
            <div class="dojo-bit-box">
              <div class="dojo-bit-head">
                <b>🔍 探針發射器 (Input Probe)</b>
                <code>${toBits(probeInput)}</code>
              </div>
              <div class="dojo-bit-row">${renderSwitchRow("probe", probeInput)}</div>
              <button type="button" class="dojo-btn is-cmd" id="bitSendProbe" ${probesLeft <= 0 ? "disabled" : ""}>⚡ 發送 8-bit 探針 (${probesLeft} 次可用)</button>
            </div>
            <div class="dojo-bit-box">
              <div class="dojo-bit-head"><b>🎛️ 逆向推導設定：Mask1 (XOR)</b><code>${toBits(userMask1)}</code></div>
              <div class="dojo-bit-row">${renderSwitchRow("m1", userMask1)}</div>
              <div class="dojo-bit-head" style="margin-top:8px;"><b>🎛️ 逆向推導設定：Mask2 (AND)</b><code>${toBits(userMask2)}</code></div>
              <div class="dojo-bit-row">${renderSwitchRow("m2", userMask2)}</div>
              <button type="button" class="dojo-btn is-accent" id="bitVerifyTarget" style="margin-top:10px;">🚀 送出目標輸入 11001010 燒錄驗證</button>
            </div>
          </div>

          ${verifyFeedback ? `<div class="dojo-feedback ${verifyOk ? "is-ok" : "is-bad"}">${esc(verifyFeedback)}</div>` : ""}
          ${probeLogs.length > 0 ? `
            <div class="dojo-trace">
              <b>探針歷史紀錄：</b>
              <div class="dojo-probe-list">
                ${probeLogs.map((l, i) => `<div>#${i + 1} IN:<code>${toBits(l.input)}</code> → XOR:<code>${toBits(l.afterXor)}</code> → ROL2:<code>${toBits(l.afterRol)}</code> → OUT:<code>${toBits(l.output)}</code></div>`).join("")}
              </div>
            </div>
          ` : ""}
        </div>
      `;

      ctx.body.querySelectorAll(".dojo-bit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bit = Number(btn.dataset.bit);
          const role = btn.dataset.role;
          if (role === "probe") probeInput ^= (1 << bit);
          else if (role === "m1") userMask1 ^= (1 << bit);
          else if (role === "m2") userMask2 ^= (1 << bit);
          render();
        });
      });
      ctx.body.querySelector("#bitSendProbe").addEventListener("click", () => {
        if (probesLeft <= 0) return;
        probesLeft--;
        const res = evalCircuit(probeInput, SECRET_MASK1, SECRET_MASK2);
        lastTrace = { ...res, mode: "probe" };
        probeLogs.push(res);
        verifyFeedback = "";
        render();
      });
      ctx.body.querySelector("#bitVerifyTarget").addEventListener("click", () => {
        const res = evalCircuit(TARGET_INPUT, userMask1, userMask2);
        lastTrace = { ...res, mode: "verify" };
        if (res.output === TARGET_OUTPUT) {
          verifyOk = true;
          verifyFeedback = `✅ 邏輯電路逆向成功！目標輸入 11001010 精準輸出 ${toBits(res.output)}！`;
        } else {
          verifyOk = false;
          verifyFeedback = `❌ 目標輸入 11001010 目前輸出為 ${toBits(res.output)}，尚未等於目標 ${toBits(TARGET_OUTPUT)}。提示：試著用探針輸入 00000000 解讀 Mask1，再想辦法讓 ROL2 變成全 1 觀察 Mask2！`;
        }
        render();
      });
      ctx.body.querySelector("#bitReset").addEventListener("click", () => {
        probeInput = 0;
        userMask1 = 0;
        userMask2 = 0b11111111;
        probesLeft = 3;
        probeLogs = [];
        lastTrace = null;
        verifyFeedback = "";
        verifyOk = false;
        render();
      });
    };

    render();
  }

  /* ========================================================================
   * 關卡 4：遞迴回溯與堆疊剪枝 (Recursion Call Stack & Pruning)
   * ======================================================================== */
  const MAZE_ROWS = 6;
  const MAZE_COLS = 6;
  // 0: open, 1: wall, 2: start, 3: goal, 4: dead-end trap marker (walkable dead-end cell)
  const MAZE_GRID = [
    [2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 3]
  ];
  // 單向門：只能從 (2,2) 向下進入 (3,2)，不可從 (3,2) 向上回到 (2,2)；同時封鎖從 (2,1)->(3,1) 以外之捷徑
  // 強制唯一最短 10 步通道經過單向門 (2,2)->(3,2)
  const ONE_WAY_DOORS = {
    "2,2->3,2": "⬇ 單向門",
    "3,2->2,2": "BLOCKED"
  };
  const DIR_META = {
    U: { dr: -1, dc: 0, label: "上 (U)", icon: "⬆️" },
    D: { dr: 1, dc: 0, label: "下 (D)", icon: "⬇️" },
    L: { dr: 0, dc: -1, label: "左 (L)", icon: "⬅️" },
    R: { dr: 0, dc: 1, label: "右 (R)", icon: "➡️" }
  };

  function simulateMazeDfs({ dirs, useVisited, useManhattan }) {
    const MAX_FRAMES_HARD = 18;
    const MAX_EVENTS = 160;
    const BOUND_LIMIT = 11; // 最短路徑 10 步 = 11 層堆疊；steps + manhattan <= 11
    const events = [];
    const visited = new Set();
    let maxDepth = 0;
    let found = false;
    let overflow = false;
    let solutionPath = null;

    const manhattan = (r, c) => Math.abs(5 - r) + Math.abs(5 - c);

    function dfs(r, c, depth, path) {
      if (found || overflow || events.length >= MAX_EVENTS) return;
      if (depth > MAX_FRAMES_HARD) {
        overflow = true;
        events.push({ type: "overflow", r, c, depth, stack: path.slice(), note: `💥 Stack Overflow！遞迴超過安全層數（無窮繞圈）` });
        return;
      }
      if (depth > maxDepth) maxDepth = depth;
      const curPath = [...path, [r, c]];
      events.push({ type: "push", r, c, depth, stack: curPath, note: `PUSH dfs(${r},${c}) [深度 ${depth}]` });

      if (r === 5 && c === 5) {
        found = true;
        solutionPath = curPath;
        events.push({ type: "goal", r, c, depth, stack: curPath, note: `🎯 抵達終點 (5,5)！最大深度 ${maxDepth} 層` });
        return;
      }

      if (useVisited) visited.add(`${r},${c}`);

      for (let i = 0; i < dirs.length; i++) {
        if (found || overflow || events.length >= MAX_EVENTS) break;
        const d = dirs[i];
        const nr = r + DIR_META[d].dr;
        const nc = c + DIR_META[d].dc;
        if (nr < 0 || nr >= MAZE_ROWS || nc < 0 || nc >= MAZE_COLS) continue;
        if (MAZE_GRID[nr][nc] === 1) continue;
        if (ONE_WAY_DOORS[`${r},${c}->${nr},${nc}`] === "BLOCKED") continue;
        if (!useVisited && path.length > 0 && path.some(([pr, pc]) => pr === nr && pc === nc) && depth > 14) {
          // still allow loop until hard overflow
        }
        if (useVisited && visited.has(`${nr},${nc}`)) continue;

        const nextSteps = depth; // current steps = depth - 1, next steps = depth
        const fCost = nextSteps + manhattan(nr, nc);
        if (useManhattan && fCost > BOUND_LIMIT) {
          events.push({ type: "prune", r: nr, c: nc, depth: depth + 1, stack: curPath, note: `✂️ 剪枝 (${nr},${nc})：步數 ${nextSteps} + 曼哈頓 ${manhattan(nr, nc)} = ${fCost} > ${BOUND_LIMIT}` });
          continue;
        }
        dfs(nr, nc, depth + 1, curPath);
      }

      if (!found && !overflow) {
        events.push({ type: "pop", r, c, depth, stack: path.slice(), note: `POP 回溯退出 (${r},${c})` });
      }
    }

    dfs(0, 0, 1, []);
    const success = found && !overflow && maxDepth <= 12;
    return { events, maxDepth, found, overflow, success, solutionPath };
  }

  function mountRecursionLevel(ctx) {
    let dirs = ["U", "R", "L", "D"]; // 預設會先往右邊大空區深潛繞路
    let useVisited = false;
    let useManhattan = false;
    let animTimer = null;
    let curEventIdx = -1;
    let simResult = null;
    let solvedNotified = false;

    const stopAnim = () => {
      if (animTimer) { clearInterval(animTimer); animTimer = null; }
    };

    const render = () => {
      const ev = simResult && curEventIdx >= 0 ? simResult.events[curEventIdx] : null;
      const activeStack = ev ? ev.stack : [[0, 0]];
      const stackSet = new Set(activeStack.map(([r, c]) => `${r},${c}`));
      const finishedAnim = simResult && curEventIdx >= simResult.events.length - 1;
      const passedNow = Boolean(finishedAnim && simResult.success);

      if (passedNow && !solvedNotified) {
        solvedNotified = true;
        ctx.pass();
      }

      const cellsHtml = [];
      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          const val = MAZE_GRID[r][c];
          const isCur = ev && ev.r === r && ev.c === c && ev.type !== "prune";
          const isPruned = ev && ev.type === "prune" && ev.r === r && ev.c === c;
          const inStack = stackSet.has(`${r},${c}`);
          const isDoor = r === 2 && c === 2;
          let cls = "dojo-maze-cell";
          if (val === 1) cls += " is-wall";
          else if (val === 2) cls += " is-start";
          else if (val === 3) cls += " is-goal";
          if (inStack) cls += " is-stack";
          if (isCur) cls += " is-head";
          if (isPruned) cls += " is-pruned";
          const txt = val === 1 ? "🧱" : (val === 2 ? "S" : (val === 3 ? "🏁" : (isDoor ? "⬇" : "")));
          cellsHtml.push(`<div class="${cls}" title="(${r},${c})${isDoor ? " 單向門：僅可向下進入 (3,2)" : ""}">${txt}<small>${r},${c}</small></div>`);
        }
      }

      const stackFramesHtml = activeStack.slice().reverse().map((pos, idx) => {
        const depthNum = activeStack.length - idx;
        return `<div class="dojo-stack-frame ${idx === 0 ? "is-top" : ""}">
          <span>#${depthNum}</span>
          <code>dfs(${pos[0]}, ${pos[1]})</code>
          <small>h=${Math.abs(5 - pos[0]) + Math.abs(5 - pos[1])}</small>
        </div>`;
      }).join("");

      const prioHtml = dirs.map((d, i) => `
        <div class="dojo-prio-chip">
          <span>${i + 1}. ${DIR_META[d].icon} ${DIR_META[d].label}</span>
          <div class="dojo-prio-arrows">
            <button type="button" data-move="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="上移優先序">▲</button>
            <button type="button" data-move="${i}" data-dir="1" ${i === dirs.length - 1 ? "disabled" : ""} aria-label="下移優先序">▼</button>
          </div>
        </div>
      `).join("");

      let resultBanner = "";
      if (finishedAnim && simResult) {
        if (simResult.success) {
          resultBanner = `<div class="dojo-feedback is-ok">✅ 遞迴搜尋成功抵達 (5,5)！最大呼叫堆疊深度 ${simResult.maxDepth} 層（&le; 12 層限制），剪枝精準有效！</div>`;
        } else if (simResult.overflow) {
          resultBanner = `<div class="dojo-feedback is-bad">💥 Stack Overflow！未開啟「已拜訪狀態雜湊去重 (Visited)」，遞迴在網格中繞圈導致堆疊爆滿！</div>`;
        } else {
          resultBanner = `<div class="dojo-feedback is-bad">⚠️ 最大堆疊深度達 ${simResult.maxDepth} 層（超過 12 層上限）！請啟用「曼哈頓距離啟發式剪枝」或調整搜尋方向優先序！</div>`;
        }
      }

      ctx.body.innerHTML = `
        <div class="dojo-stage-shell">
          <div class="dojo-brief">
            <b>🎯 通關條件：</b>調整搜尋方向優先序並設定剪枝規則，啟動遞迴搜尋從 <code>(0,0)</code> 抵達 <code>(5,5)</code>（⬇ 為單向門），且過程中<b>最大堆疊深度 &le; 12 層</b>！
          </div>
          <div class="dojo-rec-controls">
            <div class="dojo-rec-panel">
              <b>🧭 搜尋方向優先序</b>
              <div class="dojo-prio-list">${prioHtml}</div>
            </div>
            <div class="dojo-rec-panel">
              <b>✂️ 剪枝規則設定</b>
              <label class="dojo-chk"><input type="checkbox" id="recVisited" ${useVisited ? "checked" : ""} /> 啟用「已拜訪狀態雜湊去重」(Visited Set)</label>
              <label class="dojo-chk"><input type="checkbox" id="recManhattan" ${useManhattan ? "checked" : ""} /> 啟用「曼哈頓距離啟發式上限剪枝」(steps + h &le; 11)</label>
              <div class="dojo-ctrl-row" style="margin-top:8px;">
                <button type="button" class="dojo-btn is-accent" id="recRunBtn">▶ 啟動遞迴搜尋</button>
                <button type="button" class="dojo-btn is-ghost" id="recResetBtn">🔄 重置</button>
              </div>
            </div>
          </div>
          ${resultBanner}
          <div class="dojo-rec-split">
            <div class="dojo-maze-wrap">
              <div class="dojo-maze-head">
                <b>🗺️ 6×6 迷宮網格</b>
                <span>(2,2)⬇(3,2) 單向門</span>
              </div>
              <div class="dojo-maze-grid">${cellsHtml.join("")}</div>
            </div>
            <div class="dojo-stack-wrap">
              <div class="dojo-maze-head">
                <b>📚 Call Stack 即時堆疊</b>
                <span>深度：<b>${activeStack.length}</b> (上限 12 · 最大 ${simResult ? simResult.maxDepth : 1})</span>
              </div>
              <div class="dojo-stack-list" data-scrollable="true">${stackFramesHtml}</div>
              <div class="dojo-stack-note">${ev ? esc(ev.note) : "等待點擊「啟動遞迴搜尋」…"}</div>
            </div>
          </div>
        </div>
      `;

      const stackList = ctx.body.querySelector(".dojo-stack-list");
      if (stackList) {
        stackList.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
        stackList.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });
      }

      ctx.body.querySelectorAll("[data-move]").forEach((btn) => {
        btn.addEventListener("click", () => {
          stopAnim();
          const i = Number(btn.dataset.move);
          const delta = Number(btn.dataset.dir);
          const j = i + delta;
          if (j >= 0 && j < dirs.length) {
            const copy = dirs.slice();
            [copy[i], copy[j]] = [copy[j], copy[i]];
            dirs = copy;
            simResult = null;
            curEventIdx = -1;
            render();
          }
        });
      });
      ctx.body.querySelector("#recVisited").addEventListener("change", (e) => {
        stopAnim();
        useVisited = e.target.checked;
        simResult = null;
        curEventIdx = -1;
        render();
      });
      ctx.body.querySelector("#recManhattan").addEventListener("change", (e) => {
        stopAnim();
        useManhattan = e.target.checked;
        simResult = null;
        curEventIdx = -1;
        render();
      });
      ctx.body.querySelector("#recRunBtn").addEventListener("click", () => {
        stopAnim();
        simResult = simulateMazeDfs({ dirs, useVisited, useManhattan });
        curEventIdx = 0;
        render();
        animTimer = setInterval(() => {
          if (curEventIdx < simResult.events.length - 1) {
            curEventIdx++;
            render();
          } else {
            stopAnim();
          }
        }, 120);
      });
      ctx.body.querySelector("#recResetBtn").addEventListener("click", () => {
        stopAnim();
        simResult = null;
        curEventIdx = -1;
        render();
      });
    };

    render();
    return () => stopAnim();
  }

  /* ========================================================================
   * 共用道場掛載器
   * ======================================================================== */
  let activeDispose = null;

  function unmount() {
    if (typeof activeDispose === "function") {
      try { activeDispose(); } catch {}
      activeDispose = null;
    }
  }

  function mount(container, opts = {}) {
    unmount();
    if (!container) return;
    let activeId = opts.initialLevel || DOJO_LEVELS[0].id;
    let levelCleanup = null;

    const cleanupLevel = () => {
      if (typeof levelCleanup === "function") {
        try { levelCleanup(); } catch {}
        levelCleanup = null;
      }
    };
    activeDispose = cleanupLevel;

    const renderShell = () => {
      cleanupLevel();
      const demoMode = isTeacherDemoMode();
      const passedCount = DOJO_LEVELS.filter((l) => isCompleted(l.id)).length;
      const allPassed = passedCount === DOJO_LEVELS.length;
      const curLv = DOJO_LEVELS.find((l) => l.id === activeId) || DOJO_LEVELS[0];

      const getCoinTagText = (lvId) => {
        if (demoMode) {
          return isCompleted(lvId) ? "✔ 演示已通關（不寫入成績）" : "👨‍🏫 教師演示模式（自由體驗）";
        }
        return isCompleted(lvId)
          ? (isTokenRewarded(lvId) ? "✔ 已通關 · +30 ⭐ 已入帳" : "✔ 已通關（鎖定角色前無星幣）")
          : (isAvatarLocked() ? "⭐ 過關獎勵 +30" : "🔒 鎖定角色後過關可得 +30 ⭐");
      };

      container.innerHTML = `
        <div class="dojo-wrap" data-scrollable="true">
          <div class="dojo-header">
            <div>
              <h3>🧠 運算思維互動道場（4 大高難度演算法盤面）</h3>
              <p>純狀態機與圖論實戰盤面 · 每關首次通關發放 <b>+30 ⭐ 探索星幣</b> · 4 關全通關解鎖稱號 <b>「⚡ 演算法宗師」</b></p>
            </div>
            <div class="dojo-master-pill ${allPassed ? "is-done" : ""}">
              ${allPassed ? (demoMode ? "⚡ 演示全通關 (4/4)" : "⚡ 已獲稱號：演算法宗師") : `進度：${passedCount} / 4 關`}
            </div>
          </div>
          <div class="dojo-tabs" role="tablist">
            ${DOJO_LEVELS.map((lv, idx) => {
              const done = isCompleted(lv.id);
              const cur = lv.id === curLv.id;
              return `<button type="button" class="dojo-tab ${cur ? "is-cur" : ""} ${done ? "is-done" : ""}" data-lv="${lv.id}" role="tab" aria-selected="${cur}">
                <span class="dt-num">${done ? "✔" : idx + 1}</span>
                <span class="dt-lbl">${lv.icon} ${esc(lv.short)}</span>
              </button>`;
            }).join("")}
          </div>
          <div class="dojo-board-head">
            <div>
              <span class="dojo-badge">${esc(curLv.badge)}</span>
              <h4>${curLv.icon} ${esc(curLv.title)}</h4>
            </div>
            <span class="dojo-coin-tag ${isCompleted(curLv.id) ? "is-done" : ""}">
              ${getCoinTagText(curLv.id)}
            </span>
          </div>
          <div id="dojoBoardBody" class="dojo-board-body"></div>
        </div>
      `;

      container.querySelectorAll(".dojo-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeId = btn.dataset.lv;
          renderShell();
        });
      });

      const boardBody = container.querySelector("#dojoBoardBody");
      const ctx = {
        body: boardBody,
        pass: () => {
          completeDojoLevel(curLv.id, curLv.title, () => {
            const curDemo = isTeacherDemoMode();
            const pCount = DOJO_LEVELS.filter((l) => isCompleted(l.id)).length;
            const pill = container.querySelector(".dojo-master-pill");
            if (pill) {
              pill.classList.toggle("is-done", pCount === DOJO_LEVELS.length);
              pill.textContent = pCount === DOJO_LEVELS.length
                ? (curDemo ? "⚡ 演示全通關 (4/4)" : "⚡ 已獲稱號：演算法宗師")
                : `進度：${pCount} / 4 關`;
            }
            const tag = container.querySelector(".dojo-coin-tag");
            if (tag) {
              tag.classList.add("is-done");
              tag.textContent = curDemo
                ? "✔ 演示已通關（不寫入成績）"
                : (isTokenRewarded(curLv.id) ? "✔ 已通關 · +30 ⭐ 已入帳" : "✔ 已通關（鎖定角色前無星幣）");
            }
            const tabBtn = container.querySelector(`.dojo-tab[data-lv="${curLv.id}"]`);
            if (tabBtn) {
              tabBtn.classList.add("is-done");
              const numEl = tabBtn.querySelector(".dt-num");
              if (numEl) numEl.textContent = "✔";
            }
            if (typeof opts.onProgress === "function") opts.onProgress();
          });
        }
      };

      if (curLv.id === "dojo:fsm") levelCleanup = mountFsmLevel(ctx);
      else if (curLv.id === "dojo:dag") levelCleanup = mountDagLevel(ctx);
      else if (curLv.id === "dojo:bitwise") levelCleanup = mountBitwiseLevel(ctx);
      else if (curLv.id === "dojo:recursion") levelCleanup = mountRecursionLevel(ctx);
    };

    renderShell();
  }

  window.ComputationalDojo = {
    LEVELS: DOJO_LEVELS,
    mount,
    unmount,
    isCompleted,
    isTeacherDemoMode,
    getDemoTokens,
    stepFsm,
    evalCircuit,
    simulateMazeDfs,
    DAG_TASKS
  };
})();
