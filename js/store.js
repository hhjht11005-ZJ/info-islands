/* 資料層:學員身分 + 學習紀錄(本機 localStorage,並可同步到 Google 試算表) + 年級榮譽成績池 */
(() => {
  const CFG = window.APP_CONFIG;
  const PROFILE = "ii:profile", QUEUE = "ii:queue", POOL = "ii:leaderboard:pool", LB_PENDING = "ii:leaderboard:pending", LB_SYNCED = "ii:leaderboard:synced_v1", ACTIVE_ISLAND = "ii:activeIslandId";
  const TEACHER_ID_KEY = "island_teacher_id", TEACHER_META_KEY = "island_cached_teacher_info_v2", TEACHERS_LIST_KEY = "island_cached_teachers_v2", CONFIG_CACHE_KEY = "island_cached_config_v2";
  const LEGACY_TEACHER_META_KEY = "ii:teacher_meta_v1", LEGACY_TEACHERS_LIST_KEY = "ii:teachers_list_v1";
  const GAS_TIMEOUT_MS = 10000;
  const GAS_BOOT_TIMEOUT_MS = 8000;
  const GAS_LOGIN_TIMEOUT_MS = 8000;
  const ls = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } }
  };

  function getTeacherId() {
    try { return String(localStorage.getItem(TEACHER_ID_KEY) || "").trim(); } catch { return ""; }
  }
  function normalizeTeacherMeta(m) {
    if (!m || typeof m !== "object" || !m.teacherId) return null;
    return { teacherId: String(m.teacherId || "").trim() };
  }
  function getStoredTeacherMeta() {
    const m = ls.get(TEACHER_META_KEY, null) || ls.get(LEGACY_TEACHER_META_KEY, null);
    return normalizeTeacherMeta(m);
  }
  function getStoredTeachersList() {
    const raw = ls.get(TEACHERS_LIST_KEY, null) || ls.get(LEGACY_TEACHERS_LIST_KEY, []);
    const arr = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.teachersList) ? raw.teachersList : []);
    return arr
      .map((t) => normalizeTeacherMeta(t))
      .filter(Boolean);
  }
  function persistTeacherMeta(meta) {
    if (meta) {
      ls.set(TEACHER_META_KEY, meta);
    } else {
      try {
        localStorage.removeItem(TEACHER_META_KEY);
        localStorage.removeItem(LEGACY_TEACHER_META_KEY);
      } catch {}
    }
  }
  function persistTeachersList(list) {
    ls.set(TEACHERS_LIST_KEY, list);
  }
  function getCachedConfig(explicitTeacherId) {
    const tid = explicitTeacherId !== undefined ? String(explicitTeacherId || "").trim() : getTeacherId();
    const cached = ls.get(CONFIG_CACHE_KEY, null);
    if (!cached || typeof cached !== "object" || !cached.config) return null;
    if (String(cached.teacherId || "").trim() !== tid) return null;
    return cached.config;
  }
  function saveCachedConfig(teacherId, config) {
    if (!config || typeof config !== "object") return;
    ls.set(CONFIG_CACHE_KEY, {
      teacherId: String(teacherId || "").trim(),
      savedAt: Date.now(),
      config
    });
  }

  let cachedTeachersList = getStoredTeachersList();
  let cachedCurrentTeacher = getStoredTeacherMeta();
  let lastGasSnapshot = null;
  let lastSnapshotTeacherKey = null;
  let inflightSnapshot = null;
  let inflightTeacherKey = null;
  let lastGasBoot = null;
  let lastBootTeacherKey = null;
  let inflightBoot = null;
  let inflightBootTeacherKey = null;

  function applyTeacherDirectoryUpdate(teachersList, serverTeacher, tid) {
    if (Array.isArray(teachersList)) {
      cachedTeachersList = teachersList.map((t) => normalizeTeacherMeta(t)).filter(Boolean);
      persistTeachersList(cachedTeachersList);
    }
    if (tid === getTeacherId()) {
      const normalizedServer = normalizeTeacherMeta(serverTeacher);
      if (normalizedServer) {
        cachedCurrentTeacher = {
          ...normalizedServer,
          teacherId: normalizedServer.teacherId || tid
        };
        persistTeacherMeta(cachedCurrentTeacher);
      } else if (tid) {
        const matched = cachedTeachersList.find((t) => t && t.teacherId === tid);
        if (matched) {
          cachedCurrentTeacher = { ...matched };
          persistTeacherMeta(cachedCurrentTeacher);
        }
      }
    }
  }

  function setTeacherId(teacherId, metaObj = null) {
    const cleanId = String(teacherId || "").trim();
    const prevId = getTeacherId();
    try {
      if (cleanId) localStorage.setItem(TEACHER_ID_KEY, cleanId);
      else localStorage.removeItem(TEACHER_ID_KEY);
    } catch (e) { console.warn(e); }

    if (metaObj && typeof metaObj === "object" && metaObj.teacherId === cleanId) {
      cachedCurrentTeacher = normalizeTeacherMeta(metaObj);
      persistTeacherMeta(cachedCurrentTeacher);
    } else if (cleanId) {
      const matched = cachedTeachersList.find((t) => t && t.teacherId === cleanId);
      if (matched) {
        cachedCurrentTeacher = { ...matched };
        persistTeacherMeta(cachedCurrentTeacher);
      } else if (prevId !== cleanId) {
        cachedCurrentTeacher = null;
        persistTeacherMeta(null);
      }
    } else {
      cachedCurrentTeacher = null;
      persistTeacherMeta(null);
    }

    if (prevId !== cleanId) {
      lastGasSnapshot = null;
      lastSnapshotTeacherKey = null;
      lastGasBoot = null;
      lastBootTeacherKey = null;
    }
    document.dispatchEvent(new CustomEvent("ii:teacher-changed", {
      detail: { teacherId: cleanId, teacher: cachedCurrentTeacher }
    }));
    return cleanId;
  }

  // 啟動時自動讀取網址參數 ?t=教師ID 並綁定記憶至 localStorage.island_teacher_id
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTeacherId = (urlParams.get("t") || "").trim();
    if (urlTeacherId) {
      const prevId = getTeacherId();
      localStorage.setItem(TEACHER_ID_KEY, urlTeacherId);
      if (prevId !== urlTeacherId || !cachedCurrentTeacher || cachedCurrentTeacher.teacherId !== urlTeacherId) {
        const matched = cachedTeachersList.find((t) => t && t.teacherId === urlTeacherId);
        if (matched) {
          cachedCurrentTeacher = { ...matched };
          persistTeacherMeta(cachedCurrentTeacher);
        } else {
          cachedCurrentTeacher = null;
          persistTeacherMeta(null);
        }
      }
    }
  } catch (e) { console.warn(e); }
  const evKey = p => `ii:ev:${p.cls}-${p.seat}-${p.name}`;
  const activeIslandKey = p => (p && p.cls && p.name)
    ? `ii:activeIslandId:${p.cls}-${p.seat}-${p.name}`
    : ACTIVE_ISLAND;
  const readActiveIslandRaw = (k) => {
    try {
      const v = localStorage.getItem(k);
      if (!v) return "";
      const trimmed = String(v).trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try { return String(JSON.parse(trimmed) || "").trim(); } catch { return trimmed.slice(1, -1).trim(); }
      }
      return trimmed;
    } catch {
      return "";
    }
  };
  const studentKey = p => `${String(p.cls || "").trim()}-${Number(p.seat) || 0}-${String(p.name || "").trim()}`;
  const buildStudentKey = (grade, className, seat) => `${String(grade).trim()}_${String(className).trim()}_${String(seat).trim()}`;
  const getLeaderboardUrl = () => {
    const cfgUrl = CFG && typeof CFG.LEADERBOARD_URL === "string" ? CFG.LEADERBOARD_URL.trim() : "";
    if (cfgUrl) return cfgUrl;
    return typeof GAS_LEADERBOARD_URL === "string" ? GAS_LEADERBOARD_URL.trim() : "";
  };

  /** 從班級代碼或文字判斷所屬年段（支援 701/803/905、七/八/九、國一/二/三、1xx/2xx/3xx） */
  function parseGradeFromCls(input) {
    if (input && typeof input === "object") {
      const g = Number(input.grade);
      if (g === 7 || g === 8 || g === 9) return g;
      return parseGradeFromCls(input.cls || input.className || input.room || "");
    }
    const s = String(input || "").trim();
    if (!s) return 7;
    if (/^7/.test(s) || /七/.test(s) || /^(?:國)?一/.test(s)) return 7;
    if (/^8/.test(s) || /八/.test(s) || /^(?:國)?二/.test(s)) return 8;
    if (/^9/.test(s) || /九/.test(s) || /^(?:國)?三/.test(s)) return 9;
    if (/^1/.test(s)) return 7;
    if (/^2/.test(s)) return 8;
    if (/^3/.test(s)) return 9;
    return 7;
  }

  /** 彙總單一學生的各島嶼（易/中/難）最高分總和與 100 分滿分皇冠數 */
  function summarizeQuizEvents(events) {
    const slotBest = {};
    let quizCount = 0;
    let latestTs = 0;
    (Array.isArray(events) ? events : []).forEach((e) => {
      if (!e || (e.type && e.type !== "quiz")) return;
      const islId = String(e.island || (e.unit ? String(e.unit).split("-")[0] : "")).trim();
      if (!islId) return;
      const rawDiff = e.difficulty || (e.detail && e.detail.difficulty) || "";
      const diff = /^(easy|medium|hard)$/.test(rawDiff) ? rawDiff : "single";
      const score = Math.max(0, Math.min(100, Math.round(Number(e.score) || 0)));
      const slot = `${islId}:${diff}`;
      if (slotBest[slot] === undefined || score > slotBest[slot]) slotBest[slot] = score;
      quizCount++;
      if (Number(e.ts) > latestTs) latestTs = Number(e.ts);
    });
    const scores = Object.values(slotBest);
    const totalScore = scores.reduce((sum, v) => sum + v, 0);
    const crowns = scores.filter((v) => v >= 100).length;
    return { totalScore, crowns, quizCount, latestTs, slotBest };
  }

  function parseEvKey(k) {
    const raw = String(k || "").replace(/^ii:ev:/, "");
    const m = raw.match(/^([^-]+)-(\d+)-(.+)$/);
    if (!m) return null;
    return { cls: m[1], seat: Number(m[2]), name: m[3].trim() };
  }

  /** 將目前裝置上所有已登入測驗過的學生紀錄同步彙整進統一的本地成績池 */
  function syncLeaderboardPool(extraProfile) {
    const prevPool = ls.get(POOL, { version: 1, students: {} });
    const students = { ...(prevPool && prevPool.students ? prevPool.students : {}) };
    const candidates = new Map();

    const addCandidate = (p) => {
      if (!p || !p.cls || !p.name) return;
      const clean = { cls: String(p.cls).trim(), seat: Number(p.seat) || 0, name: String(p.name).trim() };
      candidates.set(studentKey(clean), clean);
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("ii:ev:")) {
          const parsed = parseEvKey(k);
          if (parsed) addCandidate(parsed);
        }
      }
    } catch {}

    if (Store.profile) addCandidate(Store.profile);
    if (extraProfile) addCandidate(extraProfile);

    candidates.forEach((p, key) => {
      const evs = ls.get(evKey(p), []);
      const stats = summarizeQuizEvents(evs);
      const existing = students[key];
      const hasQuiz = stats.quizCount > 0;
      const gradeNum = parseGradeFromCls(p);
      const totalScore = hasQuiz ? stats.totalScore : (existing ? Math.max(0, Number(existing.totalScore) || 0) : 0);
      const crownCount = hasQuiz ? stats.crowns : (existing ? Math.max(0, Number(existing.crownCount !== undefined ? existing.crownCount : existing.crowns) || 0) : 0);
      const citadelTokens = getCitadelTokens(p);
      students[key] = {
        key,
        studentKey: buildStudentKey(gradeNum, p.cls, p.seat),
        cls: p.cls,
        className: p.cls,
        seat: p.seat,
        name: p.name,
        grade: gradeNum,
        totalScore,
        crowns: crownCount,
        crownCount,
        quizCount: hasQuiz ? stats.quizCount : (existing ? Number(existing.quizCount) || 0 : 0),
        citadelTokens,
        hasCitadelHonor: citadelTokens.some((t) => CITADEL_HONOR_TOKENS.has(t)),
        updatedAt: stats.latestTs || (existing ? (existing.updatedAt || 0) : 0) || Date.now(),
        isVirtual: false,
        isGatekeeper: false
      };
    });

    const nextPool = { version: 1, updatedAt: Date.now(), students };
    ls.set(POOL, nextPool);
    return Object.values(students);
  }

  let remoteLeaderboardFetcher = null;
  let lbUploadSeq = 0;

  const CANONICAL_ISLAND_ALIAS = {
    hw: "sys",
    prog: "code",
    alg: "algo",
    sec: "citizen"
  };

  function canonicalizeUnitId(unitId) {
    if (window.CompletionCenter && typeof window.CompletionCenter.canonicalizeUnitId === "function") {
      return window.CompletionCenter.canonicalizeUnitId(unitId);
    }
    const raw = String(unitId || "").trim();
    if (!raw) return "";
    const normalized = raw.replace(/^([a-z]+)(\d+)$/i, "$1-$2");
    const m = normalized.match(/^([a-z]+)-(\d+)$/i);
    if (!m) return normalized.toLowerCase();
    const prefix = m[1].toLowerCase();
    const canonPrefix = CANONICAL_ISLAND_ALIAS[prefix] || prefix;
    return `${canonPrefix}-${Number(m[2]) || m[2]}`;
  }

  function normalizeDifficultyToken(rawDiff, { allowSingle = false } = {}) {
    if (window.CompletionCenter && typeof window.CompletionCenter.normalizeDifficultyToken === "function") {
      return window.CompletionCenter.normalizeDifficultyToken(rawDiff, { allowSingle });
    }
    const raw = String(rawDiff || "").trim();
    if (!raw) return allowSingle ? "single" : "";
    const low = raw.toLowerCase();
    if (low === "easy" || low === "e" || /易|初階|入門|簡單|基礎/.test(raw)) return "easy";
    if (low === "medium" || low === "med" || low === "m" || /中|進階|普通/.test(raw)) return "medium";
    if (low === "hard" || low === "h" || /難|大師|困難|挑戰/.test(raw)) return "hard";
    if (low === "single" || low === "standard" || raw === "標準") return allowSingle ? "single" : "";
    return "";
  }

  function parseProgressToken(rawToken) {
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
    const unit = canonicalizeUnitId(rawUnit);
    const diff = normalizeDifficultyToken(rawDiff, { allowSingle: true });
    if (!unit || !diff) return null;
    return { unit, diff, key: `${unit}:${diff}` };
  }

  function extractPassedFromAny(val, addPair) {
    if (val === null || val === undefined) return;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return;
      if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
        try {
          extractPassedFromAny(JSON.parse(trimmed), addPair);
          return;
        } catch {}
      }
      trimmed.split(/[,;\n\r]+/).forEach((part) => {
        const parsed = parseProgressToken(part);
        if (parsed) addPair(parsed.unit, parsed.diff);
      });
      return;
    }
    if (Array.isArray(val)) {
      val.forEach((item) => {
        if (typeof item === "string") {
          const parsed = parseProgressToken(item);
          if (parsed) addPair(parsed.unit, parsed.diff);
        } else if (item && typeof item === "object") {
          if (item.type === "quiz" || item.score !== undefined || item.passed !== undefined || item.isPassed !== undefined) {
            if (item.type && item.type !== "quiz") return;
            const passed = item.passed === true || item.isPassed === true || (Number(item.score) >= 60);
            if (!passed) return;
            const u = String(item.unit || item.unitId || item.key || item.id || "").trim();
            const d = item.difficulty || item.quizDifficulty || (item.detail && item.detail.difficulty) || "single";
            addPair(u, d);
          } else if (item.unit && (item.type === "gold" || item.type === "silver")) {
            addPair(item.unit, item.type === "gold" ? "hard" : "medium");
          } else {
            extractPassedFromAny(item, addPair);
          }
        }
      });
      return;
    }
    if (typeof val === "object") {
      if (val.completedProgress !== undefined) extractPassedFromAny(val.completedProgress, addPair);
      if (val.progress !== undefined) extractPassedFromAny(val.progress, addPair);
      if (val.passed !== undefined && typeof val.passed !== "boolean") extractPassedFromAny(val.passed, addPair);
      Object.entries(val).forEach(([k, v]) => {
        if (k === "completedProgress" || k === "progress" || k === "passed") return;
        const tok = parseProgressToken(k);
        if (tok) {
          const ok = v === true || v === 1 || v === "true" || (typeof v === "number" && v >= 60)
            || (v && typeof v === "object" && (v.passed === true || v.isPassed === true || Number(v.score) >= 60));
          if (ok) addPair(tok.unit, tok.diff);
          return;
        }
        const unit = canonicalizeUnitId(k);
        if (!unit || !/^[a-z]+-\d+$/.test(unit)) return;
        if (Array.isArray(v)) {
          v.forEach((sub) => {
            if (typeof sub === "string") addPair(unit, sub);
            else if (sub && typeof sub === "object") {
              const ok = sub.passed === true || sub.isPassed === true || Number(sub.score) >= 60;
              if (ok) addPair(unit, sub.difficulty || sub.diff || "single");
            }
          });
        } else if (v && typeof v === "object") {
          Object.entries(v).forEach(([diffKey, diffVal]) => {
            const ok = diffVal === true || diffVal === 1 || diffVal === "true"
              || (typeof diffVal === "number" && diffVal >= 60)
              || (diffVal && typeof diffVal === "object" && (diffVal.passed === true || diffVal.isPassed === true || Number(diffVal.score) >= 60));
            if (ok) addPair(unit, diffKey);
          });
        } else if (v === true || v === 1 || (typeof v === "number" && v >= 60)) {
          addPair(unit, "single");
        }
      });
    }
  }

  const CITADEL_TOKENS = [
    "dojo:fsm",
    "dojo:dag",
    "dojo:bitwise",
    "dojo:recursion",
    "capstone:zero-day",
    "capstone:smart-city",
    "citadel:unlocked"
  ];
  const CITADEL_TOKEN_SET = new Set(CITADEL_TOKENS);
  const CITADEL_HONOR_TOKENS = new Set(CITADEL_TOKENS.filter((t) => t !== "citadel:unlocked"));

  const citadelKey = (p) => (p && p.cls && p.name)
    ? `ii:citadel:${String(p.cls).trim()}-${Number(p.seat) || p.seat}-${String(p.name).trim()}`
    : "ii:citadel:guest";

  function extractCitadelTokens(raw) {
    const out = new Set();
    const walk = (val) => {
      if (!val) return;
      if (val instanceof Set) { val.forEach(walk); return; }
      if (typeof val === "string") {
        const t = val.trim();
        if (!t) return;
        if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
          try { walk(JSON.parse(t)); return; } catch {}
        }
        t.split(/[,;\n\r]+/).forEach((part) => {
          const k = part.trim().toLowerCase();
          if (CITADEL_TOKEN_SET.has(k)) out.add(k);
        });
        return;
      }
      if (Array.isArray(val)) {
        val.forEach(walk);
        return;
      }
      if (typeof val === "object") {
        if (val.citadelTokens !== undefined) walk(val.citadelTokens);
        if (val.citadelHonors !== undefined) walk(val.citadelHonors);
        if (val.completedProgress !== undefined) walk(val.completedProgress);
        if (val.progress !== undefined) walk(val.progress);
        if (val.look && val.look.citadelHonors !== undefined) walk(val.look.citadelHonors);
        Object.entries(val).forEach(([k, v]) => {
          const lk = String(k || "").trim().toLowerCase();
          if (CITADEL_TOKEN_SET.has(lk) && v) out.add(lk);
        });
      }
    };
    walk(raw);
    return Array.from(out).sort();
  }

  function getCitadelTokens(explicitProfile) {
    const p = explicitProfile !== undefined ? explicitProfile : Store.profile;
    const set = new Set();
    if (!p || !p.cls || !p.name) {
      extractCitadelTokens(ls.get("ii:citadel:guest", [])).forEach((t) => set.add(t));
      return Array.from(set).sort();
    }
    const clsStr = String(p.cls).trim();
    const seatNum = Number(p.seat) || 0;
    const seatVariants = Array.from(new Set([
      String(seatNum || p.seat || "").trim(),
      seatNum > 0 ? String(seatNum).padStart(2, "0") : ""
    ].filter(Boolean)));
    const nameStr = String(p.name).trim();
    seatVariants.forEach((sv) => {
      extractCitadelTokens(ls.get(`ii:citadel:${clsStr}-${sv}-${nameStr}`, [])).forEach((t) => set.add(t));
      const av = ls.get(`ii:avatar:${clsStr}-${sv}-${nameStr}`, null);
      if (av) extractCitadelTokens(av).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }

  function recordCitadelToken(token, { sync = true } = {}) {
    const clean = String(token || "").trim().toLowerCase();
    if (!CITADEL_TOKEN_SET.has(clean)) return { ok: false, gained: 0, tokens: getCitadelTokens() };
    const p = Store.profile;
    const cur = new Set(getCitadelTokens(p));
    const isNew = !cur.has(clean);
    cur.add(clean);
    const nextList = Array.from(cur).sort();

    let grantedRes = null;
    if (window.AvatarSystem && typeof window.AvatarSystem.grantCitadelToken === "function") {
      grantedRes = window.AvatarSystem.grantCitadelToken(clean, { syncCloud: false });
    }
    ls.set(citadelKey(p), nextList);

    const isAvatarLocked = !!(window.AvatarSystem && typeof window.AvatarSystem.isAvatarLocked === "function" && window.AvatarSystem.isAvatarLocked());
    const gained = grantedRes
      ? (Number(grantedRes.gained) || 0)
      : (isNew && isAvatarLocked ? (clean.startsWith("dojo:") ? 30 : (clean.startsWith("capstone:") ? 50 : 0)) : 0);
    const lockedRequired = grantedRes ? Boolean(grantedRes.lockedRequired) : !isAvatarLocked;

    if (p && sync) {
      const avState = (window.AvatarSystem && typeof window.AvatarSystem.getState === "function")
        ? window.AvatarSystem.getState()
        : ls.get(`ii:avatar:${p.cls}-${Number(p.seat) || p.seat}-${p.name}`, null);
      if (avState && typeof avState === "object") {
        const honorList = nextList.filter((t) => CITADEL_HONOR_TOKENS.has(t));
        const payloadAv = {
          ...avState,
          citadelTokens: nextList,
          look: {
            ...(avState.look || {}),
            ...(honorList.length > 0 ? { citadelHonors: honorList } : {})
          }
        };
        void saveAvatarToCloud(payloadAv, p);
      }
      if (getLeaderboardUrl()) {
        void uploadLeaderboardScore(p, null, { force: true });
      }
      syncLeaderboardPool(p);
    }

    document.dispatchEvent(new CustomEvent("ii:citadel-updated", { detail: { token: clean, isNew, gained, lockedRequired, tokens: nextList } }));
    return { ok: true, isNew, gained, lockedRequired, token: clean, tokens: nextList };
  }

  function clearStudentLocalData(targetProfile, { includeActiveIsland = true, clearLeaderboardCaches = false, altNames = [] } = {}) {
    try {
      localStorage.removeItem("ii:microlab:guest");
      localStorage.removeItem("ii:microlab:stages:guest");
      localStorage.removeItem("ii:citadel:guest");
    } catch {}
    if (!targetProfile || !targetProfile.cls || !targetProfile.name) return;
    const clsStr = String(targetProfile.cls).trim();
    const seatNum = Number(targetProfile.seat) || 0;
    const seatVariants = Array.from(new Set([
      String(seatNum || targetProfile.seat || "").trim(),
      seatNum > 0 ? String(seatNum).padStart(2, "0") : ""
    ].filter(Boolean)));
    const nameVariants = Array.from(new Set([
      String(targetProfile.name || "").trim(),
      ...(Array.isArray(altNames) ? altNames.map((n) => String(n || "").trim()) : [])
    ].filter(Boolean)));
    const prefixes = [
      "ii:ev:",
      "ii:badges:",
      "ii:avatar:",
      "ii:microlab:",
      "ii:microlab:stages:",
      "ii:citadel:"
    ];
    if (includeActiveIsland) prefixes.push("ii:activeIslandId:");
    seatVariants.forEach((sv) => {
      nameVariants.forEach((nameStr) => {
        prefixes.forEach((pref) => {
          try { localStorage.removeItem(`${pref}${clsStr}-${sv}-${nameStr}`); } catch {}
        });
      });
    });

    if (clearLeaderboardCaches) {
      const gradeNum = parseGradeFromCls({ grade: targetProfile.grade, cls: clsStr });
      const sKeys = new Set(seatVariants.map((sv) => buildStudentKey(gradeNum, clsStr, sv)));
      const tid = getTeacherId();

      try {
        const pending = ls.get(LB_PENDING, {});
        if (pending && typeof pending === "object") {
          let changed = false;
          Object.keys(pending).forEach((k) => {
            const it = pending[k];
            const baseKey = String(k).split("::wq::")[0];
            const matchByKey = sKeys.has(baseKey) || (it && sKeys.has(String(it.studentKey || "")));
            const matchByProfile = it && String(it.className || "").trim() === clsStr && Number(it.seat) === seatNum;
            const matchTeacher = !tid || !it || !it.teacherId || String(it.teacherId).trim() === tid;
            if ((matchByKey || matchByProfile) && matchTeacher) {
              delete pending[k];
              changed = true;
            }
          });
          if (changed) ls.set(LB_PENDING, pending);
        }
      } catch {}

      try {
        const syncedMap = ls.get(LB_SYNCED, {});
        if (syncedMap && typeof syncedMap === "object") {
          let changed = false;
          sKeys.forEach((sk) => {
            const scoped = buildSyncedCacheKey(sk, tid);
            if (syncedMap[scoped]) {
              delete syncedMap[scoped];
              changed = true;
            }
          });
          if (changed) ls.set(LB_SYNCED, syncedMap);
        }
      } catch {}

      try {
        const pool = ls.get(POOL, null);
        if (pool && pool.students && typeof pool.students === "object") {
          let changed = false;
          Object.keys(pool.students).forEach((k) => {
            const st = pool.students[k];
            const matchProfile = nameVariants.some((nm) => k === `${clsStr}-${seatNum}-${nm}`);
            const matchRow = st && String(st.cls || st.className || "").trim() === clsStr && Number(st.seat) === seatNum && nameVariants.includes(String(st.name || "").trim());
            const matchKey = st && sKeys.has(String(st.studentKey || ""));
            if (matchProfile || matchRow || matchKey) {
              delete pool.students[k];
              changed = true;
            }
          });
          if (changed) {
            pool.updatedAt = Date.now();
            ls.set(POOL, pool);
          }
        }
      } catch {}

      try {
        const queue = ls.get(QUEUE, []);
        if (Array.isArray(queue) && queue.length > 0) {
          const filtered = queue.filter((it) => {
            if (!it || !it.p) return true;
            const sameCls = String(it.p.cls || "").trim() === clsStr;
            const sameSeat = Number(it.p.seat) === seatNum;
            const sameName = nameVariants.includes(String(it.p.name || "").trim());
            const sameTeacher = !tid || !it.teacherId || String(it.teacherId).trim() === tid;
            return !(sameCls && sameSeat && sameName && sameTeacher);
          });
          if (filtered.length !== queue.length) ls.set(QUEUE, filtered);
        }
      } catch {}
    }
  }

  function isCloudStudentRecordEmpty(student) {
    if (!student || typeof student !== "object") return true;
    const rawProg = student.progress !== undefined ? student.progress : student.completedProgress;
    const progressLen = Array.isArray(rawProg) ? rawProg.length : 0;
    const totalScore = Number(student.totalScore) || 0;
    const hasAvatar = Boolean(student.avatar && typeof student.avatar === "object");
    return progressLen === 0 && totalScore === 0 && !hasAvatar;
  }

  function collectAllPassedProgress(explicitProfile) {
    const p = explicitProfile || Store.profile;
    // 未登入狀態不可掃描任何其他學生遺留在 localStorage 的紀錄
    if (!p || !p.cls || !p.name) return [];

    const clsStr = String(p.cls).trim();
    const seatNum = Number(p.seat) || 0;
    const seatVariants = Array.from(new Set([
      String(seatNum || p.seat || "").trim(),
      seatNum > 0 ? String(seatNum).padStart(2, "0") : ""
    ].filter(Boolean)));
    const nameStr = String(p.name).trim();

    const passedSet = new Set();
    seatVariants.forEach((sv) => {
      const evs = ls.get(`ii:ev:${clsStr}-${sv}-${nameStr}`, null);
      if (!evs) return;
      if (window.CompletionCenter && typeof window.CompletionCenter.extractPassedStageSet === "function") {
        window.CompletionCenter.extractPassedStageSet(evs).forEach((tok) => passedSet.add(tok));
      } else {
        extractPassedFromAny(evs, (rawUnit, rawDiff) => {
          const unit = canonicalizeUnitId(rawUnit);
          const diff = normalizeDifficultyToken(rawDiff, { allowSingle: true });
          if (unit && diff) passedSet.add(`${unit}:${diff === "single" ? "easy" : diff}`);
        });
      }
    });

    getCitadelTokens(p).forEach((tok) => passedSet.add(tok));

    return Array.from(passedSet).sort();
  }

  function collectCompletedProgress(profile) {
    return collectAllPassedProgress(profile);
  }

  function buildLeaderboardPayload(profile) {
    if (!profile || profile.isGatekeeper || profile.isVirtual) return null;
    const className = String(profile.cls || profile.className || "").trim();
    const seatNum = Number(profile.seat);
    const seat = Number.isFinite(seatNum) && seatNum > 0 ? String(seatNum) : String(profile.seat || "").trim();
    const name = String(profile.name || "").trim();
    if (!className || !seat || !name) return null;
    const gradeNum = parseGradeFromCls({ grade: profile.grade, cls: className });
    const grade = String(gradeNum);
    const pObj = { cls: className, seat: Number(seat) || seat, name };
    const evs = ls.get(evKey(pObj), []);
    const stats = summarizeQuizEvents(evs);
    const completedProgress = collectAllPassedProgress(pObj);
    const citadelTokens = getCitadelTokens(pObj);
    const honorTokens = citadelTokens.filter((t) => CITADEL_HONOR_TOKENS.has(t));
    const avatarState = ls.get(`ii:avatar:${className}-${Number(seat) || seat}-${name}`, null);
    const payload = {
      grade,
      className,
      seat,
      name,
      totalScore: Math.max(0, Math.round(Number(stats.totalScore) || 0)),
      crownCount: Math.max(0, Math.round(Number(stats.crowns) || 0)),
      completedProgress,
      citadelTokens
    };
    if (avatarState && typeof avatarState === "object") {
      const baseAvatar = (window.AvatarSystem && typeof window.AvatarSystem.sanitizeState === "function")
        ? window.AvatarSystem.sanitizeState(avatarState)
        : avatarState;
      const clonedAvatar = {
        ...baseAvatar,
        citadelTokens: Array.from(new Set([...(Array.isArray(baseAvatar.citadelTokens) ? baseAvatar.citadelTokens : []), ...citadelTokens])).sort()
      };
      if (clonedAvatar.presetLocked !== true) {
        clonedAvatar.presetLocked = false;
        clonedAvatar.presetId = "";
        clonedAvatar.starCoins = 0;
        clonedAvatar.vouchers = { easy: 0, medium: 0, hard: 0 };
      }
      if (clonedAvatar.look && typeof clonedAvatar.look === "object") {
        clonedAvatar.look = { ...clonedAvatar.look };
        if (honorTokens.length > 0) clonedAvatar.look.citadelHonors = honorTokens;
        else delete clonedAvatar.look.citadelHonors;
        if (clonedAvatar.equipped && typeof clonedAvatar.equipped === "object" && Object.keys(clonedAvatar.equipped).length > 0) {
          clonedAvatar.look.equipped = { ...clonedAvatar.equipped };
        } else {
          delete clonedAvatar.look.equipped;
        }
      }
      payload.avatar = clonedAvatar;
    } else if (honorTokens.length > 0) {
      payload.avatar = {
        presetLocked: false,
        presetId: "",
        starCoins: 0,
        vouchers: { easy: 0, medium: 0, hard: 0 },
        look: { hair: "male_gojo", hairColor: "silver", face: "calm", citadelHonors: honorTokens },
        citadelTokens
      };
    }
    return {
      studentKey: buildStudentKey(grade, className, seat),
      payload,
      quizCount: stats.quizCount,
      updatedAt: stats.latestTs || Date.now()
    };
  }

  function savePendingLeaderboard(sKey, payload, seq, updatedAt) {
    const pending = ls.get(LB_PENDING, {});
    pending[sKey] = {
      studentKey: sKey,
      ...payload,
      seq,
      updatedAt: updatedAt || Date.now()
    };
    ls.set(LB_PENDING, pending);
  }

  function clearPendingLeaderboard(sKey, seq) {
    const pending = ls.get(LB_PENDING, {});
    if (pending[sKey] && pending[sKey].seq === seq) {
      delete pending[sKey];
      ls.set(LB_PENDING, pending);
    }
  }

  function buildSyncedCacheKey(sKey, teacherId) {
    const tid = String(teacherId !== undefined ? teacherId : getTeacherId() || "").trim() || "DEFAULT";
    return `${tid}::${sKey}`;
  }

  function getSyncedLeaderboardRecord(sKey, teacherId) {
    const map = ls.get(LB_SYNCED, {});
    const scopedKey = buildSyncedCacheKey(sKey, teacherId);
    return map && map[scopedKey] ? map[scopedKey] : null;
  }

  function markLeaderboardSynced(sKey, payload, teacherId, { overwrite = false } = {}) {
    if (!sKey || !payload) return;
    const map = ls.get(LB_SYNCED, {});
    const scopedKey = buildSyncedCacheKey(sKey, teacherId);
    const prev = map[scopedKey];
    const nextScore = Math.max(0, Math.round(Number(payload.totalScore) || 0));
    const nextCrowns = Math.max(0, Math.round(Number(payload.crownCount) || 0));
    const nextProgSig = Array.isArray(payload.completedProgress)
      ? payload.completedProgress.join(",")
      : (overwrite ? "" : ((prev && prev.progressSig) || ""));
    map[scopedKey] = {
      totalScore: overwrite ? nextScore : (prev ? Math.max(prev.totalScore || 0, nextScore) : nextScore),
      crownCount: overwrite ? nextCrowns : (prev ? Math.max(prev.crownCount || 0, nextCrowns) : nextCrowns),
      progressSig: nextProgSig,
      syncedAt: Date.now()
    };
    ls.set(LB_SYNCED, map);
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = GAS_TIMEOUT_MS) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      return await fetch(url, {
        ...options,
        signal: controller ? controller.signal : options.signal
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function postLeaderboardPayload(url, payload) {
    // text/plain;charset=utf-8 可避開瀏覽器 CORS 預檢 (OPTIONS)，讓 GAS doPost 順利接收
    const r = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }, GAS_TIMEOUT_MS);
    if (!r.ok) throw new Error("伺服器回應 " + r.status);
    const data = await r.json();
    if (!data || data.status !== "ok") {
      throw new Error((data && data.message) || "風雲榜寫入失敗");
    }
    return data;
  }

  async function postGasJson(url, payload, timeoutMs = GAS_TIMEOUT_MS) {
    const r = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }, timeoutMs);
    if (!r.ok) throw new Error("伺服器回應 " + r.status);
    return await r.json();
  }

  async function fetchGasBoot(explicitTeacherId, { force = false } = {}) {
    const lbUrl = getLeaderboardUrl();
    if (!lbUrl) return null;
    const tid = explicitTeacherId !== undefined ? String(explicitTeacherId || "").trim() : getTeacherId();
    if (!force && lastGasBoot && lastBootTeacherKey === tid) {
      return lastGasBoot;
    }
    if (!force && inflightBoot && inflightBootTeacherKey === tid) {
      return inflightBoot;
    }

    const qs = new URLSearchParams();
    qs.set("mode", "boot");
    qs.set("t", tid);
    qs.set("cb", String(Date.now()));
    const reqUrl = `${lbUrl}?${qs.toString()}`;

    inflightBootTeacherKey = tid;
    const run = (async () => {
      try {
        const res = await fetchWithTimeout(reqUrl, { cache: "no-store" }, GAS_BOOT_TIMEOUT_MS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json || json.status !== "ok") {
          throw new Error((json && json.message) || "GAS Boot 回應格式錯誤");
        }
        const serverTeacher = (json.currentTeacher && typeof json.currentTeacher === "object")
          ? json.currentTeacher
          : ((json.teacherInfo && typeof json.teacherInfo === "object") ? json.teacherInfo : null);
        applyTeacherDirectoryUpdate(json.teachersList, serverTeacher, tid);
        if (tid === getTeacherId()) {
          lastGasBoot = json;
          lastBootTeacherKey = tid;
        }
        document.dispatchEvent(new CustomEvent("ii:gas-boot", {
          detail: {
            teacherId: tid,
            teachersList: cachedTeachersList.slice(),
            currentTeacher: cachedCurrentTeacher
          }
        }));
        return json;
      } finally {
        if (inflightBoot === run) inflightBoot = null;
      }
    })();

    inflightBoot = run;
    return run;
  }

  async function fetchGasSnapshot(explicitTeacherId, { force = false } = {}) {
    const lbUrl = getLeaderboardUrl();
    if (!lbUrl) return null;
    const tid = explicitTeacherId !== undefined ? String(explicitTeacherId || "").trim() : getTeacherId();
    if (!force && lastGasSnapshot && lastSnapshotTeacherKey === tid) {
      return lastGasSnapshot;
    }
    if (!force && inflightSnapshot && inflightTeacherKey === tid) {
      return inflightSnapshot;
    }

    const qs = new URLSearchParams();
    if (tid) qs.set("teacherId", tid);
    qs.set("cb", String(Date.now()));
    const reqUrl = `${lbUrl}?${qs.toString()}`;

    inflightTeacherKey = tid;
    const run = (async () => {
      try {
        const res = await fetchWithTimeout(reqUrl, { cache: "no-store" }, GAS_TIMEOUT_MS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json || json.status !== "ok") {
          throw new Error((json && json.message) || "GAS 回應格式錯誤");
        }
        const serverTeacher = (json.currentTeacher && typeof json.currentTeacher === "object")
          ? json.currentTeacher
          : ((json.teacherInfo && typeof json.teacherInfo === "object") ? json.teacherInfo : null);
        applyTeacherDirectoryUpdate(json.teachersList, serverTeacher, tid);
        if (json.config && typeof json.config === "object") {
          saveCachedConfig(tid, json.config);
        }
        if (tid === getTeacherId()) {
          lastGasSnapshot = json;
          lastSnapshotTeacherKey = tid;
        }
        document.dispatchEvent(new CustomEvent("ii:gas-snapshot", { detail: { teacherId: tid, snapshot: json } }));
        return json;
      } finally {
        if (inflightSnapshot === run) inflightSnapshot = null;
      }
    })();

    inflightSnapshot = run;
    return run;
  }

  async function uploadLeaderboardScore(profile, quizMeta, opts = {}) {
    const built = buildLeaderboardPayload(profile || Store.profile);
    if (!built) return { ok: false, skipped: true };
    const url = getLeaderboardUrl();
    if (!url) return { ok: false, offline: true };

    const forceUpload = !!(opts && opts.force);
    const tid = getTeacherId();
    const wrongQuestions = quizMeta && Array.isArray(quizMeta.wrongQuestions) ? quizMeta.wrongQuestions : [];
    const hasWrongQuestions = wrongQuestions.length > 0;
    const payloadToSend = { ...built.payload };
    if (tid) payloadToSend.teacherId = tid;
    if (quizMeta) {
      if (quizMeta.unitId) payloadToSend.unitId = String(quizMeta.unitId);
      if (quizMeta.difficulty) payloadToSend.difficulty = String(quizMeta.difficulty);
      payloadToSend.wrongQuestions = wrongQuestions;
    }

    // 智慧去重上傳：非強制補送、無錯題、總積分/皇冠未超越且已完成單元清單未變動時才略過
    const lastSynced = getSyncedLeaderboardRecord(built.studentKey, tid);
    const curProgSig = Array.isArray(built.payload.completedProgress) ? built.payload.completedProgress.join(",") : "";
    if (
      !forceUpload &&
      !hasWrongQuestions &&
      lastSynced &&
      built.payload.totalScore <= (Number(lastSynced.totalScore) || 0) &&
      built.payload.crownCount <= (Number(lastSynced.crownCount) || 0) &&
      curProgSig === (lastSynced.progressSig || "")
    ) {
      return { ok: true, deduplicated: true };
    }

    const seq = ++lbUploadSeq;
    const pendingKey = hasWrongQuestions ? `${built.studentKey}::wq::${seq}` : built.studentKey;
    savePendingLeaderboard(pendingKey, payloadToSend, seq, built.updatedAt);

    try {
      const data = await postLeaderboardPayload(url, payloadToSend);
      clearPendingLeaderboard(pendingKey, seq);
      markLeaderboardSynced(built.studentKey, built.payload, tid);
      return { ok: true, data };
    } catch (e) {
      console.warn("風雲榜背景上傳失敗（已保留 localStorage 本地備份）:", e);
      return { ok: false, error: e.message };
    }
  }

  async function flushLeaderboardPending() {
    const url = getLeaderboardUrl();
    if (!url) return 0;
    const pending = ls.get(LB_PENDING, {});
    const entries = Object.entries(pending || {});
    let flushed = 0;
    const currentTid = getTeacherId();
    for (const [pendingKey, it] of entries) {
      if (!it || !it.className || !it.seat || !it.name) continue;
      const baseStudentKey = buildStudentKey(it.grade || parseGradeFromCls(it.className), it.className, it.seat);
      const wrongQuestions = Array.isArray(it.wrongQuestions) ? it.wrongQuestions : [];
      const hasWrongQuestions = wrongQuestions.length > 0;
      const completedProgress = Array.isArray(it.completedProgress)
        ? Array.from(new Set([
            ...it.completedProgress.map((tok) => {
              const raw = String(tok || "").trim().toLowerCase();
              if (CITADEL_TOKEN_SET.has(raw)) return raw;
              const parsed = parseProgressToken(tok);
              return parsed ? parsed.key : "";
            }).filter(Boolean),
            ...collectAllPassedProgress({ cls: it.className, seat: it.seat, name: it.name })
          ])).sort()
        : collectAllPassedProgress({ cls: it.className, seat: it.seat, name: it.name });
      const payload = {
        grade: String(it.grade || parseGradeFromCls(it.className)),
        className: String(it.className),
        seat: String(it.seat),
        name: String(it.name),
        totalScore: Math.max(0, Math.round(Number(it.totalScore) || 0)),
        crownCount: Math.max(0, Math.round(Number(it.crownCount) || 0)),
        completedProgress
      };
      const effTid = String(it.teacherId || currentTid || "").trim();
      if (effTid) payload.teacherId = effTid;
      if (it.avatar && typeof it.avatar === "object") payload.avatar = it.avatar;
      if (it.unitId) payload.unitId = String(it.unitId);
      if (it.difficulty) payload.difficulty = String(it.difficulty);
      if (hasWrongQuestions) payload.wrongQuestions = wrongQuestions;

      const lastSynced = getSyncedLeaderboardRecord(baseStudentKey, effTid);
      const curProgSig = completedProgress.join(",");
      if (
        !hasWrongQuestions &&
        lastSynced &&
        payload.totalScore <= (Number(lastSynced.totalScore) || 0) &&
        payload.crownCount <= (Number(lastSynced.crownCount) || 0) &&
        curProgSig === (lastSynced.progressSig || "")
      ) {
        clearPendingLeaderboard(pendingKey, it.seq);
        continue;
      }
      try {
        await postLeaderboardPayload(url, payload);
        clearPendingLeaderboard(pendingKey, it.seq);
        markLeaderboardSynced(baseStudentKey, payload, effTid);
        flushed++;
      } catch {
        // 網路仍異常時保留 localStorage 待下次重試
      }
    }
    return flushed;
  }

  function restoreCloudStudentData(profile, student) {
    if (!profile || !student || typeof student !== "object") return { cloudProgress: [], needsBackgroundSync: false };
    if (isCloudStudentRecordEmpty(student)) {
      clearStudentLocalData(profile, { includeActiveIsland: true, clearLeaderboardCaches: true });
      if (window.AvatarSystem && typeof window.AvatarSystem.clearStudentState === "function") {
        window.AvatarSystem.clearStudentState(profile, { resetGuest: true });
      } else {
        try { localStorage.removeItem(`ii:avatar:${profile.cls}-${profile.seat}-${profile.name}`); } catch {}
      }
      if (typeof window.updateAllIslandArchitectures === "function") {
        window.updateAllIslandArchitectures({ animateUpgrade: false });
      }
      return { cloudProgress: [], localProgress: [], needsBackgroundSync: false, isEmptyCloud: true };
    }
    const key = evKey(profile);
    const badgeKey = `ii:badges:${profile.cls}-${profile.seat}-${profile.name}`;

    // 以雲端回傳資料為基準，先清除本機可能殘留的舊測驗/徽章/穿搭快取避免污染
    clearStudentLocalData(profile, { includeActiveIsland: false });

    const rawCloudSource = student.progress !== undefined ? student.progress : student.completedProgress;
    const cloudTokenSet = (window.CompletionCenter && typeof window.CompletionCenter.extractPassedStageSet === "function")
      ? window.CompletionCenter.extractPassedStageSet(rawCloudSource)
      : (() => {
        const s = new Set();
        extractPassedFromAny(rawCloudSource, (rawUnit, rawDiff) => {
          const unit = canonicalizeUnitId(rawUnit);
          const diff = normalizeDifficultyToken(rawDiff, { allowSingle: true });
          if (unit && diff) s.add(`${unit}:${diff === "single" ? "easy" : diff}`);
        });
        return s;
      })();
    const cloudQuizProgress = Array.from(cloudTokenSet).sort();
    const cloudCitadelTokens = Array.from(new Set([
      ...extractCitadelTokens(rawCloudSource),
      ...extractCitadelTokens(student.avatar),
      ...extractCitadelTokens(student.citadelTokens)
    ])).sort();
    if (cloudCitadelTokens.length > 0) {
      ls.set(citadelKey(profile), cloudCitadelTokens);
    }
    const cloudProgress = Array.from(new Set([...cloudQuizProgress, ...cloudCitadelTokens])).sort();

    const restoredEvents = [];
    const restoredBadges = [];
    const badgeSeen = new Set();
    let crownsLeft = Math.max(0, Number(student.crownCount) || 0);
    const baseTs = Date.now();

    cloudProgress.forEach((token, idx) => {
      const parsed = parseProgressToken(token);
      if (!parsed) return;
      const unit = parsed.unit;
      const diff = parsed.diff;
      if (!unit) return;
      const [island, numStr] = unit.split("-");
      const islObj = Array.isArray(window.ISLANDS) ? window.ISLANDS.find((i) => i && i.id === island) : null;
      const seqItem = islObj && Array.isArray(islObj.sequence) ? islObj.sequence[(Number(numStr) || 0) - 1] : null;
      const unitMeta = window.CONTENT && window.CONTENT[unit];
      const unitName = (seqItem && seqItem.unit) || (unitMeta && unitMeta.unit) || unit;
      const evTs = baseTs - (cloudProgress.length - idx);
      const useCrown = crownsLeft > 0;
      if (useCrown) crownsLeft--;
      restoredEvents.push({
        eid: `cloud-restore-${unit}-${diff}`,
        ts: evTs,
        type: "quiz",
        island,
        unit,
        unitId: unit,
        unitName,
        grade: parseGradeFromCls(profile),
        term: Number(seqItem && seqItem.term) || 1,
        difficulty: diff === "single" ? null : diff,
        quizDifficulty: diff,
        score: useCrown ? 100 : 80,
        correct: useCrown ? 5 : 4,
        total: 5,
        sec: 0,
        restoredFromCloud: true
      });
      const badgeType = diff === "hard" ? "gold" : (diff === "medium" ? "silver" : "");
      if (badgeType && !badgeSeen.has(`${unit}:${badgeType}`)) {
        badgeSeen.add(`${unit}:${badgeType}`);
        restoredBadges.push({ unit, island, unitName, type: badgeType, ts: evTs });
      }
    });

    ls.set(key, restoredEvents);
    ls.set(badgeKey, restoredBadges);

    // 嚴格以雲端回傳的 student.avatar 作為該生基準外觀還原（無則重置為初始空白外觀）
    // 若雲端 presetLocked 不為 true，強制清零任何星幣與兌換券餘額，避免本機誤存未鎖定前餘額
    const rawCloudAvatar = (student.avatar && typeof student.avatar === "object") ? student.avatar : null;
    const isCloudLocked = Boolean(rawCloudAvatar && rawCloudAvatar.presetLocked === true);
    const sanitizedCloudInput = rawCloudAvatar
      ? {
          ...rawCloudAvatar,
          presetLocked: isCloudLocked,
          ...(isCloudLocked
            ? {}
            : {
                presetId: "",
                starCoins: 0,
                vouchers: { easy: 0, medium: 0, hard: 0 },
                labRewarded: [],
                citadelRewarded: [],
                npcRewarded: [],
                rewardedStages: []
              }),
          citadelTokens: Array.from(new Set([
            ...(Array.isArray(rawCloudAvatar.citadelTokens) ? rawCloudAvatar.citadelTokens : []),
            ...cloudCitadelTokens
          ])).sort()
        }
      : (cloudCitadelTokens.length > 0
          ? {
              presetLocked: false,
              presetId: "",
              starCoins: 0,
              vouchers: { easy: 0, medium: 0, hard: 0 },
              citadelTokens: cloudCitadelTokens
            }
          : null);
    if (window.AvatarSystem && typeof window.AvatarSystem.restoreCloudAvatar === "function") {
      window.AvatarSystem.restoreCloudAvatar(sanitizedCloudInput, profile, { replace: true });
    } else if (sanitizedCloudInput) {
      ls.set(`ii:avatar:${profile.cls}-${profile.seat}-${profile.name}`, sanitizedCloudInput);
    } else {
      try { localStorage.removeItem(`ii:avatar:${profile.cls}-${profile.seat}-${profile.name}`); } catch {}
    }

    if (typeof window.updateAllIslandArchitectures === "function") {
      window.updateAllIslandArchitectures({ animateUpgrade: false });
    }

    const gradeNum = parseGradeFromCls(profile);
    const sKey = buildStudentKey(gradeNum, profile.cls, profile.seat);
    markLeaderboardSynced(sKey, {
      totalScore: Number(student.totalScore) || 0,
      crownCount: Number(student.crownCount) || 0,
      completedProgress: cloudProgress
    }, undefined, { overwrite: true });

    return {
      cloudProgress,
      localProgress: cloudProgress,
      needsBackgroundSync: false
    };
  }

  async function saveAvatarToCloud(avatarState, explicitProfile) {
    const p = explicitProfile || Store.profile;
    const url = getLeaderboardUrl();
    if (!p || !url || !avatarState || typeof avatarState !== "object") return { ok: false, skipped: true };
    try {
      const grade = String(parseGradeFromCls(p));
      const payload = {
        action: "save_avatar",
        grade,
        className: String(p.cls),
        seat: String(p.seat),
        name: String(p.name),
        avatar: avatarState
      };
      const tid = getTeacherId();
      if (tid) payload.teacherId = tid;
      const res = await postGasJson(url, payload);
      return { ok: !!(res && res.status === "ok"), data: res };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function post(payload, timeoutMs = GAS_TIMEOUT_MS) {
    // text/plain 可避免瀏覽器 CORS 預檢,Apps Script 才收得到
    const r = await fetchWithTimeout(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) }, timeoutMs);
    if (!r.ok) throw new Error("伺服器回應 " + r.status);
    return r.json();
  }

  const Store = {
    online: () => !!CFG.API_URL,
    hasLeaderboardSync: () => !!getLeaderboardUrl(),
    getLeaderboardUrl,
    getTeacherId,
    setTeacherId,
    getCurrentTeacher: () => {
      const tid = getTeacherId();
      if (!tid) return null;
      if (cachedCurrentTeacher && cachedCurrentTeacher.teacherId === tid) return cachedCurrentTeacher;
      return cachedTeachersList.find((t) => t && t.teacherId === tid) || null;
    },
    getTeachersList: () => cachedTeachersList.slice(),
    getCachedConfig,
    saveCachedConfig,
    fetchGasBoot,
    fetchGasSnapshot,
    profile: ls.get(PROFILE, null),

    /** 登入（含 GAS 個人驗證碼首次設定與核對＋雲端外觀／進度還原） */
    async login({ grade, room, seat, name, pinCode, isConfirmSetup }) {
      const cls = String(grade) + String(room).padStart(2, "0");
      const seatNum = Number(seat);
      const cleanName = String(name || "").trim();
      const cleanPin = String(pinCode || "").trim();
      const tid = getTeacherId();
      let p = { cls, seat: seatNum, name: cleanName };
      let loginRes = null;

      const lbUrl = getLeaderboardUrl();
      if (lbUrl) {
        try {
          const loginPayload = {
            action: "student_login",
            grade: String(grade),
            className: cls,
            seat: String(seatNum),
            name: cleanName,
            pinCode: cleanPin,
            isConfirmSetup: !!isConfirmSetup
          };
          if (tid) loginPayload.teacherId = tid;
          loginRes = await postGasJson(lbUrl, loginPayload, GAS_LOGIN_TIMEOUT_MS);
        } catch (e) {
          if (e && e.name === "AbortError") {
            return {
              ok: false,
              status: "timeout",
              msg: "⏳ 雲端伺服器回應逾時（超過 8 秒），請確認網路連線後再點擊一次重試！"
            };
          }
          return { ok: false, status: "network_error", msg: "無法連線至雲端驗證伺服器：" + e.message };
        }

        if (!loginRes || typeof loginRes !== "object") {
          return { ok: false, status: "error", msg: "伺服器未回應有效格式，請稍後再試" };
        }
        if (loginRes.status === "need_pin_setup") {
          clearStudentLocalData(p, { includeActiveIsland: true, clearLeaderboardCaches: true });
          if (Store.profile && studentKey(Store.profile) === studentKey(p)) {
            Store.profile = null;
            try { localStorage.removeItem(PROFILE); } catch {}
            try { localStorage.removeItem(ACTIVE_ISLAND); } catch {}
          }
          if (window.AvatarSystem && typeof window.AvatarSystem.clearStudentState === "function") {
            window.AvatarSystem.clearStudentState(p, { resetGuest: true });
          } else if (window.AvatarSystem && typeof window.AvatarSystem.resetGuestState === "function") {
            window.AvatarSystem.resetGuestState({ silent: true });
          }
          return {
            ok: false,
            status: "need_pin_setup",
            maskedName: loginRes.maskedName || "",
            hasRosterMatch: !!(loginRes.hasRosterMatch || loginRes.resolvedName)
          };
        }
        if (loginRes.status === "invalid_pin") {
          return {
            ok: false,
            status: "invalid_pin",
            msg: "❌ " + (loginRes.message || "驗證碼錯誤！請輸入您初次設定的驗證碼（若忘記請洽資訊老師重設）")
          };
        }
        if (loginRes.status !== "ok") {
          return { ok: false, status: loginRes.status || "error", msg: loginRes.message || "登入失敗" };
        }
        if (loginRes.student && loginRes.student.name) {
          p = { cls, seat: seatNum, name: String(loginRes.student.name).trim() || cleanName };
        }
      }

      if (Store.online()) {
        try {
          const r = await post({ action: "login", ...p, ...(tid ? { teacherId: tid } : {}) }, GAS_LOGIN_TIMEOUT_MS);
          if (!r.ok) return { ok: false, msg: r.error || "登入失敗" };
        } catch (e) {
          if (e && e.name === "AbortError") {
            return { ok: false, status: "timeout", msg: "⏳ 成績伺服器回應逾時（超過 8 秒），請稍候重試！" };
          }
          return { ok: false, msg: "無法連線到成績伺服器:" + e.message };
        }
      }

      const prevProfile = Store.profile;
      if (prevProfile && studentKey(prevProfile) !== studentKey(p)) {
        clearStudentLocalData(prevProfile);
      }
      if (window.AvatarSystem && typeof window.AvatarSystem.resetGuestState === "function") {
        window.AvatarSystem.resetGuestState({ silent: true });
      }
      Store.profile = p; ls.set(PROFILE, p);
      let syncInfo = { needsBackgroundSync: false };
      if (loginRes && loginRes.student) {
        if (isCloudStudentRecordEmpty(loginRes.student)) {
          clearStudentLocalData(p, { includeActiveIsland: true, clearLeaderboardCaches: true, altNames: [cleanName] });
          if (window.AvatarSystem && typeof window.AvatarSystem.clearStudentState === "function") {
            window.AvatarSystem.clearStudentState(p, { altNames: [cleanName], resetGuest: true });
          }
          if (typeof window.updateAllIslandArchitectures === "function") {
            window.updateAllIslandArchitectures({ animateUpgrade: false });
          }
        } else {
          syncInfo = restoreCloudStudentData(p, loginRes.student) || { needsBackgroundSync: false };
        }
      } else if (lbUrl) {
        clearStudentLocalData(p, { includeActiveIsland: true, clearLeaderboardCaches: true, altNames: [cleanName] });
        if (window.AvatarSystem && typeof window.AvatarSystem.clearStudentState === "function") {
          window.AvatarSystem.clearStudentState(p, { altNames: [cleanName], resetGuest: true });
        }
      }
      try {
        const savedForStudent = readActiveIslandRaw(activeIslandKey(p));
        if (savedForStudent) localStorage.setItem(ACTIVE_ISLAND, savedForStudent);
        else localStorage.removeItem(ACTIVE_ISLAND);
      } catch {}
      syncLeaderboardPool(p);
      document.dispatchEvent(new CustomEvent("ii:avatar-changed"));
      if (typeof window.updateAllIslandArchitectures === "function") {
        window.updateAllIslandArchitectures({ animateUpgrade: false });
      }
      Store.flush();
      flushLeaderboardPending();
      if (lbUrl && (syncInfo.needsBackgroundSync || (loginRes && !loginRes.student && collectAllPassedProgress(p).length > 0))) {
        void uploadLeaderboardScore(p, null, { force: true });
      }
      return { ok: true, isNewPin: !!(loginRes && loginRes.isNewPin), student: loginRes && loginRes.student };
    },
    logout() {
      const prevProfile = Store.profile;
      Store.profile = null;
      try { localStorage.removeItem(PROFILE); } catch {}
      try { localStorage.removeItem(ACTIVE_ISLAND); } catch {}
      clearStudentLocalData(prevProfile);
      if (window.AvatarSystem && typeof window.AvatarSystem.resetGuestState === "function") {
        window.AvatarSystem.resetGuestState({ silent: true });
      }
      if (typeof window.updateAllIslandArchitectures === "function") {
        window.updateAllIslandArchitectures({ animateUpgrade: false });
      }
    },

    getActiveIslandId() {
      if (Store.profile) {
        return readActiveIslandRaw(activeIslandKey(Store.profile));
      }
      return readActiveIslandRaw(ACTIVE_ISLAND);
    },
    setActiveIslandId(islandId, opts = {}) {
      const id = String(islandId || "").trim();
      if (!id) return "";
      try {
        localStorage.setItem(ACTIVE_ISLAND, id);
        if (Store.profile) {
          localStorage.setItem(activeIslandKey(Store.profile), id);
        }
      } catch (e) { console.warn(e); }
      if (!opts.silent) {
        document.dispatchEvent(new CustomEvent("ii:active-island-changed", { detail: { islandId: id } }));
      }
      return id;
    },
    clearActiveIslandId() {
      try {
        localStorage.removeItem(ACTIVE_ISLAND);
        if (Store.profile) localStorage.removeItem(activeIslandKey(Store.profile));
      } catch {}
    },

    events() { return Store.profile ? ls.get(evKey(Store.profile), []) : []; },
    quizEvents(unit) {
      const target = canonicalizeUnitId(unit);
      return Store.events().filter(e => e.type === "quiz" && canonicalizeUnitId(e.unit || e.unitId) === target);
    },

    /** 徽章(silver 銀色羅盤 / gold 金色大師):存於 localStorage,每位學生每單元每種徽章只記一次 */
    badges() { return Store.profile ? ls.get(`ii:badges:${Store.profile.cls}-${Store.profile.seat}-${Store.profile.name}`, []) : []; },
    awardBadge(b) {
      const p = Store.profile; if (!p) return null;
      const k = `ii:badges:${p.cls}-${p.seat}-${p.name}`, list = ls.get(k, []);
      if (list.some(x => x.unit === b.unit && x.type === b.type)) return null;
      list.push(b); ls.set(k, list); return b;
    },

    /** 新增一筆紀錄:先存本機並背景上傳風雲榜,再嘗試送到明細試算表(失敗會排入佇列待補送) */
    async addEvent(ev) {
      const p = Store.profile; if (!p) throw new Error("尚未登入");
      ev.eid = `${ev.ts}-${ev.type}-${ev.unit}`;
      ls.set(evKey(p), [...Store.events().filter(e => e.eid !== ev.eid), ev]);
      syncLeaderboardPool(p);
      const quizMeta = ev.type === "quiz" ? {
        unitId: ev.unitId || ev.unit || "",
        difficulty: ev.quizDifficulty || ev.difficulty || (ev.detail && ev.detail.difficulty) || "single",
        wrongQuestions: Array.isArray(ev.wrongQuestions) ? ev.wrongQuestions : []
      } : null;
      const leaderboardSyncPromise = (ev.type === "quiz" && getLeaderboardUrl())
        ? uploadLeaderboardScore(p, quizMeta)
        : null;
      if (!Store.online()) return { local: true, synced: false, leaderboardSyncPromise };
      const tid = getTeacherId();
      try {
        const r = await post({ action: "submit", ...p, ...(tid ? { teacherId: tid } : {}), event: ev });
        if (!r.ok) throw new Error(r.error || "寫入失敗");
        return { local: true, synced: true, leaderboardSyncPromise };
      } catch (e) {
        ls.set(QUEUE, [...ls.get(QUEUE, []), { p, ev, teacherId: tid }]);
        return { local: true, synced: false, error: e.message, leaderboardSyncPromise };
      }
    },
    pending: () => ls.get(QUEUE, []).length,
    /** 補送先前失敗的紀錄 */
    async flush() {
      if (!Store.online()) return;
      const rest = [];
      const curTid = getTeacherId();
      for (const it of ls.get(QUEUE, [])) {
        const tid = it.teacherId || curTid;
        try { const r = await post({ action: "submit", ...it.p, ...(tid ? { teacherId: tid } : {}), event: it.ev }); if (!r.ok) rest.push(it); }
        catch { rest.push(it); }
      }
      ls.set(QUEUE, rest);
    },

    /* ---- 年級成績池與遠端對接擴充 ---- */
    parseGradeFromCls,
    summarizeQuizEvents,
    collectAllPassedProgress,
    collectCompletedProgress,
    CITADEL_TOKENS,
    extractCitadelTokens,
    getCitadelTokens,
    recordCitadelToken,
    clearStudentLocalData,
    isCloudStudentRecordEmpty,
    calculateIslandCompletion: (islandId, state) => (window.calculateIslandCompletion ? window.calculateIslandCompletion(islandId, state) : null),
    syncLeaderboardPool,
    buildStudentKey,
    buildLeaderboardPayload,
    uploadLeaderboardScore,
    flushLeaderboardPending,
    saveAvatarToCloud,
    getPendingLeaderboardUploads(grade) {
      const pending = ls.get(LB_PENDING, {});
      const list = Object.values(pending || {}).filter(Boolean);
      return grade ? list.filter((it) => Number(it.grade) === Number(grade)) : list;
    },
    leaderboardPool(grade) {
      const all = syncLeaderboardPool();
      return grade ? all.filter((s) => Number(s.grade) === Number(grade)) : all;
    },
    setRemoteLeaderboardFetcher(fn) {
      remoteLeaderboardFetcher = typeof fn === "function" ? fn : null;
    },
    async fetchRemoteLeaderboard(grade) {
      if (remoteLeaderboardFetcher) {
        try {
          const rows = await remoteLeaderboardFetcher(grade);
          return Array.isArray(rows) ? rows : [];
        } catch (e) { console.warn("遠端排行榜自訂擷取失敗:", e); return []; }
      }
      const lbUrl = getLeaderboardUrl();
      if (lbUrl) {
        try {
          const json = await fetchGasSnapshot(getTeacherId(), { force: true });
          if (json && json.status === "ok" && json.data) {
            const g = String(Number(grade) || 7);
            return Array.isArray(json.data[g]) ? json.data[g] : [];
          }
          return [];
        } catch {
          return [];
        }
      }
      if (!Store.online()) return [];
      try {
        const r = await post({ action: "leaderboard", grade: Number(grade) || 0 });
        return r && r.ok && Array.isArray(r.rows) ? r.rows : [];
      } catch {
        return [];
      }
    }
  };
  syncLeaderboardPool();
  window.Store = Store;
  window.collectAllPassedProgress = collectAllPassedProgress;

  /** 全域焦點與教師戰情室狀態守衛：供各模組的 keydown / pointerdown 監聽統一放行輸入元件 */
  window.isFormInputTarget = (el) => {
    const tag = el && el.tagName ? el.tagName.toUpperCase() : "";
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(el && el.isContentEditable);
  };
  window.isTeacherCockpitOpen = () => !!document.querySelector("#tcCockpit.show, #tcAuthModal.show, #tcQrModal.show, #tcDetailModal.show, #tcConfirmModal.show, #tcProjectorModal.show, #teacher-question-projector, #teacher-island-details-modal");
  window.shouldSkipGlobalEvent = (e) => window.isFormInputTarget(e && e.target) || window.isTeacherCockpitOpen();
})();
