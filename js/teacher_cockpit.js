/* 教師戰情室（Teacher Cockpit）：多校多師登入與註冊開通 + 學生入口 QR Code + 名冊管理 + 抓漏雷達 + 3D 舞台遙控 + 高頻錯題投影 */
import QRCode from "qrcode";

(() => {
  const SESSION_KEY = "ii:teacher_cockpit_pwd";
  const LEGACY_TEACHER_SESSION_KEY = "ii:teacher_cockpit_session_v2";
  const TEACHER_SESSION_KEY = "island_teacher_session";
  const TEACHER_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
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

  const UNIT_ALIAS_GROUPS = [
    ["sys", "hw"],
    ["code", "prog"],
    ["algo", "alg"],
    ["citizen", "sec"]
  ];
  const CANONICAL_ISLAND_MAP = {
    hw: "sys",
    prog: "code",
    alg: "algo",
    sec: "citizen"
  };

  function getMergedContentMap() {
    const merged = {};
    const sources = [
      window.ISLAND_HARDWARE,
      window.ISLAND_SECURITY,
      window.ISLAND_CREATIVE,
      window.ISLAND_PROGRAMMING,
      window.ISLAND_ALGO,
      window.ISLAND_ALGORITHM,
      window.ISLAND_DATA,
      window.ISLAND_AI,
      window.CONTENT
    ];
    sources.forEach((src) => {
      if (!src || typeof src !== "object") return;
      Object.keys(src).forEach((k) => {
        if (src[k]) merged[k] = src[k];
      });
    });
    return merged;
  }

  function canonicalizeUnitKey(unitId) {
    const raw = String(unitId || "").trim();
    if (!raw) return "";
    const normalized = raw.replace(/^([a-z]+)(\d+)$/i, "$1-$2");
    const m = normalized.match(/^([a-z]+)-(\d+)$/i);
    if (!m) return normalized.toLowerCase();
    const rawPrefix = m[1].toLowerCase();
    const canonPrefix = CANONICAL_ISLAND_MAP[rawPrefix] || rawPrefix;
    return `${canonPrefix}-${Number(m[2]) || m[2]}`;
  }

  function getUnitAliasCandidates(unitId) {
    const raw = String(unitId || "").trim();
    if (!raw) return [];
    const normalized = raw.replace(/^([a-z]+)(\d+)$/i, "$1-$2");
    const out = [];
    const pushUnique = (val) => {
      if (val && !out.includes(val)) out.push(val);
    };
    pushUnique(raw);
    pushUnique(normalized);
    const m = normalized.match(/^([a-z]+)-(\d+)$/i);
    if (m) {
      const prefix = m[1].toLowerCase();
      const num = String(Number(m[2]) || m[2]);
      const canonPrefix = CANONICAL_ISLAND_MAP[prefix] || prefix;
      pushUnique(`${canonPrefix}-${num}`);
      pushUnique(`${canonPrefix}${num}`);
      pushUnique(`${prefix}-${num}`);
      pushUnique(`${prefix}${num}`);
      UNIT_ALIAS_GROUPS.forEach((grp) => {
        if (grp.includes(prefix) || grp.includes(canonPrefix)) {
          grp.forEach((alt) => {
            pushUnique(`${alt}-${num}`);
            pushUnique(`${alt}${num}`);
          });
        }
      });
    }
    return out;
  }

  function inferUnitCandidatesFromQuestionKey(keyStr) {
    const k = String(keyStr || "").trim();
    const m = k.match(/^([a-z]+)(\d+)-/i);
    if (!m) return [];
    let prefix = m[1].toLowerCase();
    const num = m[2];
    if (prefix === "c") prefix = "citizen";
    return getUnitAliasCandidates(`${prefix}-${num}`);
  }

  function stripUnitPrefix(idStr) {
    return String(idStr || "").trim().replace(/^[a-z]+\d*-/i, "");
  }

  function getQuizDiffBuckets(quiz, preferredDiff) {
    if (!quiz) return [];
    if (quiz.levels && typeof quiz.levels === "object") {
      const keys = Object.keys(quiz.levels).filter((d) => quiz.levels[d] && Array.isArray(quiz.levels[d].questions));
      const pref = String(preferredDiff || "").trim();
      if (pref && keys.includes(pref)) {
        return [pref, ...keys.filter((k) => k !== pref)].map((d) => ({
          diff: d,
          questions: quiz.levels[d].questions
        }));
      }
      return keys.map((d) => ({ diff: d, questions: quiz.levels[d].questions }));
    }
    if (Array.isArray(quiz.questions)) {
      return [{ diff: "single", questions: quiz.questions }];
    }
    return [];
  }

  function resolveUnitMeta(unitId) {
    const content = getMergedContentMap();
    const idStr = String(unitId || "").trim();
    const canonId = canonicalizeUnitKey(idStr);
    const parts = canonId.split("-");
    const rawIslandId = parts[0] || "";
    const islandId = CANONICAL_ISLAND_MAP[rawIslandId] || rawIslandId;
    const unitNum = Number(parts[1]) || 0;
    const islands = Array.isArray(window.ISLANDS) ? window.ISLANDS : [];
    const isl = islands.find((i) => i.id === islandId);
    const seqItem = isl && Array.isArray(isl.sequence) ? isl.sequence[unitNum - 1] : null;
    const contentUnit = content[canonId] || content[idStr] || content[`${islandId}-${unitNum}`] || null;
    return {
      islandEmoji: isl ? isl.emoji : "🏝️",
      islandName: isl ? isl.name : rawIslandId || "未知島嶼",
      unitName: (seqItem && seqItem.unit) || (contentUnit && contentUnit.unit) || canonId || idStr || "未知單元"
    };
  }

  function findQuestionForProjection(unitId, difficulty, questionKey) {
    const content = getMergedContentMap();
    const rawUnitId = String(unitId || "").trim();
    const rawDiff = String(difficulty || "").trim();
    const rawKey = String(questionKey || "").trim();

    let parsedUnit = "";
    let parsedDiff = "";
    let targetKey = rawKey;

    if (rawKey.includes("::")) {
      const parts = rawKey.split("::");
      parsedUnit = String(parts[0] || "").trim();
      parsedDiff = String(parts[1] || "").trim();
      targetKey = parts.slice(2).join("::").trim();
    } else {
      const colonMatch = rawKey.match(/^([a-z]+-?\d+):(easy|medium|hard|single):(.+)$/i);
      if (colonMatch) {
        parsedUnit = colonMatch[1].trim();
        parsedDiff = colonMatch[2].trim();
        targetKey = colonMatch[3].trim();
      }
    }

    const effUnitId = rawUnitId || parsedUnit;
    const effDiff = rawDiff || parsedDiff;
    const allContentKeys = Object.keys(content);

    // 優先排序待掃描的單元鍵值（先比對指定單元與別名，再掃描由題號前綴推斷的單元，最後掃描全站所有題庫）
    const priorityUnits = [];
    const pushUnit = (uk) => {
      if (uk && content[uk] && !priorityUnits.includes(uk)) priorityUnits.push(uk);
    };
    getUnitAliasCandidates(effUnitId).forEach(pushUnit);
    inferUnitCandidatesFromQuestionKey(targetKey).forEach(pushUnit);
    const orderedUnits = [...priorityUnits, ...allContentKeys.filter((uk) => !priorityUnits.includes(uk))];

    const buildResult = (uk, diff, idx, qObj) => ({
      questionKey: rawKey || targetKey,
      rawQuestionKey: rawKey,
      targetKey,
      unitId: uk || effUnitId,
      difficulty: diff || effDiff || "single",
      questionIndex: idx,
      meta: resolveUnitMeta(uk || effUnitId),
      question: qObj || null
    });

    // 1. 優先精準比對 q.id === questionKey（含優先單元與全站掃描）
    const exactCandidates = [targetKey, rawKey].filter(Boolean);
    for (const candidate of exactCandidates) {
      for (const uk of orderedUnits) {
        const buckets = getQuizDiffBuckets(content[uk] && content[uk].quiz, effDiff);
        for (const b of buckets) {
          for (let i = 0; i < b.questions.length; i++) {
            const q = b.questions[i];
            if (q && q.id && (q.id === candidate || String(q.id).toLowerCase() === candidate.toLowerCase())) {
              return buildResult(uk, b.diff, i, q);
            }
          }
        }
      }
    }

    // 2. 去除單元前綴比對（如 sys1-e1 去掉前綴比對 e1，或 hw1-e1 對應 sys1-e1）
    const strippedTarget = stripUnitPrefix(targetKey);
    if (strippedTarget) {
      const strippedLower = strippedTarget.toLowerCase();
      // 若已有明確 unitId 則優先在該單元及其別名中找；否則全站掃描
      const scopeUnits = priorityUnits.length > 0 ? orderedUnits : allContentKeys;
      for (const uk of scopeUnits) {
        const buckets = getQuizDiffBuckets(content[uk] && content[uk].quiz, effDiff);
        for (const b of buckets) {
          for (let i = 0; i < b.questions.length; i++) {
            const q = b.questions[i];
            if (q && q.id && stripUnitPrefix(q.id).toLowerCase() === strippedLower) {
              return buildResult(uk, b.diff, i, q);
            }
          }
        }
      }
    }

    // 3. 早期無 ID 或索引型紀錄：依 unitId 與 difficulty 取出對應題目
    const unitSearchScope = priorityUnits.length > 0 ? priorityUnits : [];
    for (const uk of unitSearchScope) {
      const buckets = getQuizDiffBuckets(content[uk] && content[uk].quiz, effDiff);
      if (/^\d+$/.test(targetKey)) {
        const qIdx = Number(targetKey);
        for (const b of buckets) {
          if (qIdx >= 0 && qIdx < b.questions.length && b.questions[qIdx]) {
            return buildResult(uk, b.diff, qIdx, b.questions[qIdx]);
          }
        }
      }
      const codeMatch = strippedTarget.match(/^([emh])(\d+)$/i);
      if (codeMatch) {
        const diffByCode = { e: "easy", m: "medium", h: "hard" }[codeMatch[1].toLowerCase()];
        const oneBased = Number(codeMatch[2]);
        const targetBuckets = getQuizDiffBuckets(content[uk] && content[uk].quiz, diffByCode || effDiff);
        for (const b of targetBuckets) {
          if (b.diff === diffByCode && oneBased >= 1 && oneBased <= b.questions.length) {
            return buildResult(uk, b.diff, oneBased - 1, b.questions[oneBased - 1]);
          }
        }
      }
      if (targetKey) {
        for (const b of buckets) {
          const textIdx = b.questions.findIndex((q) => q && (q.q === targetKey || q.question === targetKey));
          if (textIdx >= 0) {
            return buildResult(uk, b.diff, textIdx, b.questions[textIdx]);
          }
        }
      } else if (buckets.length > 0 && buckets[0].questions.length > 0) {
        return buildResult(uk, buckets[0].diff, 0, buckets[0].questions[0]);
      }
    }

    return buildResult(effUnitId, effDiff || "single", -1, null);
  }

  function resolveQuestion(questionKey, unitId = "", difficulty = "") {
    return findQuestionForProjection(unitId, difficulty, questionKey);
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
    hasLoadedDashboard: false,
    teacherSession: null, // { teacherId, schoolName, teacherName, account, password, expiresAt }
    teacher: null, // { teacherId, schoolName, teacherName, account }
    teacherPassword: "",
    authTab: "login", // "login" | "register"
    selectedClass: "",
    isPrivacyMode: true,
    activeTab: "radar", // "radar" | "completion" | "roster" | "wrong" | "dispatch"
    activeStage: null,
    isMinimized: false,
    luckyRunning: false,
    luckyResult: null,
    luckyOnlineOnly: true,
    dispatchDraft: null,
    dispatchDirty: false,
    dispatchSaving: false,
    dispatchStatus: { text: "", kind: "", showReauth: false },
    pendingReauthOnly: false,
    compGrade: "all",
    compClass: "all",
    compSearch: "",
    compSort: "seat", // "seat" | "pct" | "score"
    revealedPins: new Set(),
    busyActionKey: "",
    wrongTop3Items: [],
    rosterDraftText: "",
    rosterParsed: { entries: [], classes: [], warnings: [], sourceLabel: "" },
    rosterSaving: false,
    rosterStatus: { text: "", kind: "" }
  };
  let luckyTimer = null;

  function showToast(msg, kind = "ok", ms = 2600) {
    if (window.AvatarSystem && typeof window.AvatarSystem.toast === "function") {
      window.AvatarSystem.toast(msg, kind, ms);
    }
  }

  function isTeacherSessionValid(sess) {
    if (!sess || typeof sess !== "object") return false;
    if (!sess.password) return false;
    const exp = Number(sess.expiresAt);
    if (Number.isFinite(exp) && exp > 0 && Date.now() > exp) return false;
    return true;
  }

  function clearTeacherSession() {
    state.teacherSession = null;
    state.teacherPassword = "";
    state.teacher = null;
    state.hasLoadedDashboard = false;
    try {
      sessionStorage.removeItem(TEACHER_SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(LEGACY_TEACHER_SESSION_KEY);
    } catch {}
  }

  function clearTeacherPassword() {
    clearTeacherSession();
  }

  function setTeacherSession(teacherObj, pwd, fallbackAccount = "") {
    const passwordStr = String(pwd ?? "").trim();
    if (!passwordStr) {
      clearTeacherSession();
      return null;
    }
    const prev = (state.teacherSession && typeof state.teacherSession === "object") ? state.teacherSession : {};
    const t = (teacherObj && typeof teacherObj === "object") ? teacherObj : {};
    const sessionObj = {
      teacherId: String(t.teacherId ?? prev.teacherId ?? "").trim(),
      schoolName: String(t.schoolName ?? prev.schoolName ?? "").trim(),
      teacherName: String(t.teacherName ?? prev.teacherName ?? "").trim(),
      account: String(t.account ?? fallbackAccount ?? prev.account ?? "").trim(),
      password: passwordStr,
      expiresAt: Date.now() + TEACHER_SESSION_TTL_MS
    };
    state.teacherSession = sessionObj;
    state.teacherPassword = sessionObj.password;
    state.teacher = {
      teacherId: sessionObj.teacherId,
      schoolName: sessionObj.schoolName,
      teacherName: sessionObj.teacherName,
      account: sessionObj.account
    };
    try {
      sessionStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(sessionObj));
      sessionStorage.setItem(SESSION_KEY, sessionObj.password);
      sessionStorage.setItem(LEGACY_TEACHER_SESSION_KEY, JSON.stringify({
        teacher: state.teacher,
        password: sessionObj.password,
        expiresAt: sessionObj.expiresAt
      }));
    } catch {}
    return sessionObj;
  }

  function getTeacherSession() {
    if (state.teacherSession && state.teacherSession.password) {
      if (isTeacherSessionValid(state.teacherSession)) {
        return state.teacherSession;
      }
      clearTeacherSession();
      return null;
    }
    try {
      const raw = sessionStorage.getItem(TEACHER_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.password) {
          if (!isTeacherSessionValid(parsed)) {
            clearTeacherSession();
            return null;
          }
          const t = (parsed.teacher && typeof parsed.teacher === "object") ? parsed.teacher : {};
          const restored = {
            teacherId: String(parsed.teacherId ?? t.teacherId ?? "").trim(),
            schoolName: String(parsed.schoolName ?? t.schoolName ?? "").trim(),
            teacherName: String(parsed.teacherName ?? t.teacherName ?? "").trim(),
            account: String(parsed.account ?? t.account ?? "").trim(),
            password: String(parsed.password),
            expiresAt: Number(parsed.expiresAt) > 0 ? Number(parsed.expiresAt) : (Date.now() + TEACHER_SESSION_TTL_MS)
          };
          state.teacherSession = restored;
          state.teacherPassword = restored.password;
          state.teacher = {
            teacherId: restored.teacherId,
            schoolName: restored.schoolName,
            teacherName: restored.teacherName,
            account: restored.account
          };
          return restored;
        }
      }
      const legacyRaw = sessionStorage.getItem(LEGACY_TEACHER_SESSION_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (parsed && parsed.password && isTeacherSessionValid(parsed)) {
          const t = (parsed.teacher && typeof parsed.teacher === "object") ? parsed.teacher : {};
          if (t.teacherId || t.account) {
            return setTeacherSession(t, parsed.password, t.account || "");
          }
        }
      }
    } catch {}
    return null;
  }

  function getTeacherPassword() {
    const sess = getTeacherSession();
    return sess ? sess.password : "";
  }

  function getTeacherAuthFields() {
    const sess = getTeacherSession();
    if (!sess) return { password: "" };
    const out = { password: sess.password };
    if (sess.teacherId) out.teacherId = sess.teacherId;
    if (sess.account) out.account = sess.account;
    return out;
  }

  function getStudentPortalUrl() {
    const sess = getTeacherSession();
    const tid = (sess && sess.teacherId) || (state.teacher && state.teacher.teacherId) || "";
    if (!tid) return "";
    return `${window.location.origin}${window.location.pathname}?t=${encodeURIComponent(tid)}`;
  }

  async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "true");
      ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  }

  function isFormFieldTarget(el) {
    if (typeof window.isFormInputTarget === "function") return window.isFormInputTarget(el);
    const tag = el && el.tagName ? el.tagName.toUpperCase() : "";
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(el && el.isContentEditable);
  }

  function createDraftFromConfig(cfg) {
    const src = (cfg && typeof cfg === "object") ? cfg : {};
    const rawUnlock = src.unlockCitadel;
    const unlockCitadel = rawUnlock === true || String(rawUnlock || "").trim().toLowerCase() === "true" || String(rawUnlock || "").trim() === "1";
    return {
      announcement: String(src.announcement || ""),
      targetIsland: String(src.targetIsland || ""),
      taskLinkTitle: String(src.taskLinkTitle || ""),
      taskLinkUrl: String(src.taskLinkUrl || ""),
      unlockCitadel
    };
  }

  window.isTeacherCockpitOpen = () => !!document.querySelector("#tcCockpit.show, #tcAuthModal.show, #tcQrModal.show, #tcDetailModal.show, #tcConfirmModal.show, #tcProjectorModal.show, #teacher-question-projector, #teacher-island-details-modal");

  function notifyCockpitToggle() {
    document.dispatchEvent(new CustomEvent("ii:cockpit-toggle", {
      detail: { open: window.isTeacherCockpitOpen() }
    }));
  }

  /* ---- DOM 建置：教師登入／新教師註冊開通雙分頁視窗 ---- */
  const authWrap = document.createElement("div");
  authWrap.id = "tcAuthModal";
  authWrap.className = "modal-wrap tc-auth-wrap";
  authWrap.setAttribute("data-scrollable", "true");
  authWrap.innerHTML = `
    <div class="modal tc-auth-modal" data-scrollable="true" role="dialog" aria-modal="true" aria-label="教師入口">
      <button type="button" class="close" id="tcAuthClose" aria-label="關閉">✕</button>
      <div class="tc-auth-head">
        <span class="tc-auth-ico">🧑‍🏫</span>
        <h2>教師戰情室入口</h2>
        <p>支援多校多師獨立試算表管理 · 登入或免費開通專屬課程島</p>
      </div>
      <div class="tc-auth-tabs" role="tablist" aria-label="教師登入或註冊">
        <button type="button" class="tc-auth-tab active" data-auth-tab="login" role="tab" aria-selected="true">🔑 教師登入</button>
        <button type="button" class="tc-auth-tab" data-auth-tab="register" role="tab" aria-selected="false">✨ 新教師註冊開通</button>
      </div>

      <form id="tcAuthForm" class="tc-auth-pane" novalidate>
        <label class="tc-auth-field">
          <span>教師帳號</span>
          <input id="tcLoginAccount" type="text" autocomplete="username" placeholder="請輸入註冊帳號（如學校 Email）" required />
        </label>
        <label class="tc-auth-field">
          <span>密碼</span>
          <input id="tcPasswordInput" type="password" inputMode="text" autocomplete="current-password" placeholder="請輸入教師密碼" required />
        </label>
        <p class="err" id="tcAuthErr" role="alert"></p>
        <button type="submit" class="btn-primary tc-auth-submit" id="tcAuthSubmit">🔓 驗證並開啟戰情室</button>
      </form>

      <form id="tcRegForm" class="tc-auth-pane" hidden novalidate>
        <label class="tc-auth-field">
          <span>🏫 學校名稱</span>
          <input id="tcRegSchool" type="text" maxlength="40" placeholder="例如：新竹市立香山高中" required />
        </label>
        <label class="tc-auth-field">
          <span>🧑🏫 教師姓名</span>
          <input id="tcRegName" type="text" maxlength="20" placeholder="例如：賈伯斯" required />
        </label>
        <label class="tc-auth-field">
          <span>📧 登入帳號（建議使用學校 Email）</span>
          <input id="tcRegAccount" type="text" maxlength="80" autocomplete="username" placeholder="例如：teacher@school.edu.tw" required />
        </label>
        <div class="tc-auth-row2">
          <label class="tc-auth-field">
            <span>🔐 設定密碼</span>
            <input id="tcRegPassword" type="password" inputMode="text" maxlength="64" autocomplete="new-password" placeholder="至少 4 碼" required />
          </label>
          <label class="tc-auth-field">
            <span>🔐 確認密碼</span>
            <input id="tcRegPasswordConfirm" type="password" inputMode="text" maxlength="64" autocomplete="new-password" placeholder="再次輸入密碼" required />
          </label>
        </div>
        <p class="err" id="tcRegErr" role="alert"></p>
        <button type="submit" class="btn-primary tc-auth-submit" id="tcRegSubmit">✨ 建立獨立試算表並開通戰情室</button>
      </form>
    </div>
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
              <small id="tcTeacherIdentity">Teacher Cockpit</small>
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
          <button type="button" id="tcCitadelUnlockBtn" class="tc-pill-btn tc-citadel-toggle" aria-pressed="false" title="開啟後課堂演示或全班培訓可直接登島，關閉即恢復七島皆達 80% 嚴格門檻">⚡ 臨時開放天穹浮島（課堂演示／競賽培訓模式）</button>
        </div>

        <div class="tc-top-right">
          <button type="button" id="tcRefreshBtn" class="tc-icon-btn" title="重新載入雲端數據">🔄 同步</button>
          <button type="button" id="tcLogoutBtn" class="tc-icon-btn" title="登出切換教師帳號">🚪 登出</button>
          <button type="button" id="tcCloseBtn" class="tc-icon-btn tc-close-btn" aria-label="關閉戰情室">✕ 關閉</button>
        </div>
      </header>

      <div class="tc-share-bar" id="tcShareBar" hidden>
        <div class="tc-share-info">
          <span class="tc-school-pill" id="tcShareSchoolPill">🏫 載入中…</span>
          <code class="tc-share-url" id="tcShareUrlText" title="學生專屬入口網址"></code>
        </div>
        <div class="tc-share-actions">
          <button type="button" id="tcCopyLinkBtn" class="tc-share-btn">📋 複製學生專屬連結</button>
          <button type="button" id="tcShowQrBtn" class="tc-share-btn primary">📱 顯示課堂登入 QR Code</button>
        </div>
      </div>

      <nav class="tc-tabs" role="tablist">
        <button type="button" class="tc-tab active" data-tab="radar" role="tab" aria-selected="true">📋 課堂即時進度、抓漏雷達與幸運抽籤</button>
        <button type="button" class="tc-tab" data-tab="completion" role="tab" aria-selected="false">📊 個別完成度</button>
        <button type="button" class="tc-tab" data-tab="roster" role="tab" aria-selected="false">📋 班級名冊管理</button>
        <button type="button" class="tc-tab" data-tab="wrong" role="tab" aria-selected="false">🎯 班級高頻錯題診斷 Top 3 ＋ 一鍵投影講解</button>
        <button type="button" class="tc-tab" data-tab="dispatch" role="tab" aria-selected="false">📢 雲端任務派發</button>
      </nav>

      <div class="tc-global-status" id="tcGlobalStatus" role="status" aria-live="polite" hidden></div>
      <div class="tc-main" id="tcMainBody" data-scrollable="true" style="pointer-events: auto !important; font-family: 'Noto Sans TC', sans-serif;"></div>
    </div>
  `;
  document.body.appendChild(cockpitWrap);

  /* ---- DOM 建置：課堂登入高清 QR Code 投影視窗 ---- */
  const qrWrap = document.createElement("div");
  qrWrap.id = "tcQrModal";
  qrWrap.className = "tc-projector-wrap tc-submodal-wrap";
  qrWrap.setAttribute("role", "dialog");
  qrWrap.setAttribute("aria-modal", "true");
  qrWrap.setAttribute("aria-label", "課堂登入 QR Code");
  qrWrap.setAttribute("data-scrollable", "true");
  qrWrap.hidden = true;
  qrWrap.innerHTML = `<div class="tc-submodal-card tc-qr-card" id="tcQrCard" data-scrollable="true"></div>`;
  document.body.appendChild(qrWrap);

  /* ---- DOM 建置：學生七大島嶼完成明細 Modal & 自訂確認 Modal ---- */
  const detailWrap = document.createElement("div");
  detailWrap.id = "tcDetailModal";
  detailWrap.className = "tc-projector-wrap tc-submodal-wrap";
  detailWrap.setAttribute("role", "dialog");
  detailWrap.setAttribute("aria-modal", "true");
  detailWrap.setAttribute("data-scrollable", "true");
  detailWrap.hidden = true;
  detailWrap.innerHTML = `<div class="tc-submodal-card tc-detail-card" id="tcDetailCard" data-scrollable="true"></div>`;
  document.body.appendChild(detailWrap);

  const confirmWrap = document.createElement("div");
  confirmWrap.id = "tcConfirmModal";
  confirmWrap.className = "tc-projector-wrap tc-submodal-wrap";
  confirmWrap.setAttribute("role", "dialog");
  confirmWrap.setAttribute("aria-modal", "true");
  confirmWrap.setAttribute("data-scrollable", "true");
  confirmWrap.hidden = true;
  confirmWrap.innerHTML = `<div class="tc-submodal-card tc-confirm-card" id="tcConfirmCard" data-scrollable="true"></div>`;
  document.body.appendChild(confirmWrap);

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
  projWrap.className = "tc-projector-wrap hidden pointer-events-none";
  projWrap.hidden = true;
  projWrap.setAttribute("role", "dialog");
  projWrap.setAttribute("aria-modal", "true");
  projWrap.setAttribute("aria-label", "錯題投影講解視窗");
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

  async function postGasAction(payload) {
    const url = getGasUrl();
    if (!url) throw new Error("尚未設定 GAS_LEADERBOARD_URL");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return await parseJsonResponse(res);
  }

  async function fetchTeacherDashboard(password, explicitSession = null) {
    const sess = explicitSession || getTeacherSession();
    const pwd = String(password || (sess && sess.password) || "").trim();
    const payload = { action: "teacher_dashboard", password: pwd };
    const tid = (explicitSession && explicitSession.teacherId) || (sess && sess.teacherId) || "";
    const acc = (explicitSession && explicitSession.account) || (sess && sess.account) || "";
    if (tid) payload.teacherId = tid;
    if (acc) payload.account = acc;
    return await postGasAction(payload);
  }

  async function teacherLoginApi(account, password) {
    return await postGasAction({
      action: "teacher_login",
      account: String(account ?? "").trim(),
      password: String(password ?? "").trim()
    });
  }

  async function registerTeacherApi({ schoolName, teacherName, account, password }) {
    return await postGasAction({
      action: "register_teacher",
      schoolName: String(schoolName ?? "").trim(),
      teacherName: String(teacherName ?? "").trim(),
      account: String(account ?? "").trim(),
      password: String(password ?? "").trim()
    });
  }

  function normalizeRosterList(list) {
    if (!Array.isArray(list)) return [];
    const map = new Map();
    list.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const cls = String(item.className || item.cls || "").trim();
      const seatDigits = String(item.seatNum !== undefined ? item.seatNum : (item.seat || "")).replace(/號/g, "").trim();
      const seatNum = Number(seatDigits);
      const realName = String(item.realName !== undefined ? item.realName : (item.name || "")).trim();
      if (!cls || !Number.isInteger(seatNum) || seatNum < 1 || seatNum > 60) return;
      const grade = String(item.grade || parseStudentGradeFromCls("", cls)).trim();
      const seat = String(seatNum);
      map.set(`${cls}__${seatNum}`, {
        grade,
        className: cls,
        seat,
        seatNum,
        name: realName,
        realName
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      const cmp = a.className.localeCompare(b.className, "zh-Hant", { numeric: true });
      return cmp !== 0 ? cmp : a.seatNum - b.seatNum;
    });
  }

  function applyDashboardData(json, { preserveDispatchDraft = false } = {}) {
    if (!json || typeof json !== "object") return;
    if (json.teacher && typeof json.teacher === "object") {
      const nextTeacher = {
        teacherId: String(json.teacher.teacherId || "").trim(),
        schoolName: String(json.teacher.schoolName || "").trim(),
        teacherName: String(json.teacher.teacherName || "").trim(),
        account: String(json.teacher.account || "").trim()
      };
      state.teacher = nextTeacher;
      if (state.teacherSession && state.teacherSession.password) {
        state.teacherSession = {
          ...state.teacherSession,
          teacherId: nextTeacher.teacherId || state.teacherSession.teacherId,
          schoolName: nextTeacher.schoolName || state.teacherSession.schoolName,
          teacherName: nextTeacher.teacherName || state.teacherSession.teacherName,
          account: nextTeacher.account || state.teacherSession.account
        };
        try {
          sessionStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(state.teacherSession));
          sessionStorage.setItem(LEGACY_TEACHER_SESSION_KEY, JSON.stringify({
            teacher: state.teacher,
            password: state.teacherSession.password,
            expiresAt: state.teacherSession.expiresAt
          }));
        } catch {}
      }
    }
    const prevData = (state.data && typeof state.data === "object")
      ? state.data
      : { roster: [], students: [], wrongLogs: [], config: null };
    state.hasLoadedDashboard = true;
    // 僅在伺服器明確回傳陣列時才更新對應欄位，防止公開 doGet（roster 為 undefined）覆蓋教師私有資料
    state.data = {
      roster: Array.isArray(json.roster)
        ? normalizeRosterList(json.roster)
        : (Array.isArray(prevData.roster) ? prevData.roster : []),
      students: Array.isArray(json.students)
        ? json.students
        : (Array.isArray(prevData.students) ? prevData.students : []),
      wrongLogs: Array.isArray(json.wrongLogs)
        ? json.wrongLogs
        : (Array.isArray(prevData.wrongLogs) ? prevData.wrongLogs : []),
      config: (json.config && typeof json.config === "object")
        ? json.config
        : (prevData.config || null)
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

  async function saveCloudConfig(config, explicitSession = null) {
    const sess = explicitSession || getTeacherSession();
    const pwd = (sess && sess.password) || getTeacherPassword();
    if (!pwd) {
      return { status: "unauthorized", message: "教師驗證已逾時，請重新登入" };
    }
    const payload = {
      action: "save_config",
      password: pwd,
      config
    };
    if (sess && sess.teacherId) payload.teacherId = sess.teacherId;
    if (sess && sess.account) payload.account = sess.account;
    return await postGasAction(payload);
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

  /* ---- 渲染頂部控制列與專屬學生分享列 ---- */
  function renderTopBar() {
    const idEl = cockpitWrap.querySelector("#tcTeacherIdentity");
    if (idEl) {
      if (state.teacher && state.teacher.schoolName) {
        idEl.textContent = `${state.teacher.schoolName} · ${state.teacher.teacherName || ""}老師`;
      } else if (state.teacher && state.teacher.teacherName) {
        idEl.textContent = `${state.teacher.teacherName}老師`;
      } else {
        idEl.textContent = "Teacher Cockpit";
      }
    }

    const shareBar = cockpitWrap.querySelector("#tcShareBar");
    const schoolPill = cockpitWrap.querySelector("#tcShareSchoolPill");
    const urlTextEl = cockpitWrap.querySelector("#tcShareUrlText");
    const portalUrl = getStudentPortalUrl();
    if (shareBar) {
      if (portalUrl && state.teacher && state.teacher.teacherId) {
        shareBar.hidden = false;
        if (schoolPill) {
          schoolPill.textContent = `🏫 ${state.teacher.schoolName || "本校課程島"} · 教師代碼 ${state.teacher.teacherId}`;
        }
        if (urlTextEl) {
          urlTextEl.textContent = portalUrl;
        }
      } else {
        shareBar.hidden = true;
      }
    }

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

    const citadelBtn = cockpitWrap.querySelector("#tcCitadelUnlockBtn");
    if (citadelBtn) {
      const isCitadelOpen = Boolean(
        (state.data.config && (state.data.config.unlockCitadel === true || String(state.data.config.unlockCitadel || "").toLowerCase() === "true"))
        || (window.CloudConfig && typeof window.CloudConfig.isCitadelTempUnlocked === "function" && window.CloudConfig.isCitadelTempUnlocked())
      );
      citadelBtn.classList.toggle("active", isCitadelOpen);
      citadelBtn.setAttribute("aria-pressed", String(isCitadelOpen));
      citadelBtn.textContent = isCitadelOpen
        ? "⚡ 臨時開放天穹浮島：已開啟（點擊關閉）"
        : "⚡ 臨時開放天穹浮島（課堂演示／競賽培訓模式）";
    }

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
      .map((r) => ({
        seatNum: Number(r.seatNum !== undefined ? r.seatNum : r.seat) || 0,
        name: String(r.realName !== undefined ? r.realName : (r.name || "")).trim()
      }))
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
      body.innerHTML = `<div class="tc-empty">📭 目前尚無任何班級或學生資料，請先點擊上方「<b>📋 班級名冊管理</b>」分頁匯入名單，或分享專屬連結讓學生登入！</div>`;
      return;
    }

    const rosterTip = snap.hasOfficialRoster
      ? ""
      : `<div class="tc-info-banner">💡 試算表尚未建立 <b>${esc(snap.cls)}</b> 班的 <code>Roster</code> 名冊，目前暫以 1～${snap.inferredMax} 號自動推算；您可點擊上方「<b>📋 班級名冊管理</b>」分頁直接從 Excel 貼上或上傳 CSV 名單啟用精準點名。</div>`;

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
      state.wrongTop3Items = [];
      body.innerHTML = `<div class="tc-empty">📭 請先選擇班級。</div>`;
      return;
    }
    const buckets = new Map();
    state.data.wrongLogs.forEach((w) => {
      if (String(w.className || w.cls || "").trim() !== cls) return;
      const rawQKey = String(w.questionKey || "").trim();
      const rawUnitId = String(w.unitId || "").trim();
      const rawDiff = String(w.difficulty || "").trim();
      if (!rawQKey && !rawUnitId) return;

      const info = findQuestionForProjection(rawUnitId, rawDiff, rawQKey);
      const bucketKey = info.question
        ? `resolved::${info.unitId}::${info.difficulty}::${info.question.id || info.questionIndex}`
        : `raw::${info.unitId}::${info.difficulty}::${rawQKey}`;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          unitId: info.unitId || rawUnitId,
          difficulty: info.difficulty || rawDiff || "single",
          questionKey: rawQKey,
          count: 0,
          info
        });
      }
      buckets.get(bucketKey).count += 1;
    });

    const top3 = Array.from(buckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    state.wrongTop3Items = top3;
    window.__teacherTopWrongList = top3;

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
        ${top3.map((item, idx) => {
          const info = item.info || findQuestionForProjection(item.unitId, item.difficulty, item.questionKey);
          const diffLabel = DIFF_LABELS[info.difficulty] || info.difficulty || "標準";
          const stemText = info.question
            ? (info.question.q || info.question.question || "")
            : `題目索引紀錄：${info.unitId || "未指定單元"} / ${item.questionKey || "無索引"}（本地題庫未找到對應題目）`;
          return `<article class="tc-wrong-card rank-${idx + 1}">
            <div class="tc-wrong-top">
              <span class="tc-rank-badge">🔥 錯題 #${idx + 1}</span>
              <span class="tc-wrong-count">累計答錯 <b>${item.count}</b> 人次</span>
            </div>
            <div class="tc-wrong-meta">
              <span class="tc-unit-tag">${esc(info.meta.islandEmoji)} ${esc(info.meta.islandName)} · ${esc(info.meta.unitName)}</span>
              <span class="tc-diff-tag d-${esc(info.difficulty)}">難度：${esc(diffLabel)}</span>
            </div>
            <p class="tc-wrong-stem">${esc(stemText)}</p>
            <button type="button" class="btn-primary tc-project-btn" data-action="project-wrong-question" data-wrong-idx="${idx}" data-unit="${esc(item.unitId)}" data-diff="${esc(item.difficulty)}" data-qkey="${esc(item.questionKey)}" data-count="${item.count}" style="pointer-events: auto; cursor: pointer;">📺 一鍵投影該題</button>
          </article>`;
        }).join("")}
      </div>
    `;
  }

  /* ---- 超大字體題目檢討投影視窗（動態掛載於 document.body，全行內樣式強制顯示） ---- */
  function closeProjectorModal() {
    const activeProj = document.getElementById("teacher-question-projector");
    if (activeProj && activeProj.parentNode) {
      activeProj.parentNode.removeChild(activeProj);
    }
    projWrap.classList.remove("show");
    projWrap.classList.add("hidden", "pointer-events-none");
    projWrap.hidden = true;
    notifyCockpitToggle();
  }

  function openProjectorModal(input, legacyWrongCount = 0) {
    let unitId = "";
    let difficulty = "";
    let qKey = "";
    let wrongCount = 0;

    if (input && typeof input === "object") {
      unitId = String(input.unitId || "").trim();
      difficulty = String(input.difficulty || "").trim();
      qKey = String(input.questionKey || input.qKey || "").trim();
      wrongCount = Number(input.count ?? input.wrongCount) || 0;
    } else {
      qKey = String(input || "").trim();
      wrongCount = Number(legacyWrongCount) || 0;
    }

    const info = findQuestionForProjection(unitId, difficulty, qKey);
    const q = info.question;
    const diffLabel = DIFF_LABELS[info.difficulty] || info.difficulty || "標準";
    const displayUnitId = info.unitId || unitId || "未記錄單元";
    const displayQKey = qKey || info.questionKey || "未記錄題號";
    let revealed = false;

    const existingOverlay = document.getElementById("teacher-question-projector");
    if (existingOverlay && existingOverlay.parentNode) {
      existingOverlay.parentNode.removeChild(existingOverlay);
    }
    projWrap.classList.remove("show");
    projWrap.classList.add("hidden", "pointer-events-none");
    projWrap.hidden = true;

    const overlay = document.createElement("div");
    overlay.id = "teacher-question-projector";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "錯題投影講解視窗");
    overlay.setAttribute("data-scrollable", "true");
    overlay.style.cssText = [
      "position: fixed",
      "top: 0",
      "left: 0",
      "width: 100vw",
      "height: 100vh",
      "z-index: 2147483647",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "background: rgba(15, 23, 42, 0.94)",
      "pointer-events: auto",
      "padding: 20px",
      "box-sizing: border-box",
      'font-family: "Noto Sans TC", sans-serif'
    ].join("; ") + ";";

    const card = document.createElement("div");
    card.id = "tcProjectorDynamicCard";
    card.setAttribute("data-scrollable", "true");
    card.style.cssText = [
      "width: min(1160px, 96vw)",
      "max-height: 92vh",
      "overflow-y: auto",
      "overscroll-behavior: contain",
      "display: flex",
      "flex-direction: column",
      "background: linear-gradient(165deg, #0b2644, #06172b)",
      "border: 2px solid rgba(124, 199, 255, 0.45)",
      "border-radius: 24px",
      "padding: 28px 34px",
      "color: #ffffff",
      "box-shadow: 0 28px 80px rgba(0, 0, 0, 0.72)",
      'font-family: "Noto Sans TC", sans-serif',
      "box-sizing: border-box",
      "pointer-events: auto"
    ].join("; ") + ";";

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    overlay.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });
    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target === overlay) closeProjectorModal();
    });

    const isAnswerIndex = (idx) => {
      if (!q) return false;
      if (q.type === "single") return q.answer === idx;
      if (q.type === "multi") return Array.isArray(q.answer) && q.answer.includes(idx);
      return false;
    };

    const formatCorrectAnswerText = () => {
      if (!q) return "—";
      const opts = Array.isArray(q.options) ? q.options : [];
      if (q.type === "single") {
        const letter = LETTERS[q.answer] || String(q.answer ?? "");
        const optText = opts[q.answer] !== undefined ? opts[q.answer] : "";
        return optText ? `${letter}. ${optText}` : letter || "—";
      }
      if (q.type === "multi" && Array.isArray(q.answer)) {
        return q.answer.map((i) => `${LETTERS[i] || i}. ${opts[i] ?? ""}`).join("、");
      }
      if (q.type === "tf") return q.answer ? "○ 正確" : "✕ 錯誤";
      if (q.type === "fill") return Array.isArray(q.answer) ? q.answer[0] : String(q.answer || "");
      return "";
    };

    const renderProjector = () => {
      let optionsHtml = "";
      if (!q) {
        optionsHtml = `<div style="padding: 22px 24px; border-radius: 16px; background: rgba(245, 158, 11, 0.16); border: 1.5px solid rgba(251, 191, 36, 0.5); color: #fef3c7; font-size: 1.15rem; line-height: 1.65;">
          <p style="margin: 0 0 12px; font-weight: 800;">⚠️ 本地題庫暫未反查到原文，已顯示該筆錯題完整紀錄：</p>
          <div style="display: flex; flex-wrap: wrap; gap: 12px 20px; font-size: 1.05rem;">
            <span>單元（<code>unitId</code>）：<code style="padding: 2px 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.8); color: #ffd166;">${esc(displayUnitId)}</code></span>
            <span>難度：<code style="padding: 2px 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.8); color: #ffd166;">${esc(diffLabel)}</code></span>
            <span>索引鍵（<code>questionKey</code>）：<code style="padding: 2px 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.8); color: #ffd166;">${esc(displayQKey)}</code></span>
            <span>錯誤人次：<strong style="color: #fca5a5;">${wrongCount} 人次</strong></span>
          </div>
        </div>`;
      } else if ((q.type === "single" || q.type === "multi") && Array.isArray(q.options)) {
        optionsHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px;">
          ${q.options.map((opt, idx) => {
            const isAns = revealed && isAnswerIndex(idx);
            const letter = LETTERS[idx] || String(idx + 1);
            return `<div style="display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-radius: 16px; background: ${isAns ? "rgba(22, 163, 74, 0.32)" : "rgba(255, 255, 255, 0.08)"}; border: 2px solid ${isAns ? "#4ade80" : "rgba(255, 255, 255, 0.2)"}; font-size: clamp(1.18rem, 1.85vw, 1.6rem); line-height: 1.45; font-weight: 700;">
              <span style="flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; background: ${isAns ? "#22c55e" : "rgba(255, 255, 255, 0.16)"}; color: ${isAns ? "#052e16" : "#ffd166"}; display: inline-flex; align-items: center; justify-content: center; font-weight: 900;">${letter}</span>
              <span style="flex: 1;">${esc(opt)}</span>
              ${isAns ? `<span style="padding: 4px 10px; border-radius: 999px; background: #22c55e; color: #052e16; font-size: 0.92rem; font-weight: 900;">✔ 正確答案</span>` : ""}
            </div>`;
          }).join("")}
        </div>`;
      } else if (q.type === "tf") {
        optionsHtml = `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;">
          <div style="display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-radius: 16px; background: ${revealed && q.answer === true ? "rgba(22, 163, 74, 0.32)" : "rgba(255, 255, 255, 0.08)"}; border: 2px solid ${revealed && q.answer === true ? "#4ade80" : "rgba(255, 255, 255, 0.2)"}; font-size: clamp(1.2rem, 1.9vw, 1.6rem); font-weight: 700;">
            <span style="flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; background: ${revealed && q.answer === true ? "#22c55e" : "rgba(255, 255, 255, 0.16)"}; color: ${revealed && q.answer === true ? "#052e16" : "#ffd166"}; display: inline-flex; align-items: center; justify-content: center; font-weight: 900;">○</span>
            <span style="flex: 1;">正確</span>
            ${revealed && q.answer === true ? `<span style="padding: 4px 10px; border-radius: 999px; background: #22c55e; color: #052e16; font-size: 0.92rem; font-weight: 900;">✔ 正確答案</span>` : ""}
          </div>
          <div style="display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-radius: 16px; background: ${revealed && q.answer === false ? "rgba(22, 163, 74, 0.32)" : "rgba(255, 255, 255, 0.08)"}; border: 2px solid ${revealed && q.answer === false ? "#4ade80" : "rgba(255, 255, 255, 0.2)"}; font-size: clamp(1.2rem, 1.9vw, 1.6rem); font-weight: 700;">
            <span style="flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; background: ${revealed && q.answer === false ? "#22c55e" : "rgba(255, 255, 255, 0.16)"}; color: ${revealed && q.answer === false ? "#052e16" : "#ffd166"}; display: inline-flex; align-items: center; justify-content: center; font-weight: 900;">✕</span>
            <span style="flex: 1;">錯誤</span>
            ${revealed && q.answer === false ? `<span style="padding: 4px 10px; border-radius: 999px; background: #22c55e; color: #052e16; font-size: 0.92rem; font-weight: 900;">✔ 正確答案</span>` : ""}
          </div>
        </div>`;
      } else if (q.type === "fill") {
        optionsHtml = `<div style="padding: 20px; border-radius: 14px; background: rgba(255, 255, 255, 0.08); font-size: 1.35rem; text-align: center; color: #ffd166; font-weight: 700;">填空題：請同學舉手口頭作答</div>`;
      }

      const stemText = q ? (q.q || q.question || displayQKey) : `題目索引紀錄（${displayUnitId} / ${displayQKey}）`;
      const explainText = q ? (q.explain || q.explanation || "") : "";

      card.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.16);">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <span style="padding: 6px 14px; border-radius: 999px; background: rgba(79, 179, 255, 0.22); border: 1px solid rgba(124, 199, 255, 0.45); font-size: 1rem; font-weight: 800;">${esc(info.meta.islandEmoji)} ${esc(info.meta.islandName)} · ${esc(info.meta.unitName)}</span>
            <span style="padding: 6px 14px; border-radius: 999px; background: rgba(255, 209, 102, 0.22); border: 1px solid rgba(255, 209, 102, 0.5); color: #ffd166; font-size: 1rem; font-weight: 800;">難度：${esc(diffLabel)}</span>
            <span style="padding: 6px 14px; border-radius: 999px; background: rgba(239, 68, 68, 0.28); border: 1px solid rgba(248, 113, 113, 0.55); color: #fecaca; font-size: 1rem; font-weight: 800;">🔥 累計答錯 ${wrongCount} 人次</span>
          </div>
          <button type="button" id="tcProjClose" aria-label="關閉投影視窗" style="padding: 9px 18px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.35); background: rgba(255, 255, 255, 0.14); color: #ffffff; font-weight: 800; font-size: 1rem; cursor: pointer; pointer-events: auto;">✕ 關閉投影</button>
        </div>

        <div style="padding: 22px 0; flex: 1;">
          <h2 class="tc-proj-question" style="margin: 0 0 24px; font-size: clamp(1.55rem, 2.6vw, 2.35rem); line-height: 1.5; font-weight: 800; color: #ffffff;">${esc(stemText).replace(/\n/g, "<br>")}</h2>
          ${optionsHtml}

          ${q && revealed ? `<div style="margin-top: 22px; padding: 18px 22px; border-radius: 16px; background: rgba(34, 197, 94, 0.16); border: 1.5px solid rgba(74, 222, 128, 0.55); font-size: clamp(1.08rem, 1.5vw, 1.35rem); line-height: 1.65;">
            <div style="color: #86efac; margin-bottom: 8px;">✅ 正確答案：<strong>${esc(formatCorrectAnswerText())}</strong></div>
            ${explainText ? `<div style="color: #eaf4ff;">💡 詳解：${esc(explainText)}</div>` : ""}
          </div>` : ""}
        </div>

        ${q ? `<div style="padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.14); display: flex; justify-content: center;">
          <button type="button" id="tcProjRevealBtn" class="btn-primary" aria-pressed="${revealed}" style="padding: 14px 32px; font-size: 1.15rem; border-radius: 14px; cursor: pointer; pointer-events: auto;">
            ${revealed ? "🙈 隱藏正確答案與詳解" : "👁️ 顯示／隱藏正確答案與詳解"}
          </button>
        </div>` : ""}
      `;

      const closeBtn = card.querySelector("#tcProjClose");
      if (closeBtn) closeBtn.addEventListener("click", closeProjectorModal);
      const revealBtn = card.querySelector("#tcProjRevealBtn");
      if (revealBtn) {
        revealBtn.addEventListener("click", () => {
          revealed = !revealed;
          renderProjector();
        });
      }
    };

    renderProjector();
    notifyCockpitToggle();
    const closeBtn = card.querySelector("#tcProjClose");
    if (closeBtn) setTimeout(() => closeBtn.focus(), 20);
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
    const sess = getTeacherSession();
    if (!sess || !sess.password) {
      setDispatchStatus("⚠️ 教師驗證已逾時，請重新登入", "err", true);
      return;
    }

    const currentUnlockFlag = Boolean(
      (state.data.config && (state.data.config.unlockCitadel === true || String(state.data.config.unlockCitadel || "").toLowerCase() === "true"))
      || (window.CloudConfig && typeof window.CloudConfig.isCitadelTempUnlocked === "function" && window.CloudConfig.isCitadelTempUnlocked())
    );
    const nextConfig = {
      announcement: (announcementEl ? announcementEl.value : "").trim(),
      targetIsland: (targetIslandEl ? targetIslandEl.value : "").trim(),
      taskLinkTitle: (linkTitleEl ? linkTitleEl.value : "").trim(),
      taskLinkUrl: (linkUrlEl ? linkUrlEl.value : "").trim(),
      unlockCitadel: currentUnlockFlag ? "true" : "false"
    };

    state.dispatchSaving = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "⏳ 發布同步中...";
    }
    setDispatchStatus("", "");

    try {
      const res = await saveCloudConfig(nextConfig, sess);
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
        clearTeacherSession();
        setDispatchStatus("⚠️ 教師驗證已逾時，請重新登入", "err", true);
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

  /* ---- 渲染分頁二：📊 全校學生個別完成度總覽與管理 ---- */
  function parseStudentGradeFromCls(gradeVal, cls) {
    const g = Number(gradeVal);
    if (g === 7 || g === 8 || g === 9) return String(g);
    const s = String(cls || "").trim();
    if (/^8/.test(s)) return "8";
    if (/^9/.test(s)) return "9";
    return "7";
  }

  const DIFF_FULL_LABELS = { easy: "易（初階）", medium: "中（進階）", hard: "難（大師）", single: "標準" };

  function normalizeProgressDifficulty(rawDiff, { allowSingle = true } = {}) {
    const raw = String(rawDiff || "").trim();
    if (!raw) return allowSingle ? "single" : "";
    const low = raw.toLowerCase();
    if (low === "easy" || low === "e" || /易|初階|入門|簡單|基礎/.test(raw)) return "easy";
    if (low === "medium" || low === "med" || low === "m" || /中|進階|普通/.test(raw)) return "medium";
    if (low === "hard" || low === "h" || /難|大師|困難|挑戰/.test(raw)) return "hard";
    if (low === "single" || low === "standard" || raw === "標準") return allowSingle ? "single" : "";
    return "";
  }

  function parseProgressTokenString(rawToken) {
    const s = String(rawToken || "").trim();
    if (!s) return null;
    let rawUnit = "";
    let rawDiff = "";
    const colonIdx = s.lastIndexOf(":");
    if (colonIdx > 0) {
      rawUnit = s.slice(0, colonIdx).trim();
      rawDiff = s.slice(colonIdx + 1).trim();
    } else {
      const sepMatch = s.match(/^(.+?)[_\-:]+(easy|medium|hard|single|med|e|m|h|易|初階|入門探險家|入門|簡單|基礎|進階挑戰者|中|進階|中等|普通|大師領航員|難|大師|困難|挑戰)$/i);
      if (!sepMatch) return null;
      rawUnit = sepMatch[1].trim();
      rawDiff = sepMatch[2].trim();
    }
    const unitKey = canonicalizeUnitKey(rawUnit);
    const diff = normalizeProgressDifficulty(rawDiff, { allowSingle: true });
    if (!unitKey || !diff) return null;
    return { rawUnit, unitKey, diff };
  }

  function parseStudentProgressSet(rawProgress) {
    const set = new Set();
    const cc = window.CompletionCenter;
    if (cc && typeof cc.extractPassedStageSet === "function") {
      cc.extractPassedStageSet(rawProgress).forEach((tok) => {
        const [canon, diff] = tok.split(":");
        if (!canon || !diff) return;
        set.add(`${canon}:${diff}`);
        getUnitAliasCandidates(canon).forEach((alias) => {
          set.add(`${alias}:${diff}`);
          set.add(`${String(alias).toLowerCase()}:${diff}`);
        });
      });
      return set;
    }

    const addUnitDiff = (rawUnit, rawDiff) => {
      const u = String(rawUnit || "").trim();
      const rawD = normalizeProgressDifficulty(rawDiff, { allowSingle: true });
      const diff = rawD === "single" ? "easy" : rawD;
      if (!u || !diff) return;
      const canon = canonicalizeUnitKey(u);
      if (canon) {
        set.add(`${canon}:${diff}`);
        getUnitAliasCandidates(canon).forEach((alias) => {
          set.add(`${alias}:${diff}`);
          set.add(`${String(alias).toLowerCase()}:${diff}`);
        });
      }
      set.add(`${u}:${diff}`);
      set.add(`${u.toLowerCase()}:${diff}`);
    };

    const walk = (val) => {
      if (val === null || val === undefined) return;
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed) return;
        if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
          try {
            walk(JSON.parse(trimmed));
            return;
          } catch {}
        }
        trimmed.split(/[,;\n\r]+/).forEach((part) => {
          const parsed = parseProgressTokenString(part);
          if (parsed) addUnitDiff(parsed.rawUnit, parsed.diff);
        });
        return;
      }
      if (Array.isArray(val)) {
        val.forEach((item) => {
          if (typeof item === "string") {
            const parsed = parseProgressTokenString(item);
            if (parsed) addUnitDiff(parsed.rawUnit, parsed.diff);
          } else if (item && typeof item === "object") {
            if (item.unit || item.unitId || item.key || item.id) {
              if (item.type && item.type !== "quiz") return;
              if (item.score !== undefined && Number(item.score) < 60 && item.passed !== true) return;
              if (item.passed === false) return;
              const u = String(item.unit || item.unitId || item.key || item.id || "").trim();
              const d = item.difficulty || item.quizDifficulty || item.diff || (item.detail && item.detail.difficulty) || "single";
              addUnitDiff(u, d);
            } else {
              walk(item);
            }
          }
        });
        return;
      }
      if (typeof val === "object") {
        if (val.completedProgress !== undefined) walk(val.completedProgress);
        if (val.progress !== undefined) walk(val.progress);
        Object.entries(val).forEach(([k, v]) => {
          if (k === "completedProgress" || k === "progress") return;
          const tok = parseProgressTokenString(k);
          if (tok) {
            const ok = v === true || v === 1 || v === "true" || (typeof v === "number" && v >= 60)
              || (v && typeof v === "object" && (v.passed === true || v.isPassed === true || Number(v.score) >= 60));
            if (ok) addUnitDiff(tok.rawUnit, tok.diff);
            return;
          }
          const canon = canonicalizeUnitKey(k);
          if (!canon) return;
          if (Array.isArray(v)) {
            v.forEach((sub) => {
              if (typeof sub === "string") addUnitDiff(k, sub);
              else if (sub && typeof sub === "object") {
                const ok = sub.passed === true || sub.isPassed === true || (sub.score !== undefined ? Number(sub.score) >= 60 : true);
                if (ok) addUnitDiff(k, sub.difficulty || sub.diff || "single");
              }
            });
          } else if (v && typeof v === "object") {
            Object.entries(v).forEach(([diffKey, diffVal]) => {
              const ok = diffVal === true || diffVal === 1 || diffVal === "true"
                || (typeof diffVal === "number" && diffVal >= 60)
                || (diffVal && typeof diffVal === "object" && (diffVal.passed === true || diffVal.isPassed === true || Number(diffVal.score) >= 60));
              if (ok) addUnitDiff(k, diffKey);
            });
          } else if (v === true || v === 1 || (typeof v === "number" && v >= 60)) {
            addUnitDiff(k, "single");
          }
        });
      }
    };

    walk(rawProgress);
    return set;
  }

  function isUnitDiffPassed(progressSet, unit, diff) {
    if (!progressSet || typeof progressSet.has !== "function" || !unit || !diff) return false;
    if (progressSet.has(`${unit.unitKey}:${diff}`)) return true;
    if (Array.isArray(unit.aliases)) {
      return unit.aliases.some((alias) => {
        const a = String(alias || "").trim();
        if (!a) return false;
        return progressSet.has(`${a}:${diff}`) || progressSet.has(`${a.toLowerCase()}:${diff}`);
      });
    }
    return false;
  }

  function buildCurriculumCatalog() {
    const islands = Array.isArray(window.ISLANDS) ? window.ISLANDS : [];
    const content = getMergedContentMap();
    const termTag = (g, t) => ({ 7: "七", 8: "八", 9: "九" }[g] || String(g)) + (t === 1 ? "上" : "下");
    let totalLevels = 0;
    const gradeTotal = { "7": 0, "8": 0, "9": 0 };
    const unitGradeMap = {};
    const islandCatalog = islands.map((isl) => {
      const seqEntries = (Array.isArray(isl.sequence) ? isl.sequence : [])
        .map((seq, idx) => ({ seq, unitKey: `${isl.id}-${idx + 1}` }))
        .sort((a, b) => ((Number(a.seq && a.seq.grade) || 0) * 10 + (Number(a.seq && a.seq.term) || 0))
          - ((Number(b.seq && b.seq.grade) || 0) * 10 + (Number(b.seq && b.seq.term) || 0)));
      const units = seqEntries.map(({ seq, unitKey }) => {
        const aliasSet = new Set(getUnitAliasCandidates(unitKey));
        let contentUnit = content[unitKey] || null;
        if (!contentUnit) {
          for (const ak of aliasSet) {
            if (content[ak]) {
              contentUnit = content[ak];
              break;
            }
          }
        }
        if (contentUnit && contentUnit.id) aliasSet.add(String(contentUnit.id).trim());
        // 每個單元固定包含 easy / medium / hard 三個難度關卡（分母嚴格等於 units.length * 3）
        const effectiveDiffs = ["easy", "medium", "hard"];
        const gNum = Number(seq && seq.grade) || 7;
        const tNum = Number(seq && seq.term) || 1;
        const gStr = String(gNum);
        const unitName = (seq && seq.unit) || (contentUnit && contentUnit.unit) || unitKey;
        totalLevels += effectiveDiffs.length;
        if (gradeTotal[gStr] !== undefined) gradeTotal[gStr] += effectiveDiffs.length;
        unitGradeMap[unitKey] = gStr;
        return {
          id: unitKey,
          unitKey,
          title: unitName,
          unitName,
          grade: gStr,
          term: tNum,
          termLabel: termTag(gNum, tNum),
          diffs: effectiveDiffs,
          aliases: Array.from(aliasSet)
        };
      });
      return {
        id: isl.id,
        name: isl.name,
        emoji: isl.emoji || "🏝️",
        color: isl.color || "#38bdf8",
        units,
        totalLevels: units.length * 3
      };
    });
    return { totalLevels, gradeTotal, unitGradeMap, islandCatalog };
  }

  function buildMergedStudents(catalog) {
    const map = new Map();
    const ensureEntry = (grade, className, seat) => {
      const cls = String(className || "").trim();
      const seatNum = Number(seat) || 0;
      const seatStr = seatNum > 0 ? String(seatNum) : String(seat || "").trim();
      const g = parseStudentGradeFromCls(grade, cls);
      const sKey = `${g}_${cls}_${seatStr}`;
      if (!map.has(sKey)) {
        map.set(sKey, {
          studentKey: sKey,
          grade: g,
          className: cls,
          seat: seatStr,
          seatNum,
          name: "",
          inRoster: false,
          hasCloud: false,
          totalScore: 0,
          crownCount: 0,
          updatedAt: "",
          pinCode: "",
          avatar: null,
          rawProgressList: []
        });
      }
      return map.get(sKey);
    };

    state.data.roster.forEach((r) => {
      const cls = String(r.className || r.cls || "").trim();
      if (!cls) return;
      const entry = ensureEntry(r.grade, cls, r.seatNum !== undefined ? r.seatNum : r.seat);
      entry.inRoster = true;
      const rName = String(r.realName !== undefined ? r.realName : (r.name || "")).trim();
      if (rName) entry.name = rName;
    });

    state.data.students.forEach((s) => {
      const cls = String(s.className || s.cls || "").trim();
      if (!cls) return;
      const entry = ensureEntry(s.grade, cls, s.seat);
      entry.hasCloud = true;
      if (s.name && (!entry.name || !entry.inRoster)) entry.name = String(s.name).trim();
      entry.totalScore = Math.max(entry.totalScore, Number(s.totalScore) || 0);
      entry.crownCount = Math.max(entry.crownCount, Number(s.crownCount) || 0);
      entry.updatedAt = String(s.updatedAt || entry.updatedAt || "");
      entry.pinCode = String(s.pinCode || "").trim();
      entry.avatar = (s.avatar && typeof s.avatar === "object") ? s.avatar : entry.avatar;
      if (s.progress !== undefined && s.progress !== null && s.progress !== "") {
        entry.rawProgressList.push(s.progress);
      }
      if (s.completedProgress !== undefined && s.completedProgress !== null && s.completedProgress !== "") {
        entry.rawProgressList.push(s.completedProgress);
      }
    });

    const AV = window.AvatarSystem;
    const hairStyles = (AV && AV.HAIR_STYLES) || [];

    return Array.from(map.values()).map((st) => {
      const progressSet = parseStudentProgressSet(st.rawProgressList);
      const cc = window.CompletionCenter;
      let easyCount = 0;
      let mediumCount = 0;
      let hardCount = 0;
      let passedTotal = 0;
      let gradePassed = 0;
      const islandCompletions = {};

      // 強制共用全站唯一權威完成度計算中心 calculateIslandCompletion，確保與大地圖、雷達圖 100% 一致
      catalog.islandCatalog.forEach((isl) => {
        const comp = typeof window.calculateIslandCompletion === "function"
          ? window.calculateIslandCompletion(isl.id, progressSet)
          : null;
        if (comp) {
          islandCompletions[isl.id] = comp;
          passedTotal += comp.passedStages;
          (comp.unitDetails || []).forEach((ud) => {
            if (ud.passedDiffs.easy) { easyCount++; if (ud.grade === Number(st.grade)) gradePassed++; }
            if (ud.passedDiffs.medium) { mediumCount++; if (ud.grade === Number(st.grade)) gradePassed++; }
            if (ud.passedDiffs.hard) { hardCount++; if (ud.grade === Number(st.grade)) gradePassed++; }
          });
        } else {
          isl.units.forEach((u) => {
            u.diffs.forEach((d) => {
              if (!isUnitDiffPassed(progressSet, u, d)) return;
              passedTotal++;
              if (d === "medium") mediumCount++;
              else if (d === "hard") hardCount++;
              else easyCount++;
              if (u.grade === st.grade) gradePassed++;
            });
          });
        }
      });

      const pctNum = cc && typeof cc.computeCompletionPercentage === "function"
        ? cc.computeCompletionPercentage(passedTotal, catalog.totalLevels)
        : (catalog.totalLevels > 0 ? Math.round((passedTotal / catalog.totalLevels) * 100) : 0);
      const gradeTotal = catalog.gradeTotal[st.grade] || 0;
      const gradePctNum = cc && typeof cc.computeCompletionPercentage === "function"
        ? cc.computeCompletionPercentage(gradePassed, gradeTotal)
        : (gradeTotal > 0 ? Math.round((gradePassed / gradeTotal) * 100) : 0);

      const look = st.avatar && st.avatar.look
        ? (AV && typeof AV.normalizeLook === "function" ? AV.normalizeLook(st.avatar.look) : st.avatar.look)
        : null;
      const presetObj = look ? hairStyles.find((h) => h.id === look.hair) : null;
      const citadelTokens = (window.Store && typeof window.Store.extractCitadelTokens === "function")
        ? Array.from(new Set([
            ...window.Store.extractCitadelTokens(st.rawProgressList),
            ...window.Store.extractCitadelTokens(st.avatar)
          ])).sort()
        : [];

      return {
        ...st,
        progress: Array.from(progressSet),
        progressSet,
        passedSet: progressSet,
        citadelTokens,
        islandCompletions,
        passedTotal,
        pctNum,
        pctText: String(pctNum),
        gradePassed,
        gradeTotal,
        gradePctText: String(gradePctNum),
        easyCount,
        mediumCount,
        hardCount,
        presetLocked: !!(st.avatar && st.avatar.presetLocked),
        presetName: presetObj ? presetObj.name : (look ? look.hair : "尚未設定")
      };
    });
  }

  function renderCompletionRowsHtml(allRows, catalog) {
    const AV = window.AvatarSystem;
    const q = state.compSearch.trim().toLowerCase();
    const filtered = allRows.filter((row) => {
      if (state.compGrade !== "all" && row.grade !== state.compGrade) return false;
      if (state.compClass !== "all" && row.className !== state.compClass) return false;
      if (q) {
        const hay = `${row.className} ${row.seat} ${row.name} ${row.presetName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (state.compSort === "pct") {
        if (b.pctNum !== a.pctNum) return b.pctNum - a.pctNum;
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      } else if (state.compSort === "score") {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.pctNum !== a.pctNum) return b.pctNum - a.pctNum;
      }
      const clsCmp = a.className.localeCompare(b.className, "zh-Hant", { numeric: true });
      if (clsCmp !== 0) return clsCmp;
      return a.seatNum - b.seatNum;
    });

    window.__teacherMergedStudents = filtered;
    window.__teacherCurriculumCatalog = catalog;

    if (filtered.length === 0) {
      return `<div class="tc-empty">🔍 找不到符合條件的學生資料。</div>`;
    }

    return `
      <div class="tc-comp-summary-bar">
        <span>顯示 <b>${filtered.length}</b> / ${allRows.length} 位學生</span>
        <span>全島總關卡數：<b>${catalog.totalLevels}</b> 關（含 ${catalog.islandCatalog.length} 大島嶼 × 易／中／難）</span>
      </div>
      <div class="tc-comp-table-scroll" id="tcCompTableScroll" data-scrollable="true" style="display: block; width: 100%; height: 50vh; max-height: 50vh; overflow-y: scroll !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; position: relative; pointer-events: auto !important; scrollbar-width: auto;">
        <table class="tc-comp-table">
          <thead>
            <tr>
              <th>班級座號</th>
              <th>姓名</th>
              <th>個人驗證碼</th>
              <th>選定角色造型</th>
              <th>全島與年級完成度</th>
              <th>成績與島嶼明細</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((row, idx) => {
              const revealed = state.revealedPins.has(row.studentKey);
              const pinCell = row.pinCode
                ? `<div class="tc-pin-cell">
                    <code class="tc-pin-val">${revealed ? esc(row.pinCode) : "••••"}</code>
                    <button type="button" class="tc-mini-btn tc-pin-eye-btn" data-skey="${esc(row.studentKey)}" title="${revealed ? "隱藏驗證碼" : "查看驗證碼"}">${revealed ? "🙈" : "👁️"}</button>
                    <button type="button" class="tc-mini-btn warn tc-pin-reset-btn" data-skey="${esc(row.studentKey)}" data-cls="${esc(row.className)}" data-seat="${esc(row.seat)}" data-grade="${esc(row.grade)}" data-name="${esc(row.name)}">重設驗證碼</button>
                  </div>`
                : `<span class="tc-pill-muted">尚未設定</span>`;

              const avatarHtml = (row.avatar && row.avatar.look && AV && typeof AV.renderMiniAvatar === "function")
                ? `<span class="tc-comp-avatar">${AV.renderMiniAvatar(row.avatar, { label: row.presetName })}</span>`
                : `<span class="tc-comp-avatar empty">?</span>`;

              const roleCell = `<div class="tc-role-cell">
                ${avatarHtml}
                <div class="tc-role-meta">
                  <strong>${esc(row.presetName)}</strong>
                  <div class="tc-role-tags">
                    ${row.presetLocked
                      ? `<span class="tc-lock-tag locked">🔒 已鎖定</span><button type="button" class="tc-mini-btn accent tc-avatar-unlock-btn" data-skey="${esc(row.studentKey)}" data-cls="${esc(row.className)}" data-seat="${esc(row.seat)}" data-grade="${esc(row.grade)}" data-name="${esc(row.name)}">解鎖造型</button>`
                      : (row.avatar ? `<span class="tc-lock-tag free">試穿中</span>` : `<span class="tc-pill-muted">未登入</span>`)}
                  </div>
                </div>
              </div>`;

              const barPct = Math.min(100, Math.max(0, row.pctNum));
              return `<tr>
                <td><span class="tc-seat-chip">${esc(row.className)} · ${String(row.seatNum).padStart(2, "0")}號</span></td>
                <td class="tc-name-cell">${esc(displayName(row.name, row.seatNum))}</td>
                <td>${pinCell}</td>
                <td>${roleCell}</td>
                <td>
                  <div class="tc-prog-cell">
                    <div class="tc-prog-top">
                      <strong>${row.passedTotal} / ${catalog.totalLevels} 關 (${row.pctText}%)</strong>
                      <small>所屬 ${esc(row.grade)} 年級：${row.gradePassed} / ${row.gradeTotal} (${row.gradePctText}%)</small>
                    </div>
                    <div class="tc-prog-track"><i style="width:${barPct}%"></i></div>
                    <div class="tc-diff-pills">
                      <span class="tc-dp easy">易 ${row.easyCount} 關</span>
                      <span class="tc-dp med">中 ${row.mediumCount} 關</span>
                      <span class="tc-dp hard">難 ${row.hardCount} 關</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="tc-stat-act-cell">
                    <div class="tc-stat-nums"><span>👑 ${row.crownCount}</span><span>⭐ ${row.totalScore.toLocaleString()}</span></div>
                    <button type="button" class="tc-mini-btn info tc-island-detail-btn" data-action="open-island-details" data-student-idx="${idx}" data-skey="${esc(row.studentKey)}" style="pointer-events: auto; cursor: pointer;">🔍 島嶼明細</button>
                  </div>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderCompletionTab(body) {
    const catalog = buildCurriculumCatalog();
    const allRows = buildMergedStudents(catalog);
    const allClasses = Array.from(new Set(allRows.map((r) => r.className).filter(Boolean)))
      .filter((c) => state.compGrade === "all" || parseStudentGradeFromCls("", c) === state.compGrade)
      .sort((a, b) => a.localeCompare(b, "zh-Hant", { numeric: true }));

    if (state.compClass !== "all" && !allClasses.includes(state.compClass)) {
      state.compClass = "all";
    }

    body.innerHTML = `
      <section class="tc-panel tc-comp-panel">
        <div class="tc-comp-toolbar">
          <label class="tc-ctrl">
            <span>年級</span>
            <select id="tcCompGrade">
              <option value="all"${state.compGrade === "all" ? " selected" : ""}>全部年級</option>
              <option value="7"${state.compGrade === "7" ? " selected" : ""}>七年級</option>
              <option value="8"${state.compGrade === "8" ? " selected" : ""}>八年級</option>
              <option value="9"${state.compGrade === "9" ? " selected" : ""}>九年級</option>
            </select>
          </label>
          <label class="tc-ctrl">
            <span>班級</span>
            <select id="tcCompClass">
              <option value="all"${state.compClass === "all" ? " selected" : ""}>全部班級</option>
              ${allClasses.map((c) => `<option value="${esc(c)}"${state.compClass === c ? " selected" : ""}>${esc(c)} 班</option>`).join("")}
            </select>
          </label>
          <label class="tc-ctrl tc-ctrl-search">
            <span>搜尋學生</span>
            <input type="text" id="tcCompSearch" value="${esc(state.compSearch)}" placeholder="姓名、座號、班級或角色…" autocomplete="off" />
          </label>
          <label class="tc-ctrl">
            <span>排序</span>
            <select id="tcCompSort">
              <option value="seat"${state.compSort === "seat" ? " selected" : ""}>班級／座號</option>
              <option value="pct"${state.compSort === "pct" ? " selected" : ""}>完成度 %</option>
              <option value="score"${state.compSort === "score" ? " selected" : ""}>總積分</option>
            </select>
          </label>
        </div>
        <div id="tcCompTableWrap">${renderCompletionRowsHtml(allRows, catalog)}</div>
      </section>
    `;
    bindCompletionScrollListeners(body);
  }

  function bindCompletionScrollListeners(rootEl = cockpitWrap) {
    if (!rootEl || typeof rootEl.querySelectorAll !== "function") return;
    rootEl.querySelectorAll('[data-scrollable="true"], .tc-comp-table-scroll').forEach((scrollEl) => {
      if (scrollEl.dataset.scrollBound === "1") return;
      scrollEl.dataset.scrollBound = "1";
      scrollEl.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
      scrollEl.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });
    });
  }

  function closeDetailModal() {
    const activeModal = document.getElementById("teacher-island-details-modal");
    if (activeModal && activeModal.parentNode) {
      activeModal.parentNode.removeChild(activeModal);
    }
    detailWrap.classList.remove("show");
    detailWrap.classList.add("hidden", "pointer-events-none");
    detailWrap.hidden = true;
    notifyCockpitToggle();
  }

  function closeConfirmModal() {
    confirmWrap.classList.remove("show");
    confirmWrap.classList.add("hidden", "pointer-events-none");
    confirmWrap.hidden = true;
  }

  function openStudentDetailModal(studentOrKey, explicitCatalog = null) {
    const catalog = explicitCatalog || window.__teacherCurriculumCatalog || buildCurriculumCatalog();
    let st = (studentOrKey && typeof studentOrKey === "object") ? studentOrKey : null;
    if (!st) {
      const cachedList = Array.isArray(window.__teacherMergedStudents) ? window.__teacherMergedStudents : [];
      st = cachedList.find((r) => r && r.studentKey === studentOrKey) || null;
      if (!st) {
        const allRows = buildMergedStudents(catalog);
        st = allRows.find((r) => r && r.studentKey === studentOrKey) || null;
      }
    }
    if (!st) return;

    const progressSet = st.progressSet instanceof Set
      ? st.progressSet
      : parseStudentProgressSet(st.progress !== undefined ? st.progress : (st.completedProgress || st.rawProgressList || []));

    const oldModal = document.getElementById("teacher-island-details-modal");
    if (oldModal && oldModal.parentNode) {
      oldModal.parentNode.removeChild(oldModal);
    }
    detailWrap.classList.remove("show");
    detailWrap.classList.add("hidden", "pointer-events-none");
    detailWrap.hidden = true;

    const modal = document.createElement("div");
    modal.id = "teacher-island-details-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "學生七大島嶼完成明細");
    modal.setAttribute("data-scrollable", "true");
    modal.style.cssText = [
      "position: fixed",
      "inset: 0",
      "z-index: 2147483647",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "padding: 16px",
      "background: rgba(15, 23, 42, 0.85)",
      "pointer-events: auto",
      "box-sizing: border-box",
      'font-family: "Noto Sans TC", sans-serif'
    ].join("; ") + ";";

    const card = document.createElement("div");
    card.id = "tcIslandDetailsCard";
    card.setAttribute("data-scrollable", "true");
    card.style.cssText = [
      "width: min(1080px, 95vw)",
      "max-height: 85vh",
      "overflow-y: auto",
      "overscroll-behavior: contain",
      "-webkit-overflow-scrolling: touch",
      "background: linear-gradient(165deg, #0f172a, #0b223d)",
      "border: 1.5px solid rgba(124, 199, 255, 0.42)",
      "border-radius: 22px",
      "padding: 22px 24px",
      "color: #f8fafc",
      "box-shadow: 0 24px 64px rgba(0, 0, 0, 0.65)",
      "box-sizing: border-box",
      "pointer-events: auto",
      'font-family: "Noto Sans TC", sans-serif'
    ].join("; ") + ";";

    const totalUnits = catalog.islandCatalog.reduce((sum, isl) => sum + isl.units.length, 0);

    const islandCardsHtml = catalog.islandCatalog.map((isl) => {
      const comp = typeof window.calculateIslandCompletion === "function"
        ? window.calculateIslandCompletion(isl.id, progressSet)
        : null;
      const detailById = comp
        ? Object.fromEntries((comp.unitDetails || []).map((ud) => [ud.unitId, ud]))
        : {};
      const islPassed = comp ? comp.passedStages : 0;
      const islTotal = comp ? comp.totalStages : isl.totalLevels;
      const islPct = comp ? comp.percentage : 0;

      const unitRowsHtml = isl.units.map((u) => {
        const ud = detailById[u.unitKey];
        const diffBadgesHtml = u.diffs.map((d) => {
          const ok = ud ? Boolean(ud.passedDiffs && ud.passedDiffs[d]) : isUnitDiffPassed(progressSet, u, d);
          const fullLabel = DIFF_FULL_LABELS[d] || DIFF_LABELS[d] || d;
          const badgeStyle = ok
            ? (d === "hard"
              ? "background: rgba(245, 158, 11, 0.24); border: 1px solid rgba(251, 191, 36, 0.72); color: #fde68a;"
              : "background: rgba(16, 185, 129, 0.24); border: 1px solid rgba(52, 211, 153, 0.68); color: #6ee7b7;")
            : "background: rgba(148, 163, 184, 0.12); border: 1px solid rgba(148, 163, 184, 0.22); color: #94a3b8;";
          return `<span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 800; white-space: nowrap; ${badgeStyle}">${ok ? "✔" : "○"} ${esc(fullLabel)}</span>`;
        }).join("");

        return `<div style="display: flex; flex-direction: column; gap: 6px; padding: 9px 10px; border-radius: 10px; background: rgba(15, 23, 42, 0.56); border: 1px solid rgba(148, 163, 184, 0.16);">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 6px;">
            <span style="font-size: 0.82rem; font-weight: 800; color: #f1f5f9; line-height: 1.35;">
              <span style="display: inline-block; padding: 1px 6px; margin-right: 6px; border-radius: 6px; background: rgba(56, 189, 248, 0.16); color: #7dd3fc; font-size: 0.7rem; font-weight: 700;">${esc(u.termLabel)}</span>${esc(u.unitName)}
            </span>
            <code style="font-size: 0.68rem; color: #64748b; flex-shrink: 0;">${esc(u.unitKey)}</code>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 5px;">${diffBadgesHtml}</div>
        </div>`;
      }).join("");

      return `<section style="padding: 14px; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(255, 255, 255, 0.04); display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <h4 style="margin: 0; font-size: 0.98rem; font-weight: 900; color: #ffffff;">${esc(isl.emoji)} ${esc(isl.name)}</h4>
          <span style="font-size: 0.8rem; font-weight: 800; color: #7dd3fc; white-space: nowrap;">${islPassed} / ${islTotal} (${islPct}%)</span>
        </div>
        <div style="height: 6px; border-radius: 999px; background: rgba(15, 23, 42, 0.8); overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.22);">
          <i style="display: block; height: 100%; width: ${islPct}%; border-radius: 999px; background: linear-gradient(90deg, #38bdf8, #34d399);"></i>
        </div>
        <div style="display: flex; flex-direction: column; gap: 7px;">${unitRowsHtml}</div>
      </section>`;
    }).join("");

    const citadelTokens = Array.isArray(st.citadelTokens)
      ? st.citadelTokens
      : ((window.Store && typeof window.Store.extractCitadelTokens === "function")
        ? Array.from(new Set([
            ...window.Store.extractCitadelTokens(st.rawProgressList),
            ...window.Store.extractCitadelTokens(st.avatar)
          ])).sort()
        : []);
    const ctSet = new Set(citadelTokens);
    const dojoSpecs = [
      { id: "dojo:fsm", icon: "🔐", name: "有限狀態機金庫" },
      { id: "dojo:dag", icon: "⚡", name: "多約束 DAG 排程賽" },
      { id: "dojo:bitwise", icon: "🔌", name: "位元遮罩邏輯逆向工程" },
      { id: "dojo:recursion", icon: "🌲", name: "遞迴回溯與堆疊剪枝" }
    ];
    const capstoneSpecs = [
      { id: "capstone:zero-day", icon: "🚨", name: "零日危機：校慶系統癱瘓" },
      { id: "capstone:smart-city", icon: "🚐", name: "失控的智慧城市風暴" }
    ];
    const allDojoDone = dojoSpecs.every((d) => ctSet.has(d.id));
    const allCapDone = capstoneSpecs.every((c) => ctSet.has(c.id));
    const citadelAccessMet = ctSet.has("citadel:unlocked") || (catalog.islandCatalog.length >= 7 && catalog.islandCatalog.every((isl) => {
      const comp = typeof window.calculateIslandCompletion === "function" ? window.calculateIslandCompletion(isl.id, progressSet) : null;
      return comp && comp.percentage >= 80;
    }));
    const renderCitadelBadge = (item, kindColor) => {
      const ok = ctSet.has(item.id);
      const stStyle = ok
        ? `background: rgba(251, 191, 36, 0.22); border: 1px solid ${kindColor}; color: #fde68a;`
        : "background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.24); color: #94a3b8;";
      return `<span style="display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 800; ${stStyle}">${ok ? "✔" : "○"} ${item.icon} ${esc(item.name)}</span>`;
    };

    card.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.15);">
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
          <span style="padding: 6px 13px; border-radius: 999px; background: rgba(79, 179, 255, 0.2); border: 1px solid rgba(124, 199, 255, 0.45); font-size: 0.92rem; font-weight: 800; color: #f8fafc;">${esc(st.className)} 班 ${String(st.seatNum).padStart(2, "0")} 號 · ${esc(displayName(st.name, st.seatNum))}</span>
          <span style="padding: 6px 13px; border-radius: 999px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(52, 211, 153, 0.5); color: #6ee7b7; font-size: 0.9rem; font-weight: 800;">總完成：${st.passedTotal} / ${catalog.totalLevels} 關 (${st.pctText}%)</span>
          <span style="padding: 6px 13px; border-radius: 999px; background: rgba(255, 209, 102, 0.18); border: 1px solid rgba(255, 209, 102, 0.45); color: #fde68a; font-size: 0.88rem; font-weight: 800;">👑 ${st.crownCount} · ⭐ ${st.totalScore.toLocaleString()}</span>
          <span style="padding: 5px 11px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: #cbd5e1; font-size: 0.8rem; font-weight: 700;">易 ${st.easyCount} · 中 ${st.mediumCount} · 難 ${st.hardCount}（共 ${catalog.islandCatalog.length} 島 / ${totalUnits} 單元）</span>
        </div>
        <button type="button" id="tcIslandDetailsCloseBtn" aria-label="關閉島嶼明細視窗" style="padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.12); color: #ffffff; font-weight: 800; font-size: 0.92rem; cursor: pointer; pointer-events: auto; font-family: 'Noto Sans TC', sans-serif;">✕ 關閉</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; margin-top: 16px;">
        ${islandCardsHtml}
      </div>
      <section style="margin-top: 18px; padding: 16px; border-radius: 16px; border: 1.5px solid rgba(251, 191, 36, 0.42); background: linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.9)); display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
          <h4 style="margin: 0; font-size: 1.02rem; font-weight: 900; color: #fde68a;">🏛️ 天穹試煉浮島戰績</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <span style="padding: 4px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 800; ${citadelAccessMet ? "background: rgba(16,185,129,0.22); border: 1px solid rgba(52,211,153,0.6); color:#6ee7b7;" : "background: rgba(148,163,184,0.12); border: 1px solid rgba(148,163,184,0.25); color:#94a3b8;"}">${citadelAccessMet ? "✨ 已達 80% 解封天穹浮島" : "🔒 尚未達 80% 解封門檻"}</span>
            ${allDojoDone ? `<span style="padding: 4px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 900; background: rgba(56,189,248,0.22); border: 1px solid rgba(125,211,252,0.7); color:#7dd3fc;">⚡ 演算法宗師</span>` : ""}
            ${allCapDone ? `<span style="padding: 4px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 900; background: rgba(251,191,36,0.25); border: 1px solid rgba(253,224,71,0.75); color:#fde68a;">🕵️ 首席資安鑑識官</span>` : ""}
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #7dd3fc;">🧠 運算思維互動道場（+30 ⭐／關）</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${dojoSpecs.map((d) => renderCitadelBadge(d, "rgba(56, 189, 248, 0.75)")).join("")}
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #fde68a;">🕵️ 跨島綜合解謎檔案室（+50 ⭐／案）</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${capstoneSpecs.map((c) => renderCitadelBadge(c, "rgba(251, 191, 36, 0.8)")).join("")}
          </div>
        </div>
      </section>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);

    const stopScrollBubble = (e) => e.stopPropagation();
    card.addEventListener("wheel", stopScrollBubble, { passive: true });
    card.addEventListener("touchmove", stopScrollBubble, { passive: true });
    modal.addEventListener("wheel", stopScrollBubble, { passive: true });
    modal.addEventListener("touchmove", stopScrollBubble, { passive: true });
    modal.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target === modal) closeDetailModal();
    });

    const closeBtn = card.querySelector("#tcIslandDetailsCloseBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDetailModal();
      });
      setTimeout(() => closeBtn.focus(), 20);
    }

    notifyCockpitToggle();
  }

  async function postTeacherAction(actionName, payload) {
    const url = getGasUrl();
    if (!url) throw new Error("尚未設定 GAS_LEADERBOARD_URL");
    const sess = getTeacherSession();
    if (!sess || !sess.password) throw new Error("教師驗證已逾時，請重新登入");
    const authPayload = {
      action: actionName,
      password: sess.password
    };
    if (sess.teacherId) authPayload.teacherId = sess.teacherId;
    if (sess.account) authPayload.account = sess.account;
    const res = await postGasAction({
      ...authPayload,
      ...payload
    });
    if (res && res.status === "unauthorized") {
      clearTeacherSession();
      throw new Error("教師驗證已逾時，請重新登入");
    }
    return res;
  }

  /* ---- 課堂登入高清 QR Code 視窗 ---- */
  function closeQrModal() {
    qrWrap.classList.remove("show");
    qrWrap.classList.add("hidden", "pointer-events-none");
    qrWrap.hidden = true;
    notifyCockpitToggle();
  }

  function openQrModal() {
    const portalUrl = getStudentPortalUrl();
    if (!portalUrl) {
      showToast("尚未取得教師專屬代碼，無法產生 QR Code", "warn");
      return;
    }
    const t = state.teacher || {};
    const schoolTitle = t.schoolName ? `${t.schoolName} — ${t.teacherName || ""}老師` : "資訊課程島專屬入口";
    const card = qrWrap.querySelector("#tcQrCard");
    card.innerHTML = `
      <div class="tc-proj-head">
        <div class="tc-proj-badges">
          <span class="tc-proj-badge">📱 課堂學生登入 QR Code</span>
          <span class="tc-proj-badge diff">🏫 ${esc(schoolTitle)}</span>
        </div>
        <button type="button" id="tcQrClose" class="tc-proj-close">✕ 關閉</button>
      </div>
      <div class="tc-qr-body">
        <h3>請同學掃描下方 QR Code 進入專屬課程島</h3>
        <p class="tc-qr-sub">掃碼後系統將自動綁定本校與教師班級，無需手動輸入學校代碼！</p>
        <div class="tc-qr-canvas-box">
          <canvas id="tcQrCanvas" width="340" height="340" aria-label="學生專屬登入 QR Code"></canvas>
        </div>
        <div class="tc-qr-url-box">
          <code>${esc(portalUrl)}</code>
        </div>
        <div class="tc-qr-actions">
          <button type="button" id="tcQrCopyBtn" class="tc-icon-btn">📋 複製專屬連結</button>
          <button type="button" id="tcQrDownloadBtn" class="btn-primary">⬇️ 下載高清 QR Code</button>
        </div>
      </div>
    `;

    qrWrap.hidden = false;
    qrWrap.classList.remove("hidden", "pointer-events-none");
    qrWrap.classList.add("show");
    notifyCockpitToggle();

    const canvas = card.querySelector("#tcQrCanvas");
    if (canvas) {
      QRCode.toCanvas(canvas, portalUrl, {
        width: 340,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#0f172a", light: "#ffffff" }
      }).catch((err) => {
        console.warn("QRCode 繪製失敗:", err);
      });
    }

    card.querySelector("#tcQrClose").onclick = closeQrModal;
    card.querySelector("#tcQrCopyBtn").onclick = async () => {
      const ok = await copyTextToClipboard(portalUrl);
      if (ok) showToast("✅ 已複製專屬學生入口連結！", "ok");
      else showToast("❌ 複製失敗，請手動選取上方網址複製", "warn");
    };
    card.querySelector("#tcQrDownloadBtn").onclick = () => {
      if (!canvas) return;
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `資訊課程島_${(t.schoolName || "班級入口")}_${t.teacherId || "QR"}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("⬇️ 已下載高清 QR Code 圖檔！", "ok");
      } catch {
        showToast("❌ 下載失敗，請右鍵另存圖片", "warn");
      }
    };
  }

  /* ---- 📋 班級名冊管理（Excel 複製貼上 + CSV 上傳 + 範本下載） ---- */
  function splitRosterLine(line) {
    if (line.includes("\t")) {
      return line.split("\t").map((cell) => cell.trim());
    }
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === "," || ch === "，") && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  function parseGradeToken(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (/^[789]$/.test(s)) return s;
    if (/^7|七|國一/.test(s)) return "7";
    if (/^8|八|國二/.test(s)) return "8";
    if (/^9|九|國三/.test(s)) return "9";
    return "";
  }

  function normalizeRosterClassToken(rawGrade, rawClass) {
    const g = parseGradeToken(rawGrade);
    const cleaned = String(rawClass || "").trim().replace(/[班\s]/g, "");
    const digits = cleaned.replace(/\D/g, "");
    if (/^[789]\d{2}$/.test(digits)) return digits;
    if (g && /^\d{1,2}$/.test(digits)) {
      return g + digits.padStart(2, "0");
    }
    return cleaned;
  }

  function parseRosterText(rawText, sourceLabel = "") {
    const cleanText = String(rawText || "").replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const map = new Map();
    const warnings = [];

    lines.forEach((line, idx) => {
      const cols = splitRosterLine(line).filter((c, cIdx) => c !== "" || cIdx < 4);
      if (cols.length < 3) {
        warnings.push(`第 ${idx + 1} 列欄位不足 3 欄，已略過`);
        return;
      }

      let gradeRaw = "";
      let clsRaw = "";
      let seatRaw = "";
      let nameRaw = "";

      if (cols.length >= 4 && (parseGradeToken(cols[0]) || /年級|grade/i.test(cols[0]))) {
        gradeRaw = cols[0];
        clsRaw = cols[1];
        seatRaw = cols[2];
        nameRaw = cols[3];
      } else if (cols.length >= 4 && !/^\d+$/.test(cols[1].replace(/號$/, "")) && /^\d+$/.test(cols[2].replace(/號$/, ""))) {
        gradeRaw = cols[0];
        clsRaw = cols[1];
        seatRaw = cols[2];
        nameRaw = cols[3];
      } else {
        clsRaw = cols[0];
        seatRaw = cols[1];
        nameRaw = cols[2];
      }

      const seatDigits = String(seatRaw || "").replace(/號/g, "").trim();
      const seatNum = Number(seatDigits);

      // 自動略過表頭列（例如：年級,班級,座號,姓名）
      if (idx === 0 && (!seatDigits || Number.isNaN(seatNum) || /座號|seat|姓名|name|班級/i.test(line))) {
        return;
      }

      const className = normalizeRosterClassToken(gradeRaw, clsRaw);
      const grade = parseGradeToken(gradeRaw) || parseStudentGradeFromCls("", className);
      const name = String(nameRaw || "").trim();

      if (!className || !/^[789]\d{2}$/.test(className)) {
        warnings.push(`第 ${idx + 1} 列班級「${clsRaw}」格式無法辨識（應如 701、802），已略過`);
        return;
      }
      if (!Number.isInteger(seatNum) || seatNum < 1 || seatNum > 60) {
        warnings.push(`第 ${idx + 1} 列座號「${seatRaw}」不在 1~60 範圍，已略過`);
        return;
      }
      if (!name) {
        warnings.push(`第 ${idx + 1} 列姓名為空，已略過`);
        return;
      }

      const key = `${className}__${seatNum}`;
      map.set(key, {
        grade,
        className,
        seat: String(seatNum),
        seatNum,
        name: name.slice(0, 20)
      });
    });

    const entries = Array.from(map.values()).sort((a, b) => {
      const cmp = a.className.localeCompare(b.className, "zh-Hant", { numeric: true });
      return cmp !== 0 ? cmp : a.seatNum - b.seatNum;
    });
    const classes = Array.from(new Set(entries.map((e) => e.className)));

    return { entries, classes, warnings, sourceLabel };
  }

  function renderRosterPreviewHtml() {
    const parsed = state.rosterParsed || { entries: [], classes: [], warnings: [] };
    if (!state.rosterDraftText.trim() && parsed.entries.length === 0) {
      return `<div class="tc-empty-sm">📋 請在上方貼上 Excel／試算表名單，或上傳 <code>.csv</code> 檔案，系統將即時顯示匯入預覽確認表。</div>`;
    }

    const warnHtml = parsed.warnings && parsed.warnings.length > 0
      ? `<div class="tc-roster-warn">⚠️ 有 ${parsed.warnings.length} 列略過：${esc(parsed.warnings.slice(0, 3).join("；"))}${parsed.warnings.length > 3 ? "…" : ""}</div>`
      : "";

    if (parsed.entries.length === 0) {
      return `${warnHtml}<div class="tc-empty-sm">尚未解析出有效的學生名冊資料，請確認欄位為「班級、座號、姓名」或「年級、班級、座號、姓名」。</div>`;
    }

    return `
      <div class="tc-roster-preview-head">
        <div class="tc-roster-pills">
          <span class="tc-roster-stat ok">🏫 已解析 <b>${parsed.classes.length}</b> 個班級</span>
          <span class="tc-roster-stat info">👥 共 <b>${parsed.entries.length}</b> 位學生</span>
          ${parsed.classes.map((c) => `<span class="tc-roster-cls-chip">${esc(c)} 班</span>`).join("")}
        </div>
      </div>
      ${warnHtml}
      <div class="tc-roster-preview-scroll" data-scrollable="true">
        <table class="tc-comp-table tc-roster-table">
          <thead>
            <tr>
              <th>#</th>
              <th>年級</th>
              <th>班級</th>
              <th>座號</th>
              <th>姓名</th>
            </tr>
          </thead>
          <tbody>
            ${parsed.entries.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${esc(it.grade)} 年級</td>
                <td><span class="tc-seat-chip">${esc(it.className)} 班</span></td>
                <td>${String(it.seatNum).padStart(2, "0")} 號</td>
                <td class="tc-name-cell">${esc(it.name)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSavedRosterPreviewHtml(curRoster, curClasses) {
    const list = Array.isArray(curRoster) ? curRoster : [];
    const header = `
      <div class="tc-roster-preview-head">
        <div class="tc-roster-pills">
          <strong class="tc-roster-saved-title">☁️ 目前雲端已儲存名冊預覽（共 ${list.length} 筆）</strong>
          ${curClasses.length > 0 ? `<span class="tc-roster-stat ok">🏫 ${curClasses.length} 個班級</span>` : ""}
        </div>
      </div>
    `;
    if (list.length === 0) {
      return `
        <div class="tc-roster-saved-wrap">
          ${header}
          <div class="tc-empty-sm">☁️ 雲端試算表目前尚未儲存任何班級名冊，請使用上方匯入工具新增名冊。</div>
        </div>
      `;
    }
    return `
      <div class="tc-roster-saved-wrap">
        ${header}
        <div class="tc-roster-preview-scroll" data-scrollable="true">
          <table class="tc-comp-table tc-roster-table">
            <thead>
              <tr>
                <th>#</th>
                <th>年級</th>
                <th>班級</th>
                <th>座號</th>
                <th>姓名</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((it, idx) => {
                const cls = String(it.className || it.cls || "").trim();
                const seatNum = Number(it.seatNum !== undefined ? it.seatNum : it.seat) || 0;
                const grade = String(it.grade || parseStudentGradeFromCls("", cls)).trim();
                const rawName = String(it.realName !== undefined ? it.realName : (it.name || "")).trim();
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${esc(grade)} 年級</td>
                    <td><span class="tc-seat-chip">${esc(cls)} 班</span></td>
                    <td>${String(seatNum).padStart(2, "0")} 號</td>
                    <td class="tc-name-cell">${esc(displayName(rawName, seatNum))}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderRosterTab(body) {
    const curRoster = Array.isArray(state.data.roster) ? state.data.roster : [];
    const curClassCounts = new Map();
    curRoster.forEach((r) => {
      const c = String(r.className || r.cls || "").trim();
      if (c) curClassCounts.set(c, (curClassCounts.get(c) || 0) + 1);
    });
    const curClasses = Array.from(curClassCounts.keys()).sort((a, b) => a.localeCompare(b, "zh-Hant", { numeric: true }));

    const parsedCount = (state.rosterParsed && state.rosterParsed.entries) ? state.rosterParsed.entries.length : 0;
    const statusObj = state.rosterStatus || {};

    body.innerHTML = `
      <section class="tc-panel tc-roster-panel">
        <div class="tc-panel-head">
          <h3>📋 班級名冊管理（抓漏點名與個別完成度名單基準）</h3>
          <small>目前雲端名冊：<b>${curClasses.length}</b> 個班級 · 共 <b>${curRoster.length}</b> 位學生</small>
        </div>

        <div class="tc-roster-current-bar">
          ${curClasses.length === 0
            ? `<span class="tc-pill-muted">尚未匯入雲端班級名冊（目前抓漏雷達暫以 1～30 號推算）</span>`
            : curClasses.map((c) => `<span class="tc-roster-cls-chip">${esc(c)} 班 <b>${curClassCounts.get(c)}</b>人</span>`).join("")}
        </div>

        <div class="tc-roster-methods">
          <div class="tc-roster-method">
            <div class="tc-rm-head">
              <strong>✨ 方式 A（最推薦）：從 Excel / Google 試算表直接複製貼上（Ctrl+V）</strong>
              <small>自動智慧解析 Tab 或逗號分隔，支援「年級、班級、座號、姓名」四欄或「班級(如701)、座號、姓名」三欄</small>
            </div>
            <textarea id="tcRosterPasteInput" class="tc-roster-textarea" data-scrollable="true" rows="7" placeholder="請直接從 Excel 或 Google 試算表框選複製貼上，例如：&#10;701&#9;1&#9;王小明&#10;701&#9;2&#9;陳小華&#10;或四欄格式：&#10;7&#9;701&#9;1&#9;王小明">${esc(state.rosterDraftText)}</textarea>
          </div>

          <div class="tc-roster-method tc-roster-csv-bar">
            <div class="tc-rm-head">
              <strong>📄 方式 B：下載標準範本或匯入 .csv 檔案</strong>
              <small>範本採 UTF-8 BOM 編碼，Excel 開啟不亂碼；匯入時亦自動相容 UTF-8 與 Big5 CSV</small>
            </div>
            <div class="tc-roster-csv-btns">
              <button type="button" id="tcRosterDownloadTplBtn" class="tc-icon-btn">📥 下載範本（班級名冊範本.csv）</button>
              <label class="tc-icon-btn tc-file-btn" for="tcRosterCsvInput">📂 選擇 .csv 檔案匯入</label>
              <input type="file" id="tcRosterCsvInput" accept=".csv,text/csv" hidden />
              <button type="button" id="tcRosterClearDraftBtn" class="tc-icon-btn">🧹 清空貼上區</button>
            </div>
          </div>
        </div>

        <div id="tcRosterPreviewWrap" class="tc-roster-preview-wrap">
          ${renderRosterPreviewHtml()}
        </div>

        <div class="tc-roster-actions">
          <button type="button" id="tcRosterMergeBtn" class="btn-primary tc-roster-save-btn"${state.rosterSaving || parsedCount === 0 ? " disabled" : ""}>
            ${state.rosterSaving ? "⏳ 寫入雲端中…" : "➕ 合併／更新現有名冊（保留其他班級）"}
          </button>
          <button type="button" id="tcRosterOverwriteBtn" class="tc-icon-btn tc-danger-btn"${state.rosterSaving || parsedCount === 0 ? " disabled" : ""}>
            ⚠️ 覆蓋全部名冊
          </button>
        </div>
        <p class="tc-df-status tc-roster-status${statusObj.kind ? ` ${esc(statusObj.kind)}` : ""}" id="tcRosterStatus" role="status" aria-live="polite">${esc(statusObj.text || "")}</p>

        ${renderSavedRosterPreviewHtml(curRoster, curClasses)}
      </section>
    `;
    bindCompletionScrollListeners(body);
  }

  function downloadRosterTemplate() {
    const csv = [
      "年級,班級,座號,姓名",
      "7,701,1,王小明",
      "7,701,2,陳小華",
      "8,802,1,林大同"
    ].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "班級名冊範本.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("📥 已下載班級名冊範本.csv", "ok");
  }

  function handleRosterCsvFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buf = reader.result;
        let text = new TextDecoder("utf-8").decode(buf);
        if (text.includes("\uFFFD")) {
          try {
            text = new TextDecoder("big5").decode(buf);
          } catch {}
        }
        state.rosterDraftText = text;
        state.rosterParsed = parseRosterText(text, file.name);
        state.rosterStatus = {
          text: state.rosterParsed.entries.length > 0
            ? `📂 已讀取「${file.name}」，解析出 ${state.rosterParsed.classes.length} 個班級、共 ${state.rosterParsed.entries.length} 位學生`
            : `⚠️ 「${file.name}」未解析出有效學生資料，請檢查欄位格式`,
          kind: state.rosterParsed.entries.length > 0 ? "ok" : "warn"
        };
        renderMainBody();
      } catch (err) {
        state.rosterStatus = { text: `❌ 讀取檔案失敗：${err.message}`, kind: "err" };
        renderMainBody();
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function executeSaveRoster(mode) {
    if (state.rosterSaving) return;
    const parsed = state.rosterParsed || { entries: [] };
    if (!parsed.entries || parsed.entries.length === 0) {
      state.rosterStatus = { text: "⚠️ 請先貼上或匯入至少一筆有效的名冊資料（尚未寫入雲端）", kind: "err" };
      renderMainBody();
      return;
    }

    const teacherSession = getTeacherSession();
    if (!teacherSession || !teacherSession.password) {
      clearTeacherSession();
      state.rosterStatus = {
        text: "❌ 寫入雲端失敗（資料未寫入雲端）：教師驗證已逾時或憑證遺失，請重新登入後再試。",
        kind: "err"
      };
      renderMainBody();
      return;
    }

    state.rosterSaving = true;
    state.rosterStatus = { text: "⏳ 正在將班級名冊寫入雲端試算表，請稍候…", kind: "" };
    renderMainBody();

    try {
      const normalizedMode = mode === "overwrite" ? "overwrite" : "merge";
      const rosterList = parsed.entries.map((it) => {
        const cls = String(it.className || it.cls || "").trim();
        const seatDigits = String(it.seatNum !== undefined ? it.seatNum : (it.seat || "")).replace(/\D/g, "");
        return {
          grade: String(it.grade || parseStudentGradeFromCls("", cls)),
          className: cls,
          seat: seatDigits.padStart(2, "0"),
          realName: String(it.realName !== undefined ? it.realName : (it.name || "")).trim()
        };
      });

      const res = await postGasAction({
        action: "save_roster",
        teacherId: String(teacherSession.teacherId || "").trim(),
        account: String(teacherSession.account || "").trim(),
        password: String(teacherSession.password || "").trim(),
        mode: normalizedMode,
        rosterList
      });

      if (!res || typeof res !== "object") {
        throw new Error("後端未回傳有效的 JSON 格式回應");
      }
      if (res.status === "unauthorized") {
        clearTeacherSession();
        throw new Error((res.message || "教師帳號或密碼驗證失敗") + "，請重新登入");
      }
      if (res.status !== "ok") {
        throw new Error(res.message || res.error || `後端回傳異常狀態（${res.status || "unknown"}）`);
      }

      if (Array.isArray(res.roster)) {
        state.data.roster = normalizeRosterList(res.roster);
      }
      const classes = getAllClasses();
      if ((!state.selectedClass || !classes.includes(state.selectedClass)) && classes.length > 0) {
        state.selectedClass = classes[0];
      }
      const totalSaved = Array.isArray(res.roster) ? state.data.roster.length : (Number(res.count) || rosterList.length);
      state.rosterStatus = {
        text: `✅ 已成功寫入雲端試算表（共 ${totalSaved} 筆），「未交卷抓漏雷達」與「📊 個別完成度」已同步更新！`,
        kind: "ok"
      };
      showToast(`✅ 已成功寫入雲端試算表（共 ${totalSaved} 筆）`, "ok", 3200);
    } catch (err) {
      state.rosterStatus = {
        text: `❌ 寫入雲端失敗（資料未寫入雲端）：${(err && err.message) || "請檢查網路連線或 GAS 部署"}`,
        kind: "err"
      };
      showToast("❌ 名冊寫入雲端失敗，資料未儲存！", "warn", 3500);
    } finally {
      state.rosterSaving = false;
      renderMainBody();
    }
  }

  function openTeacherConfirmModal({ title, msg, confirmLabel, onConfirm }) {
    const card = confirmWrap.querySelector("#tcConfirmCard");
    card.innerHTML = `
      <h3>${esc(title)}</h3>
      <p class="tc-confirm-msg">${esc(msg)}</p>
      <p class="tc-inline-status" id="tcConfirmErr" role="alert" hidden></p>
      <div class="tc-confirm-actions">
        <button type="button" class="tc-icon-btn" id="tcConfirmCancel">取消</button>
        <button type="button" class="btn-primary tc-confirm-ok" id="tcConfirmOk">${esc(confirmLabel)}</button>
      </div>
    `;
    card.querySelector("#tcConfirmCancel").onclick = closeConfirmModal;
    card.querySelector("#tcConfirmOk").onclick = async () => {
      const okBtn = card.querySelector("#tcConfirmOk");
      const errEl = card.querySelector("#tcConfirmErr");
      okBtn.disabled = true;
      okBtn.textContent = "⏳ 處理中…";
      errEl.hidden = true;
      try {
        await onConfirm();
        closeConfirmModal();
      } catch (err) {
        errEl.hidden = false;
        errEl.className = "tc-inline-status err";
        errEl.textContent = `❌ ${(err && err.message) || "操作失敗"}`;
        okBtn.disabled = false;
        okBtn.textContent = confirmLabel;
      }
    };
    confirmWrap.hidden = false;
    confirmWrap.classList.remove("hidden", "pointer-events-none");
    confirmWrap.classList.add("show");
  }

  function renderMainBody() {
    renderTopBar();
    const body = cockpitWrap.querySelector("#tcMainBody");
    body.classList.toggle("tc-main-comp", state.activeTab === "completion");
    if (state.activeTab === "radar") renderRadarTab(body);
    else if (state.activeTab === "completion") renderCompletionTab(body);
    else if (state.activeTab === "roster") renderRosterTab(body);
    else if (state.activeTab === "wrong") renderWrongTab(body);
    else renderDispatchTab(body);
  }

  /* ---- 開啟 / 關閉 / 縮小戰情室 ---- */
  function switchAuthTab(tabName) {
    state.authTab = tabName === "register" ? "register" : "login";
    const isReg = state.authTab === "register";
    authWrap.querySelectorAll(".tc-auth-tab").forEach((btn) => {
      const active = btn.dataset.authTab === state.authTab;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    const loginForm = authWrap.querySelector("#tcAuthForm");
    const regForm = authWrap.querySelector("#tcRegForm");
    if (loginForm) loginForm.hidden = isReg;
    if (regForm) regForm.hidden = !isReg;
    const authErr = authWrap.querySelector("#tcAuthErr");
    const regErr = authWrap.querySelector("#tcRegErr");
    if (authErr) authErr.textContent = "";
    if (regErr) regErr.textContent = "";
  }

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

  async function toggleCitadelTemporaryUnlock() {
    const cloudCur = (window.CloudConfig && typeof window.CloudConfig.get === "function") ? window.CloudConfig.get() : {};
    const curFlag = Boolean(
      (state.data.config && (state.data.config.unlockCitadel === true || String(state.data.config.unlockCitadel || "").toLowerCase() === "true"))
      || (window.CloudConfig && typeof window.CloudConfig.isCitadelTempUnlocked === "function" && window.CloudConfig.isCitadelTempUnlocked())
    );
    const nextFlag = !curFlag;

    if (window.CloudConfig && typeof window.CloudConfig.setLocalCitadelOverride === "function") {
      window.CloudConfig.setLocalCitadelOverride(nextFlag);
    }
    const baseCfg = {
      announcement: String((state.data.config && state.data.config.announcement) ?? cloudCur.announcement ?? ""),
      targetIsland: String((state.data.config && state.data.config.targetIsland) ?? cloudCur.targetIsland ?? ""),
      taskLinkTitle: String((state.data.config && state.data.config.taskLinkTitle) ?? cloudCur.taskLinkTitle ?? ""),
      taskLinkUrl: String((state.data.config && state.data.config.taskLinkUrl) ?? cloudCur.taskLinkUrl ?? ""),
      unlockCitadel: nextFlag ? "true" : "false"
    };
    state.data.config = createDraftFromConfig(baseCfg);
    if (state.dispatchDraft) state.dispatchDraft.unlockCitadel = nextFlag;
    if (window.CloudConfig && typeof window.CloudConfig.set === "function") {
      window.CloudConfig.set(baseCfg);
    } else {
      document.dispatchEvent(new CustomEvent("ii:config-updated", { detail: { ...baseCfg, unlockCitadel: nextFlag } }));
    }
    if (window.__island3D && typeof window.__island3D.syncCitadelState === "function") {
      window.__island3D.syncCitadelState();
    }
    renderTopBar();
    setGlobalStatus(
      nextFlag
        ? "⚡ 已臨時開放天穹浮島（課堂演示／競賽培訓模式），本機已即時解封！正在同步至雲端 Config…"
        : "🔒 已關閉臨時開放模式，恢復「七島皆達 80%」嚴格結界門檻，正在同步至雲端 Config…",
      "ok"
    );

    const sess = getTeacherSession();
    if (sess && sess.password) {
      try {
        const res = await saveCloudConfig(baseCfg, sess);
        if (res && res.status === "ok") {
          setGlobalStatus(
            nextFlag
              ? "✅ 已臨時開放天穹浮島並同步雲端 Config（全班學生可立即登島練習）！"
              : "✅ 已關閉臨時開放並同步雲端 Config（恢復七島皆達 80% 嚴格門檻）！",
            "ok"
          );
        }
      } catch (err) {
        console.warn("[teacher_cockpit] 同步 unlockCitadel 至雲端失敗:", err);
      }
    }
    setTimeout(() => setGlobalStatus(""), 3600);
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
    closeQrModal();
    closeDetailModal();
    closeConfirmModal();
    if (state.activeStage !== null && typeof window.previewAllStage === "function") {
      window.previewAllStage("auto");
      state.activeStage = null;
    }
    notifyCockpitToggle();
  }

  function openAuthModal(prefillErr = "", { preserveDispatchDraft = false, defaultTab = "login" } = {}) {
    state.pendingReauthOnly = !!preserveDispatchDraft;
    switchAuthTab(defaultTab);
    const errEl = authWrap.querySelector("#tcAuthErr");
    const pwdInput = authWrap.querySelector("#tcPasswordInput");
    const accInput = authWrap.querySelector("#tcLoginAccount");
    const sess = getTeacherSession();
    if (accInput && sess && sess.account && !accInput.value) {
      accInput.value = sess.account;
    }
    if (errEl) errEl.textContent = prefillErr;
    if (pwdInput) pwdInput.value = "";
    authWrap.hidden = false;
    authWrap.classList.remove("hidden", "pointer-events-none");
    authWrap.classList.add("show");
    notifyCockpitToggle();
    setTimeout(() => {
      if (state.authTab === "register") {
        const regSchool = authWrap.querySelector("#tcRegSchool");
        if (regSchool) regSchool.focus();
      } else if (accInput && !accInput.value.trim()) {
        accInput.focus();
      } else if (pwdInput) {
        pwdInput.focus();
      }
    }, 60);
  }

  async function openTeacherCockpit() {
    const sess = getTeacherSession();
    if (sess && sess.password) {
      try {
        const res = await fetchTeacherDashboard(sess.password, sess);
        if (res && res.status === "ok") {
          setTeacherSession(res.teacher || sess, sess.password, sess.account);
          applyDashboardData(res);
          showCockpitWorkspace();
          return;
        }
        if (res && res.status === "unauthorized") {
          clearTeacherSession();
          openAuthModal("教師驗證已逾時，請重新登入");
          return;
        }
      } catch {
        if (state.hasLoadedDashboard) {
          showCockpitWorkspace();
          setGlobalStatus("⚠️ 暫時無法連線同步最新資料，目前顯示已載入畫面", "err");
          return;
        }
      }
    }
    openAuthModal();
  }

  async function handleRefreshClick() {
    const btn = cockpitWrap.querySelector("#tcRefreshBtn");
    const sess = getTeacherSession();
    if (!sess || !sess.password) {
      setGlobalStatus("⚠️ 教師驗證已逾時，請重新登入", "err");
      openAuthModal("教師驗證已逾時，請重新登入");
      return;
    }
    setGlobalStatus("");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ 同步中…";
    }
    try {
      const res = await fetchTeacherDashboard(sess.password, sess);
      if (res && res.status === "ok") {
        setTeacherSession(res.teacher || sess, sess.password, sess.account);
        applyDashboardData(res);
        renderMainBody();
        setGlobalStatus("✅ 已同步雲端最新班級與設定資料", "ok");
        setTimeout(() => setGlobalStatus(""), 3200);
      } else if (res && res.status === "unauthorized") {
        clearTeacherSession();
        closeCockpit();
        openAuthModal("教師驗證已逾時，請重新登入");
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

  function handleTeacherLogout() {
    clearTeacherSession();
    state.data = { roster: [], students: [], wrongLogs: [], config: null };
    state.selectedClass = "";
    state.rosterDraftText = "";
    state.rosterParsed = { entries: [], classes: [], warnings: [], sourceLabel: "" };
    state.rosterStatus = { text: "", kind: "" };
    closeCockpit();
    openAuthModal("", { defaultTab: "login" });
    showToast("👋 已登出教師戰情室", "ok", 2200);
  }

  /* ---- 事件綁定（外層容器事件委派） ---- */
  function handleTopmostEscape() {
    if (document.getElementById("teacher-question-projector") || projWrap.classList.contains("show")) closeProjectorModal();
    else if (document.getElementById("teacher-island-details-modal") || detailWrap.classList.contains("show")) closeDetailModal();
    else if (confirmWrap.classList.contains("show")) closeConfirmModal();
    else if (qrWrap.classList.contains("show")) closeQrModal();
    else if (authWrap.classList.contains("show")) closeAuthModal();
    else if (cockpitWrap.classList.contains("show")) closeCockpit();
  }

  if (!window.__projectionClickBound) {
    window.__projectionClickBound = true;
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;

      const projBtn = target.closest('[data-action="project-wrong-question"]');
      if (projBtn) {
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(projBtn.getAttribute("data-wrong-idx"));
        const cached = Array.isArray(window.__teacherTopWrongList) ? window.__teacherTopWrongList : [];
        const item = (Number.isInteger(idx) && cached[idx]) ? cached[idx] : {
          unitId: projBtn.getAttribute("data-unit") || "",
          difficulty: projBtn.getAttribute("data-diff") || "",
          questionKey: projBtn.getAttribute("data-qkey") || "",
          count: Number(projBtn.getAttribute("data-count")) || 0
        };
        openProjectorModal(item);
        return;
      }

      const islandDetailBtn = target.closest('[data-action="open-island-details"]');
      if (islandDetailBtn) {
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(islandDetailBtn.getAttribute("data-student-idx"));
        const cachedStudents = Array.isArray(window.__teacherMergedStudents) ? window.__teacherMergedStudents : [];
        const studentObj = (Number.isInteger(idx) && idx >= 0 && cachedStudents[idx])
          ? cachedStudents[idx]
          : (islandDetailBtn.getAttribute("data-skey") || "");
        openStudentDetailModal(studentObj, window.__teacherCurriculumCatalog || null);
      }
    }, true);
  }

  const stopBubble = (e) => { e.stopPropagation(); };
  [cockpitWrap, authWrap, qrWrap, projWrap, detailWrap, confirmWrap].forEach((container) => {
    container.addEventListener("click", stopBubble);
    container.addEventListener("pointerdown", stopBubble);
    container.addEventListener("mousedown", stopBubble);
    container.addEventListener("wheel", stopBubble, { passive: true });
    container.addEventListener("touchmove", stopBubble, { passive: true });
    container.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && (!isFormFieldTarget(e.target) || projWrap.classList.contains("show") || !!document.getElementById("teacher-question-projector") || !!document.getElementById("teacher-island-details-modal"))) {
        handleTopmostEscape();
      }
      e.stopPropagation();
    });
    container.addEventListener("keyup", stopBubble);
  });

  authWrap.querySelector("#tcAuthClose").onclick = closeAuthModal;
  authWrap.addEventListener("click", (e) => { if (e.target === authWrap) closeAuthModal(); });
  authWrap.querySelectorAll(".tc-auth-tab").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      switchAuthTab(tabBtn.dataset.authTab);
    });
  });

  authWrap.querySelector("#tcAuthForm").onsubmit = async (e) => {
    e.preventDefault();
    const accInput = authWrap.querySelector("#tcLoginAccount");
    const pwdInput = authWrap.querySelector("#tcPasswordInput");
    const errEl = authWrap.querySelector("#tcAuthErr");
    const submitBtn = authWrap.querySelector("#tcAuthSubmit");
    const account = String(accInput ? accInput.value : "").trim();
    const pwd = String(pwdInput ? pwdInput.value : "").trim();
    if (!account) {
      errEl.textContent = "請輸入教師帳號";
      if (accInput) accInput.focus();
      return;
    }
    if (!pwd) {
      errEl.textContent = "請輸入密碼";
      if (pwdInput) pwdInput.focus();
      return;
    }
    errEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ 驗證中…";
    try {
      const res = await teacherLoginApi(account, pwd);
      if (res && res.status === "ok") {
        // 第一時間寫入統一憑證物件（含 4 小時有效期與相容舊版密碼變數）
        setTeacherSession(res.teacher || { account }, pwd, account);
        const preserveDraft = state.pendingReauthOnly;
        state.pendingReauthOnly = false;
        if (!preserveDraft) {
          state.rosterStatus = { text: "", kind: "" };
        }
        closeAuthModal();
        applyDashboardData(res, { preserveDispatchDraft: preserveDraft });
        showCockpitWorkspace();
        if (res.teacher && res.teacher.teacherName) {
          showToast(`🏫 歡迎回來，${res.teacher.teacherName}老師！`, "ok", 2600);
        }
      } else if (res && res.status === "unauthorized") {
        errEl.textContent = res.message || "帳號或密碼錯誤";
        if (pwdInput) pwdInput.select();
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

  authWrap.querySelector("#tcRegForm").onsubmit = async (e) => {
    e.preventDefault();
    const schoolEl = authWrap.querySelector("#tcRegSchool");
    const nameEl = authWrap.querySelector("#tcRegName");
    const accEl = authWrap.querySelector("#tcRegAccount");
    const pwdEl = authWrap.querySelector("#tcRegPassword");
    const pwd2El = authWrap.querySelector("#tcRegPasswordConfirm");
    const errEl = authWrap.querySelector("#tcRegErr");
    const submitBtn = authWrap.querySelector("#tcRegSubmit");

    const schoolName = String(schoolEl ? schoolEl.value : "").trim();
    const teacherName = String(nameEl ? nameEl.value : "").trim();
    const account = String(accEl ? accEl.value : "").trim();
    const password = String(pwdEl ? pwdEl.value : "").trim();
    const passwordConfirm = String(pwd2El ? pwd2El.value : "").trim();

    if (schoolName.length < 2) {
      errEl.textContent = "請輸入學校名稱（至少 2 字）";
      if (schoolEl) schoolEl.focus();
      return;
    }
    if (!teacherName) {
      errEl.textContent = "請輸入教師姓名";
      if (nameEl) nameEl.focus();
      return;
    }
    if (account.length < 3) {
      errEl.textContent = "請輸入登入帳號（建議使用學校 Email）";
      if (accEl) accEl.focus();
      return;
    }
    if (password.length < 4) {
      errEl.textContent = "請設定至少 4 碼的登入密碼";
      if (pwdEl) pwdEl.focus();
      return;
    }
    if (password !== passwordConfirm) {
      errEl.textContent = "❌ 兩次輸入的密碼不一致，請重新確認！";
      if (pwd2El) {
        pwd2El.focus();
        pwd2El.select();
      }
      return;
    }

    errEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ 正在建立專屬試算表…";
    try {
      const res = await registerTeacherApi({ schoolName, teacherName, account, password });
      if (res && res.status === "ok" && res.teacher) {
        // 第一時間寫入統一憑證物件（含 4 小時有效期與相容舊版密碼變數）
        setTeacherSession({ schoolName, teacherName, account, ...res.teacher }, password, account);
        closeAuthModal();
        applyDashboardData(res);
        showCockpitWorkspace();
        const tid = res.teacher.teacherId || "";
        const welcomeMsg = `🎉 歡迎 ${res.teacher.teacherName} 老師！已為「${res.teacher.schoolName}」自動建立專屬試算表（教師代碼：${tid}）`;
        setGlobalStatus(welcomeMsg, "ok");
        showToast(welcomeMsg, "ok", 4500);
        if (window.Store && typeof window.Store.fetchGasSnapshot === "function") {
          void window.Store.fetchGasSnapshot(undefined, { force: true }).catch(() => {});
        }
      } else {
        errEl.textContent = (res && res.message) || "註冊開通失敗，請稍後再試";
      }
    } catch (err) {
      errEl.textContent = `連線失敗：${err.message || "請檢查網路或 GAS 部署"}`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "✨ 建立獨立試算表並開通戰情室";
    }
  };

  cockpitWrap.addEventListener("click", (e) => {
    const target = e.target;
    if (!target || typeof target.closest !== "function") return;

    if (target.closest("#tcCopyLinkBtn")) {
      const url = getStudentPortalUrl();
      if (!url) return;
      void copyTextToClipboard(url).then((ok) => {
        if (ok) {
          showToast("📋 已複製專屬學生入口連結！", "ok", 2600);
          setGlobalStatus(`✅ 已複製學生專屬連結：${url}`, "ok");
          setTimeout(() => setGlobalStatus(""), 3200);
        } else {
          setGlobalStatus("⚠️ 瀏覽器未允許自動複製，請手動複製網址", "err");
        }
      });
      return;
    }

    if (target.closest("#tcShowQrBtn")) {
      openQrModal();
      return;
    }

    if (target.closest("#tcLogoutBtn")) {
      handleTeacherLogout();
      return;
    }

    if (target.closest("#tcRosterDownloadTplBtn")) {
      downloadRosterTemplate();
      return;
    }

    if (target.closest("#tcRosterClearDraftBtn")) {
      state.rosterDraftText = "";
      state.rosterParsed = { entries: [], classes: [], warnings: [], sourceLabel: "" };
      state.rosterStatus = { text: "", kind: "" };
      renderMainBody();
      return;
    }

    if (target.closest("#tcRosterMergeBtn")) {
      void executeSaveRoster("merge");
      return;
    }

    if (target.closest("#tcRosterOverwriteBtn")) {
      const cnt = (state.rosterParsed && state.rosterParsed.entries) ? state.rosterParsed.entries.length : 0;
      if (cnt === 0) return;
      openTeacherConfirmModal({
        title: "⚠️ 確定要覆蓋全部雲端名冊？",
        msg: `此操作將以目前預覽的 ${cnt} 位學生（${state.rosterParsed.classes.length} 個班級）完全取代雲端原有 Roster 名冊，確定要繼續嗎？`,
        confirmLabel: "確定覆蓋全部名冊",
        onConfirm: () => executeSaveRoster("overwrite")
      });
      return;
    }

    const pinEyeBtn = target.closest(".tc-pin-eye-btn");
    if (pinEyeBtn) {
      const skey = pinEyeBtn.dataset.skey;
      if (state.revealedPins.has(skey)) state.revealedPins.delete(skey);
      else state.revealedPins.add(skey);
      renderMainBody();
      return;
    }

    const pinResetBtn = target.closest(".tc-pin-reset-btn");
    if (pinResetBtn) {
      const { skey, cls, seat, grade, name } = pinResetBtn.dataset;
      const whoLabel = `${cls} 班 ${String(seat).padStart(2, "0")} 號（${displayName(name, seat)}）`;
      openTeacherConfirmModal({
        title: "🔑 確定重設個人驗證碼？",
        msg: `確定要清除 ${whoLabel} 的個人驗證碼嗎？重設後該生下次登入時將可重新設定一組 4~6 碼驗證碼。`,
        confirmLabel: "確定重設",
        onConfirm: async () => {
          const res = await postTeacherAction("reset_student_pin", { studentKey: skey, grade, className: cls, seat });
          if (res && res.status === "unauthorized") {
            clearTeacherSession();
            throw new Error("教師驗證已逾時，請重新登入");
          }
          if (!res || res.status !== "ok") {
            throw new Error((res && res.message) || "重設驗證碼失敗");
          }
          const hit = state.data.students.find((s) => s.studentKey === skey || (`${parseStudentGradeFromCls(s.grade, s.className)}_${s.className}_${s.seat}` === skey));
          if (hit) hit.pinCode = "";
          state.revealedPins.delete(skey);
          renderMainBody();
          setGlobalStatus(`✅ 已清除 ${whoLabel} 的個人驗證碼`, "ok");
          setTimeout(() => setGlobalStatus(""), 3200);
        }
      });
      return;
    }

    const unlockAvBtn = target.closest(".tc-avatar-unlock-btn");
    if (unlockAvBtn) {
      const { skey, cls, seat, grade, name } = unlockAvBtn.dataset;
      const whoLabel = `${cls} 班 ${String(seat).padStart(2, "0")} 號（${displayName(name, seat)}）`;
      openTeacherConfirmModal({
        title: "🔓 確定解鎖角色基礎造型？",
        msg: `確定要解鎖 ${whoLabel} 的基礎角色嗎？解鎖後該生下次登入即可重新挑選其他 8 位基礎角色。`,
        confirmLabel: "確定解鎖",
        onConfirm: async () => {
          const res = await postTeacherAction("unlock_student_avatar", { studentKey: skey, grade, className: cls, seat });
          if (res && res.status === "unauthorized") {
            clearTeacherSession();
            throw new Error("教師驗證已逾時，請重新登入");
          }
          if (!res || res.status !== "ok") {
            throw new Error((res && res.message) || "解鎖角色失敗");
          }
          const hit = state.data.students.find((s) => s.studentKey === skey || (`${parseStudentGradeFromCls(s.grade, s.className)}_${s.className}_${s.seat}` === skey));
          if (hit) {
            if (!hit.avatar || typeof hit.avatar !== "object") hit.avatar = {};
            hit.avatar.presetLocked = false;
          }
          renderMainBody();
          setGlobalStatus(`✅ 已為 ${whoLabel} 解鎖基礎造型`, "ok");
          setTimeout(() => setGlobalStatus(""), 3200);
        }
      });
      return;
    }

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
    if (target.closest("#tcPrivacyBtn")) {
      state.isPrivacyMode = !state.isPrivacyMode;
      renderMainBody();
      return;
    }
    if (target.closest("#tcCitadelUnlockBtn")) {
      void toggleCitadelTemporaryUnlock();
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
      return;
    }
    if (id === "tcRosterPasteInput") {
      state.rosterDraftText = e.target.value || "";
      state.rosterParsed = parseRosterText(state.rosterDraftText, "貼上資料");
      state.rosterStatus = { text: "", kind: "" };
      const previewEl = cockpitWrap.querySelector("#tcRosterPreviewWrap");
      if (previewEl) {
        previewEl.innerHTML = renderRosterPreviewHtml();
        bindCompletionScrollListeners(previewEl);
      }
      const hasEntries = state.rosterParsed.entries.length > 0;
      const mergeBtn = cockpitWrap.querySelector("#tcRosterMergeBtn");
      const overBtn = cockpitWrap.querySelector("#tcRosterOverwriteBtn");
      if (mergeBtn) mergeBtn.disabled = state.rosterSaving || !hasEntries;
      if (overBtn) overBtn.disabled = state.rosterSaving || !hasEntries;
      const statusEl = cockpitWrap.querySelector("#tcRosterStatus");
      if (statusEl) { statusEl.textContent = ""; statusEl.className = "tc-df-status tc-roster-status"; }
      return;
    }
    if (id === "tcCompSearch") {
      state.compSearch = e.target.value || "";
      const wrapEl = cockpitWrap.querySelector("#tcCompTableWrap");
      if (wrapEl) {
        const catalog = buildCurriculumCatalog();
        wrapEl.innerHTML = renderCompletionRowsHtml(buildMergedStudents(catalog), catalog);
        bindCompletionScrollListeners(wrapEl);
      }
    }
  });

  cockpitWrap.addEventListener("change", (e) => {
    const target = e.target;
    if (!target) return;
    if (target.id === "tcRosterCsvInput") {
      const file = target.files && target.files[0];
      if (file) handleRosterCsvFile(file);
      target.value = "";
      return;
    }
    if (target.id === "tcCompGrade") {
      state.compGrade = target.value || "all";
      state.compClass = "all";
      renderMainBody();
      return;
    }
    if (target.id === "tcCompClass") {
      state.compClass = target.value || "all";
      renderMainBody();
      return;
    }
    if (target.id === "tcCompSort") {
      state.compSort = target.value || "seat";
      renderMainBody();
      return;
    }
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
  qrWrap.addEventListener("click", (e) => { if (e.target === qrWrap) closeQrModal(); });
  projWrap.addEventListener("click", (e) => { if (e.target === projWrap) closeProjectorModal(); });
  detailWrap.addEventListener("click", (e) => { if (e.target === detailWrap) closeDetailModal(); });
  confirmWrap.addEventListener("click", (e) => { if (e.target === confirmWrap) closeConfirmModal(); });

  document.addEventListener("keydown", (e) => {
    if (isFormFieldTarget(e.target) && !projWrap.classList.contains("show") && !document.getElementById("teacher-question-projector") && !document.getElementById("teacher-island-details-modal")) return;
    if (e.key === "Escape") {
      handleTopmostEscape();
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

  window.parseStudentProgressSet = parseStudentProgressSet;
  window.TeacherCockpit = { open: openTeacherCockpit, close: closeCockpit, findQuestionForProjection, parseStudentProgressSet };
})();
