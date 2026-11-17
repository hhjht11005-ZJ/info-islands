// 用法: node tools/validate-content.js <islandId|all>
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const sandbox = { window: {} }; vm.createContext(sandbox);
const run = (f) => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sandbox, { filename: f });
run("data/islands.js");
const arg = process.argv[2] || "all";
const ids = arg === "all" ? sandbox.window.ISLANDS.map(i => i.id) : [arg];
let errors = 0;
const err = (k, m) => { errors++; console.log(`✗ [${k}] ${m}`); };
const FILE_MAP = {
  sys: "data/units/pc-adventure.js",
  citizen: "data/units/island-security.js",
  create: "data/units/island-create.js",
  code: "data/units/island-program.js",
  algo: "data/units/island-alg.js",
  data: "data/units/island-database.js",
  ai: "data/units/AI-alg.js"
};
for (const id of ids) {
  const isl = sandbox.window.ISLANDS.find(i => i.id === id);
  if (!isl) { err(id, "找不到島嶼"); continue; }
  const file = FILE_MAP[id] || `data/content/${id}.js`;
  if (!fs.existsSync(path.join(root, file))) { err(id, `缺少 ${file}`); continue; }
  sandbox.window.CONTENT = {};
  try { run(file); if (id === "sys") run("data/units/island-hardware.js"); } catch (e) { err(id, "語法錯誤: " + e.message); continue; }
  const C = sandbox.window.CONTENT;
  const codes = new Set(isl.standards.map(s => s.code));
  isl.sequence.forEach((u, idx) => {
    const k = `${id}-${idx + 1}`, c = C[k];
    if (!c) return err(k, `缺少單元內容(${u.unit})`);
    const L = c.lesson || {}, W = c.worksheet || {}, Q = c.quiz || {};
    if (!L.overview) err(k, "lesson.overview 缺");
    if (!Array.isArray(L.standards) || !L.standards.length) err(k, "lesson.standards 缺");
    else L.standards.forEach(s => { if (!codes.has(s)) err(k, `lesson.standards「${s}」不在該島 standards 中`); });
    if (!Array.isArray(L.objectives) || L.objectives.length < 2) err(k, "objectives 至少 2 條");
    if (!Array.isArray(L.prep) || !L.prep.length) err(k, "prep 缺");
    if (!Array.isArray(L.flow) || L.flow.length < 4) err(k, "flow 至少 4 階段");
    else {
      const sum = L.flow.reduce((a, f) => a + (f.min || 0), 0);
      if (sum !== u.hours * 45) err(k, `flow 分鐘加總 ${sum} ≠ ${u.hours}×45=${u.hours * 45}`);
      L.flow.forEach((f, i) => { if (!f.phase || !f.teacher || !f.student || !(f.min > 0)) err(k, `flow[${i}] 欄位不完整`); });
    }
    ["differentiation", "assessmentFocus", "extension"].forEach(f => { if (!L[f]) err(k, `lesson.${f} 缺`); });
    // worksheet
    if (!W.title || !W.intro) err(k, "worksheet.title/intro 缺");
    const secs = W.sections || [];
    const n = secs.reduce((a, s) => a + (s.items || []).length, 0);
    if (secs.length < 2 || secs.length > 3) err(k, "worksheet.sections 需 2–3 個");
    if (n < 6 || n > 10) err(k, `worksheet 題數 ${n} 需 6–10`);
    secs.forEach(s => (s.items || []).forEach((it, i) => {
      if (!["short", "fill", "table", "draw", "reflect"].includes(it.type)) err(k, `worksheet 題型錯誤: ${it.type}`);
      if (!it.q) err(k, `worksheet item ${i} 缺 q`);
      if (!it.answer) err(k, `worksheet item「${(it.q || "").slice(0, 12)}」缺 answer`);
      if (it.type === "fill" && !/_{2,}/.test(it.q || "")) err(k, `fill 題缺 ____: ${(it.q || "").slice(0, 15)}`);
    }));
    // quiz
    const qs = Q.levels ? ["easy", "medium", "hard"].flatMap(d => { const lv = Q.levels[d]; if (!lv || !Array.isArray(lv.questions) || lv.questions.length !== 3) err(k, `levels.${d} 需 3 題`); return lv ? lv.questions : []; }) : (Q.questions || []);
    if (!Q.levels && (qs.length < 4 || qs.length > 10)) err(k, `quiz 題數 ${qs.length} 需 4–10`);
    const lv = { 記憶: 0, 理解: 0, 應用: 0 }, ty = {}; const ids2 = new Set(); const pos = new Set();
    qs.forEach(q => {
      if (!q.id || ids2.has(q.id)) err(k, `題目 id 缺或重複 ${q.id}`); ids2.add(q.id);
      if (!(q.level in lv)) err(k, `${q.id} level 無效`); else lv[q.level]++;
      ty[q.type] = (ty[q.type] || 0) + 1;
      if (!q.q) err(k, `${q.id} 缺題幹`);
      if (!q.explain) err(k, `${q.id} 缺 explain`);
      if (q.type === "single") {
        if (!Array.isArray(q.options) || q.options.length !== 4) err(k, `${q.id} single 需 4 選項`);
        else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) err(k, `${q.id} single answer 需 0–3`);
        else pos.add(q.answer);
      } else if (q.type === "multi") {
        if (!Array.isArray(q.options) || q.options.length < 4 || q.options.length > 5) err(k, `${q.id} multi 需 4–5 選項`);
        else if (!Array.isArray(q.answer) || q.answer.length < 2 || q.answer.length >= q.options.length || q.answer.some(a => !Number.isInteger(a) || a < 0 || a >= q.options.length)) err(k, `${q.id} multi answer 無效`);
      } else if (q.type === "tf") {
        if (typeof q.answer !== "boolean") err(k, `${q.id} tf answer 需 boolean`);
      } else if (q.type === "fill") {
        if (!Array.isArray(q.answer) || !q.answer.length || q.answer.some(a => typeof a !== "string" || !a)) err(k, `${q.id} fill answer 需字串陣列`);
        if (!/_{2,}/.test(q.q || "")) err(k, `${q.id} fill 題幹缺 ____`);
      } else err(k, `${q.id} 題型無效 ${q.type}`);
    });
    if (!Q.levels && lv.應用 < 1) err(k, `應用題 ${lv.應用} < 1`);
    if (!Q.levels && (lv.記憶 < 1 || lv.理解 < 1)) err(k, "需含記憶與理解題");
    if (!ty.single) err(k, "題型需含 single");
    if (!Q.levels && pos.size < 2 && (ty.single || 0) >= 3) err(k, "single 正確答案位置過於集中");
  });
  Object.keys(C).forEach(k => { if (!k.startsWith(id + "-") || +k.split("-")[1] > isl.sequence.length) err(k, "多餘的單元鍵值"); });
}
console.log(errors ? `\n❌ ${errors} 個問題` : "\n✅ 驗證通過");
process.exit(errors ? 1 : 0);
