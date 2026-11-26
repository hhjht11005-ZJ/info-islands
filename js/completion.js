/* 全站唯一權威的完成度計算中心（Completion Center）
 * ------------------------------------------------------------------
 * - 統一提供純函式 calculateIslandCompletion(islandId, userProgressState)
 * - 供 3D 大地圖、學習成果雷達圖、島嶼單元選擇視窗與教師戰情室共用
 * - 嚴格定義分母 = 該島真實單元數 × 3（easy / medium / hard），絕不使用 || 1
 * - 嚴格定義分子 = 使用 Set 去重後的已通關關卡數（成績 >= 60 分或明確標記通過）
 * - 未全數通關（passedStages < totalStages）最高只顯示 99%，僅全過才顯示 100%
 */

const DIFFICULTIES = ["easy", "medium", "hard"];
const DEFAULT_PASS_SCORE = 60;
const CITADEL_TOKEN_RE = /^(?:dojo|capstone|citadel):[a-z0-9_-]+$/i;

const ISLAND_ID_ALIASES = {
  sys: "sys",
  hw: "sys",
  hardware: "sys",
  citizen: "citizen",
  sec: "citizen",
  security: "citizen",
  create: "create",
  creation: "create",
  creative: "create",
  code: "code",
  prog: "code",
  programming: "code",
  algo: "algo",
  alg: "algo",
  algorithm: "algo",
  data: "data",
  ai: "ai"
};

const NON_QUIZ_FIELDS = new Set([
  "labCompleted",
  "microLab",
  "microLabs",
  "npcSolved",
  "unlocked",
  "equipped",
  "avatar",
  "look",
  "presetLocked",
  "badges",
  "totalScore",
  "crownCount",
  "crowns",
  "updatedAt",
  "pinCode",
  "studentKey",
  "grade",
  "className",
  "cls",
  "seat",
  "seatNum",
  "name",
  "inRoster",
  "hasCloud"
]);

export function resolveIslandId(rawId) {
  const key = String(rawId || "").trim().toLowerCase();
  if (!key) return "";
  return ISLAND_ID_ALIASES[key] || key;
}

export function canonicalizeUnitId(rawUnitId) {
  const raw = String(rawUnitId || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/^([a-z]+)(\d+)$/i, "$1-$2");
  const m = normalized.match(/^([a-z]+)-(\d+)$/i);
  if (!m) return normalized.toLowerCase();
  const canonPrefix = resolveIslandId(m[1]);
  const num = Number(m[2]);
  return `${canonPrefix}-${Number.isFinite(num) && num > 0 ? num : m[2]}`;
}

export function normalizeDifficultyToken(rawDiff, { allowSingle = false, mapSingleToEasy = false } = {}) {
  const raw = String(rawDiff || "").trim();
  if (!raw) {
    if (mapSingleToEasy) return "easy";
    return allowSingle ? "single" : "";
  }
  const low = raw.toLowerCase();
  if (low === "easy" || low === "e" || /易|初階|入門|簡單|基礎/.test(raw)) return "easy";
  if (low === "medium" || low === "med" || low === "m" || /中|進階|普通/.test(raw)) return "medium";
  if (low === "hard" || low === "h" || /難|大師|困難|挑戰/.test(raw)) return "hard";
  if (low === "single" || low === "standard" || raw === "標準") {
    if (mapSingleToEasy) return "easy";
    return allowSingle ? "single" : "";
  }
  return "";
}

export function parseProgressToken(rawToken, { mapSingleToEasy = false } = {}) {
  const s = String(rawToken || "").trim();
  if (!s || CITADEL_TOKEN_RE.test(s)) return null;
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
  const diff = normalizeDifficultyToken(rawDiff, { allowSingle: !mapSingleToEasy, mapSingleToEasy });
  if (!unit || !diff) return null;
  return { unit, diff, key: `${unit}:${diff}` };
}

function getIslandsList() {
  return (typeof window !== "undefined" && Array.isArray(window.ISLANDS)) ? window.ISLANDS : [];
}

function getContentMap() {
  return (typeof window !== "undefined" && window.CONTENT && typeof window.CONTENT === "object")
    ? window.CONTENT
    : {};
}

export function getPassScoreForUnit(unitId) {
  const canon = canonicalizeUnitId(unitId);
  const content = getContentMap();
  const unitObj = content[canon] || content[String(unitId || "").trim()] || null;
  const score = unitObj && unitObj.quiz ? Number(unitObj.quiz.passScore) : NaN;
  return Number.isFinite(score) && score > 0 ? score : DEFAULT_PASS_SCORE;
}

