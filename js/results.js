/* 學習成果：RPG 角色紙娃娃換裝工作台 ＋ 裝備圖鑑 ＋ 資訊素養雷達圖（收合區） */
(() => {
  const ISLANDS = window.ISLANDS;
  const AV = window.AvatarSystem;
  const esc = AV.esc;
  let chart = null;
  let tab = "look";
  let shopFilter = "all";
  let armedId = null, armTimer = null;

  const TABS = [
    { id: "look", label: "💇 基礎造型" },
    { id: "shop", label: "🛍️ 神裝商店" },
    { id: "quests", label: "🏆 榮譽獎勵任務" }
  ];

  const SHOP_FILTERS = [
    { id: "all", label: "🌟 全部" },
    { id: "exclusive", label: "👑 專屬裝備" },
    { id: "head", label: "🎩 頭飾" },
    { id: "top", label: "👕 服裝" },
    { id: "weapon", label: "⚔️ 手持" },
    { id: "back", label: "🪽 背飾" },
    { id: "extra", label: "🐾 寵/背/坐" }
  ];

  const wrap = document.createElement("div");
  wrap.id = "resultModal"; wrap.className = "modal-wrap hidden pointer-events-none";
  wrap.hidden = true;
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<div class="modal result-modal av-modal" role="dialog" aria-modal="true" aria-labelledby="resTitle">
    <button class="close" id="resClose" aria-label="關閉">✕</button>
    <div class="res-head av-head">
      <div class="res-head-row">
        <div><h2 id="resTitle">🧙 我的冒險角色與學習成果</h2><p id="resWho"></p></div>
        <button type="button" class="res-to-lb-btn" id="resToLbBtn">🏅 切換年級風雲榜</button>
      </div>
    </div>
    <div class="av-workbench">
      <section class="av-stage-col" aria-label="角色展示台">
        <div class="av-stage" id="avStage"></div>
        <div class="av-preset-lock-area" id="avPresetLockArea"></div>
        <div class="av-idcard">
          <div class="av-name" id="avName"></div>
          <div class="av-title-badge" id="avTitle"></div>
          <div class="av-title-next" id="avTitleNext"></div>
        </div>
        <div class="av-wallet" id="avWallet"></div>
        <button type="button" class="av-download-btn" id="avDownloadBtn">📸 下載角色戰績卡</button>
      </section>
      <section class="av-side-col" aria-label="戰績與更衣室">
        <div id="avDressingLockBanner" class="av-lock-status-banner" hidden></div>
        <div class="av-rpg-bars" id="avBars"></div>
        <div class="av-tabs" role="tablist" id="avTabs">${TABS.map((t) => `<button type="button" role="tab" class="av-tab" data-tab="${t.id}">${t.label}</button>`).join("")}</div>
        <div class="av-shop-filters" id="avShopFilters" hidden>${SHOP_FILTERS.map((f) => `<button type="button" class="av-filter-pill" data-filter="${f.id}">${f.label}</button>`).join("")}</div>
        <div class="av-tab-hint" id="avHint"></div>
        <div class="av-grid" id="avGrid"></div>
        <details class="av-legacy" id="avLegacy">
          <summary>📊 資訊素養七向度雷達圖 ＆ 🏅 徽章牆</summary>
          <div class="res-body">
            <div id="resBadgesLockBanner" class="av-lock-status-banner" hidden></div>
            <div class="radar-box"><canvas id="radarCanvas" aria-label="資訊素養七向度雷達圖" role="img"></canvas></div>
            <p class="res-note">每個向度對應一座島，顯示該島的<b>測驗完成度（%）</b>（依各單元易／中／難及格通關數 ÷ 總關卡數計算；「🔬 微實作已通關」徽章獨立計算，不覆蓋測驗百分比）。</p>
            <div id="resList" class="res-list"></div>
            <h3>🏅 我的徽章牆</h3>
            <div id="resBadges" class="res-badges"></div>
          </div>
        </details>
      </section>
    </div>
    <div class="av-confirm-backdrop hidden pointer-events-none" id="avLockConfirmModal" role="dialog" aria-modal="true" aria-labelledby="avLockConfirmTitle" hidden>
      <div class="av-confirm-card">
        <h3 id="avLockConfirmTitle">🔒 確定選定專屬角色？</h3>
        <div class="av-confirm-preview" id="avLockConfirmPreview"></div>
        <p class="av-confirm-msg" id="avLockConfirmMsg"></p>
        <div class="av-confirm-actions">
          <button type="button" class="av-confirm-cancel" id="avLockCancelBtn">先再看看</button>
          <button type="button" class="av-confirm-ok" id="avLockOkBtn">🔒 確定鎖定</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  const $ = (s) => wrap.querySelector(s);
  const isOpen = () => wrap.classList.contains("show");
  const isConfirmOpen = () => {
    const cm = $("#avLockConfirmModal");
    return !!(cm && !cm.hidden && cm.classList.contains("show"));
  };
  const closeConfirm = () => {
    const cm = $("#avLockConfirmModal");
    if (!cm) return;
    cm.classList.remove("show");
    cm.classList.add("hidden", "pointer-events-none");
    cm.hidden = true;
  };
  const close = () => {
    closeConfirm();
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
    document.dispatchEvent(new CustomEvent("ii:modalclosed", { detail: { id: "resultModal" } }));
  };
  $("#resClose").onclick = close;
  $("#resToLbBtn").onclick = () => {
    close();
    if (window.Leaderboard && typeof window.Leaderboard.open === "function") window.Leaderboard.open();
  };
  $("#avLockCancelBtn").onclick = closeConfirm;
  $("#avLockConfirmModal").addEventListener("click", (e) => {
    if (e.target === $("#avLockConfirmModal")) closeConfirm();
  });
  $("#avLockOkBtn").onclick = () => {
    const st = AV.getState();
    const styleObj = AV.HAIR_STYLES.find((h) => h.id === st.look.hair) || AV.HAIR_STYLES[0];
    const r = AV.lockPreset();
    closeConfirm();
    if (r && r.ok) {
      AV.toast(`🎉 已確定選定「${styleObj.name}」為你的專屬造型！`, "ok", 3000);
      if (typeof window.confetti === "function") { try { window.confetti({ particleCount: 55, spread: 70, origin: { y: 0.55 } }); } catch {} }
    }
  };
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  document.addEventListener("keydown", (e) => {
    if (window.isTeacherCockpitOpen && window.isTeacherCockpitOpen()) return;
    if (e.key === "Escape") {
      if (isConfirmOpen()) {
        e.preventDefault();
        closeConfirm();
      } else if (isOpen()) {
        e.preventDefault();
        close();
      }
    }
  });

  /** 讀取測驗紀錄並透過完成度計算中心統一計算每座島完成度（%）與通關關卡數 */
  function islandScores() {
    const quiz = Store.profile ? Store.events().filter((e) => e && e.type === "quiz") : [];
    const cc = window.CompletionCenter;
    return ISLANDS.map((isl) => {
      const mine = quiz.filter((e) => {
        const u = cc && typeof cc.canonicalizeUnitId === "function"
          ? cc.canonicalizeUnitId(e.unit || e.unitId || "")
          : String(e.unit || e.unitId || "");
        return e.island === isl.id || u.split("-")[0] === isl.id;
      }).sort((a, b) => b.ts - a.ts);
      const comp = typeof window.calculateIslandCompletion === "function"
        ? window.calculateIslandCompletion(isl.id, quiz)
        : { islandId: isl.id, totalUnits: (isl.sequence || []).length, totalStages: (isl.sequence || []).length * 3, passedStages: 0, percentage: 0 };
      const labDone = typeof AV.isMicroLabCompleted === "function" && AV.isMicroLabCompleted(isl.id);
      return {
        isl,
        completion: comp,
        percentage: comp.percentage,
        passedStages: comp.passedStages,
        totalStages: comp.totalStages,
        done: mine.length > 0 || comp.passedStages > 0,
        score: comp.percentage,
        latest: mine[0] || null,
        attempts: mine.length,
        labDone
      };
    });
  }

  /* ---------------- 左側：角色展示台 ---------------- */
  function openLockConfirm(st) {
    const styleObj = AV.HAIR_STYLES.find((h) => h.id === st.look.hair) || AV.HAIR_STYLES[0];
    $("#avLockConfirmPreview").innerHTML = AV.renderLookThumb(st.look);
    $("#avLockConfirmMsg").textContent = `確定要選定【${styleObj.name}】作為你的專屬造型嗎？選定後基礎角色將永久鎖定，但之後仍可自由更換帽子、衣服、武器、寵物與表情！`;
    const cm = $("#avLockConfirmModal");
    if (cm) {
      cm.hidden = false;
      cm.classList.remove("hidden", "pointer-events-none");
      cm.classList.add("show");
    }
  }

  function renderStage(st, qs, w) {
    const p = Store.profile;
    const g = { 7: "七", 8: "八", 9: "九" }[String(p.cls)[0]] || "";
    const who = `${g}年${+String(p.cls).slice(1)}班 ${p.seat}號`;
    $("#resWho").textContent = `${p.name} · ${who}`;
    const stage = $("#avStage");
    stage.innerHTML = AV.renderAvatar(st, { cls: "av-stage-svg", label: `${p.name} 的 Q 版角色` });
    stage.classList.remove("pop"); void stage.offsetWidth; stage.classList.add("pop");

    const isLocked = typeof AV.isAvatarLocked === "function"
      ? AV.isAvatarLocked(st)
      : Boolean(st && st.presetLocked === true && st.presetId);
    const curStyle = AV.HAIR_STYLES.find((h) => h.id === st.look.hair) || AV.HAIR_STYLES[0];
    const lockArea = $("#avPresetLockArea");
    if (lockArea) {
      if (isLocked) {
        lockArea.innerHTML = `<div class="av-preset-locked-badge">✅ 已選定專屬角色：<b>${esc(curStyle.name)}</b></div>`;
      } else {
        lockArea.innerHTML = `<button type="button" class="av-lock-preset-btn" id="avLockPresetBtn">🔒 確定選定此造型（選定後不可更換）</button>`;
        const lockBtn = $("#avLockPresetBtn");
        if (lockBtn) lockBtn.onclick = () => openLockConfirm(AV.getState());
      }
    }

    $("#avName").innerHTML = `<b>${esc(p.name)}</b><span>${esc(who)}</span>`;
    const t = AV.title(qs.totalScore);
    const citadelHonors = typeof AV.getCitadelHonorsSummary === "function"
      ? AV.getCitadelHonorsSummary(st.citadelTokens || [])
      : { titles: [] };
    const badge = $("#avTitle");
    badge.style.setProperty("--tc", t.color);
    const extraTitlesHtml = (citadelHonors.titles || []).map((ct) => `<span class="av-citadel-title-pill">${ct.icon} ${esc(ct.name)}</span>`).join("");
    badge.innerHTML = `<span class="lv">Lv.${t.level}</span>${t.icon} ${esc(t.name)}${extraTitlesHtml}`;
    $("#avTitleNext").innerHTML = t.next
      ? `<span class="track"><i style="width:${t.pct}%"></i></span><small>再 ${t.need} 分晉升「${t.next.icon} ${esc(t.next.name)}」</small>`
      : `<small>🌟 已達最高稱號，你就是資訊島的傳奇！</small>`;
    const T = AV.TIERS;
    $("#avWallet").innerHTML = ["easy", "medium", "hard"].map((k) =>
      `<span class="av-cap cap-${k}" title="通過「${T[k].diffName}」測驗累計 ${w.earned[k]} 張，已使用 ${w.used[k]} 張">🎟️ ${T[k].short}<b>${w.avail[k]}</b></span>`).join("")
      + `<span class="av-cap cap-star" title="累積總星幣 ${w.coinsEarned} 枚（含榮譽獎勵 +${w.bonusCoinsEarned || 0} ⭐），已花費 ${w.spent} 枚">⭐ 探索星幣<b>${w.coins}</b></span>`;
  }

  /* ---------------- 右側：RPG 戰績條 ---------------- */
  function renderBars(qs) {
    const bar = (cls, icon, label, val, max, explicitPct) => {
      const pct = explicitPct !== undefined
        ? explicitPct
        : Math.min(100, Math.round((val / Math.max(1, max)) * 100));
      return `<div class="av-bar ${cls}"><span class="lbl">${icon} ${label}</span><span class="track"><i style="width:${pct}%"></i></span><span class="val">${val}<small> / ${max}</small></span></div>`;
    };
    const totalStages = qs.totalStages || (qs.totalUnits * 3);
    const passedStages = qs.passedStages ?? 0;
    const compPct = qs.completionPct ?? 0;
    $("#avBars").innerHTML = bar("hp", "🏝️", `全島關卡完成度 (${compPct}%)`, passedStages, totalStages, compPct)
      + bar("mp", "👑", "滿分皇冠", qs.crowns, qs.maxCrowns)
      + bar("xp", "📊", "總積分", qs.totalScore, qs.maxScore);
  }

  /* ---------------- 右側：更衣室與學習成果鎖定提示橫幅 ---------------- */
  function checkAvatarLocked(st) {
    return typeof AV.isAvatarLocked === "function"
      ? AV.isAvatarLocked(st)
      : Boolean(st && st.presetLocked === true && st.presetId);
  }

  function renderLockBanners(st) {
    const locked = checkAvatarLocked(st);
    const dressingBanner = $("#avDressingLockBanner");
    if (dressingBanner) {
      if (locked) {
        dressingBanner.hidden = true;
        dressingBanner.innerHTML = "";
      } else {
        dressingBanner.hidden = false;
        dressingBanner.innerHTML = `
          <div class="av-lsb-body">
            <div class="av-lsb-title">🔒 目前為「僅累積徽章模式（星幣與兌換券為 0）」</div>
            <p class="av-lsb-desc">尚未選定並鎖定專屬角色前，測驗與任務僅記錄進度與發放徽章；選定鎖定後，往後完成的任務才會開始累積星幣與兌換券（鎖定前已完成項目不補發）。</p>
          </div>
          <div class="av-lsb-actions">
            ${tab !== "look" ? `<button type="button" class="av-lsb-btn" id="avBannerToLookBtn">💇 前往選角</button>` : ""}
            <button type="button" class="av-lsb-btn is-primary" id="avBannerLockNowBtn">🔒 鎖定目前角色</button>
          </div>
        `;
        const toLookBtn = $("#avBannerToLookBtn");
        if (toLookBtn) {
          toLookBtn.onclick = () => {
            tab = "look";
            armedId = null;
            render();
          };
        }
        const lockNowBtn = $("#avBannerLockNowBtn");
        if (lockNowBtn) {
          lockNowBtn.onclick = () => openLockConfirm(AV.getState());
        }
      }
    }

    const legacyBanner = $("#resBadgesLockBanner");
    if (legacyBanner) {
      if (locked) {
        legacyBanner.hidden = true;
        legacyBanner.innerHTML = "";
      } else {
        legacyBanner.hidden = false;
        legacyBanner.innerHTML = `
          <div class="av-lsb-body">
            <div class="av-lsb-title">🔒 目前為「僅累積徽章模式（星幣與兌換券為 0）」</div>
            <p class="av-lsb-desc">學習進度與徽章皆已正常保留！請先至「角色更衣室 → 基礎造型」選定專屬角色並鎖定，即可開啟後續星幣與兌換券累積。</p>
          </div>
          <div class="av-lsb-actions">
            <button type="button" class="av-lsb-btn is-primary" id="resBannerGoLookBtn">🧙 立即前往選角</button>
          </div>
        `;
        const goLookBtn = $("#resBannerGoLookBtn");
        if (goLookBtn) {
          goLookBtn.onclick = () => {
            tab = "look";
            armedId = null;
            render();
            const sideCol = $(".av-side-col");
            if (sideCol && typeof sideCol.scrollIntoView === "function") {
              sideCol.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          };
        }
      }
    }
  }

  /* ---------------- 右側：更衣室圖鑑 ---------------- */
  function renderHint(w, st) {
    const T = AV.TIERS;
    const locked = checkAvatarLocked(st);
    const lockPrefix = locked ? "" : "🔒 尚未鎖定角色（僅累積徽章模式，目前餘額為 0）｜";
    const presetStyle = locked ? (AV.HAIR_STYLES.find((h) => h.id === st.presetId) || null) : null;
    const hint = {
      look: locked
        ? "🔒 已鎖定專屬基礎角色！表情、髮色與所有已解鎖的專屬／共同裝備皆可 100% 自由混搭。"
        : "💡 免費預覽試穿！選定喜歡的基礎角色後，請點擊左側「確定選定此造型」按鈕鎖定你的專屬角色，開啟星幣與兌換券累積。",
      shop: `${lockPrefix}🛍️ 目前可用：<b>${w.coins} ⭐</b> · 🎟️ 初階 <b>${w.avail.easy}</b> · 進階 <b>${w.avail.medium}</b> · 大師 <b>${w.avail.hard}</b>${presetStyle ? ` ｜ 👑 已解鎖「${esc(presetStyle.name)}」專屬神裝商店` : " ｜ 🔒 鎖定專屬角色後解鎖對應 4 款專屬神裝"}`,
      quests: `${lockPrefix}🏆 完成連續滿分、全難度制霸、島嶼通關與微實作里程碑可領取大量額外星幣與大師券（單一關卡重複刷分不計入連勝）。`
    };
    $("#avHint").innerHTML = hint[tab] || hint.look;
    const filterBar = $("#avShopFilters");
    if (filterBar) {
      filterBar.hidden = tab !== "shop";
      filterBar.querySelectorAll(".av-filter-pill").forEach((b) => {
        const active = b.dataset.filter === shopFilter;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
    wrap.querySelectorAll(".av-tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function lookCard(group, val, name, thumb, on, lockState = "") {
    const lockedOther = lockState === "locked";
    const chosenLocked = lockState === "chosen";
    const badgeHtml = chosenLocked
      ? `<span class="av-look-badge is-chosen">✅ 已選定專屬角色</span>`
      : lockedOther
        ? `<span class="av-look-badge is-locked">🔒 已鎖定</span>`
        : "";
    return `<button type="button" class="av-look-card${on ? " on" : ""}${lockedOther ? " is-preset-locked" : ""}${chosenLocked ? " is-preset-chosen" : ""}" data-look="${group}" data-val="${val}" aria-pressed="${on}">
      ${badgeHtml}<span class="av-thumb">${thumb}</span><span class="av-look-name">${esc(name)}</span></button>`;
  }
  function renderLookTab(st) {
    const look = st.look;
    const locked = checkAvatarLocked(st);
    const maleHairs = AV.HAIR_STYLES.filter((h) => h.group === "male");
    const femaleHairs = AV.HAIR_STYLES.filter((h) => h.group === "female");
    const cardColor = (h) => (look.hair === h.id ? look.hairColor : (h.defaultColor || look.hairColor));
    const cardLockState = (h) => (!locked ? "" : (look.hair === h.id ? "chosen" : "locked"));
    const subHint = locked ? "基礎角色已鎖定" : "點選預覽並至左側確認鎖定";
    return `<div class="av-look">
      <h4>👦 男生造型 <small class="av-look-sub">${subHint}</small></h4><div class="av-look-row">${maleHairs.map((h) => lookCard("hair", h.id, h.name, AV.renderLookThumb({ ...look, hair: h.id, hairColor: cardColor(h) }), look.hair === h.id, cardLockState(h))).join("")}</div>
      <h4>👧 女生造型 <small class="av-look-sub">${subHint}</small></h4><div class="av-look-row">${femaleHairs.map((h) => lookCard("hair", h.id, h.name, AV.renderLookThumb({ ...look, hair: h.id, hairColor: cardColor(h) }), look.hair === h.id, cardLockState(h))).join("")}</div>
      <h4>🎨 髮色 <small class="av-look-sub">隨時可自由微調</small></h4><div class="av-look-row swatches">${AV.HAIR_COLORS.map((h) => `<button type="button" class="av-swatch${look.hairColor === h.id ? " on" : ""}" data-look="hairColor" data-val="${h.id}" aria-pressed="${look.hairColor === h.id}">
        <i style="background:linear-gradient(135deg, ${h.top}, ${h.c} 48%, ${h.bot || h.s})"></i>${esc(h.name)}</button>`).join("")}</div>
      <h4>😊 公仔表情 <small class="av-look-sub">5 款自由切換</small></h4><div class="av-look-row">${AV.FACES.map((f) => lookCard("face", f.id, f.name, AV.renderLookThumb({ ...look, face: f.id }), look.face === f.id)).join("")}</div>
    </div>`;
  }

  function formatCostBadge(cost, T) {
    const parts = [];
    if (cost.coins > 0) parts.push(`⭐ ${cost.coins}`);
    if (cost.voucherType && cost.vouchers > 0) {
      parts.push(`🎟️ ${cost.vouchers} ${T[cost.voucherType].short}`);
    }
    return parts.join(" ＋ ") || "免費";
  }

  function matchesShopFilter(it, filterId, st) {
    if (it.exclusiveFor && !(typeof AV.isItemExclusiveAllowed === "function" && AV.isItemExclusiveAllowed(it, st))) {
      return false;
    }
    switch (filterId) {
      case "exclusive": return Boolean(it.exclusiveFor);
      case "head": return it.slot === "head" || it.slot === "face";
      case "top": return it.slot === "top" || it.slot === "bottom";
      case "weapon": return it.slot === "weapon";
      case "back": return it.slot === "outer" || it.slot === "aura";
      case "extra": return it.slot === "pet" || it.slot === "bg" || it.slot === "mount";
      default: return true;
    }
  }

  function itemCard(it, st, w) {
    const owned = st.unlocked.includes(it.id);
    const wearing = st.equipped[it.slot] === it.id;
    const T = AV.TIERS;
    const cost = typeof AV.getItemCost === "function" ? AV.getItemCost(it) : { coins: Number(it.price) || 0, voucherType: it.tier === "star" ? "" : it.tier, vouchers: it.tier === "star" ? 0 : 1 };
    const costText = formatCostBadge(cost, T);
    let btn, act = "", cls = "", dis = "";
    if (wearing) { btn = "✨ 裝備中"; act = "toggle"; cls = "is-wearing"; }
    else if (owned) { btn = "點擊穿戴"; act = "toggle"; cls = "is-owned"; }
    else {
      const canCoins = w.coins >= cost.coins;
      const canVouchers = !cost.voucherType || (w.avail[cost.voucherType] || 0) >= cost.vouchers;
      const can = canCoins && canVouchers;
      btn = armedId === it.id ? `確定花 ${costText} 兌換？` : (can ? `兌換（${costText}）` : `🔒 ${costText}`);
      act = "unlock"; cls = can ? "is-buyable" : "is-locked"; if (!can) dis = " aria-disabled=\"true\"";
    }
    if (armedId === it.id) cls += " is-armed";
    const exclusiveTag = it.exclusiveFor
      ? `<span class="av-tag exclusive">👑 ${esc(it.characterName || "專屬")}神裝</span>`
      : "";
    return `<div class="av-card tier-${it.tier}${it.exclusiveFor ? " is-exclusive" : ""} ${cls}" data-id="${it.id}" data-act="${act}" tabindex="0" role="button" aria-label="${esc(it.name)}：${esc(btn)}">
      ${owned ? "" : `<span class="av-lock" aria-hidden="true">🔒</span>`}
      <span class="av-thumb">${AV.renderThumb(it.id, st.look)}</span>
      <div class="av-card-info">
        <b class="av-card-name">${esc(it.name)}</b>
        <div class="av-tags">${exclusiveTag}<span class="av-tag ${it.style}">${it.style === "tech" ? "⚡ 科技潮酷" : "🌸 可愛療癒"}</span><span class="av-tag slot">${AV.SLOT_NAME[it.slot]}</span></div>
        <p class="av-card-desc">${esc(it.desc)}</p>
      </div>
      <span class="av-card-btn"${dis}>${btn}</span>
    </div>`;
  }

  function renderQuestsTab(st) {
    const bp = typeof AV.getBonusProgress === "function" ? AV.getBonusProgress(st) : null;
    if (!bp) return `<p class="res-note">暫無法載入榮譽獎勵進度。</p>`;
    const pPct = Math.min(100, Math.round((bp.perfectStreak.current / bp.perfectStreak.target) * 100));
    const hPct = Math.min(100, Math.round((bp.highScoreStreak.current / bp.highScoreStreak.target) * 100));
    const lockNotice = bp.locked
      ? ""
      : `<div class="av-quest-lock-note">🔒 目前尚未鎖定專屬角色：以下僅預覽目標與進度。請先至「💇 基礎造型」選定並鎖定角色，往後新完成的挑戰才會累計額外星幣與大師券！</div>`;
    const formatStageList = (arr) => arr.length
      ? arr.map((tok) => `<code>${esc(tok)}</code>`).join(" ")
      : `<span class="av-q-empty">尚無累積關卡</span>`;

    return `<div class="av-quests">
      ${lockNotice}
      <div class="av-quest-summary">
        <span>🏆 已領取額外獎勵總計：<b>+${bp.totalBonusCoins} ⭐ 星幣</b>${bp.totalBonusHardVouchers > 0 ? ` ＋ <b>+${bp.totalBonusHardVouchers} 🎟️ 大師券</b>` : ""}</span>
      </div>

      <div class="av-quest-grid">
        <article class="av-quest-card is-streak">
          <div class="av-qc-head">
            <b>🔥 三連滿分王</b>
            <span class="av-qc-reward">+50 ⭐ 星幣（可重複）</span>
          </div>
          <p class="av-qc-desc">連續通過 <b>3 個不同關卡</b>（<code>unitId:difficulty</code> 不可與本輪重複）且皆獲得 <b>100 分</b>；任一次未達 100 分連勝歸零。</p>
          <div class="av-qc-bar"><i style="width:${pPct}%"></i><span>${bp.perfectStreak.current} / ${bp.perfectStreak.target} 關</span></div>
          <div class="av-qc-meta">本輪已計數：${formatStageList(bp.perfectStreak.stages)} ｜ 已觸發 <b>${bp.perfectStreak.triggerCount}</b> 次</div>
        </article>

        <article class="av-quest-card is-streak">
          <div class="av-qc-head">
            <b>⚡ 五連高分衝刺</b>
            <span class="av-qc-reward">+40 ⭐ 星幣（可重複）</span>
          </div>
          <p class="av-qc-desc">連續通過 <b>5 個不同關卡</b>且皆達 <b>80 分</b>以上（重複同關不累計）；任一次低於 80 分歸零。</p>
          <div class="av-qc-bar is-cyan"><i style="width:${hPct}%"></i><span>${bp.highScoreStreak.current} / ${bp.highScoreStreak.target} 關</span></div>
          <div class="av-qc-meta">本輪已計數：${formatStageList(bp.highScoreStreak.stages)} ｜ 已觸發 <b>${bp.highScoreStreak.triggerCount}</b> 次</div>
        </article>

        <article class="av-quest-card">
          <div class="av-qc-head">
            <b>🎯 單元全難度制霸</b>
            <span class="av-qc-reward">+35 ⭐ / 單元</span>
          </div>
          <p class="av-qc-desc">單一學習單元的「易、中、難」三難度全數拿下 100 分（每單元限領 1 次）。</p>
          <div class="av-qc-stat">目前達成 <b>${bp.unitMastery.perfectUnitCount} / ${bp.unitMastery.totalUnits}</b> 單元 · 鎖定後已領取 <b>${bp.unitMastery.claimedCount}</b> 次</div>
        </article>

        <article class="av-quest-card">
          <div class="av-qc-head">
            <b>🔬 實驗室探索達人</b>
            <span class="av-qc-reward">+50 ⭐ / +120 ⭐ + 1 大師券</span>
          </div>
          <p class="av-qc-desc">累計完成主題島微實作實驗室即可領取里程碑獎勵（目前 <b>${bp.labMilestones.labCount} / 7</b> 座島）。</p>
          <div class="av-qc-milestones">
            <span class="av-qm-pill ${bp.labMilestones.lab3Claimed ? "is-done" : ""}">3 島 +50 ⭐ · ${bp.labMilestones.lab3Claimed ? "✅ 已領取" : (bp.labMilestones.lab3PreLock ? "鎖定前達成" : (bp.labMilestones.labCount >= 3 ? "待鎖定/結算" : `${bp.labMilestones.labCount}/3`))}</span>
            <span class="av-qm-pill ${bp.labMilestones.lab7Claimed ? "is-done" : ""}">全 7 島 +120 ⭐ + 1 大師券 · ${bp.labMilestones.lab7Claimed ? "✅ 已領取" : (bp.labMilestones.lab7PreLock ? "鎖定前達成" : (bp.labMilestones.labCount >= 7 ? "待鎖定/結算" : `${bp.labMilestones.labCount}/7`))}</span>
          </div>
        </article>
      </div>

      <h4 class="av-quest-sub">🏝️ 七大主題島制霸一覽（100% 通關 <b>+80 ⭐</b> · 全皇冠大滿貫 <b>+150 ⭐ ＋ 1 大師券</b>）</h4>
      <div class="av-island-quest-list">
        ${bp.islandClear.perIsland.map((isl) => `
          <div class="av-iq-row" style="--iq-c:${isl.color}">
            <div class="av-iq-name">${isl.emoji} <b>${esc(isl.name)}</b> <small>${isl.percentage}% (${isl.passedStages}/${isl.totalStages} 關 · 滿分單元 ${isl.perfectUnits}/${isl.totalUnits})</small></div>
            <div class="av-iq-pills">
              <span class="av-iq-pill ${isl.clearedClaimed ? "is-done" : (isl.clearedDone ? "is-pre" : "")}">🏝️ 100% 通關 +80 ⭐ ${isl.clearedClaimed ? "✅ 已領" : (isl.clearedPreLock ? "🔒 鎖定前達成" : "未達標")}</span>
              <span class="av-iq-pill ${isl.grandSlamClaimed ? "is-done" : (isl.grandSlamDone ? "is-pre" : "")}">👑 全皇冠 +150 ⭐ +1 大師券 ${isl.grandSlamClaimed ? "✅ 已領" : (isl.grandSlamPreLock ? "🔒 鎖定前達成" : "未達標")}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </div>`;
  }

  function renderGrid(st, w) {
    const grid = $("#avGrid");
    grid.classList.toggle("is-look", tab === "look");
    grid.classList.toggle("is-quests", tab === "quests");
    if (tab === "look") { grid.innerHTML = renderLookTab(st); return; }
    if (tab === "quests") { grid.innerHTML = renderQuestsTab(st); return; }
    const filtered = AV.ITEMS.filter((it) => matchesShopFilter(it, shopFilter, st));
    if (shopFilter === "exclusive" && !checkAvatarLocked(st)) {
      grid.innerHTML = `<div class="av-shop-empty-lock">🔒 請先至「💇 基礎造型」選定並鎖定專屬角色，即可解鎖並購買該角色的 4 款專屬神裝！<br><button type="button" class="av-lsb-btn is-primary" id="avEmptyGoLookBtn">🧙 立即前往選角</button></div>`;
      const goBtn = $("#avEmptyGoLookBtn");
      if (goBtn) {
        goBtn.onclick = () => { tab = "look"; armedId = null; render(); };
      }
      return;
    }
    if (filtered.length === 0) {
      grid.innerHTML = `<div class="av-shop-empty-lock">目前此分類暫無可顯示的裝備，試試切換其他分類吧！</div>`;
      return;
    }
    // 專屬神裝優先排在前面，其次依價格由低到高排列
    const sorted = filtered.slice().sort((a, b) => {
      const aEx = a.exclusiveFor ? 0 : 1;
      const bEx = b.exclusiveFor ? 0 : 1;
      if (aEx !== bEx) return aEx - bEx;
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    });
    grid.innerHTML = sorted.map((it) => itemCard(it, st, w)).join("");
  }

  function render() {
    if (!Store.profile) return;
    const st = AV.getState(), qs = AV.quizStats(), w = AV.wallet(st, qs);
    renderStage(st, qs, w);
    renderLockBanners(st);
    renderBars(qs);
    renderHint(w, st);
    renderGrid(st, w);
    if ($("#avLegacy").open) renderLegacy();
  }

  /* ---------------- 互動：分頁 / 分類篩選 / 捏臉 / 解鎖 / 穿戴 ---------------- */
  $("#avTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".av-tab");
    if (!b) return;
    tab = b.dataset.tab; armedId = null;
    const st = AV.getState(), w = AV.wallet(st);
    renderLockBanners(st); renderHint(w, st); renderGrid(st, w);
  });
  $("#avShopFilters").addEventListener("click", (e) => {
    const f = e.target.closest(".av-filter-pill");
    if (!f) return;
    shopFilter = f.dataset.filter || "all";
    armedId = null;
    const st = AV.getState(), w = AV.wallet(st);
    renderHint(w, st); renderGrid(st, w);
  });

  function handleCard(card) {
    const id = card.dataset.id, act = card.dataset.act;
    const it = AV.ITEM_MAP[id];
    if (!it) return;
    if (act === "toggle") {
      armedId = null;
      const r = AV.toggleEquip(id);
      if (r.ok) AV.toast(r.equipped ? `✨ 已穿戴「${it.name}」` : `👋 已卸下「${it.name}」`, "ok", 1800);
      return;
    }
    const stNow = AV.getState();
    if (!checkAvatarLocked(stNow)) {
      AV.toast("🔒 請先至「💇 基礎造型」選定並鎖定專屬角色，往後過關才會累積星幣與兌換券來解鎖裝備！", "warn", 3200);
      return;
    }
    if (it.exclusiveFor && !(typeof AV.isItemExclusiveAllowed === "function" && AV.isItemExclusiveAllowed(it, stNow))) {
      AV.toast(`🔒 此為「${it.characterName || "專屬角色"}」限定神裝，僅對應角色可購買！`, "warn", 3200);
      return;
    }
    // 解鎖：先檢查資源（星幣與兌換券須同時滿足），足夠時需「再點一次」確認（取代 confirm()）
    const w = AV.wallet(stNow);
    const cost = typeof AV.getItemCost === "function" ? AV.getItemCost(it) : { coins: Number(it.price) || 0, voucherType: it.tier === "star" ? "" : it.tier, vouchers: it.tier === "star" ? 0 : 1 };
    const lackCoins = cost.coins > w.coins ? (cost.coins - w.coins) : 0;
    const lackVouchers = (cost.voucherType && cost.vouchers > (w.avail[cost.voucherType] || 0))
      ? (cost.vouchers - (w.avail[cost.voucherType] || 0))
      : 0;
    if (lackCoins > 0 || lackVouchers > 0) {
      const lacks = [];
      if (lackCoins > 0) lacks.push(`⭐ 星幣還差 ${lackCoins} 枚`);
      if (lackVouchers > 0) lacks.push(`🎟️ ${AV.TIERS[cost.voucherType].short}還差 ${lackVouchers} 張`);
      AV.toast(`無法兌換「${it.name}」：${lacks.join("、")}！`, "warn");
      return;
    }
    if (armedId !== id) {
      armedId = id;
      clearTimeout(armTimer);
      armTimer = setTimeout(() => { armedId = null; if (isOpen()) renderGrid(AV.getState(), AV.wallet()); }, 3500);
      renderGrid(AV.getState(), w);
      const costText = formatCostBadge(cost, AV.TIERS);
      AV.toast(`再點一次即可花費 ${costText} 解鎖「${it.name}」`, "info", 2400);
      return;
    }
    armedId = null; clearTimeout(armTimer);
    const r = AV.unlock(id);
    if (r.ok) {
      AV.toast(`🎉 成功解鎖「${it.name}」並立即穿上！`, "ok");
      if (typeof window.confetti === "function") { try { window.confetti({ particleCount: 70, spread: 75, origin: { y: 0.55 } }); } catch {} }
    } else {
      AV.toast(r.msg, "warn");
      render();
    }
  }
  $("#avGrid").addEventListener("click", (e) => {
    const lk = e.target.closest("[data-look]");
    if (lk) {
      const r = AV.setLook(lk.dataset.look, lk.dataset.val);
      if (r && !r.ok && r.msg) AV.toast(r.msg, "warn", 3200);
      return;
    }
    const card = e.target.closest(".av-card");
    if (card) handleCard(card);
  });
  $("#avGrid").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".av-card");
    if (card) { e.preventDefault(); handleCard(card); }
  });

  $("#avDownloadBtn").addEventListener("click", async () => {
    const btn = $("#avDownloadBtn");
    btn.disabled = true; btn.textContent = "⏳ 戰績卡繪製中…";
    try {
      const ok = await AV.downloadCard();
      if (ok) AV.toast("📸 角色戰績卡已下載！快去收藏或分享吧", "ok");
    } catch (err) {
      console.warn(err);
      AV.toast("戰績卡產生失敗，請稍後再試一次", "warn");
    } finally {
      btn.disabled = false; btn.textContent = "📸 下載角色戰績卡";
    }
  });

  /* ---------------- 收合區：雷達圖與徽章牆 ---------------- */
  function renderLegacy() {
    const st = AV.getState();
    renderLockBanners(st);
    const rows = islandScores();
    $("#resList").innerHTML = rows.map((r) => `<div class="res-row" style="--c:${r.isl.color}">
        <span class="nm">${r.isl.emoji} ${r.isl.name}</span>
        <span class="bar"><i style="width:${r.percentage}%"></i></span>
        <span class="sc">${r.percentage}% (${r.passedStages}/${r.totalStages} 關)</span>
        <span class="meta">${r.attempts ? `${r.attempts} 次挑戰` : "尚未測驗"}${r.latest ? ` · ${new Date(r.latest.ts).toLocaleDateString("zh-TW")}` : ""}${r.labDone ? " · 🔬 微實作已通關" : ""}</span></div>`).join("");

    const bd = Store.badges(), BG = (window.Quiz && Quiz.BADGES) || {};
    const labIds = typeof AV.getCompletedMicroLabs === "function" ? AV.getCompletedMicroLabs() : [];
    const labBadgesHtml = labIds.map((id) => {
      const isl = ISLANDS.find((x) => x.id === id);
      const label = isl ? `${isl.emoji} ${isl.name}` : id;
      const rewarded = typeof AV.isMicroLabRewarded === "function" ? AV.isMicroLabRewarded(id) : checkAvatarLocked(st);
      const subText = rewarded
        ? `${esc(label)} · 已領取 +${AV.LAB_COIN_REWARD || 20} ⭐`
        : `${esc(label)} · 僅紀錄徽章（鎖定角色前完成）`;
      return `<div class="res-badge b-microlab"><span class="rb-ico">🔬</span><div><b>微實作大師徽章</b><small>${subText}</small></div></div>`;
    }).join("");
    const quizBadgesHtml = bd.sort((a, b) => b.ts - a.ts).map((b) => `<div class="res-badge b-${b.type}">
        <span class="rb-ico">${(BG[b.type] || {}).icon || "🏅"}</span>
        <div><b>${(BG[b.type] || {}).name || b.type}</b><small>${b.unitName || b.unit} · ${new Date(b.ts).toLocaleDateString("zh-TW")}</small></div></div>`).join("");
    $("#resBadges").innerHTML = (labBadgesHtml || quizBadgesHtml)
      ? (labBadgesHtml + quizBadgesHtml)
      : `<p class="res-note">還沒有徽章。在支援分級測驗的單元通過「中」可得銀色羅盤徽章、通過「難」可得金色大師徽章，或完成各島「延伸探索」微實作實驗室拿微實作大師徽章！</p>`;

    if (typeof Chart === "undefined") {
      $(".radar-box").innerHTML = `<p class="err">圖表函式庫載入失敗，請檢查網路連線後重新整理。</p>`; return;
    }
    if (chart) chart.destroy();
    const ctx = $("#radarCanvas").getContext("2d");
    chart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: rows.map((r) => r.isl.name),
        datasets: [{
          label: "島嶼完成度 (%)", data: rows.map((r) => r.percentage),
          backgroundColor: "rgba(255,209,102,.30)", borderColor: "#ffd166", borderWidth: 2,
          pointBackgroundColor: rows.map((r) => r.isl.color), pointBorderColor: "#fff", pointRadius: 5, pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, aspectRatio: 1.1,
        scales: {
          r: {
            min: 0, max: 100, ticks: { stepSize: 20, color: "#a9c3dc", backdropColor: "transparent", callback: (v) => `${v}%` },
            grid: { color: "rgba(255,255,255,.2)" }, angleLines: { color: "rgba(255,255,255,.2)" },
            pointLabels: { color: "#eaf4ff", font: { size: 13, weight: "600", family: "'Noto Sans TC', sans-serif" } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => {
                const r = rows[c.dataIndex];
                return ` 完成度 ${r.percentage}%（${r.passedStages} / ${r.totalStages} 關）`;
              }
            }
          }
        }
      }
    });
  }
  $("#avLegacy").addEventListener("toggle", () => { if ($("#avLegacy").open) renderLegacy(); });

  function open(initialTab) {
    if (!window.Auth.requireLogin()) return;
    if (typeof initialTab === "string") {
      if (TABS.some((t) => t.id === initialTab)) {
        tab = initialTab;
      } else if (initialTab === "easy" || initialTab === "medium" || initialTab === "hard" || initialTab === "star") {
        tab = "shop";
        shopFilter = initialTab === "easy" ? "head" : (initialTab === "medium" ? "top" : (initialTab === "hard" ? "weapon" : "all"));
      }
    }
    armedId = null;
    closeConfirm();
    wrap.hidden = false;
    wrap.classList.remove("hidden", "pointer-events-none");
    wrap.setAttribute("aria-hidden", "false");
    wrap.classList.add("show"); render();
  }
  document.getElementById("resultBtn").addEventListener("click", () => open());
  // 視窗開著時若有新成績或換裝變動，即時更新
  document.addEventListener("ii:quizdone", () => { if (isOpen()) render(); });
  document.addEventListener("ii:avatar-changed", () => { if (isOpen()) render(); });
  document.addEventListener("ii:citadel-updated", () => { if (isOpen()) render(); });
  document.addEventListener("ii:login", () => { if (isOpen()) render(); });
  document.addEventListener("ii:logout", () => {
    if (chart) { chart.destroy(); chart = null; }
    close();
  });
  window.Results = { open, close, islandScores };
})();
