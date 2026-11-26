/* ==========================================================================
 * 天穹試煉浮島（Aether Citadel）系統主控模組
 * --------------------------------------------------------------------------
 * - 統一呼叫全站權威 window.calculateIslandCompletion() 檢核七大島嶼是否皆 >= 80%
 * - 支援教師戰情室「⚡ 臨時開放天穹浮島（課堂演示／競賽培訓模式）」即時覆寫開關
 * - 兩階段互動視窗：
 *     1) 未達標：守門衛士阿爾法攔截對話 ＋ 七島試煉結界檢核陣（圓形進度環 ＋ 前往衝刺飛往該島）
 *     2) 首次達標：結界解除儀式（記錄 citadel:unlocked 至本機與雲端）＋ 開啟雙殿堂主畫面
 *        - 左殿：🧠 運算思維互動道場（window.ComputationalDojo）
 *        - 右殿：🕵️ 跨島綜合解謎檔案室（window.CapstoneCases）
 * ========================================================================== */
(() => {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let activeHall = "dojo"; // "dojo" | "capstone"
  let tempCeremonyShown = false;
  let dojoLoadPromise = null;
  let capstoneLoadPromise = null;
  let hallMountSeq = 0;

  function loadComputationalDojo() {
    if (window.ComputationalDojo && typeof window.ComputationalDojo.mount === "function") {
      return Promise.resolve(window.ComputationalDojo);
    }
    if (!dojoLoadPromise) {
      dojoLoadPromise = import("./computationalDojo.js").then(() => window.ComputationalDojo);
    }
    return dojoLoadPromise;
  }

  function loadCapstoneCases() {
    if (window.CapstoneCases && typeof window.CapstoneCases.mount === "function") {
      return Promise.resolve(window.CapstoneCases);
    }
    if (!capstoneLoadPromise) {
      capstoneLoadPromise = import("./capstoneCases.js").then(() => window.CapstoneCases);
    }
    return capstoneLoadPromise;
  }

  function computePct(passed, total) {
    if (window.CompletionCenter && typeof window.CompletionCenter.computeCompletionPercentage === "function") {
      return window.CompletionCenter.computeCompletionPercentage(passed, total);
    }
    if (total <= 0 || passed <= 0) return 0;
    if (passed >= total) return 100;
    return Math.min(99, Math.round((passed / total) * 100));
  }

  function isTeacherTempUnlocked() {
    if (window.CloudConfig && typeof window.CloudConfig.isCitadelTempUnlocked === "function") {
      return window.CloudConfig.isCitadelTempUnlocked();
    }
    if (window.CloudConfig && typeof window.CloudConfig.get === "function") {
      return Boolean(window.CloudConfig.get().unlockCitadel);
    }
    return false;
  }

  function getCitadelTokens() {
    if (window.Store && typeof window.Store.getCitadelTokens === "function") {
      return window.Store.getCitadelTokens();
    }
    if (window.AvatarSystem && typeof window.AvatarSystem.getState === "function") {
      return window.AvatarSystem.getState().citadelTokens || [];
    }
    return [];
  }

  function checkAccess(progressOverride) {
    const islands = Array.isArray(window.ISLANDS) ? window.ISLANDS.slice(0, 7) : [];
    const hasOverride = progressOverride !== undefined;
    const progressState = hasOverride
      ? progressOverride
      : (window.Store && window.Store.profile && typeof window.Store.events === "function" ? window.Store.events() : []);

    const items = islands.map((isl) => {
      const comp = typeof window.calculateIslandCompletion === "function"
        ? window.calculateIslandCompletion(isl.id, progressState)
        : { islandId: isl.id, islandName: isl.name, totalStages: (isl.sequence || []).length * 3, passedStages: 0, percentage: 0 };
      const totalStages = Number(comp.totalStages) || 0;
      const passedStages = Number(comp.passedStages) || 0;
      const percentage = Number(comp.percentage) || 0;
      let targetPassed = 0;
      while (targetPassed < totalStages && computePct(targetPassed, totalStages) < 80) {
        targetPassed++;
      }
      const needStages = percentage >= 80 ? 0 : Math.max(1, targetPassed - passedStages);
      return {
        id: isl.id,
        name: isl.name,
        emoji: isl.emoji || "🏝️",
        color: isl.color || "#38bdf8",
        totalStages,
        passedStages,
        percentage,
        met: percentage >= 80,
        needStages
      };
    });

    const metCount = items.filter((it) => it.met).length;
    const allSevenAt80 = items.length >= 7 && metCount === items.length;
    const teacherTempOpen = isTeacherTempUnlocked();
    return {
      unlocked: allSevenAt80 || teacherTempOpen,
      allSevenAt80,
      teacherTempOpen,
      metCount,
      totalCount: items.length,
      items
    };
  }

  /* ---- DOM 建置：天穹試煉浮島視窗 ---- */
  const wrap = document.createElement("div");
  wrap.id = "aetherCitadelModal";
  wrap.className = "modal-wrap hidden pointer-events-none";
  wrap.hidden = true;
  wrap.setAttribute("aria-hidden", "true");
  wrap.setAttribute("data-scrollable", "true");
  wrap.innerHTML = `
    <div class="modal citadel-modal" id="citadelDialog" role="dialog" aria-modal="true" aria-labelledby="citadelModalTitle" data-scrollable="true">
      <button type="button" class="close citadel-close" id="citadelCloseBtn" aria-label="關閉">✕</button>
      <div id="citadelBody" class="citadel-body" data-scrollable="true"></div>
    </div>
  `;
  document.body.appendChild(wrap);

  const dialog = wrap.querySelector("#citadelDialog");
  const bodyEl = wrap.querySelector("#citadelBody");

  const stopScrollBubble = (e) => e.stopPropagation();
  [wrap, dialog, bodyEl].forEach((el) => {
    if (!el) return;
    el.addEventListener("wheel", stopScrollBubble, { passive: true });
    el.addEventListener("touchmove", stopScrollBubble, { passive: true });
  });

  function isOpen() {
    return wrap.classList.contains("show") && !wrap.hidden;
  }

  function close() {
    hallMountSeq++;
    if (window.ComputationalDojo && typeof window.ComputationalDojo.unmount === "function") {
      window.ComputationalDojo.unmount();
    }
    if (window.CapstoneCases && typeof window.CapstoneCases.unmount === "function") {
      window.CapstoneCases.unmount();
    }
    wrap.classList.remove("show");
    wrap.classList.add("hidden", "pointer-events-none");
    wrap.hidden = true;
    wrap.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (window.__island3D && typeof window.__island3D.resumeMainMapControls === "function") {
      window.__island3D.resumeMainMapControls();
    } else if (typeof window.resumeMainMapControls === "function") {
      window.resumeMainMapControls();
    }
    document.dispatchEvent(new CustomEvent("ii:modalclosed", { detail: { id: "aetherCitadelModal" } }));
    if (window.__island3D && typeof window.__island3D.updateAetherCitadelArchitecture === "function") {
      window.__island3D.updateAetherCitadelArchitecture({ animate: true });
    } else if (typeof window.updateAetherCitadelArchitecture === "function") {
      window.updateAetherCitadelArchitecture({ animate: true });
    }
  }

  wrap.querySelector("#citadelCloseBtn").addEventListener("click", close);
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });
  document.addEventListener("keydown", (e) => {
    if (window.isTeacherCockpitOpen && window.isTeacherCockpitOpen()) return;
    if (e.key === "Escape" && isOpen()) {
      e.preventDefault();
      close();
    }
  });

  function renderLockedGatekeeper(access) {
    const r = 26;
    const c = 2 * Math.PI * r;
    bodyEl.innerHTML = `
      <div class="citadel-gate-wrap">
        <div class="citadel-guard-banner">
          <div class="citadel-guard-avatar" aria-hidden="true">🤖🛡️</div>
          <div class="citadel-guard-speech">
            <span class="citadel-kicker">🔒 天穹結界封印中 · 全息機關守衛．阿爾法</span>
            <h2 id="citadelModalTitle">天穹試煉浮島（Aether Citadel）</h2>
            <blockquote>「凡人止步！天穹試煉需匯聚七大領域八成以上的智慧結晶，方能承受高維邏輯的考驗。」</blockquote>
            <div class="citadel-gate-progress-pill">
              七島試煉結界檢核陣：已達標 <b>${access.metCount}</b> / ${access.totalCount} 座島（門檻 80%）
            </div>
          </div>
        </div>

        <div class="citadel-rune-grid" data-scrollable="true">
          ${access.items.map((it) => {
            const pct = Math.min(100, Math.max(0, it.percentage));
            const offset = c * (1 - pct / 100);
            const ringColor = it.met ? "#34d399" : "#f59e0b";
            return `
              <article class="citadel-rune-card ${it.met ? "is-lit" : "is-locked"}" style="--isl-c:${esc(it.color)}">
                <div class="citadel-ring-wrap">
                  <svg viewBox="0 0 68 68" class="citadel-ring-svg" aria-hidden="true">
                    <circle cx="34" cy="34" r="${r}" class="ring-bg" />
                    <circle cx="34" cy="34" r="${r}" class="ring-fg" style="stroke:${ringColor};stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${offset.toFixed(1)}" />
                  </svg>
                  <div class="citadel-ring-pct"><b>${pct}%</b></div>
                </div>
                <div class="citadel-rune-info">
                  <div class="citadel-rune-title">${esc(it.emoji)} ${esc(it.name)}</div>
                  <div class="citadel-rune-meta">已通過：<b>${it.passedStages} / ${it.totalStages}</b> 關</div>
                  ${it.met
                    ? `<div class="citadel-rune-status is-lit">🟢 符文已亮燈 · 已達 80% 結界門檻</div>`
                    : `<div class="citadel-rune-status is-locked">🔒 還差 <b>${it.needStages}</b> 關達 80%</div>
                       <button type="button" class="citadel-sprint-btn" data-fly-island="${esc(it.id)}">🚀 前往衝刺</button>`
                  }
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    `;

    const gridEl = bodyEl.querySelector(".citadel-rune-grid");
    if (gridEl) {
      gridEl.addEventListener("wheel", stopScrollBubble, { passive: true });
      gridEl.addEventListener("touchmove", stopScrollBubble, { passive: true });
    }

    bodyEl.querySelectorAll("[data-fly-island]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const islId = btn.dataset.flyIsland;
        close();
        const mapChip = document.querySelector('#viewChips [data-view="map"]');
        if (mapChip && !mapChip.classList.contains("active")) {
          mapChip.click();
        }
        if (window.__island3D && typeof window.__island3D.flyToIsland === "function") {
          window.__island3D.flyToIsland(islId);
        } else if (window.__island3D && typeof window.__island3D.focusIsland === "function") {
          window.__island3D.focusIsland(islId);
        }
      });
    });
  }

  function renderTwinHalls(access) {
    const tokens = getCitadelTokens();
    const coins = (window.AvatarSystem && typeof window.AvatarSystem.wallet === "function")
      ? window.AvatarSystem.wallet().coins
      : 0;
    const honors = (window.AvatarSystem && typeof window.AvatarSystem.getCitadelHonorsSummary === "function")
      ? window.AvatarSystem.getCitadelHonorsSummary(tokens)
      : { titles: [], dojoPassed: [], capstonePassed: [] };

    bodyEl.innerHTML = `
      <div class="citadel-hall-shell">
        <div class="citadel-hall-hero">
          <div class="citadel-hero-left">
            <span class="citadel-kicker">✨ 天穹試煉浮島 · 全息機關守衛．阿爾法歡迎登島</span>
            <h2 id="citadelModalTitle">🏛️ Aether Citadel 雙殿堂試煉場</h2>
            ${access.teacherTempOpen && !access.allSevenAt80
              ? `<div class="citadel-demo-badge">⚡ 教師已開啟「臨時開放天穹浮島（課堂演示／競賽培訓模式）」</div>`
              : `<div class="citadel-unlocked-badge">🌟 七大島嶼智慧結晶皆達 80% · 天穹結界已永久解封</div>`}
          </div>
          <div class="citadel-hero-stats">
            <div class="citadel-stat-pill">⭐ 探索星幣：<b id="citadelCoinsVal">${coins}</b></div>
            <div class="citadel-stat-pill">🧠 道場：<b id="citadelDojoCount">${honors.dojoPassed.length}</b> / 4</div>
            <div class="citadel-stat-pill">🕵️ 檔案室：<b id="citadelCapCount">${honors.capstonePassed.length}</b> / 2</div>
            ${honors.titles.map((t) => `<div class="citadel-title-chip">${t.icon} ${esc(t.name)}</div>`).join("")}
          </div>
        </div>

        <div class="citadel-hall-tabs" role="tablist">
          <button type="button" class="citadel-hall-tab ${activeHall === "dojo" ? "is-active" : ""}" data-hall="dojo" role="tab" aria-selected="${activeHall === "dojo"}">
            <span>🧠 左殿：運算思維互動道場</span>
            <small>4 大高難度演算法盤面（+30 ⭐／關）</small>
          </button>
          <button type="button" class="citadel-hall-tab ${activeHall === "capstone" ? "is-active" : ""}" data-hall="capstone" role="tab" aria-selected="${activeHall === "capstone"}">
            <span>🕵️ 右殿：跨島綜合解謎檔案室</span>
            <small>2 大 Clue-Chaining 動態線索案件（+50 ⭐／案）</small>
          </button>
        </div>

        <div id="citadelHallMount" class="citadel-hall-mount" data-scrollable="true"></div>
      </div>
    `;

    const hallMount = bodyEl.querySelector("#citadelHallMount");
    if (hallMount) {
      hallMount.addEventListener("wheel", stopScrollBubble, { passive: true });
      hallMount.addEventListener("touchmove", stopScrollBubble, { passive: true });
    }

    const syncStatsHeader = () => {
      const nextTokens = getCitadelTokens();
      const nextCoins = (window.AvatarSystem && typeof window.AvatarSystem.wallet === "function")
        ? window.AvatarSystem.wallet().coins
        : 0;
      const nextHonors = (window.AvatarSystem && typeof window.AvatarSystem.getCitadelHonorsSummary === "function")
        ? window.AvatarSystem.getCitadelHonorsSummary(nextTokens)
        : { titles: [], dojoPassed: [], capstonePassed: [] };
      const cEl = bodyEl.querySelector("#citadelCoinsVal");
      const dEl = bodyEl.querySelector("#citadelDojoCount");
      const pEl = bodyEl.querySelector("#citadelCapCount");
      if (cEl) cEl.textContent = String(nextCoins);
      if (dEl) dEl.textContent = String(nextHonors.dojoPassed.length);
      if (pEl) pEl.textContent = String(nextHonors.capstonePassed.length);
      const statsWrap = bodyEl.querySelector(".citadel-hero-stats");
      if (statsWrap) {
        statsWrap.querySelectorAll(".citadel-title-chip").forEach((n) => n.remove());
        nextHonors.titles.forEach((t) => {
          const sp = document.createElement("div");
          sp.className = "citadel-title-chip";
          sp.textContent = `${t.icon} ${t.name}`;
          statsWrap.appendChild(sp);
        });
      }
    };

    const mountActiveHall = async () => {
      const seq = ++hallMountSeq;
      if (window.ComputationalDojo && typeof window.ComputationalDojo.unmount === "function") {
        window.ComputationalDojo.unmount();
      }
      if (window.CapstoneCases && typeof window.CapstoneCases.unmount === "function") {
        window.CapstoneCases.unmount();
      }
      const hall = activeHall;
      const readyObj = hall === "dojo" ? window.ComputationalDojo : window.CapstoneCases;
      if (readyObj && typeof readyObj.mount === "function") {
        readyObj.mount(hallMount, { onProgress: syncStatsHeader });
        return;
      }
      hallMount.innerHTML = `<div class="citadel-loading-box">⏳ 正在載入${hall === "dojo" ? "運算思維互動道場（4 大演算法盤面）" : "跨島綜合解謎檔案室（2 大實戰案件）"}…</div>`;
      try {
        const mod = hall === "dojo" ? await loadComputationalDojo() : await loadCapstoneCases();
        if (!isOpen() || seq !== hallMountSeq || activeHall !== hall) return;
        if (mod && typeof mod.mount === "function") {
          mod.mount(hallMount, { onProgress: syncStatsHeader });
        }
      } catch (err) {
        if (hall === "dojo") dojoLoadPromise = null;
        else capstoneLoadPromise = null;
        if (!isOpen() || seq !== hallMountSeq || activeHall !== hall) return;
        console.error("[aetherCitadel] 動態載入殿堂模組失敗:", err);
        hallMount.innerHTML = `<div class="citadel-loading-box is-error">
          <p>⚠️ 模組載入失敗，請檢查網路連線後重試。</p>
          <button type="button" class="citadel-sprint-btn" id="citadelHallRetryBtn">🔄 重新載入</button>
        </div>`;
        const retryBtn = hallMount.querySelector("#citadelHallRetryBtn");
        if (retryBtn) retryBtn.addEventListener("click", () => { void mountActiveHall(); });
      }
    };

    bodyEl.querySelectorAll(".citadel-hall-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.dataset.hall === "capstone" ? "capstone" : "dojo";
        if (next === activeHall) return;
        activeHall = next;
        bodyEl.querySelectorAll(".citadel-hall-tab").forEach((b) => {
          const on = b.dataset.hall === activeHall;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-selected", String(on));
        });
        mountActiveHall();
      });
    });

    mountActiveHall();
  }

  function renderUnlockCeremony(access) {
    if (access.allSevenAt80 && window.Store && typeof window.Store.recordCitadelToken === "function") {
      window.Store.recordCitadelToken("citadel:unlocked");
    }
    tempCeremonyShown = true;
    if (typeof window.confetti === "function") {
      try {
        window.confetti({ particleCount: 110, spread: 95, origin: { y: 0.5 }, colors: ["#38bdf8", "#ffd166", "#34d399", "#c084fc"] });
      } catch {}
    }

    bodyEl.innerHTML = `
      <div class="citadel-ceremony">
        <div class="citadel-ceremony-crest">✨🏛️✨</div>
        <h2 id="citadelModalTitle">天穹結界解除儀式！</h2>
        <p>${access.allSevenAt80
          ? "七大知識領域智慧結晶已全部匯聚完畢！全息機關守衛．阿爾法已降下能量護盾，島下垂直傳送光束與懸空星階已為你正式啟動！"
          : "教師已啟動「課堂演示／競賽培訓模式」，全息機關守衛．阿爾法已臨時敞開天穹傳送拱門！"}</p>
        <button type="button" class="citadel-enter-btn" id="citadelEnterHallsBtn">🚀 踏入天穹試煉雙殿堂</button>
      </div>
    `;
    const timer = setTimeout(() => {
      if (isOpen() && bodyEl.querySelector(".citadel-ceremony")) {
        renderTwinHalls(access);
      }
    }, 1800);
    const enterBtn = bodyEl.querySelector("#citadelEnterHallsBtn");
    if (enterBtn) {
      enterBtn.addEventListener("click", () => {
        clearTimeout(timer);
        renderTwinHalls(access);
      });
    }
  }

  function open(opts = {}) {
    if (opts.hall === "dojo" || opts.hall === "capstone") {
      activeHall = opts.hall;
    }
    const access = checkAccess();
    const tokens = getCitadelTokens();
    const alreadyUnlocked = tokens.includes("citadel:unlocked");

    wrap.hidden = false;
    wrap.classList.remove("hidden", "pointer-events-none");
    wrap.setAttribute("aria-hidden", "false");
    wrap.classList.add("show");

    if (!access.unlocked) {
      renderLockedGatekeeper(access);
    } else if ((access.allSevenAt80 && !alreadyUnlocked) || (!access.allSevenAt80 && access.teacherTempOpen && !tempCeremonyShown)) {
      renderUnlockCeremony(access);
    } else {
      renderTwinHalls(access);
    }

    if (window.__island3D && typeof window.__island3D.syncCitadelState === "function") {
      window.__island3D.syncCitadelState();
    }
  }

  window.AetherCitadel = {
    open,
    close,
    isOpen,
    checkAccess,
    isTeacherTempUnlocked
  };
})();
