/* 學習成果：RPG 角色紙娃娃換裝工作台 ＋ 裝備圖鑑 ＋ 資訊素養雷達圖（收合區） */
(() => {
  const ISLANDS = window.ISLANDS;
  const AV = window.AvatarSystem;
  const esc = AV.esc;
  let chart = null;
  let tab = "look";
  let armedId = null, armTimer = null;

  const TABS = [
    { id: "look", label: "💇 基礎造型" },
    { id: "easy", label: "🎩 頭飾臉飾(易)" },
    { id: "medium", label: "👕 服裝褲裙(中)" },
    { id: "hard", label: "⚔️ 武器寵物(難)" },
    { id: "star", label: "⭐ 星幣限定" }
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
        <div class="av-rpg-bars" id="avBars"></div>
        <div class="av-tabs" role="tablist" id="avTabs">${TABS.map((t) => `<button type="button" role="tab" class="av-tab" data-tab="${t.id}">${t.label}</button>`).join("")}</div>
        <div class="av-tab-hint" id="avHint"></div>
        <div class="av-grid" id="avGrid"></div>
        <details class="av-legacy" id="avLegacy">
          <summary>📊 資訊素養七向度雷達圖 ＆ 🏅 徽章牆</summary>
          <div class="res-body">
            <div class="radar-box"><canvas id="radarCanvas" aria-label="資訊素養七向度雷達圖" role="img"></canvas></div>
            <p class="res-note">每個向度對應一座島，顯示該島<b>最新一次</b>測驗得分；尚未完成測驗的島嶼以 0 分計。</p>
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

  /** 讀取 localStorage 內的測驗成績，回傳每座島最新得分（沒有則 0） */
  function islandScores() {
    const quiz = Store.events().filter((e) => e.type === "quiz");
    return ISLANDS.map((isl) => {
      const mine = quiz.filter((e) => e.island === isl.id).sort((a, b) => b.ts - a.ts);
      return { isl, done: mine.length > 0, score: mine.length ? mine[0].score : 0, latest: mine[0] || null, attempts: mine.length };
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

    const curStyle = AV.HAIR_STYLES.find((h) => h.id === st.look.hair) || AV.HAIR_STYLES[0];
    const lockArea = $("#avPresetLockArea");
    if (lockArea) {
      if (st.presetLocked) {
        lockArea.innerHTML = `<div class="av-preset-locked-badge">✅ 已選定專屬角色：<b>${esc(curStyle.name)}</b></div>`;
      } else {
        lockArea.innerHTML = `<button type="button" class="av-lock-preset-btn" id="avLockPresetBtn">🔒 確定選定此造型（選定後不可更換）</button>`;
        const lockBtn = $("#avLockPresetBtn");
        if (lockBtn) lockBtn.onclick = () => openLockConfirm(AV.getState());
      }
    }

    $("#avName").innerHTML = `<b>${esc(p.name)}</b><span>${esc(who)}</span>`;
    const t = AV.title(qs.totalScore);
    const badge = $("#avTitle");
    badge.style.setProperty("--tc", t.color);
    badge.innerHTML = `<span class="lv">Lv.${t.level}</span>${t.icon} ${esc(t.name)}`;
    $("#avTitleNext").innerHTML = t.next
      ? `<span class="track"><i style="width:${t.pct}%"></i></span><small>再 ${t.need} 分晉升「${t.next.icon} ${esc(t.next.name)}」</small>`
      : `<small>🌟 已達最高稱號，你就是資訊島的傳奇！</small>`;
    const T = AV.TIERS;
    $("#avWallet").innerHTML = ["easy", "medium", "hard"].map((k) =>
      `<span class="av-cap cap-${k}" title="通過「${T[k].diffName}」測驗累計 ${w.earned[k]} 張，已使用 ${w.used[k]} 張">🎟️ ${T[k].short}<b>${w.avail[k]}</b></span>`).join("")
      + `<span class="av-cap cap-star" title="NPC 島答對累計 ${w.coinsEarned} 枚，已花費 ${w.spent} 枚">⭐ 探索星幣<b>${w.coins}</b></span>`;
  }

  /* ---------------- 右側：RPG 戰績條 ---------------- */
  function renderBars(qs) {
    const bar = (cls, icon, label, val, max) => {
      const pct = Math.min(100, Math.round((val / Math.max(1, max)) * 100));
      return `<div class="av-bar ${cls}"><span class="lbl">${icon} ${label}</span><span class="track"><i style="width:${pct}%"></i></span><span class="val">${val}<small> / ${max}</small></span></div>`;
    };
    $("#avBars").innerHTML = bar("hp", "🏝️", "海島單元開拓", qs.cleared, qs.totalUnits)
      + bar("mp", "👑", "滿分皇冠", qs.crowns, qs.maxCrowns)
      + bar("xp", "📊", "總積分", qs.totalScore, qs.maxScore);
  }

  /* ---------------- 右側：更衣室圖鑑 ---------------- */
  function renderHint(w, st) {
    const T = AV.TIERS;
    const locked = !!(st && st.presetLocked);
    const hint = {
      look: locked
        ? "🔒 已鎖定專屬基礎角色！表情、髮色與所有已解鎖的帽子、服裝、武器與寵物仍可 100% 自由混搭。"
        : "💡 免費預覽試穿！選定喜歡的基礎角色後，請點擊左側「確定選定此造型」按鈕鎖定你的專屬角色。",
      easy: `🎟️ 每通過 1 個單元的「易」測驗獲得 1 張${T.easy.ticket}（已累計 ${w.earned.easy} 張・已用 ${w.used.easy} 張・<b>可用 ${w.avail.easy} 張</b>）`,
      medium: `🎟️ 每通過 1 個單元的「中」測驗獲得 1 張${T.medium.ticket}（已累計 ${w.earned.medium} 張・已用 ${w.used.medium} 張・<b>可用 ${w.avail.medium} 張</b>）`,
      hard: `🎟️ 每通過 1 個單元的「難」測驗獲得 1 張${T.hard.ticket}（已累計 ${w.earned.hard} 張・已用 ${w.used.hard} 張・<b>可用 ${w.avail.hard} 張</b>）`,
      star: `⭐ 到地圖上的 7 座 NPC 島參加「領航員隨堂快問快答」，每答對 1 題新題目 +${AV.COIN_PER_QUESTION} 星幣（目前 <b>${w.coins} ⭐</b>）`
    };
    $("#avHint").innerHTML = hint[tab];
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
    const locked = !!st.presetLocked;
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

  function itemCard(it, st, w) {
    const owned = st.unlocked.includes(it.id);
    const wearing = st.equipped[it.slot] === it.id;
    const T = AV.TIERS[it.tier];
    let btn, act = "", cls = "", dis = "";
    if (wearing) { btn = "✨ 裝備中"; act = "toggle"; cls = "is-wearing"; }
    else if (owned) { btn = "點擊穿戴"; act = "toggle"; cls = "is-owned"; }
    else if (it.tier === "star") {
      const can = w.coins >= it.price;
      btn = armedId === it.id ? `確定花 ${it.price} ⭐ 兌換？` : `⭐ ${it.price} 兌換`;
      act = "unlock"; cls = can ? "is-buyable" : "is-locked"; if (!can) dis = " aria-disabled=\"true\"";
    } else {
      const can = w.avail[it.tier] > 0;
      btn = armedId === it.id ? "再點一次確認解鎖" : (can ? `使用券解鎖` : `🔒 需 1 張${T.short}`);
      act = "unlock"; cls = can ? "is-buyable" : "is-locked"; if (!can) dis = " aria-disabled=\"true\"";
    }
    if (armedId === it.id) cls += " is-armed";
    return `<div class="av-card tier-${it.tier} ${cls}" data-id="${it.id}" data-act="${act}" tabindex="0" role="button" aria-label="${esc(it.name)}：${esc(btn)}">
      ${owned ? "" : `<span class="av-lock" aria-hidden="true">🔒</span>`}
      <span class="av-thumb">${AV.renderThumb(it.id, st.look)}</span>
      <div class="av-card-info">
        <b class="av-card-name">${esc(it.name)}</b>
        <div class="av-tags"><span class="av-tag ${it.style}">${it.style === "tech" ? "⚡ 科技潮酷" : "🌸 可愛療癒"}</span><span class="av-tag slot">${AV.SLOT_NAME[it.slot]}</span></div>
        <p class="av-card-desc">${esc(it.desc)}</p>
      </div>
      <span class="av-card-btn"${dis}>${btn}</span>
    </div>`;
  }

  function renderGrid(st, w) {
    const grid = $("#avGrid");
    grid.classList.toggle("is-look", tab === "look");
    if (tab === "look") { grid.innerHTML = renderLookTab(st); return; }
    grid.innerHTML = AV.ITEMS.filter((it) => it.tier === tab).map((it) => itemCard(it, st, w)).join("");
  }

  function render() {
    if (!Store.profile) return;
    const st = AV.getState(), qs = AV.quizStats(), w = AV.wallet(st, qs);
    renderStage(st, qs, w);
    renderBars(qs);
    renderHint(w, st);
    renderGrid(st, w);
    if ($("#avLegacy").open) renderLegacy();
  }

  /* ---------------- 互動：分頁 / 捏臉 / 解鎖 / 穿戴 ---------------- */
  $("#avTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".av-tab");
    if (!b) return;
    tab = b.dataset.tab; armedId = null;
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
    // 解鎖：先檢查資源，資源足夠時需「再點一次」確認（取代 confirm()）
    const w = AV.wallet();
    const enough = it.tier === "star" ? w.coins >= it.price : w.avail[it.tier] > 0;
    if (!enough) {
      AV.toast(it.tier === "star"
        ? `⭐ 探索星幣不足，還差 ${it.price - w.coins} 枚！去 NPC 島答題賺星幣吧。`
        : `🎟️ ${AV.TIERS[it.tier].ticket}不足！再通過 1 個單元的「${AV.TIERS[it.tier].diffName}」測驗即可獲得。`, "warn");
      return;
    }
    if (armedId !== id) {
      armedId = id;
      clearTimeout(armTimer);
      armTimer = setTimeout(() => { armedId = null; if (isOpen()) renderGrid(AV.getState(), AV.wallet()); }, 3500);
      renderGrid(AV.getState(), w);
      AV.toast(it.tier === "star" ? `再點一次即可花費 ${it.price} ⭐ 兌換「${it.name}」` : `再點一次即可使用 1 張${AV.TIERS[it.tier].ticket}解鎖「${it.name}」`, "info", 2200);
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
    const rows = islandScores();
    $("#resList").innerHTML = rows.map((r) => `<div class="res-row" style="--c:${r.isl.color}">
        <span class="nm">${r.isl.emoji} ${r.isl.name}</span>
        <span class="bar"><i style="width:${r.score}%"></i></span>
        <span class="sc">${r.done ? r.score + " 分" : "尚未測驗"}</span>
        <span class="meta">${r.done ? `${r.attempts} 次 · ${new Date(r.latest.ts).toLocaleDateString("zh-TW")}` : ""}</span></div>`).join("");

    const bd = Store.badges(), BG = (window.Quiz && Quiz.BADGES) || {};
    $("#resBadges").innerHTML = bd.length ? bd.sort((a, b) => b.ts - a.ts).map((b) => `<div class="res-badge b-${b.type}">
        <span class="rb-ico">${(BG[b.type] || {}).icon || "🏅"}</span>
        <div><b>${(BG[b.type] || {}).name || b.type}</b><small>${b.unitName || b.unit} · ${new Date(b.ts).toLocaleDateString("zh-TW")}</small></div></div>`).join("")
      : `<p class="res-note">還沒有徽章。在支援分級測驗的單元通過「中」可得銀色羅盤徽章、通過「難」可得金色大師徽章！</p>`;

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
          label: "最新得分", data: rows.map((r) => r.score),
          backgroundColor: "rgba(255,209,102,.30)", borderColor: "#ffd166", borderWidth: 2,
          pointBackgroundColor: rows.map((r) => r.isl.color), pointBorderColor: "#fff", pointRadius: 5, pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, aspectRatio: 1.1,
        scales: {
          r: {
            min: 0, max: 100, ticks: { stepSize: 20, color: "#a9c3dc", backdropColor: "transparent" },
            grid: { color: "rgba(255,255,255,.2)" }, angleLines: { color: "rgba(255,255,255,.2)" },
            pointLabels: { color: "#eaf4ff", font: { size: 13, weight: "600" } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.parsed.r} 分${rows[c.dataIndex].done ? "" : "（尚未測驗）"}` } }
        }
      }
    });
  }
  $("#avLegacy").addEventListener("toggle", () => { if ($("#avLegacy").open) renderLegacy(); });

  function open() {
    if (!window.Auth.requireLogin()) return;
    armedId = null;
    closeConfirm();
    wrap.hidden = false;
    wrap.classList.remove("hidden", "pointer-events-none");
    wrap.setAttribute("aria-hidden", "false");
    wrap.classList.add("show"); render();
  }
  document.getElementById("resultBtn").addEventListener("click", open);
  // 視窗開著時若有新成績或換裝變動，即時更新
  document.addEventListener("ii:quizdone", () => { if (isOpen()) render(); });
  document.addEventListener("ii:avatar-changed", () => { if (isOpen()) render(); });
  document.addEventListener("ii:logout", close);
  window.Results = { open, close, islandScores };
})();
