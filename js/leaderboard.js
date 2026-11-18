/* 各年級學生榮譽排行榜 Top 10（Google Sheets + GAS 跨電腦即時同步 + 虛擬守門員混合競爭） */
(() => {
  const GAS_LEADERBOARD_URL = (window.APP_CONFIG && window.APP_CONFIG.LEADERBOARD_URL)
    || "https://script.google.com/macros/s/AKfycbwctpDZWbnaWoAT6cyRSR6sSTxSRMbZ-7-sxlhfCOycoxhMziCZ3gF5BRkHPNCRb21U/exec";

  const esc = (s) => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /**
   * 姓名去識別化遮罩（本機備援 / 未遮罩資料保護用）：
   *   2 字：遮蔽最後一字（林希 → 林○）
   *   3 字：遮蔽中間字（王小明 → 王○明）
   *   4 字以上：遮蔽第 2 字（歐陽菲菲 → 歐○菲菲）
   */
  function maskStudentName(name) {
    const chars = Array.from(String(name || "").trim());
    if (chars.length === 0) return "匿名";
    if (chars.length === 1) return `${chars[0]}○`;
    if (chars.length === 2) return `${chars[0]}○`;
    if (chars.length === 3) return `${chars[0]}○${chars[2]}`;
    return `${chars[0]}○${chars.slice(2).join("")}`;
  }

  /** 判斷年段：701 → 7、803 → 8、905 → 9，亦支援國一/國二/國三與七/八/九格式 */
  function parseStudentGrade(profileOrCls) {
    if (window.Store && typeof window.Store.parseGradeFromCls === "function") {
      return window.Store.parseGradeFromCls(profileOrCls);
    }
    const raw = (profileOrCls && typeof profileOrCls === "object")
      ? (profileOrCls.grade || profileOrCls.cls || profileOrCls.className || "")
      : (profileOrCls || "");
    const s = String(raw).trim();
    if (/^[8]|八|^(?:國)?二/.test(s)) return 8;
    if (/^[9]|九|^(?:國)?三/.test(s)) return 9;
    return 7;
  }

  function formatClassLabel(cls) {
    const s = String(cls || "").trim();
    if (!s) return "";
    return /班$/.test(s) ? s : `${s}班`;
  }

  function getMyStudentKey(profile) {
    if (!profile) return "";
    const grade = String(parseStudentGrade(profile));
    const className = String(profile.cls || profile.className || "").trim();
    const seatNum = Number(profile.seat);
    const seat = Number.isFinite(seatNum) && seatNum > 0 ? String(seatNum) : String(profile.seat || "").trim();
    if (!className || !seat) return "";
    if (window.Store && typeof window.Store.buildStudentKey === "function") {
      return window.Store.buildStudentKey(grade, className, seat);
    }
    return `${grade}_${className}_${seat}`;
  }

  /**
   * 7 / 8 / 9 年級虛擬守門員基準名單（Gatekeepers，每級 10 筆，積分 350～1,250 分）
   * 僅供前端渲染排行榜混合競爭使用，絕對不會透過 POST 上傳至 Google Sheets。
   */
  const GATEKEEPERS = {
    7: [
      { studentKey: "gk_7_703_91", grade: "7", className: "703", seat: "91", maskedName: "陳○豪", totalScore: 1240, crownCount: 10, isGatekeeper: true },
      { studentKey: "gk_7_708_92", grade: "7", className: "708", seat: "92", maskedName: "林○穎", totalScore: 1140, crownCount: 9, isGatekeeper: true },
      { studentKey: "gk_7_701_93", grade: "7", className: "701", seat: "93", maskedName: "張○軒", totalScore: 1040, crownCount: 8, isGatekeeper: true },
      { studentKey: "gk_7_705_94", grade: "7", className: "705", seat: "94", maskedName: "黃○晴", totalScore: 950, crownCount: 7, isGatekeeper: true },
      { studentKey: "gk_7_702_95", grade: "7", className: "702", seat: "95", maskedName: "林○宇", totalScore: 860, crownCount: 6, isGatekeeper: true },
      { studentKey: "gk_7_709_96", grade: "7", className: "709", seat: "96", maskedName: "歐○語彤", totalScore: 760, crownCount: 5, isGatekeeper: true },
      { studentKey: "gk_7_704_97", grade: "7", className: "704", seat: "97", maskedName: "劉○廷", totalScore: 660, crownCount: 4, isGatekeeper: true },
      { studentKey: "gk_7_706_98", grade: "7", className: "706", seat: "98", maskedName: "蔡○蓁", totalScore: 560, crownCount: 3, isGatekeeper: true },
      { studentKey: "gk_7_710_99", grade: "7", className: "710", seat: "99", maskedName: "許○", totalScore: 460, crownCount: 2, isGatekeeper: true },
      { studentKey: "gk_7_707_100", grade: "7", className: "707", seat: "100", maskedName: "周○妍", totalScore: 360, crownCount: 1, isGatekeeper: true }
    ],
    8: [
      { studentKey: "gk_8_805_91", grade: "8", className: "805", seat: "91", maskedName: "鄭○翔", totalScore: 1250, crownCount: 10, isGatekeeper: true },
      { studentKey: "gk_8_802_92", grade: "8", className: "802", seat: "92", maskedName: "謝○晴", totalScore: 1150, crownCount: 9, isGatekeeper: true },
      { studentKey: "gk_8_807_93", grade: "8", className: "807", seat: "93", maskedName: "楊○文", totalScore: 1050, crownCount: 8, isGatekeeper: true },
      { studentKey: "gk_8_801_94", grade: "8", className: "801", seat: "94", maskedName: "王○涵", totalScore: 940, crownCount: 7, isGatekeeper: true },
      { studentKey: "gk_8_809_95", grade: "8", className: "809", seat: "95", maskedName: "曾○諺", totalScore: 850, crownCount: 6, isGatekeeper: true },
      { studentKey: "gk_8_804_96", grade: "8", className: "804", seat: "96", maskedName: "司○子涵", totalScore: 750, crownCount: 5, isGatekeeper: true },
      { studentKey: "gk_8_808_97", grade: "8", className: "808", seat: "97", maskedName: "郭○維", totalScore: 650, crownCount: 4, isGatekeeper: true },
      { studentKey: "gk_8_803_98", grade: "8", className: "803", seat: "98", maskedName: "賴○璇", totalScore: 550, crownCount: 3, isGatekeeper: true },
      { studentKey: "gk_8_810_99", grade: "8", className: "810", seat: "99", maskedName: "莊○", totalScore: 450, crownCount: 2, isGatekeeper: true },
      { studentKey: "gk_8_806_100", grade: "8", className: "806", seat: "100", maskedName: "洪○寧", totalScore: 350, crownCount: 1, isGatekeeper: true }
    ],
    9: [
      { studentKey: "gk_9_902_91", grade: "9", className: "902", seat: "91", maskedName: "蘇○澤", totalScore: 1230, crownCount: 10, isGatekeeper: true },
      { studentKey: "gk_9_906_92", grade: "9", className: "906", seat: "92", maskedName: "廖○萱", totalScore: 1130, crownCount: 9, isGatekeeper: true },
      { studentKey: "gk_9_904_93", grade: "9", className: "904", seat: "93", maskedName: "葉○傑", totalScore: 1030, crownCount: 8, isGatekeeper: true },
      { studentKey: "gk_9_901_94", grade: "9", className: "901", seat: "94", maskedName: "蔡○庭", totalScore: 930, crownCount: 7, isGatekeeper: true },
      { studentKey: "gk_9_908_95", grade: "9", className: "908", seat: "95", maskedName: "潘○均", totalScore: 840, crownCount: 6, isGatekeeper: true },
      { studentKey: "gk_9_903_96", grade: "9", className: "903", seat: "96", maskedName: "諸○宇晨", totalScore: 740, crownCount: 5, isGatekeeper: true },
      { studentKey: "gk_9_907_97", grade: "9", className: "907", seat: "97", maskedName: "呂○潔", totalScore: 640, crownCount: 4, isGatekeeper: true },
      { studentKey: "gk_9_910_98", grade: "9", className: "910", seat: "98", maskedName: "徐○翔", totalScore: 540, crownCount: 3, isGatekeeper: true },
      { studentKey: "gk_9_905_99", grade: "9", className: "905", seat: "99", maskedName: "邱○", totalScore: 440, crownCount: 2, isGatekeeper: true },
      { studentKey: "gk_9_909_100", grade: "9", className: "909", seat: "100", maskedName: "江○臻", totalScore: 350, crownCount: 1, isGatekeeper: true }
    ]
  };

  const GRADE_NAMES = { 7: "七年級", 8: "八年級", 9: "九年級" };
  const LB_CACHE_KEY = "ii:leaderboard:gas_cache_v1";
  const GAS_TIMEOUT_MS = 8000;
  let activeGrade = 7;
  let remoteCache = { 7: [], 8: [], 9: [] };
  let remoteStatus = "idle"; // "idle" | "loading" | "ok" | "error"
  let hasRemoteSnapshot = false;
  let cacheSavedAt = 0;
  let fetchSeq = 0;
  let customRemoteProvider = null;

  function loadGasCache() {
    try {
      const raw = localStorage.getItem(LB_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && typeof parsed.data === "object") {
        remoteCache = {
          7: Array.isArray(parsed.data["7"]) ? parsed.data["7"] : [],
          8: Array.isArray(parsed.data["8"]) ? parsed.data["8"] : [],
          9: Array.isArray(parsed.data["9"]) ? parsed.data["9"] : []
        };
        cacheSavedAt = Number(parsed.savedAt) || 0;
        hasRemoteSnapshot = true;
      }
    } catch {}
  }

  function saveGasCache(data) {
    try {
      cacheSavedAt = Date.now();
      localStorage.setItem(LB_CACHE_KEY, JSON.stringify({ savedAt: cacheSavedAt, data }));
    } catch {}
  }

  loadGasCache();

  function parseUpdatedAtMs(val) {
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (!val) return 0;
    const ms = Date.parse(String(val).trim().replace(" ", "T"));
    return Number.isNaN(ms) ? 0 : ms;
  }

  function normalizeEntry(row, fallbackGrade, forceGatekeeper) {
    if (!row) return null;
    const gradeNum = parseStudentGrade({
      grade: row.grade || fallbackGrade,
      cls: row.className || row.cls
    });
    const grade = String(gradeNum);
    const className = String(row.className || row.cls || "").trim();
    const seatRaw = row.seat !== undefined && row.seat !== null ? String(row.seat).trim() : "";
    const seatNum = Number(seatRaw);
    const seat = seatRaw && Number.isFinite(seatNum) && seatNum > 0 ? String(seatNum) : seatRaw;
    const isGatekeeper = !!(forceGatekeeper || row.isGatekeeper || row.isVirtual);
    const studentKey = String(row.studentKey || "").trim()
      || (isGatekeeper ? `gk_${grade}_${className}_${seat}` : `${grade}_${className}_${seat}`);
    const maskedName = row.maskedName
      ? String(row.maskedName).trim()
      : maskStudentName(row.name || "");
    const rawCrowns = row.crownCount !== undefined ? row.crownCount : row.crowns;
    const totalScore = Math.max(0, Math.round(Number(row.totalScore) || 0));
    const crownCount = Math.max(0, Math.round(Number(rawCrowns) || 0));
    const updatedAt = parseUpdatedAtMs(row.updatedAt);
    return {
      studentKey,
      grade,
      gradeNum,
      className,
      cls: className,
      seat,
      maskedName,
      name: row.name ? String(row.name).trim() : maskedName,
      totalScore,
      crownCount,
      crowns: crownCount,
      quizCount: Number(row.quizCount) || (totalScore > 0 || crownCount > 0 ? 1 : 0),
      updatedAt,
      isGatekeeper
    };
  }

  /** 排序規則：總積分高→低；同分比滿分皇冠數高→低；再同分真實學生優先於守門員 */
  function sortEntries(a, b) {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.crownCount !== a.crownCount) return b.crownCount - a.crownCount;
    const realDiff = (b.isGatekeeper ? 0 : 1) - (a.isGatekeeper ? 0 : 1);
    if (realDiff !== 0) return realDiff;
    if (a.updatedAt > 0 && b.updatedAt > 0 && a.updatedAt !== b.updatedAt) {
      return a.updatedAt - b.updatedAt;
    }
    return String(a.studentKey).localeCompare(String(b.studentKey));
  }

  /**
   * 取得指定年級合併後的完整排行榜：
   *   1. 優先採用 GAS 雲端真實學生名單（並納入尚未完成背景上傳的本機待同步最新成績）；
   *      若雲端無法連線則自動退回 localStorage 本機成績池。
   *   2. 將真實學生名單與該年級 10 位虛擬守門員合併為同一個陣列。
   *   3. 統一依 totalScore → crownCount 排序並取前 10 名；
   *      真實學生考出更高分時會自然把守門員擠出前 10 名。
   */
  function getGradeLeaderboard(grade) {
    const g = Number(grade) || 7;
    const realMap = new Map();

    const upsertReal = (rawRow) => {
      const entry = normalizeEntry(rawRow, g, false);
      if (!entry || entry.isGatekeeper || !entry.studentKey || !entry.className) return;
      const prev = realMap.get(entry.studentKey);
      if (
        !prev
        || entry.totalScore > prev.totalScore
        || (entry.totalScore === prev.totalScore && entry.crownCount > prev.crownCount)
        || (entry.totalScore === prev.totalScore && entry.crownCount === prev.crownCount && entry.updatedAt > prev.updatedAt)
      ) {
        realMap.set(entry.studentKey, entry);
      }
    };

    if (hasRemoteSnapshot) {
      const extRows = Array.isArray(remoteCache[g]) ? remoteCache[g] : [];
      extRows.forEach(upsertReal);
    } else if (window.Store && typeof window.Store.leaderboardPool === "function") {
      const localRows = window.Store.leaderboardPool(g).filter((s) => s.quizCount > 0 || s.totalScore > 0);
      localRows.forEach(upsertReal);
    }

    // 合併本機尚未送達雲端的最新待同步成績（避免交卷後立刻開榜單或離線時漏掉自己）
    if (window.Store && typeof window.Store.getPendingLeaderboardUploads === "function") {
      window.Store.getPendingLeaderboardUploads(g).forEach(upsertReal);
    }

    const realStudents = [...realMap.values()];
    const gatekeepers = (GATEKEEPERS[g] || GATEKEEPERS[7]).map((gk) => normalizeEntry(gk, g, true));

    // 真實學生與虛擬守門員合併為同一個陣列並統一排序
    const rankedPool = [...realStudents, ...gatekeepers].sort(sortEntries);
    const top10 = rankedPool.slice(0, 10);

    // 依 studentKey 比對當前登入學生名次
    const me = window.Store && window.Store.profile;
    const myStudentKey = getMyStudentKey(me);
    let meEntry = null;
    let myRank = null;
    if (me && myStudentKey) {
      const idx = rankedPool.findIndex((r) => !r.isGatekeeper && r.studentKey === myStudentKey);
      if (idx >= 0) {
        meEntry = rankedPool[idx];
        myRank = idx + 1;
      } else {
        const built = window.Store && typeof window.Store.buildLeaderboardPayload === "function"
          ? window.Store.buildLeaderboardPayload(me)
          : null;
        meEntry = {
          studentKey: myStudentKey,
          grade: String(parseStudentGrade(me)),
          gradeNum: parseStudentGrade(me),
          className: String(me.cls || "").trim(),
          seat: String(Number(me.seat) || me.seat || "").trim(),
          maskedName: maskStudentName(me.name),
          totalScore: built ? built.payload.totalScore : 0,
          crownCount: built ? built.payload.crownCount : 0,
          quizCount: built ? built.quizCount : 0,
          isGatekeeper: false
        };
        myRank = rankedPool.length + 1;
      }
    }

    return {
      grade: g,
      top10,
      rankedPool,
      realCount: realStudents.length,
      meEntry,
      myRank,
      myStudentKey
    };
  }

  /* ---- 建立動森溫暖毛玻璃排行榜視窗 ---- */
  const wrap = document.createElement("div");
  wrap.id = "leaderboardModal";
  wrap.className = "modal-wrap";
  wrap.innerHTML = `
    <div class="modal lb-modal" role="dialog" aria-modal="true" aria-labelledby="lbTitle">
      <button class="close lb-close" id="lbClose" aria-label="關閉">✕</button>
      <div class="lb-banner">
        <div class="lb-banner-sparkle" aria-hidden="true"></div>
        <div class="lb-banner-row">
          <div class="lb-title-group">
            <span class="lb-kicker">✨ ISLAND HALL OF FAME · 榮譽殿堂</span>
            <h2 id="lbTitle">🏅 各年級榮耀風雲榜</h2>
            <p id="lbSubtitle">統計各島嶼「易 / 中 / 難」最高積分與 100 分皇冠數 · 取前 10 名頒獎</p>
          </div>
          <button type="button" class="lb-to-result-btn" id="lbToResultBtn">📈 我的學習成果</button>
        </div>
      </div>

      <div class="lb-toolbar">
        <div class="lb-tabs" id="lbGradeTabs" role="tablist" aria-label="切換年級排行榜">
          <button type="button" class="lb-tab" data-grade="7" role="tab">七年級</button>
          <button type="button" class="lb-tab" data-grade="8" role="tab">八年級</button>
          <button type="button" class="lb-tab" data-grade="9" role="tab">九年級</button>
        </div>
        <span class="lb-rule-pill" id="lbPoolNote">🛡️ 隱私去識別化保護中</span>
      </div>

      <div class="lb-list-wrap">
        <div class="lb-col-head" aria-hidden="true">
          <span>名次</span>
          <span>班級與探險者</span>
          <span>滿分皇冠</span>
          <span>總積分</span>
        </div>
        <div id="lbList" class="lb-list"></div>
      </div>

      <div id="lbChaseBanner" class="lb-chase-banner" aria-live="polite"></div>
    </div>`;
  document.body.appendChild(wrap);

  const $ = (s) => wrap.querySelector(s);

  function close() {
    wrap.classList.remove("show");
  }

  $("#lbClose").onclick = close;
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrap.classList.contains("show")) close();
  });

  $("#lbToResultBtn").onclick = () => {
    close();
    if (window.Results && typeof window.Results.open === "function") {
      window.Results.open();
    }
  };

  wrap.querySelectorAll("#lbGradeTabs .lb-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeGrade = Number(btn.dataset.grade) || 7;
      fetchLeaderboardFromGAS(activeGrade);
    });
  });

  function renderRankBadge(rank) {
    if (rank === 1) return `<span class="lb-rank lb-r1">🥇 冠軍</span>`;
    if (rank === 2) return `<span class="lb-rank lb-r2">🥈 亞軍</span>`;
    if (rank === 3) return `<span class="lb-rank lb-r3">🥉 季軍</span>`;
    return `<span class="lb-rank lb-rn">第 ${rank} 名</span>`;
  }

  function renderChaseBanner(viewData) {
    const banner = $("#lbChaseBanner");
    const me = window.Store && window.Store.profile;
    if (!me) {
      banner.innerHTML = `<div class="lb-chase-main">🎒 請先辦理登島護照，就能立即累積積分挑戰 ${GRADE_NAMES[activeGrade]} 前 10 名！</div>`;
      return;
    }

    const myGrade = parseStudentGrade(me);
    const myGradeData = myGrade === viewData.grade ? viewData : getGradeLeaderboard(myGrade);
    const meEntry = myGradeData.meEntry;
    const myRank = myGradeData.myRank;
    const myScore = meEntry ? meEntry.totalScore : 0;
    const myCrowns = meEntry ? meEntry.crownCount : 0;
    const myPool = myGradeData.rankedPool;

    let slogan = "";
    if (remoteStatus === "loading" && !hasRemoteSnapshot) {
      slogan = "⏳ 正在同步全校即時戰況並計算追趕分差…";
    } else if (myRank === 1) {
      slogan = "👑 你目前已稱霸本年級風雲榜！繼續保持滿分紀錄！";
    } else if (myRank >= 2 && myRank <= 10) {
      const prevPlayer = myPool[myRank - 2];
      if (prevPlayer && prevPlayer.totalScore === myScore) {
        const crownGap = Math.max(1, prevPlayer.crownCount - myCrowns);
        slogan = `⚡ 與第 ${myRank - 1} 名同分！再多拿 <b>1</b> 分（或增加 <b>${crownGap}</b> 頂滿分皇冠）即可超越！`;
      } else {
        const gap = prevPlayer ? Math.max(1, prevPlayer.totalScore - myScore) : 1;
        slogan = `⚡ 再拿 <b>${gap}</b> 分就能超越前一名（第 ${myRank - 1} 名）！`;
      }
    } else {
      const tenthPlayer = myPool[9] || myPool[myPool.length - 1];
      if (tenthPlayer && tenthPlayer.totalScore === myScore) {
        const crownGap = Math.max(1, tenthPlayer.crownCount - myCrowns);
        slogan = `🔥 與第 10 名同分！再多拿 <b>1</b> 分（或增加 <b>${crownGap}</b> 頂滿分皇冠）即可擠進前 10 名！`;
      } else {
        const gapTo10 = tenthPlayer ? Math.max(1, tenthPlayer.totalScore - myScore) : 350;
        slogan = `🔥 距離擠進年級前 10 名還差 <b>${gapTo10}</b> 分！快去挑戰 100 分解鎖建築！`;
      }
    }

    const rankText = myRank <= 10 ? `第 <b>${myRank}</b> 名` : `暫列第 <b>${myRank}</b> 名（未進前 10 名）`;
    const viewingNote = activeGrade !== myGrade
      ? `<span class="lb-peek-tag">👀 正觀摩 ${GRADE_NAMES[activeGrade]} 榜單</span>`
      : "";

    banner.innerHTML = `
      <div class="lb-chase-top">
        <span class="lb-my-summary">🧭 ${esc(formatClassLabel(me.cls))} <b>${esc(maskStudentName(me.name))}</b>（${GRADE_NAMES[myGrade]}）· 總積分 <b>${myScore}</b> 分 · 👑 <b>${myCrowns}</b> 個滿分 · ${rankText}</span>
        ${viewingNote}
      </div>
      <div class="lb-chase-slogan">${slogan}</div>`;
  }

  function render() {
    const me = window.Store && window.Store.profile;
    const myGrade = me ? parseStudentGrade(me) : null;

    wrap.querySelectorAll("#lbGradeTabs .lb-tab").forEach((btn) => {
      const g = Number(btn.dataset.grade);
      const isMine = myGrade === g;
      btn.classList.toggle("active", g === activeGrade);
      btn.setAttribute("aria-selected", g === activeGrade ? "true" : "false");
      btn.innerHTML = `${GRADE_NAMES[g]}${isMine ? ' <span class="lb-my-grade-dot">你的年級</span>' : ""}`;
    });

    const poolNote = $("#lbPoolNote");
    const listEl = $("#lbList");

    const data = getGradeLeaderboard(activeGrade);
    if (poolNote) {
      const top10Real = data.top10.filter((e) => !e.isGatekeeper).length;
      if (remoteStatus === "loading") {
        poolNote.textContent = hasRemoteSnapshot
          ? `⚡ 秒開快取顯示 · 背景同步最新排名中…`
          : `⏳ 正在背景同步全校即時戰況…`;
      } else if (remoteStatus === "ok") {
        poolNote.textContent = top10Real >= 10
          ? `☁️ 目前即時同步 · 前 10 名全由真實學生佔據（共 ${data.realCount} 人）`
          : `☁️ 目前即時同步 · 本年級真實 ${data.realCount} 人（含守門員基準）`;
      } else {
        poolNote.textContent = hasRemoteSnapshot
          ? `📡 網路連線逾時 · 已平滑顯示快取紀錄與守門員基準`
          : `📡 離線備援模式 · 本機真實 ${data.realCount} 人（含守門員基準）`;
      }
    }

    listEl.innerHTML = data.top10.map((entry, idx) => {
      const rank = idx + 1;
      const isMe = !!(me && !entry.isGatekeeper && data.myStudentKey && entry.studentKey === data.myStudentKey);
      const tierCls = rank <= 3 ? ` lb-top-${rank}` : "";
      const meCls = isMe ? " is-me" : "";
      const displayWho = `${formatClassLabel(entry.className)} ${entry.maskedName}`;
      return `
        <div class="lb-row${tierCls}${meCls}" data-rank="${rank}" data-gatekeeper="${entry.isGatekeeper ? "1" : "0"}">
          <div class="lb-cell-rank">${renderRankBadge(rank)}</div>
          <div class="lb-cell-who">
            <span class="lb-who-text">${esc(displayWho)}</span>
            ${isMe ? '<span class="lb-me-tag">👈 我</span>' : ""}
          </div>
          <div class="lb-cell-crowns"><span class="lb-crown-pill">👑 ${entry.crownCount}</span></div>
          <div class="lb-cell-score"><b>${entry.totalScore}</b><small>分</small></div>
        </div>`;
    }).join("");

    renderChaseBanner(data);
  }

  async function fetchLeaderboardFromGAS(grade) {
    const seq = ++fetchSeq;
    remoteStatus = "loading";
    if (wrap.classList.contains("show")) render();

    // 若之前離線有待補送成績，背景嘗試補送（不阻塞 GET 拉取）
    if (window.Store && typeof window.Store.flushLeaderboardPending === "function") {
      window.Store.flushLeaderboardPending().then((flushed) => {
        if (flushed > 0 && wrap.classList.contains("show") && seq === fetchSeq) {
          fetchLeaderboardFromGAS(activeGrade);
        }
      });
    }

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), GAS_TIMEOUT_MS) : null;

    try {
      if (customRemoteProvider) {
        const rows = await customRemoteProvider(grade);
        if (seq !== fetchSeq) return;
        remoteCache[grade] = Array.isArray(rows) ? rows : [];
        hasRemoteSnapshot = true;
        remoteStatus = "ok";
        saveGasCache(remoteCache);
      } else {
        const res = await fetch(`${GAS_LEADERBOARD_URL}?t=${Date.now()}`, {
          cache: "no-store",
          signal: controller ? controller.signal : undefined
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json || json.status !== "ok" || !json.data || typeof json.data !== "object") {
          throw new Error((json && json.message) || "GAS 回應格式錯誤");
        }
        if (seq !== fetchSeq) return;
        remoteCache = {
          7: Array.isArray(json.data["7"]) ? json.data["7"] : [],
          8: Array.isArray(json.data["8"]) ? json.data["8"] : [],
          9: Array.isArray(json.data["9"]) ? json.data["9"] : []
        };
        hasRemoteSnapshot = true;
        remoteStatus = "ok";
        saveGasCache(remoteCache);
      }
    } catch (err) {
      if (seq !== fetchSeq) return;
      console.warn("拉取 GAS 即時風雲榜失敗，改用本機備份與守門員名單:", err);
      remoteStatus = "error";
    } finally {
      if (timer) clearTimeout(timer);
      if (seq === fetchSeq && wrap.classList.contains("show")) render();
    }
  }

  function open(forcedGrade) {
    if (window.Auth && !window.Auth.requireLogin()) return;
    const me = window.Store && window.Store.profile;
    activeGrade = (forcedGrade === 7 || forcedGrade === 8 || forcedGrade === 9)
      ? forcedGrade
      : parseStudentGrade(me);
    wrap.classList.add("show");
    fetchLeaderboardFromGAS(activeGrade);
  }

  const lbBtn = document.getElementById("leaderboardBtn");
  if (lbBtn) lbBtn.addEventListener("click", () => open());

  document.addEventListener("ii:quizdone", () => {
    if (wrap.classList.contains("show") && remoteStatus !== "loading") render();
  });
  document.addEventListener("ii:leaderboard-synced", () => {
    if (wrap.classList.contains("show")) fetchLeaderboardFromGAS(activeGrade);
  });
  document.addEventListener("ii:login", () => {
    if (wrap.classList.contains("show")) {
      activeGrade = parseStudentGrade(window.Store && window.Store.profile);
      fetchLeaderboardFromGAS(activeGrade);
    }
  });
  document.addEventListener("ii:logout", close);

  window.maskStudentName = maskStudentName;
  window.Leaderboard = {
    open,
    close,
    maskStudentName,
    parseStudentGrade,
    getGradeLeaderboard,
    refresh: () => fetchLeaderboardFromGAS(activeGrade),
    setRemoteProvider: (fn) => {
      customRemoteProvider = typeof fn === "function" ? fn : null;
      if (window.Store && window.Store.setRemoteLeaderboardFetcher) {
        window.Store.setRemoteLeaderboardFetcher(fn);
      }
    }
  };
})();
