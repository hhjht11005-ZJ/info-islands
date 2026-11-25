/* 資料層:學員身分 + 學習紀錄(本機 localStorage,並可同步到 Google 試算表) + 年級榮譽成績池 */
(() => {
  const CFG = window.APP_CONFIG;
  const PROFILE = "ii:profile", QUEUE = "ii:queue", POOL = "ii:leaderboard:pool", LB_PENDING = "ii:leaderboard:pending", LB_SYNCED = "ii:leaderboard:synced_v1", ACTIVE_ISLAND = "ii:activeIslandId";
  const TEACHER_ID_KEY = "island_teacher_id", TEACHER_META_KEY = "ii:teacher_meta_v1", TEACHERS_LIST_KEY = "ii:teachers_list_v1";
  const GAS_TIMEOUT_MS = 10000;
  const ls = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } }
  };

  function getTeacherId() {
    try { return String(localStorage.getItem(TEACHER_ID_KEY) || "").trim(); } catch { return ""; }
  }
  function getStoredTeacherMeta() {
    const m = ls.get(TEACHER_META_KEY, null);
    return (m && typeof m === "object") ? m : null;
  }
  function getStoredTeachersList() {
    const list = ls.get(TEACHERS_LIST_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  let cachedTeachersList = getStoredTeachersList();
  let cachedCurrentTeacher = getStoredTeacherMeta();
  let lastGasSnapshot = null;
  let inflightSnapshot = null;
  let inflightTeacherKey = null;

  function setTeacherId(teacherId, metaObj = null) {
    const cleanId = String(teacherId || "").trim();
    const prevId = getTeacherId();
    try {
      if (cleanId) localStorage.setItem(TEACHER_ID_KEY, cleanId);
      else localStorage.removeItem(TEACHER_ID_KEY);
    } catch (e) { console.warn(e); }

    if (metaObj && typeof metaObj === "object" && metaObj.teacherId === cleanId) {
      cachedCurrentTeacher = {
        teacherId: cleanId,
        schoolName: String(metaObj.schoolName || "").trim(),
        teacherName: String(metaObj.teacherName || "").trim()
      };
      ls.set(TEACHER_META_KEY, cachedCurrentTeacher);
    } else if (cleanId) {
      const matched = cachedTeachersList.find((t) => t && t.teacherId === cleanId);
      if (matched) {
        cachedCurrentTeacher = {
          teacherId: cleanId,
          schoolName: String(matched.schoolName || "").trim(),
          teacherName: String(matched.teacherName || "").trim()
        };
        ls.set(TEACHER_META_KEY, cachedCurrentTeacher);
      } else if (prevId !== cleanId) {
        cachedCurrentTeacher = null;
        try { localStorage.removeItem(TEACHER_META_KEY); } catch {}
      }
    } else {
      cachedCurrentTeacher = null;
      try { localStorage.removeItem(TEACHER_META_KEY); } catch {}
    }

    if (prevId !== cleanId) {
      lastGasSnapshot = null;
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
      if (prevId !== urlTeacherId) {
        cachedCurrentTeacher = null;
        localStorage.removeItem(TEACHER_META_KEY);
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
    const raw = String(unitId || "").trim();
    if (!raw) return "";
    const normalized = raw.replace(/^([a-z]+)(\d+)$/i, "$1-$2");
    const m = normalized.match(/^([a-z]+)-(\d+)$/i);
    if (!m) return normalized.toLowerCase();
    const prefix = m[1].toLowerCase();
    const canonPrefix = CANONICAL_ISLAND_ALIAS[prefix] || prefix;
    return `${canonPrefix}-${Number(m[2]) || m[2]}`;
  }

  function collectCompletedProgress(profile) {
    if (!profile || !profile.cls || !profile.name) return [];
    const evs = ls.get(evKey({ cls: String(profile.cls).trim(), seat: Number(profile.seat) || profile.seat, name: String(profile.name).trim() }), []);
    const passedSet = new Set();
    (Array.isArray(evs) ? evs : []).forEach((e) => {
      if (!e || e.type !== "quiz") return;
      const rawUnit = String(e.unit || e.unitId || "").trim();
      const unit = canonicalizeUnitId(rawUnit);
      if (!unit) return;
      if ((Number(e.score) || 0) < 60) return;
      const rawDiff = String(e.difficulty || e.quizDifficulty || (e.detail && e.detail.difficulty) || "single").trim().toLowerCase();
      const diff = /^(easy|medium|hard)$/.test(rawDiff) ? rawDiff : "single";
      passedSet.add(`${unit}:${diff}`);
    });
    return Array.from(passedSet).sort();
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
    const completedProgress = collectCompletedProgress(pObj);
    const avatarState = ls.get(`ii:avatar:${className}-${Number(seat) || seat}-${name}`, null);
    const payload = {
      grade,
      className,
      seat,
      name,
      totalScore: Math.max(0, Math.round(Number(stats.totalScore) || 0)),
      crownCount: Math.max(0, Math.round(Number(stats.crowns) || 0)),
      completedProgress
    };
    if (avatarState && typeof avatarState === "object") {
      payload.avatar = avatarState;
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

  function markLeaderboardSynced(sKey, payload, teacherId) {
    if (!sKey || !payload) return;
    const map = ls.get(LB_SYNCED, {});
    const scopedKey = buildSyncedCacheKey(sKey, teacherId);
    const prev = map[scopedKey];
    const nextScore = Math.max(0, Math.round(Number(payload.totalScore) || 0));
    const nextCrowns = Math.max(0, Math.round(Number(payload.crownCount) || 0));
    const nextProgSig = Array.isArray(payload.completedProgress) ? payload.completedProgress.join(",") : (prev && prev.progressSig) || "";
    map[scopedKey] = {
      totalScore: prev ? Math.max(prev.totalScore || 0, nextScore) : nextScore,
      crownCount: prev ? Math.max(prev.crownCount || 0, nextCrowns) : nextCrowns,
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

  async function postGasJson(url, payload) {
    const r = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }, GAS_TIMEOUT_MS);
    if (!r.ok) throw new Error("伺服器回應 " + r.status);
    return await r.json();
  }

  async function fetchGasSnapshot(explicitTeacherId, { force = false } = {}) {
    const lbUrl = getLeaderboardUrl();
    if (!lbUrl) return null;
    const tid = explicitTeacherId !== undefined ? String(explicitTeacherId || "").trim() : getTeacherId();
    if (!force && lastGasSnapshot && inflightTeacherKey === tid) {
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
        if (Array.isArray(json.teachersList)) {
          cachedTeachersList = json.teachersList;
          ls.set(TEACHERS_LIST_KEY, cachedTeachersList);
        }
        if (tid === getTeacherId()) {
          if (json.currentTeacher && typeof json.currentTeacher === "object") {
            cachedCurrentTeacher = {
              teacherId: String(json.currentTeacher.teacherId || tid).trim(),
              schoolName: String(json.currentTeacher.schoolName || "").trim(),
              teacherName: String(json.currentTeacher.teacherName || "").trim()
            };
            ls.set(TEACHER_META_KEY, cachedCurrentTeacher);
          } else if (tid) {
            const matched = cachedTeachersList.find((t) => t && t.teacherId === tid);
            if (matched) {
              cachedCurrentTeacher = {
                teacherId: tid,
                schoolName: String(matched.schoolName || "").trim(),
                teacherName: String(matched.teacherName || "").trim()
              };
              ls.set(TEACHER_META_KEY, cachedCurrentTeacher);
            }
          }
          lastGasSnapshot = json;
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

  async function uploadLeaderboardScore(profile, quizMeta) {
    const built = buildLeaderboardPayload(profile || Store.profile);
    if (!built) return { ok: false, skipped: true };
    const url = getLeaderboardUrl();
    if (!url) return { ok: false, offline: true };

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

    // 智慧去重上傳：無錯題、總積分/皇冠未超越且已完成單元清單未變動時才略過
    const lastSynced = getSyncedLeaderboardRecord(built.studentKey, tid);
    const curProgSig = Array.isArray(built.payload.completedProgress) ? built.payload.completedProgress.join(",") : "";
    if (
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
        ? Array.from(new Set(it.completedProgress.map((tok) => {
            const [ru, rd] = String(tok || "").trim().split(":");
            const cu = canonicalizeUnitId(ru);
            const cd = /^(easy|medium|hard)$/.test(String(rd || "").trim().toLowerCase()) ? String(rd).trim().toLowerCase() : "single";
            return cu ? `${cu}:${cd}` : "";
          }).filter(Boolean))).sort()
        : collectCompletedProgress({ cls: it.className, seat: it.seat, name: it.name });
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
    if (!profile || !student || typeof student !== "object") return;
    const key = evKey(profile);
    const localEvs = ls.get(key, []);
    const hadLocalEvents = Array.isArray(localEvs) && localEvs.length > 0;
    const existingPassSet = new Set();
    (Array.isArray(localEvs) ? localEvs : []).forEach((e) => {
      if (!e || e.type !== "quiz" || (Number(e.score) || 0) < 60) return;
      const u = canonicalizeUnitId(String(e.unit || e.unitId || "").trim());
      const rd = String(e.difficulty || e.quizDifficulty || (e.detail && e.detail.difficulty) || "single").trim().toLowerCase();
      const d = /^(easy|medium|hard)$/.test(rd) ? rd : "single";
      if (u) existingPassSet.add(`${u}:${d}`);
    });

    const cloudProgress = Array.isArray(student.progress) ? student.progress : [];
    const addedEvents = [];
    let crownsLeft = !hadLocalEvents ? Math.max(0, Number(student.crownCount) || 0) : 0;

    cloudProgress.forEach((token, idx) => {
      const parts = String(token || "").trim().split(":");
      const rawUnit = parts[0] || "";
      const unit = canonicalizeUnitId(rawUnit);
      const rawDiff = String(parts[1] || "single").trim().toLowerCase();
      const diff = /^(easy|medium|hard)$/.test(rawDiff) ? rawDiff : "single";
      if (!unit || existingPassSet.has(`${unit}:${diff}`)) return;
      existingPassSet.add(`${unit}:${diff}`);
      const [island, numStr] = unit.split("-");
      const islObj = Array.isArray(window.ISLANDS) ? window.ISLANDS.find((i) => i && i.id === island) : null;
      const seqItem = islObj && Array.isArray(islObj.sequence) ? islObj.sequence[(Number(numStr) || 0) - 1] : null;
      const unitMeta = window.CONTENT && (window.CONTENT[unit] || window.CONTENT[rawUnit]);
      const useCrown = crownsLeft > 0;
      if (useCrown) crownsLeft--;
      addedEvents.push({
        eid: `cloud-restore-${unit}-${diff}`,
        ts: Date.now() - (cloudProgress.length - idx),
        type: "quiz",
        island,
        unit,
        unitId: unit,
        unitName: (seqItem && seqItem.unit) || (unitMeta && unitMeta.unit) || unit,
        grade: parseGradeFromCls(profile),
        term: 1,
        difficulty: diff === "single" ? null : diff,
        quizDifficulty: diff,
        score: useCrown ? 100 : 80,
        correct: useCrown ? 5 : 4,
        total: 5,
        sec: 0,
        restoredFromCloud: true
      });
    });

    if (addedEvents.length > 0) {
      ls.set(key, [...(Array.isArray(localEvs) ? localEvs : []), ...addedEvents]);
    }

    // 還原雲端角色外觀與鎖定狀態
    if (student.avatar && typeof student.avatar === "object") {
      if (window.AvatarSystem && typeof window.AvatarSystem.restoreCloudAvatar === "function") {
        window.AvatarSystem.restoreCloudAvatar(student.avatar, profile);
      } else {
        ls.set(`ii:avatar:${profile.cls}-${profile.seat}-${profile.name}`, student.avatar);
      }
    } else if (window.AvatarSystem && typeof window.AvatarSystem.getState === "function") {
      // 若雲端尚無角色外觀但本機已有，背景補送
      const localAv = window.AvatarSystem.getState();
      if (localAv && (localAv.presetLocked || (localAv.unlocked && localAv.unlocked.length > 0))) {
        Store.saveAvatarToCloud(localAv, profile);
      }
    }

    const gradeNum = parseGradeFromCls(profile);
    const sKey = buildStudentKey(gradeNum, profile.cls, profile.seat);
    markLeaderboardSynced(sKey, {
      totalScore: Number(student.totalScore) || 0,
      crownCount: Number(student.crownCount) || 0,
      completedProgress: collectCompletedProgress(profile)
    });
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

  async function post(payload) {
    // text/plain 可避免瀏覽器 CORS 預檢,Apps Script 才收得到
    const r = await fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
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
          loginRes = await postGasJson(lbUrl, loginPayload);
        } catch (e) {
          return { ok: false, status: "network_error", msg: "無法連線至雲端驗證伺服器：" + e.message };
        }

        if (!loginRes || typeof loginRes !== "object") {
          return { ok: false, status: "error", msg: "伺服器未回應有效格式，請稍後再試" };
        }
        if (loginRes.status === "need_pin_setup") {
          return {
            ok: false,
            status: "need_pin_setup",
            maskedName: loginRes.maskedName || "",
            hasRosterMatch: !!loginRes.hasRosterMatch
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
          const r = await post({ action: "login", ...p, ...(tid ? { teacherId: tid } : {}) });
          if (!r.ok) return { ok: false, msg: r.error || "登入失敗" };
        } catch (e) { return { ok: false, msg: "無法連線到成績伺服器:" + e.message }; }
      }

      Store.profile = p; ls.set(PROFILE, p);
      if (loginRes && loginRes.student) {
        restoreCloudStudentData(p, loginRes.student);
      }
      try {
        const savedForStudent = readActiveIslandRaw(activeIslandKey(p));
        if (savedForStudent) localStorage.setItem(ACTIVE_ISLAND, savedForStudent);
        else localStorage.removeItem(ACTIVE_ISLAND);
      } catch {}
      syncLeaderboardPool(p);
      document.dispatchEvent(new CustomEvent("ii:avatar-changed"));
      Store.flush();
      flushLeaderboardPending();
      return { ok: true, isNewPin: !!(loginRes && loginRes.isNewPin), student: loginRes && loginRes.student };
    },
    logout() {
      Store.profile = null;
      localStorage.removeItem(PROFILE);
      try { localStorage.removeItem(ACTIVE_ISLAND); } catch {}
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
    quizEvents(unit) { return Store.events().filter(e => e.type === "quiz" && e.unit === unit); },

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
    collectCompletedProgress,
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

  /** 全域焦點與教師戰情室狀態守衛：供各模組的 keydown / pointerdown 監聽統一放行輸入元件 */
  window.isFormInputTarget = (el) => {
    const tag = el && el.tagName ? el.tagName.toUpperCase() : "";
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(el && el.isContentEditable);
  };
  window.isTeacherCockpitOpen = () => !!document.querySelector("#tcCockpit.show, #tcAuthModal.show, #tcQrModal.show, #tcDetailModal.show, #tcConfirmModal.show, #tcProjectorModal.show, #teacher-question-projector");
  window.shouldSkipGlobalEvent = (e) => window.isFormInputTarget(e && e.target) || window.isTeacherCockpitOpen();
})();