export function getIslandUnits(islandId) {
  const normId = resolveIslandId(islandId);
  if (!normId) return [];
  const island = getIslandsList().find((isl) => isl && resolveIslandId(isl.id) === normId);
  if (!island || !Array.isArray(island.sequence)) return [];
  const content = getContentMap();
  return island.sequence.map((seq, idx) => {
    const unitId = `${island.id}-${idx + 1}`;
    const unitContent = content[unitId] || null;
    return {
      id: unitId,
      unitId,
      unitName: (seq && seq.unit) || (unitContent && unitContent.unit) || unitId,
      grade: Number(seq && seq.grade) || 7,
      term: Number(seq && seq.term) || 1,
      passScore: getPassScoreForUnit(unitId)
    };
  });
}

function isPassedByValue(val, passScore) {
  if (val === true || val === 1 || val === "true") return true;
  if (typeof val === "number") return Number.isFinite(val) && val >= passScore;
  if (val && typeof val === "object") {
    if (val.passed === false || val.isPassed === false) return false;
    if (val.score !== undefined && val.score !== null && val.score !== "") {
      return Number(val.score) >= passScore || val.passed === true || val.isPassed === true;
    }
    return val.passed === true || val.isPassed === true;
  }
  return false;
}

/**
 * 將任意合法格式（測驗事件陣列、progress token 陣列、Set、JSON/字串、物件）
 * 萃取為標準去重的通過關卡 Set，鍵值格式固定為 "<unitId>:<easy|medium|hard>"。
 */
export function extractPassedStageSet(userProgressState) {
  const passedSet = new Set();

  const addStage = (rawUnit, rawDiff) => {
    const unit = canonicalizeUnitId(rawUnit);
    if (!unit || !/^[a-z]+-\d+$/.test(unit)) return;
    const diff = normalizeDifficultyToken(rawDiff, { mapSingleToEasy: true });
    if (!diff || !DIFFICULTIES.includes(diff)) return;
    passedSet.add(`${unit}:${diff}`);
  };

  const walk = (val) => {
    if (val === null || val === undefined) return;

    if (val instanceof Set) {
      val.forEach((item) => walk(item));
      return;
    }

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
        const parsed = parseProgressToken(part, { mapSingleToEasy: true });
        if (parsed) addStage(parsed.unit, parsed.diff);
      });
      return;
    }

    if (Array.isArray(val)) {
      val.forEach((item) => {
        if (typeof item === "string") {
          const parsed = parseProgressToken(item, { mapSingleToEasy: true });
          if (parsed) addStage(parsed.unit, parsed.diff);
        } else if (Array.isArray(item) || item instanceof Set) {
          walk(item);
        } else if (item && typeof item === "object") {
          if (item.type && item.type !== "quiz") return;
          const rawUnit = item.unit || item.unitId || item.key || item.id || "";
          const canonUnit = canonicalizeUnitId(rawUnit);
          if (canonUnit && /^[a-z]+-\d+$/.test(canonUnit)) {
            const passScore = getPassScoreForUnit(canonUnit);
            let ok = false;
            if (item.passed === false || item.isPassed === false) {
              ok = false;
            } else if (item.score !== undefined && item.score !== null && item.score !== "") {
              ok = Number(item.score) >= passScore || item.passed === true || item.isPassed === true;
            } else {
              ok = item.passed === true || item.isPassed === true;
            }
            if (!ok) return;
            const rawDiff = item.difficulty || item.quizDifficulty || item.diff || (item.detail && item.detail.difficulty) || "easy";
            addStage(canonUnit, rawDiff);
          } else {
            walk(item);
          }
        }
      });
      return;
    }

    if (typeof val === "object") {
      if (val.progressSet instanceof Set) walk(val.progressSet);
      if (val.passedSet instanceof Set) walk(val.passedSet);
      if (val.events !== undefined) walk(val.events);
      if (val.completedProgress !== undefined) walk(val.completedProgress);
      if (val.progress !== undefined) walk(val.progress);
      if (val.rawProgressList !== undefined) walk(val.rawProgressList);
      if (val.passed !== undefined && typeof val.passed !== "boolean") walk(val.passed);

      Object.entries(val).forEach(([k, v]) => {
        if (
          k === "progressSet" ||
          k === "passedSet" ||
          k === "events" ||
          k === "completedProgress" ||
          k === "progress" ||
          k === "rawProgressList" ||
          k === "passed" ||
          NON_QUIZ_FIELDS.has(k)
        ) {
          return;
        }
        const tok = parseProgressToken(k, { mapSingleToEasy: true });
        if (tok) {
          if (isPassedByValue(v, getPassScoreForUnit(tok.unit))) {
            addStage(tok.unit, tok.diff);
          }
          return;
        }
        const canonUnit = canonicalizeUnitId(k);
        if (!canonUnit || !/^[a-z]+-\d+$/.test(canonUnit)) return;
        const passScore = getPassScoreForUnit(canonUnit);
        if (Array.isArray(v)) {
          v.forEach((sub) => {
            if (typeof sub === "string") {
              addStage(canonUnit, sub);
            } else if (sub && typeof sub === "object") {
              if (isPassedByValue(sub, passScore)) {
                addStage(canonUnit, sub.difficulty || sub.quizDifficulty || sub.diff || "easy");
              }
            }
          });
        } else if (v && typeof v === "object") {
          Object.entries(v).forEach(([diffKey, diffVal]) => {
            if (isPassedByValue(diffVal, passScore)) {
              addStage(canonUnit, diffKey);
            }
          });
        } else if (isPassedByValue(v, passScore)) {
          addStage(canonUnit, "easy");
        }
      });
    }
  };

  walk(userProgressState);
  return passedSet;
}

