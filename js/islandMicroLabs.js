/* ==========================================================================
 * 七大主題島嶼【延伸探索】高深度微實作互動實驗室模組
 * --------------------------------------------------------------------------
 * - 純前端輕量化 DOM / SVG / Canvas 2D 狀態機（零 3D 物件、零 PointLight）
 * - 支援島嶼 ID 別名映射：
 *   sys/hardware, citizen/security, create/creation, code/programming,
 *   algo/algorithm, data, ai
 * - 完成全部關卡自動頒發「🔬 微實作大師徽章」與 +20 ⭐ 探索星幣（即時互通更衣室）
 * - 嚴禁使用 alert() / confirm() / prompt() 與標楷體
 * ========================================================================== */
(() => {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ID_ALIAS = {
    sys: "sys", hardware: "sys", hw: "sys",
    citizen: "citizen", security: "citizen", sec: "citizen",
    create: "create", creation: "create", creative: "create",
    code: "code", programming: "code", prog: "code",
    algo: "algo", algorithm: "algo", alg: "algo",
    data: "data",
    ai: "ai"
  };

  function resolveIslandId(id) {
    return ID_ALIAS[String(id || "").trim().toLowerCase()] || "";
  }

  function getProfile() {
    return (window.Store && window.Store.profile) || null;
  }

  function stageStorageKey() {
    const p = getProfile();
    return p ? `ii:microlab:stages:${p.cls}-${p.seat}-${p.name}` : "ii:microlab:stages:guest";
  }

  function readStageProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(stageStorageKey()) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }

  function saveStageProgress(islandId, maxStage) {
    const cid = resolveIslandId(islandId);
    if (!cid) return;
    const prog = readStageProgress();
    prog[cid] = Math.max(Number(prog[cid]) || 0, maxStage);
    try { localStorage.setItem(stageStorageKey(), JSON.stringify(prog)); } catch (e) { console.warn(e); }
  }

  function isLabCompleted(id) {
    const cid = resolveIslandId(id);
    if (!cid) return false;
    if (window.AvatarSystem && typeof window.AvatarSystem.isMicroLabCompleted === "function") {
      return window.AvatarSystem.isMicroLabCompleted(cid);
    }
    try {
      const arr = JSON.parse(localStorage.getItem("ii:microlab:guest") || "[]");
      return Array.isArray(arr) && arr.includes(cid);
    } catch { return false; }
  }

  function getCompletedIslands() {
    if (window.AvatarSystem && typeof window.AvatarSystem.getCompletedMicroLabs === "function") {
      return window.AvatarSystem.getCompletedMicroLabs();
    }
    try {
      const arr = JSON.parse(localStorage.getItem("ii:microlab:guest") || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function notify(msg, type = "info", ms = 3000) {
    if (window.AvatarSystem && typeof window.AvatarSystem.toast === "function") {
      window.AvatarSystem.toast(msg, type, ms);
    }
  }

  function isAvatarLocked() {
    return Boolean(window.AvatarSystem && typeof window.AvatarSystem.isAvatarLocked === "function" && window.AvatarSystem.isAvatarLocked());
  }

  function isLabRewarded(id) {
    const cid = resolveIslandId(id);
    if (!cid) return false;
    if (window.AvatarSystem && typeof window.AvatarSystem.isMicroLabRewarded === "function") {
      return window.AvatarSystem.isMicroLabRewarded(cid);
    }
    return false;
  }

  function awardLabCompletion(islandId, labTitle) {
    const cid = resolveIslandId(islandId);
    if (!cid) return { ok: false, gained: 0 };
    if (window.AvatarSystem && typeof window.AvatarSystem.completeMicroLab === "function") {
      const res = window.AvatarSystem.completeMicroLab(cid);
      if (res && res.gained > 0) {
        notify(`🎉 完成「${labTitle}」！獲得 🔬 微實作大師徽章 與 +${res.gained} ⭐ 探索星幣！`, "coin", 4200);
        if (typeof window.confetti === "function") {
          try {
            window.confetti({ particleCount: 75, spread: 72, origin: { y: 0.58 }, colors: ["#ffd166", "#34d399", "#38bdf8", "#f472b6"] });
          } catch {}
        }
      } else if (res && res.lockedRequired && !res.already) {
        notify(`🎉 完成「${labTitle}」！已獲得 🔬 微實作大師徽章（🔒 尚未鎖定專屬角色，星幣維持 0）`, "info", 4200);
      }
      return res;
    }
    return { ok: true, gained: 0 };
  }

  /* ========================================================================
   * 1. 電腦探險島 (sys / hardware)
   *    《CPU × RAM × SSD 資源排程與斷電生存模擬台》
   * ======================================================================== */
  const LAB_SYS = {
    id: "sys",
    islandName: "電腦探險島",
    emoji: "🖥️",
    accent: "#4fb3ff",
    title: "《CPU × RAM × SSD 資源排程與斷電生存模擬台》",
    objective: "驗證 RAM 揮發性與 SSD 非揮發性差異，並排程大型程式避免記憶體爆量導致虛擬記憶體置換（Disk Thrashing）。",
    stages: [
      { title: "第 1 關｜揮發性 vs. 非揮發性斷電生存戰", subtitle: "將軟體載入 RAM，測試未存檔與存檔寫入 SSD 後遭遇突發斷電的差異" },
      { title: "第 2 關｜記憶體瓶頸與虛擬記憶體置換排程", subtitle: "在 8192 MB 上限下安排 4 項大型任務開啟與釋放順序，避開 CPU 降速 80%" }
    ],
    mountStage(stageIdx, ctx) {
      const MAX_RAM = 8192;
      if (stageIdx === 0) {
        const APPS = {
          model3d: { id: "model3d", name: "3D 建模軟體", icon: "🎨", ram: 3500, file: "島嶼模型_v2.blend", color: "#38bdf8" },
          essay: { id: "essay", name: "論文報告", icon: "📝", ram: 800, file: "專題論文_定稿.docx", color: "#a78bfa" }
        };
        const st = {
          inRam: {}, // id -> { dirty: boolean, savedToSsd: boolean }
          ssdSaved: {}, // id -> { savedAt: string }
          powerOut: false,
          lostMsg: "",
          loadingId: ""
        };

        const render = () => {
          const ramEntries = Object.keys(st.inRam);
          const usedRam = st.powerOut ? 0 : ramEntries.reduce((s, id) => s + APPS[id].ram, 0);
          const pct = Math.round((usedRam / MAX_RAM) * 100);
          const hasDirty = !st.powerOut && ramEntries.some((id) => st.inRam[id].dirty);
          const bothSavedInSsd = Boolean(st.ssdSaved.model3d && st.ssdSaved.essay);
          const passed = st.powerOut && bothSavedInSsd && !st.lostMsg;

          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 關卡任務：</b>先將 <b>3D 建模軟體 (3500MB)</b> 與 <b>論文報告 (800MB)</b> 載入 RAM，再點擊「💾 寫入 SSD 存檔」後觸發「⚡ 模擬突發斷電」安全存活（也可以先直接斷電觀察 RAM 資料清空！）。
            </div>
            <div class="mlab-grid-2">
              <div class="mlab-panel">
                <div class="mlab-panel-title">📂 待開啟程式（從 SSD 載入 RAM）</div>
                <div class="mlab-stack">
                  ${Object.values(APPS).map((a) => {
                    const loaded = !st.powerOut && Boolean(st.inRam[a.id]);
                    const isDirty = loaded && st.inRam[a.id].dirty;
                    const isSaved = Boolean(st.ssdSaved[a.id]);
                    return `<div class="mlab-task-row">
                      <div>
                        <b>${a.icon} ${a.name}</b>
                        <div class="mlab-meta">需求記憶體：<code>${a.ram} MB</code> · 目標檔：${esc(a.file)}</div>
                        <div class="mlab-badges-inline">
                          ${loaded ? `<span class="mlab-pill ${isDirty ? "warn" : "ok"}">${isDirty ? "⚡ RAM 中未存檔" : "✅ RAM 與 SSD 同步"}</span>` : `<span class="mlab-pill">未載入 RAM</span>`}
                          ${isSaved ? `<span class="mlab-pill ok">💾 SSD 已存檔</span>` : ""}
                        </div>
                      </div>
                      <button type="button" class="mlab-btn ${loaded ? "is-ghost" : "is-primary"}" data-open="${a.id}" ${loaded || st.powerOut ? "disabled" : ""}>
                        ${st.loadingId === a.id ? "載入中…" : loaded ? "已開啟" : "▶ 開啟載入"}
                      </button>
                    </div>`;
                  }).join("")}
                </div>
                <div class="mlab-btn-row">
                  <button type="button" class="mlab-btn is-accent" id="sysSaveSsd" ${!hasDirty || st.powerOut ? "disabled" : ""}>💾 寫入 SSD 存檔 (Ctrl+S)</button>
                  ${st.powerOut
                    ? `<button type="button" class="mlab-btn is-primary" id="sysReboot">🔌 重新通電開機</button>`
                    : `<button type="button" class="mlab-btn is-danger" id="sysPowerOut" ${ramEntries.length === 0 ? "disabled" : ""}>⚡ 模擬突發斷電</button>`
                  }
                </div>
              </div>

              <div class="mlab-panel">
                <div class="mlab-panel-title">⚡ RAM 主記憶體（揮發性 · 上限 ${MAX_RAM} MB）</div>
                <div class="mlab-ram-meter ${st.powerOut ? "is-blackout" : ""}">
                  <div class="mlab-ram-head">
                    <span>已使用：<b>${usedRam} / ${MAX_RAM} MB</b> (${pct}%)</span>
                    <span class="mlab-pill ${st.powerOut ? "danger" : "info"}">${st.powerOut ? "⚡ 斷電歸零！" : "供電正常"}</span>
                  </div>
                  <div class="mlab-ram-track">
                    ${st.powerOut ? "" : ramEntries.map((id) => {
                      const a = APPS[id];
                      const w = ((a.ram / MAX_RAM) * 100).toFixed(2);
                      return `<div class="mlab-ram-seg" style="width:${w}%;background:${a.color}" title="${a.name} (${a.ram} MB)">
                        <span>${a.icon} ${a.ram}MB</span>
                      </div>`;
                    }).join("")}
                  </div>
                </div>
                ${st.lostMsg ? `<div class="mlab-alert is-danger">${esc(st.lostMsg)}</div>` : ""}
                ${passed ? `<div class="mlab-alert is-ok">⚡ 突發斷電驗證成功！RAM 內暫存瞬間清空歸零，但已寫入 SSD 的 2 份檔案完整保留，毫髮無傷！</div>` : ""}

                <div class="mlab-panel-title" style="margin-top:12px">💾 SSD 固態硬碟（非揮發性 · 永久儲存）</div>
                <div class="mlab-ssd-grid">
                  <div class="mlab-ssd-item is-system"><span>⚙️ OS 系統核心</span><small>常駐保留</small></div>
                  ${Object.values(APPS).map((a) => {
                    const saved = st.ssdSaved[a.id];
                    return `<div class="mlab-ssd-item ${saved ? "is-saved" : "is-empty"}">
                      <span>${a.icon} ${esc(a.file)}</span>
                      <small>${saved ? `✅ 已寫入 SSD (${saved.savedAt})` : "⏳ 尚未存檔寫入"}</small>
                    </div>`;
                  }).join("")}
                </div>
              </div>
            </div>
          `;

          ctx.body.querySelectorAll("[data-open]").forEach((btn) => {
            btn.addEventListener("click", () => {
              const id = btn.dataset.open;
              if (st.powerOut || st.inRam[id]) return;
              st.loadingId = id;
              st.lostMsg = "";
              render();
              ctx.setTimeout(() => {
                st.loadingId = "";
                st.inRam[id] = { dirty: true };
                render();
              }, 260);
            });
          });

          const saveBtn = ctx.body.querySelector("#sysSaveSsd");
          if (saveBtn) {
            saveBtn.addEventListener("click", () => {
              const now = new Date().toLocaleTimeString("zh-TW", { hour12: false });
              Object.keys(st.inRam).forEach((id) => {
                st.inRam[id].dirty = false;
                st.ssdSaved[id] = { savedAt: now };
              });
              notify("💾 已寫入 SSD 非揮發性硬碟保存！", "ok", 2000);
              render();
            });
          }

          const outBtn = ctx.body.querySelector("#sysPowerOut");
          if (outBtn) {
            outBtn.addEventListener("click", () => {
              const lost = Object.keys(st.inRam).filter((id) => st.inRam[id].dirty).map((id) => APPS[id].name);
              st.powerOut = true;
              st.inRam = {};
              if (lost.length > 0) {
                st.lostMsg = `💥 斷電發生！RAM 中未按 Ctrl+S 存檔的「${lost.join("、")}」瞬間消失歸零！請重新開機並先存檔寫入 SSD 再測試。`;
                notify("💥 未寫入 SSD 的 RAM 資料在斷電時消失了！", "warn", 3200);
              } else if (!bothSavedInSsd) {
                st.lostMsg = "⚠️ 尚有軟體未開啟並存檔寫入 SSD！請重新開機，把「3D 建模軟體」與「論文報告」都載入並存檔至 SSD 後再斷電驗證。";
              } else {
                st.lostMsg = "";
                ctx.passStage("已驗證 RAM 斷電歸零與 SSD 斷電保留特性！");
              }
              render();
            });
          }

          const rebootBtn = ctx.body.querySelector("#sysReboot");
          if (rebootBtn) {
            rebootBtn.addEventListener("click", () => {
              st.powerOut = false;
              st.lostMsg = "";
              render();
            });
          }
        };
        render();
        return;
      }

      // 第 2 關：記憶體瓶頸與虛擬記憶體置換排程
      const TASKS = [
        { id: "render", name: "4K 影片算圖", icon: "🎬", ram: 3600, duration: 4.5, color: "#38bdf8" },
        { id: "train", name: "AI 模型訓練", icon: "🧠", ram: 4200, duration: 5.0, color: "#f472b6" },
        { id: "engine", name: "遊戲引擎編譯", icon: "🎮", ram: 3800, duration: 4.5, color: "#fbbf24" },
        { id: "bigdata", name: "大數據統計分析", icon: "📊", ram: 3200, duration: 4.0, color: "#34d399" }
      ];
      const TIME_LIMIT = 22.0;
      const st = {
        started: false,
        timeLeft: TIME_LIMIT,
        failed: false,
        cleared: false,
        swapFaults: 0,
        items: Object.fromEntries(TASKS.map((t) => [t.id, { state: "queued", progress: 0 }]))
        // state: 'queued' | 'open' | 'done_open' | 'closed'
      };

      let timerId = null;

      const calcUsedRam = () =>
        TASKS.reduce((sum, t) => {
          const s = st.items[t.id].state;
          return sum + (s === "open" || s === "done_open" ? t.ram : 0);
        }, 0);

      const updateDomFast = () => {
        const usedRam = calcUsedRam();
        const isThrashing = usedRam > MAX_RAM;
        const cpuSpeed = isThrashing ? 20 : 100;
        const ramText = ctx.body.querySelector("#sys2RamText");
        const ramFillWrap = ctx.body.querySelector("#sys2RamBar");
        const cpuBadge = ctx.body.querySelector("#sys2CpuState");
        const timerEl = ctx.body.querySelector("#sys2Timer");
        const swapEl = ctx.body.querySelector("#sys2SwapCount");

        if (ramText) ramText.innerHTML = `已佔用：<b>${usedRam} / ${MAX_RAM} MB</b> (${Math.round((usedRam / MAX_RAM) * 100)}%)`;
        if (cpuBadge) {
          cpuBadge.className = `mlab-cpu-card ${isThrashing ? "is-thrashing" : "is-normal"}`;
          cpuBadge.innerHTML = isThrashing
            ? `<b>⚠️ 虛擬記憶體頻繁置換 (Disk Thrashing)！</b><span>CPU 處理速度驟降 80%（僅剩 ${cpuSpeed}% 效能）</span>`
            : `<b>⚡ CPU 效能：${cpuSpeed}% 全速運算中</b><span>記憶體餘裕充足，無虛擬記憶體置換延遲</span>`;
        }
        if (timerEl) {
          timerEl.textContent = `${Math.max(0, st.timeLeft).toFixed(1)} 秒`;
          timerEl.classList.toggle("is-low", st.timeLeft <= 6 && !st.cleared);
        }
        if (swapEl) swapEl.textContent = `${st.swapFaults} 次分頁置換`;
        if (ramFillWrap) {
          ramFillWrap.classList.toggle("is-over", isThrashing);
          ramFillWrap.innerHTML = TASKS.filter((t) => st.items[t.id].state === "open" || st.items[t.id].state === "done_open")
            .map((t) => {
              const denom = Math.max(MAX_RAM, usedRam);
              const w = ((t.ram / denom) * 100).toFixed(2);
              const done = st.items[t.id].state === "done_open";
              return `<div class="mlab-ram-seg ${done ? "is-done" : ""}" style="width:${w}%;background:${t.color}">
                <span>${t.icon} ${t.ram}MB${done ? " ✔" : ""}</span>
              </div>`;
            }).join("");
        }

        TASKS.forEach((t) => {
          const progBar = ctx.body.querySelector(`[data-prog="${t.id}"]`);
          const progTxt = ctx.body.querySelector(`[data-progt="${t.id}"]`);
          const it = st.items[t.id];
          const pct = Math.min(100, Math.round((it.progress / t.duration) * 100));
          if (progBar) progBar.style.width = `${pct}%`;
          if (progTxt) progTxt.textContent = `${it.progress.toFixed(1)}s / ${t.duration.toFixed(1)}s (${pct}%)`;
        });
      };

      const renderFull = () => {
        const usedRam = calcUsedRam();
        const isThrashing = usedRam > MAX_RAM;
        ctx.body.innerHTML = `
          <div class="mlab-guide-box">
            <b>🎯 排程任務：</b>開啟並完成全部 4 項大型程式（倒數 <b>${TIME_LIMIT} 秒</b>）。任一時刻 RAM 超過 <b>8192 MB</b> 將觸發「虛擬記憶體頻繁置換」使 CPU 降速 80%！請善用「開啟 ➔ 完畢 ➔ 關閉釋放 RAM」排程。
          </div>
          <div class="mlab-status-strip">
            <div class="mlab-stat-chip">⏱️ 剩餘時間：<b id="sys2Timer">${st.timeLeft.toFixed(1)} 秒</b></div>
            <div class="mlab-stat-chip">🔁 置換計數：<b id="sys2SwapCount">${st.swapFaults} 次分頁置換</b></div>
            <div class="mlab-stat-chip">🏁 完成進度：<b>${TASKS.filter((t) => st.items[t.id].state === "done_open" || st.items[t.id].state === "closed").length} / 4</b></div>
          </div>

          <div class="mlab-ram-meter">
            <div class="mlab-ram-head">
              <span id="sys2RamText">已佔用：<b>${usedRam} / ${MAX_RAM} MB</b></span>
              <span class="mlab-meta">提示：可同時開 2 個總和 ≤ 8192 MB 的程式加速！</span>
            </div>
            <div class="mlab-ram-track" id="sys2RamBar"></div>
          </div>

          <div class="mlab-cpu-card ${isThrashing ? "is-thrashing" : "is-normal"}" id="sys2CpuState"></div>

          ${st.failed ? `<div class="mlab-alert is-danger">⏱️ 倒數結束！部分程式來不及完成（可能曾觸發虛擬記憶體置換拖慢 CPU）。請點擊上方「重置本關」重新規劃排程！</div>` : ""}
          ${st.cleared ? `<div class="mlab-alert is-ok">🎉 排程大成功！你在記憶體限制內高效率完成了所有運算任務，完全避開了 Disk Thrashing 瓶頸！</div>` : ""}

          <div class="mlab-tasks-grid">
            ${TASKS.map((t) => {
              const it = st.items[t.id];
              const pct = Math.min(100, Math.round((it.progress / t.duration) * 100));
              let btnHtml = "";
              if (it.state === "queued") {
                btnHtml = `<button type="button" class="mlab-btn is-primary" data-act="open" data-id="${t.id}" ${st.failed || st.cleared ? "disabled" : ""}>▶ 開啟載入 RAM</button>`;
              } else if (it.state === "open") {
                btnHtml = `<button type="button" class="mlab-btn is-warn" data-act="close" data-id="${t.id}" ${st.failed || st.cleared ? "disabled" : ""}>⏹ 中止釋放 RAM</button>`;
              } else if (it.state === "done_open") {
                btnHtml = `<button type="button" class="mlab-btn is-accent mlab-pulse" data-act="close" data-id="${t.id}" ${st.failed || st.cleared ? "disabled" : ""}>✖ 關閉釋放 RAM</button>`;
              } else {
                btnHtml = `<span class="mlab-pill ok">✅ 已完畢並釋放</span>`;
              }
              return `<div class="mlab-task-card is-${it.state}">
                <div class="mlab-task-top">
                  <b>${t.icon} ${t.name}</b>
                  <code style="color:${t.color}">${t.ram} MB</code>
                </div>
                <div class="mlab-prog-bar"><i data-prog="${t.id}" style="width:${pct}%;background:${t.color}"></i></div>
                <div class="mlab-task-foot">
                  <small data-progt="${t.id}">${it.progress.toFixed(1)}s / ${t.duration.toFixed(1)}s (${pct}%)</small>
                  ${btnHtml}
                </div>
              </div>`;
            }).join("")}
          </div>
        `;
        updateDomFast();

        ctx.body.querySelectorAll("[data-act]").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (st.failed || st.cleared) return;
            const id = btn.dataset.id;
            const act = btn.dataset.act;
            const it = st.items[id];
            if (act === "open" && it.state === "queued") {
              it.state = "open";
              if (!st.started) {
                st.started = true;
                startLoop();
              }
              renderFull();
            } else if (act === "close") {
              if (it.state === "done_open") {
                it.state = "closed";
              } else if (it.state === "open") {
                it.state = "queued";
                it.progress = 0;
              }
              renderFull();
            }
          });
        });
      };

      const startLoop = () => {
        if (timerId) return;
        let lastTs = Date.now();
        timerId = ctx.setInterval(() => {
          if (!st.started || st.failed || st.cleared) return;
          const now = Date.now();
          const dt = Math.min(0.25, Math.max(0.05, (now - lastTs) / 1000));
          lastTs = now;
          const usedRam = calcUsedRam();
          const isThrashing = usedRam > MAX_RAM;
          if (isThrashing) st.swapFaults += 1;
          const workDt = isThrashing ? dt * 0.2 : dt;
          let newlyFinished = false;
          TASKS.forEach((t) => {
            const it = st.items[t.id];
            if (it.state === "open") {
              it.progress = Math.min(t.duration, it.progress + workDt);
              if (it.progress >= t.duration) {
                it.state = "done_open";
                newlyFinished = true;
              }
            }
          });
          st.timeLeft = Math.max(0, st.timeLeft - dt);
          const allDone = TASKS.every((t) => st.items[t.id].state === "done_open" || st.items[t.id].state === "closed");
          if (allDone) {
            st.cleared = true;
            ctx.clearInterval(timerId);
            timerId = null;
            renderFull();
            ctx.passStage("成功排程全部 4 項任務，完美避開虛擬記憶體置換瓶頸！", true);
            return;
          }
          if (st.timeLeft <= 0) {
            st.failed = true;
            ctx.clearInterval(timerId);
            timerId = null;
            renderFull();
            return;
          }
          if (newlyFinished) renderFull();
          else updateDomFast();
        }, 100);
      };

      renderFull();
    }
  };

  /* ========================================================================
   * 2. 網路資安島 (citizen / security)
   *    《資安鑑識官：憑證檢驗、封包嗅探與 2FA 攻防台》
   * ======================================================================== */
  const LAB_CITIZEN = {
    id: "citizen",
    islandName: "數位公民島",
    emoji: "🛡️",
    accent: "#ff8a65",
    title: "《資安鑑識官：憑證檢驗、封包嗅探與 2FA 攻防台》",
    objective: "破除 HTTPS 鎖頭迷思、學會選擇 HTTPS＋加鹽雜湊防竊聽，並正確應對社交工程與 2FA 攻擊。",
    stages: [
      { title: "第 1 關｜打破「有鎖頭就安全」迷思", subtitle: "檢驗同形異義字偽裝網域、SSL 憑證組織與帳密封包偷渡流向（找出 3 處破綻）" },
      { title: "第 2 關｜傳輸加密與密碼儲存鑑識", subtitle: "搭配即時網路封包嗅探器，選出讓駭客無法還原密碼的安全組合" },
      { title: "第 3 關｜社交工程與二階段驗證決策", subtitle: "面對陌生裝置登入警報與索取驗證碼簡訊，做出正確的資安處置" }
    ],
    mountStage(stageIdx, ctx) {
      if (stageIdx === 0) {
        const st = {
          sslOpen: false,
          packetTraced: false,
          found: { domain: false, org: false, flow: false }
        };
        const render = () => {
          const count = Object.values(st.found).filter(Boolean).length;
          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 鑑識任務：</b>這封「校園雲端硬碟容量升級通知」網址列有綠色鎖頭，但暗藏釣魚陷阱！請在下方模擬瀏覽器中<b>檢查網址、點擊鎖頭展開憑證、點擊送出測試追蹤帳密封包</b>，找出全部 <b>3 處破綻</b>（目前已查明 <b>${count}/3</b>）。
            </div>

            <div class="mlab-browser">
              <div class="mlab-browser-bar">
                <button type="button" class="mlab-lock-btn ${st.sslOpen ? "is-open" : ""}" id="secLockBtn" title="點擊檢視 SSL 憑證詳情">
                  🔒 憑證詳情
                </button>
                <button type="button" class="mlab-url-box ${st.found.domain ? "is-flagged" : ""}" id="secDomainBtn" title="點擊檢查可疑網域拼字">
                  <span>https://</span><mark>drive-g00gle-tw.com</mark><span>/upgrade-login</span>
                  <small>${st.found.domain ? "✅ 已標記：同形字偽裝" : "🔍 點擊鑑識網址"}</small>
                </button>
              </div>

              ${st.sslOpen ? `
                <div class="mlab-ssl-panel">
                  <div class="mlab-ssl-row"><span>頒發對象 (CN)：</span><code>drive-g00gle-tw.com</code></div>
                  <div class="mlab-ssl-row"><span>頒發組織 (O)：</span><code class="is-warn">Unknown Offshore Hosting Ltd.（非官方 Google LLC）</code></div>
                  <div class="mlab-ssl-row"><span>簽發機構：</span><code>Let's Encrypt DV（僅驗證網址持有，不驗證品牌真偽）</code></div>
                  <div class="mlab-btn-row" style="margin-top:6px">
                    <button type="button" class="mlab-btn ${st.found.org ? "is-ok" : "is-warn"}" id="secFlagOrg">
                      ${st.found.org ? "✅ 已破案：綠色鎖頭只保證傳輸加密，不代表網站合法" : "🚨 標記破綻：組織非官方單位（有鎖頭仍可能是詐騙）"}
                    </button>
                  </div>
                </div>
              ` : ""}

              <div class="mlab-browser-body">
                <div class="mlab-phish-card">
                  <h4>☁️ 校園雲端硬碟 免費升級 1TB 通知</h4>
                  <p>親愛的同學，請立即重新驗證您的學號帳號與密碼以領取免費容量！</p>
                  <div class="mlab-phish-fields">
                    <input type="text" readonly value="stu802@school.edu.tw" aria-label="模擬帳號" />
                    <input type="password" readonly value="SecretPass#123" aria-label="模擬密碼" />
                    <button type="button" class="mlab-btn is-primary" id="secFakeSubmit">🚀 模擬點擊登入（追蹤封包流向）</button>
                  </div>
                </div>

                <div class="mlab-trace-box">
                  <div class="mlab-panel-title">📡 帳密封包流向追蹤圖</div>
                  <svg viewBox="0 0 380 128" class="mlab-svg" role="img" aria-label="帳密封包流向追蹤動畫">
                    <rect x="10" y="42" width="84" height="44" rx="10" fill="#1e3a5f" stroke="#7dd3fc" stroke-width="1.5"/>
                    <text x="52" y="62" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">🧑‍💻 學生瀏覽器</text>
                    <text x="52" y="77" text-anchor="middle" fill="#93c5fd" font-size="9">帳密表單</text>

                    <rect x="260" y="10" width="110" height="42" rx="10" fill="#0f2942" stroke="#4ade80" stroke-width="1.2" opacity="0.55"/>
                    <text x="315" y="29" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700">☁️ 官方 Google</text>
                    <text x="315" y="43" text-anchor="middle" fill="#94a3b8" font-size="9">google.com（未抵達）</text>

                    <rect x="260" y="74" width="110" height="44" rx="10" fill="#450a0a" stroke="#fb7185" stroke-width="1.8"/>
                    <text x="315" y="94" text-anchor="middle" fill="#fecaca" font-size="10" font-weight="800">🏴‍☠️ 駭客伺服器</text>
                    <text x="315" y="109" text-anchor="middle" fill="#fda4af" font-size="9">185.220.xx.xx</text>

                    <path d="M94,58 L256,31" stroke="#4ade80" stroke-dasharray="4 4" stroke-width="1.5" opacity="0.35"/>
                    <text x="178" y="38" text-anchor="middle" fill="#f87171" font-size="13" font-weight="900">✕</text>
                    <path id="secLeakPath" d="M94,68 Q175,92 256,96" fill="none" stroke="${st.packetTraced ? "#fb7185" : "#475569"}" stroke-width="2.5" stroke-dasharray="${st.packetTraced ? "6 4" : "3 3"}" class="${st.packetTraced ? "mlab-dash-anim" : ""}"/>
                    ${st.packetTraced ? `<circle r="5" fill="#fde047"><animateMotion dur="1.3s" repeatCount="indefinite" path="M94,68 Q175,92 256,96" /></circle>` : ""}
                  </svg>
                  ${st.packetTraced ? `
                    <div class="mlab-alert is-danger" style="margin-top:6px">
                      ⚠️ 追蹤警報：輸入的帳號密碼繞過官方主機，直接飛往境外駭客伺服器！
                    </div>
                    <button type="button" class="mlab-btn ${st.found.flow ? "is-ok" : "is-warn"}" id="secFlagFlow" style="margin-top:6px;width:100%">
                      ${st.found.flow ? "✅ 已標記破綻：表單偷渡帳密至駭客主機" : "🚨 標記破綻 3：表單流向駭客主機"}
                    </button>
                  ` : `<div class="mlab-meta">點擊左側「模擬點擊登入」以觸發封包流向追蹤動畫</div>`}
                </div>
              </div>
            </div>

            <div class="mlab-clue-bar">
              <span class="mlab-pill ${st.found.domain ? "ok" : ""}">1. 網域拼字 g00gle ${st.found.domain ? "✔" : "○"}</span>
              <span class="mlab-pill ${st.found.org ? "ok" : ""}">2. SSL 憑證組織不符 ${st.found.org ? "✔" : "○"}</span>
              <span class="mlab-pill ${st.found.flow ? "ok" : ""}">3. 封包流向駭客伺服器 ${st.found.flow ? "✔" : "○"}</span>
            </div>
          `;

          ctx.body.querySelector("#secLockBtn").addEventListener("click", () => { st.sslOpen = !st.sslOpen; render(); });
          ctx.body.querySelector("#secDomainBtn").addEventListener("click", () => {
            st.found.domain = true;
            notify("🔍 破綻 1 確認！g00gle 用數字 0 冒充字母 o（同形異義字攻擊）", "ok", 2600);
            checkDone();
          });
          const flagOrg = ctx.body.querySelector("#secFlagOrg");
          if (flagOrg) flagOrg.addEventListener("click", () => {
            st.found.org = true;
            notify("🔍 破綻 2 確認！綠色鎖頭只代表通訊加密，憑證組織並非官方！", "ok", 2600);
            checkDone();
          });
          ctx.body.querySelector("#secFakeSubmit").addEventListener("click", () => {
            st.packetTraced = true;
            render();
          });
          const flagFlow = ctx.body.querySelector("#secFlagFlow");
          if (flagFlow) flagFlow.addEventListener("click", () => {
            st.found.flow = true;
            notify("🔍 破綻 3 確認！帳密封包被導向外部駭客主機！", "ok", 2600);
            checkDone();
          });
        };
        const checkDone = () => {
          render();
          if (st.found.domain && st.found.org && st.found.flow) {
            ctx.passStage("成功找出釣魚網站全部 3 處破綻，打破「有鎖頭就安全」迷思！");
          }
        };
        render();
        return;
      }

      if (stageIdx === 1) {
        const st = { proto: "http", hash: "plain", tested: false };
        const render = () => {
          const safeProto = st.proto === "https";
          const safeHash = st.hash === "sha256_salt";
          const packetText = safeProto
            ? "TLSv1.3 Application Data [e9 4b 82 1f c3 a0 97 5e 02 d8 41 7b ...]"
            : "POST /login HTTP/1.1\nBody: user=alex_801&password=Star#9527";
          const dbDump = st.hash === "plain"
            ? `{ user: "alex_801", password: "Star#9527" }`
            : st.hash === "md5"
              ? `{ user: "alex_801", md5: "8d3a7f2b91c4e015..." } ➔ 彩虹表 0.02s 破解："Star#9527"`
              : `{ user: "alex_801", salt: "k9$m2", sha256: "e7b49c1a6d83f4..." } ➔ 彩虹表反查失敗！`;

          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 鑑識任務：</b>為網站登入系統選擇正確的「網路傳輸協定」與「資料庫密碼儲存機制」，並點擊「📡 發送測試封包」，驗證右側嗅探器與外洩測試皆無法還原原始密碼。
            </div>
            <div class="mlab-grid-2">
              <div class="mlab-panel">
                <div class="mlab-panel-title">⚙️ 系統安全架構設定</div>
                <div class="mlab-field">
                  <label>1. 網路傳輸協定：</label>
                  <div class="mlab-seg-btns">
                    <button type="button" class="mlab-seg ${st.proto === "http" ? "active" : ""}" data-proto="http">HTTP (明文傳輸)</button>
                    <button type="button" class="mlab-seg ${st.proto === "https" ? "active" : ""}" data-proto="https">HTTPS (TLS 加密)</button>
                  </div>
                </div>
                <div class="mlab-field">
                  <label>2. 資料庫密碼儲存方式：</label>
                  <div class="mlab-stack">
                    <button type="button" class="mlab-choice ${st.hash === "plain" ? "active" : ""}" data-hash="plain">📄 明文儲存 (Plaintext)</button>
                    <button type="button" class="mlab-choice ${st.hash === "md5" ? "active" : ""}" data-hash="md5">🔓 MD5 (無鹽弱雜湊)</button>
                    <button type="button" class="mlab-choice ${st.hash === "sha256_salt" ? "active" : ""}" data-hash="sha256_salt">🛡️ SHA-256 + 隨機鹽值 (Salted Hash)</button>
                  </div>
                </div>
                <button type="button" class="mlab-btn is-primary" id="secSendPacket" style="width:100%;margin-top:8px">📡 發送測試登入封包 (Star#9527)</button>
              </div>

              <div class="mlab-panel">
                <div class="mlab-panel-title">🕵️ 即時網路封包嗅探器 (Packet Sniffer)</div>
                ${st.tested ? `
                  <pre class="mlab-code-out ${safeProto ? "is-ok" : "is-danger"}">${esc(packetText)}</pre>
                  <div class="mlab-meta">${safeProto ? "✅ 傳輸層已加密，公共 Wi-Fi 監聽者只看到亂碼！" : "❌ 危險！HTTP 封包可直接被嗅探器讀出帳號密碼！"}</div>
                  <div class="mlab-panel-title" style="margin-top:10px">🗄️ 資料庫外洩模擬（彩虹表破解測試）</div>
                  <pre class="mlab-code-out ${safeHash ? "is-ok" : "is-danger"}">${esc(dbDump)}</pre>
                  <div class="mlab-meta">${safeHash ? "✅ 單向雜湊加上隨機鹽值 (Salt)，就算資料庫被拖庫也無法反查原密碼！" : st.hash === "md5" ? "⚠️ 無鹽 MD5 仍會被預先算好的彩虹表秒速反查出原始密碼！" : "❌ 明文儲存讓駭客直接拿走所有使用者的密碼！"}</div>
                ` : `<div class="mlab-empty-box">尚未發送封包，請設定左側選項後點擊「📡 發送測試登入封包」。</div>`}
              </div>
            </div>
          `;
          ctx.body.querySelectorAll("[data-proto]").forEach((b) => b.addEventListener("click", () => { st.proto = b.dataset.proto; st.tested = false; render(); }));
          ctx.body.querySelectorAll("[data-hash]").forEach((b) => b.addEventListener("click", () => { st.hash = b.dataset.hash; st.tested = false; render(); }));
          ctx.body.querySelector("#secSendPacket").addEventListener("click", () => {
            st.tested = true;
            render();
            if (st.proto === "https" && st.hash === "sha256_salt") {
              ctx.passStage("驗證通過：HTTPS 保護傳輸中資料，SHA-256 加鹽雜湊保護靜態資料庫！");
            } else {
              notify("⚠️ 嗅探器或彩虹表成功還原了密碼！請調整架構再試一次。", "warn", 2800);
            }
          });
        };
        render();
        return;
      }

      // 第 3 關：社交工程與 2FA 決策
      const st = { smsAct: "", defenseAct: "", checked: false };
      const render = () => {
        const ok = st.smsAct === "block" && st.defenseAct === "totp_lock";
        ctx.body.innerHTML = `
          <div class="mlab-guide-box">
            <b>🎯 緊急攻防情境：</b>你同時收到以下兩則通知，駭客正嘗試進行「社交工程竊取 OTP」接管帳號，請做出正確處置！
          </div>
          <div class="mlab-alert is-warn">🔔 <b>安全警報：</b>未知裝置（Linux · 境外 IP 91.108.xx.xx）正在嘗試登入你的雲端帳號！</div>
          <div class="mlab-alert is-danger">💬 <b>釣魚簡訊：</b>「【系統中心】偵測異常登入，請立即回覆本簡訊回傳剛收到的 <b>6 碼簡訊驗證碼</b> 以免遭停權！」</div>

          <div class="mlab-panel" style="margin-top:10px">
            <div class="mlab-field">
              <label>決策 1｜面對索取 6 碼驗證碼的簡訊，你應該怎麼做？</label>
              <div class="mlab-stack">
                <button type="button" class="mlab-choice ${st.smsAct === "reply" ? "active" : ""}" data-sms="reply">A. 趕快回傳 6 碼驗證碼，避免帳號被停權</button>
                <button type="button" class="mlab-choice ${st.smsAct === "group" ? "active" : ""}" data-sms="group">B. 把驗證碼與簡訊截圖丟到公開班群問大家</button>
                <button type="button" class="mlab-choice ${st.smsAct === "block" ? "active" : ""}" data-sms="block">C. 絕不交付驗證碼，直接封鎖該號碼並透過官方管道 / 165 查證</button>
              </div>
            </div>
            <div class="mlab-field">
              <label>決策 2｜為了徹底擋住駭客並強化雙重驗證 (2FA)，最安全的操作是？</label>
              <div class="mlab-stack">
                <button type="button" class="mlab-choice ${st.defenseAct === "ignore" ? "active" : ""}" data-def="ignore">A. 忽略警報不處理，相信原本的密碼很安全</button>
                <button type="button" class="mlab-choice ${st.defenseAct === "sms_only" ? "active" : ""}" data-def="sms_only">B. 不改密碼也不登出裝置，繼續只用簡訊 OTP</button>
                <button type="button" class="mlab-choice ${st.defenseAct === "totp_lock" ? "active" : ""}" data-def="totp_lock">C. 拒絕陌生登入、變更強密碼並登出所有裝置，且啟用「TOTP 動態驗證器 App」</button>
              </div>
            </div>
            <button type="button" class="mlab-btn is-primary" id="secEvalStage3" ${!st.smsAct || !st.defenseAct ? "disabled" : ""} style="width:100%">🛡️ 執行資安防禦處置</button>
          </div>
          ${st.checked && !ok ? `<div class="mlab-alert is-danger">💥 帳號失守！${st.smsAct === "reply" ? "一旦交出 6 碼 OTP，駭客立刻通過雙重驗證接管帳號！" : st.smsAct === "group" ? "截圖外流驗證碼仍可能被有心人攔截利用！" : "若未立即拒絕陌生裝置登入、更改密碼並升級至 TOTP 驗證器，帳號仍處於高風險！"}</div>` : ""}
        `;
        ctx.body.querySelectorAll("[data-sms]").forEach((b) => b.addEventListener("click", () => { st.smsAct = b.dataset.sms; st.checked = false; render(); }));
        ctx.body.querySelectorAll("[data-def]").forEach((b) => b.addEventListener("click", () => { st.defenseAct = b.dataset.def; st.checked = false; render(); }));
        ctx.body.querySelector("#secEvalStage3").addEventListener("click", () => {
          st.checked = true;
          render();
          if (ok) {
            ctx.passStage("成功阻擋釣魚簡訊並啟用 TOTP 驗證器保護帳號安全！", true);
          }
        });
      };
      render();
    }
  };

  /* ========================================================================
   * 3. 創作協作島 (create / creation)
   *    《數位專案總監：權限矩陣、版本救援與 CC 授權篩選》
   * ======================================================================== */
  const LAB_CREATE = {
    id: "create",
    islandName: "創作協作島",
    emoji: "🎨",
    accent: "#c58bff",
    title: "《數位專案總監：權限矩陣、版本救援與 CC 授權篩選》",
    objective: "精通雲端共編權限與保護範圍設定、版本紀錄精準還原，以及創用 CC 授權相容性判讀。",
    stages: [
      { title: "第 1 關｜雲端共用權限與保護範圍矩陣", subtitle: "為 4 種身分設定精準權限與標題保護，並執行即時游標模擬測試" },
      { title: "第 2 關｜版本紀錄 (Version History) 災難還原", subtitle: "比對時間軸差異，救回 14:00 誤刪的數據圖表同時保留 14:12 的封面標題" },
      { title: "第 3 關｜創用 CC 授權相容性篩選", subtitle: "依「校網公開＋裁切重製＋非商業教育」原則，從 6 張素材卡挑出合法素材" }
    ],
    mountStage(stageIdx, ctx) {
      if (stageIdx === 0) {
        const st = {
          teacher: "viewer",
          leader: "editor",
          lockRow1: false,
          member: "editor",
          guest: "viewer",
          disableDownload: false,
          simLogs: [],
          simRunning: false,
          activeRow: ""
        };
        const render = () => {
          const rulesValid =
            st.teacher === "editor" &&
            st.leader === "editor" &&
            st.lockRow1 === true &&
            st.member === "own_col" &&
            st.guest === "viewer" &&
            st.disableDownload === true;

          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 設定規格：</b>「全班專題分組表」需符合：<b>導師</b>可編輯全部；<b>組長</b>可編輯但<b>鎖定第 1 列標題保護範圍</b>；<b>組員</b>僅限填寫自己組別欄位；<b>校外訪客</b>僅檢視且<b>停用下載</b>。
            </div>
            <div class="mlab-grid-2">
              <div class="mlab-panel">
                <div class="mlab-panel-title">🔐 雲端權限矩陣設定</div>
                <div class="mlab-stack">
                  <div class="mlab-perm-row">
                    <span>👩‍🏫 導師</span>
                    <select id="crTeacher">
                      <option value="viewer" ${st.teacher === "viewer" ? "selected" : ""}>僅檢視</option>
                      <option value="editor" ${st.teacher === "editor" ? "selected" : ""}>可編輯全部</option>
                    </select>
                  </div>
                  <div class="mlab-perm-row is-col">
                    <div class="mlab-perm-top">
                      <span>🧭 組長</span>
                      <select id="crLeader">
                        <option value="viewer" ${st.leader === "viewer" ? "selected" : ""}>僅檢視</option>
                        <option value="editor" ${st.leader === "editor" ? "selected" : ""}>可編輯</option>
                      </select>
                    </div>
                    <label class="mlab-check"><input type="checkbox" id="crLockRow1" ${st.lockRow1 ? "checked" : ""} /> 🔒 鎖定第 1 列標題保護範圍（僅導師可改）</label>
                  </div>
                  <div class="mlab-perm-row">
                    <span>🎒 組員</span>
                    <select id="crMember">
                      <option value="viewer" ${st.member === "viewer" ? "selected" : ""}>僅檢視</option>
                      <option value="own_col" ${st.member === "own_col" ? "selected" : ""}>僅限填寫自己組別欄位</option>
                      <option value="editor" ${st.member === "editor" ? "selected" : ""}>可編輯全部</option>
                    </select>
                  </div>
                  <div class="mlab-perm-row is-col">
                    <div class="mlab-perm-top">
                      <span>🌐 校外訪客</span>
                      <select id="crGuest">
                        <option value="viewer" ${st.guest === "viewer" ? "selected" : ""}>僅檢視</option>
                        <option value="commenter" ${st.guest === "commenter" ? "selected" : ""}>可留言</option>
                        <option value="editor" ${st.guest === "editor" ? "selected" : ""}>可編輯</option>
                      </select>
                    </div>
                    <label class="mlab-check"><input type="checkbox" id="crNoDl" ${st.disableDownload ? "checked" : ""} /> 🚫 停用下載／列印／複製選項</label>
                  </div>
                </div>
                <button type="button" class="mlab-btn is-primary" id="crRunSim" ${st.simRunning ? "disabled" : ""} style="width:100%;margin-top:10px">
                  ${st.simRunning ? "⏳ 模擬游標測試中…" : "▶ 執行 4 種身分模擬測試"}
                </button>
              </div>

              <div class="mlab-panel">
                <div class="mlab-panel-title">📊 專題分組表即時操作舞台</div>
                <div class="mlab-mini-sheet">
                  <div class="mlab-sheet-r is-head ${st.activeRow === "row1" ? "is-flash" : ""}">
                    <span>第 1 列（標題）</span><span>組別 ｜ 題目 ｜ 負責人 ${st.lockRow1 ? "🔒" : ""}</span>
                  </div>
                  <div class="mlab-sheet-r ${st.activeRow === "row2" ? "is-flash" : ""}">
                    <span>第 2 列（第 1 組）</span><span>AI 垃圾分類 ｜ 林小宇</span>
                  </div>
                  <div class="mlab-sheet-r ${st.activeRow === "row3" ? "is-flash" : ""}">
                    <span>第 3 列（第 2 組）</span><span>校園資安微電影 ｜ 陳羽晴</span>
                  </div>
                  <div class="mlab-sheet-foot">
                    <span>檔案工具列：</span>
                    <span class="mlab-pill ${st.disableDownload ? "ok" : "warn"}">${st.disableDownload ? "🚫 下載已停用" : "⬇ 允許下載"}</span>
                  </div>
                </div>
                <div class="mlab-sim-log">
                  ${st.simLogs.length === 0 ? `<div class="mlab-meta">按下「▶ 執行 4 種身分模擬測試」觀察游標測試結果。</div>` : st.simLogs.map((l) => `<div class="mlab-sim-item ${l.ok ? "is-ok" : "is-err"}">${esc(l.text)}</div>`).join("")}
                </div>
              </div>
            </div>
          `;

          ctx.body.querySelector("#crTeacher").addEventListener("change", (e) => { st.teacher = e.target.value; st.simLogs = []; render(); });
          ctx.body.querySelector("#crLeader").addEventListener("change", (e) => { st.leader = e.target.value; st.simLogs = []; render(); });
          ctx.body.querySelector("#crLockRow1").addEventListener("change", (e) => { st.lockRow1 = e.target.checked; st.simLogs = []; render(); });
          ctx.body.querySelector("#crMember").addEventListener("change", (e) => { st.member = e.target.value; st.simLogs = []; render(); });
          ctx.body.querySelector("#crGuest").addEventListener("change", (e) => { st.guest = e.target.value; st.simLogs = []; render(); });
          ctx.body.querySelector("#crNoDl").addEventListener("change", (e) => { st.disableDownload = e.target.checked; st.simLogs = []; render(); });

          ctx.body.querySelector("#crRunSim").addEventListener("click", () => {
            st.simRunning = true;
            st.simLogs = [];
            const steps = [
              {
                row: "row1",
                ok: st.teacher === "editor",
                text: st.teacher === "editor"
                  ? "👩‍🏫 導師游標：順利編輯第 1 列與全部儲存格 ✅"
                  : "❌ 導師權限不足，無法調整表格結構！"
              },
              {
                row: "row1",
                ok: st.leader === "editor" && st.lockRow1,
                text: st.leader !== "editor"
                  ? "❌ 組長只有檢視權限，無法統整進度！"
                  : st.lockRow1
                    ? "🧭 組長游標：嘗試修改第 1 列標題 ➔ 🔒「受保護範圍已阻擋」！改填第 2 列成功 ✅"
                    : "⚠️ 組長游標：未鎖定第 1 列！組長不小心把標題列整個改亂了 ❌"
              },
              {
                row: "row3",
                ok: st.member === "own_col",
                text: st.member === "own_col"
                  ? "🎒 組員游標：嘗試修改他組遭阻擋 🛡️，順利填寫自己組別欄位 ✅"
                  : st.member === "editor"
                    ? "⚠️ 組員擁有「可編輯全部」，一不小心把第 2 組的資料刪光了 ❌"
                    : "❌ 組員只有檢視權限，無法填寫自己的分組資料！"
              },
              {
                row: "row2",
                ok: st.guest === "viewer" && st.disableDownload,
                text: st.guest !== "viewer"
                  ? "⚠️ 校外訪客竟然有修改或留言權限，造成資料污染風險 ❌"
                  : st.disableDownload
                    ? "🌐 校外訪客游標：嘗試編輯與下載 ➔ 🚫 雙重阻擋，名單零外洩 ✅"
                    : "⚠️ 校外訪客點了「下載 CSV」，把全班個資都存走了 ❌"
              }
            ];

            steps.forEach((step, i) => {
              ctx.setTimeout(() => {
                st.activeRow = step.row;
                st.simLogs.push(step);
                if (i === steps.length - 1) {
                  st.simRunning = false;
                  st.activeRow = "";
                  render();
                  if (rulesValid && steps.every((s) => s.ok)) {
                    ctx.passStage("4 種身分權限與保護範圍測試全數通過！");
                  } else {
                    notify("⚠️ 模擬測試發現權限漏洞，請修正左側設定後再測一次！", "warn", 3000);
                  }
                } else {
                  render();
                }
              }, (i + 1) * 480);
            });
            render();
          });
        };
        render();
        return;
      }

      if (stageIdx === 1) {
        const VERSIONS = [
          {
            time: "13:45", who: "導師", note: "建立專題模板",
            blocks: [{ txt: "📄 專題模板骨架", cls: "" }]
          },
          {
            time: "14:00", who: "組長", note: "完成核心數據圖表與分析",
            blocks: [
              { txt: "📄 專題模板骨架", cls: "" },
              { txt: "+ 📊 核心數據圖表與研究結論（完整）", cls: "add" }
            ]
          },
          {
            time: "14:05", who: "組員 A", note: "調整段落排版（發生誤刪）",
            blocks: [
              { txt: "📄 專題模板骨架", cls: "" },
              { txt: "- 📊 核心數據圖表與研究結論（被誤刪！）", cls: "del" }
            ]
          },
          {
            time: "14:12", who: "組員 B（目前版本）", note: "新增封面標題與目錄",
            blocks: [
              { txt: "+ 🎨 精美封面標題與目錄", cls: "add" },
              { txt: "📄 專題模板骨架", cls: "" },
              { txt: "⚠️ 缺少核心數據圖表", cls: "warn" }
            ]
          }
        ];
        const st = { viewing: 3, strategy: "", restored: false };
        const render = () => {
          const v = VERSIONS[st.viewing];
          const ok = st.restored && st.strategy === "merge";
          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 災難救援任務：</b>點開右側時間軸比對各版本差異，選擇正確的還原策略：救回 <b>14:00 誤刪的數據圖表</b>，同時不蓋掉 <b>14:12 新增的封面標題</b>！
            </div>
            <div class="mlab-grid-2">
              <div class="mlab-panel">
                <div class="mlab-panel-title">🕒 版本紀錄時間軸 (點擊比對差異)</div>
                <div class="mlab-stack">
                  ${VERSIONS.map((item, idx) => `
                    <button type="button" class="mlab-ver-btn ${st.viewing === idx ? "active" : ""}" data-ver="${idx}">
                      <div><b>${item.time}</b> · ${esc(item.who)}</div>
                      <small>${esc(item.note)}</small>
                    </button>
                  `).join("")}
                </div>
              </div>
              <div class="mlab-panel">
                <div class="mlab-panel-title">🔍 版本差異預覽（${v.time}）</div>
                <div class="mlab-diff-box">
                  ${(ok ? [
                    { txt: "✅ 🎨 14:12 精美封面標題與目錄（保留）", cls: "add" },
                    { txt: "✅ 📄 專題模板骨架", cls: "" },
                    { txt: "✅ 📊 14:00 核心數據圖表與研究結論（成功救回！）", cls: "add" }
                  ] : v.blocks).map((b) => `<div class="mlab-diff-line is-${b.cls || "base"}">${esc(b.txt)}</div>`).join("")}
                </div>
                <div class="mlab-field" style="margin-top:10px">
                  <label>選擇災難還原策略：</label>
                  <div class="mlab-stack">
                    <button type="button" class="mlab-choice ${st.strategy === "full1400" ? "active" : ""}" data-st="full1400">A. 直接將整份文件一鍵覆蓋還原回 14:00</button>
                    <button type="button" class="mlab-choice ${st.strategy === "full1405" ? "active" : ""}" data-st="full1405">B. 還原至 14:05 的排版調整版本</button>
                    <button type="button" class="mlab-choice ${st.strategy === "merge" ? "active" : ""}" data-st="merge">C. 從 14:00 複製救回「核心數據圖表」貼回最新版（或還原後保留 14:12 封面）</button>
                  </div>
                </div>
                <button type="button" class="mlab-btn is-primary" id="crRecoverBtn" ${!st.strategy ? "disabled" : ""} style="width:100%;margin-top:8px">⏪ 執行版本救援</button>
                ${st.restored && !ok ? `<div class="mlab-alert is-danger" style="margin-top:8px">${st.strategy === "full1400" ? "⚠️ 圖表回來了，但組員 B 在 14:12 辛苦新增的封面標題被整個覆蓋消失！" : "❌ 14:05 正是圖表被誤刪的版本，圖表並沒有回來！"}</div>` : ""}
              </div>
            </div>
          `;
          ctx.body.querySelectorAll("[data-ver]").forEach((b) => b.addEventListener("click", () => { st.viewing = Number(b.dataset.ver); render(); }));
          ctx.body.querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", () => { st.strategy = b.dataset.st; st.restored = false; render(); }));
          ctx.body.querySelector("#crRecoverBtn").addEventListener("click", () => {
            st.restored = true;
            render();
            if (st.strategy === "merge") {
              ctx.passStage("成功救回 14:00 核心數據圖表並完整保留 14:12 封面標題！");
            }
          });
        };
        render();
        return;
      }

      // 第 3 關：創用 CC 授權篩選
      const CARDS = [
        { id: "cc0", title: "校園空拍圖", license: "CC0 公眾領域貢獻", icons: "CC 0", legal: true, reason: "放棄著作權限制，可自由公開上傳與裁切重製。" },
        { id: "by", title: "向量插畫包", license: "CC BY 姓名標示", icons: "CC BY", legal: true, reason: "只要依規定標示原作者姓名，即可公開上傳與裁切改作。" },
        { id: "by_nc", title: "顯微攝影圖", license: "CC BY-NC 姓名標示-非商業性", icons: "CC BY NC", legal: true, reason: "學校教育專題屬於非商業用途，且無 ND 限制，可裁切重製！" },
        { id: "by_sa", title: "資訊圖表模板", license: "CC BY-SA 姓名標示-相同方式分享", icons: "CC BY SA", legal: true, reason: "允許裁切改作，只要成品以相同 CC BY-SA 授權分享即可合法使用。" },
        { id: "by_nd", title: "設計師海報素材", license: "CC BY-ND 姓名標示-禁止改作", icons: "CC BY ND", legal: false, reason: "陷阱！ND（No Derivatives）禁止裁切、去背與任何形式改作重製！" },
        { id: "allrights", title: "商業圖庫樣張", license: "© 保留所有權利 (All Rights Reserved)", icons: "© ARR", legal: false, reason: "受完整著作權保護，未取得書面授權不得上傳或重製。" }
      ];
      const st = { picked: new Set(), checked: false };
      const render = () => {
        const expected = CARDS.filter((c) => c.legal).map((c) => c.id);
        const isExact = expected.length === st.picked.size && expected.every((id) => st.picked.has(id));
        ctx.body.innerHTML = `
          <div class="mlab-guide-box">
            <b>🎯 授權審查條件：</b>專案規範為「<b>① 公開上傳學校官網 ＋ ② 會裁切重製圖片 ＋ ③ 非商業教育用途</b>」。請點擊勾選<b>所有合法可用</b>的素材卡（小心授權陷阱！）。
          </div>
          <div class="mlab-cc-grid">
            ${CARDS.map((c) => {
              const on = st.picked.has(c.id);
              const showHint = st.checked;
              const wrongPick = showHint && ((on && !c.legal) || (!on && c.legal));
              return `<button type="button" class="mlab-cc-card ${on ? "is-picked" : ""} ${wrongPick ? "is-wrong" : ""}" data-cc="${c.id}">
                <div class="mlab-cc-head">
                  <span class="mlab-cc-badge">${esc(c.icons)}</span>
                  <span>${on ? "☑️ 已選用" : "⬜ 未選用"}</span>
                </div>
                <b>${esc(c.title)}</b>
                <small>${esc(c.license)}</small>
                ${showHint ? `<div class="mlab-cc-why ${c.legal ? "ok" : "bad"}">${esc(c.reason)}</div>` : ""}
              </button>`;
            }).join("")}
          </div>
          <div class="mlab-btn-row" style="margin-top:10px">
            <button type="button" class="mlab-btn is-primary" id="crCheckCc" style="width:100%">🔍 提交創用 CC 合規檢查</button>
          </div>
        `;
        ctx.body.querySelectorAll("[data-cc]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.cc;
            if (st.picked.has(id)) st.picked.delete(id);
            else st.picked.add(id);
            st.checked = false;
            render();
          });
        });
        ctx.body.querySelector("#crCheckCc").addEventListener("click", () => {
          st.checked = true;
          render();
          if (isExact) {
            ctx.passStage("精準挑出 4 項合法素材並識破 ND 禁止改作陷阱！", true);
          } else {
            notify("⚠️ 篩選尚未完全正確，請查看卡片下方的授權法規解析並調整！", "warn", 3200);
          }
        });
      };
      render();
    }
  };

  /* ========================================================================
   * 4. 程式森林島 (code / programming)
   *    《程式除錯實驗室：單步追蹤表（Trace Table）與雙語修復》
   * ======================================================================== */
  const LAB_CODE = {
    id: "code",
    islandName: "程式森林島",
    emoji: "🌲",
    accent: "#5fd18b",
    title: "《程式除錯實驗室：單步追蹤表（Trace Table）與雙語修復》",
    objective: "對照 Scratch 積木與 Python 程式碼，透過 Trace Table 單步追蹤定位並修復邏輯錯誤。",
    stages: [
      { title: "第 1 關｜if / elif 順序與邊界短路 Bug", subtitle: "觀察輸入 95 分卻輸出 C 的短路現象，調整條件判斷順序並全測通過" },
      { title: "第 2 關｜迴圈累加器初始化位置錯誤", subtitle: "單步追蹤 total = 0 被反覆歸零的過程，將初始化移至迴圈外部" },
      { title: "第 3 關｜兩變數數值交換覆寫 Bug", subtitle: "觀察直接覆寫導致數值遺失，引入暫存變數 temp 完成正確交換" }
    ],
    mountStage(stageIdx, ctx) {
      if (stageIdx === 0) {
        const st = {
          testScore: 95,
          branches: [
            { cond: "score >= 70", grade: "C" },
            { cond: "score >= 80", grade: "B" },
            { cond: "score >= 90", grade: "A" }
          ],
          activeLine: -1,
          trace: [],
          output: "",
          allTestedOk: false
        };
        const isFixed = () => st.branches[0].cond === "score >= 90" && st.branches[1].cond === "score >= 80" && st.branches[2].cond === "score >= 70";
        const evalScore = (sc) => {
          for (let i = 0; i < st.branches.length; i++) {
            const threshold = Number(st.branches[i].cond.split(">=")[1]);
            if (sc >= threshold) return { hitIdx: i, grade: st.branches[i].grade };
          }
          return { hitIdx: 3, grade: "F" };
        };

        const render = () => {
          const pyLines = [
            `score = ${st.testScore}`,
            `if ${st.branches[0].cond}: grade = "${st.branches[0].grade}"`,
            `elif ${st.branches[1].cond}: grade = "${st.branches[1].grade}"`,
            `elif ${st.branches[2].cond}: grade = "${st.branches[2].grade}"`,
            `else: grade = "F"`,
            `print(grade)`
          ];
          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 除錯目標：</b>成績滿 90 為 A、滿 80 為 B、滿 70 為 C。目前程式輸入 <code>95</code> 卻輸出 <code>C</code>！請先執行測試觀察短路停留行號，再用右側上下鍵調整 <code>if / elif</code> 順序後執行全域測試。
            </div>
            <div class="mlab-toolbar">
              <span>測試輸入 score：</span>
              ${[95, 85, 72, 50].map((v) => `<button type="button" class="mlab-seg ${st.testScore === v ? "active" : ""}" data-sc="${v}">${v} 分</button>`).join("")}
              <button type="button" class="mlab-btn is-primary" id="cd1Step">▶ 單步追蹤目前輸入</button>
              <button type="button" class="mlab-btn is-accent" id="cd1TestAll">🧪 執行全域測試 (95/85/72/50)</button>
            </div>
            <div class="mlab-grid-2">
              <div class="mlab-panel">
                <div class="mlab-panel-title">🧩 Scratch 積木 ↔ Python 程式碼（可調整順序）</div>
                <div class="mlab-bilingual-list">
                  <div class="mlab-code-row ${st.activeLine === 0 ? "is-hl" : ""}">
                    <span class="mlab-ln">1</span>
                    <span class="mlab-scratch-blk is-var">設 [score] 為 (${st.testScore})</span>
                    <code>${esc(pyLines[0])}</code>
                  </div>
                  ${st.branches.map((b, i) => `
                    <div class="mlab-code-row ${st.activeLine === i + 1 ? "is-hl" : ""}">
                      <span class="mlab-ln">${i + 2}</span>
                      <span class="mlab-scratch-blk is-ctrl">${i === 0 ? "如果" : "否則如果"} &lt;${esc(b.cond)}&gt; ➔ "${b.grade}"</span>
                      <code>${esc(pyLines[i + 1])}</code>
                      <span class="mlab-order-btns">
                        <button type="button" class="mlab-mini-btn" data-mv="${i}:-1" ${i === 0 ? "disabled" : ""}>▲</button>
                        <button type="button" class="mlab-mini-btn" data-mv="${i}:1" ${i === 2 ? "disabled" : ""}>▼</button>
                      </span>
                    </div>
                  `).join("")}
                  <div class="mlab-code-row ${st.activeLine === 4 ? "is-hl" : ""}">
                    <span class="mlab-ln">5</span>
                    <span class="mlab-scratch-blk is-ctrl">否則 ➔ "F"</span>
                    <code>${esc(pyLines[4])}</code>
                  </div>
                  <div class="mlab-code-row ${st.activeLine === 5 ? "is-hl" : ""}">
                    <span class="mlab-ln">6</span>
                    <span class="mlab-scratch-blk is-look">說出 (grade)</span>
                    <code>${esc(pyLines[5])}</code>
                  </div>
                </div>
              </div>
              <div class="mlab-panel">
                <div class="mlab-panel-title">📋 變數記憶體追蹤表 (Trace Table)</div>
                <div class="mlab-table-scroll" data-scrollable="true">
                  <table class="mlab-trace-tbl">
                    <thead><tr><th>測試值</th><th>命中行號</th><th>grade</th><th>結果</th></tr></thead>
                    <tbody>
                      ${st.trace.length ? st.trace.map((r) => `<tr><td>${r.score}</td><td>第 ${r.line} 行</td><td><b>"${r.grade}"</b></td><td>${r.ok ? "✅ 正確" : `❌ 應為 "${r.exp}"`}</td></tr>`).join("") : `<tr><td colspan="4" class="mlab-muted">尚未執行追蹤</td></tr>`}
                    </tbody>
                  </table>
                </div>
                ${st.output ? `<div class="mlab-alert ${st.allTestedOk ? "is-ok" : "is-warn"}" style="margin-top:8px">${esc(st.output)}</div>` : ""}
              </div>
            </div>
          `;
          ctx.body.querySelectorAll("[data-sc]").forEach((b) => b.addEventListener("click", () => { st.testScore = Number(b.dataset.sc); st.activeLine = -1; render(); }));
          ctx.body.querySelectorAll("[data-mv]").forEach((b) => b.addEventListener("click", () => {
            const [idxStr, dirStr] = b.dataset.mv.split(":");
            const idx = Number(idxStr), dir = Number(dirStr);
            const target = idx + dir;
            if (target < 0 || target > 2) return;
            const tmp = st.branches[idx];
            st.branches[idx] = st.branches[target];
            st.branches[target] = tmp;
            st.activeLine = -1; st.trace = []; st.output = ""; st.allTestedOk = false;
            render();
          }));
          ctx.body.querySelector("#cd1Step").addEventListener("click", () => {
            const res = evalScore(st.testScore);
            const exp = st.testScore >= 90 ? "A" : st.testScore >= 80 ? "B" : st.testScore >= 70 ? "C" : "F";
            st.activeLine = res.hitIdx + 1;
            st.trace = [{ score: st.testScore, line: res.hitIdx + 2, grade: res.grade, exp, ok: res.grade === exp }];
            st.output = res.grade === exp
              ? `✅ score=${st.testScore} 命中第 ${res.hitIdx + 2} 行，輸出 "${res.grade}"！`
              : `⚠️ 短路 Bug：${st.testScore} 優先滿足第 ${res.hitIdx + 2} 行（${st.branches[res.hitIdx].cond}），直接跳出導致輸出 "${res.grade}"（預期 "${exp}"）！`;
            st.allTestedOk = false;
            render();
          });
          ctx.body.querySelector("#cd1TestAll").addEventListener("click", () => {
            const cases = [[95, "A"], [85, "B"], [72, "C"], [50, "F"]];
            st.trace = cases.map(([sc, exp]) => {
              const r = evalScore(sc);
              return { score: sc, line: r.hitIdx + 2, grade: r.grade, exp, ok: r.grade === exp };
            });
            const allOk = st.trace.every((t) => t.ok) && isFixed();
            st.allTestedOk = allOk;
            st.activeLine = 5;
            st.output = allOk
              ? "🎉 4 組邊界測試全數通過！將最嚴格條件 (>=90) 放最前面即可避免短路錯誤！"
              : "❌ 部分測試未通過，請把條件由大到小 (>=90 ➔ >=80 ➔ >=70) 排列後再測！";
            render();
            if (allOk) ctx.passStage("成功修復 if / elif 順序與邊界短路 Bug！");
          });
        };
        render();
        return;
      }

      if (stageIdx === 1) {
        const st = {
          fixedOutside: false,
          stepIdx: 0,
          iVal: null,
          totalVal: null,
          activeLine: -1,
          trace: [],
          printed: null
        };
        const buildSteps = () => {
          const steps = [];
          if (st.fixedOutside) {
            let total = 0;
            steps.push({ line: 1, i: "-", total: 0, note: "初始化 total = 0（迴圈外，只執行一次）" });
            for (let i = 1; i <= 5; i++) {
              steps.push({ line: 2, i, total, note: `進入迴圈第 ${i} 輪` });
              total = total + i;
              steps.push({ line: 3, i, total, note: `累加：total = ${total - i} + ${i} = ${total}` });
            }
            steps.push({ line: 4, i: 5, total, note: `輸出結果：${total}`, out: total });
          } else {
            let total = null;
            for (let i = 1; i <= 5; i++) {
              steps.push({ line: 1, i, total: total === null ? "-" : total, note: `進入迴圈第 ${i} 輪` });
              total = 0;
              steps.push({ line: 2, i, total: 0, note: `⚠️ Bug！迴圈內將 total 歸零覆蓋成 0` });
              total = total + i;
              steps.push({ line: 3, i, total, note: `計算：total = 0 + ${i} = ${total}` });
            }
            steps.push({ line: 4, i: 5, total, note: `輸出錯誤結果：${total}（預期 15）`, out: total });
          }
          return steps;
        };

        const render = () => {
          const lines = st.fixedOutside
            ? [
              { sc: "設 [total] 為 (0)", py: "total = 0" },
              { sc: "重複變數 [i] 從 1 到 5", py: "for i in range(1, 6):" },
              { sc: "  將 [total] 改變 (i)", py: "    total = total + i" },
              { sc: "說出 (total)", py: "print(total)" }
            ]
            : [
              { sc: "重複變數 [i] 從 1 到 5", py: "for i in range(1, 6):" },
              { sc: "  設 [total] 為 (0) ⚠️", py: "    total = 0   # ← BUG!" },
              { sc: "  將 [total] 改變 (i)", py: "    total = total + i" },
              { sc: "說出 (total)", py: "print(total)" }
            ];
          const steps = buildSteps();
          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 除錯目標：</b>程式目標是計算 <code>1 + 2 + 3 + 4 + 5 = 15</code>。請先按「▶ 單步執行 (Step)」觀察右側 Trace Table 為何總是被歸零，再點擊修復按鈕把 <code>total = 0</code> 移到迴圈外部！
            </div>
            <div class="mlab-toolbar">
              <button type="button" class="mlab-btn is-primary" id="cd2Step">▶ 單步執行 (Step)</button>
              <button type="button" class="mlab-btn is-accent" id="cd2Run">⏩ 完整執行並驗證</button>
              <button type="button" class="mlab-btn ${st.fixedOutside ? "is-ok" : "is-warn"}" id="cd2ToggleFix">
                ${st.fixedOutside ? "✅ 已修復：total = 0 在迴圈外部" : "🛠️ 將 total = 0 移至 for 迴圈外部上方"}
              </button>
              <button type="button" class="mlab-btn is-ghost" id="cd2ResetExec">↺ 重置追蹤</button>
            </div>
            <div class="mlab-grid-2">
              <div class="mlab-panel">
                <div class="mlab-panel-title">🧩 Scratch 積木 ↔ Python 程式碼</div>
                <div class="mlab-bilingual-list">
                  ${lines.map((l, idx) => `
                    <div class="mlab-code-row ${st.activeLine === idx + 1 ? "is-hl" : ""} ${!st.fixedOutside && idx === 1 ? "is-bug" : ""}">
                      <span class="mlab-ln">${idx + 1}</span>
                      <span class="mlab-scratch-blk">${esc(l.sc)}</span>
                      <code>${esc(l.py)}</code>
                    </div>
                  `).join("")}
                </div>
              </div>
              <div class="mlab-panel">
                <div class="mlab-panel-title">📋 迴圈 Trace Table（Step ${st.stepIdx}/${steps.length}）</div>
                <div class="mlab-table-scroll" data-scrollable="true">
                  <table class="mlab-trace-tbl">
                    <thead><tr><th>Step</th><th>i</th><th>total</th><th>執行說明</th></tr></thead>
                    <tbody>
                      ${st.trace.length ? st.trace.map((r, k) => `<tr><td>${k + 1}</td><td>${r.i}</td><td><b>${r.total}</b></td><td>${esc(r.note)}</td></tr>`).join("") : `<tr><td colspan="4" class="mlab-muted">請點擊「▶ 單步執行」觀察每一行變數變化</td></tr>`}
                    </tbody>
                  </table>
                </div>
                ${st.printed !== null ? `<div class="mlab-alert ${st.printed === 15 ? "is-ok" : "is-danger"}" style="margin-top:8px">Console 輸出：<b>${st.printed}</b> ${st.printed === 15 ? "✅ 總和 15 完全正確！" : "❌ 因為 total = 0 放在迴圈裡，每次都被歸零，最後只剩 5！"}</div>` : ""}
              </div>
            </div>
          `;
          ctx.body.querySelector("#cd2Step").addEventListener("click", () => {
            if (st.stepIdx >= steps.length) return;
            const cur = steps[st.stepIdx++];
            st.activeLine = cur.line;
            st.trace.push(cur);
            if (cur.out !== undefined) st.printed = cur.out;
            render();
            if (st.printed === 15 && st.fixedOutside) ctx.passStage("透過單步追蹤修復迴圈累加器初始化位置！");
          });
          ctx.body.querySelector("#cd2Run").addEventListener("click", () => {
            st.trace = steps.slice();
            st.stepIdx = steps.length;
            const last = steps[steps.length - 1];
            st.activeLine = last.line;
            st.printed = last.out;
            render();
            if (st.printed === 15 && st.fixedOutside) ctx.passStage("透過單步追蹤修復迴圈累加器初始化位置！");
            else notify("⚠️ 輸出為 5（錯誤）！請先把 total = 0 移到 for 迴圈外部上方再執行驗證。", "warn", 3000);
          });
          ctx.body.querySelector("#cd2ToggleFix").addEventListener("click", () => {
            st.fixedOutside = !st.fixedOutside;
            st.stepIdx = 0; st.activeLine = -1; st.trace = []; st.printed = null;
            render();
          });
          ctx.body.querySelector("#cd2ResetExec").addEventListener("click", () => {
            st.stepIdx = 0; st.activeLine = -1; st.trace = []; st.printed = null;
            render();
          });
        };
        render();
        return;
      }

      // 第 3 關：兩變數數值交換覆寫 Bug
      const st = {
        useTemp: false,
        order: ["a = b", "b = a"],
        trace: [],
        activeLine: -1,
        output: null
      };
      const isSwapCorrect = (arr) => {
        if (!st.useTemp || arr.length !== 3) return false;
        const s = arr.join(";");
        return s === "temp = a;a = b;b = temp" || s === "temp = b;b = a;a = temp";
      };
      const runSwapTrace = () => {
        const mem = { a: 10, b: 20, temp: "-" };
        const rows = [{ line: "1-2", a: 10, b: 20, temp: "-", note: "初始狀態 a=10, b=20" }];
        st.order.forEach((stmt, idx) => {
          if (stmt === "temp = a") mem.temp = mem.a;
          else if (stmt === "temp = b") mem.temp = mem.b;
          else if (stmt === "a = b") mem.a = mem.b;
          else if (stmt === "b = a") mem.b = mem.a;
          else if (stmt === "a = temp") mem.a = mem.temp;
          else if (stmt === "b = temp") mem.b = mem.temp;
          rows.push({ line: idx + 3, a: mem.a, b: mem.b, temp: mem.temp, note: stmt });
        });
        return { rows, a: mem.a, b: mem.b };
      };
      const render = () => {
        const ok = st.output && st.output.a === 20 && st.output.b === 10;
        renderOrderOptions();
        function renderOrderOptions() {
          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 除錯目標：</b>原本 <code>a = 10, b = 20</code>，直接寫 <code>a = b; b = a</code> 會導致兩者都變成 20！請先點擊「▶ 執行觀察覆寫 Bug」，接著<b>引入暫存變數 temp</b> 並排列出正確的 3 步驟交換流程。
            </div>
            <div class="mlab-toolbar">
              <button type="button" class="mlab-btn ${st.useTemp ? "is-ok" : "is-warn"}" id="cd3AddTemp">
                ${st.useTemp ? "✅ 已引入暫存變數 temp" : "➕ 引入暫存變數 temp（第三個空杯子）"}
              </button>
              <button type="button" class="mlab-btn is-primary" id="cd3Run">▶ 執行並記錄 Trace Table</button>
            </div>
            <div class="mlab-grid-2">
              <div class="mlab-panel">
                <div class="mlab-panel-title">🧩 變數交換程式碼（可調整指令順序）</div>
                <div class="mlab-bilingual-list">
                  <div class="mlab-code-row"><span class="mlab-ln">1</span><span class="mlab-scratch-blk is-var">設 [a] 為 (10)</span><code>a = 10</code></div>
                  <div class="mlab-code-row"><span class="mlab-ln">2</span><span class="mlab-scratch-blk is-var">設 [b] 為 (20)</span><code>b = 20</code></div>
                  ${st.order.map((stmt, i) => `
                    <div class="mlab-code-row">
                      <span class="mlab-ln">${i + 3}</span>
                      <select class="mlab-stmt-sel" data-idx="${i}">
                        ${["temp = a", "temp = b", "a = b", "b = a", "a = temp", "b = temp"]
                          .filter((opt) => st.useTemp || !opt.includes("temp"))
                          .map((opt) => `<option value="${opt}" ${stmt === opt ? "selected" : ""}>${opt}</option>`).join("")}
                      </select>
                      <span class="mlab-order-btns">
                        <button type="button" class="mlab-mini-btn" data-sw="${i}:-1" ${i === 0 ? "disabled" : ""}>▲</button>
                        <button type="button" class="mlab-mini-btn" data-sw="${i}:1" ${i === st.order.length - 1 ? "disabled" : ""}>▼</button>
                      </span>
                    </div>
                  `).join("")}
                  <div class="mlab-code-row"><span class="mlab-ln">${st.order.length + 3}</span><span class="mlab-scratch-blk is-look">說出 (a, b)</span><code>print(a, b)</code></div>
                </div>
              </div>
              <div class="mlab-panel">
                <div class="mlab-panel-title">📋 記憶體覆寫追蹤表 (Trace Table)</div>
                <div class="mlab-table-scroll" data-scrollable="true">
                  <table class="mlab-trace-tbl">
                    <thead><tr><th>行號</th><th>指令</th><th>a</th><th>b</th><th>temp</th></tr></thead>
                    <tbody>
                      ${st.trace.length ? st.trace.map((r) => `<tr><td>${r.line}</td><td><code>${esc(r.note)}</code></td><td><b>${r.a}</b></td><td><b>${r.b}</b></td><td>${r.temp}</td></tr>`).join("") : `<tr><td colspan="5" class="mlab-muted">按下「▶ 執行並記錄 Trace Table」查看交換過程</td></tr>`}
                    </tbody>
                  </table>
                </div>
                ${st.output ? `<div class="mlab-alert ${ok ? "is-ok" : "is-danger"}" style="margin-top:8px">輸出結果：a = <b>${st.output.a}</b>, b = <b>${st.output.b}</b> ${ok ? "✅ 成功完成交換！" : "❌ 原數值已被覆寫遺失，目標應為 a=20, b=10！"}</div>` : ""}
              </div>
            </div>
          `;
          ctx.body.querySelector("#cd3AddTemp").addEventListener("click", () => {
            if (!st.useTemp) {
              st.useTemp = true;
              st.order = ["temp = a", "b = temp", "a = b"]; // deliberate slightly wrong initial order so student fixes it!
            } else {
              st.useTemp = false;
              st.order = ["a = b", "b = a"];
            }
            st.trace = []; st.output = null;
            render();
          });
          ctx.body.querySelectorAll(".mlab-stmt-sel").forEach((sel) => {
            sel.addEventListener("change", () => {
              st.order[Number(sel.dataset.idx)] = sel.value;
              st.trace = []; st.output = null;
              render();
            });
          });
          ctx.body.querySelectorAll("[data-sw]").forEach((btn) => {
            btn.addEventListener("click", () => {
              const [idxStr, dirStr] = btn.dataset.sw.split(":");
              const idx = Number(idxStr), target = idx + Number(dirStr);
              if (target < 0 || target >= st.order.length) return;
              const tmp = st.order[idx]; st.order[idx] = st.order[target]; st.order[target] = tmp;
              st.trace = []; st.output = null;
              render();
            });
          });
          ctx.body.querySelector("#cd3Run").addEventListener("click", () => {
            const res = runSwapTrace();
            st.trace = res.rows;
            st.output = { a: res.a, b: res.b };
            render();
            if (res.a === 20 && res.b === 10 && isSwapCorrect(st.order)) {
              ctx.passStage("成功引入 temp 暫存變數完成兩變數數值交換！", true);
            } else {
              notify("⚠️ 交換結果不正確！提示：先備份到 temp ➔ 覆寫原變數 ➔ 再從 temp 取回。", "warn", 3200);
            }
          });
        }
      };
      render();
    }
  };

  /* ========================================================================
   * 5. 演算法山 (algo / algorithm)
   *    《運算思維雙重試煉：搜尋複雜度競速 × 最短路徑規劃》
   * ======================================================================== */
  const LAB_ALGO = {
    id: "algo",
    islandName: "演算法山",
    emoji: "⛰️",
    accent: "#ffd166",
    title: "《運算思維雙重試煉：搜尋複雜度競速 × 最短路徑規劃》",
    objective: "驗證二分搜尋的排序前提與對數切半效率，並實作加權圖節點鬆弛找出全局最低燃料路徑。",
    stages: [
      { title: "試煉 1｜線性搜尋 vs. 二分搜尋雙軌賽道＋未排序陷阱", subtitle: "先體驗未排序陣列二分搜尋失敗陷阱，再於 128 筆排序資料中實測切半淘汰與複雜度對比" },
      { title: "試煉 2｜加權圖最短路徑規劃 (Node Relaxation)", subtitle: "在 6 座島嶼航線圖中逐點規劃，找出總燃料小於直線航線的全局最短路徑" }
    ],
    mountStage(stageIdx, ctx) {
      if (stageIdx === 0) {
        const UNSORTED = [42, 85, 19, 53, 12, 74, 30, 66];
        const SORTED_128 = Array.from({ length: 128 }, (_, i) => (i + 1) * 2); // 2..256
        const TARGET_128_IDX = 102; // value 206
        const TARGET_128_VAL = SORTED_128[TARGET_128_IDX];

        const st = {
          phase: "unsorted", // 'unsorted' | 'race'
          unsortedLog: [],
          unsortedFailed: false,
          low: 0,
          high: 127,
          binSteps: 0,
          linIdx: -1,
          linSteps: 0,
          foundBin: false,
          foundLin: false,
          racing: false
        };
        let raceTimer = null;

        const render = () => {
          if (st.phase === "unsorted") {
            ctx.body.innerHTML = `
              <div class="mlab-guide-box">
                <b>🎯 第一階段（未排序陷阱）：</b>目標搜尋數字 <b>19</b>（它就明明在索引 <code>[2]</code>！）。請先按下「⚡ 啟動二分搜尋」觀察指針跳錯區間的失敗過程，再點擊「🔀 執行陣列排序」進入 128 筆雙軌賽道！
              </div>
              <div class="mlab-panel">
                <div class="mlab-panel-title">📦 未排序陣列（共 8 筆 · 搜尋目標：19）</div>
                <div class="mlab-arr8">
                  ${UNSORTED.map((v, idx) => `<div class="mlab-cell8 ${v === 19 ? "is-target" : ""} ${st.unsortedLog.some((l) => l.mid === idx) ? "is-visited" : ""}">
                    <small>[${idx}]</small><b>${v}</b>
                  </div>`).join("")}
                </div>
                <div class="mlab-btn-row" style="margin-top:10px">
                  <button type="button" class="mlab-btn is-warn" id="alTryUnsorted">⚡ 啟動二分搜尋（未排序測試）</button>
                  <button type="button" class="mlab-btn is-primary" id="alSortNow">🔀 執行陣列排序 ➔ 進入 128 筆賽道</button>
                </div>
                ${st.unsortedLog.length ? `
                  <div class="mlab-sim-log" style="margin-top:10px">
                    ${st.unsortedLog.map((l) => `<div class="mlab-sim-item ${l.err ? "is-err" : ""}">${esc(l.msg)}</div>`).join("")}
                  </div>
                ` : ""}
              </div>
            `;
            ctx.body.querySelector("#alTryUnsorted").addEventListener("click", () => {
              st.unsortedLog = [
                { mid: 3, msg: "第 1 步：low=0, high=7 ➔ mid=3，值為 53。因為 19 < 53，指針往左半 [0..2] 跳！" },
                { mid: 1, msg: "第 2 步：low=0, high=2 ➔ mid=1，值為 85。因為 19 < 85，指針往左半 [0..0] 跳！" },
                { mid: 0, err: true, msg: "❌ 第 3 步：mid=0（值 42 ≠ 19）➔ 區間歸零，搜尋失敗！明明 19 就在 [2] 卻因陣列未排序而完美錯過！" }
              ];
              st.unsortedFailed = true;
              render();
            });
            ctx.body.querySelector("#alSortNow").addEventListener("click", () => {
              st.phase = "race";
              notify("✅ 陣列已由小到大排序完成！進入 128 筆資料雙軌競速！", "ok", 2500);
              render();
            });
            return;
          }

          const curMid = st.low <= st.high ? Math.floor((st.low + st.high) / 2) : -1;
          const linPct = Math.min(100, Math.round((st.linSteps / 128) * 100));
          const binPct = Math.min(100, Math.round((st.binSteps / 7) * 100));

          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 128 筆已排序資料賽道（目標值：<code>${TARGET_128_VAL}</code>）：</b>你可以<b>親手點擊發光的橘金色 <code>mid</code> 中間索引</b>進行切半淘汰（排除的半邊會整排灰化！），或點擊「🚀 雙演算法同步競速」比較 <code>O(n)</code> 與 <code>O(log<sub>2</sub> n)</code>！
            </div>
            <div class="mlab-toolbar">
              <button type="button" class="mlab-btn is-primary" id="alStartRace" ${st.racing || st.foundBin ? "disabled" : ""}>🚀 雙演算法同步競速</button>
              <button type="button" class="mlab-btn is-ghost" id="alResetRace">↺ 重置 128 筆賽道</button>
              <span class="mlab-pill info">有效區間：[${st.low} .. ${st.high}]（剩 ${Math.max(0, st.high - st.low + 1)} 筆）</span>
            </div>

            <div class="mlab-race-bars">
              <div class="mlab-race-row">
                <span>🐢 線性搜尋 O(n)：<b>${st.linSteps} 步</b></span>
                <div class="mlab-prog-bar"><i style="width:${linPct}%;background:#fb923c"></i></div>
              </div>
              <div class="mlab-race-row">
                <span>⚡ 二分搜尋 O(log₂ n)：<b>${st.binSteps} 步</b>（128 筆最多 7 步）</span>
                <div class="mlab-prog-bar"><i style="width:${binPct}%;background:#34d399"></i></div>
              </div>
            </div>

            <div class="mlab-grid128" data-scrollable="true">
              ${SORTED_128.map((val, idx) => {
                const eliminated = idx < st.low || idx > st.high;
                const isMid = idx === curMid && !st.foundBin;
                const isFound = st.foundBin && idx === TARGET_128_IDX;
                const isLin = st.linIdx === idx;
                return `<button type="button" class="mlab-c128 ${eliminated ? "is-elim" : ""} ${isMid ? "is-mid" : ""} ${isFound ? "is-found" : ""} ${isLin ? "is-lin" : ""}" data-cidx="${idx}" ${!isMid || st.racing ? "disabled" : ""} title="索引 ${idx}：值 ${val}${isMid ? "（點擊切半比對！）" : ""}">
                  ${val}
                </button>`;
              }).join("")}
            </div>
          `;

          const stepBinary = () => {
            if (st.foundBin || st.low > st.high) return;
            const mid = Math.floor((st.low + st.high) / 2);
            st.binSteps += 1;
            const v = SORTED_128[mid];
            if (v === TARGET_128_VAL) {
              st.foundBin = true;
              st.low = mid;
              st.high = mid;
              ctx.passStage(`只用 ${st.binSteps} 步就於 128 筆資料中命中 ${TARGET_128_VAL}（線性搜尋需 ${TARGET_128_IDX + 1} 步）！`);
            } else if (v < TARGET_128_VAL) {
              st.low = mid + 1;
            } else {
              st.high = mid - 1;
            }
          };

          const midBtn = ctx.body.querySelector(".mlab-c128.is-mid");
          if (midBtn) {
            midBtn.addEventListener("click", () => {
              stepBinary();
              render();
            });
          }

          ctx.body.querySelector("#alStartRace").addEventListener("click", () => {
            if (st.racing || st.foundBin) return;
            st.racing = true;
            let tick = 0;
            render();
            raceTimer = ctx.setInterval(() => {
              tick++;
              // Linear advances 2 cells every 70ms so students see it crawling far behind Binary!
              if (!st.foundLin) {
                st.linIdx += 2;
                st.linSteps = Math.min(TARGET_128_IDX + 1, st.linIdx + 1);
                if (st.linIdx >= TARGET_128_IDX) {
                  st.linIdx = TARGET_128_IDX;
                  st.foundLin = true;
                }
              }
              if (!st.foundBin && tick % 5 === 1) {
                stepBinary();
              }
              if (st.foundBin && st.foundLin) {
                st.racing = false;
                ctx.clearInterval(raceTimer);
                raceTimer = null;
              }
              render();
            }, 70);
          });

          ctx.body.querySelector("#alResetRace").addEventListener("click", () => {
            if (raceTimer) { ctx.clearInterval(raceTimer); raceTimer = null; }
            st.low = 0; st.high = 127; st.binSteps = 0;
            st.linIdx = -1; st.linSteps = 0;
            st.foundBin = false; st.foundLin = false; st.racing = false;
            render();
          });
        };
        render();
        return;
      }

      // 試煉 2：加權圖最短路徑規劃 (Node Relaxation)
      const NODES = {
        A: { x: 60, y: 135, label: "A 起點" },
        B: { x: 225, y: 50, label: "B 火山礁" },
        C: { x: 195, y: 220, label: "C 淺海灣" },
        D: { x: 345, y: 145, label: "D 燈塔島" },
        E: { x: 380, y: 235, label: "E 沉船灣" },
        F: { x: 505, y: 135, label: "F 終點港" }
      };
      const EDGES = [
        { from: "A", to: "B", w: 8 },
        { from: "B", to: "F", w: 5 },
        { from: "A", to: "C", w: 2 },
        { from: "C", to: "D", w: 3 },
        { from: "D", to: "F", w: 2 },
        { from: "B", to: "D", w: 4 },
        { from: "C", to: "E", w: 6 },
        { from: "D", to: "E", w: 3 },
        { from: "E", to: "F", w: 4 }
      ];
      const st = {
        path: ["A"],
        totalCost: 0,
        dist: { A: 0, B: Infinity, C: Infinity, D: Infinity, E: Infinity, F: Infinity }
      };

      const render = () => {
        const cur = st.path[st.path.length - 1];
        const nextEdges = EDGES.filter((e) => e.from === cur);
        const reached = cur === "F";
        const isOptimal = reached && st.totalCost === 7;

        ctx.body.innerHTML = `
          <div class="mlab-guide-box">
            <b>🎯 航線挑戰：</b>從 <b>A 起點</b> 出發前往 <b>F 終點港</b>。看似只有 2 段的上方航道 <code>A→B→F</code> 其實耗費 <b>13</b> 燃料！請依序點擊相鄰節點進行鬆弛計算，找出總燃料最低（<b>7</b>）的繞行路徑！
          </div>
          <div class="mlab-toolbar">
            <span>目前航線：<b>${st.path.join(" ➔ ")}</b></span>
            <span class="mlab-pill ${isOptimal ? "ok" : "info"}">累計燃料：<b>${st.totalCost}</b></span>
            <button type="button" class="mlab-btn is-ghost" id="alUndo" ${st.path.length <= 1 ? "disabled" : ""}>↩ 退回一步</button>
            <button type="button" class="mlab-btn is-ghost" id="alClearPath">↺ 清空重選</button>
          </div>

          <div class="mlab-graph-wrap">
            <svg viewBox="0 0 565 280" class="mlab-svg" role="img" aria-label="6節點加權航線圖">
              <defs>
                <marker id="alArrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker id="alArrowOn" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#ffd166" />
                </marker>
              </defs>
              ${EDGES.map((e) => {
                const n1 = NODES[e.from], n2 = NODES[e.to];
                const idxFrom = st.path.indexOf(e.from);
                const inPath = idxFrom >= 0 && st.path[idxFrom + 1] === e.to;
                const isNext = e.from === cur;
                const mx = (n1.x + n2.x) / 2, my = (n1.y + n2.y) / 2;
                return `<g>
                  <line x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}" stroke="${inPath ? "#ffd166" : isNext ? "#38bdf8" : "#475569"}" stroke-width="${inPath ? 4 : isNext ? 2.5 : 1.8}" stroke-dasharray="${isNext && !inPath ? "5 4" : ""}" marker-end="url(#${inPath ? "alArrowOn" : "alArrow"})" />
                  <circle cx="${mx}" cy="${my}" r="12" fill="${inPath ? "#f59e0b" : "#0f172a"}" stroke="${inPath ? "#fef08a" : "#64748b"}" stroke-width="1.5" />
                  <text x="${mx}" y="${my + 4}" text-anchor="middle" fill="${inPath ? "#0f172a" : "#e2e8f0"}" font-size="11" font-weight="800">${e.w}</text>
                </g>`;
              }).join("")}
              ${Object.entries(NODES).map(([id, n]) => {
                const visited = st.path.includes(id);
                const isCur = id === cur;
                const canClick = nextEdges.some((e) => e.to === id);
                const dVal = st.dist[id] === Infinity ? "∞" : st.dist[id];
                return `<g class="mlab-gnode ${canClick ? "is-clickable" : ""}" data-gnode="${id}" style="cursor:${canClick ? "pointer" : "default"}">
                  <circle cx="${n.x}" cy="${n.y}" r="22" fill="${isCur ? "#ffd166" : visited ? "#059669" : canClick ? "#0284c7" : "#1e293b"}" stroke="${canClick ? "#7dd3fc" : "#fff"}" stroke-width="${canClick ? 3 : 2}" />
                  <text x="${n.x}" y="${n.y - 2}" text-anchor="middle" fill="${isCur ? "#0f172a" : "#fff"}" font-size="13" font-weight="900">${id}</text>
                  <text x="${n.x}" y="${n.y + 12}" text-anchor="middle" fill="${isCur ? "#0f172a" : "#bae6fd"}" font-size="9" font-weight="700">d=${dVal}</text>
                  <text x="${n.x}" y="${n.y + 34}" text-anchor="middle" fill="#cbd5e1" font-size="10" font-weight="700">${n.label}</text>
                </g>`;
              }).join("")}
            </svg>
          </div>
          ${reached && !isOptimal ? `<div class="mlab-alert is-warn">⛵ 已抵達 F！但這條路線累計燃料為 <b>${st.totalCost}</b>（比最低 7 還要高）。請點擊「退回」或「清空重選」尋找更省燃料的 3 段繞行航線！</div>` : ""}
          ${isOptimal ? `<div class="mlab-alert is-ok">🏆 找到全局最短路徑 <b>A ➔ C ➔ D ➔ F（總燃料 2 + 3 + 2 = 7）</b>！段數少不代表權重總和最低！</div>` : ""}
        `;

        ctx.body.querySelectorAll("[data-gnode]").forEach((g) => {
          g.addEventListener("click", () => {
            const targetId = g.dataset.gnode;
            const edge = nextEdges.find((e) => e.to === targetId);
            if (!edge) return;
            st.path.push(targetId);
            st.totalCost += edge.w;
            if (st.totalCost < st.dist[targetId]) st.dist[targetId] = st.totalCost;
            render();
            if (targetId === "F" && st.totalCost === 7) {
              ctx.passStage("透過節點鬆弛找到全局最低燃料路徑 (7)！", true);
            }
          });
        });

        ctx.body.querySelector("#alUndo").addEventListener("click", () => {
          if (st.path.length <= 1) return;
          const last = st.path.pop();
          const prev = st.path[st.path.length - 1];
          const edge = EDGES.find((e) => e.from === prev && e.to === last);
          if (edge) st.totalCost -= edge.w;
          render();
        });
        ctx.body.querySelector("#alClearPath").addEventListener("click", () => {
          st.path = ["A"];
          st.totalCost = 0;
          render();
        });
      };
      render();
    }
  };

  /* ========================================================================
   * 6. 資料海灣 (data)
   *    《試算表實戰沙盒：$ 參照拖曳、複合統計與資料清洗》
   * ======================================================================== */
  const LAB_DATA = {
    id: "data",
    islandName: "資料海灣",
    emoji: "📊",
    accent: "#2ec4b6",
    title: "《試算表實戰沙盒：$ 參照拖曳、複合統計與資料清洗》",
    objective: "親手拖曳填滿控點體驗 $ 絕對參照差異、組合 IF/COUNTIFS 公式，並清洗異常資料修復圖表失真。",
    stages: [
      { title: "任務 1｜$ 絕對參照與填滿控點拖曳視覺化", subtitle: "先以 =C5*B2 向下拖曳見證參照跑位，再改為 =C5*$B$2 鎖定稅率格完成計算" },
      { title: "任務 2｜IF 與 COUNTIFS 多條件統計", subtitle: "組裝及格判定公式與八年級高分人數多條件統計積木" },
      { title: "任務 3｜異常資料清洗與圖表修復", subtitle: "清除重複座號、全形數字與 9999 離群值，讓右側統計圖表恢復正常比例" }
    ],
    mountStage(stageIdx, ctx) {
      if (stageIdx === 0) {
        const ITEMS = [
          { row: 5, name: "氣泡飲", rev: 2400 },
          { row: 6, name: "雞蛋糕", rev: 3200 },
          { row: 7, name: "紀念徽章", rev: 1800 },
          { row: 8, name: "帆布袋", rev: 4000 }
        ];
        const st = {
          formula: "=C5*B2",
          filledRows: 0, // 0..3 (for rows 6,7,8)
          animStep: 0,
          sawRelativeFail: false,
          dragging: false
        };
        let animTimer = null;

        const runFillAnimation = () => {
          if (animTimer) ctx.clearInterval(animTimer);
          st.filledRows = 0;
          st.animStep = 0;
          render();
          animTimer = ctx.setInterval(() => {
            st.filledRows += 1;
            st.animStep = st.filledRows;
            if (st.filledRows >= 3) {
              ctx.clearInterval(animTimer);
              animTimer = null;
              if (st.formula === "=C5*B2") {
                st.sawRelativeFail = true;
                notify("⚠️ 注意看！B2 沒加 $，拖曳時滑進 B3、B4、B5 空白格導致稅額全變成 0！", "warn", 3400);
              } else {
                ctx.passStage("成功使用 $B$2 絕對參照鎖定稅率格完成全部計算！");
              }
            }
            render();
          }, 360);
        };

        const render = () => {
          const isAbs = st.formula === "=C5*$B$2";
          const activeRefB = st.animStep > 0 ? (isAbs ? 2 : 2 + st.animStep) : 2;
          const activeRefC = st.animStep > 0 ? 5 + st.animStep : 5;
          const allCorrect = isAbs && st.filledRows === 3;

          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 實作步驟：</b>① 先使用相對參照 <code>=C5*B2</code> <b>按住 D5 右下角綠色填滿控點向下拖曳</b>（或點模擬拖曳），觀察橘色框線如何滑進空白儲存格；② 再切換成 <code>=C5*$B$2</code> 重新拖曳算出正確稅額！
            </div>
            <div class="mlab-toolbar">
              <span>D5 公式選擇：</span>
              <button type="button" class="mlab-seg ${!isAbs ? "active" : ""}" id="dtRelBtn">=C5*B2（未鎖定）</button>
              <button type="button" class="mlab-seg ${isAbs ? "active" : ""}" id="dtAbsBtn">=C5*$B$2（📌 絕對參照）</button>
              <button type="button" class="mlab-btn is-primary" id="dtDragBtn">⬇ 模擬向下拖曳填滿 D6:D8</button>
            </div>

            <div class="mlab-sheet-wrap" id="dtSheetWrap">
              <table class="mlab-sheet">
                <thead><tr><th></th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead>
                <tbody>
                  <tr><th>1</th><td colspan="4" class="is-title">🎪 園遊會商品營收與營業稅試算表</td></tr>
                  <tr><th>2</th><td>固定稅率</td><td class="${activeRefB === 2 ? "is-ref-b" : ""}" data-cell="B2"><b>5%</b> (0.05) ${isAbs ? "📌" : ""}</td><td></td><td></td></tr>
                  <tr><th>3</th><td></td><td class="${activeRefB === 3 ? "is-ref-b-err" : ""}"><i>(空白 = 0)</i></td><td></td><td></td></tr>
                  <tr><th>4</th><th>商品名稱</th><td class="${activeRefB === 4 ? "is-ref-b-err" : ""}"><i>(空白 = 0)</i></td><th>營收 (元)</th><th>稅額 (=公式)</th></tr>
                  ${ITEMS.map((it, idx) => {
                    const isFilled = idx === 0 || idx <= st.filledRows;
                    const refB = isAbs ? "$B$2" : `B${2 + idx}`;
                    const formulaStr = `=C${it.row}*${refB}`;
                    const val = idx === 0 ? Math.round(it.rev * 0.05) : (isFilled ? (isAbs ? Math.round(it.rev * 0.05) : 0) : "");
                    const showHandle = idx === 0;
                    return `<tr class="${activeRefC === it.row ? "is-row-hl" : ""}">
                      <th>${it.row}</th>
                      <td>${it.name}</td>
                      <td class="${idx === 1 && activeRefB === 5 ? "is-ref-b-err" : ""}">${idx === 1 ? "<i>(空白 = 0)</i>" : ""}</td>
                      <td class="${activeRefC === it.row ? "is-ref-c" : ""}">${it.rev}</td>
                      <td class="mlab-cell-d ${isFilled && idx > 0 ? (isAbs ? "is-ok" : "is-err") : ""}" data-drow="${idx}">
                        <span>${isFilled ? `${val} 元` : "—"}</span>
                        ${isFilled ? `<small>${formulaStr}</small>` : ""}
                        ${showHandle ? `<span class="mlab-fill-handle" id="dtFillHandle" title="按住向下拖曳填滿 D6:D8"></span>` : ""}
                      </td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
            ${st.sawRelativeFail && !isAbs && st.filledRows === 3 ? `<div class="mlab-alert is-danger" style="margin-top:8px">❌ 看見了嗎？D6 變成 <code>=C6*B3</code>、D7 變成 <code>=C7*B4</code>、D8 變成 <code>=C8*B5</code>，全乘到空白格變成 <b>0</b>！請改選 <code>=C5*$B$2</code> 重新拖曳！</div>` : ""}
            ${allCorrect ? `<div class="mlab-alert is-ok" style="margin-top:8px">✅ 完美！加了 <code>$B$2</code> 後，向下拖曳時 C 欄相對下移（C5➔C8），而 $B$2 牢牢鎖在 5% 稅率格！</div>` : ""}
          `;

          ctx.body.querySelector("#dtRelBtn").addEventListener("click", () => { st.formula = "=C5*B2"; st.filledRows = 0; st.animStep = 0; render(); });
          ctx.body.querySelector("#dtAbsBtn").addEventListener("click", () => { st.formula = "=C5*$B$2"; st.filledRows = 0; st.animStep = 0; render(); });
          ctx.body.querySelector("#dtDragBtn").addEventListener("click", runFillAnimation);

          const handle = ctx.body.querySelector("#dtFillHandle");
          if (handle) {
            handle.addEventListener("pointerdown", (e) => {
              e.preventDefault();
              st.dragging = true;
              const startY = e.clientY;
              const onMove = (ev) => {
                if (!st.dragging) return;
                if (ev.clientY - startY > 28) {
                  cleanup();
                  runFillAnimation();
                }
              };
              const onUp = () => {
                cleanup();
              };
              const cleanup = () => {
                st.dragging = false;
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            });
          }
        };
        render();
        return;
      }

      if (stageIdx === 1) {
        const ROWS = [
          { seat: "01", name: "林小宇", grade: "七年級", score: 78 },
          { seat: "02", name: "陳羽晴", grade: "八年級", score: 85 },
          { seat: "03", name: "張子軒", grade: "八年級", score: 54 },
          { seat: "04", name: "王詩涵", grade: "八年級", score: 92 },
          { seat: "05", name: "李柏毅", grade: "九年級", score: 88 },
          { seat: "06", name: "黃品妍", grade: "八年級", score: 80 }
        ];
        const st = {
          ifCond: "",
          ifApplied: false,
          cFn: "",
          cR1: "",
          cV1: "",
          cR2: "",
          cV2: "",
          countApplied: false
        };
        const render = () => {
          const ifOk = st.ifApplied && st.ifCond === "D2>=60";
          const pairA = st.cR1 === "C2:C7" && st.cV1 === '"八年級"' && st.cR2 === "D2:D7" && st.cV2 === '">=80"';
          const pairB = st.cR1 === "D2:D7" && st.cV1 === '">=80"' && st.cR2 === "C2:C7" && st.cV2 === '"八年級"';
          const countOk = st.countApplied && st.cFn === "COUNTIFS" && (pairA || pairB);

          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 統計任務：</b>① 先設定 <code>=IF(...)</code> 判定成績滿 60 分為「及格」、未滿為「待加強」；② 再組出正確的 <code>COUNTIFS</code> 公式統計「<b>八年級 且 成績 >= 80</b>」的人數。
            </div>
            <div class="mlab-grid-2">
              <div class="mlab-panel">
                <div class="mlab-panel-title">📋 體適能成績表（C2:C7 年級｜D2:D7 成績）</div>
                <table class="mlab-trace-tbl">
                  <thead><tr><th>座號</th><th>姓名</th><th>年級</th><th>成績</th><th>E 欄：及格判定</th></tr></thead>
                  <tbody>
                    ${ROWS.map((r) => {
                      let status = "—";
                      if (st.ifApplied) {
                        const pass = st.ifCond === "D2>=60" ? r.score >= 60 : st.ifCond === "D2>=80" ? r.score >= 80 : r.score < 60;
                        status = pass ? "✅ 及格" : "⚠️ 待加強";
                      }
                      const matchCount = countOk && r.grade === "八年級" && r.score >= 80;
                      return `<tr class="${matchCount ? "is-match-hl" : ""}">
                        <td>${r.seat}</td><td>${r.name}</td><td>${r.grade}</td><td><b>${r.score}</b></td><td>${status}</td>
                      </tr>`;
                    }).join("")}
                  </tbody>
                </table>
              </div>

              <div class="mlab-panel">
                <div class="mlab-panel-title">1️⃣ 設定 IF 及格公式</div>
                <div class="mlab-formula-line">
                  <code>=IF(</code>
                  <select id="dtIfCond">
                    <option value="">-- 選擇條件 --</option>
                    <option value="D2>=60" ${st.ifCond === "D2>=60" ? "selected" : ""}>D2>=60</option>
                    <option value="D2>=80" ${st.ifCond === "D2>=80" ? "selected" : ""}>D2>=80</option>
                    <option value="D2<60" ${st.ifCond === "D2<60" ? "selected" : ""}>D2&lt;60</option>
                  </select>
                  <code>, "及格", "待加強")</code>
                </div>
                <button type="button" class="mlab-btn is-primary" id="dtApplyIf" ${!st.ifCond ? "disabled" : ""} style="margin:6px 0 8px;width:100%">▶ 套用 E 欄及格判定</button>
                ${st.ifApplied && !ifOk ? `<div class="mlab-alert is-danger" style="margin-bottom:10px">⚠️ 及格門檻應為 <code>D2>=60</code>，請修正後重新套用！</div>` : ""}
                ${ifOk ? `<div class="mlab-alert is-ok" style="margin-bottom:10px">✅ E 欄及格判定套用成功！</div>` : ""}

                <div class="mlab-panel-title">2️⃣ 組裝多條件統計公式（八年級 且 成績 &gt;= 80）</div>
                <div class="mlab-formula-grid">
                  <select id="dtCFn"><option value="">函數</option><option value="COUNTIFS" ${st.cFn === "COUNTIFS" ? "selected" : ""}>COUNTIFS</option><option value="COUNTIF" ${st.cFn === "COUNTIF" ? "selected" : ""}>COUNTIF</option></select>
                  <select id="dtCR1"><option value="">範圍 1</option><option value="C2:C7" ${st.cR1 === "C2:C7" ? "selected" : ""}>C2:C7 (年級)</option><option value="D2:D7" ${st.cR1 === "D2:D7" ? "selected" : ""}>D2:D7 (成績)</option></select>
                  <select id="dtCV1"><option value="">條件 1</option><option value='"八年級"' ${st.cV1 === '"八年級"' ? "selected" : ""}>"八年級"</option><option value='">=80"' ${st.cV1 === '">=80"' ? "selected" : ""}>"&gt;=80"</option><option value='"七年級"' ${st.cV1 === '"七年級"' ? "selected" : ""}>"七年級"</option></select>
                  <select id="dtCR2"><option value="">範圍 2</option><option value="D2:D7" ${st.cR2 === "D2:D7" ? "selected" : ""}>D2:D7 (成績)</option><option value="C2:C7" ${st.cR2 === "C2:C7" ? "selected" : ""}>C2:C7 (年級)</option></select>
                  <select id="dtCV2"><option value="">條件 2</option><option value='">=80"' ${st.cV2 === '">=80"' ? "selected" : ""}>"&gt;=80"</option><option value='"八年級"' ${st.cV2 === '"八年級"' ? "selected" : ""}>"八年級"</option><option value='">=60"' ${st.cV2 === '">=60"' ? "selected" : ""}>"&gt;=60"</option></select>
                </div>
                <button type="button" class="mlab-btn is-accent" id="dtApplyCount" style="margin-top:8px;width:100%">📊 執行 COUNTIFS 統計</button>
                ${st.countApplied ? `<div class="mlab-alert ${countOk ? "is-ok" : "is-danger"}" style="margin-top:8px">${countOk ? "✅ 統計結果：共 <b>3 人</b>符合（02 陳羽晴、04 王詩涵、06 黃品妍）！" : "❌ 公式語法或條件範圍有誤（單條件 COUNTIF 無法處理雙條件喔）！"}</div>` : ""}
              </div>
            </div>
          `;
          ctx.body.querySelector("#dtIfCond").addEventListener("change", (e) => { st.ifCond = e.target.value; st.ifApplied = false; render(); });
          ctx.body.querySelector("#dtApplyIf").addEventListener("click", () => {
            st.ifApplied = true;
            render();
            if (st.ifCond !== "D2>=60") notify("⚠️ 及格標準應為 >= 60 分喔！", "warn", 2400);
            else if (st.countApplied && countOk) ctx.passStage("成功運用 IF 與 COUNTIFS 完成多條件統計！");
          });
          ["dtCFn", "dtCR1", "dtCV1", "dtCR2", "dtCV2"].forEach((id) => {
            const key = { dtCFn: "cFn", dtCR1: "cR1", dtCV1: "cV1", dtCR2: "cR2", dtCV2: "cV2" }[id];
            ctx.body.querySelector(`#${id}`).addEventListener("change", (e) => { st[key] = e.target.value; st.countApplied = false; render(); });
          });
          ctx.body.querySelector("#dtApplyCount").addEventListener("click", () => {
            st.countApplied = true;
            render();
            if (ifOk && (st.cFn === "COUNTIFS" && (pairA || pairB))) {
              ctx.passStage("成功運用 IF 與 COUNTIFS 完成多條件統計！");
            } else if (!ifOk) {
              notify("⚠️ 請記得一併完成上方正確的 =IF(D2>=60, ...) 套用！", "warn", 2600);
            }
          });
        };
        render();
        return;
      }

      // 任務 3：異常資料清洗與圖表修復（Canvas 2D 即時繪製）
      const st = {
        dupRemoved: false,
        fullWidthFixed: false,
        outlierFixed: false
      };

      const drawChart = () => {
        const cv = ctx.body.querySelector("#dtCleanChart");
        if (!cv) return;
        const c = cv.getContext("2d");
        const W = cv.width, H = cv.height;
        c.clearRect(0, 0, W, H);
        const bars = [
          { name: "01 小宇", val: 78 },
          { name: "02 小美", val: 84 },
          { name: "03 小明", val: 82 },
          ...(st.dupRemoved ? [] : [{ name: "03 小明(重)", val: 82, bad: true }]),
          { name: "04 小華", val: st.fullWidthFixed ? 85 : 0, errText: st.fullWidthFixed ? "" : "NaN" },
          { name: "05 大維", val: st.outlierFixed ? 95 : 9999, bad: !st.outlierFixed }
        ];
        const maxVal = Math.max(100, ...bars.map((b) => b.val));
        const padL = 36, padB = 34, padT = 18, padR = 14;
        const plotW = W - padL - padR, plotH = H - padT - padB;

        c.fillStyle = "rgba(8, 22, 42, 0.72)";
        c.fillRect(0, 0, W, H);
        c.strokeStyle = "rgba(148, 163, 184, 0.35)";
        c.beginPath(); c.moveTo(padL, padT); c.lineTo(padL, padT + plotH); c.lineTo(W - padR, padT + plotH); c.stroke();

        c.fillStyle = "#94a3b8";
        c.font = '11px "Noto Sans TC", sans-serif';
        c.textAlign = "right";
        c.fillText(String(maxVal), padL - 4, padT + 8);
        c.fillText("0", padL - 4, padT + plotH);

        const bw = Math.min(44, (plotW / bars.length) * 0.62);
        const step = plotW / bars.length;
        bars.forEach((b, i) => {
          const cx = padL + step * (i + 0.5);
          const bh = Math.max(2, (b.val / maxVal) * plotH);
          const y = padT + plotH - bh;
          c.fillStyle = b.errText ? "#f59e0b" : b.bad ? "#fb7185" : "#2ec4b6";
          c.fillRect(cx - bw / 2, y, bw, bh);
          c.fillStyle = "#e2e8f0";
          c.textAlign = "center";
          c.font = '10px "Noto Sans TC", sans-serif';
          c.fillText(b.errText ? "錯誤" : String(b.val), cx, Math.max(padT + 10, y - 4));
          c.fillText(b.name, cx, padT + plotH + 14);
        });
      };

      const render = () => {
        const validNums = [78, 84, 82, ...(st.dupRemoved ? [] : [82]), ...(st.fullWidthFixed ? [85] : []), st.outlierFixed ? 95 : 9999];
        const avg = (validNums.reduce((a, b) => a + b, 0) / validNums.length).toFixed(1);
        const cleanedCount = [st.dupRemoved, st.fullWidthFixed, st.outlierFixed].filter(Boolean).length;

        ctx.body.innerHTML = `
          <div class="mlab-guide-box">
            <b>🎯 資料清洗任務：</b>表中混入了 <b>① 重複座號列</b>、<b>② 全形數字 <code>８５</code>（無法計算）</b> 與 <b>③ 離群錯植 <code>9999</code>（紙本應為 95）</b>。請清洗全部 3 筆異常（已完成 <b>${cleanedCount}/3</b>）讓圖表恢復正常！
          </div>
          <div class="mlab-grid-2">
            <div class="mlab-panel">
              <div class="mlab-panel-title">🧹 原始問卷與成績資料表</div>
              <table class="mlab-trace-tbl">
                <thead><tr><th>座號</th><th>姓名</th><th>分數</th><th>清洗動作</th></tr></thead>
                <tbody>
                  <tr><td>01</td><td>林小宇</td><td>78</td><td>✅ 正常</td></tr>
                  <tr><td>02</td><td>張小美</td><td>84</td><td>✅ 正常</td></tr>
                  <tr><td>03</td><td>王小明</td><td>82</td><td>✅ 正常</td></tr>
                  ${st.dupRemoved ? "" : `<tr class="is-dirty"><td>03</td><td>王小明</td><td>82</td><td><button type="button" class="mlab-mini-btn is-danger" id="dtDelDup">🗑️ 刪除重複列</button></td></tr>`}
                  <tr class="${st.fullWidthFixed ? "" : "is-dirty"}">
                    <td>04</td><td>陳小華</td><td><b>${st.fullWidthFixed ? "85" : "８５ (文字)"}</b></td>
                    <td>${st.fullWidthFixed ? "✅ 已轉半形" : `<button type="button" class="mlab-mini-btn is-warn" id="dtFixFw">🔤 轉半形 85</button>`}</td>
                  </tr>
                  <tr class="${st.outlierFixed ? "" : "is-dirty"}">
                    <td>05</td><td>蔡大維</td><td><b>${st.outlierFixed ? "95" : "9999"}</b></td>
                    <td>${st.outlierFixed ? "✅ 已校正" : `<button type="button" class="mlab-mini-btn is-warn" id="dtFixOut">🧹 修正為 95</button>`}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="mlab-panel">
              <div class="mlab-panel-title">📈 即時統計圖表（目前平均值：<b>${avg} 分</b>）</div>
              <canvas id="dtCleanChart" width="340" height="200" style="width:100%;height:auto;border-radius:10px"></canvas>
              <div class="mlab-meta" style="margin-top:6px">
                ${cleanedCount === 3 ? "✅ 所有異常資料已清洗完畢，長條圖與全班平均 (84.8 分) 已恢復真實分布！" : "⚠️ 當離群值 9999 存在時，其他正常成績被壓扁成貼地細線！"}
              </div>
            </div>
          </div>
        `;
        drawChart();

        const checkAll = () => {
          render();
          if (st.dupRemoved && st.fullWidthFixed && st.outlierFixed) {
            ctx.passStage("完成重複值、全形數字與異常離群值清洗，圖表恢復正常！", true);
          }
        };
        const b1 = ctx.body.querySelector("#dtDelDup");
        if (b1) b1.addEventListener("click", () => { st.dupRemoved = true; checkAll(); });
        const b2 = ctx.body.querySelector("#dtFixFw");
        if (b2) b2.addEventListener("click", () => { st.fullWidthFixed = true; checkAll(); });
        const b3 = ctx.body.querySelector("#dtFixOut");
        if (b3) b3.addEventListener("click", () => { st.outlierFixed = true; checkAll(); });
      };
      render();
    }
  };

  /* ========================================================================
   * 7. AI 智慧島 (ai)
   *    《AI 核心實驗室：訓練集偏差診斷 × 結構化 Prompt 工程》
   * ======================================================================== */
  const LAB_AI = {
    id: "ai",
    islandName: "AI 智慧島",
    emoji: "🤖",
    accent: "#ff6fb5",
    title: "《AI 核心實驗室：訓練集偏差診斷 × 結構化 Prompt 工程》",
    objective: "診斷並修正監督式學習訓練集的資料偏差（Data Bias），並掌握降低 AI 幻覺的結構化 Prompt 四要素。",
    stages: [
      { title: "實驗 1｜監督式學習「資料偏差 Data Bias」診斷與再訓練", subtitle: "觀察 AI 過度依賴顏色特徵造成的誤判，補齊反例樣本重訓讓準確率突破 90%" },
      { title: "實驗 2｜結構化 Prompt 工程對比實驗室", subtitle: "自由開關 4 個結構化模組，比較 AI 生成結果具體度與幻覺風險指數差異" }
    ],
    mountStage(stageIdx, ctx) {
      if (stageIdx === 0) {
        const POOL = [
          { id: "p_color1", label: "🎨 彩色標籤寶特瓶", cls: "塑膠瓶", kind: "colored_plastic", helpful: true },
          { id: "g_clear1", label: "🔍 透明無色玻璃瓶", cls: "玻璃瓶", kind: "clear_glass", helpful: true },
          { id: "p_clear_extra", label: "💧 透明無標籤寶特瓶", cls: "塑膠瓶", kind: "clear_plastic", helpful: false },
          { id: "g_dark_extra", label: "🍾 深色啤酒玻璃瓶", cls: "玻璃瓶", kind: "dark_glass", helpful: false }
        ];
        const TESTS = [
          { name: "透明無標籤寶特瓶", truth: "塑膠瓶", isClear: true },
          { name: "深綠色啤酒玻璃瓶", truth: "玻璃瓶", isClear: false },
          { name: "有彩色包裝的寶特瓶", truth: "塑膠瓶", isClear: false },
          { name: "透明無色汽水玻璃瓶", truth: "玻璃瓶", isClear: true }
        ];
        const st = {
          added: new Set(),
          trainedKinds: new Set(["clear_plastic", "dark_glass"]),
          tested: false,
          retrained: false
        };

        const computeModel = () => {
          const hasBalancedPlastic = st.trainedKinds.has("colored_plastic");
          const hasBalancedGlass = st.trainedKinds.has("clear_glass");
          const balanced = hasBalancedPlastic && hasBalancedGlass;
          const partial = hasBalancedPlastic || hasBalancedGlass;
          const weights = balanced
            ? { color: 18, texture: 44, base: 38 }
            : partial
              ? { color: 56, texture: 24, base: 20 }
              : { color: 85, texture: 10, base: 5 };

          const preds = TESTS.map((t) => {
            if (balanced) return { ...t, pred: t.truth, ok: true };
            if (hasBalancedPlastic && !hasBalancedGlass) {
              // Now clear glass still misclassified as plastic!
              const pred = t.truth === "玻璃瓶" && t.isClear ? "塑膠瓶" : t.truth;
              return { ...t, pred, ok: pred === t.truth };
            }
            if (!hasBalancedPlastic && hasBalancedGlass) {
              const pred = t.truth === "塑膠瓶" && !t.isClear ? "玻璃瓶" : t.truth;
              return { ...t, pred, ok: pred === t.truth };
            }
            // Initial biased rule: clear -> 塑膠瓶, colored -> 玻璃瓶
            const pred = t.isClear ? "塑膠瓶" : "玻璃瓶";
            return { ...t, pred, ok: pred === t.truth };
          });
          const acc = Math.round((preds.filter((p) => p.ok).length / preds.length) * 100);
          return { weights, preds, acc, balanced };
        };

        const render = () => {
          const model = computeModel();
          ctx.body.innerHTML = `
            <div class="mlab-guide-box">
              <b>🎯 實驗目標：</b>初始回收分類 AI 的訓練集嚴重偏斜（塑膠瓶全透明、玻璃瓶全有色）。請先點「🧪 測試目前模型」觀察誤判，再從資料池加入正確反例樣本並按「🔄 重新訓練模型」，使測試準確率突破 <b>90%</b>！
            </div>
            <div class="mlab-grid-2">
              <div class="mlab-panel">
                <div class="mlab-panel-title">🗂️ 目前訓練資料集（已含 6 筆基礎偏差樣本 + ${st.added.size} 筆新增）</div>
                <div class="mlab-badges-inline" style="margin-bottom:8px">
                  <span class="mlab-pill">塑膠：透明無標籤 ×3</span>
                  <span class="mlab-pill">玻璃：有色深瓶 ×3</span>
                  ${Array.from(st.added).map((id) => {
                    const p = POOL.find((x) => x.id === id);
                    return `<span class="mlab-pill ok">+ ${esc(p.label)}</span>`;
                  }).join("")}
                </div>
                <div class="mlab-panel-title">📥 待標註樣本池（點擊加入 / 移除訓練集）</div>
                <div class="mlab-stack">
                  ${POOL.map((p) => {
                    const on = st.added.has(p.id);
                    return `<button type="button" class="mlab-choice ${on ? "active" : ""}" data-pool="${p.id}">
                      ${on ? "☑️ 已加入" : "➕ 加入"}：${esc(p.label)}（標註：${p.cls}）
                    </button>`;
                  }).join("")}
                </div>
                <div class="mlab-btn-row" style="margin-top:10px">
                  <button type="button" class="mlab-btn is-primary" id="aiTestBtn">🧪 測試目前模型</button>
                  <button type="button" class="mlab-btn is-accent" id="aiRetrainBtn" ${st.added.size === 0 ? "disabled" : ""}>🔄 重新訓練模型</button>
                </div>
              </div>

              <div class="mlab-panel">
                <div class="mlab-panel-title">📊 模型特徵權重儀表板</div>
                <div class="mlab-weight-list">
                  <div class="mlab-w-row">
                    <span>🎨 顏色深淺／外觀色彩</span>
                    <div class="mlab-prog-bar"><i style="width:${model.weights.color}%;background:${model.weights.color > 50 ? "#fb7185" : "#34d399"}"></i></div>
                    <b>${model.weights.color}%</b>
                  </div>
                  <div class="mlab-w-row">
                    <span>✨ 材質反光與透光紋理</span>
                    <div class="mlab-prog-bar"><i style="width:${model.weights.texture}%;background:#38bdf8"></i></div>
                    <b>${model.weights.texture}%</b>
                  </div>
                  <div class="mlab-w-row">
                    <span>🧴 瓶底結構與瓶蓋螺紋</span>
                    <div class="mlab-prog-bar"><i style="width:${model.weights.base}%;background:#a78bfa"></i></div>
                    <b>${model.weights.base}%</b>
                  </div>
                </div>
                <div class="mlab-panel-title" style="margin-top:10px">🎯 模型實測結果（準確率：<b>${st.tested ? model.acc + "%" : "未測試"}</b>）</div>
                ${st.tested ? `
                  <div class="mlab-stack">
                    ${model.preds.map((p) => `<div class="mlab-sim-item ${p.ok ? "is-ok" : "is-err"}">
                      ${p.ok ? "✅" : "❌"} <b>${esc(p.name)}</b> ➔ AI 預測：${p.pred}（正解：${p.truth}）
                    </div>`).join("")}
                  </div>
                ` : `<div class="mlab-empty-box">點擊「🧪 測試目前模型」查看分類結果。</div>`}
              </div>
            </div>
          `;

          ctx.body.querySelectorAll("[data-pool]").forEach((btn) => {
            btn.addEventListener("click", () => {
              const id = btn.dataset.pool;
              if (st.added.has(id)) st.added.delete(id);
              else st.added.add(id);
              render();
            });
          });
          ctx.body.querySelector("#aiTestBtn").addEventListener("click", () => {
            st.tested = true;
            render();
            if (model.acc >= 90 && st.retrained) {
              ctx.passStage("成功診斷資料偏差並補齊多樣化訓練集，模型準確率達 100%！");
            }
          });
          ctx.body.querySelector("#aiRetrainBtn").addEventListener("click", () => {
            st.trainedKinds = new Set(["clear_plastic", "dark_glass"]);
            st.added.forEach((id) => {
              const p = POOL.find((x) => x.id === id);
              if (p) st.trainedKinds.add(p.kind);
            });
            st.retrained = true;
            st.tested = true;
            const after = computeModel();
            render();
            if (after.acc >= 90) {
              ctx.passStage("重新訓練後特徵權重恢復平衡，測試準確率達 100%！");
            } else {
              notify(`⚠️ 重訓後準確率為 ${after.acc}%（仍受資料偏差影響），請補齊「有色寶特瓶」與「透明玻璃瓶」再重訓！`, "warn", 3200);
            }
          });
        };
        render();
        return;
      }

      // 實驗 2：結構化 Prompt 工程對比實驗室
      const MODULES = [
        { id: "role", tag: "[角色設定]", text: "你是擅長青少年視覺傳達的國中資訊科技資安講師。", spec: 18, riskDrop: 12 },
        { id: "audience", tag: "[受眾背景]", text: "海報讀者為 13–14 歲八年級學生，語氣貼近校園日常、避免枯燥說教。", spec: 18, riskDrop: 10 },
        { id: "format", tag: "[字數與格式限制]", text: "請以條列輸出「10 字內主標＋3 點行動口訣＋左圖右文海報排版建議」，總字數 180 字內。", spec: 20, riskDrop: 16 },
        { id: "guard", tag: "[禁止事項]", text: "禁止編造不存在的統計數據或法條，不確定之資料請明確標註「待查證」。", spec: 17, riskDrop: 28 }
      ];
      const st = { active: new Set(["role"]) };

      const render = () => {
        let specScore = 25;
        let riskScore = 78;
        const activeMods = MODULES.filter((m) => st.active.has(m.id));
        activeMods.forEach((m) => { specScore += m.spec; riskScore -= m.riskDrop; });
        const promptPreview = [
          "任務：請協助設計八年級資訊安全宣導海報文案與版面結構。",
          ...activeMods.map((m) => `${m.tag} ${m.text}`)
        ].join("\n");

        const structuredOut = `【${st.active.has("format") ? "主標（8字）：看清鎖頭別上當！" : "網路資訊安全宣導海報提案"}】\n` +
          (st.active.has("audience") ? "🎯 語氣風格：八年級同學最常遇到的 IG 盜號與免費點數詐騙情境：\n" : "📌 基本內容建議：\n") +
          "1. 網址零誤差：看清 g00gle 等拼字偽裝\n2. 簡訊不回傳：6 碼驗證碼絕不截圖轉傳\n3. 鎖定雙重鎖：密碼＋TOTP 驗證器最安心\n" +
          (st.active.has("format") ? "🎨 版面配置：左側放釣魚簡訊紅框警示意圖，右側放 3 點口訣色塊（共 142 字）。\n" : "（未限制格式與字數時，版面配置較鬆散且易超出海報容量）\n") +
          (st.active.has("guard") ? "🔍 查核附註：校園宣導建議引用 165 反詐騙專線（統計數字待官方網站查證後填入）。" : "⚠️ 警訊：缺乏禁止編造限制，AI 可能自行補上未經查證的百分比數據（如「94% 學生都曾...」）。");

        const allOn = activeMods.length === MODULES.length;

        ctx.body.innerHTML = `
          <div class="mlab-guide-box">
            <b>🎯 實驗目標：</b>任務為「設計八年級資安宣導海報文案與版面結構」。請自由開關以下 4 個結構化 Prompt 模組，觀察右側<b>輸出品質、具體度評分與 AI 幻覺風險</b>的變化，並啟用完整 4 模組方案通關！
          </div>
          <div class="mlab-grid-2">
            <div class="mlab-panel">
              <div class="mlab-panel-title">🧱 開關結構化 Prompt 模組（已啟用 ${activeMods.length}/4）</div>
              <div class="mlab-stack">
                ${MODULES.map((m) => {
                  const on = st.active.has(m.id);
                  return `<button type="button" class="mlab-choice ${on ? "active" : ""}" data-pmod="${m.id}">
                    <b>${on ? "✅" : "⬜"} ${esc(m.tag)}</b><br><small>${esc(m.text)}</small>
                  </button>`;
                }).join("")}
              </div>
              <div class="mlab-panel-title" style="margin-top:10px">📝 即時組裝之 Prompt 指令</div>
              <pre class="mlab-code-out">${esc(promptPreview)}</pre>
              <button type="button" class="mlab-btn is-primary" id="aiSubmitPrompt" style="width:100%;margin-top:8px">✅ 確認採用結構化 Prompt 方案</button>
            </div>

            <div class="mlab-panel">
              <div class="mlab-panel-title">📊 即時品質與幻覺指標</div>
              <div class="mlab-status-strip">
                <div class="mlab-stat-chip">🎯 具體度評分：<b>${specScore} / 100</b></div>
                <div class="mlab-stat-chip">🚨 幻覺風險：<b style="color:${riskScore <= 20 ? "#4ade80" : riskScore <= 45 ? "#fbbf24" : "#fb7185"}">${riskScore}%</b></div>
              </div>
              <div class="mlab-compare-box">
                <div class="mlab-cmp-col is-weak">
                  <b>❌ 未結構化短句：</b><small>「幫我做一張資安海報文案」</small>
                  <pre class="mlab-code-out is-danger">請大家注意網路安全！據統計有 97.3% 青少年每天上網，千萬不要點不明連結...（空泛長文 500 字、無版面建議、含疑似編造數據）</pre>
                </div>
                <div class="mlab-cmp-col is-strong">
                  <b>✨ 目前結構化 Prompt 輸出：</b>
                  <pre class="mlab-code-out ${allOn ? "is-ok" : ""}">${esc(structuredOut)}</pre>
                </div>
              </div>
            </div>
          </div>
        `;
        ctx.body.querySelectorAll("[data-pmod]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.pmod;
            if (st.active.has(id)) st.active.delete(id);
            else st.active.add(id);
            render();
          });
        });
        ctx.body.querySelector("#aiSubmitPrompt").addEventListener("click", () => {
          if (allOn) {
            ctx.passStage("成功運用四大結構化模組將具體度提升至 98 分並將幻覺風險降至 12%！", true);
          } else {
            notify(`⚠️ 目前只啟用了 ${activeMods.length}/4 個模組（具體度 ${specScore}、幻覺風險 ${riskScore}%），請開啟全部 4 個模組完成最佳化對比！`, "warn", 3200);
          }
        });
      };
      render();
    }
  };

  const LABS = {
    sys: LAB_SYS,
    citizen: LAB_CITIZEN,
    create: LAB_CREATE,
    code: LAB_CODE,
    algo: LAB_ALGO,
    data: LAB_DATA,
    ai: LAB_AI
  };

  /* ========================================================================
   * 共用實驗室掛載引擎與計時器生命周期管理
   * ======================================================================== */
  let activeCleanup = null;

  function unmount() {
    if (typeof activeCleanup === "function") {
      try { activeCleanup(); } catch {}
      activeCleanup = null;
    }
  }

  function mount(container, islandId) {
    unmount();
    if (!container) return;
    const cid = resolveIslandId(islandId);
    const lab = LABS[cid];
    if (!lab) {
      container.innerHTML = "";
      return;
    }

    const timers = new Set();
    const intervals = new Set();

    const cleanup = () => {
      timers.forEach((t) => clearTimeout(t));
      intervals.forEach((iv) => clearInterval(iv));
      timers.clear();
      intervals.clear();
    };
    activeCleanup = cleanup;

    const prog = readStageProgress();
    const completedAlready = isLabCompleted(cid);
    const totalStages = lab.stages.length;
    let currentStage = 0;
    let maxUnlocked = completedAlready ? totalStages - 1 : Math.min(totalStages - 1, Number(prog[cid]) || 0);
    let passedSet = new Set();
    if (completedAlready) {
      for (let k = 0; k < totalStages; k++) passedSet.add(k);
    } else {
      for (let k = 0; k < maxUnlocked; k++) passedSet.add(k);
    }
    let justAwarded = false;

    const renderShell = () => {
      const doneAll = isLabCompleted(cid);
      const locked = isAvatarLocked();
      const rewarded = isLabRewarded(cid);
      const stg = lab.stages[currentStage];
      const stagePassed = passedSet.has(currentStage);
      const hasNext = currentStage < totalStages - 1;
      const pillText = doneAll
        ? (rewarded
            ? "🔬 微實作大師徽章 · 已領取 +20 ⭐"
            : (locked ? "🔬 微實作大師徽章 · 鎖定前已完成（無星幣）" : "🔬 微實作大師徽章 · 僅獲得徽章（未鎖定角色無星幣）"))
        : (locked ? "⭐ 完成全部關卡可領取 +20 探索星幣" : "🔒 鎖定角色後完成可領取 +20 ⭐（目前僅累計徽章）");
      const bannerSubText = rewarded
        ? "已發放 +20 ⭐ 探索星幣至你的冒險者錢包，快去更衣室逛逛吧！"
        : (!locked
            ? "已獲得 🔬 微實作大師徽章！🔒 尚未選定專屬角色，星幣維持 0（先至「角色更衣室」鎖定角色即可開啟後續星幣累積）。"
            : "已獲得 🔬 微實作大師徽章（此關卡於鎖定角色前完成，依規則不補發星幣）。");

      container.innerHTML = `
        <section class="mlab-shell" style="--mlab-c:${lab.accent}" data-scrollable="true">
          <header class="mlab-head">
            <div class="mlab-head-top">
              <div class="mlab-brand">
                <span class="mlab-tag">${lab.emoji} ${esc(lab.islandName)}｜微實作互動實驗室</span>
                <h3 class="mlab-title">${esc(lab.title)}</h3>
              </div>
              <div class="mlab-reward-pill ${doneAll ? "is-done" : ""}">
                ${pillText}
              </div>
            </div>
            <p class="mlab-obj"><b>🎯 核心學習目標：</b>${esc(lab.objective)}</p>

            ${doneAll ? `
              <div class="mlab-congrats-banner ${justAwarded ? "is-pop" : ""}">
                <span class="mlab-master-badge">🔬 微實作大師徽章</span>
                <div>
                  <b>🎉 恭喜完成【${esc(lab.islandName)}】微實作實驗室！</b>
                  <small>${bannerSubText}</small>
                </div>
              </div>
            ` : ""}

            <div class="mlab-stage-bar">
              <div class="mlab-stage-lights" role="tablist" aria-label="實驗室關卡進度">
                ${lab.stages.map((s, idx) => {
                  const isCur = idx === currentStage;
                  const isOk = passedSet.has(idx);
                  const unlocked = idx <= maxUnlocked || doneAll;
                  return `<button type="button" class="mlab-stage-pill ${isCur ? "is-cur" : ""} ${isOk ? "is-ok" : ""}" data-stjump="${idx}" ${unlocked ? "" : "disabled"} title="${esc(s.title)}">
                    <span class="mlab-dot">${isOk ? "✔" : idx + 1}</span>
                    <span>關卡 ${idx + 1}/${totalStages}</span>
                  </button>`;
                }).join("")}
              </div>
              <button type="button" class="mlab-btn is-reset" id="mlabResetBtn">🔄 重置本關</button>
            </div>
            <div class="mlab-stage-sub">
              <b>${esc(stg.title)}</b>
              <span>${esc(stg.subtitle)}</span>
            </div>
          </header>

          <div class="mlab-workspace" id="mlabWorkspace" data-scrollable="true"></div>

          <footer class="mlab-foot" id="mlabFoot" ${stagePassed ? "" : "hidden"}>
            <div class="mlab-foot-msg" id="mlabFootMsg">
              ${stagePassed ? `✅ 本關卡挑戰成功！` : ""}
            </div>
            ${hasNext ? `<button type="button" class="mlab-btn is-accent" id="mlabNextStageBtn">➡️ 前往下一關（關卡 ${currentStage + 2}/${totalStages}）</button>` : ""}
          </footer>
        </section>
      `;

      const shellEl = container.querySelector(".mlab-shell");
      if (shellEl) {
        const stopBubble = (e) => { e.stopPropagation(); };
        shellEl.addEventListener("wheel", stopBubble, { passive: true });
        shellEl.addEventListener("touchmove", stopBubble, { passive: true });
      }

      container.querySelectorAll("[data-stjump]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.stjump);
          if (idx === currentStage) return;
          cleanup();
          currentStage = idx;
          justAwarded = false;
          renderShell();
        });
      });

      container.querySelector("#mlabResetBtn").addEventListener("click", () => {
        cleanup();
        justAwarded = false;
        renderShell();
      });

      const nextBtn = container.querySelector("#mlabNextStageBtn");
      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          cleanup();
          currentStage += 1;
          justAwarded = false;
          renderShell();
        });
      }

      const workspace = container.querySelector("#mlabWorkspace");
      const foot = container.querySelector("#mlabFoot");
      const footMsg = container.querySelector("#mlabFootMsg");

      const ctx = {
        body: workspace,
        setTimeout(fn, ms) {
          const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
          timers.add(id);
          return id;
        },
        clearTimeout(id) { timers.delete(id); window.clearTimeout(id); },
        setInterval(fn, ms) {
          const id = window.setInterval(fn, ms);
          intervals.add(id);
          return id;
        },
        clearInterval(id) { intervals.delete(id); window.clearInterval(id); },
        passStage(msg, isFinalHint = false) {
          passedSet.add(currentStage);
          if (currentStage + 1 < totalStages && maxUnlocked < currentStage + 1) {
            maxUnlocked = currentStage + 1;
            saveStageProgress(cid, maxUnlocked);
          }
          const isLast = currentStage >= totalStages - 1;
          if (isLast || isFinalHint) {
            saveStageProgress(cid, totalStages - 1);
            const res = awardLabCompletion(cid, lab.islandName);
            if (res && res.gained > 0) justAwarded = true;
            const lockedNow = isAvatarLocked();
            const rewardedNow = isLabRewarded(cid);
            // Re-render header/banner without wiping workspace result if possible, or update header slots cleanly:
            const pill = container.querySelector(".mlab-reward-pill");
            if (pill) {
              pill.classList.add("is-done");
              pill.textContent = rewardedNow
                ? "🔬 微實作大師徽章 · 已領取 +20 ⭐"
                : (lockedNow ? "🔬 微實作大師徽章 · 鎖定前已完成（無星幣）" : "🔬 微實作大師徽章 · 僅獲得徽章（未鎖定角色無星幣）");
            }
            const head = container.querySelector(".mlab-head");
            if (head && !head.querySelector(".mlab-congrats-banner")) {
              const bar = head.querySelector(".mlab-stage-bar");
              const banner = document.createElement("div");
              banner.className = "mlab-congrats-banner is-pop";
              const msgSub = rewardedNow
                ? "已發放 +20 ⭐ 探索星幣至你的冒險者錢包，快去更衣室逛逛吧！"
                : (!lockedNow
                    ? "已獲得 🔬 微實作大師徽章！🔒 尚未選定專屬角色，星幣維持 0（先至「角色更衣室」鎖定角色即可開啟後續星幣累積）。"
                    : "已獲得 🔬 微實作大師徽章（此關卡於鎖定角色前完成，依規則不補發星幣）。");
              banner.innerHTML = `<span class="mlab-master-badge">🔬 微實作大師徽章</span><div><b>🎉 恭喜完成【${esc(lab.islandName)}】微實作實驗室！</b><small>${msgSub}</small></div>`;
              head.insertBefore(banner, bar);
            }
          } else {
            notify(`🌟 關卡 ${currentStage + 1} 過關！可點擊前往下一關！`, "ok", 2600);
          }
          // Update stage light indicators
          container.querySelectorAll("[data-stjump]").forEach((b) => {
            const bi = Number(b.dataset.stjump);
            if (passedSet.has(bi)) {
              b.classList.add("is-ok");
              const dot = b.querySelector(".mlab-dot");
              if (dot) dot.textContent = "✔";
            }
            if (bi <= maxUnlocked) b.disabled = false;
          });
          if (foot && footMsg) {
            foot.hidden = false;
            footMsg.textContent = `✅ ${msg || "本關卡挑戰成功！"}`;
          }
        }
      };

      lab.mountStage(currentStage, ctx);
    };

    renderShell();
  }

  window.IslandMicroLabs = {
    resolveIslandId,
    getLabMeta: (id) => LABS[resolveIslandId(id)] || null,
    isLabCompleted,
    getCompletedIslands,
    mount,
    unmount
  };
})();
