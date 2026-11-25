/* 單元線上測驗:(難度選擇) → 作答 → 批改 → 本機記錄 / 徽章 → 送到 Google 試算表 */
(() => {
  const ISLANDS = window.ISLANDS;
  const SITE = window.SITE;
  const unitInfo = (key) => {
    const [iid, n] = key.split("-"); const isl = ISLANDS.find(i => i.id === iid);
    const s = isl && isl.sequence[+n - 1]; return s ? { isl, s } : null;
  };
  const termLabel = (g, t) => ({ 7: "七", 8: "八", 9: "九" }[g]) + (t === 1 ? "上" : "下");
  const hasQuiz = (key) => !!(window.CONTENT && window.CONTENT[key] && window.CONTENT[key].quiz);
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const L = "ABCDE";
  const DIFFS = ["easy", "medium", "hard"];
  const DIFF_NAME = { easy: "易", medium: "中", hard: "難" };
  const BADGES = {
    silver: { icon: "🧭", name: "銀色羅盤徽章", from: "進階挑戰者(中)" },
    gold: { icon: "👑", name: "金色大師徽章", from: "大師領航員(難)" }
  };

  /** 取得某單元(某難度)的題庫設定;無分級題庫的單元維持原本單一題庫 */
  function cfgOf(key, diff) {
    const Q = window.CONTENT[key].quiz;
    const lv = diff && Q.levels && Q.levels[diff];
    const questions = lv && Array.isArray(lv.questions) ? lv.questions : (Array.isArray(Q.questions) ? Q.questions : []);
    return { passScore: Number(Q.passScore) || 60, questions, diff: lv ? diff : null, lv: lv || null };
  }
  const hasLevels = (key) => !!(window.CONTENT[key].quiz.levels);

  const wrap = document.createElement("div");
  wrap.id = "quizModal"; wrap.className = "modal-wrap";
  wrap.innerHTML = `<div class="modal quiz" role="dialog" aria-modal="true"><button class="close" id="quizClose" aria-label="關閉">✕</button><div id="quizBody"></div></div>`;
  document.body.appendChild(wrap);
  const body = wrap.querySelector("#quizBody");
  wrap.querySelector("#quizClose").onclick = close;
  wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
  document.addEventListener("keydown", e => {
    if (window.shouldSkipGlobalEvent && window.shouldSkipGlobalEvent(e)) return;
    if (e.key === "Escape" && wrap.classList.contains("show")) close();
  });
  let quizCompletedInSession = false;
  function close() {
    if (!wrap.classList.contains("show")) return;
    wrap.classList.remove("show");
    const completed = quizCompletedInSession;
    quizCompletedInSession = false;
    document.dispatchEvent(new CustomEvent("ii:quizclosed", { detail: { completed } }));
  }

  /* ---- 批改 ---- */
  const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, "").replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 65248));
  function isCorrect(q, a) {
    if (a === undefined || a === null || a === "" || (Array.isArray(a) && !a.length)) return false;
    switch (q.type) {
      case "single": return a === q.answer;
      case "tf": return a === q.answer;
      case "multi": return Array.isArray(a) && a.length === q.answer.length && [...a].sort().join() === [...q.answer].sort().join();
      case "fill": return q.answer.some(x => norm(x) === norm(a));
    }
    return false;
  }
  const showAns = (q) => q.type === "single" ? `${L[q.answer]}. ${q.options[q.answer]}` :
    q.type === "tf" ? (q.answer ? "○ 正確" : "✕ 錯誤") :
    q.type === "multi" ? q.answer.map(i => `${L[i]}. ${q.options[i]}`).join("、") : q.answer[0];
  const showMine = (q, a) => a === undefined || a === "" || (Array.isArray(a) && !a.length) ? "(未作答)" :
    q.type === "single" ? `${L[a]}. ${q.options[a]}` : q.type === "tf" ? (a ? "○ 正確" : "✕ 錯誤") :
    q.type === "multi" ? a.map(i => L[i]).join("、") : a;

  /* ---- 畫面 ---- */
  /** open(key) 先顯示難度選擇;open(key, diff) 直接開始該難度 */
  function open(key, diff) {
    if (!window.Auth.requireLogin()) return;       // 未登入先跳出登入視窗
    const info = unitInfo(key); if (!info || !hasQuiz(key)) return;
    if (window.Store && typeof window.Store.setActiveIslandId === "function") {
      window.Store.setActiveIslandId(info.isl.id);
    }
    quizCompletedInSession = false;
    wrap.classList.add("show");
    if (diff && hasLevels(key) && window.CONTENT[key].quiz.levels[diff]) run(key, info, diff);
    else intro(key, info);
  }
  function head(info, diff) {
    const lv = diff && window.CONTENT[info.isl.id + "-" + (info.isl.sequence.indexOf(info.s) + 1)].quiz.levels;
    const tag = lv && lv[diff] ? `<span class="badge">${lv[diff].icon} ${lv[diff].label}（${DIFF_NAME[diff]} · ${lv[diff].questions.length} 題）</span>` : "";
    return `<div class="q-head" style="--c:${info.isl.color}"><span class="badge">${info.isl.emoji} ${info.isl.name}</span>
      <span class="badge">${termLabel(info.s.grade, info.s.term)}</span>${tag}<h2>${esc(info.s.unit)} · 單元測驗</h2></div>`;
  }
  const histRows = (hist) => `<div class="hist"><b>我的紀錄</b>(最佳 ${Math.max(...hist.map(e => e.score))} 分)<ul>${hist.slice(-5).reverse().map(e => `<li>${new Date(e.ts).toLocaleString("zh-TW", { hour12: false })}${e.difficulty ? ` [${DIFF_NAME[e.difficulty]}]` : ""} — <b>${e.score}</b> 分(${e.correct}/${e.total})</li>`).join("")}</ul></div>`;

  function intro(key, info) {
    const Q = window.CONTENT[key].quiz, hist = Store.quizEvents(key);
    const passTarget = Number(Q.passScore) || 60;
    if (hasLevels(key)) {
      const badges = Store.badges().filter(b => b.unit === key).map(b => b.type);
      body.innerHTML = head(info) + `<div class="q-pad">
        <p>請選擇挑戰難度。<b>任何難度達 ${passTarget} 分以上</b>都算通過本單元(島嶼建築會升級);挑戰「中」與「難」還能獲得徽章!成績會記到「${esc(Store.profile.name)}」名下。</p>
        <div class="diff-cards">${DIFFS.filter(d => Q.levels[d]).map(d => {
          const lv = Q.levels[d], mine = hist.filter(e => e.difficulty === d);
          const best = mine.length ? Math.max(...mine.map(e => e.score)) : null;
          const got = lv.badge && badges.includes(lv.badge);
          const qCount = Array.isArray(lv.questions) ? lv.questions.length : 0;
          return `<button type="button" class="diff-card d-${d}" data-d="${d}">
            <span class="dc-ico">${lv.icon}</span><span class="dc-lv">${DIFF_NAME[d]}</span>
            <b>${lv.label}</b><span class="dc-desc">${esc(lv.desc)}</span>
            <span class="dc-meta">${qCount} 題 · 及格 ${passTarget} 分</span>
            ${lv.badge ? `<span class="dc-badge${got ? " got" : ""}">${BADGES[lv.badge].icon} ${BADGES[lv.badge].name}${got ? " ✔" : "(未獲得)"}</span>` : `<span class="dc-badge none">入門無徽章</span>`}
            <span class="dc-best">${best === null ? "尚未挑戰" : `最佳 ${best} 分`}</span></button>`;
        }).join("")}</div>
        ${hist.length ? histRows(hist) : ""}</div>`;
      body.querySelectorAll(".diff-card").forEach(c => c.onclick = () => run(key, info, c.dataset.d));
      return;
    }
    const questions = Array.isArray(Q.questions) ? Q.questions : [];
    body.innerHTML = head(info) + `<div class="q-pad">
      <p>共 <b>${questions.length}</b> 題,及格分數 <b>${passTarget}</b> 分。作答後會立刻顯示解析,成績會記到「${esc(Store.profile.name)}」名下。</p>
      ${hist.length ? histRows(hist) : ""}
      <button class="btn-primary" id="qStart">${hist.length ? "再測一次" : "開始測驗"}</button></div>`;
    body.querySelector("#qStart").onclick = () => run(key, info, null);
  }
  function run(key, info, diff) {
    const C = cfgOf(key, diff), t0 = Date.now();
    const questions = C.questions;
    let currentIndex = 0;
    const initPct = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;
    body.innerHTML = head(info, C.diff) + `<form class="q-pad" id="qForm">
      <div class="q-progress-wrap" aria-live="polite">
        <div class="q-progress-info">
          <span class="q-progress-label" id="qProgressText">第 ${currentIndex + 1} / ${questions.length} 題</span>
          <span class="q-progress-pct" id="qProgressPct">${Math.round(initPct)}%</span>
        </div>
        <div class="q-progress-track" role="progressbar" aria-valuemin="1" aria-valuemax="${questions.length}" aria-valuenow="${currentIndex + 1}">
          <div class="q-progress-bar" id="qProgressBar" style="width:${initPct}%"></div>
        </div>
      </div>
      ${questions.map((q, n) => `<fieldset class="qq${n === 0 ? " active-q" : ""}" data-id="${q.id}" data-idx="${n}"><legend><span class="qn">${n + 1}</span> <span class="q-step-tag">第 ${n + 1} / ${questions.length} 題</span> ${esc(q.q).replace(/\n/g, "<br>")} <span class="lv">${q.level}${q.type === "multi" ? " · 多選" : ""}</span></legend>
        ${q.type === "tf" ? `<label class="opt"><input type="radio" name="${q.id}" value="true"> ○ 正確</label><label class="opt"><input type="radio" name="${q.id}" value="false"> ✕ 錯誤</label>` : ""}
        ${q.type === "single" ? q.options.map((o, i) => `<label class="opt"><input type="radio" name="${q.id}" value="${i}"> <b>${L[i]}.</b> ${esc(o)}</label>`).join("") : ""}
        ${q.type === "multi" ? q.options.map((o, i) => `<label class="opt"><input type="checkbox" name="${q.id}" value="${i}"> <b>${L[i]}.</b> ${esc(o)}</label>`).join("") : ""}
        ${q.type === "fill" ? `<input class="fillin" type="text" name="${q.id}" autocomplete="off" placeholder="請輸入答案">` : ""}
      </fieldset>`).join("")}
      <p class="err" id="qErr"></p>
      <button class="btn-primary" id="qSubmitBtn" type="submit">交卷</button>
      ${C.diff ? ` <button class="btn-ghost" type="button" id="qBack">← 重選難度</button>` : ""}</form>`;
    const form = body.querySelector("#qForm");
    const errEl = form.querySelector("#qErr");
    const submitBtn = form.querySelector("#qSubmitBtn");
    let submitArmed = false;
    const resetSubmitConfirm = () => {
      if (!submitArmed) return;
      submitArmed = false;
      if (errEl) errEl.textContent = "";
      if (submitBtn) submitBtn.textContent = "交卷";
    };
    const back = body.querySelector("#qBack"); if (back) back.onclick = () => intro(key, info);
    const updateProgress = (idx) => {
      if (typeof idx === "number" && idx >= 0 && idx < questions.length) {
        currentIndex = idx;
      }
      const pct = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;
      const txtEl = form.querySelector("#qProgressText");
      const pctEl = form.querySelector("#qProgressPct");
      const barEl = form.querySelector("#qProgressBar");
      const trackEl = form.querySelector(".q-progress-track");
      if (txtEl) txtEl.textContent = `第 ${currentIndex + 1} / ${questions.length} 題`;
      if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
      if (barEl) barEl.style.width = `${pct}%`;
      if (trackEl) trackEl.setAttribute("aria-valuenow", String(currentIndex + 1));
      form.querySelectorAll(".qq").forEach((fs, i) => fs.classList.toggle("active-q", i === currentIndex));
    };
    form.querySelectorAll(".qq").forEach((fs, idx) => {
      fs.addEventListener("change", () => { resetSubmitConfirm(); updateProgress(idx); });
      fs.addEventListener("input", () => resetSubmitConfirm());
      fs.addEventListener("focusin", () => updateProgress(idx));
      fs.addEventListener("click", () => updateProgress(idx));
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      const answers = questions.map(q => {
        const els = [...form.querySelectorAll(`[name="${q.id}"]`)];
        if (q.type === "single") { const c = els.find(x => x.checked); return c ? +c.value : null; }
        if (q.type === "tf") { const c = els.find(x => x.checked); return c ? c.value === "true" : null; }
        if (q.type === "multi") return els.filter(x => x.checked).map(x => +x.value);
        return els[0].value;
      });
      const blank = questions.filter((q, i) => answers[i] === null || answers[i] === "" || (Array.isArray(answers[i]) && !answers[i].length)).length;
      if (blank && !submitArmed) {
        submitArmed = true;
        if (errEl) errEl.textContent = `⚠️ 還有 ${blank} 題還沒作答，若確定要交卷請再按一次「確定交卷」。`;
        if (submitBtn) submitBtn.textContent = `確定交卷（尚有 ${blank} 題未答）`;
        return;
      }
      resetSubmitConfirm();
      finish(key, info, C, answers, Math.round((Date.now() - t0) / 1000));
    };
  }
  async function finish(key, info, C, answers, sec) {
    const questions = C.questions;
    const marks = questions.map((q, i) => isCorrect(q, answers[i]));
    const correctCount = marks.filter(Boolean).length;
    const total = questions.length;
    const score = Math.round((correctCount / questions.length) * 100);
    const pass = score >= (Number(C.passScore) || 60);
    const quizDiff = C.diff || "single";
    const wrongQuestions = [];
    questions.forEach((q, idx) => {
      if (!marks[idx]) wrongQuestions.push(`${key}::${quizDiff}::${idx}`);
    });
    const ev = {
      ts: Date.now(), type: "quiz", island: info.isl.id, unit: key, unitName: info.s.unit,
      grade: info.s.grade, term: info.s.term, score, correct: correctCount, total: questions.length, sec,
      unitId: key,
      quizDifficulty: quizDiff,
      wrongQuestions,
      detail: {
        difficulty: C.diff || null,
        totalQuestions: questions.length,
        correctCount,
        answers: questions.map((q, i) => ({ index: i + 1, id: q.id, a: answers[i], ok: marks[i] }))
      }
    };
    if (C.diff) ev.difficulty = C.diff;      // 送往 GAS 的 payload 追加 difficulty 欄位
    // 徽章:通過中等 → 銀色羅盤;通過困難 → 金色大師(同時存入 localStorage)
    let newBadge = null;
    if (pass && C.lv && C.lv.badge) newBadge = Store.awardBadge({ unit: key, island: info.isl.id, unitName: info.s.unit, type: C.lv.badge, ts: ev.ts });
    const badgeInfo = pass && C.lv && C.lv.badge ? BADGES[C.lv.badge] : null;
    body.innerHTML = head(info, C.diff) + `<div class="q-pad"><div class="result ${pass ? "pass" : "fail"}">
        <div class="score">${score}<small>分</small></div>
        <div>${pass ? "🎉 通過!" : "💪 再接再厲!"} 答對 ${correctCount} / ${questions.length} 題 · 用時 ${sec} 秒${pass && C.diff ? "<br>本單元已累計通過,島嶼繁榮度會跟著提升!" : ""}</div></div>
      ${badgeInfo ? `<div class="badge-award">${badgeInfo.icon}<div><b>${newBadge ? "獲得" : "已擁有"}「${badgeInfo.name}」</b><br><small>可在「📈 學習成果」查看你的徽章牆</small></div></div>` : ""}
      <p class="sync" id="qSync">⏳ 正在記錄成績…</p>
      ${questions.map((q, i) => `<div class="review ${marks[i] ? "ok" : "no"}"><b>${marks[i] ? "✔" : "✘"} 第 ${i + 1} / ${questions.length} 題</b> ${esc(q.q).replace(/\n/g, "<br>")}
        <div class="ans">你的答案:${esc(showMine(q, answers[i]))}${marks[i] ? "" : `<br>正確答案:<b>${esc(showAns(q))}</b>`}</div>
        <div class="exp">💡 ${esc(q.explain)}</div></div>`).join("")}
      <button class="btn-primary" id="qAgain">再測一次</button> ${C.diff ? `<button class="btn-ghost" id="qLevel">換難度</button> ` : ""}<button class="btn-ghost" id="qDone">完成</button></div>`;
    body.querySelector("#qAgain").onclick = () => run(key, info, C.diff);
    const lvBtn = body.querySelector("#qLevel"); if (lvBtn) lvBtn.onclick = () => intro(key, info);
    body.querySelector("#qDone").onclick = close;
    const r = await Store.addEvent(ev), el = body.querySelector("#qSync");
    const hasLb = !!(r && r.leaderboardSyncPromise);
    if (el) {
      if (r.synced) {
        el.textContent = hasLb ? "✅ 成績已寫入 Google 試算表，風雲榜背景同步中…" : "✅ 成績已記錄,並已寫入 Google 試算表。";
      } else if (hasLb) {
        el.textContent = "✅ 成績已存於本機，⏳ 正在背景同步至年級風雲榜…";
      } else if (r.offline || (r.local && !Store.online())) {
        el.textContent = "✅ 成績已記錄在這台電腦(離線體驗模式,尚未連接試算表)。";
      } else {
        el.textContent = "✅ 成績已存在這台電腦;⚠ 暫時無法連線到試算表,稍後會自動補送。";
      }
    }
    if (hasLb) {
      r.leaderboardSyncPromise.then((lbRes) => {
        if (el && el.isConnected) {
          if (lbRes && lbRes.ok) {
            el.textContent = r.synced
              ? "✅ 成績已寫入 Google 試算表，並已同步至年級風雲榜！"
              : "✅ 成績已存於本機，並已背景同步至年級風雲榜！";
          } else {
            el.textContent = r.synced
              ? "✅ 成績已寫入 Google 試算表；⚠ 風雲榜雲端同步暫時失敗，稍後會自動補送。"
              : "✅ 成績已存於本機（⚠ 風雲榜暫時無法連線，已保留本機備份並將於下次自動補送）。";
          }
        }
        if (lbRes && lbRes.ok) {
          document.dispatchEvent(new CustomEvent("ii:leaderboard-synced"));
        }
      });
    }
    quizCompletedInSession = true;
    document.dispatchEvent(new CustomEvent("ii:synced"));
    document.dispatchEvent(new CustomEvent("ii:quizdone", { detail: { key, island: info.isl.id, score, difficulty: C.diff } }));
  }

  window.Quiz = { open, hasQuiz, hasLevels: (k) => hasQuiz(k) && hasLevels(k), BADGES, DIFF_NAME };
})();