function resolveDefaultProgressState() {
  if (typeof window === "undefined" || !window.Store) return [];
  if (!window.Store.profile || typeof window.Store.events !== "function") return [];
  return window.Store.events();
}

export function computeCompletionPercentage(passedStages, totalStages) {
  const total = Math.max(0, Number(totalStages) || 0);
  const passed = Math.max(0, Math.min(total, Number(passedStages) || 0));
  if (total <= 0 || passed <= 0) return 0;
  if (passed >= total) return 100;
  return Math.min(99, Math.round((passed / total) * 100));
}

/**
 * 全站唯一權威的單島完成度純函式
 * @param {string} islandId
 * @param {unknown} [userProgressState]
 */
export function calculateIslandCompletion(islandId, userProgressState) {
  const normId = resolveIslandId(islandId);
  const island = getIslandsList().find((isl) => isl && resolveIslandId(isl.id) === normId) || null;
  const units = island ? getIslandUnits(island.id) : [];
  const totalUnits = units.length;
  const totalStages = totalUnits * DIFFICULTIES.length;

  const effectiveState = arguments.length >= 2 && userProgressState !== undefined
    ? userProgressState
    : resolveDefaultProgressState();
  const extractedSet = extractPassedStageSet(effectiveState);

  const passedSet = new Set();
  const unitDetails = units.map((u) => {
    const passedDiffs = {};
    let passedCount = 0;
    DIFFICULTIES.forEach((diff) => {
      const stageKey = `${u.unitId}:${diff}`;
      const ok = extractedSet.has(stageKey);
      passedDiffs[diff] = ok;
      if (ok) {
        passedSet.add(stageKey);
        passedCount++;
      }
    });
    return {
      ...u,
      passedDiffs,
      passedCount,
      totalDiffs: DIFFICULTIES.length
    };
  });

  const passedStages = passedSet.size;
  const percentage = computeCompletionPercentage(passedStages, totalStages);

  return {
    islandId: island ? island.id : normId,
    islandName: island ? island.name : normId,
    units,
    totalUnits,
    totalStages,
    passedStages,
    percentage,
    isCompleted: totalStages > 0 && passedStages === totalStages,
    passedKeys: Array.from(passedSet).sort(),
    unitDetails
  };
}

export function calculateAllIslandsCompletion(userProgressState) {
  const effectiveState = arguments.length >= 1 && userProgressState !== undefined
    ? userProgressState
    : resolveDefaultProgressState();
  const extractedSet = extractPassedStageSet(effectiveState);
  const byId = {};
  const list = getIslandsList().map((isl) => {
    const res = calculateIslandCompletion(isl.id, extractedSet);
    byId[isl.id] = res;
    return res;
  });
  return { byId, list };
}

export function calculateOverallCompletion(userProgressState) {
  const effectiveState = arguments.length >= 1 && userProgressState !== undefined
    ? userProgressState
    : resolveDefaultProgressState();
  const { byId, list } = calculateAllIslandsCompletion(effectiveState);
  const totalUnits = list.reduce((sum, item) => sum + item.totalUnits, 0);
  const totalStages = list.reduce((sum, item) => sum + item.totalStages, 0);
  const passedStages = list.reduce((sum, item) => sum + item.passedStages, 0);
  const percentage = computeCompletionPercentage(passedStages, totalStages);
  let rawPercentage = 0;
  if (totalStages > 0 && passedStages > 0) {
    rawPercentage = passedStages >= totalStages
      ? 100
      : Math.min(99.9, (passedStages / totalStages) * 100);
  }
  return {
    totalUnits,
    totalStages,
    passedStages,
    percentage,
    rawPercentage,
    isCompleted: totalStages > 0 && passedStages === totalStages,
    islands: byId,
    list
  };
}

if (typeof window !== "undefined") {
  window.calculateIslandCompletion = calculateIslandCompletion;
  window.CompletionCenter = {
    DIFFICULTIES: DIFFICULTIES.slice(),
    DEFAULT_PASS_SCORE,
    resolveIslandId,
    canonicalizeUnitId,
    normalizeDifficultyToken,
    parseProgressToken,
    getPassScoreForUnit,
    getIslandUnits,
    extractPassedStageSet,
    computeCompletionPercentage,
    calculateIslandCompletion,
    calculateAllIslandsCompletion,
    calculateOverallCompletion
  };
}
