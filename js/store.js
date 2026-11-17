/* 資料層:學員身分 + 學習紀錄(本機 localStorage,並可同步到 Google 試算表) + 年級榮譽成績池 */
(() => {
  const CFG = window.APP_CONFIG;
  const PROFILE = "ii:profile", QUEUE = "ii:queue", POOL = "ii:leaderboard:pool", LB_PENDING = "ii:leaderboard:pending";
  const ls = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } }
  };
  const evKey = p => `ii:ev:${p.cls}-${p.seat}-${p.name}`;
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

  function buildLeaderboardPayload(profile) {
    if (!profile || profile.isGatekeeper || profile.isVirtual) return null;
    const className = String(profile.cls || profile.className || "").trim();
    const seatNum = Number(profile.seat);
    const seat = Number.isFinite(seatNum) && seatNum > 0 ? String(seatNum) : String(profile.seat || "").trim();
    const name = String(profile.name || "").trim();
    if (!className || !seat || !name) return null;
    const gradeNum = parseGradeFromCls({ grade: profile.grade, cls: className });
    const grade = String(gradeNum);
    const evs = ls.get(evKey({ cls: className, seat: Number(seat) || seat, name }), []);
    const stats = summarizeQuizEvents(evs);
    return {
      studentKey: buildStudentKey(grade, className, seat),
      payload: {
        grade,
        className,
        seat,
        name,
        totalScore: Math.max(0, Math.round(Number(stats.totalScore) || 0)),
        crownCount: Math.max(0, Math.round(Number(stats.crowns) || 0))
      },
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

  async function postLeaderboardPayload(url, payload) {
    // text/plain;charset=utf-8 可避開瀏覽器 CORS 預檢 (OPTIONS)，讓 GAS doPost 順利接收
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error("伺服器回應 " + r.status);
    const data = await r.json();
    if (!data || data.status !== "ok") {
      throw new Error((data && data.message) || "風雲榜寫入失敗");
    }
    return data;
  }

  async function uploadLeaderboardScore(profile) {
    const built = buildLeaderboardPayload(profile || Store.profile);
    if (!built) return { ok: false, skipped: true };
    const url = getLeaderboardUrl();
    if (!url) return { ok: false, offline: true };

    const seq = ++lbUploadSeq;
    savePendingLeaderboard(built.studentKey, built.payload, seq, built.updatedAt);

    try {
      const data = await postLeaderboardPayload(url, built.payload);
      clearPendingLeaderboard(built.studentKey, seq);
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
    const items = Object.values(pending || {});
    let flushed = 0;
    for (const it of items) {
      if (!it || !it.className || !it.seat || !it.name) continue;
      const payload = {
        grade: String(it.grade || parseGradeFromCls(it.className)),
        className: String(it.className),
        seat: String(it.seat),
        name: String(it.name),
        totalScore: Math.max(0, Math.round(Number(it.totalScore) || 0)),
        crownCount: Math.max(0, Math.round(Number(it.crownCount) || 0))
      };
      try {
        await postLeaderboardPayload(url, payload);
        clearPendingLeaderboard(it.studentKey, it.seq);
        flushed++;
      } catch {
        // 網路仍異常時保留 localStorage 待下次重試
      }
    }
    return flushed;
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
    profile: ls.get(PROFILE, null),

    /** 登入:grade 7–9、room 班級、seat 座號、name 姓名。回傳 {ok} 或 {ok:false,msg} */
    async login({ grade, room, seat, name }) {
      const p = { cls: String(grade) + String(room).padStart(2, "0"), seat: Number(seat), name: String(name).trim() };
      if (Store.online()) {
        try {
          const r = await post({ action: "login", ...p });
          if (!r.ok) return { ok: false, msg: r.error || "登入失敗" };
        } catch (e) { return { ok: false, msg: "無法連線到成績伺服器:" + e.message }; }
      }
      Store.profile = p; ls.set(PROFILE, p);
      syncLeaderboardPool(p);
      Store.flush();
      flushLeaderboardPending();
      return { ok: true };
    },
    logout() { Store.profile = null; localStorage.removeItem(PROFILE); },

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
      const leaderboardSyncPromise = (ev.type === "quiz" && getLeaderboardUrl())
        ? uploadLeaderboardScore(p)
        : null;
      if (!Store.online()) return { local: true, synced: false, leaderboardSyncPromise };
      try {
        const r = await post({ action: "submit", ...p, event: ev });
        if (!r.ok) throw new Error(r.error || "寫入失敗");
        return { local: true, synced: true, leaderboardSyncPromise };
      } catch (e) {
        ls.set(QUEUE, [...ls.get(QUEUE, []), { p, ev }]);
        return { local: true, synced: false, error: e.message, leaderboardSyncPromise };
      }
    },
    pending: () => ls.get(QUEUE, []).length,
    /** 補送先前失敗的紀錄 */
    async flush() {
      if (!Store.online()) return;
      const rest = [];
      for (const it of ls.get(QUEUE, [])) {
        try { const r = await post({ action: "submit", ...it.p, event: it.ev }); if (!r.ok) rest.push(it); }
        catch { rest.push(it); }
      }
      ls.set(QUEUE, rest);
    },

    /* ---- 年級成績池與遠端對接擴充 ---- */
    parseGradeFromCls,
    summarizeQuizEvents,
    syncLeaderboardPool,
    buildStudentKey,
    buildLeaderboardPayload,
    uploadLeaderboardScore,
    flushLeaderboardPending,
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
          const r = await fetch(`${lbUrl}?t=${Date.now()}`, { cache: "no-store" });
          if (!r.ok) return [];
          const json = await r.json();
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
})();
