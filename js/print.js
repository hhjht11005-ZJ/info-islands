/* A4 學習單 / 教案綱要 列印預覽與另存 PDF（搭配 js/print.js；使用 window.print()） */
(() => {
  const ISLANDS = window.ISLANDS || [];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const GRADE = { 7: "七", 8: "八", 9: "九" };
  const termLabel = (g, t) => GRADE[g] + (t === 1 ? "上" : "下");
  const TYPE_LABEL = { short: "簡答", fill: "填空", table: "表格整理", draw: "繪圖/設計", reflect: "反思" };

  const wrap = document.createElement("div");
  wrap.id = "printPreview"; wrap.className = "print-preview";
  wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-label", "A4 列印預覽");
  wrap.innerHTML = `<div class="pp-bar no-print">
      <strong>🖨️ A4 列印預覽</strong><span class="pp-tip">在列印視窗的「目的地」選擇「另存為 PDF」即可匯出(建議勾選「背景圖形」)</span>
      <span class="pp-actions"><button type="button" id="ppPrint" class="pp-btn pp-primary">🖨️ 列印 / 另存 PDF</button><button type="button" id="ppClose" class="pp-btn">✕ 關閉預覽</button></span>
    </div><div class="pp-scroll"><article class="print-sheet" id="ppSheet"></article></div>`;
  document.body.appendChild(wrap);
  const sheet = wrap.querySelector("#ppSheet");
  let oldTitle = document.title;

  function close() {
    wrap.classList.remove("show");
    document.body.classList.remove("is-printing-preview");
    document.title = oldTitle;
  }
  wrap.querySelector("#ppClose").onclick = close;
  wrap.querySelector("#ppPrint").onclick = () => window.print();
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && wrap.classList.contains("show")) close(); });
  window.addEventListener("afterprint", () => { if (wrap.classList.contains("show")) document.title = oldTitle; });

  const unitMeta = (key) => {
    const [iid, n] = key.split("-"); const isl = ISLANDS.find(i => i.id === iid);
    const s = isl && isl.sequence[+n - 1], uc = window.CONTENT && window.CONTENT[key];
    return isl && s && uc ? { isl, s, uc } : null;
  };

  function studentBlock() {
    const p = window.Store && window.Store.profile;
    const cls = p ? `${GRADE[String(p.cls)[0]] || ""}年${parseInt(String(p.cls).slice(1), 10)}班` : "";
    const d = new Date();
    const date = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
    const f = (label, v) => `<span class="p-field"><i>${label}</i><b>${esc(v || "")}</b></span>`;
    return `<div class="p-meta">${f("班級", cls)}${f("座號", p ? p.seat : "")}${f("姓名", p ? p.name : "")}${f("列印日期", date)}</div>`;
  }
  function header(info, modeLabel) {
    const school = (window.APP_CONFIG && window.APP_CONFIG.SCHOOL) || "";
    return `<header class="p-head">
      <div class="p-title"><span>🏝️ ${esc(school)}${school ? " · " : ""}資訊冒險島</span><em>${modeLabel}</em></div>
      <div class="p-sub">${info.isl.emoji} ${esc(info.isl.name)} · ${termLabel(info.s.grade, info.s.term)} · 〈${esc(info.s.unit)}〉 · ${info.s.hours} 節（${info.s.hours * 45} 分鐘）</div>
      ${studentBlock()}</header>`;
  }
  const lines = (n) => Array.from({ length: n }, () => `<div class="p-line"></div>`).join("");

  function lessonHtml(info) {
    const { isl, s, uc } = info, L = uc.lesson || {};
    const stdText = (L.standards || []).map(code => {
      const st = isl.standards.find(x => x.code === code);
      return `<tr><td class="p-code">${esc(code)}</td><td>${esc(st ? st.text : "")}</td></tr>`;
    }).join("");
    const total = (L.flow || []).reduce((a, f) => a + (f.min || 0), 0);
    return header(info, "教案綱要") + `
      <section class="p-sec"><h2>📌 教學概述</h2><p>${esc(L.overview)}</p></section>
      <section class="p-sec"><h2>🎯 教學目標</h2><ol class="p-list">${(L.objectives || []).map(o => `<li>${esc(o)}</li>`).join("")}</ol></section>
      <section class="p-sec"><h2>📘 對應課綱條目</h2><table class="p-table"><tr><th style="width:18%">條碼</th><th>內容</th></tr>${stdText}</table></section>
      <section class="p-sec"><h2>🧰 課前準備</h2><ul class="p-list">${(L.prep || []).map(o => `<li>${esc(o)}</li>`).join("")}</ul></section>
      <section class="p-sec"><h2>⏱️ 教學流程（共 ${total} 分鐘）</h2>
        <table class="p-table p-flow"><tr><th style="width:17%">階段</th><th style="width:8%">時間</th><th>教師教學活動</th><th>學生學習活動</th></tr>
        ${(L.flow || []).map(f => `<tr><td><b>${esc(f.phase)}</b></td><td class="p-c">${esc(f.min)} 分</td><td>${esc(f.teacher)}</td><td>${esc(f.student)}</td></tr>`).join("")}</table></section>
      <section class="p-sec p-two"><div><h2>🧩 差異化教學</h2><p>${esc(L.differentiation)}</p></div><div><h2>✅ 評量重點</h2><p>${esc(L.assessmentFocus)}</p></div></section>
      <section class="p-sec"><h2>🏠 課後延伸</h2><p>${esc(L.extension)}</p></section>`;
  }

  function worksheetHtml(info) {
    const { isl, s, uc } = info, W = uc.worksheet || {}, P = uc.print || {};
    const thinking = P.thinking || ["這個單元中,哪一個概念對你最新鮮?", "你打算怎麼把學到的內容用在生活中?"];
    let qn = 0, hasDraw = false;
    const items = (W.sections || []).map(sec => `<section class="p-sec"><h2>${esc(sec.title)}</h2>${(sec.items || []).map(it => {
      qn++;
      let ans;
      if (it.type === "draw") { hasDraw = true; ans = `<div class="p-box p-box-draw"><span>繪圖作答區</span></div>`; }
      else if (it.type === "table") ans = `<div class="p-box p-box-table"><span>表格整理作答區</span></div>`;
      else if (it.type === "fill") ans = `<div class="p-line p-line-short"></div>`;
      else ans = lines(it.type === "reflect" ? 4 : 3);
      return `<div class="p-item"><div class="p-q"><span class="p-qn">${qn}</span><span class="p-ty">${esc(TYPE_LABEL[it.type] || it.type)}</span>${esc(it.q).replace(/\n/g, "<br>")}</div>
        ${it.hint ? `<div class="p-hint">💡 提示：${esc(it.hint)}</div>` : ""}${ans}</div>`;
    }).join("")}</section>`).join("");
    const rubric = (isl.rubric || []).length ? `<section class="p-sec"><h2>📊 評量規準（Rubric）</h2>
      <table class="p-table p-rubric"><tr><th style="width:20%">向度</th><th>表現優良</th><th>基本達成</th><th>待加強</th><th style="width:11%">自評</th></tr>
      ${isl.rubric.map(r => `<tr><td><b>${esc(r.c)}</b></td><td>${esc(r.a)}</td><td>${esc(r.b)}</td><td>${esc(r.t)}</td><td class="p-c">☐ 優<br>☐ 基<br>☐ 待</td></tr>`).join("")}</table></section>` : "";
    return header(info, "課堂實作學習單") + `
      <section class="p-sec p-callout"><h2>📖 題目情境</h2><p>${esc(P.situation || W.intro)}</p><p class="p-task-title">${esc(W.title || "")}</p></section>
      <section class="p-sec p-think"><h2>💭 引導思考框</h2><ul>${thinking.map(t => `<li>${esc(t)}<div class="p-line"></div></li>`).join("")}</ul></section>
      ${items}
      ${P.flowchart || hasDraw ? `<section class="p-sec"><h2>🔀 繪製流程圖作答框</h2><p>${esc(P.flowchart || "請依題意繪製流程圖或概念圖,並以箭頭標示步驟順序。")}</p><div class="p-box p-box-flow"><span>流程圖作答區（可使用 ▭ 處理、◇ 判斷、➜ 箭頭）</span></div></section>` : ""}
      ${rubric}
      <footer class="p-foot">資訊冒險島 · ${esc(info.isl.name)} · ${esc(s.unit)}　　教師簽章：__________　家長簽章：__________</footer>`;
  }

  /** mode: "lesson" 教案綱要 | "ws" 學習單 */
  function open(key, mode) {
    const info = unitMeta(key); if (!info) return;
    sheet.innerHTML = mode === "lesson" ? lessonHtml(info) : worksheetHtml(info);
    oldTitle = document.title;
    document.title = `${info.s.unit}_${mode === "lesson" ? "教案綱要" : "學習單"}`;
    wrap.classList.add("show");
    document.body.classList.add("is-printing-preview");
    wrap.querySelector(".pp-scroll").scrollTop = 0;
  }
  window.Print = { open, close };
})();
